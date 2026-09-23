/**
 * Client-side journey state management.
 * Tracks path progress, review scheduling, practice reps, and recency in local storage.
 */

const STORAGE_KEY = "improv-journey";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Days until the next review, indexed by how many reviews the lesson has had.
 * One fixed day was a single reminder, not spacing (novel-insights 119); the
 * ladder repeats its last rung, so a lesson reviewed four times is asked for
 * again every three weeks rather than never.
 */
export const REVIEW_INTERVAL_DAYS = [1, 3, 7, 21] as const;

export function getReviewIntervalDays(timesReviewed = 0): number {
  const step = Math.max(0, Math.min(timesReviewed, REVIEW_INTERVAL_DAYS.length - 1));
  return REVIEW_INTERVAL_DAYS[step];
}

export type ConfidenceLevel = "low" | "medium" | "high";

/**
 * For one path: lesson id → the other lessons on that path that teach a
 * prerequisite of the lesson's atoms, best first. Built server side by
 * `journey-prerequisites.ts`; the router only reads it.
 */
export type PathLessonPrerequisites = Record<string, string[]>;

/** Path id → that path's `PathLessonPrerequisites`. */
export type LessonPrerequisiteMap = Record<string, PathLessonPrerequisites>;

export interface ThreadJourneyState {
  lastVisitedAt: string;
  savedAt?: string;
  completedAt?: string;
  confidence?: ConfidenceLevel;
  reviewQueuedAt?: string;
  reviewDueAt?: string;
  lastReviewedAt?: string;
  timesReviewed?: number;
  lastPracticedAt?: string;
  timesPracticed?: number;
  /**
   * The lesson's concept pages the reader has opened, by atom id, a set.
   * Written by the concept page (`ConceptVisit`), which credits the visit to
   * the lesson the reader came from; the record was keyed by the 25 lessons
   * alone and the 205 concept pages wrote nothing, so a reader who walked a
   * lesson concept by concept arrived at the next lesson with the record
   * empty (tracker entry 333, 2026-09-22). Distinct from `visitedThreads`:
   * see `markConceptVisited`.
   */
  conceptsVisited?: string[];
}

/**
 * One drill's practice record. The drill is the unit the site routes to
 * everywhere — the lesson's drill row, the guides' cards, the picker — and
 * "practised" was a counter on a lesson, set only by a button under the
 * lesson's prose (entry 333). The drill page now writes this and lifts the
 * lessons whose drill rows list it.
 */
export interface DrillJourneyState {
  timesPracticed: number;
  lastPracticedAt: string;
}

export interface JourneyState {
  pathId: string;
  visitedThreads: string[];
  reviewQueue: string[];
  startedAt: string;
  lastThreadId?: string;
  threads: Record<string, ThreadJourneyState>;
  /** Drill id → its practice record. Absent on records saved before 2026-09-22. */
  drills?: Record<string, DrillJourneyState>;
}

export interface JourneyRecommendation {
  kind: "continue" | "review" | "practice";
  threadId: string;
  current: number;
  total: number;
  reason: string;
  /**
   * Set when the recommended lesson is not the shaky one but a lesson that
   * teaches what the shaky one requires; names the shaky lesson.
   */
  remediates?: string;
}

function getStorage(): Storage | null {
  if (typeof globalThis.localStorage === "undefined") return null;
  return globalThis.localStorage;
}

function createEmptyState(pathId = ""): JourneyState {
  return {
    pathId,
    visitedThreads: [],
    reviewQueue: [],
    startedAt: new Date().toISOString(),
    threads: {},
  };
}

function isThreadRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && value >= 0 ? value : undefined;
}

