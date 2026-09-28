import type { Metadata } from "next";

import { Breadcrumb } from "@/components/Breadcrumb";
import { CollectionJsonLd } from "@/components/CollectionJsonLd";
import { Prose } from "@/components/Prose";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl } from "@/lib/content";
import { EXERCISES_HUB_COPY } from "@/lib/exercises-hub-copy";
import { orderedExercises } from "@/lib/hub-order";
import { hubMetadata, leadParagraph, pageTitle, stripLeadLabel } from "@/lib/seo";

export const metadata: Metadata = hubMetadata({
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
});

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
  // Beginner drills (the picker's level rule) first as the "start here" set,
  // then the rest, each group by title — not load order, which was the
  // filesystem's and flipped on production (entry 208).
  const exercises = await orderedExercises();

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
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Improv Exercises{" "}
          <span className="text-foreground/40 font-normal">({exercises.length})</span>
        </h1>
        <Prose
          text="Structured activities that build specific skills through constraints. This is the filterable index; for the same material written as a guide — how to choose one, how to run it, and what each is for — see [improv games](/improv-games)."
          currentUrl="/practice/exercises"
          className="text-foreground/60 mt-2 mb-2"
          data-track="hub-intro"
        />
      </header>
      {/* The list carries an h2 of its own so the entries below it do not jump
          the outline straight from h1 to h3 — the same fix /improv-games has. */}
      <h2 className="mb-4 text-xl font-semibold">Every Exercise</h2>
      <div data-track="exercise-list">
        <TagFilter items={items} filterGroups={FILTER_GROUPS} />
      </div>
      {/* The routes out of the index, by who is in the room — the games hub's
          by-audience section, for this page's readers. The prose lives in
          exercises-hub-copy.ts; hub-spokes.test.ts holds the links. */}
      <section className="mt-12" data-track="exercises-by-need">
        <h2 id="which-exercises-for-which-need" className="mb-3 text-xl font-semibold">
          Which Exercises for Which Need
        </h2>
        {Object.entries(EXERCISES_HUB_COPY).map(([key, text], i, all) => (
          <Prose
            key={key}
            text={text}
            currentUrl="/practice/exercises"
            className={i === all.length - 1 ? "text-foreground/70" : "text-foreground/70 mb-4"}
          />
        ))}
      </section>
    </main>
  );
}
