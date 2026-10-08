/**
 * Choosing the next prompt.
 *
 * Best first, but not in a fixed order. A pool is sorted by its rubric score
 * for the reader's use case and cut into three bands. The generator draws at
 * random inside the top band until the browser has seen all of it, then moves
 * to the next. So the first few prompts a reader meets are the strongest ones
 * the bank has for their room, two readers do not get the same first prompt,
 * and a reader who keeps going never sees a repeat until the pool is dry.
 *
 * The classic — who, where, what — is three of these draws at once, one from
 * each of the relationship, location and task pools with the lines that do
 * not combine left out, and a single line can be redrawn on its own. Nothing
 * else about the rule changes: each line is best-band-first, and each line's
 * seen set is the same one the single draw uses.
 *
 * Seen ids live in localStorage and nowhere else. Nothing about a reader's
 * draws leaves the browser except the analytics events the component sends.
 */

import {
  CLASSIC_PARTS,
  classicLine,
  type ClassicPart,
  type Prompt,
  type PromptUseCase,
  RUBRIC_AXES,
  RUBRIC_WEIGHTS,
  suitsUseCase,
} from "./prompt-bank";

export const SEEN_STORAGE_KEY = "improv-prompts:seen:v1";

/** How many bands a pool is cut into. Three is enough to feel curated. */
const BAND_COUNT = 3;

export function scoreFor(prompt: Prompt, useCase: PromptUseCase): number {
  const weights = RUBRIC_WEIGHTS[useCase];
  return RUBRIC_AXES.reduce((sum, axis) => sum + prompt.scores[axis.id] * weights[axis.id], 0);
}

export function poolFor(
  bank: Prompt[],
  category: Prompt["category"],
  useCase: PromptUseCase,
  /** Only the prompts that read as one line of a classic draw. */
  options: { combinable?: boolean } = {},
): Prompt[] {
  return bank.filter(
    (p) =>
      p.category === category && suitsUseCase(p, useCase) && (!options.combinable || p.combinable),
  );
}

/**
 * Sorted best-first and split into bands by rank, so every band has members
 * however the scores cluster. A fixed threshold would leave a category with
 * an empty top band and a reader with a worse first prompt than the bank
 * could give them.
 */
export function bandPool(pool: Prompt[], useCase: PromptUseCase): Prompt[][] {
  const sorted = [...pool].sort(
    (a, b) => scoreFor(b, useCase) - scoreFor(a, useCase) || a.id.localeCompare(b.id),
  );
  const size = Math.ceil(sorted.length / BAND_COUNT);
  const bands: Prompt[][] = [];
  for (let i = 0; i < BAND_COUNT; i++) {
    bands.push(sorted.slice(i * size, (i + 1) * size));
  }
  return bands;
}

export interface Pick {
  prompt: Prompt;
  /** 0 is the top band. */
  band: number;
  /** Unseen prompts left in the pool after this one. */
  remaining: number;
}

export function pickNext(
  pool: Prompt[],
  useCase: PromptUseCase,
  seen: ReadonlySet<string>,
  rng: () => number = Math.random,
): Pick | null {
  const bands = bandPool(pool, useCase);
  const unseenTotal = pool.filter((p) => !seen.has(p.id)).length;
  for (let band = 0; band < bands.length; band++) {
    const unseen = bands[band].filter((p) => !seen.has(p.id));
    if (unseen.length === 0) continue;
    const index = Math.min(unseen.length - 1, Math.floor(rng() * unseen.length));
    return { prompt: unseen[index], band, remaining: unseenTotal - 1 };
  }
  return null;
}

/** One pick per line of the classic, or null where that line's pool is spent. */
export type ClassicDraw = Record<ClassicPart, Pick | null>;

/** The three pools a classic draw reads, for a room. */
export function classicPools(
  bank: Prompt[],
  useCase: PromptUseCase,
): Record<ClassicPart, Prompt[]> {
  return Object.fromEntries(
    CLASSIC_PARTS.map((part) => [part, poolFor(bank, part, useCase, { combinable: true })]),
  ) as Record<ClassicPart, Prompt[]>;
}

/**
 * Can these two lines share a room? A plain intersection of their settings,
 * which is why `anywhere` is expanded to the whole taxonomy rather than kept
 * as a flag — nothing here has to know about portability.
 */
export function sharesSetting(a: Prompt, b: Prompt): boolean {
  return a.settings.some((setting) => b.settings.includes(setting));
}

/**
 * How many ways the three lines can fall together *coherently*.
 *
 * Not the product of the three pool sizes any more. That number counted
 * triples the generator will not draw — a dishwasher in a school library was
 * one of the 433,650 — so it was both wrong and flattering. Counted per
 * location, since the location is the anchor.
 */