function parseOptionalTimestamp(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeThreadState(raw: unknown, fallbackTimestamp: string): ThreadJourneyState | null {
  if (!isThreadRecord(raw)) return null;

  const confidence =
    raw.confidence === "low" || raw.confidence === "medium" || raw.confidence === "high"
      ? raw.confidence
      : undefined;

  return {
    lastVisitedAt:
      typeof raw.lastVisitedAt === "string" && raw.lastVisitedAt.trim().length > 0
        ? raw.lastVisitedAt
        : fallbackTimestamp,
    savedAt: parseOptionalTimestamp(raw.savedAt),
    completedAt: parseOptionalTimestamp(raw.completedAt),
    confidence,
    reviewQueuedAt: parseOptionalTimestamp(raw.reviewQueuedAt),
    reviewDueAt: parseOptionalTimestamp(raw.reviewDueAt),
    lastReviewedAt: parseOptionalTimestamp(raw.lastReviewedAt),
    timesReviewed: parsePositiveNumber(raw.timesReviewed),
    lastPracticedAt: parseOptionalTimestamp(raw.lastPracticedAt),
    timesPracticed: parsePositiveNumber(raw.timesPracticed),
    // Only present when the record has one: a stored record from before the
    // field existed reads back without it, so old snapshots stay equal.
    ...(Array.isArray(raw.conceptsVisited)
      ? {
          conceptsVisited: [
            ...new Set(
              raw.conceptsVisited.filter((value): value is string => typeof value === "string"),
            ),
          ],
        }
      : {}),
  };
}

function normalizeDrillState(raw: unknown): DrillJourneyState | null {
  if (!isThreadRecord(raw)) return null;
  const timesPracticed = parsePositiveNumber(raw.timesPracticed);
  const lastPracticedAt = parseOptionalTimestamp(raw.lastPracticedAt);
  if (timesPracticed === undefined || !lastPracticedAt) return null;
  return { timesPracticed, lastPracticedAt };
}

function normalizeState(raw: unknown): JourneyState | null {
  if (!isThreadRecord(raw)) return null;

  const startedAt =
    typeof raw.startedAt === "string" && raw.startedAt.trim().length > 0
      ? raw.startedAt
      : new Date().toISOString();

  const visitedThreads = Array.isArray(raw.visitedThreads)
    ? [...new Set(raw.visitedThreads.filter((value): value is string => typeof value === "string"))]
    : [];
  const reviewQueue = Array.isArray(raw.reviewQueue)
    ? [...new Set(raw.reviewQueue.filter((value): value is string => typeof value === "string"))]
    : [];

  const threads: Record<string, ThreadJourneyState> = {};
  if (isThreadRecord(raw.threads)) {
    for (const [threadId, threadState] of Object.entries(raw.threads)) {
      const normalized = normalizeThreadState(threadState, startedAt);
      if (normalized) {
        threads[threadId] = normalized;
      }
    }
  }

  for (const threadId of [...visitedThreads, ...reviewQueue]) {
    threads[threadId] ??= { lastVisitedAt: startedAt };
  }

  const drills: Record<string, DrillJourneyState> = {};
  if (isThreadRecord(raw.drills)) {
    for (const [drillId, drillState] of Object.entries(raw.drills)) {
      const normalized = normalizeDrillState(drillState);
      if (normalized) drills[drillId] = normalized;
    }
  }

  return {
    pathId: typeof raw.pathId === "string" ? raw.pathId : "",
    visitedThreads,
    reviewQueue,
    startedAt,
    lastThreadId: typeof raw.lastThreadId === "string" ? raw.lastThreadId : undefined,
    threads,
    // As with `conceptsVisited`: absent stays absent, so a record saved
    // before the field existed reads back unchanged.
    ...(isThreadRecord(raw.drills) ? { drills } : {}),
  };
}

function saveState(state: JourneyState): void {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getOrCreateState(pathId = ""): JourneyState {
  return getJourneyState() ?? createEmptyState(pathId);
}

function ensureVisited(state: JourneyState, threadId: string): JourneyState {
  if (!threadId || state.visitedThreads.includes(threadId)) return state;
  return {
    ...state,
    visitedThreads: [...state.visitedThreads, threadId],
  };
}

function addToReviewQueue(state: JourneyState, threadId: string): JourneyState {
  if (!threadId || state.reviewQueue.includes(threadId)) return state;
  return {
    ...state,
    reviewQueue: [...state.reviewQueue, threadId],
  };
}

function removeFromReviewQueue(state: JourneyState, threadId: string): JourneyState {
  if (!threadId || !state.reviewQueue.includes(threadId)) return state;
  return {
    ...state,
    reviewQueue: state.reviewQueue.filter((id) => id !== threadId),
  };
}

function updateThreadState(
  state: JourneyState,
  threadId: string,
  updater: (threadState: ThreadJourneyState) => ThreadJourneyState,
): JourneyState {
  if (!threadId) return state;

  const current = state.threads[threadId] ?? { lastVisitedAt: state.startedAt };
  return {
    ...state,
    threads: {
      ...state.threads,
      [threadId]: updater(current),
    },
  };
}

function addDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * DAY_IN_MS).toISOString();
}

function isReviewDue(reviewDueAt?: string): boolean {
  if (!reviewDueAt) return false;
  const reviewTime = Date.parse(reviewDueAt);
  if (Number.isNaN(reviewTime)) return false;
  return reviewTime <= Date.now();
}

