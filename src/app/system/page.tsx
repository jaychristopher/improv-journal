import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

export default async function SystemPage() {
  const atoms = await loadAtoms();
  const axioms = atoms.filter((a) => a.frontmatter.type === "axiom");
  const insights = atoms.filter((a) => a.frontmatter.type === "insight");
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          the system
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          The Physics of Connection
        </h1>
        <p className="text-foreground/60 mt-2">
          Six constraints govern every real-time human interaction. Eight
          principles keep the shared reality intact. When it breaks, there are
          specific failure modes — and specific recoveries.
        </p>
      </header>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">The 6 Axioms</h2>
        <p className="text-sm text-foreground/40 mb-4">
          The physics underneath — constraints that explain why improv works the
          way it does, and why conversations break the way they do.
        </p>
        <div className="space-y-3">
          {axioms.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
            >
              <h3 className="font-medium">{a.frontmatter.title}</h3>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">
          <Link href="/system/principles" className="hover:underline">
            The 8 Principles
          </Link>
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Behavioral guidelines derived from the axioms. Not moral rules —
          structural commands to prevent collapse.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {principles.map((a) => (
            <Link
              key={a.frontmatter.id}
              href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
              className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors"
            >
              <span className="text-sm font-medium">{a.frontmatter.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-lg font-semibold mb-4">
          <Link href="/system/diagnosis" className="hover:underline">
            Diagnosis: When It Breaks
          </Link>
        </h2>
        <p className="text-sm text-foreground/40 mb-4">
          Collapse modes, antipatterns, and recovery patterns — the vocabulary
          for naming what went wrong.
        </p>
        <Link
          href="/system/diagnosis"
          className="text-sm hover:underline text-foreground/60"
        >
          View all failure modes and recoveries &rarr;
        </Link>
      </section>

      {insights.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Insights</h2>
          <div className="space-y-3">
            {insights.map((a) => (
              <Link
                key={a.frontmatter.id}
                href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors"
              >
                <h3 className="font-medium">{a.frontmatter.title}</h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
