import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleJsonLd } from "@/components/ArticleJsonLd";
import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { GuideConcepts } from "@/components/GuideConcepts";
import { GuideSources } from "@/components/GuideSources";
import { PodcastJsonLd } from "@/components/PodcastJsonLd";
import { PromptGenerator } from "@/components/PromptGenerator";
import { RelatedGuides } from "@/components/RelatedGuides";
import { TableOfContents } from "@/components/TableOfContents";
import { Transcript, transcriptHref } from "@/components/Transcript";
import { UpdatedOn } from "@/components/UpdatedOn";
import { WhatsNext } from "@/components/WhatsNext";
import { WouldYouRather } from "@/components/WouldYouRather";
import { schoolHandoffOf } from "@/lib/atom-lineage";
import { getAudioDuration } from "@/lib/audio-manifest";
import {
  drillFitsLevels,
  drillLevelNote,
  fallbackExerciseForLevels,
  guideDrillLevels,
  guidePathNote,
  targetOnEntryPath,
} from "@/lib/bridge-cta-fallback";
import {
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getBridgeBySlug,
  getPathBySlug,
  getThreadBySlug,
  loadAtoms,
  loadBridges,
} from "@/lib/content";
import { firstContentImage } from "@/lib/content-image";
import { getCategoryForGuide } from "@/lib/guide-categories";
import { isAuthority } from "@/lib/guide-cohorts";
import {
  getGuideConcepts,
  getGuideDrills,
  getGuideLessons,
  getGuideSubjectGap,
  nextDrill,
  pathTeachesOfGuide,
} from "@/lib/guide-concepts";
import { guideSources } from "@/lib/guide-sources";
import { conceptMarks, getGuideHeadedConcepts, walkedDrills } from "@/lib/headed-concepts";
import { contentsFor } from "@/lib/headings";
import { guideSubjectConceptId } from "@/lib/jsonld-edges";
import { resolvePromptConcepts } from "@/lib/prompt-concepts";
import { readingMinutes } from "@/lib/reading-time";
import { getRelatedBridges } from "@/lib/related-bridges";
import type { BridgeFrontmatter, PathFrontmatter } from "@/lib/schema";
import { ogImages, pageTitle, SITE_NAME } from "@/lib/seo";
import { getSeriesForPage } from "@/lib/shows-for-content";
import { traditionsOf } from "@/lib/tradition-guides";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) return {};

  const fm = bridge.frontmatter;
  return {
    title: pageTitle(fm.title),
    description: fm.description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title: fm.title,
      description: fm.description,
      url: `/${slug}`,
      type: "article",
      images: ogImages(fm.title, "Guide"),
    },
  };
}

export async function generateStaticParams() {
  const bridges = await loadBridges();
  return bridges.map((bridge) => ({ slug: bridge.slug }));
}

/**
 * Guides that open with an interactive tool rather than prose. Keyed by slug
 * so the page and the tool are wired here and nowhere else.
 */
const HERO_TOOLS: Record<string, () => Promise<React.ReactNode>> = {
  // The generator's categories are concepts under other names; the map is
  // resolved here because the generator is a client component and cannot
  // read the graph (tracker entry 332).
  "improv-prompts": async () => (
    <PromptGenerator surface="guide-hero" concepts={await resolvePromptConcepts()} />
  ),
  // The page argues that a list is the wrong product for this game: the
  // answer is worthless, the defence is the game, and it dies on "it
  // depends". The hero is that argument as a tool — two questions, then one
  // pair at a time with no third option.
  "would-you-rather-questions": async () => <WouldYouRather surface="guide-hero" />,
};

interface BridgeActionLink {
  href: string;
  label: string;
  title: string;
  /** The path-card note (tracker entry 285), when the card is a path or a lesson. */
  description?: string;
}

/** How a guide's lineage line names each tradition (entry 271). */
const LINEAGE_LABEL: Record<string, string> = {
  johnstone: "Johnstone",
  spolin: "Spolin",
  close: "iO and the Harold",
  ucb: "UCB",
  annoyance: "the Annoyance",
};

