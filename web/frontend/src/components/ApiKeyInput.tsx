"use client";

import { useState } from "react";
import { getApiKey, setApiKey, removeApiKey } from "@/lib/storage";
import { resetClient } from "@/lib/gemini";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ApiKeyInputProps {
  onKeyChanged?: () => void;
}

export function ApiKeyInput({ onKeyChanged }: ApiKeyInputProps) {
  const [value, setValue] = useState("");
  const existing = getApiKey();

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setApiKey(trimmed);
    resetClient();
    setValue("");
    onKeyChanged?.();
  };

  const handleClear = () => {
    removeApiKey();
    resetClient();
    onKeyChanged?.();
  };

  if (existing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gemini API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Key saved: <code>{existing.slice(0, 8)}...{existing.slice(-4)}</code>
          </p>
          <Button variant="outline" size="sm" onClick={handleClear}>
            Remove Key
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gemini API Key Required</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="api-key">API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="AIza..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Your API key is stored locally in your browser and never sent to any server.
        </p>
        <Button size="sm" onClick={handleSave} disabled={!value.trim()}>
          Save Key
        </Button>
      </CardContent>
    </Card>
  );
}
