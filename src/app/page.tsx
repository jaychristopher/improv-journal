import Link from "next/link";

import { loadBridges } from "@/lib/content";

const TOP_GUIDES = ["how-to-stop-overthinking", "stage-fright", "active-listening"];

const LEARNING_PATHS = [
  { href: "/learn/beginner", level: "Beginner", label: "Just starting" },
  { href: "/learn/intermediate", level: "Intermediate", label: "Breaking plateaus" },
  { href: "/learn/teacher", level: "Teacher", label: "Learning to teach" },
  { href: "/learn/performer", level: "Performer", label: "Pushing toward mastery" },
];

export default async function Home() {
  const bridges = await loadBridges();

  const topGuides = TOP_GUIDES.flatMap((slug) => {
    const b = bridges.find((br) => br.slug === slug);
    return b ? [b] : [];
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <header className="mb-16">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          What makes some conversations magic and others fall flat?
        </h1>
        <p className="text-foreground/60 text-lg">
          There are real reasons — and they&apos;re learnable. Improv performers have been studying
          them on stage for 60 years. This is what they found.
        </p>
      </header>

      {/* ── Three Doors ───────────────────────────────────────────── */}
      <section className="mb-16 space-y-4">
        <Link
          href="/how-it-works"
          className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-6 transition-colors"
        >
          <h2 className="text-xl font-semibold">Why conversations work (or don&apos;t)</h2>
          <p className="text-foreground/50 mt-1 text-sm">
            The hidden forces behind every interaction — why some click and others die, and what you
            can do about it.
          </p>
        </Link>

        <Link
          href="/practice"
          className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-6 transition-colors"
        >
          <h2 className="text-xl font-semibold">Try something tonight</h2>
          <p className="text-foreground/50 mt-1 text-sm">
            Exercises you can do with a partner, techniques for better scenes, and formats for
            shows.
          </p>
        </Link>

        <Link
          href="/guides"
          className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-6 transition-colors"
        >
          <h2 className="text-xl font-semibold">Solve a specific problem</h2>
          <p className="text-foreground/50 mt-1 text-sm">
            Guides for overthinking, stage fright, team dynamics, giving feedback, and more. No
            stage required.
          </p>
        </Link>
      </section>

      {/* ── Learning Paths ────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-4 text-lg font-semibold">Start learning</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEARNING_PATHS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 transition-colors"
            >
              <h3 className="text-sm font-semibold">{s.level}</h3>
              <span className="text-foreground/40 mt-0.5 block text-xs">{s.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Top Guides ────────────────────────────────────────────── */}
      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Top guides</h2>
          <Link href="/guides" className="text-foreground/40 hover:text-foreground/60 text-sm">
            See all &rarr;
          </Link>
        </div>
        <div className="space-y-3">
          {topGuides.map((b) => (
            <Link
              key={b.slug}
              href={`/${b.slug}`}
              className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
            >
              <h3 className="text-sm font-medium">{b.frontmatter.title}</h3>
              <p className="text-foreground/40 mt-1 line-clamp-1 text-xs">
                {b.frontmatter.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