export function getJourneyState(): JourneyState | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function setCurrentPath(pathId: string): void {
  const existing = getJourneyState();
  if (existing?.pathId === pathId) return;

  saveState({
    ...(existing ?? createEmptyState(pathId)),
    pathId,
    startedAt: existing?.startedAt ?? new Date().toISOString(),
  });
}

export function markThreadVisited(threadId: string): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: now,
  }));

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

export function getThreadJourneyState(threadId: string): ThreadJourneyState | null {
  const state = getJourneyState();
  if (!state) return null;
  return state.threads[threadId] ?? null;
}

export function isThreadQueuedForReview(threadId: string): boolean {
  const state = getJourneyState();
  if (!state) return false;
  return state.reviewQueue.includes(threadId);
}

export function toggleThreadSaved(threadId: string): boolean {
  if (!threadId) return false;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  const isSaved = Boolean(nextState.threads[threadId]?.savedAt);

  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    savedAt: isSaved ? undefined : now,
  }));

  saveState(nextState);
  return !isSaved;
}

/**
 * Doing the work is evidence. A learner who marked a lesson "still shaky" and
 * then practised or completed it has moved; leaving the flag at `low` until
 * they re-answer the question kept the router recommending the lesson for
 * ever (novel-insights 119). Only `low` lifts — `medium` and `high` are the
 * learner's own words and stay theirs.
 */
function liftLowConfidence(confidence?: ConfidenceLevel): ConfidenceLevel | undefined {
  return confidence === "low" ? "medium" : confidence;
}

/**
 * `delayDays` omitted means the escalating schedule: the counter the record
 * already keeps decides the rung.
 */
export function scheduleThreadReview(threadId: string, delayDays?: number): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = addToReviewQueue(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    reviewQueuedAt: now,
    reviewDueAt: addDays(now, delayDays ?? getReviewIntervalDays(threadState.timesReviewed)),
  }));

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

/**
 * Completing a review schedules the next one, further out each time (1, 3,
 * 7, 21 days). Before, it cleared the date and set no next one, so "spaced"
 * review was a single reminder.
 */
export function markThreadReviewed(threadId: string): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = addToReviewQueue(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => {
    const timesReviewed = (threadState.timesReviewed ?? 0) + 1;
    return {
      ...threadState,
      lastVisitedAt: threadState.lastVisitedAt || now,
      reviewQueuedAt: now,
      reviewDueAt: addDays(now, getReviewIntervalDays(timesReviewed)),
      lastReviewedAt: now,
      timesReviewed,
    };
  });

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

/**
 * One practice rep on a lesson, pure: the counter, the recency, the visit,
 * and the confidence lift (`liftLowConfidence`). Shared by the lesson
 * page's "Practiced today" and the drill page's "I ran this", so a rep
 * logged from either page is the same fact in the record.
 */
function practiseThread(state: JourneyState, threadId: string, now: string): JourneyState {
  if (!threadId) return state;
  let nextState = ensureVisited(state, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    lastPracticedAt: now,
    timesPracticed: (threadState.timesPracticed ?? 0) + 1,
    confidence: liftLowConfidence(threadState.confidence),
  }));
  return nextState;
}

export function markThreadPracticed(threadId: string): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  const nextState = practiseThread(getOrCreateState(), threadId, now);

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

/**
 * The drill page's write: one rep on the drill, and one rep on every lesson
 * in `lessonIds` — the lessons whose drill rows list the drill, computed on
 * the server by `drill-lessons.ts`. Each lesson goes through the same
 * `practiseThread` as the lesson page's button, confidence lift included,
 * because running *Zip Zap Zop* from its own page is the thing the record
 * called practice on a page the record could not see (entry 333). The first
 * lesson given becomes `lastThreadId`, as the lesson page's button sets it;
 * with no lessons, only the drill's counter moves.
 */
