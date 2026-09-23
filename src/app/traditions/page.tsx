import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { getAtomsForTradition, getTraditionNames } from "@/lib/content";
import { pageTitle } from "@/lib/seo";
import { splitTraditionMembers } from "@/lib/tradition-disagreements";
import { guideCountsByTradition, type TraditionId } from "@/lib/tradition-guides";
import { textCountsByTradition } from "@/lib/tradition-texts";

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
    // Kept in step with TRADITION_INFO, where the reason for the name is recorded.
    label: "Spolin and the Point of Concentration",
    desc: "Present-moment awareness. The body as primary instrument. Point of Concentration. Theater Games.",
  },
  close: {
    // Kept in step with TRADITION_INFO, where the reason for the name is recorded.
    label: "iO and the Harold",
    desc: "Group mind. Connections across scenes. The Harold as spiritual endeavor. Close and Halpern, iO Chicago.",
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
  "Five rather than one, because each answers a prior question differently: what is improvisation for. Comedy, story, presence, honest behaviour, a way of living — the answer sits under everything downstream, which is why two teachers can give opposite notes on the same scene and both be right within their own system.",
  "The profiles are short on biography on purpose. What matters is where a lineage puts its weight and what it gives up to do that, so each is a page about commitments rather than about a person. The full argument between them, question by question, is a separate read.",
  "The practical use is knowing which tradition a piece of advice came from, because that tells you where it stops applying. Almost every improv book, class and blog post speaks from one lineage and rarely says which, so a rule that sounds universal is usually a rule that was true somewhere specific.",
];

export default async function TraditionsPage() {
  const names = getTraditionNames();
  // Guides whose prose names the school's founder — the same list the
  // tradition page renders under "Guides that draw on this tradition".
  const guideCounts = await guideCountsByTradition();
  // The works each school is defined by — the reference ids the concept
  // count is computed from, which the cards named nowhere (tracker entry 288).
  const textCounts = await textCountsByTradition();

  const traditionsWithCounts = await Promise.all(
    names.map(async (name) => {
      // The same count the tradition page heads its list with: concepts the
      // tradition informs, not the ones linked to it only as a contrast.
      const { informed } = splitTraditionMembers(name, await getAtomsForTradition(name));
      return {
        name,
        count: informed.length,
        guides: guideCounts[name as TraditionId] ?? 0,
        texts: textCounts[name] ?? 0,
        ...TRADITION_INFO[name],
      };
    }),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Traditions" }]} />
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">the lineages</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Improv Traditions</h1>
        <Prose
          text='There is no single "improv." Five traditions with distinct philosophies, and they disagree on fundamental questions. Where they diverge, and why, is what separates citation from knowledge.'
          currentUrl="/traditions"
          className="text-foreground/60 mt-2"
        />
      </header>

      <section className="mb-12" data-track="hub-intro">
        {HUB_ORIENTATION.map((paragraph) => (
          <Prose
            text={paragraph}
            currentUrl="/traditions"
            className="text-foreground/70 mb-4"
            key={paragraph.slice(0, 40)}
          />
        ))}
        <Prose
          text="That separate read is [improv theory](/improv-theory), which takes the five lineages question by question and sets out where they agree and where they cannot both be right."
          currentUrl="/traditions"
          className="text-foreground/70"
        />
      </section>

      <div className="space-y-4" data-track="tradition-list">
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
              <span className="text-foreground/40 text-sm" data-track="tradition-counts">
                {t.count} concepts
                {t.guides > 0 && ` · ${t.guides} guide${t.guides === 1 ? "" : "s"}`}
                {t.texts > 0 && ` · ${t.texts} text${t.texts === 1 ? "" : "s"}`}
              </span>
            </div>
            <p className="text-foreground/50 mt-1 text-sm">{t.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
