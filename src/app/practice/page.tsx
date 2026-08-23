import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadAtoms } from "@/lib/content";
import { pageTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Practice: Techniques, Exercises, and Formats"),
  description:
    "Exercises, techniques, show formats, and the vocabulary to name what's happening in scenes and conversations.",
  alternates: { canonical: "/practice" },
};

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose is plain strings
 * rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "The four sections divide by what you actually do with them, which is worth knowing before you browse. Exercises are things you run with other people and a timer. Techniques are things you do inside a scene, or inside a conversation, while it is happening. Formats are shapes for a whole show. Vocabulary is names for what already happened, which sounds like the least useful of the four and is the one that changes how fast you improve.",
  "Most people arrive wanting one and end up reading another. If you are here to practise with a group, the exercises transfer with the least translation — a good number of them need no stage, no audience and no experience, just two people and a few minutes. The techniques assume a scene is already running, so they read as abstract until you have one to apply them to.",
  "The failure mode is collecting. A technique you have read is not a technique you have, and the gap between those two states is measured in repetitions rather than in pages. The vocabulary section is the exception, because there the reading is the skill: being able to say what went wrong is most of being able to fix it.",
];

export default async function PracticePage() {
  const atoms = await loadAtoms();
  const counts = {
    exercises: atoms.filter((a) => a.frontmatter.type === "exercise").length,
    techniques: atoms.filter(
      (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy",
    ).length,
    formats: atoms.filter((a) => a.frontmatter.type === "format").length,
    vocabulary: atoms.filter((a) => a.frontmatter.type === "definition").length,
  };

  const sections = [
    {
      href: "/practice/exercises",
      label: "Exercises",
      count: counts.exercises,
      desc: "Structured activities that build specific skills through constraints.",
    },
    {
      href: "/practice/techniques",
      label: "Techniques",
      count: counts.techniques,
      desc: "The specific moves — how to listen, initiate, edit, support, heighten, and recover.",
    },
    {
      href: "/practice/formats",
      label: "Formats",
      count: counts.formats,
      desc: "Performance structures — Harold, Montage, Armando, and beyond.",
    },
    {
      href: "/practice/vocabulary",
      label: "Vocabulary",
      count: counts.vocabulary,
      desc: "The foundational concepts that name what's happening in scenes and conversations.",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Practice" }]} />
      <header className="mb-12">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Practice</h1>
        <p className="text-foreground/60 mt-2">
          The tools improvisers use — exercises you can try with a partner, techniques for better
          conversations and scenes, show formats, and the vocabulary to name what&apos;s happening.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      <Link
        href="/tools/exercise-picker"
        className="border-foreground/10 bg-foreground/[0.03] hover:border-foreground/30 mb-8 block rounded-xl border p-5 transition-colors"
      >
        <span className="text-foreground/40 text-xs tracking-wider uppercase">Free tool</span>
        <span className="mt-1 block font-semibold">
          Exercise Picker: find the right exercise in seconds &rarr;
        </span>
        <span className="text-foreground/50 mt-1 block text-sm">
          Filter by level and skill focus. Great for planning classes, workshops, and team meetings.
        </span>
      </Link>

      <div className="space-y-4">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-5 transition-colors"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{s.label}</h2>
              <span className="text-foreground/40 text-sm">{s.count}</span>
            </div>
            <p className="text-foreground/50 mt-1 text-sm">{s.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
