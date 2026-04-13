import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumb } from "@/components/Breadcrumb";
import { TagFilter } from "@/components/TagFilter";
import { getAtomUrl, loadAtoms } from "@/lib/content";

export const metadata: Metadata = {
  title: "Improv Games: The Complete Collection",
  description:
    "Every improv game and exercise, organized by level and skill. From warm-ups for beginners to advanced ensemble work.",
  alternates: { canonical: "/improv-games" },
  openGraph: {
    title: "Improv Games: The Complete Collection",
    description:
      "Every improv game and exercise, organized by level and skill. From warm-ups for beginners to advanced ensemble work.",
    url: "/improv-games",
    type: "website",
  },
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

export default async function ImprovGamesPage() {
  const atoms = await loadAtoms();
  const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");

  const items = exercises.map((a) => ({
    id: a.frontmatter.id,
    title: a.frontmatter.title,
    href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    tags: a.frontmatter.tags ?? [],
    preview: a.content
      .replace(/^---[\s\S]*?---\n*/m, "")
      .replace(/^#{1,6}\s+.*$/gm, "")
      .replace(/\*\*[^*]+\*\*/g, "")
      .trim()
      .substring(0, 150),
  }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb crumbs={[{ label: "Home", href: "/" }, { label: "Improv Games" }]} />

      <header className="mb-8">
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          Improv Games: The Complete Collection
        </h1>
        <p className="text-foreground/60 mt-2">
          Every improv game and exercise, organized by level and skill. Each one includes how to run
          it, what it builds, and why it works. Whether you&apos;re warming up before a show,
          teaching a class, or looking for team building games — start here.
        </p>
      </header>

      <TagFilter items={items} filterGroups={FILTER_GROUPS} />

      {/* SEO sections targeting long-tail keywords */}
      <section className="border-foreground/10 mt-16 border-t pt-12">
        <h2 className="mb-4 text-lg font-semibold">Improv Games for Beginners</h2>
        <p className="text-foreground/60 mb-4 text-sm">
          New to improv? These games require no experience and teach the fundamentals — saying yes,
          listening, and building on what your partner gives you.
        </p>
        <div className="flex flex-wrap gap-2">
          {items
            .filter((i) => i.tags.includes("beginner"))
            .map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className="border-foreground/10 hover:border-foreground/30 rounded-full border px-3 py-1 text-sm transition-colors"
              >
                {i.title}
              </Link>
            ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Improv Warm-Up Games</h2>
        <p className="text-foreground/60 mb-4 text-sm">
          Quick games to get a group connected, present, and ready to play. Use these before
          rehearsals, shows, or workshops.
        </p>
        <div className="flex flex-wrap gap-2">
          {items
            .filter(
              (i) =>
                i.tags.includes("presence") ||
                i.tags.includes("ensemble") ||
                i.tags.includes("beginner"),
            )
            .slice(0, 8)
            .map((i) => (
              <Link
                key={i.id}
                href={i.href}
                className="border-foreground/10 hover:border-foreground/30 rounded-full border px-3 py-1 text-sm transition-colors"
              >
                {i.title}
              </Link>
            ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold">Want to understand why these games work?</h2>
        <p className="text-foreground/60 text-sm">
          Every improv game trains a specific skill rooted in how human connection works.{" "}
          <Link href="/how-it-works" className="text-foreground underline">
            See the system underneath
          </Link>
          , or{" "}
          <Link href="/paths" className="text-foreground underline">
            start a learning path
          </Link>{" "}
          to go deeper.
        </p>
      </section>
    </main>
  );
}
