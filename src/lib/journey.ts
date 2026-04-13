/**
 * Client-side journey state management.
 * Tracks which path the user is on and which threads they've visited.
 * All state persisted in localStorage — no database needed.
 */

const STORAGE_KEY = "improv-journey";

export interface JourneyState {
  pathId: string;
  visitedThreads: string[];
  startedAt: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getJourneyState(): JourneyState | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as JourneyState;
  } catch {
    return null;
  }
}

function saveState(state: JourneyState): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function setCurrentPath(pathId: string): void {
  const existing = getJourneyState();
  if (existing?.pathId === pathId) return;
  saveState({
    pathId,
    visitedThreads: existing?.visitedThreads ?? [],
    startedAt: existing?.startedAt ?? new Date().toISOString(),
  });
}

export function markThreadVisited(threadId: string): void {
  const state = getJourneyState();
  if (!state) return;
  if (state.visitedThreads.includes(threadId)) return;
  saveState({
    ...state,
    visitedThreads: [...state.visitedThreads, threadId],
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
  return null; // all visited
}

export function clearJourney(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEY);
}
