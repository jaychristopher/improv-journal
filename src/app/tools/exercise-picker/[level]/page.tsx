import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import { EXERCISE_FOCUS_MAP, FOCUSES, getLevelBySlug, LEVELS } from "../picker-config";

export function generateStaticParams() {
  return LEVELS.map((l) => ({ level: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string }>;
}): Promise<Metadata> {
  const { level } = await params;
  const config = getLevelBySlug(level);
  if (!config) return {};
  return {
    title: `${config.title}: Warm-Up Games and Drills`,
    description: config.description,
    alternates: { canonical: `/tools/exercise-picker/${level}` },
    keywords: config.keywords,
  };
}

function matchesLevel(tags: string[], level: string): boolean {
  if (tags.includes("fundamentals")) return true;
  return tags.includes(level);
}

function getExerciseFocuses(id: string, tags: string[]): string[] {
  const mapped = EXERCISE_FOCUS_MAP[id] ?? [];
  const fromTags = FOCUSES.map((f) => f.tag).filter((t) => tags.includes(t));
  return [...new Set([...mapped, ...fromTags])];
}

export default async function LevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const config = getLevelBySlug(level);
  if (!config) notFound();

  const atoms = await loadAtoms();
  const exercises = atoms
    .filter(
      (a) => a.frontmatter.type === "exercise" && matchesLevel(a.frontmatter.tags ?? [], level),
    )
    .map((a) => ({
      id: a.frontmatter.id,
      title: a.frontmatter.title,
      tags: a.frontmatter.tags ?? [],
      href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      description: extractDescription(a.content, 200),
      focuses: getExerciseFocuses(a.frontmatter.id, a.frontmatter.tags ?? []),
    }));

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Breadcrumb
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Exercise Picker", href: "/tools/exercise-picker" },
          { label: config.label },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
        <p className="text-foreground/60 mt-2">{config.description}</p>
      </header>

      {/* Level tabs */}
      <nav className="mb-4 flex gap-2" aria-label="Level">
        {LEVELS.map((l) => (
          <Link
            key={l.slug}
            href={`/tools/exercise-picker/${l.slug}`}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              l.slug === level
                ? "bg-foreground text-background font-medium"
                : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      {/* Focus tabs */}
      <nav className="mb-10 flex flex-wrap gap-2" aria-label="Focus">
        <Link
          href={`/tools/exercise-picker/${level}`}
          className="bg-foreground/10 text-foreground/70 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          All
        </Link>
        {FOCUSES.map((f) => (
          <Link
            key={f.slug}
            href={`/tools/exercise-picker/${level}/${f.slug}`}
            className="bg-foreground/5 text-foreground/50 hover:bg-foreground/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {/* Exercise list */}
      <div className="space-y-4">
        {exercises.map((exercise) => (
          <Link
            key={exercise.id}
            href={exercise.href}
            className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-xl border p-6 transition-colors"
          >
            <h2 className="font-semibold group-hover:underline">{exercise.title}</h2>
            <p className="text-foreground/50 mt-1 text-sm">{exercise.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exercise.focuses.slice(0, 3).map((f) => (
                <span
                  key={f}
                  className="bg-foreground/5 text-foreground/40 rounded-full px-2 py-0.5 text-xs"
                >
                  {FOCUSES.find((fc) => fc.tag === f)?.label ?? f}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      {exercises.length === 0 && (
        <p className="text-foreground/40 text-sm">
          No exercises match this level yet.{" "}
          <Link href="/tools/exercise-picker" className="underline">
            Try the full picker
          </Link>
          .
        </p>
      )}

      <div className="text-foreground/30 mt-12 text-xs">
        {exercises.length} exercises · {config.label} level ·{" "}
        <Link href="/tools/exercise-picker" className="underline">
          Back to Exercise Picker
        </Link>
      </div>
    </main>
  );
}