export function markDrillPracticed(drillId: string, lessonIds: string[]): void {
  if (!drillId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  const current = nextState.drills?.[drillId];
  nextState = {
    ...nextState,
    drills: {
      ...(nextState.drills ?? {}),
      [drillId]: { timesPracticed: (current?.timesPracticed ?? 0) + 1, lastPracticedAt: now },
    },
  };
  for (const lessonId of lessonIds) nextState = practiseThread(nextState, lessonId, now);

  const lifted = lessonIds.find(Boolean);
  saveState(lifted ? { ...nextState, lastThreadId: lifted } : nextState);
}

export function getDrillJourneyState(drillId: string): DrillJourneyState | null {
  const state = getJourneyState();
  return state?.drills?.[drillId] ?? null;
}

/**
 * A concept page opened while walking lesson `threadId`. Idempotent: the
 * field is a set, and a page reloaded 10 times is one concept read.
 *
 * Deliberately not `ensureVisited`. `visitedThreads` means the lesson page
 * was opened — the progress bar, the router's "first unvisited lesson" and
 * the syllabus tick all read it as that — and a reader who has opened 1 of a
 * lesson's 12 concepts has not. The two stay distinct in the record, and the
 * reading decides: `isThreadVisited` counts a lesson as visited once every
 * one of its concepts is read, given the count, which the record cannot know
 * and the page can. The lesson's `lastVisitedAt` is set only if it has none,
 * as every other writer does, so a concept-only lesson has a record without
 * being a visit; `lastThreadId` is left alone for the same reason.
 */
export function markConceptVisited(threadId: string, atomId: string): void {
  if (!threadId || !atomId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  if (nextState.threads[threadId]?.conceptsVisited?.includes(atomId)) return;
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    conceptsVisited: [...(threadState.conceptsVisited ?? []), atomId],
  }));

  saveState(nextState);
}

export function conceptsVisitedFor(threadId: string): string[] {
  const state = getJourneyState();
  return state?.threads[threadId]?.conceptsVisited ?? [];
}

export function setThreadCompleted(threadId: string, completed: boolean): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    completedAt: completed ? now : undefined,
    reviewQueuedAt: completed ? (threadState.reviewQueuedAt ?? now) : undefined,
    reviewDueAt: completed
      ? (threadState.reviewDueAt ?? addDays(now, getReviewIntervalDays(threadState.timesReviewed)))
      : undefined,
    confidence: completed ? liftLowConfidence(threadState.confidence) : threadState.confidence,
  }));
  nextState = completed
    ? addToReviewQueue(nextState, threadId)
    : removeFromReviewQueue(nextState, threadId);

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

export function setThreadConfidence(threadId: string, confidence: ConfidenceLevel): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    confidence,
  }));

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

/**
 * `conceptCount` is the lesson's number of concept pages, from content. Given
 * and positive, a lesson whose every concept is read counts as visited here
 * though `visitedThreads` does not list it: the reader has walked the lesson
 * concept by concept without opening its page, the chain the concept pages'
 * foot cards offer (entry 326), and the syllabus said 0 of 6 (entry 333).
 * The record is not changed by the reading — see `markConceptVisited` — so a
 * caller without the count (the lesson page's bar, the router's "first
 * unvisited lesson") reads the record as it was.
 */
export function isThreadVisited(threadId: string, conceptCount?: number): boolean {
  const state = getJourneyState();
  if (!state) return false;
  if (state.visitedThreads.includes(threadId)) return true;
  if (!conceptCount || conceptCount <= 0) return false;
  const read = new Set(state.threads[threadId]?.conceptsVisited ?? []);
  return read.size >= conceptCount;
}

export function getNextUnvisitedThread(threadIds: string[]): string | null {
  const state = getJourneyState();
  if (!state) return threadIds[0] ?? null;

  for (const id of threadIds) {
    if (!state.visitedThreads.includes(id)) return id;
  }

  return null;
}

/**
 * Reads local storage and defers to `computeJourneyRecommendation`. Pass the
 * current path's `PathLessonPrerequisites` (from `journey-prerequisites.ts`)
 * for a shaky lesson to route to the lesson that teaches what it requires;
 * without it the shaky lesson is recommended itself.
 */
export function getJourneyRecommendation(
  threadIds: string[],
  prerequisites?: PathLessonPrerequisites,
): JourneyRecommendation | null {
  return computeJourneyRecommendation(getJourneyState(), threadIds, prerequisites);
}

/**
 * The router, pure: learner record in, one next step out. `state` null means
 * no journey yet.
 *
 * Rules, in order: a lesson marked "still shaky" (routed to the same-path
 * lesson that teaches the most of its prerequisites, earlier first — a later
 * one is offered as "comes next; keep going", since on 84 on-path edges the
 * prerequisite is taught after the lesson that needs it (entry 269) — or to
 * itself when the path has none — 2 of 39 slots at the time of writing); a
 * review that has fallen due; a saved, uncompleted lesson; the first
 * unvisited lesson; a "getting there" lesson; the most recently visited.
 */