interface BridgePrimaryCta extends BridgeActionLink {
  description?: string;
  eventTarget: string;
  /** The drill's picker tags, when the card is a drill: the level note reads them. */
  drillTags?: string[];
}

/**
 * The picker levels the guide's readers are at: its entry path's audiences,
 * mapped the way the lesson page maps them (`getThreadDrillLevels`). The
 * guide has no audience field; the entry path is the one statement of who it
 * is for, and the path card on this page already reads it (tracker entry
 * 275). Empty for a guide with no entry path, so nothing is filtered.
 */
async function resolveBridgeLevels(fm: BridgeFrontmatter): Promise<string[]> {
  const path = fm.entry_path ? await getPathBySlug(fm.entry_path) : null;
  return guideDrillLevels(path?.frontmatter.audience);
}

/** Exercise id → tags, for the level checks below. */
async function exerciseTagsById(): Promise<Map<string, string[]>> {
  const atoms = await loadAtoms();
  return new Map(
    atoms
      .filter((a) => a.frontmatter.type === "exercise")
      .map((a) => [a.frontmatter.id, a.frontmatter.tags ?? []]),
  );
}

/**
 * The drill card with a level note when its drill fails the level of the
 * reader the entry path names: "An intermediate drill; the path below starts
 * earlier." Thirteen of the 44 drill cards failed on 2026-09-22 — seven
 * declared, six derived, eleven of them a beginner-path guide handing over
 * one of the intermediate courage drills the closers favour (tracker entry
 * 275). A declared drill is the author's override and stays; the note makes
 * the card honest about it. A derived drill that still fails after
 * `fallbackExerciseForLevels` looked for a fitting one gets the same note,
 * worded for a page with no path card below it. A card that is not a drill,
 * or whose drill fits, is returned as it was.
 */
function withLevelNote(
  cta: BridgePrimaryCta | null,
  levels: readonly string[],
  pathBelow: boolean,
): BridgePrimaryCta | null {
  if (!cta?.drillTags) return cta;
  const note = drillLevelNote(cta.drillTags, levels, pathBelow);
  if (!note) return cta;
  return { ...cta, description: cta.description ? `${cta.description} ${note}` : note };
}

/**
 * The drill card when the guide declares no CTA: the first exercise its own
 * practice closer names in backticks that fits the entry path's level, else
 * the first at all. The declared fields, when present, are an override — the
 * closer is where 23 of 26 declared targets were copied from by hand, and
 * twelve guides had the closer and not the copy (novel-insights entry 183).
 * Null when the guide has no closer, or the closer names no exercise, so the
 * page falls through to its entry path.
 */
async function resolveBridgeDrillFromBody(
  fm: BridgeFrontmatter,
  content: string,
): Promise<BridgePrimaryCta | null> {
  if (fm.primary_cta_type || fm.primary_cta_target) return null;

  const [atoms, tagsById, levels] = await Promise.all([
    loadAtoms(),
    exerciseTagsById(),
    resolveBridgeLevels(fm),
  ]);
  const id = fallbackExerciseForLevels(content, tagsById, levels);
  if (!id) return null;
  const atom = atoms.find((a) => a.frontmatter.id === id);
  if (!atom) return null;

  return {
    label: "Do this drill",
    title: atom.frontmatter.title,
    href: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
    description: fm.primary_problem
      ? `If your main issue is ${fm.primary_problem}, this is the clearest next step.`
      : "The drill this guide points at.",
    eventTarget: atom.frontmatter.id,
    drillTags: atom.frontmatter.tags ?? [],
  };
}

