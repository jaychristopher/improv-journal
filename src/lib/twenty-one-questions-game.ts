/**
 * Dealing for the /21-questions-game hero.
 *
 * The would-you-rather hero has no scoring because its page makes no claim
 * about individual pairs. This page makes one claim about order and nothing
 * about individual questions: "start light, finish deep — the order matters
 * more than the content". So dealing is the count, the tier the count puts
 * you in, never the same question twice on this device, and the article's
 * fixed last question.
 *
 * Two rooms are different. The sequence room is the article's own twenty-one
 * in its own order — deterministic, no seen-set, because the sequence is the
 * product and a reader who picked it wants exactly that list. And every room
 * ends on number 21, "What have I not asked that I should have?", because the
 * article says that one is deliberate and hands the last turn to them.
 */

import {
  CATEGORY_TIERS,
  LAST_QUESTION,
  poolForRoom,
  type Tier,
  tierFor,
  TOTAL,
  TWENTY_ONE_SEQUENCE,
  type TwentyOneQuestion,
  type TwentyOneRoom,
} from "./twenty-one-questions-bank";

/** Its own key: sharing another tool's would hide each tool's rows. */
export const TOQ_SEEN_KEY = "twenty-one-questions:seen:v1";

export interface Deal {
  /** The question for this position, or null only if a room has no pool at all. */
  question: TwentyOneQuestion | null;
  /** How many of the room's questions remain unseen, after this one. */
  remaining: number;
  /** True when the pool ran out and the seen set was cleared to deal again. */
  wrapped: boolean;
}

/** The sequence room's rows are synthetic: one id per position, no category. */
function sequenceQuestion(position: number): TwentyOneQuestion {
  return {
    id: `sequence-${String(position).padStart(2, "0")}`,
    category: "good",
    text: TWENTY_ONE_SEQUENCE[position - 1],
  };
}

/** Number 21, in every room. */
function lastQuestion(): TwentyOneQuestion {
  return { id: "last-21", category: "deep", text: LAST_QUESTION };
}

/**
 * The question for a position in a room.
 *
 * `position` is 1 to 21. `seen` is every id this device has been shown, across
 * sessions, so a second game does not replay the first; when every question
 * in the room has been seen the caller is told to forget them. `excluding`
 * lets a pass deal a replacement without offering the passed question again
 * in the same round.
 *
 * Tier first: a question whose set belongs to this position's tier is
 * preferred, and if the room has none left at that tier the next-nearest tier
 * is used before anything from the whole pool — a "deep" position on a room
 * with no deep set (the just-met room) still gets the heaviest thing that room
 * allows, which is what the article's escalation means there.
 */
export function deal(
  room: TwentyOneRoom,
  seen: ReadonlySet<string>,
  position: number,
  excluding: ReadonlySet<string> = new Set(),
  random: () => number = Math.random,
): Deal {
  if (position >= TOTAL) return { question: lastQuestion(), remaining: 0, wrapped: false };
  if (room === "sequence") {
    return { question: sequenceQuestion(position), remaining: TOTAL - position, wrapped: false };
  }

  const pool = poolForRoom(room);
  if (pool.length === 0) return { question: null, remaining: 0, wrapped: false };

  let unseen = pool.filter((q) => !seen.has(q.id) && !excluding.has(q.id));
  let wrapped = false;
  if (unseen.length === 0) {
    unseen = pool.filter((q) => !excluding.has(q.id));
    if (unseen.length === 0) unseen = pool;
    wrapped = true;
  }

  const wanted = tierFor(position);
  const from = nearestTier(unseen, wanted);
  const question = from[Math.floor(random() * from.length) % from.length];
  return { question, remaining: Math.max(0, unseen.length - 1), wrapped };
}

/** The tiers to try for a position, nearest first. */
const TIER_ORDER: Record<Tier, readonly Tier[]> = {
  light: ["light", "middle", "deep"],
  middle: ["middle", "light", "deep"],
  deep: ["deep", "middle", "light"],
};

function nearestTier(unseen: readonly TwentyOneQuestion[], wanted: Tier): TwentyOneQuestion[] {
  for (const tier of TIER_ORDER[wanted]) {
    const at = unseen.filter((q) => CATEGORY_TIERS[q.category] === tier);
    if (at.length > 0) return at;
  }
  return [...unseen];
}
