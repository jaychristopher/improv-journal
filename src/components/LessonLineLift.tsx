"use client";

import { type ReactNode, useSyncExternalStore } from "react";

/**
 * One secondary lesson line of the concept page's foot card: the lesson it
 * continues and the rendered step ("Next in Lesson: X" or "Back to Lesson").
 */
export interface LiftableLine {
  lessonId: string;
  step: ReactNode;
}

interface LessonLineLiftProps {
  /** The lines past the primary, in the server's order — the primary is the card's anchor and not here. */
  lines: LiftableLine[];
  /** How many of them the card shows open; the rest fold under "and N more lessons". */
  open: number;
}

/**
 * The lesson a referrer is a page of: `/threads/<id>` on the same origin, or
 * null. Trailing slashes, a query and a hash are tolerated because the lesson
 * page's own links carry none but a share or a tracker may add them; a
 * different origin is not, because a lesson slug on another site is not one
 * of ours. Exported so the parse is checked without a document.
 */
export function lessonIdFromReferrer(referrer: string, origin: string): string | null {
  if (!referrer) return null;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  const match = url.pathname.match(/^\/threads\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

/**
 * The lesson the reader came from. Every access is guarded: `document.referrer`
 * throws in some sandboxed and privacy contexts, and a throw here would take
 * the card's lines with it where a null costs nothing.
 */
function referredLessonId(): string | null {
  try {
    return lessonIdFromReferrer(document.referrer, window.location.origin);
  } catch {
    return null;
  }
}

/** The referrer is fixed for the life of the page, so there is nothing to subscribe to. */
const subscribeToNothing = () => () => {};
/** What the server knows of the referrer: nothing — and hydration renders this before the client's read. */
const serverReferredLessonId = () => null;

/**
 * Lifts the line of the lesson the reader came from to the top of the card's
 * secondary lines, and out of the fold if it sat there.
 *
 * The card carries a line per lesson the concept sits in, the primary first
 * and 3 open (tracker entry 326), and static HTML cannot know which lesson
 * the reader is walking — so a reader mid-way through the 4th lesson a
 * concept sits in found their next step under "and 2 more lessons". The
 * server renders the primary's order and this reads `document.referrer` once
 * hydrated; when it is a lesson among the lines, that line moves first. The
 * open count is unchanged, so the only movement is the reorder: a lifted
 * folded line pushes the last open line into the fold and "and N more" keeps
 * its number. No referrer, a referrer off-site or off a lesson, or a lesson
 * the card does not carry (the primary among them — its step is already the
 * anchor) leaves the server's order standing.
 */
export function LessonLineLift({ lines, open }: LessonLineLiftProps) {
  // A store rather than an effect: the value is read once from the browser,
  // the server snapshot is null so hydration matches the static HTML, and
  // React re-renders with the client's read straight after. An effect that
  // set state would do the same with a cascading render the lint forbids.
  const referred = useSyncExternalStore(
    subscribeToNothing,
    referredLessonId,
    serverReferredLessonId,
  );
  const lifted = referred && lines.some((line) => line.lessonId === referred) ? referred : null;

  const ordered = lifted
    ? [...lines.filter((l) => l.lessonId === lifted), ...lines.filter((l) => l.lessonId !== lifted)]
    : lines;
  const shown = ordered.slice(0, open);
  const folded = ordered.slice(open);

  const item = (line: LiftableLine) => (
    <li
      key={line.lessonId}
      data-lesson-id={line.lessonId}
      data-lifted={line.lessonId === lifted ? "true" : undefined}
    >
      {line.step}
    </li>
  );

  return (
    <>
      <ul className="text-foreground/60 mt-2 space-y-1 text-sm leading-relaxed">
        {shown.map(item)}
      </ul>
      {folded.length > 0 && (
        <details className="text-foreground/60 mt-1 text-sm leading-relaxed">
          <summary className="text-foreground/40 relative cursor-pointer">
            and {folded.length} more {folded.length === 1 ? "lesson" : "lessons"}
          </summary>
          <ul className="mt-1 space-y-1">{folded.map(item)}</ul>
        </details>
      )}
    </>
  );
}
