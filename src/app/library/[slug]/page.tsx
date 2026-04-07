import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAtoms, getAtomBySlug, getAtomUrl } from "@/lib/content";
import { Breadcrumb } from "@/components/Breadcrumb";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms
    .filter((a) => a.frontmatter.type === "reference")
    .map((a) => ({ slug: a.frontmatter.id }));
}

export default async function LibraryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "reference") notFound();

  const fm = atom.frontmatter;

  // Find all atoms that cite this reference
  const allAtoms = await loadAtoms();
  const citingAtoms = allAtoms.filter(
    (a) =>
      a.frontmatter.type !== "reference" &&
      a.frontmatter.links?.some((l) => l.id === fm.id)
  );

  // Group by type
  const byType = new Map<string, typeof citingAtoms>();
  for (const a of citingAtoms) {
    const t = a.frontmatter.type;
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Library", href: "/library" },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          reference
        </span>
        <h1 className="text-3xl font-bold tracking-tight mt-1">{fm.title}</h1>
      </header>

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: atom.html }}
      />

      {citingAtoms.length > 0 && (
        <nav className="mt-12 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Cited by {citingAtoms.length} concepts
          </h2>
          {Array.from(byType.entries())
            .sort((a, b) => b[1].length - a[1].length)
            .map(([type, atoms]) => (
              <div key={type} className="mb-4">
                <h3 className="text-xs text-foreground/30 mb-2 capitalize">
                  {type}s ({atoms.length})
                </h3>
                <ul className="space-y-1">
                  {atoms.map((a) => (
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
