/**
 * Client-side journey state management.
 * Tracks path progress, review scheduling, practice reps, and recency in local storage.
 */

const STORAGE_KEY = "improv-journey";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type ConfidenceLevel = "low" | "medium" | "high";

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
}

export interface JourneyState {
  pathId: string;
  visitedThreads: string[];
  reviewQueue: string[];
  startedAt: string;
  lastThreadId?: string;
  threads: Record<string, ThreadJourneyState>;
}

export interface JourneyRecommendation {
  kind: "continue" | "review" | "practice";
  threadId: string;
  current: number;
  total: number;
  reason: string;
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
  };
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

  return {
    pathId: typeof raw.pathId === "string" ? raw.pathId : "",
    visitedThreads,
    reviewQueue,
    startedAt,
    lastThreadId: typeof raw.lastThreadId === "string" ? raw.lastThreadId : undefined,
    threads,
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

export function scheduleThreadReview(threadId: string, delayDays = 1): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = addToReviewQueue(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    reviewQueuedAt: now,
    reviewDueAt: addDays(now, delayDays),
  }));

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

export function markThreadReviewed(threadId: string): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = removeFromReviewQueue(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    reviewQueuedAt: undefined,
    reviewDueAt: undefined,
    lastReviewedAt: now,
    timesReviewed: (threadState.timesReviewed ?? 0) + 1,
  }));

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
}

export function markThreadPracticed(threadId: string): void {
  if (!threadId) return;

  const now = new Date().toISOString();
  let nextState = getOrCreateState();
  nextState = ensureVisited(nextState, threadId);
  nextState = updateThreadState(nextState, threadId, (threadState) => ({
    ...threadState,
    lastVisitedAt: threadState.lastVisitedAt || now,
    lastPracticedAt: now,
    timesPracticed: (threadState.timesPracticed ?? 0) + 1,
  }));

  saveState({
    ...nextState,
    lastThreadId: threadId,
  });
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
    reviewDueAt: completed ? (threadState.reviewDueAt ?? addDays(now, 1)) : undefined,
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

export function isThreadVisited(threadId: string): boolean {
  const state = getJourneyState();
  if (!state) return false;
  return state.visitedThreads.includes(threadId);
}

export function getNextUnvisitedThread(threadIds: string[]): string | null {
  const state = getJourneyState();
  if (!state) return threadIds[0] ?? null;

  for (const id of threadIds) {
    if (!state.visitedThreads.includes(id)) return id;
  }

  return null;
}

export function getJourneyRecommendation(threadIds: string[]): JourneyRecommendation | null {
  if (threadIds.length === 0) return null;

  const total = threadIds.length;
  const state = getJourneyState();
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
