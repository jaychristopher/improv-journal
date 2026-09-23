import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";
import { computeJourneyRecommendation, type JourneyState } from "../journey";
import { getLessonPrerequisites } from "../journey-prerequisites";
import { getForwardPrerequisites } from "../path-prerequisites";

/**
 * Read as a schedule, the paths teach 40% of their own prerequisites after
 * the lesson that needs them: of the 208 `requires` edges between two
 * lessons on the same path, 84 point at a later lesson, and Mastering the
 * Form runs entirely backwards — *Beyond the Harold* composes `harold`,
 * `montage` and `armando`, all of which require `editing`, taught second by
 * *Show as Architecture* (tracker entry 269, 2026-09-22).
 *
 * `getForwardPrerequisites` names, per lesson, the concepts a later lesson
 * on the same path teaches and no earlier one does; the path page renders
 * them as "What this order assumes" beside "Why this order", and the
 * syllabus router's fallback for a shaky lesson whose prerequisites sit
 * later says so instead of sending the reader back.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

/**
 * Forward needs counted at the concept: one lesson needing `editing` from a
 * later lesson is one need however many of its atoms require it. Entry
 * 269's 84 is the atom-edge count of the same relation (reproduced exactly
 * by an edge-level recount on 2026-09-22); the concept-level figure was 56
 * across 21 of 39 lesson slots, with 26 mutual pairs. A ceiling, not a
 * floor: the author's reorders (Mastering the Form, Advanced Game and
 * Character can both reach zero by swapping neighbours) lower it, and a
 * changed `threads` list that raises it is what this test is for. Lower it
 * when the number falls; do not raise it.
 *
 * Fell 56 → 24 on 2026-09-22 when the needs were re-read from the atoms'
 * direct prerequisites (direct-requires.ts, tracker entry 277) rather than
 * the declared closure: 14 of 39 slots, 8 mutual. A lesson whose atoms
 * named `commitment`, `be-present` and `active-listening` was owed the knot
 * three times by a later lesson teaching one member of it; now it is owed
 * the one member the atoms need next, and Advanced Game and Character and
 * Beginner Foundations owe nothing forward at all. No thread list changed.
 *
 * Then 24 → 19 the same day, when the member that stands for the knot
 * stopped being the need. Entry 315 moved that member from the
 * first-declared to the most-required, and read as the prerequisite it
 * put the count at 32 across 19 slots, 11 mutual: Beginner Foundations
 * owed `commitment` from lesson 2 in lesson 1, where the day before it had
 * needed `active-listening` from lesson 1 — the same atoms, the same
 * lessons, a different name on the same knot. A core need is now one need
 * satisfied by any member an earlier lesson (or the lesson itself)
 * composes (`requireSets`), and is printed under the member the later
 * lesson teaches: 19 concepts across 11 of 39 slots, 2 mutual. Still no
 * thread list changed.
 */
const FORWARD_CONCEPT_CEILING = 19; // 2026-09-22, after entry 315 read as a set

