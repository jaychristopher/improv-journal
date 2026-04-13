import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import {
  extractCounterPositions,
  getAtomsForTradition,
  getAtomUrl,
  getTraditionNames,
} from "@/lib/content";

const TRADITION_INFO: Record<string, { label: string; desc: string; keyTexts: string[] }> = {
  johnstone: {
    label: "Keith Johnstone",
    desc: "Story-first. Status as the engine. Spontaneity through surrender.",
    keyTexts: ["Impro (1979)", "Impro for Storytellers (1999)"],
  },
  spolin: {
    label: "Viola Spolin",
    desc: "Present-moment awareness. The body as primary instrument. Point of Concentration.",
    keyTexts: ["Improvisation for the Theater (1963)"],
  },
  close: {
    label: "Del Close & Charna Halpern",
    desc: "Group mind. Connections across scenes. The Harold as spiritual endeavor.",
    keyTexts: ["Truth in Comedy (1994)"],
  },
  ucb: {
    label: "Upright Citizens Brigade",
    desc: "Game-first. Pattern recognition and heightening. Comedy as the goal.",
    keyTexts: ["UCB Comedy Improvisation Manual (2013)", "Will Hines Substack"],
  },
  annoyance: {
    label: "Annoyance Theatre / TJ & Dave",
    desc: "Commitment-first. Honest behavior. Trust the relationship.",
    keyTexts: ["Improvise (Napier, 2004)", "Speed of Life (TJ & Dave, 2015)"],
  },
};

export async function generateStaticParams() {
  return getTraditionNames().map((tradition) => ({ tradition }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tradition: string }>;
}): Promise<Metadata> {
  const { tradition } = await params;
  const info = TRADITION_INFO[tradition];
  if (!info) return {};
  return {
    title: info.label,
    description: info.desc,
    alternates: { canonical: `/traditions/${tradition}` },
    openGraph: {
      title: info.label,
      description: info.desc,
      url: `/traditions/${tradition}`,
      type: "article",
    },
  };
}

export default async function TraditionPage({
  params,
}: {
  params: Promise<{ tradition: string }>;
}) {
  const { tradition } = await params;
  const info = TRADITION_INFO[tradition];
  if (!info) notFound();

  const atoms = await getAtomsForTradition(tradition);

  // Extract counter-positions that mention this tradition
  const disagreements: {
    atomTitle: string;
    atomUrl: string;
    text: string;
  }[] = [];
  for (const a of atoms) {
    const cps = extractCounterPositions(a.content);
    for (const cp of cps) {
      if (cp.text.length > 20) {
        disagreements.push({
          atomTitle: a.frontmatter.title,
          atomUrl: getAtomUrl({
            id: a.frontmatter.id,
            type: a.frontmatter.type,
          }),
          text:
            cp.text.length > 200
              ? cp.text.substring(0, 200).replace(/\s+\S*$/, "") + "..."
              : cp.text,
        });
      }
    }
  }

  // Group by type
  const byType = new Map<string, typeof atoms>();
  for (const a of atoms) {
    const t = a.frontmatter.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Traditions", href: "/traditions" },
          { label: info.label },
        ]}
      />

      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">tradition</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{info.label}</h1>
        <p className="text-foreground/60 mt-2">{info.desc}</p>
        <p className="text-foreground/40 mt-3 text-xs">Key texts: {info.keyTexts.join(" · ")}</p>
      </header>

      {/* Disagreements — the unique value */}
      {disagreements.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Where this tradition pushes back</h2>
          <div className="space-y-4">
            {disagreements.slice(0, 8).map((d, i) => (
              <div key={i} className="border-foreground/10 border-l-2 pl-4">
                <p className="text-foreground/70 text-sm">{d.text}</p>
                <Link
                  href={d.atomUrl}
                  className="text-foreground/40 hover:text-foreground/60 mt-1 inline-block text-xs"
                >
                  from {d.atomTitle} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Concepts that cite this tradition */}
      <section>
        <h2 className="mb-4 text-lg font-semibold">
          Concepts citing this tradition
          <span className="text-foreground/40 ml-2 font-normal">({atoms.length})</span>
        </h2>
        {Array.from(byType.entries())
          .sort((a, b) => b[1].length - a[1].length)
          .map(([type, typeAtoms]) => (
            <div key={type} className="mb-6">
              <h3 className="text-foreground/30 mb-2 text-xs capitalize">
                {type}s ({typeAtoms.length})
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {typeAtoms.map((a) => (
                  <Link
                    key={a.frontmatter.id}
                    href={getAtomUrl({
                      id: a.frontmatter.id,
                      type: a.frontmatter.type,
                    })}
                    className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
                  >
                    <span className="text-sm font-medium">{a.frontmatter.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </section>
    </main>
  );
}
