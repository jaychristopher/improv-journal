import type { Metadata } from "next";
import Link from "next/link";

import { getAtomUrl, loadAtoms } from "@/lib/content";

export const metadata: Metadata = {
  title: "The 8 Principles",
  description:
    "Behavioral guidelines derived from the physics of connection. Not moral rules — structural commands that prevent shared reality from collapsing.",
  alternates: { canonical: "/how-it-works/principles" },
};

export default async function PrinciplesPage() {
  const atoms = await loadAtoms();
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          system · principles
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">The 8 Principles</h1>
        <p className="text-foreground/60 mt-2">
          Behavioral guidelines derived from the physics. Not moral rules — structural commands that
          prevent shared reality from collapsing.
        </p>
      </header>

      <div className="space-y-4">
        {principles.map((a) => (
          <Link
            key={a.frontmatter.id}
            href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
          >
            <h3 className="font-semibold">{a.frontmatter.title}</h3>
            <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">
              {a.content
                .replace(/^---[\s\S]*?---\n*/m, "")
                .replace(/^#{1,6}\s+.*$/gm, "")
                .replace(/\*\*[^*]+\*\*/g, "")
                .trim()
                .substring(0, 150)}
              ...
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
