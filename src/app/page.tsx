import type { Metadata } from "next";
import Link from "next/link";

import { ContinueJourney } from "@/components/ContinueJourney";
import { HomepageQuiz } from "@/components/HomepageQuiz";
import { loadBridges, loadPaths, loadThreads } from "@/lib/content";
import { GUIDE_CATEGORIES } from "@/lib/guide-categories";
import { HOMEPAGE_SYMPTOMS } from "@/lib/homepage-symptoms";
import { getRecommendedPath } from "@/lib/path-recommendations";
import { ogImages, SITE_NAME } from "@/lib/seo";
import { getSystemCounts } from "@/lib/system-counts";
import { getTopGuides } from "@/lib/top-guides";

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
  const [paths, threads, bridges, topGuides] = await Promise.all([
    loadPaths(),
    loadThreads(),
    loadBridges(),
    // Was hardcoded to 8, which predated raising the shared default to 14 and
    // left seven open guides — about 172,000 of traffic potential between them
    // — with no body link from the strongest page on the site. Takes the
    // default now, so the two stay in step.
    getTopGuides(),
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

  const guideClusters = GUIDE_CATEGORIES.map((cluster) => ({
    slug: cluster.slug,
    title: cluster.title,
    description: cluster.description,
    count: cluster.slugs.filter((slug) => bridgeBySlug.has(slug)).length,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          What makes some conversations magic and others fall flat?
        </h1>
        <p className="text-foreground/60 text-lg">
          There are real reasons - and they&apos;re learnable. Improv performers have been studying
          them on stage for 60 years. This is where to start if you want the ideas to become usable,
          not just interesting.
        </p>

        {/* One slot, two states. A returning reader used to get this card and the
            journey card both, so the page told somebody on day four to start the
            programme they were already doing. ContinueJourney renders this until
            localStorage says otherwise, which also means the journey card
            replaces something instead of pushing the page down on hydration. */}
        <ContinueJourney paths={continueConfig}>
          <div className="border-foreground/10 bg-foreground/[0.03] mt-8 rounded-2xl border p-6">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">Start here</span>
            <h2 className="mt-1 text-2xl font-semibold">{beginnerProgram.frontmatter.title}</h2>
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
              {beginnerRecommendation.rationale}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/paths/${beginnerProgram.frontmatter.id}`}
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                {beginnerProgram.frontmatter.program_length_days
                  ? `Start the ${beginnerProgram.frontmatter.program_length_days}-day program`
                  : "Start the beginner program"}
              </Link>
              {firstThread && (
                <Link
                  href={`/threads/${firstThread.frontmatter.id}`}
                  className="border-foreground/10 hover:border-foreground/30 inline-flex rounded-lg border px-4 py-2 text-sm transition-colors"
                >
                  Preview day 1: {firstThread.frontmatter.title}
                </Link>
              )}
            </div>

            <div className="text-foreground/50 mt-4 flex flex-wrap gap-3 text-xs">
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
      </header>

      <HomepageQuiz symptoms={symptomRecommendations} />

      <section className="border-foreground/10 mt-16 border-t pt-10">
        <h2 className="text-foreground/80 text-lg font-semibold">Where this applies</h2>
        <p className="text-foreground/50 mt-1 mb-5 text-sm">
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
                <span className="text-foreground/60 mt-1 block text-xs">{cluster.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The homepage linked only to hubs, so the strongest pages on the site
          got nothing from the page that has the most to give. A body link from
          here is worth more than the same link in site-wide footer chrome. */}
      <section className="mt-14">
        <h2 className="text-foreground/80 text-lg font-semibold">Where most people start</h2>
        <p className="text-foreground/50 mt-1 mb-5 text-sm">
          These go furthest into a single situation — what is actually going wrong, why it happens,
          and what to do differently on Thursday.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {topGuides.map((guide) => (
            <li key={guide.slug}>
              <Link
                href={`/${guide.slug}`}
                className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border px-4 py-3 text-sm transition-colors"
              >
                {guide.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14">
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

      <section className="mt-14">
        <h2 className="text-foreground/80 text-lg font-semibold">Where the craft comes from</h2>
        <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
          Almost every rule in circulation was written down by somebody, mostly in the twentieth
          century and mostly in Chicago, London or a room in Calgary, and knowing whose it is tells
          you where it stops applying.{" "}
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

      <div className="text-foreground/30 mt-10 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <span>Already know what you want?</span>
        <Link href="/how-it-works" className="hover:text-foreground/50">
          How It Works
        </Link>
        <Link href="/improv-games" className="hover:text-foreground/50">
          Improv Games
        </Link>
        <Link href="/practice" className="hover:text-foreground/50">
          Practice
        </Link>
        <Link href="/practice/vocabulary" className="hover:text-foreground/50">
          Improv Glossary
        </Link>
        <Link href="/guides" className="hover:text-foreground/50">
          Guides
        </Link>
        <Link href="/library" className="hover:text-foreground/50">
          Reading List
        </Link>
        <Link href="/paths" className="hover:text-foreground/50">
          All Paths
        </Link>
        <Link href="/listen" className="hover:text-foreground/50">
          Listen
        </Link>
      </div>
    </main>
  );
}
