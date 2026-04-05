import Link from "next/link";
import { loadAtoms } from "@/lib/content";

// Curated tiers matching the sitemap outline
const TIERS: { label: string; description: string; ids: string[] }[] = [
  {
    label: "Start here — The essential 5",
    description:
      "If you read nothing else, read these. Each one shaped how improv is taught today.",
    ids: [
      "ref-impro-johnstone",
      "ref-truth-in-comedy",
      "ref-ucb-manual",
      "ref-napier-improvise",
      "ref-spolin-improvisation-for-theater",
    ],
  },
  {
    label: "Go deeper",
    description:
      "Advanced texts, alternative traditions, and the life-beyond-stage perspective.",
    ids: [
      "ref-impro-storytellers-johnstone",
      "ref-tj-dave-speed-of-life",
      "ref-madson-improv-wisdom",
      "ref-sawyer-group-genius",
      "ref-fey-bossypants",
    ],
  },
  {
    label: "The teachers",
    description:
      "Ongoing writing from practitioners who think seriously about improv pedagogy and craft.",
    ids: [
      "ref-hines-substack",
      "ref-carrane-improv-nerd",
      "ref-hines-greatest-improviser",
    ],
  },
  {
    label: "The science",
    description:
      "Academic and research sources that ground the knowledge graph's axioms in cognitive science, sociology, and performance studies.",
    ids: [
      "ref-attention-and-effort-kahneman",
      "ref-viewpoints-bogart-landau",
      "ref-meisner-on-acting",
    ],
  },
];

export default async function LibraryPage() {
  const atoms = await loadAtoms();

  // Build a lookup map for reference atoms
  const refMap = new Map(
    atoms
      .filter((a) => a.frontmatter.type === "reference")
      .map((a) => [a.frontmatter.id, a])
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/"
        className="text-sm text-foreground/40 hover:text-foreground/60 mb-8 block"
      >
        &larr; Home
      </Link>

      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          library
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          The Improv Library
        </h1>
        <p className="text-foreground/60 mt-2">
          Every source cited in the knowledge graph, organized by where to
          start.
        </p>
        <p className="text-xs text-foreground/40 mt-2">
          {refMap.size} references — each page shows every concept in the graph
          that cites it
        </p>
      </header>

      <div className="space-y-12">
        {TIERS.map((tier) => (
          <section key={tier.label}>
            <h2 className="text-lg font-semibold mb-1">{tier.label}</h2>
            <p className="text-sm text-foreground/40 mb-4">
              {tier.description}
            </p>
            <div className="space-y-3">
              {tier.ids.map((id) => {
                const atom = refMap.get(id);
                if (!atom) return null;
                // Extract first sentence from body for preview
                const preview = atom.content
                  .replace(/^---[\s\S]*?---\n*/m, "")
                  .replace(/^#{1,6}\s+.*$/gm, "")
                  .replace(/\*\*[^*]+\*\*/g, "")
                  .trim()
                  .split(/\.\s/)[0];
                return (
                  <Link
                    key={id}
                    href={`/atoms/${id}`}
                    className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
                  >
                    <h3 className="font-medium text-sm">
                      {atom.frontmatter.title}
                    </h3>
                    <p className="text-xs text-foreground/40 mt-1 line-clamp-2">
                      {preview}.
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-16 pt-8 border-t border-foreground/10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
          How to use the library
        </h2>
        <p className="text-sm text-foreground/60">
          Each reference page shows every atom in the graph that cites it.
          Follow the links to see how each source's ideas are distributed across
          the knowledge graph — which principles it informs, which exercises it
          inspired, which counter-positions it provokes.
        </p>
      </section>
    </main>
  );
}
