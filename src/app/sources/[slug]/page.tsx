import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomBySlug, getAtomUrl, getSourceBySlug, loadSources } from "@/lib/content";
import type { AtomType } from "@/lib/schema";

export async function generateStaticParams() {
  const sources = await loadSources();
  return sources.map((s) => ({ slug: s.frontmatter.id }));
}

export default async function SourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const source = await getSourceBySlug(slug);
  if (!source) notFound();

  const fm = source.frontmatter;

  const atoms = await Promise.all(
    (fm.atoms_extracted ?? []).map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? {
            id,
            title: atom.frontmatter.title,
            type: atom.frontmatter.type,
            url: getAtomUrl({ id, type: atom.frontmatter.type }),
            found: true,
          }
        : { id, title: id, type: "unknown" as AtomType, url: `/how-it-works/${id}`, found: false };
    }),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: fm.title }]} />

      <header className="mb-8">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          source · {fm.type}
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {fm.tags?.map((tag) => (
            <span
              key={tag}
              className="bg-foreground/5 text-foreground/50 rounded-full px-2 py-0.5 text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-foreground/30 mt-2 block text-xs">Status: {fm.status}</span>
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: source.html }}
      />

      {atoms.length > 0 && (
        <nav className="border-foreground/10 mt-12 border-t pt-8">
          <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
            Atoms extracted ({atoms.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {atoms.map((atom) => (
              <Link
                key={atom.id}
                href={atom.url}
                className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-3 transition-colors"
              >
                <span className="block text-sm font-medium">{atom.title}</span>
                <span className="text-foreground/40 text-xs">{atom.type}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </main>
  );
}
