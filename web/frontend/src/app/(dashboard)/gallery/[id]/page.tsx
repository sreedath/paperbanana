"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import type { GalleryDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GenerationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [detail, setDetail] = useState<GalleryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !id) return;
    try {
      const data = await apiFetch<GalleryDetail>(`/gallery/${id}`, token);
      setDetail(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!detail) {
    return <p className="text-destructive">Generation not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/gallery">&larr; Gallery</Link>
        </Button>
        <h1 className="flex-1 truncate text-xl font-bold">
          {detail.communicative_intent}
        </h1>
        <Badge variant="outline">{detail.diagram_type}</Badge>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Image */}
        <div className="lg:col-span-2">
          {detail.image_url ? (
            <>
              <img
                src={detail.image_url}
                alt={detail.communicative_intent}
                className="w-full rounded-lg border"
              />
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline">
                  <a href={detail.image_url} download>
                    Download
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link
                    href={`/generate?context=${encodeURIComponent(detail.source_context)}&caption=${encodeURIComponent(detail.communicative_intent)}`}
                  >
                    Regenerate
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border bg-muted">
              <p className="text-muted-foreground">{detail.status}</p>
            </div>
          )}
        </div>

        {/* Metadata sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    detail.status === "completed" ? "default" : "outline"
                  }
                >
                  {detail.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>
                  {new Date(detail.created_at).toLocaleString()}
                </span>
              </div>
              {detail.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span>
                    {new Date(detail.completed_at).toLocaleString()}
                  </span>
                </div>
              )}
              {detail.metadata?.timing != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span>
                    {Math.round(
                      (detail.metadata.timing as { total_seconds: number })
                        .total_seconds
                    )}
                    s
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {detail.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Final Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {detail.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Source context (collapsible) */}
          <details className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Source Context
            </summary>
            <Separator />
            <div className="max-h-60 overflow-auto px-4 py-3">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                {detail.source_context}
              </pre>
            </div>
          </details>

          {/* Iteration history */}
          {detail.iterations && detail.iterations.length > 0 && (
            <details className="rounded-lg border">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Iteration History ({detail.iterations.length})
              </summary>
              <Separator />
              <div className="space-y-3 px-4 py-3">
                {detail.iterations.map((it, idx) => {
                  const iter = it as { iteration?: number; critique?: { critic_suggestions?: string[] } };
                  return (
                    <div key={idx} className="text-xs">
                      <p className="font-medium">Iteration {iter.iteration}</p>
                      {iter.critique && (
                        <p className="mt-1 text-muted-foreground">
                          {iter.critique.critic_suggestions?.length
                            ? iter.critique.critic_suggestions.join("; ")
                            : "No suggestions"}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
