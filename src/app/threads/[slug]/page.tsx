import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { JourneyProgressBar } from "@/components/JourneyProgressBar";
import { LessonCheckpoint } from "@/components/LessonCheckpoint";
import { LessonCrosslink } from "@/components/LessonCrosslink";
import { LessonFrame } from "@/components/LessonFrame";
import { LessonJsonLd } from "@/components/LessonJsonLd";
import { LessonPanel } from "@/components/LessonPanel";
import { PodcastJsonLd } from "@/components/PodcastJsonLd";
import { Transcript, transcriptHref } from "@/components/Transcript";
import { UpdatedOn } from "@/components/UpdatedOn";
import { WhatsNext } from "@/components/WhatsNext";
import {
  getAllPathsForThread,
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getParentPath,
  getPracticeRecommendationsForThread,
  getThreadBySlug,
  loadAtoms,
  loadThreads,
} from "@/lib/content";
import { firstContentImage } from "@/lib/content-image";
import { guidesHandingOffTo, HANDING_OFF_GUIDES_CAP } from "@/lib/guide-concepts";
import { hubCrumb, HUBS } from "@/lib/hubs";
import { crosslinkFor, sharedConceptsFor } from "@/lib/lesson-crosslinks";
import { lessonAtomOrder } from "@/lib/lesson-order";
import { lessonSources } from "@/lib/lesson-sources";
import { namedAtomIds } from "@/lib/named-concepts";
import { getNextPath } from "@/lib/path-progression";
import { readingMinutes } from "@/lib/reading-time";
import { extractDescription, ogImages, pageTitle, SITE_NAME } from "@/lib/seo";
import { getSeriesForPage } from "@/lib/shows-for-content";

