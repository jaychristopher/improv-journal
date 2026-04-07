import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

export default async function ExercisesPage() {
  const atoms = await loadAtoms();
  const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">practice · exercises</span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Exercises ({exercises.length})</h1>
        <p className="text-foreground/60 mt-2">
          Structured activities that build specific skills through constraints.
          The constraint does the teaching — not willpower, not lectures.
        </p>
      </header>
      <div className="space-y-3">
        {exercises.map((a) => (
          <Link key={a.frontmatter.id} href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })} className="block border border-foreground/10 rounded-lg p-4 hover:border-foreground/30 transition-colors">
            <h3 className="font-medium">{a.frontmatter.title}</h3>
            <p className="text-xs text-foreground/40 mt-1 line-clamp-2">{a.content.replace(/^---[\s\S]*?---\n*/m, "").replace(/^#{1,6}\s+.*$/gm, "").replace(/\*\*[^*]+\*\*/g, "").trim().substring(0, 150)}...</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