async function resolveBridgePrimaryCta(fm: BridgeFrontmatter): Promise<BridgePrimaryCta | null> {
  const description = fm.primary_problem
    ? `If your main issue is ${fm.primary_problem}, this is the clearest next step.`
    : undefined;

  if (!fm.primary_cta_type || !fm.primary_cta_target) return null;

  switch (fm.primary_cta_type) {
    case "path": {
      const [path, entryPath] = await Promise.all([
        getPathBySlug(fm.primary_cta_target),
        getPathBySlug(fm.entry_path),
      ]);
      if (!path) return null;

      return {
        label:
          path.frontmatter.id === "beginner-foundations"
            ? "Start the beginner sequence"
            : "Start this path",
        title: path.frontmatter.title,
        href: `/paths/${path.frontmatter.id}`,
        description: withPathNote(description, entryPath?.frontmatter, path.frontmatter.id),
        eventTarget: path.frontmatter.id,
      };
    }
    case "thread": {
      const thread = await getThreadBySlug(fm.primary_cta_target);
      if (!thread) return null;

      return {
        label: "Read this next",
        title: thread.frontmatter.title,
        href: `/threads/${thread.frontmatter.id}`,
        description,
        eventTarget: thread.frontmatter.id,
      };
    }
    case "exercise": {
      const atom = await getAtomBySlug(fm.primary_cta_target);
      if (!atom || atom.frontmatter.type !== "exercise") return null;

      return {
        label: "Do this drill",
        title: atom.frontmatter.title,
        href: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
        description,
        eventTarget: atom.frontmatter.id,
        drillTags: atom.frontmatter.tags ?? [],
      };
    }
    case "challenge":
      return null;
  }
}

/**
 * A path or lesson card's description with the entry path's note appended
 * (tracker entry 285): "For beginners." when the card's target is the entry
 * path or a lesson on it; "This guide is filed under <path>, for <readers>."
 * when it is not, so the reader sees the same fact the tier, the hubs and the
 * level check are derived from. `entryPath` is undefined only when the guide's
 * `entry_path` resolves to nothing, and then there is nothing to say.
 */
function withPathNote(
  description: string | undefined,
  entryPath: PathFrontmatter | undefined,
  targetId: string,
): string | undefined {
  if (!entryPath) return description;
  const note = guidePathNote(entryPath, targetOnEntryPath(targetId, entryPath));
  if (!note) return description;
  return description ? `${description} ${note}` : note;
}

async function resolveBridgeSecondaryCta(fm: BridgeFrontmatter): Promise<BridgeActionLink | null> {
  const targetId = fm.secondary_cta_target;
  if (!targetId) return null;

  const [path, entryPath] = await Promise.all([
    getPathBySlug(targetId),
    getPathBySlug(fm.entry_path),
  ]);
  if (path) {
    return {
      label: "Then start this path",
      title: path.frontmatter.title,
      href: `/paths/${path.frontmatter.id}`,
      description: withPathNote(undefined, entryPath?.frontmatter, path.frontmatter.id),
    };
  }

  const thread = await getThreadBySlug(targetId);
  if (thread) {
    // A lesson on the entry path needs no note: the path card above it, when
    // there is one, carries the audience. A lesson off the path says where
    // the guide is filed (how-to-be-funny on 2026-09-22).
    const onPath = entryPath
      ? targetOnEntryPath(thread.frontmatter.id, entryPath.frontmatter)
      : true;
    return {
      label: "Then read this lesson",
      title: thread.frontmatter.title,
      href: `/threads/${thread.frontmatter.id}`,
      ...(onPath ? {} : { description: withPathNote(undefined, entryPath?.frontmatter, targetId) }),
    };
  }

  const atom = await getAtomBySlug(targetId);
  if (atom) {
    return {
      label: atom.frontmatter.type === "exercise" ? "Then do this drill" : "Then read this",
      title: atom.frontmatter.title,
      href: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
    };
  }

  return null;
}