export async function generateStaticParams() {
  const threads = await loadThreads();
  return threads.map((thread) => ({ slug: thread.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);
  if (!thread) return {};

  const desc = thread.frontmatter.description?.trim() || extractDescription(thread.content);
  return {
    title: pageTitle(thread.frontmatter.title),
    description: desc,
    alternates: { canonical: `/threads/${slug}` },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title: thread.frontmatter.title,
      description: desc,
      url: `/threads/${slug}`,
      type: "article",
      images: ogImages(thread.frontmatter.title, "Lesson"),
    },
  };
}

export default async function ThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const thread = await getThreadBySlug(slug);
  if (!thread) notFound();

  const fm = thread.frontmatter;
  const audioUrl = getAudioUrl("threads", slug);
  const series = audioUrl ? await getSeriesForPage(`/threads/${slug}`) : null;
  const [parentPath, practiceRecommendations] = await Promise.all([
    getParentPath(slug),
    getPracticeRecommendationsForThread(slug),
  ]);

  let prevThread: { id: string; title: string } | null = null;
  let nextThread: { id: string; title: string } | null = null;
  let positionInPath: { current: number; total: number } | null = null;
  let pathThreads: { id: string; title: string }[] = [];

  if (parentPath) {
    const siblingIds = parentPath.frontmatter.threads ?? [];
    const idx = siblingIds.indexOf(slug);

    pathThreads = await Promise.all(
      siblingIds.map(async (id) => {
        const sibling = await getThreadBySlug(id);
        return { id, title: sibling?.frontmatter.title ?? id };
      }),
    );

    if (idx !== -1) {
      positionInPath = { current: idx + 1, total: siblingIds.length };
      if (idx > 0) prevThread = pathThreads[idx - 1];
      if (idx < siblingIds.length - 1) nextThread = pathThreads[idx + 1];
    }
  }

  const coursePaths = await getAllPathsForThread(slug);
  const allAtoms = await loadAtoms();
  const sources = lessonSources(fm.atoms ?? [], allAtoms);
  // The guides whose "Taught in depth" line sends readers here. 133 such
  // links landed on the lessons and 8 were answered (tracker entry 220,
  // 2026-09-21): a lesson listed its atoms and its path, and no guide unless
  // a hand link happened to exist. Same join as the guide page, inverted.
  const allHandingOff = await guidesHandingOffTo(slug);
  const handingOff = allHandingOff.slice(0, HANDING_OFF_GUIDES_CAP);
  const moreHandingOff = allHandingOff.length - handingOff.length;

  // "Composed from" is the only place a reader meets the lesson's atoms as a
  // sequence — no lesson body names one — and the authored list puts a
  // prerequisite after the concept that needs it in 41 of 94 intra-lesson
  // `requires` edges (tracker entry 273). Dependency order, prerequisite
  // first, authored order as the tiebreak; lesson-order.test.ts reads the
  // built block.
  const orderedAtomIds = lessonAtomOrder(
    thread,
    new Map(allAtoms.map((a) => [a.frontmatter.id, a.frontmatter])),
  );
  const atoms = await Promise.all(
    orderedAtomIds.map(async (id) => {
      const atom = await getAtomBySlug(id);
      return atom
        ? {
            id,
            title: atom.frontmatter.title,
            url: getAtomUrl({ id, type: atom.frontmatter.type }),
          }
        : { id, title: id, url: `/how-it-works/${id}` };
    }),
  );
  // Lessons compose 183 atoms and their bodies name 117 by title (tracker
  // entry 294); the list marks the rest so the reader sees which of the
  // composed ideas the lesson's words reach.
  const namedAtoms = namedAtomIds(thread.content, atoms);
  // The two halves of entry 339's fix, both read from indexes built once for
  // the corpus: the line under the byline, and the mark on a concept another
  // lesson also teaches (28 concepts sit in 2 or more lessons).
  const [crosslink, alsoTaughtIn] = await Promise.all([
    crosslinkFor(slug),
    sharedConceptsFor(slug),
  ]);

  const crumbs: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
  if (parentPath) {
    crumbs.push({
      label: parentPath.frontmatter.title,
      href: `/paths/${parentPath.frontmatter.id}`,
    });
  } else {
    // A lesson no path sequences — 4 of the 25 as of 2026-09-22; the figure
    // here once said nearly all of them, written before the paths absorbed
    // the lessons — used to render a two-level trail straight from Home. The
    // lessons hub is its parent, under the name the nav uses for it.
    crumbs.push(hubCrumb(HUBS.threads));
  }
  crumbs.push({ label: fm.title });

  const isLastThread = Boolean(parentPath && !nextThread);
  const nextPathInfo = isLastThread && parentPath ? getNextPath(parentPath.frontmatter.id) : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <LessonJsonLd
        title={fm.title}
        description={fm.description?.trim() || extractDescription(thread.content)}
        url={`/threads/${slug}`}
        datePublished={fm.created}
        dateModified={fm.updated}
        teaches={[fm.lesson_goal, fm.key_takeaway].filter((t): t is string => Boolean(t))}
        minutes={fm.estimated_minutes}
        difficulty={fm.difficulty}
        concepts={atoms.map((a) => ({ name: a.title, url: a.url }))}
        partOfCourses={coursePaths.map((p) => `/paths/${p.frontmatter.id}`)}
        contentImage={firstContentImage(thread.content)}
      />
      <Breadcrumb crumbs={crumbs} />

      {parentPath && positionInPath && (
        <JourneyProgressBar
          pathId={parentPath.frontmatter.id}
          pathTitle={parentPath.frontmatter.title}
          threads={pathThreads}
          currentThreadIndex={positionInPath.current - 1}
        />
      )}

      <header className="mb-8">
        {/* Type only. This carried "· 2 of 2" as well, directly beneath a
            progress bar already reading "Foundations: Your First Steps in Improv
            · 2 of 2" — the same position twice, a hundred pixels apart, in the
            first thing on the page. `positionInPath` is only ever set inside
            `if (parentPath)`, which is also the progress bar's condition, so the
            eyebrow could never be the sole signal and was duplicating by
            construction rather than as a fallback. */}
        <span className="text-foreground/40 text-xs tracking-wider uppercase">thread</span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
        {/* Lessons are the shortest content prose on the site (median 481
            words against 2,486 for guides, tracker entry 254) and the only
            pages sold as a time commitment; the guide route had a reading time
            while this one said nothing. Counted from the same html the article renders,
            not from `estimated_minutes` — one lesson declares that, and it
            describes the lesson as a piece of work rather than as a read. */}
        <UpdatedOn
          date={fm.updated}
          minutes={readingMinutes(thread.html)}
          status={fm.status}
          className="text-foreground/50 mt-3 text-xs"
        />
        {/* The lesson's one sentence about the lesson before it. Lesson prose
            names another lesson's title 0 times in 600 ordered pairs, so
            every claim that the 25 lessons form an order is furniture — the
            progress bar above and the prev/next nav below (tracker entry
            339). Orientation, so it sits under the byline and before the
            prose rather than in the fold of derived blocks underneath. */}
        <LessonCrosslink crosslink={crosslink} />
      </header>

      <LessonFrame
        lessonGoal={fm.lesson_goal}
        keyTakeaway={fm.key_takeaway}
        commonMistake={fm.common_mistake}
        practicePrompt={fm.practice_prompt}
        practiceReps={fm.practice_reps}
        successSignal={fm.success_signal}
        transferPrompt={fm.transfer_prompt}
        practiceLinks={practiceRecommendations.map((recommendation) => ({
          id: recommendation.id,
          href: recommendation.url,
          title: recommendation.title,
          source: recommendation.source,
          purpose: recommendation.purpose,
        }))}
        reflectionPrompt={fm.reflection_prompt}
        pathTitle={parentPath?.frontmatter.title}
        pathHref={parentPath ? `/paths/${parentPath.frontmatter.id}` : undefined}
        currentUrl={`/threads/${slug}`}
        listenContent={
          audioUrl && series ? (
            <>
              <AudioPlayer src={audioUrl} transcriptHref={transcriptHref("threads", slug)} />
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
                description={fm.lesson_goal}
                audioUrl={audioUrl}
                pageUrl={`/threads/${slug}`}
                series={series}
              />
            </>
          ) : undefined
        }
      >
        <article
          className="prose prose-neutral dark:prose-invert max-w-none"
          data-track="body"
          dangerouslySetInnerHTML={{ __html: thread.html }}
        />
      </LessonFrame>
      <LessonCheckpoint threadId={slug} />

      {/* Below the prose and the reps, before the connections, so the lesson's
          own words come first in DOM order: the fold was 69% of a lesson
          page's main text and sat under the H1 (tracker entry 260). The
          player in the Listen section links down to it. */}
      {audioUrl && (
        <Transcript layer="threads" id={slug} currentUrl={`/threads/${slug}`} body={thread.html} />
      )}

      {/* Composed-from, sources and hand-offs are three lists derived from the
          same `atoms` declaration, and with the rest of the furniture they put
          a median twelve tracked blocks around 481 words (tracker entry 306).
          One fold, open on the server and remembered closed per viewer; the
          transcript stays above it so the lesson's words still come first. */}
      <LessonPanel
        atoms={atoms}
        namedAtoms={namedAtoms}
        alsoTaughtIn={alsoTaughtIn}
        sources={sources}
        handingOff={handingOff}
        moreHandingOff={moreHandingOff}
      />

      {(prevThread || nextThread) && (
        <nav
          className="border-foreground/10 mt-8 flex flex-wrap items-start justify-between border-t pt-8"
          data-track="lesson-prev-next"
          data-derived="true"
        >
          <div>
            {prevThread && (
              <Link href={`/threads/${prevThread.id}`} className="group">
                <span className="text-foreground/40 group-hover:text-foreground/60 text-xs">
                  &larr; Previous
                </span>
                <span className="block text-sm font-medium group-hover:underline">
                  {prevThread.title}
                </span>
              </Link>
            )}
          </div>
          <div className="text-right">
            {nextThread && (
              <Link href={`/threads/${nextThread.id}`} className="group">
                <span className="text-foreground/40 group-hover:text-foreground/60 text-xs">
                  Next &rarr;
                </span>
                <span className="block text-sm font-medium group-hover:underline">
                  {nextThread.title}
                </span>
              </Link>
            )}
          </div>
        </nav>
      )}

      {isLastThread && nextPathInfo && (
        <WhatsNext
          variant="path-complete"
          nextPathTitle={nextPathInfo.title}
          nextPathHref={`/paths/${nextPathInfo.id}`}
        />
      )}
    </main>
  );
}
