import { notFound } from "next/navigation";
import Link from "next/link";
import { loadAtoms, getAtomBySlug, getAudioUrl } from "@/lib/content";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";

export async function generateStaticParams() {
  const atoms = await loadAtoms();
  return atoms.map((a) => ({ slug: a.frontmatter.id }));
}

export default async function AtomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom) notFound();

  const fm = atom.frontmatter;
  const audioUrl = getAudioUrl("atoms", slug);

  // Pluralize type for concept hub URL
  const typePlural = fm.type === "axiom" ? "axioms"
    : fm.type === "antipattern" ? "antipatterns"
    : fm.type + "s";

  return (
    <main className="max-w-2xl mx-auto px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Concepts", href: "/#concepts" },
          { label: typePlural, href: `/concepts/${typePlural}` },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <span className="text-xs uppercase tracking-wider text-foreground/40">
          atom · {fm.type}
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

      {audioUrl && <AudioPlayer src={audioUrl} />}

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: atom.html }}
      />

      {fm.links && fm.links.length > 0 && (
        <nav className="mt-12 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Connections
          </h2>
          <ul className="space-y-2">
            {fm.links.map((link) => (
              <li key={link.id}>
                <Link
                  href={`/atoms/${link.id}`}
                  className="text-sm hover:underline"
                >
                  {link.id}
                </Link>
                <span className="text-xs text-foreground/40 ml-2">
                  {link.relation}
                </span>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {fm.sources && fm.sources.length > 0 && (
        <nav className="mt-8 pt-8 border-t border-foreground/10">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/40 mb-4">
            Provenance
          </h2>
          <ul className="space-y-2">
            {fm.sources.map((sourceId) => (
              <li key={sourceId}>
                <Link
                  href={`/sources/${sourceId}`}
                  className="text-sm hover:underline"
                >
                  {sourceId}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </main>
  );
}
