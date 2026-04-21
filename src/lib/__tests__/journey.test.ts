import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearJourney,
  getJourneyRecommendation,
  getJourneyState,
  getThreadJourneyState,
  markThreadVisited,
  setCurrentPath,
  setThreadCompleted,
  setThreadConfidence,
  toggleThreadSaved,
} from "../journey";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("journey state", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-21T12:00:00.000Z"));
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  afterEach(() => {
    clearJourney();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: undefined,
    });
    vi.useRealTimers();
  });

  it("tracks visited threads with per-thread recency", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");

    expect(getJourneyState()).toMatchObject({
      pathId: "beginner-foundations",
      visitedThreads: ["building-on-offers"],
      lastThreadId: "building-on-offers",
    });
    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      lastVisitedAt: "2026-04-21T12:00:00.000Z",
    });
  });

  it("stores saved, completed, and confidence signals per lesson", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");

    expect(toggleThreadSaved("building-on-offers")).toBe(true);
    setThreadCompleted("building-on-offers", true);
    setThreadConfidence("building-on-offers", "medium");

    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      confidence: "medium",
      completedAt: "2026-04-21T12:00:00.000Z",
      savedAt: "2026-04-21T12:00:00.000Z",
    });

    expect(toggleThreadSaved("building-on-offers")).toBe(false);
    expect(getThreadJourneyState("building-on-offers")?.savedAt).toBeUndefined();
  });

  it("prioritizes practice when a learner marks a lesson as low confidence", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");
    setThreadConfidence("building-on-offers", "low");
    toggleThreadSaved("presence-and-commitment");

    expect(
      getJourneyRecommendation(["building-on-offers", "presence-and-commitment"]),
    ).toMatchObject({
      kind: "practice",
      threadId: "building-on-offers",
    });
  });

  it("falls back to continuation when there is a clear next lesson", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");

    expect(
      getJourneyRecommendation(["building-on-offers", "presence-and-commitment"]),
    ).toMatchObject({
      kind: "continue",
      threadId: "presence-and-commitment",
      current: 2,
      total: 2,
    });
  });
});
