// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { lessonIdFromReferrer, LessonLineLift } from "@/components/LessonLineLift";
import { WhatsNext } from "@/components/WhatsNext";
import type { LessonLine } from "@/lib/whats-next";

const ORIGIN = "https://www.physicsofconnection.com";
const LIFT = path.join(process.cwd(), "src", "components", "LessonLineLift.tsx");
const WHATS_NEXT = path.join(process.cwd(), "src", "components", "WhatsNext.tsx");

/**
 * jsdom's `document.referrer` is read-only and empty; the tests set it per
 * case the way a browser would have, and reset it after each.
 */
function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", { value, configurable: true });
}

/** A concept in 5 lessons: the primary is the anchor, so 4 lines reach the block. */
function lessons(n: number): LessonLine[] {
  return Array.from({ length: n }, (_, i) => ({
    lessonId: `lesson-${i}`,
    lessonTitle: `Lesson ${i}`,
    lessonHref: `/threads/lesson-${i}`,
    next: { title: `Concept ${i}`, href: `/practice/vocabulary/concept-${i}` },
  }));
}

function lineIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-lesson-id]")).map(
    (li) => li.getAttribute("data-lesson-id") ?? "",
  );
}

/** The lines outside the fold, in order. */
function openIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("[data-lesson-id]"))
    .filter((li) => li.closest("details") === null)
    .map((li) => li.getAttribute("data-lesson-id") ?? "");
}

/**
 * The concept page's foot card carries a line per lesson the concept sits in,
 * primary first, 3 open and the rest folded (tracker entry 326). The static
 * HTML cannot know which lesson the reader came from, so a reader walking
 * the 4th lesson a concept sits in found their next step under "and 2 more
 * lessons". LessonLineLift reads the referrer after mount and lifts that
 * lesson's line first. These hold the parse, the lift and the wiring, and
 * that a missing or foreign referrer leaves the server's order alone.
 */
describe("lessonIdFromReferrer", () => {
  it("reads the lesson id from a same-origin lesson page", () => {
    expect(lessonIdFromReferrer(`${ORIGIN}/threads/anatomy-of-a-scene`, ORIGIN)).toBe(
      "anatomy-of-a-scene",
    );
  });

  it("tolerates a trailing slash, a query and a hash", () => {
    expect(lessonIdFromReferrer(`${ORIGIN}/threads/anatomy-of-a-scene/`, ORIGIN)).toBe(
      "anatomy-of-a-scene",
    );
    expect(lessonIdFromReferrer(`${ORIGIN}/threads/anatomy-of-a-scene?utm=x`, ORIGIN)).toBe(
      "anatomy-of-a-scene",
    );
    expect(lessonIdFromReferrer(`${ORIGIN}/threads/anatomy-of-a-scene#step-2`, ORIGIN)).toBe(
      "anatomy-of-a-scene",
    );
  });

  it("returns null for another origin, even on a lesson path", () => {
    expect(lessonIdFromReferrer("https://example.com/threads/anatomy-of-a-scene", ORIGIN)).toBe(
      null,
    );
    // The apex redirects to www, so a referrer on it is not this origin either.
    expect(
      lessonIdFromReferrer("https://physicsofconnection.com/threads/anatomy-of-a-scene", ORIGIN),
    ).toBe(null);
  });

  it("returns null for a non-lesson path, the lessons hub and an empty or malformed referrer", () => {
    expect(lessonIdFromReferrer(`${ORIGIN}/how-to-read-the-room`, ORIGIN)).toBe(null);
    expect(lessonIdFromReferrer(`${ORIGIN}/threads`, ORIGIN)).toBe(null);
    expect(lessonIdFromReferrer(`${ORIGIN}/threads/`, ORIGIN)).toBe(null);
    expect(lessonIdFromReferrer(`${ORIGIN}/threads/x/y`, ORIGIN)).toBe(null);
    expect(lessonIdFromReferrer("", ORIGIN)).toBe(null);
    expect(lessonIdFromReferrer("not a url", ORIGIN)).toBe(null);
  });
});

