import { notFound } from "next/navigation";
import Link from "next/link";
import { getTraditionNames, getAtomsForTradition, getAtomUrl } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

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

export default async function TraditionPage({
  params,
}: {
  params: Promise<{ tradition: string }>;
}) {
  const { tradition } = await params;
  const info = TRADITION_INFO[tradition];
  if (!info) notFound();

  const atoms = await getAtomsForTradition(tradition);

  // Group by type
  const byType = new Map<string, typeof atoms>();
  for (const a of atoms) {
    const t = a.frontmatter.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Traditions", href: "/traditions" },
          { label: info.label },
        ]}
      />

      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          tradition
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {info.label}
        </h1>
        <p className="text-foreground/60 mt-2">{info.desc}</p>
        <div className="mt-3">
          <span className="text-xs text-foreground/40">Key texts: </span>
          <span className="text-xs text-foreground/50">
            {info.keyTexts.join(" · ")}
          </span>
        </div>
        <p className="text-sm text-foreground/40 mt-2">
          {atoms.length} concepts in the graph cite this tradition
        </p>
      </header>

      {Array.from(byType.entries())
        .sort((a, b) => b[1].length - a[1].length)
        .map(([type, typeAtoms]) => (
          <section key={type} className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-3">
              {type}s ({typeAtoms.length})
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {typeAtoms.map((a) => (
                <Link
                  key={a.frontmatter.id}
                  href={getAtomUrl({
                    id: a.frontmatter.id,
                    type: a.frontmatter.type,
                  })}
                  className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors"
                >
                  <span className="text-sm font-medium">
                    {a.frontmatter.title}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
    </main>
  );
}
