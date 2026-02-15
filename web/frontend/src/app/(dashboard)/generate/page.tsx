"use client";

import { useState, useCallback } from "react";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineStatus } from "@/lib/types";
import { hasApiKey, addHistoryItem } from "@/lib/storage";
import { createThumbnail, downloadDataUrl, generateId } from "@/lib/image-utils";
import { ApiKeyInput } from "@/components/ApiKeyInput";
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

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: "",
  planning: "Planning diagram layout...",
  generating: "Generating image...",
  critiquing: "Critiquing & refining...",
  done: "Done!",
  error: "Error",
};

export default function GeneratePage() {
  // Form state
  const [sourceContext, setSourceContext] = useState("");
  const [caption, setCaption] = useState("");
  const [diagramType, setDiagramType] = useState("methodology");
  const [iterations, setIterations] = useState(3);

  // Pipeline state
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultDescription, setResultDescription] = useState<string | null>(null);

  // API key
  const [keyPresent, setKeyPresent] = useState(() =>
    typeof window !== "undefined" ? hasApiKey() : false
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSourceContext(text);
    toast.success(`Loaded ${file.name}`);
  };

  const handleStatusUpdate = useCallback(
    (newStatus: PipelineStatus, message?: string) => {
      setStatus(newStatus);
      setStatusMessage(message || STATUS_LABELS[newStatus]);
    },
    []
  );

  const handleSubmit = async () => {
    if (!sourceContext.trim() || !caption.trim()) {
      toast.error("Please provide both a description and a caption.");
      return;
    }
    if (!hasApiKey()) {
      toast.error("Please set your Gemini API key first.");
      return;
    }

    setResultImageUrl(null);
    setResultDescription(null);

    try {
      const result = await runPipeline(
        {
          sourceContext: sourceContext.trim(),
          caption: caption.trim(),
          diagramType,
          iterations,
        },
        handleStatusUpdate
      );

      const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
      setResultImageUrl(dataUrl);
      setResultDescription(result.description);

      // Save to history
      const thumbnail = await createThumbnail(dataUrl);
      addHistoryItem({
        id: generateId(),
        caption: caption.trim(),
        diagramType,
        sourceContext: sourceContext.trim().slice(0, 500),
        description: result.description,
        imageDataUrl: dataUrl,
        thumbnailDataUrl: thumbnail,
        iterations,
        createdAt: new Date().toISOString(),
      });

      toast.success("Diagram generated and saved to history!");
    } catch {
      toast.error("Generation failed. Check your API key and try again.");
    }
  };

  const isGenerating = status === "planning" || status === "generating" || status === "critiquing";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Generate Diagram</h1>

      {/* API Key Input (shown if no key) */}
      {!keyPresent && (
        <ApiKeyInput onKeyChanged={() => setKeyPresent(hasApiKey())} />
      )}

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

          {/* Submit */}
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={
              isGenerating || !sourceContext.trim() || !caption.trim() || !keyPresent
            }
          >
            {isGenerating ? "Generating..." : "Generate Diagram"}
          </Button>

          {/* API key management (when key exists) */}
          {keyPresent && (
            <ApiKeyInput onKeyChanged={() => setKeyPresent(hasApiKey())} />
          )}
        </div>

        {/* Right: Result / Progress */}
        <div>
          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                  {status === "planning"
                    ? "Planning"
                    : status === "generating"
                    ? "Generating"
                    : "Critiquing"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {statusMessage}
                </p>
              </CardContent>
            </Card>
          )}

          {status === "done" && resultImageUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Done!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={resultImageUrl}
                  alt="Generated diagram"
                  className="w-full rounded-lg border"
                />
                {resultDescription && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Description
                    </p>
                    <p className="mt-1 text-sm">{resultDescription}</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    downloadDataUrl(
                      resultImageUrl,
                      `paperbanana-${Date.now()}.png`
                    )
                  }
                >
                  Download Image
                </Button>
              </CardContent>
            </Card>
          )}

          {status === "error" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">
                  Generation Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {statusMessage}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setStatus("idle")}
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {status === "idle" && !resultImageUrl && (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <p className="text-muted-foreground">
                Your generated diagram will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
