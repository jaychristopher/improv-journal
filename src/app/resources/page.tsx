import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { pageTitle } from "@/lib/seo";

export const metadata: Metadata = {
  title: pageTitle("Improv Resources: Paths, Podcasts and Reading Lists"),
  description:
    "Learning paths, guides, podcasts, reading lists, and the traditions that shaped improv.",
  alternates: { canonical: "/resources" },
};

const SECTIONS = [
  {
    href: "/paths",
    label: "Learning Paths",
    desc: "Structured guides for wherever you are — beginner through performer.",
  },
  {
    href: "/guides",
    label: "Guides",
    desc: "Practical guides for overthinking, stage fright, team dynamics, feedback, and more.",
  },
  {
    href: "/tools/exercise-picker",
    label: "Exercise Picker",
    desc: "Free tool — find the right improv exercise for your group by level and focus.",
  },
  {
    href: "/listen",
    label: "Listen",
    desc: "Podcast conversations exploring the physics of human connection through improv.",
  },
  {
    href: "/traditions",
    label: "Traditions",
    desc: "Five schools of thought — Johnstone, Spolin, Close, UCB, and Annoyance compared.",
  },
  {
    href: "/library",
    label: "Reading List",
    desc: "The books, podcasts, and research behind these ideas.",
  },
];

/**
 * Orienting paragraphs for this hub, held in a const the way guide-categories
 * holds them for the topic hubs. Kept out of JSX so the prose stays plain
 * strings rather than escaped markup, and so prose-overlap reads it as text.
 */
const HUB_ORIENTATION = [
  "Everything under here sits outside the two main bodies of the site — the system that explains why interaction behaves as it does, and the practice material you use on it. What is left is the supporting apparatus, and it divides by what it does rather than by subject.",
  "Paths sequence material for a particular kind of reader. Guides take one difficulty at a time and can be read in any order. The reading list says where the claims came from and what each source is for. Traditions compares the five schools and their disagreements. The exercise picker filters by level and focus when you know what a session needs and not which exercise gives it.",
  "If you are not sure which of those you want, the useful question is whether you are trying to solve something, understand something, or check something. Guides for the first, paths and traditions for the second, the reading list for the third.",
];

export default function ResourcesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]} />

      <header className="mb-12">
        <h1 className="text-3xl font-bold tracking-tight">Resources</h1>
        <p className="text-foreground/60 mt-2">
          Everything beyond the core system and practice — learning paths, guides, podcasts, reading
          lists, and the traditions that shaped improv.
        </p>
      </header>

      <section className="mb-12">
        {HUB_ORIENTATION.map((paragraph) => (
          <p key={paragraph.slice(0, 40)} className="text-foreground/70 mb-4">
            {paragraph}
          </p>
        ))}
      </section>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <div
            key={s.href}
            className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-5 transition-colors"
          >
            <h2 className="font-semibold">
              <Link href={s.href} className="after:absolute after:inset-0">
                {s.label}
              </Link>
            </h2>
            <p className="text-foreground/50 mt-1 text-sm">{s.desc}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
