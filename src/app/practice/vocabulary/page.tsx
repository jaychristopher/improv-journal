import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

export default async function VocabularyPage() {
  const atoms = await loadAtoms();
  const definitions = atoms.filter((a) => a.frontmatter.type === "definition");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">practice · vocabulary</span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Vocabulary ({definitions.length})</h1>
        <p className="text-foreground/60 mt-2">
          The foundational concepts that name what's happening in scenes, shows, and conversations.
          The shared language that makes diagnosis possible.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {definitions.map((a) => (
          <Link key={a.frontmatter.id} href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })} className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors">
            <span className="text-sm font-medium">{a.frontmatter.title}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