export default async function BridgePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) notFound();

  const fm = bridge.frontmatter;
  const category = getCategoryForGuide(slug);
  const [
    entryPath,
    primaryCta,
    bodyDrillCta,
    secondaryCta,
    relatedGuides,
    concepts,
    drills,
    lessons,
    exerciseTags,
    sources,
    subjectId,
    subjectGap,
  ] = await Promise.all([
    fm.entry_path ? getPathBySlug(fm.entry_path) : null,
    resolveBridgePrimaryCta(fm),
    resolveBridgeDrillFromBody(fm, bridge.content),
    resolveBridgeSecondaryCta(fm),
    getRelatedBridges(slug),
    getGuideConcepts(slug),
    getGuideDrills(slug),
    getGuideLessons(slug),
    exerciseTagsById(),
    guideSources(slug),
    // The @id of this site's own page for the declared subject, where it has
    // one, and the subject's name where the graph has no node for it at all
    // (3 and 19 of the 22, tracker entry 340).
    guideSubjectConceptId(fm),
    getGuideSubjectGap(slug),
  ]);
  const levels = guideDrillLevels(entryPath?.frontmatter.audience);
  // The traditions a guide leans on, stated once under the byline (tracker
  // entry 271): 40 guides name a founder and the tradition pages now list them.
  const lineage = await traditionsOf(slug);
  // The school a biography guide hands up to (tracker entry 331): the 2
  // founder guides absorb the founder's name from 68 and 48 pages and linked
  // the school once, in the body. Null for every other guide.
  const school = schoolHandoffOf(slug);
  const audioUrl = getAudioUrl("bridges", slug);
  const series = audioUrl ? await getSeriesForPage(`/${slug}`) : null;
  const audioDuration = audioUrl ? getAudioDuration(audioUrl) : undefined;
  const teaches = entryPath ? await pathTeachesOfGuide(slug) : null;
  const fallbackPrimaryCta: BridgePrimaryCta | null = entryPath
    ? {
        label:
          entryPath.frontmatter.id === "beginner-foundations"
            ? "Start the beginner sequence"
            : "Start this path",
        title: entryPath.frontmatter.title,
        href: `/paths/${entryPath.frontmatter.id}`,
        description: withPathNote(
          `${
            fm.primary_problem
              ? `If your main issue is ${fm.primary_problem}, this is the clearest next step.`
              : "This is the clearest next step from this guide."
          }${
            teaches && teaches.declared > 0
              ? ` It teaches ${teaches.taught} of the ${teaches.declared} ideas behind this guide.`
              : ""
          }`,
          entryPath.frontmatter,
          entryPath.frontmatter.id,
        ),
        eventTarget: entryPath.frontmatter.id,
      }
    : null;
  // Declared first, then the drill the closer names, then the entry path. A
  // drill that fails the entry path's level says so on the card; the note
  // points at the path card when one follows (a secondary CTA that is a
  // path) and at the guide when none does.
  const pathBelow = secondaryCta?.href.startsWith("/paths/") ?? false;
  const resolvedPrimaryCta = withLevelNote(
    primaryCta ?? bodyDrillCta ?? fallbackPrimaryCta,
    levels,
    pathBelow,
  );
  // The drill beside the primary card comes from the body, the same source as
  // the "Practise it" row below it, so the page has one drill source. It
  // prefers a drill that fits the entry path's level (tracker entry 275);
  // when none of the guide's drills does, it is the next one as before.
  const otherDrill =
    drills.find(
      (d) =>
        d.url !== resolvedPrimaryCta?.href && drillFitsLevels(exerciseTags.get(d.id) ?? [], levels),
    ) ?? nextDrill(drills, resolvedPrimaryCta?.href);
  // One filed-under note per page. A declared primary path off the entry path
  // already carries it, so a secondary lesson off the same path need not say
  // it twice (how-to-be-funny on 2026-09-22: Foundations, then Building on
  // Offers, both off Systems of Improv).
  const noteAbove =
    fm.primary_cta_type === "path" && entryPath
      ? !targetOnEntryPath(fm.primary_cta_target ?? "", entryPath.frontmatter)
      : false;
  const relatedLinks = [
    secondaryCta && noteAbove && secondaryCta.href.startsWith("/threads/")
      ? { ...secondaryCta, description: undefined }
      : secondaryCta,
    otherDrill
      ? { label: "Or do this drill", title: otherDrill.title, href: otherDrill.url }
      : null,
  ].filter((link): link is BridgeActionLink => Boolean(link));
  const uniqueRelatedLinks = relatedLinks.filter(
    (link, index, collection) =>
      link.href !== resolvedPrimaryCta?.href &&
      collection.findIndex((candidate) => candidate.href === link.href) === index,
  );
  // A section headed with a concept's title gets a mark in the contents list
  // linking to the concept (tracker entry 324); computed here because the
  // list is presentational and the lookup needs the atoms.
  const headed = await getGuideHeadedConcepts(slug);
  const tocConcepts = conceptMarks(headed);

  return (
    <>
      {/* Two guides are tools first and articles second, and a reader who
          arrives at one wants a prompt or a pair rather than a preamble. The
          hero is that tool, and it is the first thing in the document so it
          can take the viewport on a phone with the nav floating over it
          (HeroTakeover, and the `data-hero-takeover` rules in globals.css).
          From `lg` it is a 16:9 panel in the column instead, so the article
          below it is visible without scrolling. It sits outside `main`
          because a full-bleed block inside a centred column has to cancel
          that column, and every way of doing that is a scrollbar's width
          wrong. Nothing in it is a route: the article stays whole underneath
          for search engines and for the reader who scrolls, and the h1 is
          untouched. */}
      {await HERO_TOOLS[slug]?.()}
      <main className="mx-auto max-w-2xl px-6 py-16">
        <ArticleJsonLd
          eyebrow="Guide"
          subject={fm.subject}
          subjectId={subjectId}
          title={fm.title}
          description={fm.description}
          url={`/${slug}`}
          datePublished={fm.created}
          dateModified={fm.updated}
          contentImage={firstContentImage(bridge.content)}
        />
        <Breadcrumb
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Guides", href: "/guides" },
            ...(category ? [{ label: category.title, href: `/topics/${category.slug}` }] : []),
            { label: fm.title },
          ]}
        />

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{fm.title}</h1>
          <p className="text-foreground/60 mt-2 text-sm">{fm.description}</p>
          {/* The reader's problem in the reader's words. `primary_problem` was
            rendered once, on the CTA card at the foot of the page, so the
            reader met the sentence the guide was written to answer only after
            the argument (novel-insights 291). Stated once here as the guide's
            intent; the card keeps its own "If your main issue is…" wording. */}
          {fm.primary_problem && (
            <p className="text-foreground/50 mt-2 text-sm" data-track="guide-problem">
              For when {fm.primary_problem}.
            </p>
          )}
          <UpdatedOn
            date={fm.updated}
            minutes={readingMinutes(bridge.html)}
            status={fm.status}
            className="text-foreground/50 mt-3 text-xs"
          />
          {/* The traditions lines, one region so they draw one "computed"
            caption between them (tracker entry 317): the guides' mean sat at
            5.47 captions a page against a ceiling of 5.5, and a second
            marked line on the 2 biography guides would have put it on the
            line. The hand-off up comes first (tracker entry 331), so the
            reader who arrived at the person is one click from the school
            by design rather than by finding the one link in the body.
            Rendered only when a line will render inside it. */}
          {(school || lineage.length > 0) && (
            <div data-derived-region="lineage">
              {school && (
                <p
                  className="text-foreground/50 mt-2 text-sm"
                  data-track="guide-school"
                  data-derived="true"
                >
                  The school:{" "}
                  <Link href={school.href} className="underline">
                    {school.label}
                  </Link>
                  .
                </p>
              )}
              {lineage.length > 0 && (
                <p
                  className="text-foreground/50 mt-2 text-sm"
                  data-track="guide-lineage"
                  data-derived="true"
                >
                  Draws on{" "}
                  {lineage.map(({ tradition }, i) => (
                    <span key={tradition}>
                      {i > 0 && (i === lineage.length - 1 ? " and " : ", ")}
                      <Link href={`/traditions/${tradition}`} className="underline">
                        {LINEAGE_LABEL[tradition]}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              )}
            </div>
          )}
        </header>

        {audioUrl && (
          <>
            <AudioPlayer src={audioUrl} transcriptHref={transcriptHref("bridges", slug)} />
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
                  description={fm.description}
                  audioUrl={audioUrl}
                  pageUrl={`/${slug}`}
                  duration={audioDuration}
                  series={series}
                />
              </>
            )}
          </>
        )}

        {/* The guides carry 14 to 24 anchored headings each and offered none of
          them as navigation, which is the same gap the concept pages had. These
          are the longer pages of the two, so the outline matters more here. */}
        <TableOfContents headings={contentsFor(bridge.html)} concepts={tocConcepts} />

        {/* `data-track="body"`: the prose carries a third of a guide's page-specific
          links and was the largest unmeasured block after the footer (tracker
          entry 259). */}
        <article
          className="prose prose-neutral dark:prose-invert max-w-none"
          data-track="body"
          dangerouslySetInnerHTML={{ __html: bridge.html.replace(/^<h1[^>]*>.*?<\/h1>\s*/i, "") }}
        />

        {/* Below the prose, so the page's own words come first in DOM order
          (tracker entry 260); the player above links down to it. */}
        {audioUrl && (
          <Transcript layer="bridges" id={slug} currentUrl={`/${slug}`} body={bridge.html} />
        )}

        <div className="border-foreground/10 mt-16 space-y-6 border-t pt-8">
          {resolvedPrimaryCta && (
            <WhatsNext
              variant="bridge-primary-cta"
              label={resolvedPrimaryCta.label}
              title={resolvedPrimaryCta.title}
              href={resolvedPrimaryCta.href}
              description={resolvedPrimaryCta.description}
              eventTarget={resolvedPrimaryCta.eventTarget}
              derived={!primaryCta}
            />
          )}

          {/* One caption for the three derived hand-off blocks rather than
            one each (tracker entry 317); the CTA card above stays outside
            the region because it is the author's when primary_cta is set. */}
          <div data-derived-region="guide-hand-offs" className="space-y-6">
            {uniqueRelatedLinks.length > 0 && (
              <div data-track="guide-next-step" data-derived="true">
                <h2 className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase">
                  One more useful step
                </h2>
                <div className="space-y-2">
                  {/* The anchor is the title alone, stretched over the card, as the
                  primary card does (tracker entry 266): with the path note in
                  the card the whole-card anchor ran to 25 words. */}
                  {uniqueRelatedLinks.map((link) => (
                    <div
                      key={link.href}
                      className="border-foreground/10 bg-surface hover:border-foreground/30 relative block rounded-lg border p-3 transition-colors"
                    >
                      <span className="text-foreground/40 text-xs tracking-wider uppercase">
                        {link.label}
                      </span>
                      <Link
                        href={link.href}
                        className="mt-1 block text-sm font-medium after:absolute after:inset-0"
                      >
                        {link.title}
                      </Link>
                      {link.description && (
                        <span className="text-foreground/60 mt-1 block text-xs">
                          {link.description}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <GuideConcepts
              concepts={concepts}
              drills={drills}
              lessons={lessons}
              walked={walkedDrills(headed).filter((w) => !drills.some((d) => d.id === w.id))}
              subjectGap={subjectGap}
            />

            {/* The works those ideas cite, straight after the ideas themselves,
              so the reader meets the concept and then what it rests on
              (tracker entry 334): 48 of 78 guides link no library work in
              their body and all 48 declare concepts citing 5 or more. Inside
              the region, so it adds a block and no second caption. */}
            <GuideSources sources={sources} />

            <RelatedGuides guides={relatedGuides} handsOn={isAuthority(fm)} />
          </div>
        </div>
      </main>
    </>
  );
}
