/**
 * The picker's second facet family: the drills, by the principle they say
 * they train.
 *
 * The picker files its 27 drills under 6 focus tags the author wrote —
 * Presence & Listening, Ensemble & Group Mind, Courage & Commitment,
 * Physicality & Space, Recovery & Adaptation, Emotion & Honesty — and the
 * drills say in their own `**Trains:**` line which concept they are for. The
 * two taxonomies do not map: "Courage & Commitment" holds drills that train
 * Be Supportive, Be Thankful, Be Present and Be Brave, "Physicality & Space"
 * trains no principle at all, and 4 of the 9 principles have no focus of
 * their own, so a reader who came off the principles hub with "work on Be
 * Thankful first" could not ask the tool built to answer "which drill" for
 * it (tracker entry 335, 2026-09-22).
 *
 * The focus tags stay: they are the author's grouping, and they answer a
 * question the Trains line does not ("what should this session be about").
 * This module adds the derived family beside them, from the one index that
 * reads the line (trains.ts, entry 274) — the same signal the counter line
 * (entry 322) and the lesson rows (297) already route on, so the picker
 * stops being the one drill router that ignores it.
 *
 * Every string a facet page shows is built here rather than in the route
 * file, because prose in `src/app` counts against the ceiling in
 * hub-prose-links.test.ts (entry 278).
 */

import { getAtomUrl, loadAtoms } from "./content";
import {
  loadPickerExercises,
  MIN_INDEXABLE_EXERCISES,
  type PickerExercise,
} from "./exercise-picker";
import type { AtomFrontmatter } from "./schema";
import { englishList } from "./tradition-curriculum";
import { buildTrainsIndex, type TrainsIndex } from "./trains";

type Atom = { frontmatter: AtomFrontmatter; content?: string };

export interface PrincipleFacet {
  /** The principle's atom id, and the facet's url segment. */
  id: string;
  title: string;
  /** The principle's own page. */
  principleHref: string;
  /** This facet's page in the picker. */
  href: string;
  /** The drills whose Trains line names the principle, by title. */
  drills: PickerExercise[];
}

/** The facet path for a principle. One place, so the page, the sidebar link and the tests agree. */
export function principleFacetPath(id: string): string {
  return `/tools/exercise-picker/principle/${id}`;
}

/**
 * Every principle with at least one drill behind it, most drills first.
 *
 * Pure, so a test can hand it a fixture. A principle no Trains line names —
 * Be Simple and Framing on 2026-09-22 — gets no entry at all rather than an
 * empty page: the facet would promise drills in its title and list none,
 * which is the soft-404 shape the level/focus router was fixed for.
 */
export function buildPrincipleFacets(
  atoms: readonly Atom[],
  exercises: readonly PickerExercise[],
  index: TrainsIndex = buildTrainsIndex(atoms),
): PrincipleFacet[] {
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const facets: PrincipleFacet[] = [];

  for (const atom of atoms) {
    const fm = atom.frontmatter;
    if (fm.type !== "principle") continue;
    const drills = (index.trainedBy.get(fm.id) ?? [])
      .map((id) => exerciseById.get(id))
      .filter((e): e is PickerExercise => e !== undefined)
      .sort((a, b) => a.title.localeCompare(b.title));
    if (drills.length === 0) continue;
    facets.push({
      id: fm.id,
      title: fm.title,
      principleHref: getAtomUrl(fm),
      href: principleFacetPath(fm.id),
      drills,
    });
  }

  return facets.sort((a, b) => b.drills.length - a.drills.length || a.title.localeCompare(b.title));
}

/** Every populated principle facet, from the live content. */
export async function principleFacets(): Promise<PrincipleFacet[]> {
  const [atoms, exercises] = await Promise.all([loadAtoms(), loadPickerExercises()]);
  return buildPrincipleFacets(atoms, exercises);
}

/** One principle's facet, or undefined where no drill's Trains line names it. */
export async function principleFacet(id: string): Promise<PrincipleFacet | undefined> {
  return (await principleFacets()).find((f) => f.id === id);
}

