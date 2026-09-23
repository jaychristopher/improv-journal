"use client";

import { useEffect } from "react";

/**
 * One key for every lesson: a reader who closed the panel on one lesson
 * closed the furniture, not that lesson's list of it. The stored value is
 * only ever "closed"; open is the absence of a value, which is also what a
 * private window, cleared site data or a blocked storage reads as.
 */
export const LESSON_PANEL_STORAGE_KEY = "lesson-panel";

/** The browser's localStorage, or null where touching it throws. */
export function panelStorage(): Storage | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Whether the viewer closed the panel before. Never throws. */
export function readPanelClosed(storage: Storage | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(LESSON_PANEL_STORAGE_KEY) === "closed";
  } catch {
    return false;
  }
}

/** Remember the panel's state. Never throws; a storage that refuses is forgotten. */
export function rememberPanelOpen(storage: Storage | null, open: boolean): void {
  if (!storage) return;
  try {
    if (open) storage.removeItem(LESSON_PANEL_STORAGE_KEY);
    else storage.setItem(LESSON_PANEL_STORAGE_KEY, "closed");
  } catch {
    // A quota error or a storage the browser blocks: the panel still toggles.
  }
}

/**
 * Remembers whether the viewer closed the "About this lesson" panel.
 *
 * The panel is a server-rendered `<details open>` in LessonPanel.tsx, so the
 * lists inside it are in the HTML for every reader and crawler; this renders
 * nothing and only reaches the element by id after hydration, closes it when
 * the viewer closed it before, and records each toggle. The page must read
 * the same with no stored value and with a storage that throws, so every
 * touch of storage goes through the helpers above.
 */
export function LessonPanelToggle({ target }: { target: string }) {
  useEffect(() => {
    const details = document.getElementById(target);
    if (!(details instanceof HTMLDetailsElement)) return;
    const storage = panelStorage();
    if (readPanelClosed(storage)) details.open = false;
    const onToggle = () => rememberPanelOpen(storage, details.open);
    details.addEventListener("toggle", onToggle);
    return () => details.removeEventListener("toggle", onToggle);
  }, [target]);

  return null;
}
