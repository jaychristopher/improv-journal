import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomBySlug, getAtomUrl, loadAtoms } from "@/lib/content";
import { atomDescription, extractDescription } from "@/lib/seo";

interface ExternalLink {
  label: string;
  url: string;
}

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => a.frontmatter.type === "reference")
    .map((a) => ({ slug: a.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom) return {};
  const desc = atomDescription(
    atom.frontmatter.title,
    atom.frontmatter.type,
    extractDescription(atom.content),
  );
  const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
  return {
    title: atom.frontmatter.title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title: atom.frontmatter.title, description: desc, url, type: "article" },
  };
}

export default async function LibraryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "reference") notFound();

  const fm = atom.frontmatter;
  const extLinks: ExternalLink[] =
    (fm as unknown as { external_links?: ExternalLink[] }).external_links ?? [];

  // Find all atoms that cite this reference
  const allAtoms = await loadAtoms();
  const citingAtoms = allAtoms.filter(
    (a) => a.frontmatter.type !== "reference" && a.frontmatter.links?.some((l) => l.id === fm.id),
  );

  // Group by type
  const byType = new Map<string, typeof citingAtoms>();
  for (const a of citingAtoms) {
    const t = a.frontmatter.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Library", href: "/library" },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
        {extLinks.length > 0 && (
          <div className="mt-4 flex gap-3">
            {extLinks.map((el) => (
              <a
                key={el.url}
                href={el.url}
                target="_blank"
                rel="noopener noreferrer"
                className="border-foreground/10 hover:border-foreground/30 text-foreground/60 hover:text-foreground/80 rounded-lg border px-4 py-2 text-sm transition-colors"
              >
                {el.label} {"\u2197"}
              </a>
            ))}
          </div>
        )}
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: atom.html }}
      />

      {citingAtoms.length > 0 && (
        <nav className="border-foreground/10 mt-12 border-t pt-8">
          <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
            Ideas shaped by this work
          </h2>
          {Array.from(byType.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .map(([type, typeAtoms]) => (
              <div key={type} className="mb-4">
                <h3 className="text-foreground/30 mb-2 text-xs capitalize">
                  {type}s ({typeAtoms.length})
                </h3>
                <ul className="space-y-1">
                  {typeAtoms.map((a) => (
                    <li key={a.frontmatter.id}>
                      <Link
                        href={getAtomUrl({
                          id: a.frontmatter.id,
                          type: a.frontmatter.type,
                        })}
                        className="text-sm hover:underline"
                      >
                        {a.frontmatter.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </nav>
      )}
    </main>
  );
}
