import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import { ExercisePickerClient } from "../ExercisePickerClient";

export const metadata: Metadata = {
  title: "Improv Exercises for Beginners: Easy Games to Start With",
  description:
    "Free tool: find beginner-friendly improv exercises that require no experience. Pick by skill focus and get 3 exercises with full instructions.",
  alternates: { canonical: "/tools/exercise-picker/for-beginners" },
  keywords: [
    "improv exercises for beginners",
    "easy improv games",
    "beginner improv warm ups",
    "first improv class exercises",
    "improv games no experience",
  ],
  openGraph: {
    title: "Improv Exercises for Beginners: Easy Games to Start With",
    description:
      "Free tool: find beginner-friendly improv exercises that require no experience. Pick by skill focus and get 3 exercises with full instructions.",
    url: "/tools/exercise-picker/for-beginners",
    type: "website",
  },
};

export default async function ExercisePickerForBeginnersPage() {
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
          { label: "For Beginners" },
        ]}
      />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">
          Improv Exercises for Beginners: Easy Warm-Up Games to Start With
        </h1>
        <p className="text-foreground/60 mt-2">
          New to improv? These exercises require no experience and teach the fundamentals — saying
          yes, listening, and building on what your partner gives you. Pick a focus area and get 3
          exercises with step-by-step instructions.
        </p>
      </header>

      <ExercisePickerClient exercises={exercises} />

      <div className="border-foreground/10 mt-16 space-y-8 border-t pt-12">
        <section>
          <h2 className="text-lg font-semibold">What Makes a Good Beginner Exercise?</h2>
          <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
            The best beginner improv exercises share three qualities: they&apos;re simple enough to
            understand in 30 seconds, they make overthinking impossible by giving your attention a
            specific focus, and they produce surprising results that teach the principle better than
            any explanation could. Mirroring teaches presence. Gift Giving teaches acceptance.
            One-Word Scene teaches collaboration. The exercise does the teaching — you just have to
            try it.
          </p>
        </section>

        <div className="text-foreground/40 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <span>Ready to go deeper?</span>
          <Link href="/what-is-improv" className="hover:text-foreground/60 underline">
            What Is Improv?
          </Link>
          <Link href="/rules-of-improv" className="hover:text-foreground/60 underline">
            Rules of Improv
          </Link>
          <Link href="/paths/beginner-foundations" className="hover:text-foreground/60 underline">
            Beginner Foundations path
          </Link>
          <Link href="/improv-games" className="hover:text-foreground/60 underline">
            Full exercise library
          </Link>
        </div>
      </div>
    </main>
  );
}
