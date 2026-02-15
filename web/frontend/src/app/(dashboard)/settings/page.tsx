"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch, ApiError } from "@/lib/api";
import type { ApiKeyStatus, Asset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

const GOOGLE_API_KEY_URL = "https://makersuite.google.com/app/apikey";

export default function SettingsPage() {
  const { token } = useAuth();
  const [keyStatus, setKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetName, setAssetName] = useState("");
  const [uploading, setUploading] = useState(false);

  const loadKeyStatus = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiFetch<ApiKeyStatus>("/settings/api-key", token);
      setKeyStatus(data);
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
    loadKeyStatus();
    loadAssets();
  }, [loadKeyStatus, loadAssets]);

  const handleSaveKey = async () => {
    if (!token || !keyInput.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/settings/api-key", token, {
        method: "PUT",
        body: JSON.stringify({ gemini_api_key: keyInput.trim() }),
      });
      setKeyInput("");
      await loadKeyStatus();
      toast.success("API key saved successfully");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!token) return;
    try {
      await apiFetch("/settings/api-key", token, { method: "DELETE" });
      await loadKeyStatus();
      toast.success("API key removed");
    } catch {
      toast.error("Failed to remove key");
    }
  };

  const handleUploadAsset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    const fileInput = form.querySelector<HTMLInputElement>('input[type="file"]');
    const file = fileInput?.files?.[0];
    if (!file || !assetName.trim()) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", assetName.trim());
      await apiFetch("/assets", token, { method: "POST", body: formData });
      setAssetName("");
      form.reset();
      await loadAssets();
      toast.success("Asset uploaded");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    if (!token) return;
    try {
      await apiFetch(`/assets/${id}`, token, { method: "DELETE" });
      setAssets((prev) => prev.filter((a) => a.id !== id));
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle>Gemini API Key</CardTitle>
          <CardDescription>
            Paper Banana uses the Google Gemini API to generate diagrams. You
            need a free API key.{" "}
            <a
              href={GOOGLE_API_KEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Get your free key here
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {keyStatus?.has_key ? (
            <div className="flex items-center gap-3">
              <span className="rounded bg-muted px-3 py-1.5 font-mono text-sm">
                {keyStatus.key_preview}
              </span>
              <Button variant="outline" size="sm" onClick={handleDeleteKey}>
                Remove
              </Button>
            </div>
          ) : (
            <p className="text-sm text-destructive">
              No API key configured. You must add one before generating diagrams.
            </p>
          )}

          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Paste your Gemini API key"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleSaveKey} disabled={saving || !keyInput.trim()}>
              {saving ? "Saving..." : keyStatus?.has_key ? "Update key" : "Save key"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Custom Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Assets</CardTitle>
          <CardDescription>
            Upload logos, brand images, or other assets to include in your
            generated diagrams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleUploadAsset} className="flex flex-wrap gap-2">
            <Input
              type="text"
              placeholder="Asset name (e.g. Company Logo)"
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              className="max-w-xs"
              required
            />
            <Input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              className="max-w-xs"
              required
            />
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </form>

          {assets.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  {asset.thumbnail_url && (
                    <img
                      src={asset.thumbnail_url}
                      alt={asset.name}
                      className="h-10 w-10 rounded object-cover"
                    />
                  )}
                  <span className="flex-1 truncate text-sm">{asset.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAsset(asset.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
          {assets.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No assets uploaded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
