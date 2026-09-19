import { describe, expect, it } from "vitest";

import { PROMPT_BANK, type PromptCategory, type PromptUseCase } from "../prompt-bank";
import {
  bandPool,
  createSeenStore,
  pickNext,
  poolFor,
  scoreFor,
  SEEN_STORAGE_KEY,
} from "../prompt-generator";

/** A tiny deterministic generator so the randomness under test is repeatable. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

class FakeStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

describe("scoring and banding", () => {
  it("scores differently for different use cases, because the weights differ", () => {
    // A relationship with real freight scores high for a class and lower for a
    // school room, where playability outweighs charge.
    const charged = PROMPT_BANK.find((p) => p.scores.charge === 5 && p.scores.doable <= 3);
    expect(charged).toBeDefined();
    if (!charged) return;
    expect(scoreFor(charged, "class")).toBeGreaterThan(scoreFor(charged, "school"));
  });

  it("splits every pool into three bands, best first", () => {
    const useCases: PromptUseCase[] = ["class", "show", "school", "team"];
    const categories: PromptCategory[] = [
      "relationship",
      "first-line",
      "location",
      "situation",
      "audience-question",
      "task",
    ];
    for (const useCase of useCases) {
      for (const category of categories) {
        const pool = poolFor(PROMPT_BANK, category, useCase);
        const banded = bandPool(pool, useCase);
        expect(banded.length, `${useCase}/${category}`).toBe(3);
        for (const band of banded) expect(band.length).toBeGreaterThan(0);
        // Nothing lost, nothing duplicated.
        expect(banded.flat().length).toBe(pool.length);
        // Ordered: the worst of band A is at least as good as the best of band B.
        const worstA = Math.min(...banded[0].map((p) => scoreFor(p, useCase)));
        const bestB = Math.max(...banded[1].map((p) => scoreFor(p, useCase)));
        expect(worstA).toBeGreaterThanOrEqual(bestB);
      }
    }
  });
});

describe("pickNext", () => {
  const pool = poolFor(PROMPT_BANK, "relationship", "class");

  it("draws from the top band before touching the others", () => {
    const banded = bandPool(pool, "class");
    const topIds = new Set(banded[0].map((p) => p.id));
    const rng = seeded(7);
    const seen = new Set<string>();
    for (let i = 0; i < banded[0].length; i++) {
      const pick = pickNext(pool, "class", seen, rng);
      expect(pick).not.toBeNull();
      if (!pick) return;
      expect(topIds.has(pick.prompt.id), pick.prompt.text).toBe(true);
      expect(pick.band).toBe(0);
      seen.add(pick.prompt.id);
    }
    // The next draw falls through to the second band.
    const next = pickNext(pool, "class", seen, rng);
    expect(next?.band).toBe(1);
  });

  it("never repeats a prompt the browser has already shown", () => {
    const rng = seeded(11);
    const seen = new Set<string>();
    const order: string[] = [];
    for (;;) {
      const pick = pickNext(pool, "class", seen, rng);
      if (!pick) break;
      expect(seen.has(pick.prompt.id)).toBe(false);
      seen.add(pick.prompt.id);
      order.push(pick.prompt.id);
    }
    expect(order.length).toBe(pool.length);
    expect(new Set(order).size).toBe(pool.length);
  });

  it("returns null once the pool is exhausted, so the UI can offer a reset", () => {
    const seen = new Set(pool.map((p) => p.id));
    expect(pickNext(pool, "class", seen, seeded(1))).toBeNull();
  });

  it("is random within a band rather than a fixed order", () => {
    const first = pickNext(pool, "class", new Set(), seeded(1));
    const second = pickNext(pool, "class", new Set(), seeded(99));
    const third = pickNext(pool, "class", new Set(), seeded(12345));
    const ids = new Set([first?.prompt.id, second?.prompt.id, third?.prompt.id]);
    expect(ids.size).toBeGreaterThan(1);
  });

  it("reports how much of the pool is left, so the UI can say so", () => {
    const seen = new Set<string>();
    const pick = pickNext(pool, "class", seen, seeded(3));
    expect(pick?.remaining).toBe(pool.length - 1);
  });
});

describe("the seen store", () => {
  it("round-trips ids through storage", () => {
    const storage = new FakeStorage();
    const store = createSeenStore(storage);
    store.markSeen("a");
    store.markSeen("b");
    expect(createSeenStore(storage).seen()).toEqual(new Set(["a", "b"]));
    expect(storage.getItem(SEEN_STORAGE_KEY)).toBeTruthy();
  });

  it("survives corrupt storage rather than crashing the page", () => {
    const storage = new FakeStorage();
    storage.setItem(SEEN_STORAGE_KEY, "{not json");
    const store = createSeenStore(storage);
    expect(store.seen().size).toBe(0);
    store.markSeen("a");
    expect(store.seen()).toEqual(new Set(["a"]));
  });

  it("works with no storage at all, as in a private window that throws", () => {
    const store = createSeenStore(null);
    store.markSeen("a");
    expect(store.seen()).toEqual(new Set(["a"]));
  });

  it("forgets only the ids it is told to forget", () => {
    const storage = new FakeStorage();
    const store = createSeenStore(storage);
    store.markSeen("a");
    store.markSeen("b");
    store.markSeen("c");
    store.forget(["a", "c"]);
    expect(store.seen()).toEqual(new Set(["b"]));
  });
});
