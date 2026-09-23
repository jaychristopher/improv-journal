import { describe, expect, it } from "vitest";

import { cohortOf } from "../atom-rank";
import { loadAtoms, loadBridges, loadThreads } from "../content";

/**
 * The curriculum stopped in April.
 *
 * The 30 August concepts — 10 formats, 10 exercises, 4 definitions, 3
 * techniques, 2 frameworks, 1 antipattern; the 46 August atoms less the 16
 * references — are composed by 0 of the 25 lessons and declared by 3 of the
 * 78 guides, against 100% and 93% for the March concepts and 95% and 46%
 * for April's (tracker entry 308, 2026-09-22). The lessons' `atoms` lists
 * were written in April and have never changed (entry 170); the guides'
 * `entry_atoms` were declared in April and August and the August guides
 * declared the April atoms. So every derived route that starts from a
 * lesson or a guide declaration — the concept block, the hand-off, the
 * drill rows, the leans-on lists, the journey map, the episode notes —
 * cannot reach the August cohort, and the routes that can ranked it last
 * by in-degree until entry 307 was applied.
 *
 * 27 of the 30 sit in neither: the short-form games set, the warm-ups the
 * picker's beginner level opens with, Wimping and Specificity. That is the
 * named debt below, and it is content authoring — a one-line frontmatter
 * change per lesson or guide — not code. The floors here are the readings:
 * composed and declared may only rise, the neither-list may only shrink,
 * and a lesson or guide that reaches one of the 27 shows up as a failure
 * here that is fixed by removing the id from the list.
 */

/** The August concepts no lesson composes and no guide declares, 2026-09-22. */
const IN_NEITHER = [
  "alphabet-game",
  "big-booty",
  "bippity-bippity-bop",
  "blind-line",
  "blocking-taxonomy",
  "bus-stop",
  "deconstruction",
  "meisner-technique",
  "monoscene",
  "one-word-story",
  "party-quirks",
  "pass-the-clap",
  "premise",
  "questions-only",
  "sound-ball",
  "specificity",
  "story-spine",
  "story-story-die",
  "superheroes",
  "the-machine",
  "tilt",
  "two-headed-expert",
  "what-are-you-doing",
  "wimping",
  "worlds-worst",
  "yes-lets",
  "zip-zap-zop",
];

async function reach() {
  const [atoms, threads, bridges] = await Promise.all([loadAtoms(), loadThreads(), loadBridges()]);
  const concepts = atoms.filter(
    (a) => cohortOf(a.frontmatter) === "2026-08" && a.frontmatter.type !== "reference",
  );
  const composed = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
  const declared = new Set(bridges.flatMap((b) => b.frontmatter.entry_atoms ?? []));
  const ids = concepts.map((a) => a.frontmatter.id);
  return {
    atoms,
    threads,
    bridges,
    concepts,
    inLesson: ids.filter((id) => composed.has(id)),
    inGuide: ids.filter((id) => declared.has(id)),
    inNeither: ids.filter((id) => !composed.has(id) && !declared.has(id)),
  };
}

describe("august reach", () => {
  it("has the population the readings were taken on", async () => {
    const { atoms, threads, bridges, concepts } = await reach();
    expect(atoms.length).toBeGreaterThanOrEqual(205);
    expect(threads.length).toBeGreaterThanOrEqual(25);
    expect(bridges.length).toBeGreaterThanOrEqual(78);
    // 30 August concepts; the type split is the entry's.
    expect(concepts.length).toBeGreaterThanOrEqual(30);
    const byType = new Map<string, number>();
    for (const a of concepts) {
      byType.set(a.frontmatter.type, (byType.get(a.frontmatter.type) ?? 0) + 1);
    }
    expect(byType.get("format")).toBeGreaterThanOrEqual(10);
    expect(byType.get("exercise")).toBeGreaterThanOrEqual(10);
    expect(byType.get("definition")).toBeGreaterThanOrEqual(4);
    expect(byType.get("technique")).toBeGreaterThanOrEqual(3);
    // And the older cohorts are reached, so the gap is the cohort's and not
    // the measure's: every March concept sits in a lesson.
    const composed = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
    const march = atoms.filter(
      (a) => cohortOf(a.frontmatter) === "2026-03" && a.frontmatter.type !== "reference",
    );
    expect(march.length).toBeGreaterThanOrEqual(27);
    expect(march.filter((a) => composed.has(a.frontmatter.id)).length).toBe(march.length);
  });

  it("composes August concepts in lessons: 0 today, a floor that may only rise", async () => {
    const { inLesson, concepts } = await reach();
    // 0 of 30 on 2026-09-22. The entry's first adoption bullet: the two
    // performer paths' lessons compose the August formats and drills they
    // are about, and Foundations' Building on Offers gains Specificity.
    expect(inLesson.length).toBeGreaterThanOrEqual(0);
    expect(inLesson.length).toBeLessThanOrEqual(concepts.length);
  });

  it("declares August concepts in guides: 3 today, a floor that may only rise", async () => {
    const { inGuide, concepts } = await reach();
    // diagnosing-scene-failure, spontaneity, viewpoints on 2026-09-22. The
    // guides that backtick the August games in their bodies (9 of them)
    // could declare them; that is the entry's second bullet.
    expect(inGuide.length).toBeGreaterThanOrEqual(3);
    expect(inGuide.length).toBeLessThanOrEqual(concepts.length);
    for (const id of ["diagnosing-scene-failure", "spontaneity", "viewpoints"]) {
      expect(inGuide, id).toContain(id);
    }
  });

  it("names the 27 in neither, a list that may only shrink", async () => {
    const { inNeither } = await reach();
    // Every concept still in neither is one the list names; a concept the
    // list names that a lesson or guide now reaches fails the second check,
    // and the fix is to strike it from the list.
    const unlisted = inNeither.filter((id) => !IN_NEITHER.includes(id));
    expect(unlisted, "August concepts in neither that the list does not name").toEqual([]);
    const reached = IN_NEITHER.filter((id) => !inNeither.includes(id));
    expect(reached, "listed concepts a lesson or guide now reaches — strike them").toEqual([]);
    expect(inNeither.length).toBeLessThanOrEqual(27);
    expect(IN_NEITHER).toHaveLength(27);
  });
});
