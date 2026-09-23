/**
 * The game-choosing mechanics of /improv-games, as data.
 *
 * The page argues two things about choosing, and the hero runs both. The
 * first is what a game is for: "These get lumped together as 'improv games'
 * and they do three different jobs. Reaching for the wrong kind is the most
 * common way a session goes flat." The second is how to choose inside the
 * middle job: "The usual way to pick a game is to find one that sounds fun.
 * The better way is to name what is going wrong and pick the game that
 * isolates it."
 *
 * So the tool asks what it is for, and — where the answer is "fix something"
 * — what is going wrong, and then hands over one game with its rules. A
 * reader standing in front of a room does not want 41 cards and two filters.
 *
 * Nothing here is invented. The three jobs and their descriptions are the
 * page's own section; the six symptoms and the games under each are its "How
 * to Choose One" list, and game-picker.test.ts reads that list out of the
 * route file and fails if the two drift.
 */

import type { ImprovGame } from "./games";

/** What a game is being reached for. The page's three jobs. */
export type GameJob = "warm-up" | "fix" | "perform";

export interface JobInfo {
  id: GameJob;
  label: string;
  /** The page's own description of the job, shortened to a card. */
  note: string;
}

export const GAME_JOBS: readonly JobInfo[] = [
  {
    id: "warm-up",
    label: "Warm the room up",
    note: "Cheap, fast, no wrong answers. Two minutes, no notes.",
  },
  {
    id: "fix",
    label: "Fix something",
    note: "An exercise isolates one skill and has a failure you can coach.",
  },
  {
    id: "perform",
    label: "Something to play",
    note: "Rules an audience can follow, and a comic engine of its own.",
  },
];

/** A thing going wrong, and the games the page names for it. */
export interface Symptom {
  id: string;
  /** The page's wording, without its full stop. */
  label: string;
  /** The game ids the page lists under it, in its order. */
  games: readonly string[];
}

/**
 * The page's "How to Choose One" list, in its order.
 *
 * Held against the route file by the test rather than trusted: the page is
 * where the author writes, and a symptom that gains a game there has to reach
 * the tool or the tool is offering a worse answer than the prose beneath it.
 */
export const SYMPTOMS: readonly Symptom[] = [
  { id: "not-listening", label: "Nobody is listening", games: ["mirroring", "pass-the-clap"] },
  { id: "planning", label: "Everyone is planning", games: ["zip-zap-zop", "big-booty"] },
  {
    id: "clever-but-cold",
    label: "Scenes are clever but cold",
    games: ["emotional-honesty-scene", "gift-giving"],
  },
  { id: "wont-start", label: "Nobody will start", games: ["first-line-drill", "blind-offer"] },
  {
    id: "falls-apart",
    label: "Scenes come apart halfway through",
    games: ["fracture-repair-drill"],
  },
  { id: "all-at-once", label: "Everyone talks at once", games: ["group-mind-cultivation"] },
];

/** The tag the hub's own filter uses for the first job. */
export const WARM_UP_TAG = "warm-up";

/** The games for a job: the hub's own inventory, filtered the hub's way. */
export function poolForJob(job: GameJob, games: readonly ImprovGame[]): ImprovGame[] {
  if (job === "warm-up") return games.filter((g) => g.tags.includes(WARM_UP_TAG));
  if (job === "perform") return games.filter((g) => g.kind === "format");
  return games.filter((g) => g.kind === "exercise");
}

/**
 * The games for a symptom: the ones the page names first, then the rest of
 * the hub that shares their focus.
 *
 * The widening is computed from the page's own picks rather than from a
 * second hand-written list — `focuses` is the picker's derivation, so "more
 * like the two it named" is a question the data can answer. Without it a
 * symptom with one game would hand over that game and then have nothing,
 * which for `fracture-repair-drill` is exactly the case.
 */
export function poolForSymptom(symptom: Symptom, games: readonly ImprovGame[]): ImprovGame[] {
  const named = symptom.games
    .map((id) => games.find((g) => g.id === id))
    .filter((g): g is ImprovGame => g !== undefined);
  const focuses = new Set(named.flatMap((g) => g.focuses));
  const namedIds = new Set(named.map((g) => g.id));
  const nearby = games.filter(
    (g) => !namedIds.has(g.id) && g.kind === "exercise" && g.focuses.some((f) => focuses.has(f)),
  );
  return [...named, ...nearby];
}

/** A game, cut down to what a dealt card shows. */
export interface PickableGame {
  id: string;
  title: string;
  href: string;
  howToPlay: string;
  kind: ImprovGame["kind"];
}

/**
 * Everything the hero can deal, computed on the server.
 *
 * The pools are id lists against one record of games rather than lists of
 * games: a symptom pool is mostly the exercises another pool already holds,
 * and sending each game once instead of once per pool it belongs to is the
 * difference between a few kilobytes of payload and about thirty.
 */
export interface GamePools {
  games: Record<string, PickableGame>;
  jobs: Record<GameJob, string[]>;
  symptoms: Record<string, string[]>;
}

/** A dealt card is a name, rules and a link; a game without rules is not one. */
function pickable(game: ImprovGame): PickableGame | undefined {
  if (!game.howToPlay) return undefined;
  return {
    id: game.id,
    title: game.title,
    href: game.href,
    howToPlay: game.howToPlay,
    kind: game.kind,
  };
}

/** The hub's inventory, arranged the way the hero asks for it. */
export function buildGamePools(games: readonly ImprovGame[]): GamePools {
  const record: Record<string, PickableGame> = {};
  const ids = (pool: readonly ImprovGame[]) =>
    pool
      .map((game) => {
        const card = pickable(game);
        if (card) record[card.id] = card;
        return card?.id;
      })
      .filter((id): id is string => id !== undefined);

  const jobs = Object.fromEntries(
    GAME_JOBS.map((job) => [job.id, ids(poolForJob(job.id, games))]),
  ) as Record<GameJob, string[]>;
  const symptoms = Object.fromEntries(
    SYMPTOMS.map((symptom) => [symptom.id, ids(poolForSymptom(symptom, games))]),
  );
  return { games: record, jobs, symptoms };
}
