import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { Prose } from "@/components/Prose";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { principleFacetCountLine, principleFacets } from "@/lib/picker-principles";
import { extractDescription, ogImages, pageTitle, SITE_NAME } from "@/lib/seo";

import { ExercisePickerClient } from "./ExercisePickerClient";
import { exerciseFocuses, matchesLevel } from "./picker-config";

export const metadata: Metadata = {
  title: pageTitle("Improv Exercise Picker: Find the Right Warm-Up Game"),
  description:
    "Free tool: pick improv warm-up games by experience level and skill focus — for classes, team meetings, workshops, and classroom warm-ups.",
  alternates: { canonical: "/tools/exercise-picker" },
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Improv Exercise Picker: Find the Right Warm-Up Game",
    description:
      "Free tool: pick improv warm-up games by experience level and skill focus — for classes, team meetings, workshops, and classroom warm-ups.",
    url: "/tools/exercise-picker",
    type: "website",
    images: ogImages("Improv Exercise Picker: Find the Right Warm-Up Game"),
  },
};

export default async function ExercisePickerPage() {
  const atoms = await loadAtoms();
  // The derived facet family, beside the author's focus tags (entry 335).
  const principles = await principleFacets();
  const exercises = atoms
    .filter((a) => a.frontmatter.type === "exercise")
    .map((a) => ({
      id: a.frontmatter.id,
      title: a.frontmatter.title,
      tags: a.frontmatter.tags ?? [],
      focuses: exerciseFocuses(a.frontmatter.id, a.frontmatter.tags ?? [], a.frontmatter.links),
      href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      description: extractDescription(a.content, 200),
    }));

  const beginnerExercises = exercises.filter((e) => matchesLevel(e.tags, "beginner"));
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
        <Prose
          text="Pick the right improv exercise for your group in seconds. Choose an experience level, pick a skill focus, and get 3 exercises with full instructions. Works for improv classes, team meetings, workshops, and classroom warm-ups."
          currentUrl="/tools/exercise-picker"
          className="text-foreground/60 mt-2"
        />
      </header>

      <ExercisePickerClient exercises={exercises} />

      {/* Browse by level — direct links to pre-filtered pages */}
      <div className="mt-12 mb-4" data-track="picker-levels">
        <h2 className="mb-4 text-lg font-semibold">Or browse by level</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/tools/exercise-picker/beginner"
            className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 transition-colors"
          >
            <span className="font-medium">Beginner</span>
            <span className="text-foreground/50 mt-0.5 block text-xs">No experience needed</span>
          </Link>
          <Link
            href="/tools/exercise-picker/intermediate"
            className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 transition-colors"
          >
            <span className="font-medium">Intermediate</span>
            <span className="text-foreground/50 mt-0.5 block text-xs">Knows the basics</span>
          </Link>
          <Link
            href="/tools/exercise-picker/advanced"
            className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 transition-colors"
          >
            <span className="font-medium">Advanced</span>
            <span className="text-foreground/50 mt-0.5 block text-xs">Experienced performers</span>
          </Link>
        </div>
      </div>

      {/* Browse by principle — the drills under the principle their own
          Trains line names, which is the vocabulary the principles hub sends
          a reader here with (entry 335). Derived, so a facet appears when a
          drill gains the line and never needs entering by hand. */}
      <div className="mt-8 mb-4" data-track="picker-principles">
        <h2 className="mb-4 text-lg font-semibold">Or browse by principle</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {principles.map((facet) => (
            <Link
              key={facet.id}
              href={facet.href}
              className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 transition-colors"
            >
              <span className="font-medium">{facet.title}</span>
              <span className="text-foreground/50 mt-0.5 block text-xs">
                {principleFacetCountLine(facet.drills.length)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* SEO content sections — give Google text to index */}
      <div className="border-foreground/10 mt-20 space-y-12 border-t pt-12">
        <section data-track="beginner-warmups">
          <h2 className="text-lg font-semibold">Best Improv Warm-Up Games for Beginners</h2>
          <Prose
            text="If your group is new to improv, start with exercises that build listening and presence without requiring performance skills. The best beginner warm-ups — like [Mirroring](/practice/exercises/mirroring), [Gift Giving](/practice/exercises/gift-giving), and [One-Word Scene](/practice/exercises/one-word-scene) — work because they make self-consciousness impossible. Your attention gets consumed by the exercise, leaving no bandwidth for overthinking."
            currentUrl="/tools/exercise-picker"
            className="text-foreground/60 mt-2 text-sm leading-relaxed"
          />
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

        <section data-track="team-exercises">
          <h2 className="text-lg font-semibold">Communication Exercises for Teams</h2>
          <Prose
            text="Improv exercises are the most effective communication training for teams because they practice real-time listening and response — not theory. Exercises like [Mirroring](/practice/exercises/mirroring) (sustained mutual attention), [Yes, And Chain](/practice/exercises/yes-and-chain) (building on ideas instead of evaluating them), and [Last Word Response](/practice/exercises/last-word-response) (genuine listening before responding) take 5-10 minutes and transform how a team communicates. Use the picker above to find the right exercise for your team's level and focus area."
            currentUrl="/tools/exercise-picker"
            className="text-foreground/60 mt-2 text-sm leading-relaxed"
          />
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

        <section data-track="more-resources">
          <h2 className="text-lg font-semibold">How to Use These Exercises</h2>
          <Prose
            text="Each exercise in this tool links to a full instruction page with step-by-step directions, the improv principle it trains, and variations for different group sizes. You don't need improv experience to run them — the instructions are designed for facilitators, teachers, and team leaders who want to add improv-based warm-ups to their sessions."
            currentUrl="/tools/exercise-picker"
            className="text-foreground/60 mt-2 text-sm leading-relaxed"
          />
          <div className="text-foreground/40 mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <span>More resources:</span>
            <Link href="/improv-games" className="hover:text-foreground/60 underline">
              Full exercise library
            </Link>
            <Link href="/team-building-activities" className="hover:text-foreground/60 underline">
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