/**
 * Whether a principle facet earns a place in the index.
 *
 * The same gate the level/focus facets pass, for the same reason: a page
 * whose title offers a category of drills and whose body lists one or two is
 * a real answer and not a ranking candidate (MIN_INDEXABLE_EXERCISES, and the
 * account above it). On 2026-09-22 no principle clears it — Be Present holds
 * 2 drills and the other 6 hold 1 — so every facet ships noindex, follow and
 * none is in the sitemap. The rule is written as a rule rather than as "none
 * of them" because the drills the author has yet to give a Trains line (see
 * docs/seeds.md) will move principles across it.
 */
export function isIndexablePrincipleFacet(facet: PrincipleFacet): boolean {
  return facet.drills.length >= MIN_INDEXABLE_EXERCISES;
}

/** The principle facets worth listing in a sitemap. Empty on 2026-09-22. */
export async function indexablePrincipleFacets(): Promise<PrincipleFacet[]> {
  return (await principleFacets()).filter(isIndexablePrincipleFacet);
}

/**
 * The principles a set of drills train, by title.
 *
 * What a focus page says about itself: the drills it lists, put through the
 * same index the facets are built from, so the two can never disagree about
 * which principle a drill trains.
 */
export function principlesTrainedBy(
  drillIds: readonly string[],
  atoms: readonly Atom[],
  index: TrainsIndex = buildTrainsIndex(atoms),
): { id: string; title: string }[] {
  const principles = new Map(
    atoms
      .filter((a) => a.frontmatter.type === "principle")
      .map((a) => [a.frontmatter.id, a.frontmatter.title]),
  );
  const named = new Set<string>();
  for (const drill of drillIds) {
    for (const concept of index.trains.get(drill) ?? []) {
      if (principles.has(concept)) named.add(concept);
    }
  }
  return [...named]
    .map((id) => ({ id, title: principles.get(id)! }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * "These 12 drills train Be Brave, Be Present, Be Supportive and Be
 * Thankful." — a focus page in the vocabulary the rest of the site uses.
 *
 * Null where the focus's drills name no principle — 7 of the 15 populated
 * facets on 2026-09-22: all 3 Physicality & Space facets, which train no
 * principle at all, beginner/recovery, and the 4 advanced facets, which hold
 * none of the drills that name one (the `fundamentals` rule keeps the
 * warm-ups off advanced). The sentence would otherwise be a heading with
 * nothing after it, and a facet that trains no principle is a fact about the
 * content for the author's seeds list, not a blank on the page.
 */
export function focusPrinciplesLine(
  drillCount: number,
  principleTitles: readonly string[],
): string | null {
  if (principleTitles.length === 0) return null;
  return `These ${drillCount} drills train ${englishList(principleTitles)}.`;
}

/** The focus page's sentence, from the live content. Null when no drill names a principle. */
export async function focusPrinciplesNote(
  drills: readonly PickerExercise[],
): Promise<string | null> {
  const atoms = await loadAtoms();
  const principles = principlesTrainedBy(
    drills.map((d) => d.id),
    atoms,
  );
  return focusPrinciplesLine(
    drills.length,
    principles.map((p) => p.title),
  );
}

/** The facet page's heading: "Improv Drills That Train Be Present". */
export function principleFacetTitle(title: string): string {
  return `Improv Drills That Train ${title}`;
}

/**
 * The facet page's claim about itself, and the reason it exists: the drill is
 * here because it says so, not because a tag put it here.
 */
export function principleFacetCountLine(count: number): string {
  return `${count} drill${count === 1 ? "" : "s"} whose Trains line names this principle`;
}

/** The facet page's meta description and lead. */
export function principleFacetDescription(title: string, count: number): string {
  return `The ${count} improv drill${count === 1 ? "" : "s"} whose own "Trains" line names ${title}. Each one was written to practise the principle, not merely to touch it.`;
}

/** The line that sends a reader from a facet back to the principle it is named for. */
export function principleFacetBackLabel(title: string): string {
  return `What ${title} is`;
}

/** The sidebar link on a principle's page: "all drills for Be Present →". */
export function principleDrillsFacetLabel(title: string): string {
  return `all drills for ${title} →`;
}
