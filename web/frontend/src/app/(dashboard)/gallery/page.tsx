"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import type { GalleryItem, GalleryListResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function GalleryPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const perPage = 12;
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch<GalleryListResponse>(
        `/gallery?page=${page}&per_page=${perPage}`,
        token
      );
      setItems(data.items);
      setTotal(data.total);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <span className="text-sm text-muted-foreground">
          {total} generation{total !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && items.length === 0 && (
        <p className="text-muted-foreground">Loading...</p>
      )}

      {!loading && items.length === 0 && (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">
            No generations yet.{" "}
            <Link href="/generate" className="underline">
              Create your first diagram
            </Link>
            .
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/gallery/${item.id}`}
            className="group overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
          >
            <div className="aspect-square bg-muted">
              {item.thumbnail_url ? (
                <img
                  src={item.thumbnail_url}
                  alt={item.communicative_intent}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {item.status === "completed" ? "No preview" : item.status}
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">
                {item.communicative_intent}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {item.diagram_type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
