import type { Metadata } from "next";

import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import { ExercisePickerClient } from "./ExercisePickerClient";

export const metadata: Metadata = {
  title: "Improv Exercise Picker — Free Tool",
  description:
    "Find the right improv exercise for your group in seconds. Filter by experience level, group size, time available, and skill focus.",
  alternates: { canonical: "/tools/exercise-picker" },
  openGraph: {
    title: "Improv Exercise Picker — Free Tool",
    description:
      "Find the right improv exercise for your group in seconds. Filter by experience level, group size, time available, and skill focus.",
    url: "/tools/exercise-picker",
    type: "website",
  },
};

export default async function ExercisePickerPage() {
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
      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Exercise Picker</h1>
        <p className="text-foreground/60 mt-2">
          Answer a few questions and get the right improv exercise for your group. Works for improv
          classes, team meetings, workshops, and classroom warm-ups.
        </p>
      </header>

      <ExercisePickerClient exercises={exercises} />
    </main>
  );
}
