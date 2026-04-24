import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { loadAtoms } from "@/lib/content";

export const metadata: Metadata = {
  title: "Practice",
  description:
    "Exercises, techniques, show formats, and the vocabulary to name what's happening in scenes and conversations.",
  alternates: { canonical: "/practice" },
};

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
