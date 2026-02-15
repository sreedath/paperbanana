"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { hasApiKey } from "@/lib/storage";

export function Navbar() {
  const [keySet, setKeySet] = useState(false);

  useEffect(() => {
    setKeySet(hasApiKey());
  }, []);

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Paper Banana
          </Link>
          <nav className="hidden gap-4 text-sm md:flex">
            <Link
              href="/generate"
              className="text-muted-foreground hover:text-foreground"
            >
              Generate
            </Link>
            <Link
              href="/gallery"
              className="text-muted-foreground hover:text-foreground"
            >
              History
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              keySet ? "bg-green-500" : "bg-yellow-500"
            }`}
            title={keySet ? "API key set" : "No API key"}
          />
          <span className="text-xs text-muted-foreground">
            {keySet ? "Key set" : "No key"}
          </span>
        </div>
      </div>
    </header>
  );
}
