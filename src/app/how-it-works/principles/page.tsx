import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

export default async function PrinciplesPage() {
  const atoms = await loadAtoms();
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          system · principles
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          The 8 Principles
        </h1>
        <p className="text-foreground/60 mt-2">
          Behavioral guidelines derived from the physics. Not moral rules —
          structural commands that prevent shared reality from collapsing.
        </p>
      </header>

      <div className="space-y-4">
        {principles.map((a) => (
          <Link
            key={a.frontmatter.id}
            href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
            className="block border border-foreground/10 rounded-lg bg-surface p-5 hover:border-foreground/30 transition-colors"
          >
            <h3 className="font-semibold">{a.frontmatter.title}</h3>
            <p className="text-sm text-foreground/50 mt-1 line-clamp-2">
              {a.content
                .replace(/^---[\s\S]*?---\n*/m, "")
                .replace(/^#{1,6}\s+.*$/gm, "")
                .replace(/\*\*[^*]+\*\*/g, "")
                .trim()
                .substring(0, 150)}...
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
