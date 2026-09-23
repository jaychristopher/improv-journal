/**
 * Dealing for the /would-you-rather-questions hero.
 *
 * The prompt generator ranks its bank with a rubric because the article it
 * belongs to argues at length about what makes one prompt better than
 * another. This page makes no such claim about individual pairs — its test
 * ("does the room split?") is a property of the room, not of the row — so
 * there is no scoring here and none is invented. Dealing is: never the same
 * pair twice on this device, and the article's one ordering instruction.
 *
 * That instruction is the `fun` set's own introduction: "These are the ones
 * for the first ten minutes, before anybody is willing to defend a position —
 * the point is momentum rather than insight." So a room that draws from `fun`
 * opens with it. The article says "ten minutes" and not a number of pairs;
 * OPENING_PAIRS is that read as a count, kept in one place so it can be
 * argued with.
 */

import {
  poolForRoom,
  type WouldYouRatherPair,
  type WouldYouRatherRoom,
} from "./would-you-rather-bank";

/** Its own key: sharing the prompt generator's would hide each tool's rows. */
export const WYR_SEEN_KEY = "would-you-rather:seen:v1";

/** How many pairs come from the light set before the room is warm. */
export const OPENING_PAIRS = 3;

export interface Deal {
  pair: WouldYouRatherPair | null;
  /** How many of the room's pairs remain unseen, after this one. */
  remaining: number;
  /** True when the pool ran out and the seen set was cleared to deal again. */
  wrapped: boolean;
}

/**
 * The next pair for a room.
 *
 * `dealt` is how many have been dealt this session, which decides whether the
 * opener rule still applies; `seen` is every id this device has been shown,
 * across sessions, so a second party does not replay the first. When every
 * pair in the room has been seen the caller is told to forget them — better a
 * repeat than an empty card.
 */
export function deal(
  room: WouldYouRatherRoom,
  seen: ReadonlySet<string>,
  dealt: number,
  random: () => number = Math.random,
): Deal {
  const pool = poolForRoom(room);
  if (pool.length === 0) return { pair: null, remaining: 0, wrapped: false };

  let unseen = pool.filter((pair) => !seen.has(pair.id));
  let wrapped = false;
  if (unseen.length === 0) {
    unseen = pool;
    wrapped = true;
  }

  // The article's warm-up: light pairs first, where the room has them.
  const opening = dealt < OPENING_PAIRS ? unseen.filter((p) => p.category === "fun") : [];
  const from = opening.length > 0 ? opening : unseen;

  const pair = from[Math.floor(random() * from.length) % from.length];
  return { pair, remaining: Math.max(0, unseen.length - 1), wrapped };
}