export function classicCombinations(bank: Prompt[], useCase: PromptUseCase): number {
  const pools = classicPools(bank, useCase);
  return pools.location.reduce((total, place) => {
    const whos = pools.relationship.filter((p) => sharesSetting(p, place)).length;
    const whats = pools.task.filter((p) => sharesSetting(p, place)).length;
    return total + whos * whats;
  }, 0);
}

/**
 * The classic, drawn so the three lines can happen at once.
 *
 * The Where goes first and the other two are drawn to fit it. It is the
 * anchor because it is the only line that is unambiguously a physical place:
 * a Who and a What can usually be carried into a room, but a room cannot be
 * carried into them. Each line is still best-band-first inside whatever pool
 * the constraint leaves, so the ranking survives the cohesion.
 *
 * Where a constrained pool is all seen, a seen line is drawn again rather
 * than reaching outside it. Coherence beats novelty: a repeat reads as a
 * coincidence, an incoherent triple reads as a bug — which is what it was
 * (2026-10-08).
 */
export function pickClassic(
  bank: Prompt[],
  useCase: PromptUseCase,
  seen: ReadonlySet<string>,
  rng: () => number = Math.random,
): ClassicDraw {
  const pools = classicPools(bank, useCase);
  const NONE: ReadonlySet<string> = new Set();
  const location =
    pickNext(pools.location, useCase, seen, rng) ?? pickNext(pools.location, useCase, NONE, rng);

  const fitting = (part: ClassicPart) => {
    const pool = location
      ? pools[part].filter((p) => sharesSetting(p, location.prompt))
      : pools[part];
    return pickNext(pool, useCase, seen, rng) ?? pickNext(pool, useCase, NONE, rng);
  };

  return { relationship: fitting("relationship"), location, task: fitting("task") };
}

/**
 * The pool one line may be redrawn from without breaking the two it leaves
 * standing. Tapping the Where asks more of the draw than tapping the other
 * two, because it has to suit both of them, so the constraint is relaxed in
 * steps rather than dropped: everything it must fit, then the location alone,
 * then the whole pool. A line that cannot be redrawn at all would be worse
 * than one redrawn against less.
 */
export function redrawPool(
  bank: Prompt[],
  part: ClassicPart,
  useCase: PromptUseCase,
  draw: ClassicDraw,
): Prompt[] {
  const pool = poolFor(bank, part, useCase, { combinable: true });
  const others = CLASSIC_PARTS.filter((p) => p !== part)
    .map((p) => draw[p]?.prompt)
    .filter((p): p is Prompt => Boolean(p));
  const all = pool.filter((candidate) => others.every((o) => sharesSetting(candidate, o)));
  if (all.length > 0) return all;
  const place = draw.location?.prompt;
  if (part !== "location" && place) {
    const anchored = pool.filter((candidate) => sharesSetting(candidate, place));
    if (anchored.length > 0) return anchored;
  }
  return pool;
}

/** The classic's three lines as one string, for the clipboard. */
export function classicText(draw: ClassicDraw): string {
  return CLASSIC_PARTS.map((part) => {
    const pick = draw[part];
    return pick ? classicLine(pick.prompt) : undefined;
  })
    .filter((t): t is string => Boolean(t))
    .join("\n");
}

export interface SeenStore {
  seen(): Set<string>;
  markSeen(id: string): void;
  forget(ids: Iterable<string>): void;
}

/**
 * Wraps whatever storage the page has. `null` means none — a private window
 * that throws on access, or a server render — and the store then lives only
 * as long as the component does, which is the right fallback: the tool still
 * works, it just forgets on reload.
 *
 * `key` defaults to the prompt generator's, which was the only caller until
 * the would-you-rather hero wanted the same never-repeat behaviour over a
 * different bank on 2026-09-23. Two tools sharing one key would have made
 * each hide the other's rows.
 */
export function createSeenStore(
  storage: Storage | null,
  key: string = SEEN_STORAGE_KEY,
): SeenStore {
  let cache: Set<string> | null = null;

  function load(): Set<string> {
    if (cache) return cache;
    cache = new Set<string>();
    if (!storage) return cache;
    try {
      const raw = storage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        for (const id of parsed) if (typeof id === "string") cache.add(id);
      }
    } catch {
      // Corrupt or inaccessible: start clean rather than crash the hero.
    }
    return cache;
  }

  function save(ids: Set<string>) {
    if (!storage) return;
    try {
      storage.setItem(key, JSON.stringify([...ids]));
    } catch {
      // Quota or a locked-down browser. The in-memory copy still works.
    }
  }

  return {
    seen: () => new Set(load()),
    markSeen(id) {
      const ids = load();
      ids.add(id);
      save(ids);
    },
    forget(toForget) {
      const ids = load();
      for (const id of toForget) ids.delete(id);
      save(ids);
    },
  };
}

/** The browser's localStorage, or null where touching it throws. */
export function browserStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}
