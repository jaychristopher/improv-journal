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

import {
  exerciseFocuses,
  FOCUSES,
  LEVELS,
  matchesLevel,
} from "@/app/tools/exercise-picker/picker-config";

import { getAtomUrl, loadAtoms } from "./content";
import { leadParagraph, stripLeadLabel } from "./seo";

export { matchesLevel };

/** Whether an exercise's focuses (see `exerciseFocuses`) satisfy a focus filter. */
export function matchesFocus(focuses: string[], focusTag: string, extraTags: string[]): boolean {
  return focuses.includes(focusTag) || extraTags.some((extra) => focuses.includes(extra));
}

export interface PickerExercise {
  id: string;
  title: string;
  tags: string[];
  /** Everything the exercise is offered under — see `exerciseFocuses`. */
  focuses: string[];
  href: string;
  description: string;
}

/**
 * Every exercise atom, shaped for the picker, with its focuses resolved.
 *
 * The focuses come from `exerciseFocuses`, which every picker surface now
 * reads; the client component used to carry its own copy of the hand map.
 */
export async function loadPickerExercises(): Promise<PickerExercise[]> {
  const atoms = await loadAtoms();

  return atoms
    .filter((a) => a.frontmatter.type === "exercise")
    .map((a) => ({
      id: a.frontmatter.id,
      title: a.frontmatter.title,
      tags: a.frontmatter.tags ?? [],
      focuses: exerciseFocuses(a.frontmatter.id, a.frontmatter.tags ?? [], a.frontmatter.links),
      href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      description: leadParagraph(stripLeadLabel(a.content), 200),
    }));
}

export async function getPickerExercises(
  level: string,
  focusTag: string,
  extraTags: string[],
): Promise<PickerExercise[]> {
  const exercises = await loadPickerExercises();

  return exercises.filter(
    (e) => matchesLevel(e.tags, level) && matchesFocus(e.focuses, focusTag, extraTags),
  );
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
 * How much a facet has to offer that the facets beneath it do not.
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
 * The comparison runs one way, from the lowest level up. The first version
 * compared a facet with every populated sibling, and two identical facets
 * each hid the other: beginner/ensemble and intermediate/ensemble were the
 * two fullest pages on the site and neither was indexed, so a search for
 * ensemble exercises could land on no picker page at all (tracker entry 241,
 * 2026-09-21). A facet now has to be distinct only from the indexable facets
 * at the levels below it, so of two near-duplicates the lower one is kept —
 * beginners are the audience the site routes — and the upper one is the
 * noindex copy. A well-populated focus is indexed at exactly one level unless
 * a higher level genuinely adds to it, as intermediate/courage does.
 *
 * A lower sibling only absorbs the intent if it is itself indexed. Otherwise
 * intermediate/recovery, whose beginner sibling holds one exercise, would be
 * suppressed by a page that is not in the index to answer for it.
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
 * Near-duplicate facets get the same treatment for the same reason, and the
 * level order decides which copy survives: see MIN_DISTINCT_EXERCISES.
 */
export async function isIndexableCombination(level: string, focus: string): Promise<boolean> {
  const focusConfig = FOCUSES.find((f) => f.slug === focus);
  if (!focusConfig) return false;

  const levelIndex = LEVELS.findIndex((l) => l.slug === level);
  if (levelIndex === -1) return false;

  const exercises = await getPickerExercises(level, focusConfig.tag, focusConfig.extraTags);
  if (exercises.length < MIN_INDEXABLE_EXERCISES) return false;

  const lowerIds = new Set<string>();
  for (const lower of LEVELS.slice(0, levelIndex)) {
    if (!(await isIndexableCombination(lower.slug, focus))) continue;
    const sibling = await getPickerExercises(lower.slug, focusConfig.tag, focusConfig.extraTags);
    for (const exercise of sibling) lowerIds.add(exercise.id);
  }

  const distinct = exercises.filter((exercise) => !lowerIds.has(exercise.id)).length;
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