describe("LessonLineLift", () => {
  afterEach(() => {
    cleanup();
    setReferrer("");
  });

  const lines = lessons(5)
    .slice(1)
    .map((line) => ({ lessonId: line.lessonId, step: <span>{line.lessonTitle}</span> }));

  it("keeps the server's order and fold with no referrer", () => {
    setReferrer("");
    const { container } = render(<LessonLineLift lines={lines} open={2} />);
    expect(lineIds(container)).toEqual(["lesson-1", "lesson-2", "lesson-3", "lesson-4"]);
    expect(openIds(container)).toEqual(["lesson-1", "lesson-2"]);
    expect(container.querySelector("details")).not.toBeNull();
    expect(container.querySelector("summary")?.textContent).toContain("and 2 more lessons");
    expect(container.querySelector("[data-lifted]")).toBeNull();
  });

  it("lifts the referrer's lesson out of the fold to the top, keeping the open count", () => {
    setReferrer(`${window.location.origin}/threads/lesson-4`);
    const { container } = render(<LessonLineLift lines={lines} open={2} />);
    expect(lineIds(container)).toEqual(["lesson-4", "lesson-1", "lesson-2", "lesson-3"]);
    expect(openIds(container)).toEqual(["lesson-4", "lesson-1"]);
    // The lifted line pushes 1 open line into the fold, so the count holds.
    expect(container.querySelector("summary")?.textContent).toContain("and 2 more lessons");
    const lifted = container.querySelector('[data-lifted="true"]');
    expect(lifted?.getAttribute("data-lesson-id")).toBe("lesson-4");
    expect(container.querySelectorAll("[data-lifted]").length).toBe(1);
  });

  it("lifts an already-open line to the top too", () => {
    setReferrer(`${window.location.origin}/threads/lesson-2`);
    const { container } = render(<LessonLineLift lines={lines} open={2} />);
    expect(openIds(container)).toEqual(["lesson-2", "lesson-1"]);
    expect(container.querySelector('[data-lifted="true"]')?.getAttribute("data-lesson-id")).toBe(
      "lesson-2",
    );
  });

  it("leaves the order alone when the referrer is a lesson the card does not carry", () => {
    // The primary is not among the lines — its step is the card's anchor.
    setReferrer(`${window.location.origin}/threads/lesson-0`);
    const { container } = render(<LessonLineLift lines={lines} open={2} />);
    expect(lineIds(container)).toEqual(["lesson-1", "lesson-2", "lesson-3", "lesson-4"]);
    expect(container.querySelector("[data-lifted]")).toBeNull();
  });

  it("leaves the order alone when the referrer is off-site or not a lesson", () => {
    setReferrer("https://example.com/threads/lesson-4");
    const offSite = render(<LessonLineLift lines={lines} open={2} />);
    expect(lineIds(offSite.container)).toEqual(["lesson-1", "lesson-2", "lesson-3", "lesson-4"]);
    cleanup();
    setReferrer(`${window.location.origin}/paths/lesson-4`);
    const notLesson = render(<LessonLineLift lines={lines} open={2} />);
    expect(lineIds(notLesson.container)).toEqual(["lesson-1", "lesson-2", "lesson-3", "lesson-4"]);
    expect(notLesson.container.querySelector("[data-lifted]")).toBeNull();
  });

  it("guards every document access, and is a client component", () => {
    const src = fs.readFileSync(LIFT, "utf-8");
    expect(src.startsWith('"use client";')).toBe(true);
    // The referrer read sits inside a try so a throwing document costs the
    // card nothing; the parse is a pure function so the test above needs none.
    expect(src).toMatch(/try \{\s*return lessonIdFromReferrer\(document\.referrer[\s\S]*?\} catch/);
    expect(src).toContain("export function lessonIdFromReferrer(");
    // Read through a store with a null server snapshot, so the hydrated
    // markup matches the static HTML before the client's read reorders it.
    expect(src).toContain("useSyncExternalStore(");
    expect(src).not.toContain("useEffect(");
  });
});

describe("WhatsNext mounts the lift", () => {
  afterEach(() => {
    cleanup();
    setReferrer("");
  });

  it("wraps the secondary lines block in the tracked div and gives each line its lesson id", () => {
    const src = fs.readFileSync(WHATS_NEXT, "utf-8");
    // The block keeps its tracking name for the delegated listener
    // (link-tracking.test.ts) and hands the lines to the lift.
    const block = src.slice(src.indexOf('data-track="next-in-lesson"'));
    expect(block.length).toBeGreaterThan(0);
    expect(block.slice(0, block.indexOf("</div>"))).toContain("<LessonLineLift");
    expect(src).toContain("lessonId: line.lessonId");
    expect(src).toContain("open={LESSON_LINES_SHOWN - 1}");
  });

  it("renders a data-lesson-id line per secondary lesson, primary excluded, in the server's order", () => {
    const all = lessons(5);
    const { container } = render(
      <WhatsNext
        variant="next-atom"
        title="Concept 0"
        href="/practice/vocabulary/concept-0"
        lessons={all}
      />,
    );
    const block = container.querySelector('[data-track="next-in-lesson"]');
    expect(block).not.toBeNull();
    expect(lineIds(block as HTMLElement)).toEqual(["lesson-1", "lesson-2", "lesson-3", "lesson-4"]);
    // 3 open with the anchor counted: 2 lines here, 2 in the fold.
    expect(openIds(block as HTMLElement)).toEqual(["lesson-1", "lesson-2"]);
    expect(block?.querySelector("summary")?.textContent).toContain("and 2 more lessons");
    // The anchor rule (cta-anchor.test.ts) still holds beside the lift: the
    // title alone is the stretched link, and each line's link sits above it.
    const anchor = container.querySelector("a.after\\:absolute");
    expect(anchor?.textContent).toBe("Concept 0");
    for (const link of block?.querySelectorAll("a") ?? []) {
      expect(link.className).toContain("relative");
    }
    expect(container.querySelector("[data-derived]")).not.toBeNull();
  });

  it("lifts the referrer's lesson through the card", () => {
    setReferrer(`${window.location.origin}/threads/lesson-3`);
    const { container } = render(
      <WhatsNext
        variant="back-to-thread"
        threadTitle="Lesson 0"
        threadHref="/threads/lesson-0"
        lessons={lessons(5)}
      />,
    );
    const block = container.querySelector('[data-track="next-in-lesson"]') as HTMLElement;
    expect(openIds(block)).toEqual(["lesson-3", "lesson-1"]);
    expect(block.querySelector('[data-lifted="true"]')?.getAttribute("data-lesson-id")).toBe(
      "lesson-3",
    );
  });
});
