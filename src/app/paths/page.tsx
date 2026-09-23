import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { loadPaths } from "@/lib/content";
import { HUBS, hubSelfCrumb } from "@/lib/hubs";
import { audienceRank, getPathAudience, getPathTitle } from "@/lib/path-progression";
import { getRecommendedPath } from "@/lib/path-recommendations";
import { pageTitle } from "@/lib/seo";
import { getLadderSeedShare } from "@/lib/status-distribution";
import { ladderTraditionsSentence } from "@/lib/tradition-curriculum";

export const metadata: Metadata = {
  title: pageTitle(`${HUBS.paths.h1}: Beginner to Performer`),
  description:
    "Structured guides for wherever you are in your journey - beginner through performer.",
  alternates: { canonical: HUBS.paths.href },
};

const STEPS = [
  {
    level: "Beginner",
    title: "Just Starting",
    href: "/learn/beginner",
    body: (
      <>
        Start with{" "}
        <Link href="/paths/beginner-foundations" className="text-foreground underline">
          Foundations
        </Link>{" "}
        for the clearest beginner sequence. Then branch into{" "}
        <Link href="/paths/systems-of-improv" className="text-foreground underline">
          Systems of Improv
        </Link>{" "}
        if you want the system-level explanation first.
      </>
    ),
  },
  {
    level: "Intermediate",
    title: "Breaking Through a Plateau",
    href: "/learn/intermediate",
    body: (
      <>
        You can feel what&apos;s wrong but you can&apos;t name it.{" "}
        <Link href="/paths/self-coaching-toolkit" className="text-foreground underline">
          The Self-Coaching Toolkit
        </Link>{" "}
        gives you a diagnostic vocabulary so you can stop saying &ldquo;I don&apos;t know, it just
        died&rdquo; and start saying exactly what happened.
      </>
    ),
  },
  {
    level: "Performer",
    title: "Pushing Toward Mastery",
    href: "/learn/performer",
    body: (
      <>
        Three paths for experienced performers.{" "}
        <Link href="/paths/advanced-game-and-character" className="text-foreground underline">
          Advanced Game and Character
        </Link>{" "}
        goes beyond &ldquo;find the game&rdquo; into how games evolve, invert, and break - and how
        character emerges from body and status rather than biography.{" "}
        <Link href="/paths/mastering-the-form" className="text-foreground underline">
          Mastering the Form
        </Link>{" "}
        covers every major longform format and the show-level craft that turns scenes into a shaped
        experience.{" "}
        <Link href="/paths/the-art-of-ensemble" className="text-foreground underline">
          The Art of Ensemble
        </Link>{" "}
        is about performing at the highest level - backline mastery, group mind, and the practices
        that make an ensemble more than a collection of individuals.
      </>
    ),
  },
];

const DOT_SIZE = ["h-2 w-2", "h-2.5 w-2.5", "h-3 w-3", "h-3.5 w-3.5"];

/**
 * The two focus groups beside the improv track, and the order inside each.
 *
 * The April audit's verdict on this hub was that eleven paths on one improv
 * level ladder alienate the reader who does not think of themselves as
 * beginner → intermediate → performer (docs/ux-audit-matrix.md, row 7B;
 * tracker entry 293). `/learn/beginner` was grouped by focus the same day;
 * this hub kept the single ladder until 2026-09-22 (backlog EC-4.2). The
 * groups are decided by audience and id rather than a fourth audience
 * vocabulary: a path whose reader is here for the rest of life, not the
 * stage, is life; a path for someone running a room — a team or a class — is
 * teams and teaching; every other path is the improv track, which the ladder
 * draws. Inside a group the order is the audience ladder's (`audienceRank`),
 * so the two groups walk the same direction the timeline does. Each card's
 * sentence is the path's own description, read from content, not copy held
 * here.
 */
const FOCUS_GROUPS: { key: string; title: string; lede: string; ids: readonly string[] }[] = [
  {
    key: "life",
    title: "Everyday life",
    lede: "For conversations rather than the stage. No comedy.",
    ids: ["improv-for-life", "physics-of-connection"],
  },
  {
    key: "teams",
    title: "Teams and teaching",
    lede: "For anyone responsible for a room: a team or a class.",
    ids: ["improv-for-teams", "teaching-improv"],
  },
];

