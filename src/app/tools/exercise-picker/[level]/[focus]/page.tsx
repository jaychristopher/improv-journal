import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/Breadcrumb";
import {
  getPickerExercises,
  getPopulatedCombinations,
  isIndexableCombination,
} from "@/lib/exercise-picker";
import { metaDescription, pageTitle } from "@/lib/seo";

import { FOCUSES, getFocusBySlug, getLevelBySlug, LEVELS } from "../../picker-config";

export async function generateStaticParams() {
  // Combinations with no exercises are not published: the page would promise
  // exercises in its title and deliver none.
  return getPopulatedCombinations();
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
  const description = metaDescription(
    `${levelConfig.label}-level improv exercises focused on ${focusConfig.label.toLowerCase()}. ${focusConfig.description}`,
  );

  // A facet with fewer than three exercises is still worth serving and not
  // worth indexing. `follow` stays on so the exercises it links to still
  // collect the signal.
  const indexable = await isIndexableCombination(level, focus);

  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: `/tools/exercise-picker/${level}/${focus}` },
    ...(indexable ? {} : { robots: { index: false, follow: true } }),
  };
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

  const exercises = await getPickerExercises(level, focusConfig.tag, focusConfig.extraTags);
  if (exercises.length === 0) notFound();

  const populated = await getPopulatedCombinations();
  const hasCombo = (l: string, f: string) => populated.some((c) => c.level === l && c.focus === f);

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
        {LEVELS.filter((l) => hasCombo(l.slug, focus)).map((l) => (
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
        {FOCUSES.filter((f) => hasCombo(level, f.slug)).map((f) => (
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

      <div className="text-foreground/30 mt-12 text-xs">
        {exercises.length} exercises · {levelConfig.label} · {focusConfig.label} ·{" "}
        <Link href="/tools/exercise-picker" className="underline">
          Back to Exercise Picker
        </Link>
      </div>
    </main>
  );
}
