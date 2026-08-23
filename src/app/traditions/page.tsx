import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomsForTradition, getTraditionNames } from "@/lib/content";
import { pageTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Traditions: Johnstone, Spolin, Close, and UCB"),
  description:
    "Five schools of improv thought — Johnstone, Spolin, Close, UCB, and Annoyance — compared, contrasted, and connected.",
  alternates: { canonical: "/traditions" },
};

const TRADITION_INFO: Record<string, { label: string; desc: string }> = {
  johnstone: {
    label: "Keith Johnstone",
    desc: "Story-first. Status as the engine. Spontaneity through surrender. Theatresports, Loose Moose.",
  },
  spolin: {
    label: "Viola Spolin",
    desc: "Present-moment awareness. The body as primary instrument. Point of Concentration. Theater Games.",
  },
  close: {
    label: "Del Close & Charna Halpern",
    desc: "Group mind. Connections across scenes. The Harold as spiritual endeavor. iO Chicago.",
  },
  ucb: {
    label: "Upright Citizens Brigade",
    desc: "Game-first. Pattern recognition and heightening. Comedy as the goal. The UCB Manual.",
  },
  annoyance: {
    label: "Annoyance / TJ & Dave",
    desc: "Commitment-first. Honest behavior. Trust the relationship; game emerges or it doesn't.",
  },
};

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose is plain strings
 * rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "Five rather than one, because each answers a prior question differently: what is improvisation for. Comedy, story, presence, honest behaviour, a way of living — the answer sits underneath everything downstream of it, which is why two teachers can give opposite notes on the same scene and both be right within their own system.",
  "The profiles are short on biography on purpose. What matters is where a lineage puts its weight and what it is willing to give up to do that, so each one is a page about commitments rather than a page about a person. The full argument between them, question by question, is a separate read.",
  "The practical use is knowing which tradition a piece of advice came from, because that tells you where it stops applying. Almost every improv book, class and blog post speaks from one lineage and rarely says which, so a rule that sounds universal is usually a rule that was true somewhere specific.",
];

export default async function TraditionsPage() {
  const names = getTraditionNames();

  const traditionsWithCounts = await Promise.all(
    names.map(async (name) => {
      const atoms = await getAtomsForTradition(name);
      return { name, count: atoms.length, ...TRADITION_INFO[name] };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Traditions" }]} />
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">the lineages</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Traditions in Tension</h1>
        <p className="text-foreground/60 mt-2">
          There is no single &quot;improv.&quot; Five major traditions, each with distinct
          philosophies, and they disagree on fundamental questions. Understanding where they diverge
          — and why — is what separates citation from knowledge.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      <div className="space-y-4">
        {traditionsWithCounts.map((t) => (
          <div
            key={t.name}
            className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">
                <Link href={`/traditions/${t.name}`} className="after:absolute after:inset-0">
                  {t.label}
                </Link>
              </h2>
              <span className="text-foreground/40 text-sm">{t.count} concepts</span>
            </div>
            <p className="text-foreground/50 mt-1 text-sm">{t.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
