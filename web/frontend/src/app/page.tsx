import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <span className="text-xl font-bold">Paper Banana</span>
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
        <h1 className="max-w-2xl text-5xl font-bold tracking-tight">
          AI-Powered Academic Illustrations
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          Generate publication-quality methodology diagrams and statistical plots
          from text descriptions. Paste your methodology, get a figure.
        </p>
        <div className="mt-8 flex gap-4">
          <Button size="lg" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Log in</Link>
          </Button>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid max-w-4xl gap-8 md:grid-cols-3">
          <div>
            <h3 className="font-semibold">Paste or Upload</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste methodology text directly or upload a .txt / .md file.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Iterative Refinement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              AI critic reviews each draft and refines until publication-ready.
            </p>
          </div>
          <div>
            <h3 className="font-semibold">Gallery &amp; History</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Every generation saved to your personal gallery for future use.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        Paper Banana &mdash; Open-source academic illustration generator
      </footer>
    </div>
  );
}
