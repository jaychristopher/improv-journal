import Link from "next/link";

import { getAtomUrl, loadAtoms } from "@/lib/content";

export default async function DiagnosisPage() {
  const atoms = await loadAtoms();
  const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
  const patterns = atoms.filter((a) => a.frontmatter.type === "pattern");
  const frameworks = atoms.filter((a) => a.frontmatter.type === "framework");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · diagnosis
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">When It Breaks</h1>
        <p className="text-foreground/60 mt-2">
          Collapse modes, failure patterns, and recovery — the diagnostic vocabulary for naming what
          went wrong and finding the way back.
        </p>
      </header>

      {frameworks.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Frameworks</h2>
          <div className="space-y-3">
            {frameworks.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-4 transition-colors"
              >
                <h3 className="font-medium">{a.frontmatter.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Antipatterns ({antipatterns.length})</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Named failure modes. You can&apos;t fix what you can&apos;t name.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {antipatterns.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
            >
              <span className="text-sm font-medium">{a.frontmatter.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Patterns ({patterns.length})</h2>
        <p className="text-foreground/40 mb-4 text-sm">
          Emergent dynamics — heightening, discovery, recovery.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {patterns.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
            >
              <span className="text-sm font-medium">{a.frontmatter.title}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
