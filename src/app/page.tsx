import Link from "next/link";

import { ContinueJourney } from "@/components/ContinueJourney";
import { HomepageQuiz } from "@/components/HomepageQuiz";
import { loadBridges, loadPaths, loadThreads } from "@/lib/content";
import { HOMEPAGE_SYMPTOMS } from "@/lib/homepage-symptoms";
import { getRecommendedPath } from "@/lib/path-recommendations";

export default async function Home() {
  const [paths, threads, bridges] = await Promise.all([loadPaths(), loadThreads(), loadBridges()]);
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
      </header>

      <ContinueJourney paths={continueConfig} />
      <HomepageQuiz symptoms={symptomRecommendations} />

      <div className="text-foreground/30 flex flex-wrap gap-x-4 gap-y-1 text-sm">
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
        <Link href="/guides" className="hover:text-foreground/50">
          Guides
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
