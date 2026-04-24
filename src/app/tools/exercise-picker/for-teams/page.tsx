import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import { ExercisePickerClient } from "../ExercisePickerClient";

export const metadata: Metadata = {
  title: "Improv Exercises for Teams: Find the Right Activity for Your Group",
  description:
    "Free tool: find improv-based team exercises by group level and focus area. Communication, trust, collaboration, and group dynamics — each exercise takes 5-10 minutes.",
  alternates: { canonical: "/tools/exercise-picker/for-teams" },
  keywords: [
    "communication exercises for teams",
    "team warm up exercises",
    "trust exercises for teams",
    "team building exercises",
    "group communication activities",
  ],
  openGraph: {
    title: "Improv Exercises for Teams: Find the Right Activity for Your Group",
    description:
      "Free tool: find improv-based team exercises by group level and focus area. Communication, trust, collaboration, and group dynamics — each exercise takes 5-10 minutes.",
    url: "/tools/exercise-picker/for-teams",
    type: "website",
  },
};

export default async function ExercisePickerForTeamsPage() {
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
          { label: "For Teams" },
        ]}
      />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Improv Exercises for Teams: Communication, Trust, and Collaboration
        </h1>
        <p className="text-foreground/60 mt-2">
          Find the right improv-based exercise for your team meeting, offsite, or workshop. Each
          exercise takes 5-10 minutes, requires no improv experience, and builds specific team
          skills — listening, building on ideas, group coordination, and trust.
        </p>
      </header>

      <ExercisePickerClient exercises={exercises} />

      <div className="border-foreground/10 mt-16 space-y-8 border-t pt-12">
        <section>
          <h2 className="text-lg font-semibold">Why Improv Exercises Work for Teams</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            Improv exercises build team skills faster than traditional team building because they
            require real-time listening and response — not just talking about collaboration, but
            practicing it. Every exercise above trains a specific skill: mirroring trains sustained
            attention, Yes-And Chain trains building on contributions instead of evaluating them,
            and Gift Giving trains surrendering control and receiving generously.
          </p>
        </section>

        <div className="text-foreground/40 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span>Related guides:</span>
          <Link href="/team-bonding-activities" className="hover:text-foreground/60 underline">
            Team Bonding Activities
          </Link>
          <Link href="/psychological-safety" className="hover:text-foreground/60 underline">
            Psychological Safety
          </Link>
          <Link href="/emotional-safety" className="hover:text-foreground/60 underline">
            Emotional Safety
          </Link>
          <Link href="/how-to-read-the-room" className="hover:text-foreground/60 underline">
            How to Read the Room
          </Link>
          <Link href="/paths/improv-for-teams" className="hover:text-foreground/60 underline">
            Improv for Teams path
          </Link>
        </div>
      </div>
    </main>
  );
}
