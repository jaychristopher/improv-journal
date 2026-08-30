import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/ArticleJsonLd";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CitedWorkJsonLd } from "@/components/CitedWorkJsonLd";
import { TableOfContents } from "@/components/TableOfContents";
import { UpdatedOn } from "@/components/UpdatedOn";
import { getAtomBySlug, getAtomDisplayTitle, getAtomUrl, loadAtoms } from "@/lib/content";
import { contentsFor } from "@/lib/headings";
import type { ExternalLink } from "@/lib/schema";
import {
  atomDescription,
  extractDescription,
  leadParagraph,
  ogImages,
  pageTitle,
  SITE_NAME,
  stripLeadLabel,
} from "@/lib/seo";

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
  const displayTitle = await getAtomDisplayTitle(atom);
  const desc = atomDescription(
    atom.frontmatter.title,
    atom.frontmatter.type,
    extractDescription(atom.content),
    undefined,
    undefined,
    atom.frontmatter.description,
  );
  const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
  return {
    title: pageTitle(displayTitle),
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title: displayTitle,
      description: desc,
      url,
      type: "article",
      images: ogImages(displayTitle, "Reading List"),
    },
  };
}

export default async function LibraryDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const atom = await getAtomBySlug(slug);
  if (!atom || atom.frontmatter.type !== "reference") notFound();

  const fm = atom.frontmatter;
  // The same title and eyebrow generateMetadata builds the card from, so the
  // Article names the image the page actually declares as og:image.
  const displayTitle = await getAtomDisplayTitle(atom);
  const extLinks: ExternalLink[] = fm.external_links ?? [];
  const url = getAtomUrl({ id: fm.id, type: fm.type });
  // Same six arguments generateMetadata uses. Without the last one the Book
  // entity described the work differently from the meta tag on the same page.
  const description = atomDescription(
    fm.title,
    fm.type,
    extractDescription(atom.content),
    undefined,
    undefined,
    fm.description,
  );

  const allAtoms = await loadAtoms();
  const atomById = new Map(allAtoms.map((a) => [a.frontmatter.id, a]));

  // Concepts this work informs, as the reference itself declares them. These
  // were named in prose at the foot of each entry and left to the auto-linker,
  // which matches on title text and so caught almost none of them.
  const informs = (fm.links ?? [])
    .map((link) => atomById.get(link.id))
    .filter(
      (a): a is NonNullable<typeof a> => a !== undefined && a.frontmatter.type !== "reference",
    );
  const informsIds = new Set(informs.map((a) => a.frontmatter.id));

  // Atoms that cite this reference. Anything already listed above is dropped
  // so a concept never appears twice on the page.
  const citingAtoms = allAtoms.filter(
    (a) =>
      a.frontmatter.type !== "reference" &&
      !informsIds.has(a.frontmatter.id) &&
      a.frontmatter.links?.some((l) => l.id === fm.id),
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
      {/* CitedWorkJsonLd describes the book. This describes the page about it —
          who wrote it and when it last changed, which the library entries were
          the only content pages on the site not to say. */}
      <ArticleJsonLd
        title={displayTitle}
        description={description}
        url={url}
        datePublished={fm.created}
        dateModified={fm.updated}
        eyebrow="Reading List"
      />
      {fm.work && (
        <CitedWorkJsonLd
          work={fm.work}
          url={url}
          description={description}
          externalLinks={extLinks}
        />
      )}
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Library", href: "/library" },
          { label: fm.title },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
        <UpdatedOn date={fm.updated} className="text-foreground/50 mt-3 text-xs" />
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

      {/* Thirteen of the 32 entries clear the three-heading floor now that
          their sections are headings rather than bold labels. contentsFor
          returns nothing below it, so the shorter entries render no list. */}
      <TableOfContents headings={contentsFor(atom.html)} />

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: atom.html }}
      />

      {informs.length > 0 && (
        <nav className="border-foreground/10 mt-12 border-t pt-8">
          <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
            Concepts this work informs
          </h2>
          <ul className="space-y-2">
            {informs.map((a) => (
              <li key={a.frontmatter.id}>
                <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-3 transition-colors">
                  <Link
                    href={getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })}
                    className="block text-sm font-medium after:absolute after:inset-0"
                  >
                    {a.frontmatter.title}
                  </Link>
                  <span className="text-foreground/60 mt-1 block text-xs">
                    {leadParagraph(stripLeadLabel(a.content), 150)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/*
        "Pages that cite it", not "Ideas shaped by this work".
        
        The two sections hold disjoint sets and their headings were English
        synonyms — "X informs Y" and "Y shaped by X" are the same sentence in
        opposite voice — so on the 19 entries that render both, a reader met two
        identical-sounding headings over different lists and no way to tell what
        separated them.
        
        What separates them is which side declared the link: the section above is
        what this entry names in its own frontmatter, this one is every concept
        that names the entry. That is an authoring detail and no reader can infer
        it, but "cites" is a relation people already understand, and it is what
        this list actually is.
      */}
      {citingAtoms.length > 0 && (
        <nav className="border-foreground/10 mt-12 border-t pt-8">
          <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
            Pages that cite it
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
