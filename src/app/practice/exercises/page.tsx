import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = {
  /**
   * The bare term was the whole title, which is the weakest thing a page can
   * do with the one line it gets in a result. This hub is the declared owner
   * of "improv exercises" in route-keywords.ts, and Search Console has been
   * giving the query to /tools/exercise-picker/beginner instead — a page that
   * says what it is for where this one only said what it was.
   */
  title: pageTitle("Improv Exercises: What Each One Actually Trains"),
  description:
    "Structured drills that each build one improv skill. What the constraint is for, what it trains, and when to run it — filtered by level and focus area.",
  alternates: { canonical: "/practice/exercises" },
};

const FILTER_GROUPS = [
  {
    label: "Level",
    tags: [
      { label: "Beginner", tag: "beginner" },
      { label: "Intermediate", tag: "intermediate" },
      { label: "Advanced", tag: "advanced" },
    ],
  },
  {
    label: "Focus",
    tags: [
      { label: "Presence", tag: "presence" },
      { label: "Ensemble", tag: "ensemble" },
      { label: "Emotion", tag: "emotion" },
      { label: "Physicality", tag: "physicality" },
      { label: "Courage", tag: "courage" },
      { label: "Recovery", tag: "recovery" },
    ],
  },
];

export default async function ExercisesPage() {
  const atoms = await loadAtoms();
  const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");

  const items = exercises.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
    rules: a.frontmatter.how_to_play,
    preview: leadParagraph(stripLeadLabel(a.content), 180),
    aliases: a.frontmatter.aliases,
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <CollectionJsonLd
        name="Improv Exercises"
        description="Drills for training specific improv skills — presence, listening, ensemble, emotion, physicality, and recovery."
        url="/practice/exercises"
        partOf="/practice"
        items={items.map((i) => ({ name: i.title, url: i.href, description: i.preview }))}
      />
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Practice", href: "/practice" },
          { label: "Exercises" },
        ]}
      />
      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Exercises ({exercises.length})</h1>
        <p className="text-foreground/60 mt-2 mb-2">
          Structured activities that build specific skills through constraints. This is the
          filterable index; for the same material written as a guide — how to choose one, how to run
          it, and what each is for — see{" "}
          <Link href="/improv-games" className="underline">
            improv games
          </Link>
          .
        </p>
      </header>
      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Exercise</h2>
      <TagFilter items={items} filterGroups={FILTER_GROUPS} />
    </main>
  );
}
