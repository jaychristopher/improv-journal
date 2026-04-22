import type { Metadata } from "next";
import Link from "next/link";

import { getRecommendedPath } from "@/lib/path-recommendations";

export const metadata: Metadata = {
  title: "Learning Paths",
  description:
    "Structured guides for wherever you are in your journey - beginner through performer.",
  alternates: { canonical: "/paths" },
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
        <Link href="/paths/physics-of-connection" className="text-foreground underline">
          The Physics of Connection
        </Link>{" "}
        if you want the big-picture lens, or{" "}
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
    level: "Teacher",
    title: "Learning to Teach",
    href: "/learn/teacher",
    body: (
      <>
        Being good at improv and being good at teaching it are different skills.{" "}
        <Link href="/paths/teaching-improv" className="text-foreground underline">
          Teaching Improv: From Performer to Pedagogue
        </Link>{" "}
        covers how to explain <em>why</em> things work, structure a class, give feedback that
        changes behavior, and create safety in the room.
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

export default function PathsIndexPage() {
  const beginnerRecommendation = getRecommendedPath("beginner");

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Learning Paths</h1>
        <p className="text-foreground/60 mt-2">
          Structured guides for wherever you are in your journey.
        </p>
      </header>

      <section className="border-foreground/10 bg-foreground/[0.03] mb-12 rounded-xl border p-6">
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

      <section className="text-foreground/40 mb-12 flex flex-wrap gap-x-5 gap-y-2 text-sm">
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

      <div>
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
              <div className={`bg-foreground/20 rounded-full ${DOT_SIZE[i]}`} aria-hidden="true" />
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
      </div>

      <div className="border-foreground/10 mt-16 border-t pt-12">
        <section className="border-foreground/10 bg-surface rounded-lg border p-6">
          <Link href="/learn/advanced" className="group">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">Reference</span>
            <h2 className="mt-1 text-lg font-semibold group-hover:underline">
              Research &amp; Reference{" "}
              <span className="text-foreground/30 inline-block transition-transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </h2>
          </Link>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            <Link href="/paths/reference-guide" className="text-foreground underline">
              The Improv Reference Guide
            </Link>{" "}
            is a cross-referenced, multi-tradition analysis of improvisation - sourced claims,
            counter-positions, and a knowledge graph that holds Johnstone, Spolin, Close, UCB, and
            Annoyance in one linked structure.
          </p>
        </section>
      </div>
    </main>
  );
}
