import Link from "next/link";
import { getTraditionNames, getAtomsForTradition } from "@/lib/content";

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

export default async function TraditionsPage() {
  const names = getTraditionNames();

  const traditionsWithCounts = await Promise.all(
    names.map(async (name) => {
      const atoms = await getAtomsForTradition(name);
      return { name, count: atoms.length, ...TRADITION_INFO[name] };
    })
  );

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          the lineages
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          Traditions in Tension
        </h1>
        <p className="text-foreground/60 mt-2">
          There is no single "improv." Five major traditions, each with distinct
          philosophies, and they disagree on fundamental questions. Understanding
          where they diverge — and why — is what separates citation from knowledge.
        </p>
      </header>

      <div className="space-y-4">
        {traditionsWithCounts.map((t) => (
          <Link
            key={t.name}
            href={`/traditions/${t.name}`}
            className="block border border-foreground/10 rounded-lg p-5 hover:border-foreground/30 transition-colors"
          >
            <div className="flex justify-between items-baseline">
              <h2 className="text-lg font-semibold">{t.label}</h2>
              <span className="text-sm text-foreground/40">
                {t.count} concepts
              </span>
            </div>
            <p className="text-sm text-foreground/50 mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
