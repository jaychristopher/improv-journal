import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";

export default async function VocabularyPage() {
  const atoms = await loadAtoms();
  const definitions = atoms.filter((a) => a.frontmatter.type === "definition");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Vocabulary" },
        ]}
      />
      <header className="mb-12">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Vocabulary ({definitions.length})
        </h1>
        <p className="text-foreground/60 mt-2">
          The foundational concepts that name what&apos;s happening in scenes, shows, and
          conversations. The shared language that makes diagnosis possible.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-3">
        {definitions.map((a) => (
          <Link
            key={a.frontmatter.id}
            href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
            className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
          >
            <span className="text-sm font-medium">{a.frontmatter.title}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
