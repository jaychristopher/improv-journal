import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AudioPlayer } from "@/components/AudioPlayer";
import { Breadcrumb } from "@/components/Breadcrumb";
import { CourseJsonLd } from "@/components/CourseJsonLd";
import {
  NextPathReadNote,
  PathReadCount,
  SyllabusCheckmark,
  SyllabusProgress,
} from "@/components/SyllabusProgress";
import { Transcript, transcriptHref } from "@/components/Transcript";
import { UpdatedOn } from "@/components/UpdatedOn";
import { WhatsNext } from "@/components/WhatsNext";
import { getAudioManifestEntry } from "@/lib/audio-manifest";
import {
  getAudioUrl,
  getPathBySlug,
  getPathTotalDuration,
  getThreadBySlug,
  getThreadDuration,
  loadPaths,
} from "@/lib/content";
import { lessonConceptCounts } from "@/lib/drill-lessons";
import { hubCrumb, HUBS } from "@/lib/hubs";
import { getLessonPrerequisites } from "@/lib/journey-prerequisites";
import { formatPathComposition, getPathComposition } from "@/lib/path-composition";
import { overlapSentences } from "@/lib/path-overlap";
import {
  getForwardPrerequisites,
  getPathPrerequisites,
  leansAboveLine,
} from "@/lib/path-prerequisites";
import { getNextPath } from "@/lib/path-progression";
import { pathSection } from "@/lib/path-sections";
import { personaNoteForPath } from "@/lib/persona-journeys";
import { readingMinutes } from "@/lib/reading-time";
import {
  extractDescription,
  metaDescription,
  ogImages,
  pageTitle,
  qualifyIfSiteName,
  SITE_NAME,
} from "@/lib/seo";
import { compareSeedShare, getLadderSeedShare, seedSlots } from "@/lib/status-distribution";
import { leadingSchoolLabel, pathTraditions } from "@/lib/tradition-curriculum";

