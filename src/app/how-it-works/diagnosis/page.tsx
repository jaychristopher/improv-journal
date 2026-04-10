import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

const DIAGNOSIS_TYPES = ["antipattern", "pattern", "framework"];

export default async function DiagnosisPage() {
  const atoms = await loadAtoms();
  const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
  const patterns = atoms.filter((a) => a.frontmatter.type === "pattern");
  const frameworks = atoms.filter((a) => a.frontmatter.type === "framework");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          system · diagnosis
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          When It Breaks
        </h1>
        <p className="text-foreground/60 mt-2">
          Collapse modes, failure patterns, and recovery — the diagnostic
          vocabulary for naming what went wrong and finding the way back.
        </p>
      </header>

      {frameworks.length > 0 && (
        <section className="mb-12">
          <h2 className="text-lg font-semibold mb-4">Frameworks</h2>
          <div className="space-y-3">
            {frameworks.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                className="block border border-foreground/10 rounded-lg bg-surface p-4 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-medium">{a.frontmatter.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">
          Antipatterns ({antipatterns.length})
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Named failure modes. You can't fix what you can't name.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {antipatterns.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border border-foreground/10 rounded-lg bg-surface p-3 hover:border-foreground/30 transition-colors"
            >
              <span className="text-sm font-medium">{a.frontmatter.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Patterns ({patterns.length})
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Emergent dynamics — heightening, discovery, recovery.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {patterns.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border border-foreground/10 rounded-lg bg-surface p-3 hover:border-foreground/30 transition-colors"
            >
              <span className="text-sm font-medium">{a.frontmatter.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
