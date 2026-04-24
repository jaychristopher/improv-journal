import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import { ExercisePickerClient } from "../ExercisePickerClient";

export const metadata: Metadata = {
  title: "Improv Warm-Up Games: Find the Right One in Seconds",
  description:
    "Free tool: pick improv warm-up games for your rehearsal, class, workshop, or meeting. Filter by level and skill focus. Each game takes 5-10 minutes.",
  alternates: { canonical: "/tools/exercise-picker/warm-ups" },
  keywords: [
    "improv warm up games",
    "improv warmups",
    "warm up games for improv",
    "improv games to warm up actors",
    "workshop warm up activities",
  ],
  openGraph: {
    title: "Improv Warm-Up Games: Find the Right One in Seconds",
    description:
      "Free tool: pick improv warm-up games for your rehearsal, class, workshop, or meeting. Filter by level and skill focus. Each game takes 5-10 minutes.",
    url: "/tools/exercise-picker/warm-ups",
    type: "website",
  },
};

export default async function ExercisePickerWarmUpsPage() {
  const atoms = await loadAtoms();
  const exercises = atoms
    .filter((a) => a.frontmatter.type === "exercise")
    .map((a) => ({
      id: a.frontmatter.id,
      title: a.frontmatter.title,
      tags: a.frontmatter.tags ?? [],
      href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      description: extractDescription(a.content, 200),
    }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Exercise Picker", href: "/tools/exercise-picker" },
          { label: "Warm-Ups" },
        ]}
      />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Improv Warm-Up Games for Rehearsals, Classes, and Workshops
        </h1>
        <p className="text-foreground/60 mt-2">
          Find the right warm-up game for your group in seconds. Every exercise below works as a
          5-10 minute opener for improv rehearsals, acting classes, corporate workshops, teacher
          training sessions, or team meetings. Pick a level, choose a focus, and go.
        </p>
      </header>

      <ExercisePickerClient exercises={exercises} />

      <div className="border-foreground/10 mt-16 space-y-8 border-t pt-12">
        <section>
          <h2 className="text-lg font-semibold">What Makes a Great Warm-Up?</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            A good warm-up does three things: it gets people out of their heads and into the room,
            it builds the specific skill you&apos;ll need in the main work, and it creates the
            safety to take risks. The exercises in this tool are drawn from 60 years of improv
            pedagogy — each one designed to activate attention, build ensemble awareness, or lower
            the stakes for creative risk-taking.
          </p>
        </section>

        <div className="text-foreground/40 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span>More resources:</span>
          <Link href="/improv-games" className="hover:text-foreground/60 underline">
            Full exercise library
          </Link>
          <Link href="/5-minute-team-building" className="hover:text-foreground/60 underline">
            5-Minute Team Building
          </Link>
          <Link href="/paths/teaching-improv" className="hover:text-foreground/60 underline">
            Teaching Improv path
          </Link>
          <Link href="/how-to-give-feedback" className="hover:text-foreground/60 underline">
            How to Give Feedback
          </Link>
        </div>
      </div>
    </main>
  );
}
