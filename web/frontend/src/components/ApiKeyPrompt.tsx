"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const GOOGLE_API_KEY_URL = "https://makersuite.google.com/app/apikey";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

export function ApiKeyPrompt({ open, onClose, onSaved, token }: Props) {
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/settings/api-key", token, {
        method: "PUT",
        body: JSON.stringify({ gemini_api_key: key.trim() }),
      });
      toast.success("API key saved!");
      setKey("");
      onSaved();
    } catch {
      toast.error("Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gemini API Key Required</DialogTitle>
          <DialogDescription>
            Paper Banana needs a Google Gemini API key to generate diagrams.
            It&apos;s free — no credit card required.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <a
            href={GOOGLE_API_KEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get your free API key
          </a>

          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Paste your API key here"
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !key.trim()}>
            {saving ? "Saving..." : "Save & Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
