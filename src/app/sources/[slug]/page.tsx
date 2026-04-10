import { notFound } from "next/navigation";
import Link from "next/link";
import { loadSources, getSourceBySlug, getAtomBySlug, getAtomUrl } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";
import type { AtomType } from "@/lib/schema";

export async function generateStaticParams() {
  const sources = await loadSources();
  return sources.map((s) => ({ slug: s.frontmatter.id }));
}

export default async function SourcePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const source = await getSourceBySlug(slug);
  if (!source) notFound();

  const fm = source.frontmatter;

  const atoms = await Promise.all(
    (fm.atoms_extracted ?? []).map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? { id, title: atom.frontmatter.title, type: atom.frontmatter.type, url: getAtomUrl({ id, type: atom.frontmatter.type }), found: true }
        : { id, title: id, type: "unknown" as AtomType, url: `/how-it-works/${id}`, found: false };
    })
  );

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: fm.title }]} />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          source · {fm.type}
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {fm.tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full bg-foreground/5 text-foreground/50"
            >
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs text-foreground/30 mt-2 block">
          Status: {fm.status}
        </span>
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: source.html }}
      />

      {atoms.length > 0 && (
        <nav className="mt-12 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Atoms extracted ({atoms.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {atoms.map((atom) => (
              <Link
                key={atom.id}
                href={atom.url}
                className="border border-foreground/10 rounded-lg p-3 hover:border-foreground/30 transition-colors"
              >
                <span className="font-medium text-sm block">{atom.title}</span>
                <span className="text-xs text-foreground/40">{atom.type}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}
    </main>
  );
}
