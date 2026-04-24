import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { extractDescription } from "@/lib/seo";

import {
  EXERCISE_FOCUS_MAP,
  FOCUSES,
  getFocusBySlug,
  getLevelBySlug,
  LEVELS,
} from "../../picker-config";

export function generateStaticParams() {
  const params: { level: string; focus: string }[] = [];
  for (const l of LEVELS) {
    for (const f of FOCUSES) {
      params.push({ level: l.slug, focus: f.slug });
    }
  }
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ level: string; focus: string }>;
}): Promise<Metadata> {
  const { level, focus } = await params;
  const levelConfig = getLevelBySlug(level);
  const focusConfig = getFocusBySlug(focus);
  if (!levelConfig || !focusConfig) return {};

  const title = `${levelConfig.label} ${focusConfig.label} Improv Exercises`;
  const description = `${levelConfig.label}-level improv exercises focused on ${focusConfig.label.toLowerCase()}. ${focusConfig.description}`;

  return {
    title,
    description,
    alternates: { canonical: `/tools/exercise-picker/${level}/${focus}` },
  };
}

function matchesLevel(tags: string[], level: string): boolean {
  if (tags.includes("fundamentals")) return true;
  return tags.includes(level);
}

function matchesFocus(id: string, tags: string[], focusTag: string, extraTags: string[]): boolean {
  if (tags.includes(focusTag)) return true;
  const mapped = EXERCISE_FOCUS_MAP[id] ?? [];
  if (mapped.includes(focusTag)) return true;
  for (const extra of extraTags) {
    if (tags.includes(extra) || mapped.includes(extra)) return true;
  }
  return false;
}

export default async function LevelFocusPage({
  params,
}: {
  params: Promise<{ level: string; focus: string }>;
}) {
  const { level, focus } = await params;
  const levelConfig = getLevelBySlug(level);
  const focusConfig = getFocusBySlug(focus);
  if (!levelConfig || !focusConfig) notFound();

  const atoms = await loadAtoms();
  const exercises = atoms
    .filter(
      (a) =>
        a.frontmatter.type === "exercise" &&
        matchesLevel(a.frontmatter.tags ?? [], level) &&
        matchesFocus(
          a.frontmatter.id,
          a.frontmatter.tags ?? [],
          focusConfig.tag,
          focusConfig.extraTags,
        ),
    )
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
          { label: levelConfig.label, href: `/tools/exercise-picker/${level}` },
          { label: focusConfig.label },
        ]}
      />

      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {levelConfig.label} {focusConfig.label} Improv Exercises
        </h1>
        <p className="text-foreground/60 mt-2">{focusConfig.description}</p>
      </header>

      {/* Level tabs */}
      <nav className="mb-4 flex gap-2" aria-label="Level">
        {LEVELS.map((l) => (
          <Link
            key={l.slug}
            href={`/tools/exercise-picker/${l.slug}/${focus}`}
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
          className="bg-foreground/5 text-foreground/50 hover:bg-foreground/10 rounded-lg px-3 py-1.5 text-sm transition-colors"
        >
          All
        </Link>
        {FOCUSES.map((f) => (
          <Link
            key={f.slug}
            href={`/tools/exercise-picker/${level}/${f.slug}`}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              f.slug === focus
                ? "bg-foreground text-background font-medium"
                : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10"
            }`}
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
              {exercise.tags
                .filter((t) => t !== "exercises")
                .slice(0, 4)
                .map((tag) => (
                  <span
                    key={tag}
                    className="bg-foreground/5 text-foreground/40 rounded-full px-2 py-0.5 text-xs"
                  >
                    {tag}
                  </span>
                ))}
            </div>
          </Link>
        ))}
      </div>

      {exercises.length === 0 && (
        <p className="text-foreground/40 text-sm">
          No exercises match this combination yet.{" "}
          <Link href={`/tools/exercise-picker/${level}`} className="underline">
            See all {levelConfig.label.toLowerCase()} exercises
          </Link>
          .
        </p>
      )}

      <div className="text-foreground/30 mt-12 text-xs">
        {exercises.length} exercises · {levelConfig.label} · {focusConfig.label} ·{" "}
        <Link href="/tools/exercise-picker" className="underline">
          Back to Exercise Picker
        </Link>
      </div>
    </main>
  );
}