const capitalise = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose stays plain
 * strings rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "A path and a guide answer different questions. A guide takes one difficulty and deals with it, and you can read it cold, in any order, without having read another. A path is a sequence where the order carries some of the meaning — each part assumes the one before it, and reading the third without the first mostly produces the feeling of having missed something.",
  "Pick by where you actually are rather than by which title sounds furthest along. The commonest way to waste one of these is to start at the advanced end because the beginner material looks obvious, and the beginner material looks obvious because it is stated simply, not because it is already known. If you can name what went wrong in your last scene or your last difficult conversation, start in the middle. If you cannot, that naming is what the early parts are for.",
  "Nothing here is gated and there is no enrolment. Every part of every path is a page you could reach on its own, and the sequence is the only thing a path adds — which is worth something precisely because ordering this material is the hard part, and it has already been done for you.",
];

export default async function PathsIndexPage() {
  const beginnerRecommendation = getRecommendedPath("beginner");
  const [paths, ladderSeeds, ladderTraditions] = await Promise.all([
    loadPaths(),
    getLadderSeedShare(),
    ladderTraditionsSentence(),
  ]);
  const descriptionOf = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.description]));
  // The ladder's seed share, said once here rather than on every card that
  // points up it. Every next-path card carried "most of its lessons are
  // still seeds" on 2026-09-22 because every next path is, which made the
  // note a fact about the ladder (tracker entry 323); the numbers are
  // computed so the sentence follows the frontmatter as seeds are rewritten.
  const beyond = ladderSeeds.beyondFirstRung;
  const firstRungTitle = getPathTitle(ladderSeeds.firstRung).split(":")[0];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, hubSelfCrumb(HUBS.paths)]} />
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">{HUBS.paths.h1}</h1>
        <p className="text-foreground/60 mt-2">
          Structured guides for wherever you are in your journey.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <Prose
            text={paragraph}
            currentUrl="/paths"
            className="text-foreground/70 mb-4"
            key={paragraph.slice(0, 40)}
          />
        ))}
      </section>

      <section
        className="border-foreground/10 bg-foreground/[0.03] mb-12 rounded-xl border p-6"
        data-track="recommended-path"
      >
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          {beginnerRecommendation.label}
        </span>
        <h2 className="mt-1 text-xl font-semibold">{beginnerRecommendation.title}</h2>
        <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
          {beginnerRecommendation.rationale}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={`/paths/${beginnerRecommendation.id}`}
            className="bg-foreground text-background hover:bg-foreground/90 inline-flex rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
          >
            Start with Foundations
          </Link>
          <Link
            href="/learn/beginner"
            className="border-foreground/10 hover:border-foreground/30 inline-flex rounded-lg border px-4 py-2 text-sm transition-colors"
          >
            See alternate beginner routes
          </Link>
        </div>
      </section>

      <section
        className="text-foreground/40 mb-12 flex flex-wrap gap-x-5 gap-y-2 text-sm"
        data-track="alternate-tracks"
      >
        <span>Not following the improv track?</span>
        <Link href="/paths/improv-for-life" className="hover:text-foreground/60 underline">
          Improv for Everyday Life
        </Link>
        <Link href="/paths/improv-for-teams" className="hover:text-foreground/60 underline">
          Improv for Teams
        </Link>
        <Link href="/guides" className="hover:text-foreground/60 underline">
          Browse guides by topic
        </Link>
      </section>

      <section data-track="focus-craft">
        <h2 className="text-xl font-semibold">Improv craft</h2>
        <p className="text-foreground/50 mt-1 mb-8 text-sm">
          The improv track, in the order the levels climb.
        </p>

        <div data-track="level-ladder">
          {STEPS.map((step, i) => (
            <div
              key={step.level}
              className={["relative pl-10", i > 0 && "pt-10"].filter(Boolean).join(" ")}
            >
              {i < STEPS.length - 1 && (
                <div
                  className="border-foreground/10 absolute top-1/2 bottom-0 left-[11px] border-l-2 border-dashed"
                  aria-hidden="true"
                />
              )}
              {i > 0 && (
                <div
                  className="border-foreground/10 absolute top-0 bottom-1/2 left-[11px] border-l-2 border-dashed"
                  aria-hidden="true"
                />
              )}

              <div className="absolute top-1/2 left-0 z-10 flex w-6 -translate-y-1/2 justify-center">
                <div
                  className={`bg-foreground/20 rounded-full ${DOT_SIZE[i]}`}
                  aria-hidden="true"
                />
              </div>

              <section className="border-foreground/10 bg-surface rounded-lg border p-6">
                <Link href={step.href} className="group">
                  <span className="text-foreground/40 text-xs tracking-wider uppercase">
                    {step.level}
                  </span>
                  <h2 className="mt-1 text-lg font-semibold group-hover:underline">
                    {step.title}{" "}
                    <span className="text-foreground/30 inline-block transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </h2>
                </Link>
                <p className="text-foreground/60 mt-2 text-sm leading-relaxed">{step.body}</p>
              </section>
            </div>
          ))}
          <p
            className="text-foreground/50 mt-8 text-sm leading-relaxed"
            data-ladder-seeds={`${beyond.seedSlots}/${beyond.slots}`}
          >
            Beyond {firstRungTitle}, most lessons on these paths are still seeds &mdash;{" "}
            {beyond.seedSlots} of the {beyond.slots} lesson slots today &mdash; and each
            lesson&apos;s byline says so.
          </p>
          {/* The ladder's slope across the schools, computed from the leading
              tradition of each rung's paths: the beginner paths are Close,
              Johnstone and Spolin, the performer paths UCB and Close, and the
              reader climbing changed school without being told there was one
              (tracker entry 330, 2026-09-22). Sent through Prose so the
              founders' names link their tradition pages. */}
          {ladderTraditions && (
            <Prose
              text={ladderTraditions}
              currentUrl="/paths"
              className="text-foreground/50 mt-2 text-sm leading-relaxed"
              data-ladder-traditions=""
            />
          )}
        </div>

        <div className="border-foreground/10 mt-12 border-t pt-10" data-track="reference-path">
          <section className="border-foreground/10 bg-surface rounded-lg border p-6">
            <Link href="/learn/advanced" className="group">
              <span className="text-foreground/40 text-xs tracking-wider uppercase">Reference</span>
              <h3 className="mt-1 text-lg font-semibold group-hover:underline">
                Research &amp; Reference{" "}
                <span className="text-foreground/30 inline-block transition-transform group-hover:translate-x-0.5">
                  &rarr;
                </span>
              </h3>
            </Link>
            <Prose
              text="[The Improv Reference Guide](/paths/reference-guide) is a cross-referenced, multi-tradition analysis of improvisation - sourced claims, counter-positions, and a knowledge graph that holds Johnstone, Spolin, Close, UCB, and Annoyance in one linked structure."
              currentUrl="/paths"
              className="text-foreground/60 mt-2 text-sm leading-relaxed"
            />
          </section>
        </div>
      </section>

      {FOCUS_GROUPS.map((group) => {
        const ids = [...group.ids].sort(
          (a, b) => audienceRank(getPathAudience(a)!) - audienceRank(getPathAudience(b)!),
        );
        return (
          <section
            key={group.key}
            className="border-foreground/10 mt-16 border-t pt-12"
            data-track={"focus-" + group.key}
          >
            <h2 className="text-xl font-semibold">{group.title}</h2>
            <p className="text-foreground/50 mt-1 mb-6 text-sm">{group.lede}</p>
            <div className="space-y-4">
              {ids.map((id) => {
                const audience = getPathAudience(id)!;
                const hubHref = "/learn/" + audience;
                const pathHref = "/paths/" + id;
                return (
                  <section
                    key={id}
                    className="border-foreground/10 bg-surface rounded-lg border p-6"
                  >
                    <Link
                      href={hubHref}
                      className="text-foreground/40 hover:text-foreground/60 text-xs tracking-wider uppercase"
                    >
                      {capitalise(audience)}
                    </Link>
                    <h3 className="mt-1 text-lg font-semibold">
                      <Link href={pathHref} className="hover:underline">
                        {getPathTitle(id)}
                      </Link>
                    </h3>
                    <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
                      {descriptionOf.get(id)}
                    </p>
                  </section>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
