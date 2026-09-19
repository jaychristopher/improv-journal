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
 * Seen ids live in localStorage and nowhere else. Nothing about a reader's
 * draws leaves the browser except the analytics events the component sends.
 */

import {
  type Prompt,
  type PromptCategory,
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
  category: PromptCategory,
  useCase: PromptUseCase,
): Prompt[] {
  return bank.filter((p) => p.category === category && suitsUseCase(p, useCase));
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
 */
export function createSeenStore(storage: Storage | null): SeenStore {
  let cache: Set<string> | null = null;

  function load(): Set<string> {
    if (cache) return cache;
    cache = new Set<string>();
    if (!storage) return cache;
    try {
      const raw = storage.getItem(SEEN_STORAGE_KEY);
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
      storage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...ids]));
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
