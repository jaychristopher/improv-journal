import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/ArticleJsonLd";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CitedWorkJsonLd } from "@/components/CitedWorkJsonLd";
import { PodcastJsonLd } from "@/components/PodcastJsonLd";
import { TableOfContents } from "@/components/TableOfContents";
import { Transcript, transcriptHref } from "@/components/Transcript";
import { UpdatedOn } from "@/components/UpdatedOn";
import { getAudioDuration } from "@/lib/audio-manifest";
import {
  getAtomBySlug,
  getAtomDisplayTitle,
  getAtomUrl,
  getAudioUrl,
  getInboundLinks,
  loadAtoms,
} from "@/lib/content";
import { firstContentImage } from "@/lib/content-image";
import { CITING_GUIDES_CAP, guidesCitingWork } from "@/lib/guide-sources";
import { contentsFor } from "@/lib/headings";
import { hubCrumb, HUBS } from "@/lib/hubs";
import {
  atomMentions,
  CITED_BY_OPEN,
  citingConcepts,
  indexAtoms,
  workCitedBy,
} from "@/lib/jsonld-edges";
import { CITING_LESSONS_CAP, lessonsCitingWork } from "@/lib/lesson-sources";
import { readingMinutes } from "@/lib/reading-time";
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
import { getSeriesForPage } from "@/lib/shows-for-content";

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

  // Library entries were the one content route with no player. The audio
  // exists for every other atom type, and a reading-list entry — what is in
  // the book, what has aged, who it rewards — is as listenable as any of them.
  //
  // The comment here used to say references belong to no show. Then Deep
  // Cuts gained a Library season (tracker entry 176) and the 32 readings
  // became episodes in its feed while this page, which does not render
  // through AtomDetail, still said nothing about it: no "An episode of"
  // line, no PodcastEpisode markup, no link back to the show (entry 242,
  // 2026-09-21). The show index is the one place membership is decided, so
  // this page asks it the way AtomDetail does rather than assuming an answer.
  const audioUrl = getAudioUrl("atoms", fm.id);
  const series = audioUrl ? await getSeriesForPage(url) : null;
  const audioDuration = audioUrl ? getAudioDuration(audioUrl) : undefined;

  const allAtoms = await loadAtoms();
  const atomById = new Map(allAtoms.map((a) => [a.frontmatter.id, a]));
  // For the markup: the concepts this entry informs go on the Article as
  // `mentions`, the concepts that cite it on the Book as `subjectOf`.
  const atomIndex = indexAtoms(allAtoms);

  // Concepts this work informs, as the reference itself declares them. These
  // were named in prose at the foot of each entry and left to the auto-linker,
  // which matches on title text and so caught almost none of them.
  const informs = (fm.links ?? [])
    .map((link) => atomById.get(link.id))
    .filter(
      (a): a is NonNullable<typeof a> => a !== undefined && a.frontmatter.type !== "reference",
    );

  // Concepts that cite this work: every non-reference atom with an edge
  // toward it, in `citingConcepts`' order — by how much the graph leans on
  // the citing concept for its age, then title, with a slot in the open
  // dozen reserved for the newest cohort (entry 307) — the order workCitedBy
  // uses for the Book's `subjectOf`, so the visible list and the markup name
  // the same concepts in the same order. Until 2026-09-22 this list dropped
  // any concept the entry itself names above, and on 13 of the 32 entries —
  // eleven of them the science added on 2026-08-23 — every citing concept
  // was one of those, so the block did not render at all and the page
  // showed none of the citations its markup declared (tracker entry 268).
  // A concept that both is named by the work and cites it now appears under
  // both headings, because both are true of it.
  const seenCiting = new Set<string>();
  const citedByOrder = new Map(citingConcepts(fm.id, atomIndex).map((c, i) => [c.id, i]));
  const citedBy = (await getInboundLinks(fm.id))
    .filter((l) => {
      if (l.type === "reference" || seenCiting.has(l.id)) return false;
      seenCiting.add(l.id);
      return true;
    })
    .sort(
      (a, b) =>
        (citedByOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (citedByOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER),
    );
  const openCitedBy = citedBy.slice(0, CITED_BY_OPEN);
  const foldedCitedBy = citedBy.slice(CITED_BY_OPEN);

  // Lessons whose "Sources behind this lesson" block names this work. That
  // block is computed from the atoms a lesson composes, not declared on the
  // lesson, so the atom `links` walk above could never find them: 180
  // lesson → work links with one answered from this page (tracker entry 219,
  // 2026-09-21). Same function as the lesson page, inverted, so the two
  // surfaces cannot disagree.
  const citingLessons = await lessonsCitingWork(fm.id);
  const shownLessons = citingLessons.slice(0, CITING_LESSONS_CAP);
  const moreLessons = citingLessons.length - shownLessons.length;

  // Guides whose "Sources behind this guide" block names this work. The guide
  // does not cite it — its declared concepts do — so the link is inherited,
  // and the heading says so rather than claiming a citation the guide's body
  // never made: 48 of 78 guides link no work at all and stand on 5 to 12
  // through their concepts (tracker entry 334, 2026-09-22). Same function as
  // the guide page, inverted, so neither surface can list what the other does
  // not. 683 guide → work links reaching 31 of the 32 entries.
  const citingGuides = await guidesCitingWork(fm.id);
  const shownGuides = citingGuides.slice(0, CITING_GUIDES_CAP);
  const moreGuides = citingGuides.length - shownGuides.length;

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
        contentImage={firstContentImage(atom.content)}
        mentions={atomMentions(fm, atomIndex)}
      />
      {fm.work && (
        <CitedWorkJsonLd
          work={fm.work}
          url={url}
          description={description}
          externalLinks={extLinks}
          citedBy={workCitedBy(fm.id, atomIndex)}
        />
      )}
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, hubCrumb(HUBS.library), { label: fm.title }]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
        {/* Library entries are the best-ranking pages here and several run past
            2,000 words; they had a byline and a date but no length. Counted
            from the html the article below renders. */}
        <UpdatedOn
          date={fm.updated}
          minutes={readingMinutes(atom.html)}
          status={fm.status}
          className="text-foreground/50 mt-3 text-xs"
        />
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

      {audioUrl && (
        <div>
          <AudioPlayer src={audioUrl} transcriptHref={transcriptHref("atoms", fm.id)} />
          {series && (
            <>
              <p
                className="text-foreground/50 mt-2 text-xs"
                data-track="series"
                data-derived="true"
              >
                An episode of{" "}
                <Link href={`/listen/${series.id}`} className="underline">
                  {series.title}
                </Link>
                .
              </p>
              <PodcastJsonLd
                title={fm.title}
                description={description}
                audioUrl={audioUrl}
                pageUrl={url}
                duration={audioDuration}
                series={series}
              />
            </>
          )}
        </div>
      )}

      {/* Thirteen of the 32 entries clear the three-heading floor now that
          their sections are headings rather than bold labels. contentsFor
          returns nothing below it, so the shorter entries render no list. */}
      <TableOfContents headings={contentsFor(atom.html)} />

      <article
        className="prose prose-neutral dark:prose-invert max-w-none"
        data-track="body"
        dangerouslySetInnerHTML={{ __html: atom.html }}
      />

      {/* Below the prose, before the connections, so the entry's own words
          come first in DOM order (tracker entry 260); the player links down. */}
      {audioUrl && <Transcript layer="atoms" id={fm.id} currentUrl={url} body={atom.html} />}

      {informs.length > 0 && (
        <nav
          className="border-foreground/10 mt-12 border-t pt-8"
          data-track="library-informs"
          data-derived="true"
        >
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
        
        The two headings were English synonyms — "X informs Y" and "Y shaped by
        X" are the same sentence in opposite voice — so on the entries that
        render both, a reader met two identical-sounding headings over different
        lists and no way to tell what separated them.

        What separates them is which side declared the link: the section above is
        what this entry names in its own frontmatter, this one is every concept
        that names the entry. That is an authoring detail and no reader can infer
        it, but "cites" is a relation people already understand, and it is what
        this list actually is. The two sets overlap — 107 of the 178 edges a work
        declares are returned — and a concept in both is listed in both, since
        the list below is the page's answer to "who cites this", and an answer
        that left out the concepts the work also names was empty on 13 entries.
      */}
      {(citedBy.length > 0 || citingLessons.length > 0 || citingGuides.length > 0) && (
        <nav
          className="border-foreground/10 mt-12 border-t pt-8"
          data-track="library-cited-by"
          data-derived="true"
        >
          <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
            Pages that cite it
          </h2>
          {citedBy.length > 0 && (
            <div className="mb-4">
              <h3 className="text-foreground/30 mb-2 text-xs">{`Concepts (${citedBy.length})`}</h3>
              <ul className="space-y-1">
                {openCitedBy.map((l) => (
                  <li key={l.id}>
                    <Link href={l.url} className="text-sm hover:underline">
                      {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {/* A native details, not a client toggle: the folded links are
                  in the server-rendered html, so a crawler follows them and
                  the count on the page is the count in the graph. */}
              {foldedCitedBy.length > 0 && (
                <details className="mt-2">
                  <summary className="text-foreground/50 hover:text-foreground/70 cursor-pointer text-xs">
                    {`+${foldedCitedBy.length} more`}
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {foldedCitedBy.map((l) => (
                      <li key={l.id}>
                        <Link href={l.url} className="text-sm hover:underline">
                          {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {citingLessons.length > 0 && (
            <div className="mb-4">
              <h3 className="text-foreground/30 mb-2 text-xs">Lessons ({citingLessons.length})</h3>
              <ul className="space-y-1">
                {shownLessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={lesson.href} className="text-sm hover:underline">
                      {lesson.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {moreLessons > 0 && (
                <p className="text-foreground/50 mt-2 text-xs">
                  and{" "}
                  <Link href="/threads" className="underline">
                    {moreLessons} more
                  </Link>
                </p>
              )}
            </div>
          )}
          {citingGuides.length > 0 && (
            <div className="mb-4">
              {/* "Standing on it", not "citing it": the guide inherits the
                  work through the concepts it declares, and saying "cites"
                  would credit the guide's body with a citation it does not
                  make. */}
              <h3 className="text-foreground/30 mb-2 text-xs">
                Guides standing on it ({citingGuides.length})
              </h3>
              <ul className="space-y-1">
                {shownGuides.map((guide) => (
                  <li key={guide.slug}>
                    <Link href={guide.href} className="text-sm hover:underline">
                      {guide.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {moreGuides > 0 && (
                <p className="text-foreground/50 mt-2 text-xs">
                  and{" "}
                  <Link href="/guides" className="underline">
                    {moreGuides} more
                  </Link>
                </p>
              )}
            </div>
          )}
        </nav>
      )}
    </main>
  );
}
