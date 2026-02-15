"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useJobStatus } from "@/hooks/useJobStatus";
import { apiFetch, ApiError } from "@/lib/api";
import type { ApiKeyStatus, Asset, GenerateResponse } from "@/lib/types";
import { ApiKeyPrompt } from "@/components/ApiKeyPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function GeneratePage() {
  const { token } = useAuth();

  // Form state
  const [sourceContext, setSourceContext] = useState("");
  const [caption, setCaption] = useState("");
  const [diagramType, setDiagramType] = useState("methodology");
  const [iterations, setIterations] = useState(3);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // API key check
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  // Job tracking
  const [jobId, setJobId] = useState<string | null>(null);
  const { job, isPolling } = useJobStatus(jobId, token);

  // Assets
  const [assets, setAssets] = useState<Asset[]>([]);

  const checkApiKey = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<ApiKeyStatus>("/settings/api-key", token);
      setHasKey(data.has_key);
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadAssets = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<{ items: Asset[] }>("/assets", token);
      setAssets(data.items);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    checkApiKey();
    loadAssets();
  }, [checkApiKey, loadAssets]);

  // Handle file upload (read content client-side)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSourceContext(text);
    toast.success(`Loaded ${file.name}`);
  };

  const handleSubmit = async () => {
    if (!token || !sourceContext.trim() || !caption.trim()) {
      toast.error("Please provide both a description and a caption.");
      return;
    }

    // Check API key first
    if (!hasKey) {
      setShowKeyPrompt(true);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch<GenerateResponse>("/generate", token, {
        method: "POST",
        body: JSON.stringify({
          source_context: sourceContext.trim(),
          communicative_intent: caption.trim(),
          diagram_type: diagramType,
          refinement_iterations: iterations,
          asset_ids: selectedAssetIds,
        }),
      });
      setJobId(res.job_id);
      toast.success("Generation started!");
    } catch (e) {
      if (e instanceof ApiError) {
        const detail = e.detail;
        if (
          typeof detail === "object" &&
          detail !== null &&
          "code" in detail &&
          (detail as Record<string, unknown>).code === "api_key_required"
        ) {
          setShowKeyPrompt(true);
          return;
        }
        toast.error(e.message);
      } else {
        toast.error("Failed to start generation");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAsset = (id: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const isGenerating = submitting || isPolling;
  const isDone = job?.status === "completed";
  const isFailed = job?.status === "failed";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Generate Diagram</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Input Form */}
        <div className="space-y-6">
          {/* Source context: text or file */}
          <Tabs defaultValue="text">
            <TabsList>
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="space-y-2">
              <Label htmlFor="context">Methodology / Description</Label>
              <Textarea
                id="context"
                rows={10}
                placeholder="Paste the methodology section or description of the figure you want to generate..."
                value={sourceContext}
                onChange={(e) => setSourceContext(e.target.value)}
                disabled={isGenerating}
              />
            </TabsContent>
            <TabsContent value="file" className="space-y-2">
              <Label>Upload .txt or .md file</Label>
              <Input
                type="file"
                accept=".txt,.md"
                onChange={handleFileUpload}
                disabled={isGenerating}
              />
              {sourceContext && (
                <p className="text-sm text-muted-foreground">
                  Loaded {sourceContext.length} characters
                </p>
              )}
            </TabsContent>
          </Tabs>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Figure Caption</Label>
            <Input
              id="caption"
              placeholder="e.g. Overview of the proposed multi-agent framework"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {/* Diagram type */}
          <div className="space-y-2">
            <Label>Diagram Type</Label>
            <div className="flex gap-2">
              <Badge
                variant={diagramType === "methodology" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setDiagramType("methodology")}
              >
                Methodology
              </Badge>
              <Badge
                variant={
                  diagramType === "statistical_plot" ? "default" : "outline"
                }
                className="cursor-pointer"
                onClick={() => setDiagramType("statistical_plot")}
              >
                Statistical Plot
              </Badge>
            </div>
          </div>

          {/* Iterations slider */}
          <div className="space-y-2">
            <Label>
              Refinement Iterations:{" "}
              <span className="font-normal text-muted-foreground">
                {iterations}
              </span>
            </Label>
            <Slider
              value={[iterations]}
              onValueChange={([v]) => setIterations(v)}
              min={1}
              max={5}
              step={1}
              disabled={isGenerating}
            />
          </div>

          {/* Custom assets */}
          {assets.length > 0 && (
            <div className="space-y-2">
              <Label>Include Custom Assets</Label>
              <div className="flex flex-wrap gap-2">
                {assets.map((asset) => (
                  <Badge
                    key={asset.id}
                    variant={
                      selectedAssetIds.includes(asset.id)
                        ? "default"
                        : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => toggleAsset(asset.id)}
                  >
                    {asset.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isGenerating || !sourceContext.trim() || !caption.trim()
            }
          >
            {isGenerating ? "Generating..." : "Generate Diagram"}
          </Button>
        </div>

        {/* Right: Result / Progress */}
        <div>
          {isPolling && job && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                  {job.status === "pending" ? "Queued" : "Generating"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {job.progress || "Starting pipeline..."}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  This typically takes 30-60 seconds.
                </p>
              </CardContent>
            </Card>
          )}

          {isDone && job && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Done!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.image_url && (
                  <a
                    href={job.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={job.image_url}
                      alt="Generated diagram"
                      className="w-full rounded-lg border"
                    />
                  </a>
                )}
                {job.description && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-sm">{job.description}</p>
                  </div>
                )}
                {job.image_url && (
                  <Button asChild variant="outline" className="w-full">
                    <a href={job.image_url} download>
                      Download Image
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {isFailed && job && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">
                  Generation Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {job.error_message || "An unknown error occurred."}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setJobId(null);
                  }}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {!jobId && (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                Your generated diagram will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* API key prompt modal */}
      {token && (
        <ApiKeyPrompt
          open={showKeyPrompt}
          onClose={() => setShowKeyPrompt(false)}
          onSaved={() => {
            setShowKeyPrompt(false);
            setHasKey(true);
            toast.success("Key saved! You can now generate.");
          }}
          token={token}
        />
      )}
    </div>
  );
}
