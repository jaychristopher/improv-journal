import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Learning Paths",
  description:
    "Structured guides for wherever you are in your journey — beginner through performer.",
  alternates: { canonical: "/paths" },
};

const STEPS = [
  {
    level: "Beginner",
    title: "Just Starting",
    href: "/learn/beginner",
    body: (
      <>
        Three ways in, depending on how you think.{" "}
        <Link href="/paths/beginner-foundations" className="text-foreground underline">
          Foundations
        </Link>{" "}
        teaches the essential principles and skills every improviser needs.{" "}
        <Link href="/paths/physics-of-connection" className="text-foreground underline">
          The Physics of Connection
        </Link>{" "}
        starts with what improv reveals about every conversation you&apos;ll ever have. And{" "}
        <Link href="/paths/systems-of-improv" className="text-foreground underline">
          Systems of Improv
        </Link>{" "}
        is for analytical minds who need the <em>why</em> before they can commit to the <em>how</em>
        .
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
        goes beyond &ldquo;find the game&rdquo; into how games evolve, invert, and break — and how
        character emerges from body and status rather than biography.{" "}
        <Link href="/paths/mastering-the-form" className="text-foreground underline">
          Mastering the Form
        </Link>{" "}
        covers every major longform format and the show-level craft that turns scenes into a shaped
        experience.{" "}
        <Link href="/paths/the-art-of-ensemble" className="text-foreground underline">
          The Art of Ensemble
        </Link>{" "}
        is about performing at the highest level — backline mastery, group mind, and the practices
        that make an ensemble more than a collection of individuals.
      </>
    ),
  },
];

/* Dot sizes grow along the journey — a quiet visual cue */
const DOT_SIZE = ["h-2 w-2", "h-2.5 w-2.5", "h-3 w-3", "h-3.5 w-3.5"];

export default function PathsIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Learning Paths</h1>
        <p className="text-foreground/60 mt-2">
          Structured guides for wherever you are in your journey.
        </p>
      </header>

      {/* ── Journey progression ──────────────────────────────────── */}
      <div>
        {STEPS.map((step, i) => (
          <div
            key={step.level}
            className={["relative pl-10", i > 0 && "pt-10"].filter(Boolean).join(" ")}
          >
            {/* Connector line — from this dot center down to bottom edge */}
            {i < STEPS.length - 1 && (
              <div
                className="border-foreground/10 absolute top-1/2 bottom-0 left-[11px] border-l-2 border-dashed"
                aria-hidden="true"
              />
            )}
            {/* Connector line — from top edge down to this dot center */}
            {i > 0 && (
              <div
                className="border-foreground/10 absolute top-0 bottom-1/2 left-[11px] border-l-2 border-dashed"
                aria-hidden="true"
              />
            )}

            {/* Step dot — vertically centered with the card */}
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

      {/* ── Reference (separate from the player journey) ─────────── */}
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
            is a cross-referenced, multi-tradition analysis of improvisation — sourced claims,
            counter-positions, and a knowledge graph that holds Johnstone, Spolin, Close, UCB, and
            Annoyance in one linked structure.
          </p>
        </section>
      </div>
    </main>
  );
}
