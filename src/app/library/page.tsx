import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadAtoms } from "@/lib/content";
import type { ExternalLink } from "@/lib/schema";
import { pageTitle, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Reading List: Books That Shaped the Craft"),
  description:
    "The books, podcasts, and research behind these ideas — from improv's foundational texts to cognitive science.",
  alternates: { canonical: "/library" },
};

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
    description: "Advanced texts, alternative traditions, and the life-beyond-stage perspective.",
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
    description: "Ongoing writing from practitioners who think seriously about the craft.",
    ids: ["ref-hines-substack", "ref-carrane-improv-nerd", "ref-hines-greatest-improviser"],
  },
  {
    label: "The science",
    description:
      "Academic sources that ground the laws in cognitive science and performance studies.",
    ids: [
      "ref-attention-and-effort-kahneman",
      "ref-limb-braun-jazz-improvisation",
      "ref-cowan-magical-number-four",
      "ref-sweller-cognitive-load",
      "ref-edmondson-psychological-safety",
      "ref-viewpoints-bogart-landau",
      "ref-meisner-on-acting",
    ],
  },
];

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose is plain strings
 * rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "Every claim on this site is meant to be traceable to something, and this is where the somethings are. Each entry says what the work is actually for rather than summarising it, because the useful question about a book you have not read is which of your problems it addresses.",
  "Where to start depends on what you came for. Johnstone if you want status and spontaneity and the argument that creativity is recovered rather than acquired. Spolin if you want pedagogy — how to teach this to people who are not performers. Truth in Comedy for the Chicago long-form inheritance. Napier for the counter-argument to most of it, which is worth reading early rather than late.",
  "The research titles are here because improv keeps arriving at things that had already been measured elsewhere — attention as a budget, coherence as something built turn by turn, courage as accumulated practice. Where a source disagrees with the improv orthodoxy, the entry says so instead of quietly leaving it out.",
];

export default async function LibraryPage() {
  const atoms = await loadAtoms();

  const refMap = new Map(
    atoms.filter((a) => a.frontmatter.type === "reference").map((a) => [a.frontmatter.id, a]),
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

  // CollectionPage/ItemList markup ties the individual work entities together
  // so the bibliography is readable as one curated list.
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/library`,
    name: "The Reading List",
    description:
      "The books, podcasts, and research behind these ideas — from improv's foundational texts to cognitive science.",
    url: `${SITE_URL}/library`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: TIERS.flatMap((tier) => tier.ids)
        .map((id) => refMap.get(id))
        .filter((atom) => atom !== undefined)
        .map((atom, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/library/${atom.frontmatter.id}`,
          name: atom.frontmatter.work?.name ?? atom.frontmatter.title,
        })),
    },
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Library" }]} />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">The Reading List</h1>
        <p className="text-foreground/60 mt-2">
          The books, podcasts, and research behind these ideas — from improv&apos;s foundational
          texts to cognitive science. Organized by where to start.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      <div className="space-y-12">
        {TIERS.map((tier) => (
          <section key={tier.label}>
            <h2 className="mb-1 text-lg font-semibold">{tier.label}</h2>
            <p className="text-foreground/40 mb-4 text-sm">{tier.description}</p>
            <div className="space-y-4">
              {tier.ids.map((id) => {
                const atom = refMap.get(id);
                if (!atom) return null;
                const fm = atom.frontmatter;
                const extLinks: ExternalLink[] = fm.external_links ?? [];
                const cites = citeCounts.get(id) ?? 0;

                // Extract first sentence for preview
                const preview = atom.content
                  .replace(/^---[\s\S]*?---\n*/m, "")
                  .replace(/^#{1,6}\s+.*$/gm, "")
                  .replace(/\*\*[^*]+\*\*/g, "")
                  .trim()
                  .split(/\.\s/)[0];

                return (
                  <div key={id} className="border-foreground/10 bg-surface rounded-lg border p-5">
                    <div className="flex items-start justify-between">
                      <Link href={`/library/${id}`} className="font-semibold hover:underline">
                        {fm.title}
                      </Link>
                      {cites > 0 && (
                        <span className="text-foreground/30 ml-3 shrink-0 text-xs">
                          {cites} ideas
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/50 mt-1 text-sm">{preview}.</p>
                    {extLinks.length > 0 && (
                      <div className="mt-3 flex gap-3">
                        {extLinks.map((el) => (
                          <a
                            key={el.url}
                            href={el.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="border-foreground/10 hover:border-foreground/30 text-foreground/50 hover:text-foreground/70 rounded-full border px-3 py-1 text-xs transition-colors"
                          >
                            {el.label} {"\u2197"}
                          </a>
                        ))}
                        <Link
                          href={`/library/${id}`}
                          className="border-foreground/10 hover:border-foreground/30 text-foreground/50 hover:text-foreground/70 rounded-full border px-3 py-1 text-xs transition-colors"
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