export async function generateStaticParams() {
  const paths = await loadPaths();
  return paths.map((path) => ({ slug: path.frontmatter.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const pathData = await getPathBySlug(slug);
  if (!pathData) return {};

  return {
    title: pageTitle(qualifyIfSiteName(pathData.frontmatter.title, "Learning Path")),
    description: metaDescription(pathData.frontmatter.description),
    alternates: { canonical: `/paths/${slug}` },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title: qualifyIfSiteName(pathData.frontmatter.title, "Learning Path"),
      description: metaDescription(pathData.frontmatter.description),
      url: `/paths/${slug}`,
      type: "article",
      images: ogImages(
        qualifyIfSiteName(pathData.frontmatter.title, "Learning Path"),
        "Learning Path",
      ),
    },
  };
}

export default async function PathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pathData = await getPathBySlug(slug);
  if (!pathData) notFound();

  const fm = pathData.frontmatter;
  const audioUrl = getAudioUrl("paths", slug);
  // Whole minutes from the manifest, for the essay's own label; the header's
  // "to listen" total is the lessons' readings and does not include it.
  const essaySeconds = audioUrl ? getAudioManifestEntry(audioUrl)?.seconds : undefined;
  const essayMinutes = essaySeconds ? Math.max(1, Math.round(essaySeconds / 60)) : null;
  // The syllabus router reads the prerequisite map so a shaky lesson sends the
  // reader back to the lesson that teaches what it builds on (entry 119).
  const lessonPrerequisites = await getLessonPrerequisites();
  const threadIds = fm.threads ?? [];
  const threads = await Promise.all(
    threadIds.map(async (id) => {
      const thread = await getThreadBySlug(id);
      if (!thread) {
        return {
          id,
          title: id,
          desc: "",
          duration: null,
          readMinutes: 0,
          practiceReps: undefined,
          successSignal: undefined,
          transferPrompt: undefined,
          status: undefined,
          found: false,
        };
      }

      return {
        id,
        title: thread.frontmatter.title,
        desc: extractDescription(thread.content).slice(0, 200),
        duration: getThreadDuration(id),
        readMinutes: readingMinutes(thread.html),
        practiceReps: thread.frontmatter.practice_reps,
        successSignal: thread.frontmatter.success_signal,
        transferPrompt: thread.frontmatter.transfer_prompt,
        status: thread.frontmatter.status,
        found: true,
      };
    }),
  );

  const totalDuration = getPathTotalDuration(threadIds);
  // The lessons' measured reading time. The authored `estimated_time` was
  // written as a practice commitment and runs 3–10× the reading time
  // (tracker entry 211, 2026-09-21); the header shows the measured figures
  // and the authored sentence is labelled as the time with practice.
  const totalReadMinutes = threads.reduce((sum, t) => sum + t.readMinutes, 0);
  const firstAudience = fm.audience?.[0] ?? "beginner";
  const firstThread = threads.find((thread) => thread.found);
  const isProgram = fm.program_type === "course";
  const programDays = fm.program_length_days;
  const revisitDays = programDays ? Math.max(programDays - threads.length, 0) : 0;
  const nextPath = getNextPath(slug);
  const [leansOn, composition, forwardNeeds, overlap, nextPathData] = await Promise.all([
    getPathPrerequisites(slug),
    getPathComposition(slug),
    getForwardPrerequisites(slug),
    overlapSentences(slug),
    nextPath ? getPathBySlug(nextPath.id) : Promise.resolve(undefined),
  ]);
  // How many leans-on concepts are taught only above this path's level, so
  // "no experience required" does not stand silently over them (entry 329).
  const leansAbove = leansAboveLine(leansOn);
  // The next path's lessons, so its card can say how many the reader has
  // already done; the reader who finished Improv for Everyday Life is offered
  // Systems of Improv's four and has read two (tracker entry 295).
  const nextPathThreadIds = nextPathData?.frontmatter.threads ?? [];
  // Whether the next path's seed share departs from the ladder's. 18 of the
  // 25 lessons and 8 of the 11 paths are `seed`, and every path after
  // Foundations opens on one (tracker entry 319, 2026-09-22), so the card
  // said "most of its lessons are still seeds" on 9 of the 9 cards with a
  // next path — a fact about the ladder, not the page (entry 323). The
  // paths hub and the level hubs now say it once with the numbers, and the
  // card adds a note only where this next path sits more than
  // NEXT_PATH_SEED_MARGIN from the norm beyond the first rung; today none
  // does. Assembled here, where the card's copy is, as entry 295's read
  // note was; path-progression.ts stays a static map.
  const [nextPathThreads, ladderSeeds] = await Promise.all([
    Promise.all(nextPathThreadIds.map((id) => getThreadBySlug(id))),
    getLadderSeedShare(),
  ]);
  const nextPathSeedsNote = compareSeedShare(
    seedSlots(nextPathThreads.map((t) => t?.frontmatter.status)),
    ladderSeeds.beyondFirstRung,
  );
  // The school whose concepts lead this path's lessons by a margin, or null.
  // The ladder climbs from Johnstone's room to UCB's — Advanced Game and
  // Character is UCB on 14 of 23 concepts, and the beginner paths are Close,
  // Johnstone and Spolin — and no path said so (tracker entry 330,
  // 2026-09-22). A tie shows nothing, so the pill marks the rung where the
  // school changes rather than every rung (entry 323): 1 of 11 today.
  const leadingSchool = (await pathTraditions()).find((p) => p.id === slug)?.leader ?? null;
  // Per-lesson reading time, for the client to subtract what the record says
  // is complete from the static total beside it.
  const lessonMinutes = threads.map((t) => ({ id: t.id, minutes: t.readMinutes }));
  const mutualPairs = forwardNeeds.flatMap((lesson) =>
    lesson.mutualWith.map((other) => ({ a: lesson, b: other })),
  );
  // The page's outline. The 11 path bodies carry 0 headings between them, so
  // until now the layer had nothing an anchor, a contents list or the search
  // index's `sections` field could read, while a third of its authored prose
  // sat in frontmatter fields rendered as cards (tracker entry 341). The
  // headings and their ids come from path-sections.ts, which the search-index
  // builder reads as well, so a stored anchor cannot disagree with the page.
  const audienceSection = pathSection("audience");
  const outcomeSection = pathSection("outcome");
  const methodSection = pathSection("method");
  // The reader this path was specified for, or null. 5 of the 11 paths were
  // asked for by name in a persona's Journey Map and 6 were not (tracker
  // entry 347, 2026-09-22); the sentence belongs under the audience heading
  // because it answers the same question the author's own list answers.
  const personaNote = await personaNoteForPath(slug);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <CourseJsonLd
        title={fm.title}
        description={fm.description}
        url={`/paths/${slug}`}
        audience={firstAudience}
        duration={totalDuration ?? fm.estimated_time}
        lessons={threads.filter((t) => t.found).map((t) => ({ id: t.id, title: t.title }))}
        teaches={fm.learning_objectives}
        prerequisites={fm.prerequisites}
        prerequisiteConcepts={leansOn.map((c) => ({ title: c.title, url: c.url }))}
        lengthInDays={fm.program_length_days}
        cadence={fm.default_cadence}
      />
      {/* Home › Learning Paths › this path. The parent used to be "Learn" →
          the path's first audience hub, a page titled by its level, so the
          trail read Home › Learn › Foundations while the nav sent readers to
          "Learning Paths" — a hub no breadcrumb on the site named (tracker
          entry 264). The audience hub is linked from the header instead. */}
      <Breadcrumb
        crumbs={[{ label: "Home", href: "/" }, hubCrumb(HUBS.paths), { label: fm.title }]}
      />

      <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_320px]">
        <header className="border-foreground/10 bg-surface rounded-xl border p-6">
          <span className="text-foreground/40 text-xs tracking-wider uppercase">
            {isProgram && programDays
              ? `${programDays}-day ${firstAudience} program`
              : "course path"}
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{fm.title}</h1>
          <p className="text-foreground/60 mt-3">{fm.description}</p>
          <UpdatedOn
            date={fm.updated}
            status={fm.status}
            className="text-foreground/50 mt-3 text-xs"
          />

          <div className="mt-4 flex flex-wrap items-center gap-3" data-derived="true">
            {fm.audience.map((audience) => (
              <span
                key={audience}
                className="bg-foreground/5 text-foreground/50 rounded-full px-2 py-0.5 text-xs"
              >
                {audience}
              </span>
            ))}
            {leadingSchool && (
              <Link
                href={`/traditions/${leadingSchool}`}
                className="bg-foreground/5 text-foreground/50 hover:text-foreground/70 rounded-full px-2 py-0.5 text-xs"
                data-path-tradition={leadingSchool}
              >
                {leadingSchoolLabel(leadingSchool)}
              </Link>
            )}
            {programDays && <span className="text-foreground/30 text-xs">{programDays} days</span>}
            {fm.default_cadence && (
              <span className="text-foreground/30 text-xs">{fm.default_cadence}</span>
            )}
            <Link
              href={`/learn/${firstAudience}`}
              className="text-foreground/40 hover:text-foreground/70 text-xs underline"
              data-track="path-level"
            >
              {HUBS.learn.label}
            </Link>
            <span className="text-foreground/30 text-xs">
              {threads.length} lessons
              {totalReadMinutes > 0 ? ` · ${totalReadMinutes} min to read` : ""}
              {totalDuration ? ` · ${totalDuration} to listen` : ""}
            </span>
            {/* Client only: "2 of these you have read · about 20 min left"
                once the journey record says so. The static count beside it
                stays for the first visit and for crawlers. */}
            <PathReadCount lessons={lessonMinutes} />
          </div>

          {/*
            What the lessons are made of, by type. The beginner paths are
            mostly laws and principles, the performer paths mostly techniques
            and formats, and the teacher paths hold no drill at all (tracker
            entry 249); none of that showed on the page a reader chooses from.
          */}
          {composition.length > 0 && (
            <p data-path-composition className="text-foreground/30 mt-2 text-xs">
              {formatPathComposition(composition)}
            </p>
          )}

          {/*
            Where this path repeats another. Following "next path" from
            Foundations to The Art of Ensemble assigns 24 lesson slots for 19
            lessons, Improv for Everyday Life shares two of Systems of
            Improv's four, and Foundations sits whole inside Teaching Improv;
            none of it was said (tracker entry 295, 2026-09-22). Derived from
            the shared sets in path-overlap.ts: a path that leads here is
            told where its reader should start, a contained path is named as
            contained, and every other overlap is listed once. Nothing
            renders on a path that shares no lesson.
          */}
          {overlap.length > 0 && (
            <p
              data-track="path-overlap"
              data-derived="true"
              className="text-foreground/40 mt-2 text-xs"
            >
              {overlap.map((sentence, i) => (
                <span key={i}>
                  {i > 0 ? " " : ""}
                  {sentence.map((segment, j) =>
                    typeof segment === "string" ? (
                      segment
                    ) : (
                      <Link
                        key={j}
                        href={`/paths/${segment.pathId}`}
                        className="hover:text-foreground/70 underline"
                      >
                        {segment.title}
                      </Link>
                    ),
                  )}
                </span>
              ))}
            </p>
          )}

          {firstThread && (
            <div className="mt-6 flex flex-wrap gap-3" data-track="path-start" data-derived="true">
              <Link
                href={`/threads/${firstThread.id}`}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                {isProgram ? "Start day 1" : "Start this path"}
              </Link>
              {audioUrl && (
                <a
                  href="#path-listen"
                  className="border-foreground/10 hover:border-foreground/30 inline-flex rounded-lg border px-4 py-2 text-sm transition-colors"
                >
                  {essayMinutes
                    ? `Listen to the essay (${essayMinutes} min)`
                    : "Listen to the essay"}
                </a>
              )}
            </div>
          )}

          {/* The first of the page's three headings. The two lists under it
              are the ones that were here before, unchanged; what is new is
              that the section has a name and an id, so it can be linked to
              and indexed. `who_this_is_for` needs no second label under a
              heading that says the same thing, so its column carries the list
              alone and `prerequisites` keeps its own. */}
          <section className="mt-6">
            <h2 id={audienceSection.id} className="text-lg font-semibold">
              {audienceSection.heading}
            </h2>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <ul className="list-disc space-y-2 pl-5">
                {fm.who_this_is_for.map((item) => (
                  <li key={item} className="text-foreground/70 text-sm">
                    {item}
                  </li>
                ))}
              </ul>

              <div>
                <h3 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Before you start
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5">
                  {fm.prerequisites.map((item) => (
                    <li key={item} className="text-foreground/70 text-sm">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* The reader the path was written for, where the persona named
                it. The 5 personas produced 5 of the 11 paths and nothing on
                the site had ever said so (tracker entry 347). It links
                nothing: content/personas/ is not published, and a link to a
                page that does not exist would be worse than the plain
                sentence. The string is built in persona-journeys.ts rather
                than here so the page holds no prose of its own for it. */}
            {/* Its own region, so the derived line carries one caption and
                the page's other derived blocks keep theirs (tracker entries
                317, 347): the author's list above it is not derived, so the
                section as a whole cannot be the region. */}
            {personaNote && (
              <div data-derived-region="persona-note">
                <p
                  data-persona-note
                  data-derived="true"
                  className="text-foreground/50 mt-4 text-sm"
                >
                  {personaNote}
                </p>
              </div>
            )}
          </section>

          {leansOn.length > 0 && (
            <section
              className="mt-6"
              data-path-leans-on
              data-track="path-leans-on"
              data-derived="true"
            >
              <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Ideas this path leans on
              </h2>
              <p className="text-foreground/50 mt-2 text-sm">
                The lessons here build on these concepts without teaching them. Meet them first, or
                read them when a lesson assumes one.
              </p>
              <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                {leansOn.map((concept) => (
                  <li key={concept.id} className="text-foreground/70 text-sm">
                    <Link href={concept.url} className="font-medium hover:underline">
                      {concept.title}
                    </Link>
                    <span className="text-foreground/40">
                      {" "}
                      &middot;{" "}
                      {concept.taughtIn ? (
                        <>
                          taught in{" "}
                          <Link
                            href={`/paths/${concept.taughtIn.pathId}`}
                            className="hover:underline"
                          >
                            {concept.taughtIn.pathTitle}
                          </Link>
                        </>
                      ) : (
                        "read the concept page"
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {leansAbove && (
                <p data-leans-above className="text-foreground/50 mt-3 text-sm">
                  {leansAbove}
                </p>
              )}
            </section>
          )}

          {/* The second heading, over `learning_objectives` — which lost its
              "What you'll get" label, since the heading now says it — and
              over `completion_outcome`, which stood in the card beside this
              one under "Finish with". Both are the author's answer to the
              same question, and the card is about how to work through the
              path rather than what it leaves behind. The words are
              untouched. */}
          <section className="mt-8">
            <h2 id={outcomeSection.id} className="text-lg font-semibold">
              {outcomeSection.heading}
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              {fm.learning_objectives.map((objective) => (
                <li key={objective} className="text-foreground/70 text-sm">
                  {objective}
                </li>
              ))}
            </ul>
            <h3 className="text-foreground/40 mt-4 text-xs font-semibold tracking-wider uppercase">
              Finish with
            </h3>
            <p className="text-foreground/70 mt-2 text-sm">{fm.completion_outcome}</p>
          </section>
        </header>

        <aside className="border-foreground/10 bg-foreground/[0.03] rounded-xl border p-6">
          {/* The third heading. It reads the same on all 11 paths, where the
              card's title used to change with `program_type`: the id is an
              anchor the search index stores and a link points at, and an
              anchor that exists on 1 path and not the next is a link that
              works on some pages. The program's own framing stays in the
              daily-loop blocks below. */}
          <h2 id={methodSection.id} className="text-lg font-semibold">
            {methodSection.heading}
          </h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Time with practice
              </dt>
              <dd className="text-foreground/70 mt-1">
                {fm.estimated_time}
                {totalReadMinutes > 0 && (
                  <span className="text-foreground/40 block text-xs">
                    The lessons themselves take about {totalReadMinutes} min to read
                    {totalDuration ? ` or ${totalDuration} to listen` : ""}; the rest is practice.
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                Practice cadence
              </dt>
              <dd className="text-foreground/70 mt-1">{fm.practice_cadence}</dd>
            </div>
          </dl>

          {isProgram && (
            <div className="mt-6 space-y-3">
              <div className="border-foreground/10 bg-surface rounded-lg border p-3">
                <p className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Daily loop
                </p>
                <p className="text-foreground/70 mt-2 text-sm">
                  Read the lesson, listen once, run the rep, then use it in one real interaction the
                  same day.
                </p>
              </div>
              <div className="border-foreground/10 bg-surface rounded-lg border p-3">
                <p className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  What matters
                </p>
                <p className="text-foreground/70 mt-2 text-sm">
                  Finishable beats exhaustive. Move in order, then repeat the same core lessons
                  until the ideas start to feel automatic.
                </p>
              </div>
            </div>
          )}

          {/* `core_habits`, which stood in the left column beside the
              objectives: what the reader repeats is part of how to work
              through the path, and on a program it sits with the daily loop
              above. Present on the programs only, so the heading renders with
              the field. */}
          {fm.core_habits && fm.core_habits.length > 0 && (
            <div className="mt-6">
              <h3 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                What you&apos;ll repeat every day
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                {fm.core_habits.map((habit) => (
                  <li key={habit} className="text-foreground/70 text-sm">
                    {habit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6">
            {/* The concept counts let the syllabus say "3 of 12 concepts
                read" and count a lesson read concept by concept as visited
                (entry 333); awaited here so the mount stays one expression. */}
            <SyllabusProgress
              pathId={slug}
              threadIds={threadIds}
              prerequisites={lessonPrerequisites[slug]}
              concepts={await lessonConceptCounts(threadIds)}
            />
          </div>
        </aside>
      </div>

      {/* The authored body: why the lessons are in this order. It was rendered
          in the first commit, dropped when the page became a syllabus
          (2026-04-13), and kept, indexed and rewritten for five months while
          no page showed it (tracker entry 232, 2026-09-21). */}
      {pathData.html.trim() && (
        <section id="why-this-order" className="mb-10" data-track="path-why-order">
          <h2 className="mb-3 text-lg font-semibold">Why this order</h2>
          {/* An <article>, as on the other four routes: it is the path's
              authored body, and transcript-order.test.ts reads the tag to
              check the prose precedes the transcript fold. */}
          <article
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: pathData.html }}
          />
        </section>
      )}

      {/* What the order assumes. Of the `requires` edges between two lessons
          on the same path, 84 point at a later lesson: the prerequisite is
          taught after the lesson that needs it, and on Mastering the Form
          every one of them does (tracker entry 269, 2026-09-22). "Why this
          order" explains the sequence; this names what the sequence takes on
          trust, so the reader who meets Editing in lesson 1 knows it is
          coming in lesson 2. Nothing renders on a path with no forward need. */}
      {forwardNeeds.length > 0 && (
        <section
          id="what-this-order-assumes"
          className="mb-10"
          data-path-forward-needs
          data-track="path-forward-needs"
          data-derived="true"
        >
          <h2 className="mb-3 text-lg font-semibold">What this order assumes</h2>
          <p className="text-foreground/50 mb-3 text-sm">
            Some lessons lean on ideas a later lesson teaches. Read on; each one is covered before
            the path ends.
          </p>
          <ul className="space-y-2">
            {forwardNeeds.map((lesson) => (
              <li key={lesson.lessonId} className="text-foreground/70 text-sm">
                <Link href={`/threads/${lesson.lessonId}`} className="font-medium hover:underline">
                  Lesson {lesson.position}
                </Link>{" "}
                needs from later:{" "}
                {lesson.needs.map((need, i) => (
                  <span key={need.atomId}>
                    {i > 0 && ", "}
                    <Link href={need.url} className="hover:underline">
                      {need.title}
                    </Link>
                    <span className="text-foreground/40">
                      {" "}
                      (taught in{" "}
                      <Link href={`/threads/${need.taughtBy.id}`} className="hover:underline">
                        lesson {need.taughtBy.position}
                      </Link>
                      )
                    </span>
                  </span>
                ))}
              </li>
            ))}
            {mutualPairs.map(({ a, b }) => (
              <li key={`${a.lessonId}-${b.id}`} className="text-foreground/50 text-sm">
                Lessons{" "}
                <Link href={`/threads/${a.lessonId}`} className="hover:underline">
                  {a.position}
                </Link>{" "}
                and{" "}
                <Link href={`/threads/${b.id}`} className="hover:underline">
                  {b.position}
                </Link>{" "}
                lean on each other; either can come first.
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="program-map" data-track="path-program-map" data-derived="true">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">{isProgram ? "Program map" : "Course syllabus"}</h2>
          <p className="text-foreground/50 mt-1 text-sm">
            {isProgram
              ? "Move in order. The first pass teaches the ideas. The rest of the program is where the reps and transfer start to make them stick."
              : "Move in order. Each thread builds on the one before it."}
          </p>
        </div>

        {revisitDays > 0 && (
          <div className="border-foreground/10 bg-foreground/[0.03] mb-4 rounded-lg border p-4">
            <p className="text-foreground/70 text-sm leading-relaxed">
              This program is built around {threads.length} core lessons across {programDays} days.
              After the first pass, spend the remaining {revisitDays} days repeating the drills,
              replaying the audio, and using the ideas in real conversations or scenes.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {threads.map((thread, index) => (
            <div
              key={thread.id}
              className="border-foreground/10 bg-surface hover:border-foreground/30 group relative rounded-lg border p-5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground/30 text-xs font-medium">
                      {isProgram ? `Day ${index + 1}` : index + 1}
                    </span>
                    {/* The lesson's own status word, in the byline's muted
                        style: 29 of the 39 slots on the paths hold a seed
                        and the map showed each as finished as the next
                        (tracker entry 319). */}
                    {thread.status && (
                      <span className="text-foreground/40 text-xs" data-status={thread.status}>
                        {thread.status}
                      </span>
                    )}
                    <SyllabusCheckmark threadId={thread.id} />
                  </div>
                  <h3 className="mt-0.5 font-semibold group-hover:underline">
                    <Link href={`/threads/${thread.id}`} className="after:absolute after:inset-0">
                      {thread.title}
                    </Link>
                  </h3>
                  {thread.desc && (
                    <p className="text-foreground/50 mt-1 line-clamp-2 text-sm">{thread.desc}</p>
                  )}

                  {(thread.practiceReps || thread.successSignal || thread.transferPrompt) && (
                    <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
                      {thread.practiceReps && (
                        <div>
                          <p className="text-foreground/40 font-semibold tracking-wider uppercase">
                            Rep target
                          </p>
                          <p className="text-foreground/60 mt-1 leading-relaxed">
                            {thread.practiceReps}
                          </p>
                        </div>
                      )}
                      {thread.successSignal && (
                        <div>
                          <p className="text-foreground/40 font-semibold tracking-wider uppercase">
                            Success signal
                          </p>
                          <p className="text-foreground/60 mt-1 leading-relaxed">
                            {thread.successSignal}
                          </p>
                        </div>
                      )}
                      {thread.transferPrompt && (
                        <div>
                          <p className="text-foreground/40 font-semibold tracking-wider uppercase">
                            Transfer
                          </p>
                          <p className="text-foreground/60 mt-1 leading-relaxed">
                            {thread.transferPrompt}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {thread.duration && (
                    <span className="text-foreground/30 text-xs">{thread.duration}</span>
                  )}
                  <span className="text-foreground/30 transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The path's own reading, below the syllabus rather than in the header.
          The eleven path scripts are 900–1,200-word dialogues on the path's
          subject: they share a median 5% of their phrases with the page, name
          9 of the 39 lessons the paths sequence, and the Physics of Connection
          one never says "lesson" or "path" (tracker entry 256). Beside "N
          lessons · X min to listen" it read as the overview of those lessons;
          it is an essay, and is labelled and placed as one until the scripts
          are re-cut to read the sequence. The header's totals stay about the
          lessons only. */}
      {audioUrl && (
        <section id="path-listen" className="mt-10" data-path-essay data-track="path-listen">
          <h2 className="text-lg font-semibold">An essay on this path&apos;s subject</h2>
          <p className="text-foreground/50 mt-1 mb-4 text-sm">
            {`${essayMinutes ? `${essayMinutes} min. ` : ""}A conversation about the ideas this path teaches, not a reading of the lessons above; listen before or after them.`}
          </p>
          <AudioPlayer src={audioUrl} transcriptHref={transcriptHref("paths", slug)} />
          {/* The fold sits after the player in its own section, as on every
              other route (tracker entry 260); here the essay is already
              below the syllabus, so this only keeps the fold out of the
              player card. */}
          <Transcript layer="paths" id={slug} currentUrl={`/paths/${slug}`} body={pathData.html} />
        </section>
      )}

      {nextPath && (
        <WhatsNext
          variant="path-complete"
          nextPathTitle={nextPath.title}
          nextPathHref={`/paths/${nextPath.id}`}
          description={
            <>
              {nextPath.reason}
              {nextPathSeedsNote && (
                <span data-next-path-seeds={nextPathSeedsNote}>
                  {nextPathSeedsNote === "above"
                    ? " More of its lessons are still seeds than on most paths."
                    : " Fewer of its lessons are still seeds than on most paths."}
                </span>
              )}
              <NextPathReadNote threadIds={nextPathThreadIds} />
            </>
          }
        />
      )}
    </main>
  );
}
