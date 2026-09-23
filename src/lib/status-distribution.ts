/**
 * Where the seeds are on the ladder, and whether a page has anything to add.
 *
 * On 2026-09-22 the next-path card said "Most of its lessons are still seeds"
 * where the next path's seed share was over half, and the measure came back
 * 9 of 9: every next path on the ladder is over half seeds, so the condition
 * never failed and the note was a property of the ladder wearing a page's
 * clothes (tracker entry 323). A flag that is true on all N of N pages is a
 * site fact, and a site fact belongs once on the pages that describe the
 * site — the paths hub and the level hubs say it as one sentence with the
 * numbers, and the card keeps its note only where the next path departs from
 * that norm by more than a margin.
 *
 * The norm is the ladder beyond its first rung. Foundations, the beginner's
 * recommended path, is the one validated path and holds the 2 validated
 * lessons, and no next-path card points at it — a next path is by construction
 * a rung above the first — so the population a card's target is drawn from is
 * the ladder without it: 29 seeds in 37 lesson slots that night (0.78),
 * against 29 in 39 with Foundations counted (0.74). Measured against the whole
 * ladder, the 6 cards whose next path is seeds throughout (1.0) would clear a
 * 0.25 margin by 0.006 and the note would stay on 6 of 9; measured against
 * the rungs a card can reach, the widest departure is 0.22 and no card
 * carries it, which is what the hub sentence has just told the reader.
 */

import { loadPaths, loadThreads } from "./content";
import { getRecommendedPath } from "./path-recommendations";
import type { ContentStatus } from "./schema";

/**
 * How far a next path's seed share must sit from the ladder's before the
 * card says so — a lesson in 4. Under it the note is the hub sentence again;
 * over it the reader learns something about this path (2026-09-22).
 */
export const NEXT_PATH_SEED_MARGIN = 0.25;

export interface SeedSlots {
  /** Lesson slots; a lesson sequenced on 2 paths counts twice. */
  slots: number;
  /** Slots whose lesson is a `seed`. */
  seedSlots: number;
  /** seedSlots / slots, 0 when there are no slots. */
  share: number;
}

export interface LadderSeedShare {
  /** Every lesson slot on every path. 29 of 39 on 2026-09-22. */
  all: SeedSlots;
  /** The same without the first rung. 29 of 37 on 2026-09-22. */
  beyondFirstRung: SeedSlots;
  /** The first rung's id — the beginner's recommended path. */
  firstRung: string;
}

export function seedSlots(statuses: readonly (ContentStatus | undefined)[]): SeedSlots {
  const slots = statuses.length;
  const seeds = statuses.filter((s) => s === "seed").length;
  return { slots, seedSlots: seeds, share: slots === 0 ? 0 : seeds / slots };
}

/** The seed share of the ladder's lesson slots, with and without its first rung. */
export async function getLadderSeedShare(): Promise<LadderSeedShare> {
  const [paths, threads] = await Promise.all([loadPaths(), loadThreads()]);
  const statusOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.status]));
  const firstRung = getRecommendedPath("beginner").id;
  const all: (ContentStatus | undefined)[] = [];
  const beyond: (ContentStatus | undefined)[] = [];
  for (const p of paths) {
    const statuses = (p.frontmatter.threads ?? []).map((id) => statusOf.get(id));
    all.push(...statuses);
    if (p.frontmatter.id !== firstRung) beyond.push(...statuses);
  }
  return { all: seedSlots(all), beyondFirstRung: seedSlots(beyond), firstRung };
}

/**
 * Which way a next path departs from the ladder's norm, or null when it
 * sits within the margin and the card has nothing to add.
 */
export function compareSeedShare(
  next: SeedSlots,
  ladder: SeedSlots,
  margin = NEXT_PATH_SEED_MARGIN,
): "above" | "below" | null {
  if (next.slots === 0) return null;
  const diff = next.share - ladder.share;
  if (diff > margin) return "above";
  if (diff < -margin) return "below";
  return null;
}

export type StatusTally = Record<ContentStatus, number>;

/** How many of the given pages sit at each maturity state. */
export function tallyStatus(statuses: Iterable<ContentStatus>): StatusTally {
  const tally: StatusTally = { seed: 0, draft: 0, validated: 0 };
  for (const s of statuses) tally[s] += 1;
  return tally;
}
