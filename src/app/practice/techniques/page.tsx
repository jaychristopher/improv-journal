import Link from "next/link";
import { loadAtoms, getAtomUrl } from "@/lib/content";

export default async function TechniquesPage() {
  const atoms = await loadAtoms();
  const techniques = atoms.filter((a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy");

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <header className="mb-12">
        <span className="text-xs uppercase tracking-wider text-foreground/40">practice · techniques</span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Techniques ({techniques.length})</h1>
        <p className="text-foreground/60 mt-2">
          The specific moves — how to listen, initiate, edit, support, heighten, and recover.
          Each technique is a learnable behavior that serves the principles.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {techniques.map((a) => (
          <Link key={a.frontmatter.id} href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })} className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors">
            <span className="text-sm font-medium">{a.frontmatter.title}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
