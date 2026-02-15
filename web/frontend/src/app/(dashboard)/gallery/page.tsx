"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getHistory, removeHistoryItem, clearHistory } from "@/lib/storage";
import { downloadDataUrl } from "@/lib/image-utils";
import type { HistoryItem } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GalleryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [selected, setSelected] = useState<HistoryItem | null>(null);

  useEffect(() => {
    setItems(getHistory());
  }, []);

  const handleDelete = (id: string) => {
    removeHistoryItem(id);
    setItems(getHistory());
    if (selected?.id === id) setSelected(null);
  };

  const handleClear = () => {
    clearHistory();
    setItems([]);
    setSelected(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">History</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {items.length} generation{items.length !== 1 ? "s" : ""}
          </span>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {items.length === 0 && (
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
          <button
            key={item.id}
            onClick={() => setSelected(item)}
            className="group overflow-hidden rounded-lg border text-left transition-shadow hover:shadow-md"
          >
            <div className="aspect-square bg-muted">
              <img
                src={item.thumbnailDataUrl}
                alt={item.caption}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-medium">{item.caption}</p>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {item.diagramType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.caption}</DialogTitle>
              </DialogHeader>
              <img
                src={selected.imageDataUrl}
                alt={selected.caption}
                className="w-full rounded-lg border"
              />
              {selected.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Description
                  </p>
                  <p className="mt-1 text-sm">{selected.description}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() =>
                    downloadDataUrl(
                      selected.imageDataUrl,
                      `paperbanana-${selected.id}.png`
                    )
                  }
                >
                  Download
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => handleDelete(selected.id)}
                >
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
