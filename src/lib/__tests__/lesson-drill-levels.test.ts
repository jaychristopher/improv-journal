import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  getPracticeRecommendationsForThread,
  getThreadDrillLevels,
  loadAtoms,
  loadThreads,
} from "../content";
import { matchesLevel } from "../exercise-picker";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "threads")) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The lesson page's drills pass the level rule the exercise picker applies.
 *
 * Until 2026-09-22 `getPracticeRecommendationsForThread` returned the first
 * three exercises reached by walking the lesson's atoms in frontmatter order
 * and their edges, with no reading of level. The exercises the graph attaches
 * to the principles an advanced lesson composes are the beginner drills that
 * illustrate them, so all four advanced lessons with a drill had a wrong one
 * — The Performer's Edge (The Art of Ensemble, performers) offered One-Word
 * Scene and Blind Offer — and 16 of 46 slots failed `matchesLevel` for the
 * lesson's home path's audience (tracker entry 270 counted 12, letting a
 * drill pass if any path sequencing the lesson admitted it; the home path
 * is the one rule every other surface uses, entry 262). Six lessons, both of
 * Mastering the Form's among them, had no drill at all.
 *
 * Now the recommender filters by the lesson's levels, ranks neighbours by
 * the atoms they share, and falls back to the picker's level page when
 * nothing at the level is reachable. These guards hold it there.
 */
async function lessonDrills() {
  const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
  const tagsById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.tags ?? []]));
  return Promise.all(
    threads.map(async (thread) => {
      const id = thread.frontmatter.id;
      const [levels, recommendations] = await Promise.all([
        getThreadDrillLevels(id),
        getPracticeRecommendationsForThread(id),
      ]);
      return {
        id,
        levels,
        drills: recommendations.filter((r) => r.source !== "level-page"),
        fallback: recommendations.filter((r) => r.source === "level-page"),
        tagsFor: (drillId: string) => tagsById.get(drillId) ?? [],
      };
    }),
  );
}

describe("lesson drill levels", () => {
  it("covers the lesson population, so a changed selector cannot pass vacuously", async () => {
    const lessons = await lessonDrills();
    const slots = lessons.reduce((n, l) => n + l.drills.length, 0);
    const levelled = lessons.filter((l) => l.levels.length > 0);

    // 25 lessons, 62 drill slots and 21 levelled lessons on 2026-09-22.
    expect(lessons.length).toBeGreaterThanOrEqual(20);
    expect(slots).toBeGreaterThanOrEqual(40);
    expect(levelled.length).toBeGreaterThanOrEqual(18);
  });

  it("reads each lesson's level from its home path's audience", async () => {
    await expect(getThreadDrillLevels("the-performers-edge")).resolves.toEqual(["advanced"]);
    await expect(getThreadDrillLevels("the-teachers-toolkit")).resolves.toEqual(["intermediate"]);
    await expect(getThreadDrillLevels("empty-stage-problem")).resolves.toEqual(["beginner"]);
    // On no path: no level, nothing filtered.
    await expect(getThreadDrillLevels("anatomy-of-a-scene")).resolves.toEqual([]);
  });

  it("offers no lesson with a level a drill the picker would not offer that level", async () => {
    const lessons = await lessonDrills();
    const mismatched = lessons.flatMap((l) =>
      l.levels.length === 0
        ? []
        : l.drills
            .filter((d) => !l.levels.some((level) => matchesLevel(l.tagsFor(d.id), level)))
            .map((d) => `${l.id} (${l.levels.join("/")}) -> ${d.id}`),
    );

    // 16 of 46 before the rule; 0 of 62 after (2026-09-22).
    expect(mismatched).toEqual([]);
  });

  it("caps at three, direct first, and never repeats a drill", async () => {
    const lessons = await lessonDrills();
    for (const l of lessons) {
      expect(l.drills.length).toBeLessThanOrEqual(3);
      expect(new Set(l.drills.map((d) => d.id)).size).toBe(l.drills.length);
      const firstLinked = l.drills.findIndex((d) => d.source === "linked");
      if (firstLinked >= 0) {
        expect(l.drills.slice(firstLinked).every((d) => d.source === "linked")).toBe(true);
      }
    }
  });

  it("sends a lesson with no drill at its level to the picker's level page, and nowhere else", async () => {
    const lessons = await lessonDrills();
    const users = lessons.filter((l) => l.fallback.length > 0);

    for (const l of users) {
      // The fallback is the whole row: one link, at the lesson's lowest level.
      expect(l.drills).toEqual([]);
      expect(l.levels.length).toBeGreaterThan(0);
      expect(l.fallback).toHaveLength(1);
      expect(l.fallback[0].url).toBe(`/tools/exercise-picker/${l.levels[0]}`);
      expect(l.fallback[0].title).toBe("Find a drill for this level");
    }
    // A lesson on no path has nothing to fall back to and gets an empty row.
    for (const l of lessons.filter((l) => l.levels.length === 0 && l.drills.length === 0)) {
      expect(l.fallback).toEqual([]);
    }

    // Ceiling, measured 2026-09-22: 0 lessons use the fallback. Entry 270
    // expected six (the format and diagnostic lessons whose atoms link no
    // exercise), but a drill declares `illustrates` toward the concept it
    // trains as often as the concept names the drill, and reading both
    // directions reaches Organic Opening for the Harold lesson and Genre
    // Scene for the game lessons. The fallback stays for the lesson whose
    // only neighbours are off-level; if this rises, a lesson lost its drills.
    expect(users.length).toBeLessThanOrEqual(0);
    // And every lesson with a level has somewhere to send the reader.
    for (const l of lessons.filter((l) => l.levels.length > 0)) {
      expect(l.drills.length + l.fallback.length).toBeGreaterThan(0);
    }
  });

  it.runIf(built)("ships The Performer's Edge advanced drills, not the beginner ones", async () => {
    const html = fs.readFileSync(path.join(APP, "threads", "the-performers-edge.html"), "utf-8");
    const start = html.indexOf('data-track="lesson-reps"');
    expect(start).toBeGreaterThan(-1);
    // Only the practice row's links carry data-source, so the rest of the page is inert.
    const row = html.slice(start);
    const links = [...row.matchAll(/<a\b([^>]*\bdata-source="[^"]+"[^>]*)>/g)].map((m) => ({
      href: m[1].match(/\bhref="([^"]+)"/)?.[1] ?? "",
      source: m[1].match(/\bdata-source="([^"]+)"/)?.[1] ?? "",
    }));

    expect(links.length).toBeGreaterThan(0);
    expect(links.map((l) => l.href)).not.toContain("/practice/exercises/one-word-scene");
    expect(links.map((l) => l.href)).not.toContain("/practice/exercises/blind-offer");

    const [atoms, levels] = await Promise.all([
      loadAtoms(),
      getThreadDrillLevels("the-performers-edge"),
    ]);
    const tagsByUrl = new Map(
      atoms
        .filter((a) => a.frontmatter.type === "exercise")
        .map((a) => [`/practice/exercises/${a.frontmatter.id}`, a.frontmatter.tags ?? []]),
    );
    const fitting = links.filter(
      (l) =>
        l.source === "level-page" ||
        levels.some((level) => matchesLevel(tagsByUrl.get(l.href) ?? [], level)),
    );
    expect(fitting.length).toBeGreaterThanOrEqual(1);
    expect(links.every((l) => fitting.includes(l))).toBe(true);
  });
});
