import type { Metadata } from "next";
import Link from "next/link";

import { ContinueJourney } from "@/components/ContinueJourney";
import { HomeHero } from "@/components/HomeHero";
import { HomepageQuiz } from "@/components/HomepageQuiz";
import { loadBridges, loadPaths, loadThreads } from "@/lib/content";
import { drillsByLesson } from "@/lib/drill-lessons";
import { orderedCategories } from "@/lib/guide-categories";
import { buildHomeDoors } from "@/lib/home-doors";
import { getHomepagePicks } from "@/lib/homepage-picks";
import { HOMEPAGE_SYMPTOMS } from "@/lib/homepage-symptoms";
import { HUBS } from "@/lib/hubs";
import { getLessonPrerequisites } from "@/lib/journey-prerequisites";
import { getRecommendedPath } from "@/lib/path-recommendations";
import { ogImages, SITE_NAME } from "@/lib/seo";
import { getSystemCounts } from "@/lib/system-counts";

/**
 * The homepage previously inherited the bare site name as its title, which
 * spends the most valuable title tag on the site on a brand term nobody
 * searches for yet. It now names the category the site actually belongs to.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { tagline } = await getSystemCounts();
  const title = "Improv Skills for Everyday Life";
  // Set absolutely rather than relying on the layout's title template: a
  // template declared in an async generateMetadata does not reach this page,
  // and the homepage should still carry the brand.
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title: { absolute: fullTitle },
    description: `What makes some conversations magic and others fall flat? ${tagline} — discovered on the improv stage, applicable everywhere.`,
    alternates: { canonical: "/" },
    openGraph: {
      siteName: SITE_NAME,
      locale: "en_US",
      title,
      description: `${tagline} — discovered on the improv stage, applicable everywhere.`,
      url: "/",
      type: "website",
      images: ogImages(title),
    },
  };
}

export default async function Home() {
  const [paths, threads, bridges, picks] = await Promise.all([
    loadPaths(),
    loadThreads(),
    loadBridges(),
    // Was `getTopGuides()`: the footer's promoted set, rendered a second time
    // on the one page where the footer already appears, so the homepage added
    // no entrance the chrome lacked (tracker entry 117). The picks are the
    // same sort with the footer's set removed, so the two surfaces together
    // cover more guides than either alone.
    getHomepagePicks(),
  ]);
  const beginnerRecommendation = getRecommendedPath("beginner");
  const pathById = new Map(paths.map((path) => [path.frontmatter.id, path]));
  const threadById = new Map(threads.map((thread) => [thread.frontmatter.id, thread]));
  const bridgeBySlug = new Map(bridges.map((bridge) => [bridge.slug, bridge]));
  const beginnerProgram = pathById.get(beginnerRecommendation.id);

  if (!beginnerProgram) {
    throw new Error(`Missing recommended beginner path: ${beginnerRecommendation.id}`);
  }

  const firstThreadId = beginnerProgram.frontmatter.threads?.[0];
  const firstThread = firstThreadId ? threadById.get(firstThreadId) : null;
  // The journey router needs the prerequisite map so a shaky lesson sends the
  // reader back to the lesson that teaches what it builds on (entry 119).
  const lessonPrerequisites = await getLessonPrerequisites();
  const continueConfig = Object.fromEntries(
    paths.map((path) => [
      path.frontmatter.id,
      {
        title: path.frontmatter.title,
        threads: path.frontmatter.threads ?? [],
      },
    ]),
  );
  const symptomRecommendations = HOMEPAGE_SYMPTOMS.flatMap((symptom) => {
    const program = pathById.get(symptom.pathId);
    const guide = bridgeBySlug.get(symptom.bridgeSlug);
    const thread = threadById.get(symptom.threadId);

    if (!program || !guide || !thread) return [];

    return [
      {
        id: symptom.id,
        label: symptom.label,
        description: symptom.description,
        diagnosis: symptom.diagnosis,
        program: {
          pathId: program.frontmatter.id,
          title: program.frontmatter.title,
          href: `/paths/${program.frontmatter.id}`,
        },
        guide: {
          slug: guide.slug,
          title: guide.frontmatter.title,
          href: `/${guide.slug}`,
        },
        thread: {
          id: thread.frontmatter.id,
          title: thread.frontmatter.title,
          href: `/threads/${thread.frontmatter.id}`,
        },
      },
    ];
  });

  // Same order as /guides: by the reach of each cluster's winnable guides.
  const guideClusters = orderedCategories(bridges).map((cluster) => ({
    slug: cluster.slug,
    title: cluster.title,
    description: cluster.description,
    orientation: cluster.orientation,
    count: cluster.slugs.filter((slug) => bridgeBySlug.has(slug)).length,
  }));
  // The level list is the craft door's four answers (home-doors.ts); the
  // applied door's are the clusters grid itself.
  const doorOptions = buildHomeDoors(guideClusters);

  return (
    // The hero is a panel of its own height, not the viewport: the takeover
    // version ended exactly at the fold on a phone with nothing peeking under
    // it, the false floor NN/g describes (docs/homepage-principles.md,
    // 2026-09-27). It stays a sibling of <main> so it can be wider than the
    // article column.
    <>
      <HomeHero>
        {/* One slot, two states. A returning reader used to get this card and
          the journey card both, so the page told somebody on day four to start
          the programme they were already doing. ContinueJourney renders this
          until localStorage says otherwise, which also means the journey card
          replaces something instead of pushing the page down on hydration.
          The drill map lets the practice card name and link the drill it
          means rather than the lesson (entry 333). The slot is the hero's
          second column: the page's one primary action, where the eye lands
          first, rather than the third of three routers a reader met below a
          question. */}
        <ContinueJourney
          paths={continueConfig}
          prerequisites={lessonPrerequisites}
          drillsByLesson={await drillsByLesson()}
        >
          <div className="border-foreground/10 bg-foreground/[0.03] rounded-2xl border p-5 sm:p-6">
            <span className="text-foreground-dim text-xs tracking-wider uppercase">Start here</span>
            <h2 className="mt-1 text-2xl font-semibold">{beginnerProgram.frontmatter.title}</h2>
            <p className="text-foreground-dim mt-2 text-sm leading-relaxed">
              {beginnerRecommendation.rationale}
            </p>

            {/* Day 1 first. Autocapture on the homepage since June has the
              day-1 preview clicked 13 times to the programme button's 2
              (PostHog, read 2026-09-27): the concrete lesson has the scent
              and the smaller ask. Both on a phone: round 1 hid the preview
              below 640px, which hid the most-clicked element on the page. */}
            <div className="mt-5 flex flex-wrap gap-3">
              {firstThread && (
                <Link
                  href={`/threads/${firstThread.frontmatter.id}`}
                  className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Start with day 1 &mdash; {firstThread.frontmatter.title}
                </Link>
              )}
              <Link
                href={`/paths/${beginnerProgram.frontmatter.id}`}
                className={
                  firstThread
                    ? "border-foreground/10 hover:border-foreground/30 inline-flex rounded-lg border px-4 py-2 text-sm transition-colors"
                    : "bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                }
              >
                {beginnerProgram.frontmatter.program_length_days
                  ? `See the whole ${beginnerProgram.frontmatter.program_length_days}-day program`
                  : "See the whole program"}
              </Link>
            </div>

            <div className="text-foreground-dim mt-4 hidden flex-wrap gap-3 text-xs sm:flex">
              {beginnerProgram.frontmatter.program_length_days && (
                <span>{beginnerProgram.frontmatter.program_length_days} days</span>
              )}
              {beginnerProgram.frontmatter.default_cadence && (
                <span>{beginnerProgram.frontmatter.default_cadence}</span>
              )}
              <span>{beginnerProgram.frontmatter.threads.length} core lessons</span>
              {beginnerProgram.frontmatter.core_habits?.[0] && (
                <span>First habit: {beginnerProgram.frontmatter.core_habits[0]}</span>
              )}
            </div>
          </div>
        </ContinueJourney>
      </HomeHero>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        {/* The column opens on the finder. The opening argument that stood
          here — the line the April audit's life-seeker row records as the one
          that lands (docs/ux-audit-matrix.md, row 1B) — is the hero's own
          since round 3: the PostHog record has the median homepage visit never
          scrolling, so a hook below the hero was a hook most never read
          (docs/homepage-principles.md, section 6). */}
        <HomepageQuiz symptoms={symptomRecommendations} />

        {/* The April audit's one homepage finding: team leaders had no signal
          before entering the quiz (docs/ux-audit-matrix.md, row 1C). The quiz
          gained "I lead a team" that morning and lost it six hours later when
          the symptom quiz replaced it, and the five symptoms it asks about are
          all first-person, so from then until 2026-09-22 nothing above the
          guide clusters said "teams" (tracker entry 293; backlog EC-4.1). One
          line, after the quiz rather than in it, so the quiz stays personal. */}
        <p className="text-foreground-dim -mt-10 mb-16 text-sm" data-track="home-teams">
          Here for a team rather than for yourself?{" "}
          <Link href="/topics/teams" className="underline">
            The guides for teams and leaders
          </Link>{" "}
          start from the meeting, and{" "}
          <Link href="/paths/improv-for-teams" className="underline">
            Improv for Teams and Leaders
          </Link>{" "}
          is the path that runs them in order.
        </p>

        {/* The site's structure, by topic — the primary navigation NN/g asks
          for ahead of any audience split. Same order as /guides: by the reach
          of each cluster's winnable guides. */}
        <section
          id="applies"
          className="border-foreground/10 mt-16 scroll-mt-20 border-t pt-10"
          data-track="home-applies"
        >
          <h2 className="text-foreground/80 text-lg font-semibold">Where this applies</h2>
          <p className="text-foreground-dim mt-1 mb-5 text-sm">
            {bridges.length} guides, grouped by the kind of problem they solve.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {guideClusters.map((cluster) => (
              <li key={cluster.slug}>
                <Link
                  href={`/topics/${cluster.slug}`}
                  className="border-foreground/10 bg-surface hover:border-foreground/30 block h-full rounded-lg border p-4 transition-colors"
                >
                  <span className="block text-sm font-medium">
                    {cluster.title} ({cluster.count})
                  </span>
                  <span className="text-foreground/60 mt-1 block text-xs">
                    {cluster.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* The craft door's four answers, on the page instead of behind a
          modal (home-doors.ts): each level with the path it is already
          recommended and its own hub. The hub link is what keeps
          /learn/beginner one body click from home (body-click-depth). */}
        <section id="levels" className="mt-14 scroll-mt-20" data-track="home-levels">
          <h2 className="text-foreground/80 text-lg font-semibold">
            Practising improv? Start by level
          </h2>
          <p className="text-foreground-dim mt-1 mb-5 text-sm">
            Where you are with it decides what to read first. Each level has a page of its own and
            one sequence it recommends.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {doorOptions.improv.map((stage) => (
              <li key={stage.id} className="border-foreground/10 bg-surface rounded-lg border p-4">
                <Link href={stage.primary.href} className="group block">
                  <span className="block text-sm font-medium">{stage.label}</span>
                  <span className="text-foreground-dim mt-1 block text-xs">{stage.note}</span>
                  <span className="mt-2 block text-xs underline underline-offset-2 group-hover:opacity-80">
                    {stage.primary.label}
                    <span aria-hidden className="ml-1">
                      &rarr;
                    </span>
                  </span>
                </Link>
                <Link
                  href={stage.secondary.href}
                  className="text-foreground-dim mt-2 block text-xs hover:underline"
                >
                  {stage.secondary.kicker} &mdash; {stage.secondary.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-14" data-track="home-craft">
          <h2 className="text-foreground/80 text-lg font-semibold">Where the craft comes from</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            Almost every rule in circulation was written down by somebody, mostly in the twentieth
            century and mostly in Chicago, London or a room in Calgary, and knowing whose it is
            tells you where it stops applying.{" "}
            <Link href="/del-close" className="underline">
              Del Close
            </Link>{" "}
            built the long form the American scene still runs on.{" "}
            <Link href="/viola-spolin" className="underline">
              Viola Spolin
            </Link>{" "}
            built the teaching method underneath it, and did it out of social work rather than
            theatre. The{" "}
            <Link href="/theatre-games" className="underline">
              theatre games
            </Link>{" "}
            they both drew on are still the fastest way to get a room playing, and{" "}
            <Link href="/rules-of-improv" className="underline">
              the rules of improv
            </Link>{" "}
            takes the familiar list one line at a time and says which half of it is wrong.
          </p>
          <p className="text-foreground/60 mt-3 text-sm leading-relaxed">
            To practise rather than read:{" "}
            <Link href="/improv-prompts" className="underline">
              improv prompts
            </Link>{" "}
            has starting points chosen to be playable rather than zany, and{" "}
            <Link href="/how-to-get-better-at-improv" className="underline">
              how to get better at improv
            </Link>{" "}
            is the unglamorous account of what actually moves someone forward. The{" "}
            <Link href="/traditions" className="underline">
              five traditions
            </Link>{" "}
            disagree with each other on nearly all of it, which is worth knowing before you take any
            one of them as the rule.
          </p>
        </section>

        <section className="mt-14" data-track="home-underneath">
          <h2 className="text-foreground/80 text-lg font-semibold">What sits underneath them</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            Every guide is assembled from the same vocabulary rather than written from scratch — a{" "}
            <Link href="/practice/vocabulary" className="underline">
              glossary of improv terms
            </Link>{" "}
            where each concept is defined once and linked everywhere it applies, alongside the
            techniques, failure modes,{" "}
            <Link href="/practice/exercises" className="underline">
              exercises
            </Link>{" "}
            and{" "}
            <Link href="/practice/formats" className="underline">
              formats
            </Link>{" "}
            they draw on. When a guide says a question blocks, there is a page defining exactly what{" "}
            <Link href="/how-it-works/diagnosis/blocking" className="underline">
              blocking
            </Link>{" "}
            is and how to recognise it — and a page on{" "}
            <Link href="/how-it-works/diagnosis" className="underline">
              everything else that goes wrong
            </Link>{" "}
            when a conversation stops working.
          </p>
        </section>

        {/* The homepage linked only to hubs, so the strongest pages on the site
          got nothing from the page that has the most to give. A body link from
          here is worth more than the same link in site-wide footer chrome —
          which is also why this list is not the footer's: those 27 already
          have it, and the winnable guides just under the promotion floor had
          no sitewide entrance at all (homepage-picks.ts). A list of names, not
          a grid of boxes: at 28 boxes this was the tallest block on the page,
          two phone screens for the band behind the most-searched guides. */}
        <section className="mt-14" data-track="home-start">
          <h2 className="text-foreground/80 text-lg font-semibold">
            Beyond the most-searched guides
          </h2>
          <p className="text-foreground-dim mt-1 text-sm">
            The most-searched guides are in the footer of every page. These are the ones just behind
            them, and each goes furthest into a single situation — what is actually going wrong, why
            it happens, and what to do differently on Thursday.
          </p>
          <ul className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            {picks.map((guide) => (
              <li key={guide.slug}>
                <Link
                  href={`/${guide.slug}`}
                  className="underline underline-offset-2 hover:opacity-80"
                >
                  {guide.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Search as a field the reader can type into, not only the nav's
          icon: Nielsen's guideline 47. It sits with the shortcuts rather than
          at the top of the page because this site is link-dominant — a small
          corpus with strong scent — and the reader who wants a box is the one
          who already knows what they want. */}
        <div className="border-foreground/10 mt-14 border-t pt-8" data-track="home-hubs">
          <form role="search" action="/search" className="flex max-w-md gap-2">
            <label htmlFor="home-search" className="sr-only">
              Search the site
            </label>
            <input
              id="home-search"
              type="search"
              name="q"
              placeholder="Search — yes and, blocking, status"
              className="border-border-ui bg-surface w-full rounded-lg border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="border-border-ui hover:border-foreground-strong rounded-lg border px-3 py-2 text-sm transition-colors"
            >
              Search
            </button>
          </form>
          <div className="text-foreground-dim mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <span>Already know what you want?</span>
            <Link href="/how-it-works" className="hover:text-foreground-strong">
              How It Works
            </Link>
            <Link href="/improv-games" className="hover:text-foreground-strong">
              Improv Games
            </Link>
            <Link href="/practice" className="hover:text-foreground-strong">
              Practice
            </Link>
            <Link href={HUBS.glossary.href} className="hover:text-foreground-strong">
              {HUBS.glossary.h1}
            </Link>
            <Link href="/guides" className="hover:text-foreground-strong">
              Guides
            </Link>
            <Link href={HUBS.library.href} className="hover:text-foreground-strong">
              {HUBS.library.label}
            </Link>
            <Link href={HUBS.paths.href} className="hover:text-foreground-strong">
              {HUBS.paths.label}
            </Link>
            {/* The lessons hub and the picker were three and four body clicks from
              here, reachable only through the nav (tracker entry 218). The level
              ladder is the level list's now. */}
            <Link href={HUBS.threads.href} className="hover:text-foreground-strong">
              {HUBS.threads.label}
            </Link>
            <Link href="/tools/exercise-picker/beginner" className="hover:text-foreground-strong">
              Find a Drill
            </Link>
            <Link href="/listen" className="hover:text-foreground-strong">
              Listen
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
