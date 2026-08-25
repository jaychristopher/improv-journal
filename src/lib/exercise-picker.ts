/**
 * Which exercises belong to a level/focus combination.
 *
 * The picker publishes a page for every level crossed with every focus, but
 * with 17 exercises spread over 18 combinations some of them match nothing.
 * Four were live and indexable — beginner/emotion, beginner/recovery,
 * advanced/emotion, advanced/recovery — each promising, in its title tag,
 * exercises it did not have, and each listed in the sitemap.
 *
 * An indexable page that advertises content and delivers none is the thing
 * search engines treat as a soft 404. The matching moved here so the router,
 * the sitemap and the page's own navigation can agree on which combinations
 * actually exist.
 */

import { EXERCISE_FOCUS_MAP, FOCUSES, LEVELS } from "@/app/tools/exercise-picker/picker-config";

import { getAtomUrl, loadAtoms } from "./content";
import { leadParagraph, stripLeadLabel } from "./seo";

export function matchesLevel(tags: string[], level: string): boolean {
  if (tags.includes("fundamentals")) return true;
  return tags.includes(level);
}

export function matchesFocus(
  id: string,
  tags: string[],
  focusTag: string,
  extraTags: string[],
): boolean {
  if (tags.includes(focusTag)) return true;
  const mapped = EXERCISE_FOCUS_MAP[id] ?? [];
  if (mapped.includes(focusTag)) return true;
  return extraTags.some((extra) => tags.includes(extra) || mapped.includes(extra));
}

export interface PickerExercise {
  id: string;
  title: string;
  tags: string[];
  href: string;
  description: string;
}

export async function getPickerExercises(
  level: string,
  focusTag: string,
  extraTags: string[],
): Promise<PickerExercise[]> {
  const atoms = await loadAtoms();

  return atoms
    .filter(
      (a) =>
        a.frontmatter.type === "exercise" &&
        matchesLevel(a.frontmatter.tags ?? [], level) &&
        matchesFocus(a.frontmatter.id, a.frontmatter.tags ?? [], focusTag, extraTags),
    )
    .map((a) => ({
      id: a.frontmatter.id,
      title: a.frontmatter.title,
      tags: a.frontmatter.tags ?? [],
      href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      description: leadParagraph(stripLeadLabel(a.content), 200),
    }));
}

/** Every level/focus pair that actually has exercises behind it. */
/**
 * The point at which a facet is a real answer rather than a promise.
 *
 * The gate used to be "at least one". That published four pages whose title
 * offered a category of exercises and whose body listed a single one — and two
 * of those, advanced/courage and advanced/physicality, resolved to the same
 * lone exercise, so they were byte-identical pages competing under different
 * titles. Three is the smallest number that gives a reader a choice.
 */
export const MIN_INDEXABLE_EXERCISES = 3;

export async function getPopulatedCombinations(): Promise<{ level: string; focus: string }[]> {
  const combos: { level: string; focus: string }[] = [];

  for (const level of LEVELS) {
    for (const focus of FOCUSES) {
      const exercises = await getPickerExercises(level.slug, focus.tag, focus.extraTags);
      if (exercises.length > 0) combos.push({ level: level.slug, focus: focus.slug });
    }
  }

  return combos;
}

/**
 * How much a facet has to offer that its siblings do not.
 *
 * MIN_INDEXABLE_EXERCISES counts what a page lists. It cannot see what the
 * page next door lists, and three facets of the same focus mostly list the
 * same exercises: measured on the build, beginner/ensemble and
 * intermediate/ensemble each held eleven and each had exactly one their
 * siblings did not, and intermediate/presence held seven and had none at all —
 * a strict subset of two pages that were also indexed. Eight-word shingles put
 * beginner/ensemble and intermediate/ensemble at 74% identical.
 *
 * That is the same fault the count gate was written for, one level up. Its
 * comment says three is "the smallest number that gives a reader a choice",
 * and a facet whose distinct contribution is a single exercise gives no choice
 * the sibling did not already give. So the same reasoning, measured against
 * what is actually distinct.
 *
 * A sibling only absorbs the intent if it is itself indexed on the count gate.
 * Otherwise the sole surviving facet of a sparse focus — beginner/courage,
 * whose two siblings hold one and two exercises — would be suppressed by pages
 * that are not in the index to answer for it.
 */
export const MIN_DISTINCT_EXERCISES = 2;

/**
 * Whether a facet earns a place in the index.
 *
 * Under-populated facets stay reachable — the picker links to them and they
 * answer the question honestly, just briefly — but they are marked noindex and
 * kept out of the sitemap, which is the standard treatment for thin faceted
 * pages and stops them competing with the level page above them.
 *
 * Near-duplicate facets get the same treatment for the same reason.
 */
export async function isIndexableCombination(level: string, focus: string): Promise<boolean> {
  const focusConfig = FOCUSES.find((f) => f.slug === focus);
  if (!focusConfig) return false;

  const exercises = await getPickerExercises(level, focusConfig.tag, focusConfig.extraTags);
  if (exercises.length < MIN_INDEXABLE_EXERCISES) return false;

  const siblingIds = new Set<string>();
  for (const other of LEVELS) {
    if (other.slug === level) continue;
    const sibling = await getPickerExercises(other.slug, focusConfig.tag, focusConfig.extraTags);
    if (sibling.length < MIN_INDEXABLE_EXERCISES) continue;
    for (const exercise of sibling) siblingIds.add(exercise.id);
  }

  const distinct = exercises.filter((exercise) => !siblingIds.has(exercise.id)).length;
  return distinct >= MIN_DISTINCT_EXERCISES;
}

/** The facets worth listing in a sitemap. */
export async function getIndexableCombinations(): Promise<{ level: string; focus: string }[]> {
  const combos = await getPopulatedCombinations();
  const kept: { level: string; focus: string }[] = [];
  for (const combo of combos) {
    if (await isIndexableCombination(combo.level, combo.focus)) kept.push(combo);
  }
  return kept;
}

/** Whether a given level/focus pair is published. */
export async function isPopulated(level: string, focus: string): Promise<boolean> {
  const combos = await getPopulatedCombinations();
  return combos.some((c) => c.level === level && c.focus === focus);
}
