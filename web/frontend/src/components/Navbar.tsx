"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function Navbar() {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/generate" className="text-lg font-bold">
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
              Gallery
            </Link>
            <Link
              href="/settings"
              className="text-muted-foreground hover:text-foreground"
            >
              Settings
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground md:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
