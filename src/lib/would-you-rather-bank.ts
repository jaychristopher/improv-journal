/**
 * The game behind /would-you-rather-questions, as data.
 *
 * The page's argument is that the list is not the product: a pair is only
 * worth asking if the room genuinely divides, the answer is worthless and the
 * defence is the whole game, and one rule ("you have to pick") keeps it alive.
 * A reader who arrives mid-party does not want 164 questions and eight
 * headings to choose between — they want the next pair, and the rule said out
 * loud. This module is the page's own mechanics in a form the hero can run:
 * who is in the room decides which of the article's eight sets are in play,
 * how many people decides which variant to run, and the bank deals.
 *
 * Nothing here is invented. The eight categories are the article's headings,
 * the four variants and their group sizes are its "How to Play" section, and
 * the session length is its "ten to fifteen pairs" note. The pairs themselves
 * live in would-you-rather-bank-data.ts, generated from the article and held
 * against it by a test, so the tool can never offer a pair the page does not
 * list.
 */

import { WOULD_YOU_RATHER_ROWS } from "./would-you-rather-bank-data";

/** One of the article's eight question sets. */
export type WouldYouRatherCategory =
  | "good"
  | "adults"
  | "hard"
  | "deep"
  | "fun"
  | "couples"
  | "crazy"
  | "kids";

export interface WouldYouRatherPair {
  id: string;
  category: WouldYouRatherCategory;
  /** The first option, as the article writes it. */
  left: string;
  /** The second option, lower-cased mid-sentence the way the article has it. */
  right: string;
}

export const WOULD_YOU_RATHER_BANK: readonly WouldYouRatherPair[] = WOULD_YOU_RATHER_ROWS;

/** The article heading each category comes from; the test holds the pairing. */
export const CATEGORY_HEADINGS: Record<WouldYouRatherCategory, string> = {
  good: "Good Would You Rather Questions",
  adults: "Would You Rather Questions for Adults",
  hard: "Hard Would You Rather Questions",
  deep: "Deep Would You Rather Questions",
  fun: "Fun Would You Rather Questions",
  couples: "Would You Rather Questions for Couples",
  crazy: "Crazy, Weird and Extreme Would You Rather Questions",
  kids: "Would You Rather Questions for Kids",
};

/** Who is playing. The first and only question the tool asks before it deals. */
export type WouldYouRatherRoom = "kids" | "friends" | "couple" | "adults";

export interface RoomInfo {
  id: WouldYouRatherRoom;
  label: string;
  /** The sets this room draws from, in the article's terms. */
  categories: readonly WouldYouRatherCategory[];
  /** What the room gets, in one line, for the card. */
  note: string;
}

/**
 * Room → the article's sets.
 *
 * `kids` is the one that has to be right rather than merely reasonable: it
 * draws only from the three sets whose own intros describe small concrete
 * stakes, light momentum and absurd-but-reasonable premises, and never from
 * adults, hard, deep or couples. The others overlap on purpose — `good` is
 * the general set and sits in three rooms — because a room that runs dry
 * after ten pairs is worse than a room that shares a set.
 */
export const WOULD_YOU_RATHER_ROOMS: readonly RoomInfo[] = [
  {
    id: "friends",
    label: "Friends",
    categories: ["good", "fun", "crazy", "hard"],
    note: "Even splits and absurd ones, in the mix the page opens with.",
  },
  {
    id: "adults",
    label: "Adults",
    categories: ["adults", "hard", "deep", "good"],
    note: "Work, money and time — the trade-offs that cost something.",
  },
  {
    id: "couple",
    label: "A couple",
    categories: ["couples", "deep", "hard", "good"],
    note: "Two-player is the deep version: there is nowhere to hide.",
  },
  {
    id: "kids",
    label: "Kids",
    categories: ["kids", "fun", "crazy"],
    note: "Small, concrete stakes. Children hedge less than adults do.",
  },
];

/** How the room answers. The article's four variants, with its own sizes. */
export type WouldYouRatherVariant = "two-player" | "round" | "vote" | "split";

export interface VariantInfo {
  id: WouldYouRatherVariant;
  label: string;
  /** The smallest group this variant is for; the bands run upward from here. */
  from: number;
  /** How to run it, from the article's "How to Play". */
  how: string;
  /** Why the article prefers it at this size. */
  why: string;
}

/**
 * The article names sizes for three of the four: two-player, the round at
 * "six to ten", split-the-room at "twenty or more", and simultaneous vote for
 * "a large group" without a number. The bands below are those names made
 * contiguous — 3 to 5 runs as a round, 11 to 19 as a vote — so every group
 * size has an answer. `variantFor` is the only place that decides.
 */
export const WOULD_YOU_RATHER_VARIANTS: readonly VariantInfo[] = [
  {
    id: "two-player",
    label: "Two-player",
    from: 2,
    how: "Alternate asking. Both of you answer every pair.",
    why: "Slower and deeper: in a group of two there is nowhere to hide.",
  },
  {
    id: "round",
    label: "The round",
    from: 3,
    how: "Go clockwise. Everybody answers every pair.",
    why: "Best for a group that mostly knows each other.",
  },
  {
    id: "vote",
    label: "Simultaneous vote",
    from: 11,
    how: "Call the pair, count to three, everybody points left or right.",
    why: "Stops later answers drifting toward the first one.",
  },
  {
    id: "split",
    label: "Split the room",
    from: 20,
    how: "Each side of the room is an option. Move to the one you pick.",
    why: "The room can see the split, and seeing it starts the argument.",
  },
];

/** The variant the article prescribes for a group of this size. */
export function variantFor(people: number): VariantInfo {
  let chosen = WOULD_YOU_RATHER_VARIANTS[0];
  for (const variant of WOULD_YOU_RATHER_VARIANTS) {
    if (people >= variant.from) chosen = variant;
  }
  return chosen;
}

/** The group sizes the tool offers, one per band `variantFor` can return. */
export const GROUP_SIZES: readonly { people: number; label: string }[] = [
  { people: 2, label: "Just us two" },
  { people: 6, label: "3 to 10" },
  { people: 14, label: "11 to 20" },
  { people: 24, label: "20 or more" },
];

/**
 * A session is ten to fifteen pairs, and the article's reason for the ceiling
 * is that the second half of a long list is always weaker. The tool nudges at
 * the floor rather than stopping at the ceiling — "stop while people still
 * want another one" is advice, not a rule, and a room having a good time
 * should not be cut off by a counter.
 */
export const SESSION_NUDGE_AT = 10;
export const SESSION_LONG_AT = 15;

/** The pairs a room may be dealt, in bank order. */
export function poolForRoom(room: WouldYouRatherRoom): WouldYouRatherPair[] {
  const info = WOULD_YOU_RATHER_ROOMS.find((r) => r.id === room);
  if (!info) return [];
  const wanted = new Set<WouldYouRatherCategory>(info.categories);
  return WOULD_YOU_RATHER_BANK.filter((pair) => wanted.has(pair.category));
}

/** The room's card copy, by id, for a component that has only the id. */
export function roomInfo(room: WouldYouRatherRoom): RoomInfo | undefined {
  return WOULD_YOU_RATHER_ROOMS.find((r) => r.id === room);
}
