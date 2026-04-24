import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import { ExercisePickerClient } from "./ExercisePickerClient";

export const metadata: Metadata = {
  title: "Improv Exercise Picker: Find the Right Warm-Up Game for Your Group",
  description:
    "Free tool: pick improv warm-up games and exercises by experience level and skill focus. Works for improv classes, team meetings, workshops, and classroom warm-ups.",
  alternates: { canonical: "/tools/exercise-picker" },
  keywords: [
    "improv warm up games",
    "improv exercises",
    "communication exercises for teams",
    "improv game ideas",
    "team warm up exercises",
  ],
  openGraph: {
    title: "Improv Exercise Picker: Find the Right Warm-Up Game for Your Group",
    description:
      "Free tool: pick improv warm-up games and exercises by experience level and skill focus. Works for improv classes, team meetings, workshops, and classroom warm-ups.",
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

  const beginnerExercises = exercises.filter(
    (e) => e.tags.includes("beginner") || e.tags.includes("fundamentals"),
  );
  const teamExercises = exercises.filter(
    (e) => e.tags.includes("ensemble") || e.tags.includes("presence"),
  );

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Exercise Picker" },
        ]}
      />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Improv Exercise Picker: Find the Right Warm-Up Game
        </h1>
        <p className="text-foreground/60 mt-2">
          Pick the right improv exercise for your group in seconds. Choose an experience level, pick
          a skill focus, and get 3 exercises with full instructions. Works for improv classes, team
          meetings, workshops, and classroom warm-ups.
        </p>
      </header>

      <ExercisePickerClient exercises={exercises} />

      {/* SEO content sections — give Google text to index */}
      <div className="border-foreground/10 mt-20 space-y-12 border-t pt-12">
        <section>
          <h2 className="text-lg font-semibold">Best Improv Warm-Up Games for Beginners</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            If your group is new to improv, start with exercises that build listening and presence
            without requiring performance skills. The best beginner warm-ups — like{" "}
            <Link href="/practice/exercises/mirroring" className="underline">
              Mirroring
            </Link>
            ,{" "}
            <Link href="/practice/exercises/gift-giving" className="underline">
              Gift Giving
            </Link>
            , and{" "}
            <Link href="/practice/exercises/one-word-scene" className="underline">
              One-Word Scene
            </Link>{" "}
            — work because they make self-consciousness impossible. Your attention gets consumed by
            the exercise, leaving no bandwidth for overthinking.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {beginnerExercises.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                href={e.href}
                className="text-foreground/50 bg-foreground/5 hover:bg-foreground/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
              >
                {e.title}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">Communication Exercises for Teams</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            Improv exercises are the most effective communication training for teams because they
            practice real-time listening and response — not theory. Exercises like{" "}
            <Link href="/practice/exercises/mirroring" className="underline">
              Mirroring
            </Link>{" "}
            (sustained mutual attention),{" "}
            <Link href="/practice/exercises/yes-and-chain" className="underline">
              Yes, And Chain
            </Link>{" "}
            (building on ideas instead of evaluating them), and{" "}
            <Link href="/practice/exercises/last-word-response" className="underline">
              Last Word Response
            </Link>{" "}
            (genuine listening before responding) take 5-10 minutes and transform how a team
            communicates. Use the picker above to find the right exercise for your team&apos;s level
            and focus area.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {teamExercises.slice(0, 5).map((e) => (
              <Link
                key={e.id}
                href={e.href}
                className="text-foreground/50 bg-foreground/5 hover:bg-foreground/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
              >
                {e.title}
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold">How to Use These Exercises</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            Each exercise in this tool links to a full instruction page with step-by-step
            directions, the improv principle it trains, and variations for different group sizes.
            You don&apos;t need improv experience to run them — the instructions are designed for
            facilitators, teachers, and team leaders who want to add improv-based warm-ups to their
            sessions.
          </p>
          <div className="text-foreground/40 mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <span>More resources:</span>
            <Link href="/improv-games" className="hover:text-foreground/60 underline">
              Full exercise library
            </Link>
            <Link href="/team-bonding-activities" className="hover:text-foreground/60 underline">
              Team bonding guide
            </Link>
            <Link href="/guides" className="hover:text-foreground/60 underline">
              All guides
            </Link>
            <Link href="/paths" className="hover:text-foreground/60 underline">
              Learning paths
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
