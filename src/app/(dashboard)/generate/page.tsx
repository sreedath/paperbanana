"use client";

import { useState, useCallback, useEffect } from "react";
import { runPipeline } from "@/lib/pipeline";
import type { PipelineStatus, BrandingOptions, IterationImage } from "@/lib/types";
import { hasApiKey, addHistoryItem, getLogo, setLogo, removeLogo } from "@/lib/storage";
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const STATUS_LABELS: Record<PipelineStatus, string> = {
  idle: "",
  planning: "Planning diagram layout...",
  generating: "Generating image...",
  critiquing: "Critiquing & refining...",
  branding: "Applying branding...",
  done: "Done!",
  error: "Error",
};

export default function GeneratePage() {
  // Form state
  const [sourceContext, setSourceContext] = useState("");
  const [caption, setCaption] = useState("");
  const [diagramType, setDiagramType] = useState("methodology");
  const [iterations, setIterations] = useState(3);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Branding state
  const [showLogo, setShowLogo] = useState(true);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(true);
  const [urlText, setUrlText] = useState("vizuara.ai");

  // Pipeline state
  const [status, setStatus] = useState<PipelineStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [resultDescription, setResultDescription] = useState<string | null>(null);
  const [allIterations, setAllIterations] = useState<IterationImage[]>([]);

  // API key — check after mount to avoid hydration mismatch
  const [keyPresent, setKeyPresent] = useState(false);
  useEffect(() => {
    setKeyPresent(hasApiKey());
    setLogoPreview(getLogo());
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSourceContext(text);
    toast.success(`Loaded ${file.name}`);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      setLogoPreview(dataUrl);
      toast.success("Logo saved");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    removeLogo();
    setLogoPreview(null);
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
    setAllIterations([]);

    const branding: BrandingOptions = {
      showLogo,
      logoDataUrl: getLogo(),
      showUrl,
      urlText,
    };

    try {
      const result = await runPipeline(
        {
          sourceContext: sourceContext.trim(),
          caption: caption.trim(),
          diagramType,
          iterations,
          branding,
          aspectRatio,
        },
        handleStatusUpdate
      );

      const dataUrl = `data:${result.mimeType};base64,${result.imageBase64}`;
      setResultImageUrl(dataUrl);
      setResultDescription(result.description);
      setAllIterations(result.allIterations);

      // Save final image to history
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
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("Pipeline error:", err);
      toast.error(`Generation failed: ${msg}`);
    }
  };

  const isGenerating =
    status === "planning" ||
    status === "generating" ||
    status === "critiquing" ||
    status === "branding";

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
            <div className="flex flex-wrap gap-2">
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
              <Badge
                variant={diagramType === "linkedin" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setDiagramType("linkedin")}
              >
                LinkedIn Post
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

          {/* Aspect ratio */}
          <div className="space-y-2">
            <Label>Aspect Ratio</Label>
            <div className="flex flex-wrap gap-2">
              {["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"].map((ratio) => (
                <Badge
                  key={ratio}
                  variant={aspectRatio === ratio ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setAspectRatio(ratio)}
                >
                  {ratio}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Branding options */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Branding</Label>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="show-logo"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                disabled={isGenerating}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="show-logo" className="font-normal">
                Show logo
              </Label>
            </div>

            {showLogo && (
              <div className="space-y-2 pl-7">
                {logoPreview ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="h-8 w-8 rounded object-contain"
                    />
                    <span className="text-sm text-muted-foreground">Logo saved</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={isGenerating}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Upload logo image (PNG, SVG, JPG)
                    </Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={isGenerating}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="show-url"
                checked={showUrl}
                onChange={(e) => setShowUrl(e.target.checked)}
                disabled={isGenerating}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="show-url" className="font-normal">
                Show URL
              </Label>
            </div>

            {showUrl && (
              <div className="space-y-1 pl-7">
                <Input
                  value={urlText}
                  onChange={(e) => setUrlText(e.target.value)}
                  placeholder="vizuara.ai"
                  disabled={isGenerating}
                  className="max-w-xs"
                />
              </div>
            )}
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
        <div className="space-y-6">
          {isGenerating && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
                  {status === "planning"
                    ? "Planning"
                    : status === "generating"
                    ? "Generating"
                    : status === "branding"
                    ? "Branding"
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
            <>
              {/* Final result */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Final Result</CardTitle>
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

              {/* All iterations */}
              {allIterations.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">All Iterations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {allIterations.map((iter, idx) => (
                      <div key={idx} className="space-y-2">
                        <p className="text-sm font-medium">{iter.label}</p>
                        <img
                          src={iter.dataUrl}
                          alt={iter.label}
                          className="w-full rounded-lg border"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            downloadDataUrl(
                              iter.dataUrl,
                              `paperbanana-iter${idx + 1}-${Date.now()}.png`
                            )
                          }
                        >
                          Download
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
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
