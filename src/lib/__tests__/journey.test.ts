import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadAtoms, loadPaths, loadThreads } from "../content";
import {
  clearJourney,
  computeJourneyRecommendation,
  conceptsVisitedFor,
  getDrillJourneyState,
  getJourneyRecommendation,
  getJourneyState,
  getReviewIntervalDays,
  getThreadJourneyState,
  isThreadVisited,
  type JourneyState,
  markConceptVisited,
  markDrillPracticed,
  markThreadPracticed,
  markThreadReviewed,
  markThreadVisited,
  REVIEW_INTERVAL_DAYS,
  scheduleThreadReview,
  setCurrentPath,
  setThreadCompleted,
  setThreadConfidence,
  toggleThreadSaved,
} from "../journey";
import { buildLessonPrerequisites, getLessonPrerequisites } from "../journey-prerequisites";

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
      reviewDueAt: "2026-04-22T12:00:00.000Z",
      reviewQueuedAt: "2026-04-21T12:00:00.000Z",
      savedAt: "2026-04-21T12:00:00.000Z",
    });
    expect(getJourneyState()?.reviewQueue).toEqual(["building-on-offers"]);

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

  it("surfaces due reviews before continuation once they are scheduled", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");
    setThreadCompleted("building-on-offers", true);

    expect(
      getJourneyRecommendation(["building-on-offers", "presence-and-commitment"]),
    ).toMatchObject({
      kind: "continue",
      threadId: "presence-and-commitment",
    });

    vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000);

    expect(
      getJourneyRecommendation(["building-on-offers", "presence-and-commitment"]),
    ).toMatchObject({
      kind: "review",
      threadId: "building-on-offers",
    });
  });

  /**
   * Used to assert that a completed review cleared the date and set no next
   * one. That was the bug (novel-insights 119): "spaced" review was a single
   * reminder. A completed review now schedules the next, further out.
   */
  it("tracks practice reps and schedules the next review when reviewed", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");
    markThreadPracticed("building-on-offers");
    markThreadPracticed("building-on-offers");
    scheduleThreadReview("building-on-offers");

    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      timesPracticed: 2,
      reviewDueAt: "2026-04-22T12:00:00.000Z",
    });
    expect(getJourneyState()?.reviewQueue).toEqual(["building-on-offers"]);

    markThreadReviewed("building-on-offers");

    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      timesPracticed: 2,
      timesReviewed: 1,
      lastReviewedAt: "2026-04-21T12:00:00.000Z",
      reviewDueAt: "2026-04-24T12:00:00.000Z",
    });
    expect(getJourneyState()?.reviewQueue).toEqual(["building-on-offers"]);
  });

  it("escalates the review interval on each completed review: 1, 3, 7, 21 days", () => {
    expect([...REVIEW_INTERVAL_DAYS]).toEqual([1, 3, 7, 21]);
    expect([0, 1, 2, 3, 4, 9].map(getReviewIntervalDays)).toEqual([1, 3, 7, 21, 21, 21]);

    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");
    setThreadCompleted("building-on-offers", true);

    // Completion schedules the first rung; each review the next one.
    const dueDays: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const dueAt = getThreadJourneyState("building-on-offers")?.reviewDueAt ?? "";
      dueDays.push(Math.round((Date.parse(dueAt) - Date.now()) / (24 * 60 * 60 * 1000)));
      vi.setSystemTime(new Date(dueAt));
      markThreadReviewed("building-on-offers");
    }
    expect(dueDays).toEqual([1, 3, 7, 21, 21]);
    expect(getThreadJourneyState("building-on-offers")?.timesReviewed).toBe(5);

    // A manual "review again" after that keeps the learner's rung rather than
    // dropping back to tomorrow.
    scheduleThreadReview("building-on-offers");
    const manual = getThreadJourneyState("building-on-offers")?.reviewDueAt ?? "";
    expect(Math.round((Date.parse(manual) - Date.now()) / (24 * 60 * 60 * 1000))).toBe(21);
  });

  it("lifts low confidence to medium when the learner practises or completes", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");
    setThreadConfidence("building-on-offers", "low");
    markThreadPracticed("building-on-offers");
    expect(getThreadJourneyState("building-on-offers")?.confidence).toBe("medium");

    setThreadConfidence("building-on-offers", "low");
    setThreadCompleted("building-on-offers", true);
    expect(getThreadJourneyState("building-on-offers")?.confidence).toBe("medium");

    // Only `low` lifts; the learner's own "solid" is not overwritten, and
    // un-completing changes nothing.
    setThreadConfidence("building-on-offers", "high");
    markThreadPracticed("building-on-offers");
    setThreadCompleted("building-on-offers", false);
    expect(getThreadJourneyState("building-on-offers")?.confidence).toBe("high");

    // So the router stops recommending the same lesson once it is practised.
    setThreadConfidence("building-on-offers", "low");
    markThreadPracticed("building-on-offers");
    expect(
      getJourneyRecommendation(["building-on-offers", "presence-and-commitment"]),
    ).toMatchObject({ kind: "continue", threadId: "presence-and-commitment" });
  });

  /**
   * The ranking reads the atoms' direct prerequisites first (entry 277,
   * 2026-09-22). `a-hard` declares `a-basic`, `a-mid` and `a-other`, and
   * `a-mid` already requires `a-basic`, so what `a-hard` needs next is
   * `a-mid` and `a-other`; `a-basic` is implied. A lesson teaching only the
   * implied atom is still a candidate — the last resort before "the same
   * lesson again" — but ranks below any lesson teaching a direct one.
   */
  it("routes a shaky lesson to the same-path lesson that teaches what it requires next", () => {
    const prerequisites = buildLessonPrerequisites(
      [
        { id: "a-basic", links: [] },
        { id: "a-mid", links: [{ id: "a-basic", relation: "requires" }] },
        { id: "a-other", links: [] },
        {
          id: "a-hard",
          links: [
            { id: "a-basic", relation: "requires" },
            { id: "a-mid", relation: "requires" },
            { id: "a-other", relation: "requires" },
            { id: "a-hard", relation: "requires" },
          ],
        },
        { id: "a-side", links: [{ id: "a-hard", relation: "enables" }] },
      ],
      [
        { id: "basics", atoms: ["a-basic"] },
        { id: "middle", atoms: ["a-mid"] },
        { id: "hard", atoms: ["a-hard"] },
        { id: "both", atoms: ["a-basic", "a-mid"] },
        { id: "other", atoms: ["a-other"] },
        { id: "side", atoms: ["a-side"] },
      ],
      [
        { id: "p", threads: ["basics", "hard", "other", "middle", "both", "side"] },
        { id: "q", threads: ["hard", "side"] },
        { id: "r", threads: ["basics", "hard"] },
      ],
    );

    // Earlier before later: "basics" comes first though it teaches only the
    // implied `a-basic`. Among the later lessons, direct prerequisites
    // taught decides first — "other", "middle" and "both" each teach one —
    // then implied ones, which puts "both" (`a-mid` and the implied
    // `a-basic`) ahead of the two that teach one direct atom and nothing
    // else; then path order, "other" before "middle".
    expect(prerequisites.p.hard).toEqual(["basics", "both", "other", "middle"]);
    // A lesson requiring nothing outside itself has no entry.
    expect(prerequisites.p.basics).toBeUndefined();
    expect(prerequisites.p.side).toBeUndefined();
    // On a path with no prerequisite lesson the slot stays empty.
    expect(prerequisites.q.hard).toBeUndefined();
    // A lesson teaching only an implied prerequisite is the last resort, kept.
    expect(prerequisites.r.hard).toEqual(["basics"]);

    const shaky = (pathId: string, threadId: string): JourneyState => ({
      pathId,
      visitedThreads: [threadId],
      reviewQueue: [],
      startedAt: "2026-04-21T12:00:00.000Z",
      threads: { [threadId]: { lastVisitedAt: "2026-04-21T12:00:00.000Z", confidence: "low" } },
    });

    const pThreads = ["basics", "hard", "other", "middle", "both", "side"];
    expect(
      computeJourneyRecommendation(shaky("p", "hard"), pThreads, prerequisites.p),
    ).toMatchObject({
      kind: "practice",
      threadId: "basics",
      current: 1,
      remediates: "hard",
    });
    // No map: today's behaviour, the lesson itself.
    expect(computeJourneyRecommendation(shaky("p", "hard"), ["basics", "hard"])).toMatchObject({
      kind: "practice",
      threadId: "hard",
    });
    // A map naming a lesson that is not on the path is ignored.
    expect(
      computeJourneyRecommendation(shaky("q", "hard"), ["hard", "side"], { hard: ["basics"] }),
    ).toMatchObject({ kind: "practice", threadId: "hard" });
    expect(
      computeJourneyRecommendation(shaky("q", "hard"), ["hard", "side"], prerequisites.q),
    ).toMatchObject({ kind: "practice", threadId: "hard" });
  });

  /**
   * The check in novel-insights 119: for every lesson slot on every path,
   * mark the lesson shaky and ask the router where to go. Before the map,
   * 39 of 39 slots came back as the same lesson; the graph names a
   * prerequisite lesson for 37 of them. The residual is the two slots whose
   * lesson requires nothing another lesson on that path teaches
   * (`advanced-game-and-character/quieting-the-planning-mind`,
   * `mastering-the-form/show-as-architecture`, measured 2026-09-21). The
   * floor sits at that residual, so a linker that silently stops reading
   * `requires` fails here rather than quietly sending everyone in circles.
   *
   * Re-measured 2026-09-22 with the map ranking by direct prerequisites
   * (entry 277): the residual is the same two slots, because a lesson that
   * teaches only an implied prerequisite is kept as the last resort; had
   * it been dropped, 10 of 39 would loop. Five first recommendations
   * moved, each to the lesson teaching what the atoms need *next* rather
   * than the one teaching most of the closure — see the worked example.
   *
   * And again the same day, with the knot read as one need (`requireSets`,
   * `core: "rest"`): the members of the core the shaky lesson does not
   * compose, satisfied by any of them another lesson teaches. Entry 315
   * had moved the member that names a collapsed cycle to the most-required
   * one, and taken as the need it reordered lessons without a thread
   * changing. Read as any member of the core, Beginner Foundations' two
   * lessons would have vouched for themselves (each composes a member) and
   * the residual would have been 4 of 39; read as the rest of the core,
   * each still sends the reader to the other. The residual is the same two
   * slots.
   */
  it("sends a shaky learner somewhere other than the same lesson for all but the residual slots", async () => {
    const [atoms, threads, paths] = await Promise.all([loadAtoms(), loadThreads(), loadPaths()]);
    const map = await getLessonPrerequisites();

    // Guard the guard.
    expect(threads.length).toBeGreaterThanOrEqual(20);
    expect(paths.length).toBeGreaterThanOrEqual(10);
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    let slots = 0;
    let sameBefore = 0;
    const sameAfter: string[] = [];
    for (const path of paths) {
      const pathId = path.frontmatter.id;
      const threadIds = path.frontmatter.threads ?? [];
      for (const threadId of threadIds) {
        slots += 1;
        const state: JourneyState = {
          pathId,
          visitedThreads: [threadId],
          reviewQueue: [],
          startedAt: "2026-04-21T12:00:00.000Z",
          threads: { [threadId]: { lastVisitedAt: "2026-04-21T12:00:00.000Z", confidence: "low" } },
        };
        if (computeJourneyRecommendation(state, threadIds)?.threadId === threadId) sameBefore += 1;
        const after = computeJourneyRecommendation(state, threadIds, map[pathId]);
        expect(after?.kind).toBe("practice");
        expect(threadIds).toContain(after?.threadId);
        if (after?.threadId === threadId) sameAfter.push(`${pathId}/${threadId}`);
      }
    }

    expect(slots).toBeGreaterThanOrEqual(39);
    // Without the map every slot loops; the number is the population guard.
    expect(sameBefore).toBe(slots);
    // 2 of 39 on 2026-09-21.
    expect(sameAfter.length).toBeLessThanOrEqual(2);
    expect(sameAfter.length / slots).toBeLessThanOrEqual(2 / 39);

    // The worked example from the entry: the-inner-game-expanded on
    // improv-for-life has three earlier lessons teaching what it requires.
    // Under the closure the order was conversation-that-felt-like-magic,
    // presence-and-commitment, quieting-the-planning-mind (two, two and one
    // of the closure taught, path order breaking the tie). Under entry
    // 277's reduction *Presence and Commitment* led, because its atoms'
    // next needs were counted as `commitment` and `active-listening`, two
    // direct hits, while the other two lessons taught only members the
    // reduction had folded (`shared-reality-fragility`; `be-present`).
    // With the knot read as one need (entry 315 as a set) all three
    // lessons teach it once — `commitment` and `active-listening` are one
    // door, not two — and the closure tie-break decides as it did before:
    // *Conversation* and *Presence* each teach two of what the atoms
    // named, *Quieting* one, and path order puts *Conversation* first.
    expect(map["improv-for-life"]?.["the-inner-game-expanded"]).toEqual([
      "conversation-that-felt-like-magic",
      "presence-and-commitment",
      "quieting-the-planning-mind",
    ]);
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

  /**
   * The record was keyed by the 25 lessons and written only on the lesson
   * page; the 205 concept pages wrote nothing, so a reader who walked a
   * lesson concept by concept arrived at the next lesson with the syllabus
   * at 0 (tracker entry 333, 2026-09-22). A concept visit is now a set on
   * the lesson — and only that. It must not put the lesson in
   * `visitedThreads`: that list means the lesson page was opened, and the
   * bar, the router's "first unvisited" and the syllabus tick all read it
   * so. The reading decides instead: given the lesson's concept count,
   * `isThreadVisited` counts a fully read lesson as visited.
   */
  it("records concept visits as a set on the lesson without marking the lesson visited", () => {
    setCurrentPath("beginner-foundations");
    markConceptVisited("building-on-offers", "yes-and");
    markConceptVisited("building-on-offers", "yes-and");
    markConceptVisited("building-on-offers", "offer");
    markConceptVisited("building-on-offers", "yes-and");

    expect(conceptsVisitedFor("building-on-offers")).toEqual(["yes-and", "offer"]);
    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      conceptsVisited: ["yes-and", "offer"],
      lastVisitedAt: "2026-04-21T12:00:00.000Z",
    });
    // The record is honest: no lesson page was opened.
    expect(getJourneyState()?.visitedThreads).toEqual([]);
    expect(getJourneyState()?.lastThreadId).toBeUndefined();
    expect(isThreadVisited("building-on-offers")).toBe(false);
    // Nor does the router skip it as read.
    expect(
      getJourneyRecommendation(["building-on-offers", "presence-and-commitment"]),
    ).toMatchObject({ kind: "continue", threadId: "building-on-offers" });

    // The reading, given the count: 2 of 3 is not visited, 2 of 2 is.
    expect(isThreadVisited("building-on-offers", 3)).toBe(false);
    expect(isThreadVisited("building-on-offers", 2)).toBe(true);
    // No count, or a count of 0 (a lesson with no atoms), never vouches.
    expect(isThreadVisited("building-on-offers", 0)).toBe(false);
    expect(conceptsVisitedFor("presence-and-commitment")).toEqual([]);
    expect(isThreadVisited("presence-and-commitment", 1)).toBe(false);

    // Empty ids write nothing.
    markConceptVisited("", "yes-and");
    markConceptVisited("building-on-offers", "");
    expect(Object.keys(getJourneyState()?.threads ?? {})).toEqual(["building-on-offers"]);
  });

  /**
   * The drill page's "I ran this": one rep on the drill and one on every
   * lesson whose drill row lists it, through the same path as the lesson
   * page's button — visit, counter, recency and the `low` lift of entry 119
   * — so the router stops recommending a lesson practised from its drill.
   */
  it("counts a drill rep on the drill and as practice on the lessons it is listed for", () => {
    setCurrentPath("beginner-foundations");
    markThreadVisited("building-on-offers");
    setThreadConfidence("building-on-offers", "low");

    markDrillPracticed("zip-zap-zop", ["building-on-offers", "presence-and-commitment"]);
    markDrillPracticed("zip-zap-zop", ["building-on-offers", "presence-and-commitment"]);

    expect(getDrillJourneyState("zip-zap-zop")).toEqual({
      timesPracticed: 2,
      lastPracticedAt: "2026-04-21T12:00:00.000Z",
    });
    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      timesPracticed: 2,
      lastPracticedAt: "2026-04-21T12:00:00.000Z",
      confidence: "medium",
    });
    expect(getThreadJourneyState("presence-and-commitment")).toMatchObject({ timesPracticed: 2 });
    // Practice is a visit, as the lesson page's button makes it.
    expect(getJourneyState()?.visitedThreads).toEqual([
      "building-on-offers",
      "presence-and-commitment",
    ]);
    expect(getJourneyState()?.lastThreadId).toBe("building-on-offers");
    // And the lesson page's own button adds to the same counter.
    markThreadPracticed("building-on-offers");
    expect(getThreadJourneyState("building-on-offers")?.timesPracticed).toBe(3);

    // A drill on no lesson's row moves only its own counter.
    markDrillPracticed("solo-drill", []);
    expect(getDrillJourneyState("solo-drill")?.timesPracticed).toBe(1);
    expect(Object.keys(getJourneyState()?.threads ?? {})).toEqual([
      "building-on-offers",
      "presence-and-commitment",
    ]);
    expect(getDrillJourneyState("never-run")).toBeNull();
  });

  /**
   * A record saved before 2026-09-22 has neither field. It must load as it
   * was — the fields absent, not defaulted — so nothing that compares saved
   * snapshots sees a change, and a record with garbage in the new fields
   * loads with the garbage dropped rather than not at all.
   */
  it("loads a record saved before the concept and drill fields existed, unchanged", () => {
    const stored = {
      pathId: "beginner-foundations",
      visitedThreads: ["building-on-offers"],
      reviewQueue: [],
      startedAt: "2026-04-20T12:00:00.000Z",
      lastThreadId: "building-on-offers",
      threads: {
        "building-on-offers": { lastVisitedAt: "2026-04-20T12:00:00.000Z", timesPracticed: 1 },
      },
    };
    globalThis.localStorage.setItem("improv-journey", JSON.stringify(stored));

    const loaded = getJourneyState();
    expect(loaded).toEqual({
      ...stored,
      threads: {
        "building-on-offers": {
          lastVisitedAt: "2026-04-20T12:00:00.000Z",
          savedAt: undefined,
          completedAt: undefined,
          confidence: undefined,
          reviewQueuedAt: undefined,
          reviewDueAt: undefined,
          lastReviewedAt: undefined,
          timesReviewed: undefined,
          lastPracticedAt: undefined,
          timesPracticed: 1,
        },
      },
    });
    expect(loaded).not.toHaveProperty("drills");
    expect(loaded?.threads["building-on-offers"]).not.toHaveProperty("conceptsVisited");
    expect(conceptsVisitedFor("building-on-offers")).toEqual([]);
    expect(getDrillJourneyState("zip-zap-zop")).toBeNull();

    // The old record keeps working as a base for the new writes.
    markConceptVisited("building-on-offers", "yes-and");
    markDrillPracticed("zip-zap-zop", ["building-on-offers"]);
    expect(getThreadJourneyState("building-on-offers")).toMatchObject({
      timesPracticed: 2,
      conceptsVisited: ["yes-and"],
    });
    expect(getJourneyState()?.drills).toEqual({
      "zip-zap-zop": { timesPracticed: 1, lastPracticedAt: "2026-04-21T12:00:00.000Z" },
    });

    // Garbage in the new fields is dropped, not fatal.
    globalThis.localStorage.setItem(
      "improv-journey",
      JSON.stringify({
        ...stored,
        drills: { ok: { timesPracticed: 2, lastPracticedAt: "2026-04-20T12:00:00.000Z" }, bad: 7 },
        threads: {
          "building-on-offers": {
            lastVisitedAt: "2026-04-20T12:00:00.000Z",
            conceptsVisited: ["yes-and", 3, "yes-and", null],
          },
        },
      }),
    );
    expect(getJourneyState()?.drills).toEqual({
      ok: { timesPracticed: 2, lastPracticedAt: "2026-04-20T12:00:00.000Z" },
    });
    expect(conceptsVisitedFor("building-on-offers")).toEqual(["yes-and"]);
  });
});