describe("forward prerequisites on the paths", () => {
  it("names the concepts each lesson needs from a later lesson", async () => {
    const paths = await loadPaths();
    // Guard the guard.
    expect(paths.length).toBeGreaterThanOrEqual(10);
    const slots = paths.reduce((sum, p) => sum + (p.frontmatter.threads ?? []).length, 0);
    expect(slots).toBeGreaterThanOrEqual(20);

    let concepts = 0;
    let affected = 0;
    for (const p of paths) {
      const threadIds = p.frontmatter.threads ?? [];
      const needs = await getForwardPrerequisites(p.frontmatter.id);
      for (const lesson of needs) {
        affected += 1;
        concepts += lesson.needs.length;
        // Only lessons with a need are listed, and each is on the path.
        expect(lesson.needs.length, `${p.frontmatter.id}/${lesson.lessonId}`).toBeGreaterThan(0);
        expect(threadIds[lesson.position - 1]).toBe(lesson.lessonId);
        // Deduplicated per lesson.
        const ids = lesson.needs.map((n) => n.atomId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const need of lesson.needs) {
          // The teaching lesson is later — that is the whole point.
          expect(need.taughtBy.position, `${lesson.lessonId} needs ${need.atomId}`).toBeGreaterThan(
            lesson.position,
          );
          expect(threadIds[need.taughtBy.position - 1]).toBe(need.taughtBy.id);
          expect(need.url).toMatch(/^\//);
          expect(need.title.length).toBeGreaterThan(0);
        }
        // `mutual` is the flag for `mutualWith`, and a mutual partner is one
        // of the lessons this one takes a need from.
        expect(lesson.mutual).toBe(lesson.mutualWith.length > 0);
        const teachers = new Set(lesson.needs.map((n) => n.taughtBy.id));
        for (const other of lesson.mutualWith) expect(teachers.has(other.id)).toBe(true);
      }
    }

    // Population: the relation exists in the corpus. 11 slots and 19
    // concepts with the knot read as one need (14 and 24 under the
    // reduction alone, 21 and 56 under the closure).
    expect(affected).toBeGreaterThanOrEqual(10);
    expect(concepts).toBeGreaterThanOrEqual(15);
    expect(concepts).toBeLessThanOrEqual(FORWARD_CONCEPT_CEILING);
  });

  /**
   * The direct prerequisites of a lesson's atoms are what it needs from a
   * later lesson — not what those need in turn. *The Game Beneath the Game*
   * declared `be-present` through atoms whose next prerequisite is
   * elsewhere, so under the closure Advanced Game and Character owed one
   * forward need; under the reduction it owes none, and neither does
   * Beginner Foundations, whose two lessons each teach the other's door
   * into the knot (entry 277). The negative half of the block, which had no
   * subject in the corpus until then.
   *
   * Beginner Foundations is the case that shows why the knot must be read
   * as a set. Its first lesson composes `active-listening` and `offers`,
   * its second `commitment`, and every atom on it that needs the core
   * needs it through those. Under entry 315's representative, taken as the
   * need, lesson 1 owed `commitment` from lesson 2 — the door it teaches
   * itself no longer counted because a different member wore the label.
   * A lesson that composes a member of the core does not owe the core.
   */
  it("owes nothing forward on the two paths whose lessons need next only what came earlier", async () => {
    for (const pathId of ["advanced-game-and-character", "beginner-foundations"]) {
      expect(await getForwardPrerequisites(pathId), pathId).toEqual([]);
    }
  });

  it("finds Mastering the Form needing Editing from lesson 2 in lesson 1", async () => {
    const needs = await getForwardPrerequisites("mastering-the-form");
    const first = needs.find((lesson) => lesson.position === 1);
    expect(first?.lessonId).toBe("beyond-the-harold");
    const editing = first?.needs.find((n) => n.atomId === "editing");
    expect(editing?.taughtBy).toMatchObject({ id: "show-as-architecture", position: 2 });
    // Show as Architecture requires nothing from Beyond the Harold, so the
    // order is fixable by a swap, not a knot.
    expect(first?.mutual).toBe(false);
  });

  it("returns nothing for an unknown path", async () => {
    expect(await getForwardPrerequisites("no-such-path")).toEqual([]);
  });

  /**
   * The router's fallback. When no earlier lesson on the path teaches a
   * shaky lesson's prerequisites but a later one does, the map (earlier
   * first, then later) already hands the router that later lesson; before
   * 2026-09-22 the reason read as if the reader were being sent back.
   */
  it("tells a shaky reader to keep going when the prerequisite lesson is later", async () => {
    const map = await getLessonPrerequisites();
    const threadIds = ["beyond-the-harold", "show-as-architecture"];
    const state: JourneyState = {
      pathId: "mastering-the-form",
      visitedThreads: ["beyond-the-harold"],
      reviewQueue: [],
      startedAt: "2026-09-22T12:00:00.000Z",
      threads: {
        "beyond-the-harold": { lastVisitedAt: "2026-09-22T12:00:00.000Z", confidence: "low" },
      },
    };
    expect(computeJourneyRecommendation(state, threadIds, map["mastering-the-form"])).toMatchObject(
      {
        kind: "practice",
        threadId: "show-as-architecture",
        current: 2,
        remediates: "beyond-the-harold",
        reason: "The lesson that teaches what this one builds on comes next; keep going.",
      },
    );
  });

  it.runIf(built)("renders the block on the built Mastering the Form page", () => {
    const html = fs.readFileSync(path.join(APP, "paths", "mastering-the-form.html"), "utf-8");
    expect(html).toContain('data-track="path-forward-needs"');
    const section = html.split('data-track="path-forward-needs"')[1]?.split("</section>")[0] ?? "";
    const text = section.replace(/<[^>]+>/g, "").replace(/\s+/g, " ");
    expect(text).toContain("What this order assumes");
    expect(text).toContain("Lesson 1 needs from later: Editing (taught in lesson 2)");
    expect(section).toContain('href="/threads/show-as-architecture"');
    expect(text).not.toContain("lean on each other");
  });

  /** And no block on a path that owes nothing forward (the negative half above). */
  it.runIf(built)("renders no block on the built Beginner Foundations page", () => {
    const html = fs.readFileSync(path.join(APP, "paths", "beginner-foundations.html"), "utf-8");
    expect(html).not.toContain('data-track="path-forward-needs"');
    expect(html).not.toContain("What this order assumes");
  });
});
