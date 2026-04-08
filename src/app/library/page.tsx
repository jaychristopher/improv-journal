import Link from "next/link";
import { loadAtoms } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

interface ExternalLink {
  label: string;
  url: string;
}

const TIERS: { label: string; description: string; ids: string[] }[] = [
  {
    label: "Start here",
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
      "Ongoing writing from practitioners who think seriously about the craft.",
    ids: [
      "ref-hines-substack",
      "ref-carrane-improv-nerd",
      "ref-hines-greatest-improviser",
    ],
  },
  {
    label: "The science",
    description:
      "Academic sources that ground the axioms in cognitive science and performance studies.",
    ids: [
      "ref-attention-and-effort-kahneman",
      "ref-viewpoints-bogart-landau",
      "ref-meisner-on-acting",
    ],
  },
];

export default async function LibraryPage() {
  const atoms = await loadAtoms();

  const refMap = new Map(
    atoms
      .filter((a) => a.frontmatter.type === "reference")
      .map((a) => [a.frontmatter.id, a])
  );

  // Count how many non-reference atoms cite each reference
  const citeCounts = new Map<string, number>();
  for (const a of atoms) {
    if (a.frontmatter.type === "reference") continue;
    for (const link of a.frontmatter.links ?? []) {
      if (refMap.has(link.id)) {
        citeCounts.set(link.id, (citeCounts.get(link.id) ?? 0) + 1);
      }
    }
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, { label: "Library" }]}
      />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          The Reading List
        </h1>
        <p className="text-foreground/60 mt-2">
          The books, podcasts, and research behind the knowledge graph —
          organized by where to start.
        </p>
      </header>

      <div className="space-y-12">
        {TIERS.map((tier) => (
          <section key={tier.label}>
            <h2 className="text-lg font-semibold mb-1">{tier.label}</h2>
            <p className="text-sm text-foreground/40 mb-4">
              {tier.description}
            </p>
            <div className="space-y-4">
              {tier.ids.map((id) => {
                const atom = refMap.get(id);
                if (!atom) return null;
                const fm = atom.frontmatter;
                const extLinks: ExternalLink[] =
                  (fm as unknown as { external_links?: ExternalLink[] })
                    .external_links ?? [];
                const cites = citeCounts.get(id) ?? 0;

                // Extract first sentence for preview
                const preview = atom.content
                  .replace(/^---[\s\S]*?---\n*/m, "")
                  .replace(/^#{1,6}\s+.*$/gm, "")
                  .replace(/\*\*[^*]+\*\*/g, "")
                  .trim()
                  .split(/\.\s/)[0];

                return (
                  <div
                    key={id}
                    className="border border-foreground/10 rounded-lg p-5"
                  >
                    <div className="flex justify-between items-start">
                      <Link
                        href={`/library/${id}`}
                        className="font-semibold hover:underline"
                      >
                        {fm.title}
                      </Link>
                      {cites > 0 && (
                        <span className="text-xs text-foreground/30 shrink-0 ml-3">
                          {cites} ideas
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground/50 mt-1">
                      {preview}.
                    </p>
                    {extLinks.length > 0 && (
                      <div className="flex gap-3 mt-3">
                        {extLinks.map((el) => (
                          <a
                            key={el.url}
                            href={el.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30 transition-colors text-foreground/50 hover:text-foreground/70"
                          >
                            {el.label} {"\u2197"}
                          </a>
                        ))}
                        <Link
                          href={`/library/${id}`}
                          className="text-xs px-3 py-1 rounded-full border border-foreground/10 hover:border-foreground/30 transition-colors text-foreground/50 hover:text-foreground/70"
                        >
                          In the graph
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
