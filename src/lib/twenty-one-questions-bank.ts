/**
 * The game behind /21-questions-game, as data.
 *
 * The page's argument is that the number is the entire mechanism: a fixed
 * count removes the polite exit that ordinary conversations take at the
 * fourth or fifth exchange, and it guarantees an ending, which is what lets
 * people go further than an open-ended conversation would. A reader arriving
 * from search with somebody opposite them does not want 181 questions under
 * nine headings — they want the next question, the count, and the two rules
 * everybody drops.
 *
 * So the tool asks one thing and then runs the game: who is opposite you,
 * which decides which of the article's eight sets are in play, and then
 * twenty-one questions dealt light to deep, with the count on every card and
 * the rules said out loud. Nothing here is invented. The eight sets are the
 * article's headings, the rooms are the four audiences it writes sets for plus
 * the general pool, the escalation is its rule "start light, finish deep" read
 * through each set's own introduction, the passes are its "one pass each", and
 * the ending is its "stop at twenty-one". The questions themselves live in
 * twenty-one-questions-bank-data.ts, generated from the article and held
 * against it by a test, so the tool can never ask a question the page does not
 * print.
 */

import { TWENTY_ONE_IN_ORDER, TWENTY_ONE_QUESTION_ROWS } from "./twenty-one-questions-bank-data";

/** One of the article's eight question sets. */
export type TwentyOneCategory =
  | "good"
  | "fun"
  | "deep"
  | "couples"
  | "met"
  | "like"
  | "family"
  | "thinks";

export interface TwentyOneQuestion {
  id: string;
  category: TwentyOneCategory;
  /** The question, as the article writes it. */
  text: string;
}

export const TWENTY_ONE_BANK: readonly TwentyOneQuestion[] = TWENTY_ONE_QUESTION_ROWS;

/** The article's own sequence, for the room that wants the game and not a pool. */
export const TWENTY_ONE_SEQUENCE: readonly string[] = TWENTY_ONE_IN_ORDER;

/** The article heading each category comes from; the test holds the pairing. */
export const CATEGORY_HEADINGS: Record<TwentyOneCategory, string> = {
  good: "Good Questions for 21 Questions",
  fun: "Fun Questions for 21 Questions",
  deep: "Deep Questions for 21 Questions",
  couples: "21 Questions for Couples",
  met: "21 Questions for Somebody You Have Just Met",
  like: "21 Questions for Somebody You Like",
  family: "21 Questions for Family",
  thinks: "Questions About How Somebody Thinks",
};

/**
 * Where in a round a set belongs. The article's rule is "start light, finish
 * deep", and its sets say where they sit: fun is "the right place to spend the
 * first third of the round", the just-met set is "lower stakes throughout",
 * the thinking set is "good for the middle of a round", and deep is "save
 * these for the back half". The rest are the general and audience pools and
 * carry the middle. `tierFor` turns a position into one of these; the game
 * prefers a set whose tier matches.
 */
export type Tier = "light" | "middle" | "deep";

export const CATEGORY_TIERS: Record<TwentyOneCategory, Tier> = {
  fun: "light",
  met: "light",
  good: "middle",
  like: "middle",
  family: "middle",
  couples: "middle",
  thinks: "middle",
  deep: "deep",
};

/** Twenty-one questions, and the number is the mechanism. */
export const TOTAL = 21;

/**
 * The first third is light and the back half is deep, in the article's words;
 * the boundaries below are those phrases read as positions. Twenty-one is its
 * own tier — see LAST_QUESTION — so the deep band runs to twenty.
 */
export function tierFor(position: number): Tier {
  if (position <= 7) return "light";
  if (position <= 14) return "middle";
  return "deep";
}

/**
 * Number 21 is deliberate, the article says: it hands the last turn to them,
 * and it is reliably the one that produces the answer people remember. Every
 * room ends on it, so it is a constant rather than a row in a set.
 */
export const LAST_QUESTION = TWENTY_ONE_SEQUENCE[TOTAL - 1];

/** Who is opposite you. The one question the tool asks before it deals. */
export type TwentyOneRoom = "sequence" | "met" | "like" | "couple" | "family" | "friend";

export interface RoomInfo {
  id: TwentyOneRoom;
  label: string;
  /** The sets this room draws from, in the article's terms. Empty for the sequence. */
  categories: readonly TwentyOneCategory[];
  /** What the room gets, in one line, for the card. */
  note: string;
}

/**
 * Room → the article's sets.
 *
 * `met` is the one that has to be right rather than merely reasonable: there
 * is no trust to draw on yet, so it draws from the just-met set, whose intro
 * says every question "can be answered in a sentence without cost", and from
 * the light and general pools — never from deep, couples or family. `couple`
 * and `family` are the two the article calls out as a different constraint
 * each, and they get the deep set because both already have the trust it
 * needs. The others overlap on purpose — `good` is the general pool and sits
 * in four rooms — because a room that runs dry before twenty-one is a game
 * that cannot be finished.
 */
export const TWENTY_ONE_ROOMS: readonly RoomInfo[] = [
  {
    id: "sequence",
    label: "Just run the 21",
    categories: [],
    note: "The article's own sequence, in its order. Each one slightly more exposing than the last.",
  },
  {
    id: "friend",
    label: "A friend",
    categories: ["fun", "good", "thinks", "deep"],
    note: "The general pool. Two people who have known each other for years, discovering something new.",
  },
  {
    id: "met",
    label: "Somebody you've just met",
    categories: ["met", "fun", "good"],
    note: "Lower stakes throughout. No trust to draw on yet, so nothing here costs anything to answer.",
  },
  {
    id: "like",
    label: "Somebody you like",
    categories: ["like", "fun", "good", "thinks"],
    note: "Warmer, still safe. Nothing requires anybody to declare anything before they are ready.",
  },
  {
    id: "couple",
    label: "A couple",
    categories: ["couples", "good", "thinks", "deep"],
    note: "For two people already in it, where the game works as a check rather than an introduction.",
  },
  {
    id: "family",
    label: "Family",
    categories: ["family", "good", "thinks", "deep"],
    note: "Decades of shared history, large parts of it never discussed because everybody assumes.",
  },
];

/**
 * The rules the article says everybody drops, for the card. The first two
 * are the ones it says matter most; the third is the FAQ's answer to "do you
 * have to answer every question"; the fourth is the one that turns twenty-one
 * into six if it is broken.
 */
export const RULES = {
  turns: "Take turns. One question, one answer, then swap — an exchange, not an interview.",
  both: "Both of you answer every question. Ask, they answer, then you answer your own.",
  pass: "One pass each. Not more: a pass with no limit means the difficult ones all get skipped.",
  followUps:
    "No follow-ups until the round is over. Note the ones to come back to; that is the actual conversation.",
} as const;

/** One pass each, and its use is itself informative. */
export const PASSES_EACH = 1;

/** The questions a room may be dealt, in bank order. Empty for the sequence room. */
export function poolForRoom(room: TwentyOneRoom): TwentyOneQuestion[] {
  const info = TWENTY_ONE_ROOMS.find((r) => r.id === room);
  if (!info) return [];
  const wanted = new Set<TwentyOneCategory>(info.categories);
  return TWENTY_ONE_BANK.filter((question) => wanted.has(question.category));
}

/** The room's card copy, by id, for a component that has only the id. */
export function roomInfo(room: TwentyOneRoom): RoomInfo | undefined {
  return TWENTY_ONE_ROOMS.find((r) => r.id === room);
}
