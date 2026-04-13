import Link from "next/link";

import { ContinueJourney } from "@/components/ContinueJourney";
import { HomepageQuiz } from "@/components/HomepageQuiz";
import { getFirstThreadOfPath, loadPaths } from "@/lib/content";

export default async function Home() {
  const paths = await loadPaths();

  // Build quiz config: path ID → { title, firstThread }
  const quizConfig: Record<string, { title: string; firstThread: string }> = {};
  const continueConfig: Record<string, { title: string; threads: string[] }> = {};

  for (const p of paths) {
    const first = await getFirstThreadOfPath(p.frontmatter.id);
    if (first) {
      quizConfig[p.frontmatter.id] = {
        title: p.frontmatter.title,
        firstThread: first.id,
      };
    }
    continueConfig[p.frontmatter.id] = {
      title: p.frontmatter.title,
      threads: p.frontmatter.threads ?? [],
    };
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          What makes some conversations magic and others fall flat?
        </h1>
        <p className="text-foreground/60 text-lg">
          There are real reasons — and they&apos;re learnable. Improv performers have been studying
          them on stage for 60 years. This is what they found.
        </p>
      </header>

      {/* ── Continue (returning users) ────────────────────────────── */}
      <ContinueJourney paths={continueConfig} />

      {/* ── Quiz funnel ───────────────────────────────────────────── */}
      <HomepageQuiz paths={quizConfig} />

      {/* ── Direct links for power users ──────────────────────────── */}
      <div className="text-foreground/30 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>Or explore directly:</span>
        <Link href="/how-it-works" className="hover:text-foreground/50">
          How It Works
        </Link>
        <Link href="/improv-games" className="hover:text-foreground/50">
          Improv Games
        </Link>
        <Link href="/practice" className="hover:text-foreground/50">
          Practice
        </Link>
        <Link href="/guides" className="hover:text-foreground/50">
          Guides
        </Link>
        <Link href="/paths" className="hover:text-foreground/50">
          All Paths
        </Link>
        <Link href="/listen" className="hover:text-foreground/50">
          Listen
        </Link>
      </div>
    </main>
  );
}