export function computeJourneyRecommendation(
  state: JourneyState | null,
  threadIds: string[],
  prerequisites?: PathLessonPrerequisites,
): JourneyRecommendation | null {
  if (threadIds.length === 0) return null;

  const total = threadIds.length;
  if (!state) {
    return {
      kind: "continue",
      threadId: threadIds[0],
      current: 1,
      total,
      reason: "Start at the beginning.",
    };
  }

  const threadStates = threadIds.map((threadId, index) => ({
    threadId,
    index,
    state: state.threads[threadId],
  }));

  const lowConfidence = threadStates.find((entry) => entry.state?.confidence === "low");
  if (lowConfidence) {
    // The map is built from content and the thread list comes from the page;
    // trust only prerequisites that are actually on this path.
    const prerequisite = (prerequisites?.[lowConfidence.threadId] ?? []).find((id) =>
      threadIds.includes(id),
    );
    if (prerequisite && prerequisite !== lowConfidence.threadId) {
      const index = threadIds.indexOf(prerequisite);
      return {
        kind: "practice",
        threadId: prerequisite,
        current: index + 1,
        total,
        // The map orders earlier lessons first, so a later one is only
        // reached when no earlier lesson on the path teaches a prerequisite.
        // That is the forward case entry 269 counted (84 edges, 40% of the
        // on-path prerequisites): the fix is not to go back but to go on.
        reason:
          index < lowConfidence.index
            ? "You marked a later lesson as still shaky. This one teaches what it builds on."
            : "The lesson that teaches what this one builds on comes next; keep going.",
        remediates: lowConfidence.threadId,
      };
    }

    return {
      kind: "practice",
      threadId: lowConfidence.threadId,
      current: lowConfidence.index + 1,
      total,
      reason: "You marked this lesson as still shaky.",
    };
  }

  const dueReview = threadStates.find(
    (entry) => state.reviewQueue.includes(entry.threadId) && isReviewDue(entry.state?.reviewDueAt),
  );
  if (dueReview) {
    return {
      kind: "review",
      threadId: dueReview.threadId,
      current: dueReview.index + 1,
      total,
      reason: "Your scheduled review is ready.",
    };
  }

  const savedThread = threadStates.find(
    (entry) => Boolean(entry.state?.savedAt) && !entry.state?.completedAt,
  );
  if (savedThread) {
    return {
      kind: "review",
      threadId: savedThread.threadId,
      current: savedThread.index + 1,
      total,
      reason: "You saved this lesson to return to.",
    };
  }

  const nextThread = threadIds.find((threadId) => !state.visitedThreads.includes(threadId));
  if (nextThread) {
    const index = threadIds.indexOf(nextThread);
    return {
      kind: "continue",
      threadId: nextThread,
      current: index + 1,
      total,
      reason: index === 0 ? "Start at the beginning." : "Keep moving through the path.",
    };
  }

  const mediumConfidence = threadStates.find((entry) => entry.state?.confidence === "medium");
  if (mediumConfidence) {
    return {
      kind: "review",
      threadId: mediumConfidence.threadId,
      current: mediumConfidence.index + 1,
      total,
      reason: "A quick review will help lock this in.",
    };
  }

  const mostRecentThread = threadStates
    .filter((entry) => entry.state?.lastVisitedAt)
    .sort(
      (a, b) => Date.parse(b.state?.lastVisitedAt ?? "") - Date.parse(a.state?.lastVisitedAt ?? ""),
    )[0];

  if (mostRecentThread) {
    return {
      kind: "review",
      threadId: mostRecentThread.threadId,
      current: mostRecentThread.index + 1,
      total,
      reason: "Revisit your most recent lesson.",
    };
  }

  return null;
}

/**
 * The lessons in `threadIds` the record marks completed, in the order given.
 * Pure, so the page components can subtract them from a count.
 *
 * The record is keyed by lesson id and never by path, so a lesson completed
 * on Improv for Everyday Life is completed on Systems of Improv too — the
 * syllabus ticks already read it that way, but the header's "4 lessons ·
 * 41 min" and the next-path card counted every lesson whatever the record
 * said (tracker entry 295, 2026-09-22). This is what they subtract.
 */
export function completedLessons(state: JourneyState | null, threadIds: string[]): string[] {
  if (!state) return [];
  return threadIds.filter((id) => Boolean(state.threads[id]?.completedAt));
}

export function formatJourneyRecency(timestamp: string): string {
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return "recently";

  const diff = Date.now() - time;

  if (diff < DAY_IN_MS) return "today";
  if (diff < DAY_IN_MS * 2) return "yesterday";

  const days = Math.round(diff / DAY_IN_MS);
  if (days < 7) return `${days} days ago`;

  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;

  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatJourneyDueDate(timestamp: string): string {
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) return "soon";

  const diff = time - Date.now();
  if (diff <= 0) return "today";
  if (diff < DAY_IN_MS * 1.5) return "tomorrow";

  const days = Math.round(diff / DAY_IN_MS);
  if (days < 7) return `in ${days} days`;

  return new Date(time).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function clearJourney(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
}
