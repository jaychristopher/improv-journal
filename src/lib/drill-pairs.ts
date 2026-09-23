import { getAtomUrl } from "@/lib/content";
import type { AtomFrontmatter, Link } from "@/lib/schema";
import { buildTrainsIndex } from "@/lib/trains";

/**
 * "Drills that pair with this": the one derived block a concept page has and
 * an exercise page lacked.
 *
 * The exercises are the periphery of the atom graph. Five of the 27 sit in
 * the 13-core against 97 atoms overall, and their median core number is 10,
 * because a drill declares `illustrates` and `requires` toward the concepts
 * it trains and almost nothing toward another drill — fourteen exercise →
 * exercise edges in 2,435 (tracker entry 268, 2026-09-22). Every concept
 * page lists the drills that train it, so the reader reaches the practice
 * layer from anywhere; once there, the sidebar offers concepts and the only
 * way to the next drill is back out through one of them.
 *
 * Two drills pair when they train the same concept: they share a `requires`
 * or `illustrates` target, both name it in their `**Trains:**` line
 * (trains.ts), or one concept's own edges name them both. The block names
 * the concept, so the link says why it is there ("shares Active Listening")
 * rather than asserting a similarity the frontmatter does not. Computed at
 * render, never authored, and no frontmatter edge changes: the graph's core
 * numbers are what they were, and `graph-robustness.test.ts` records them
 * as floors on the graph rather than on this page.
 *
 * A concept both drills *say* they train outranks one they merely both link.
 * The `illustrates` edges the ranking first read as "trains" are confirmed
 * by the drills' own Trains lines 17 times in 86 (entry 274), so a pair
 * through a shared trains target is the drills agreeing about their point,
 * and a pair through a shared edge is the graph's looser claim. Pairs with a
 * trains share rank first, then by everything shared; the note reads
 * "trains X with you" for the former and "shares X" for the latter.
 */

/** The relations that say a drill trains a concept. */
export const PAIRING_RELATIONS: readonly Link["relation"][] = ["requires", "illustrates"];

/** Pairs shown. Below SIDEBAR_VISIBLE, so the group never folds. */
export const DRILL_PAIRS_CAP = 4;

/** The group's heading. Not a relation label: nothing in frontmatter says "pairs". */
export const DRILL_PAIRS_LABEL = "Drills that pair with this";

export interface SharedConcept {
  id: string;
  title: string;
  /** True when both drills' Trains lines name the concept. */
  trains: boolean;
}

export interface DrillPair {
  id: string;
  title: string;
  url: string;
  /**
   * The concepts both drills train: trains shares first, then the rest in
   * the order this drill's frontmatter names them.
   */
  shared: SharedConcept[];
}

export interface DrillPairs {
  pairs: DrillPair[];
  /** How many pairing drills the cap cut, for the "and N more" note. */
  omitted: number;
}

type Atom = { frontmatter: AtomFrontmatter; content?: string };

/** The concept ids a drill's pairing edges point at, in frontmatter order. */
function trainedConcepts(fm: AtomFrontmatter, byId: Map<string, AtomFrontmatter>): string[] {
  const out: string[] = [];
  for (const link of fm.links ?? []) {
    if (!PAIRING_RELATIONS.includes(link.relation)) continue;
    const target = byId.get(link.id);
    if (!target || target.type === "exercise" || out.includes(link.id)) continue;
    out.push(link.id);
  }
  return out;
}

/** How many of a pair's shared concepts both drills name in their Trains lines. */
function trainsShared(pair: DrillPair): number {
  return pair.shared.filter((c) => c.trains).length;
}

/**
 * The drills that pair with an exercise, ranked by how many concepts both
 * say they train, then by how many they share at all, then title, and cut
 * at DRILL_PAIRS_CAP. Empty for anything that is not an exercise.
 */
export function drillPairsFor(exerciseId: string, atoms: readonly Atom[]): DrillPairs {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const self = byId.get(exerciseId);
  if (!self || self.type !== "exercise") return { pairs: [], omitted: 0 };
  const { trains } = buildTrainsIndex(atoms);

  // Concepts whose own edges name a drill, so two drills one concept points
  // at pair through it even when neither declares the concept back.
  const namedBy = new Map<string, Set<string>>();
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    if (fm.type === "exercise") continue;
    for (const link of fm.links ?? []) {
      if (byId.get(link.id)?.type !== "exercise") continue;
      let set = namedBy.get(link.id);
      if (!set) namedBy.set(link.id, (set = new Set()));
      set.add(fm.id);
    }
  }

  const ownTrains = trains.get(exerciseId) ?? [];
  const own = trainedConcepts(self, byId);
  const ownNamedBy = namedBy.get(exerciseId) ?? new Set<string>();

  const candidates: DrillPair[] = [];
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    if (fm.type !== "exercise" || fm.id === exerciseId) continue;
    const theirTrains = new Set(trains.get(fm.id) ?? []);
    const theirs = new Set(trainedConcepts(fm, byId));
    // Trains shares first: a concept both drills name is the strongest
    // ground for the pair, and the note under the link names the first.
    const sharedIds = ownTrains.filter((id) => theirTrains.has(id));
    for (const id of own) {
      if (theirs.has(id) && !sharedIds.includes(id)) sharedIds.push(id);
    }
    for (const concept of namedBy.get(fm.id) ?? []) {
      if (ownNamedBy.has(concept) && !sharedIds.includes(concept)) {
        sharedIds.push(concept);
      }
    }
    if (sharedIds.length === 0) continue;
    candidates.push({
      id: fm.id,
      title: fm.title,
      url: getAtomUrl({ id: fm.id, type: fm.type }),
      shared: sharedIds.map((id) => ({
        id,
        title: byId.get(id)!.title,
        trains: ownTrains.includes(id) && theirTrains.has(id),
      })),
    });
  }

  candidates.sort(
    (a, b) =>
      trainsShared(b) - trainsShared(a) ||
      b.shared.length - a.shared.length ||
      a.title.localeCompare(b.title),
  );
  return {
    pairs: candidates.slice(0, DRILL_PAIRS_CAP),
    omitted: Math.max(0, candidates.length - DRILL_PAIRS_CAP),
  };
}

/**
 * The note under a pair: the first shared concept, and how many more. A
 * trains share — both drills say they train it — reads "trains X with you";
 * a shared edge reads "shares X".
 */
export function sharedNote(pair: DrillPair): string {
  const [first, ...rest] = pair.shared;
  if (!first) return "";
  const lead = first.trains ? `trains ${first.title} with you` : `shares ${first.title}`;
  return rest.length === 0 ? lead : `${lead} and ${rest.length} more`;
}
