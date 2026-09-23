import { describe, expect, it } from "vitest";

import { LEVELS } from "@/app/tools/exercise-picker/picker-config";

import {
  AUDIENCE_GUIDE_LIMIT,
  AUDIENCE_LESSON_LIMIT,
  AUDIENCES,
  audiencesForPickerLevel,
  getAudienceGuides,
  getAudienceLessons,
  getPedagogyAtoms,
  pickerLevelFor,
} from "../audience-hub";
import { loadBridges, loadPaths } from "../content";

/**
 * The audience hubs' outbound links, derived from the graph.
 *
 * Until 2026-09-21 each `/learn/<audience>` page linked exactly the paths
 * whose `audience` matched and nothing else (novel-insights 201): 69 guides
 * route beginners through their `entry_path`, and the beginner hub linked
 * none of them, no lesson, and not the picker level of the same name. These
 * guard the derivation, so a loader that silently returns nothing fails here
 * rather than shipping five hubs that are `/paths` filtered again.
 */
describe("audience hub", () => {
  it("covers five audiences and a corpus of at least seventy guides", async () => {
    expect(AUDIENCES).toHaveLength(5);
    expect(new Set(AUDIENCES).size).toBe(5);
    expect((await loadBridges()).length).toBeGreaterThanOrEqual(70);
  });

  it("gives the beginner hub a full page of guides and a large remainder", async () => {
    // 69 beginner guides on 2026-09-21: the cap shows 12 and 57 remain.
    const { guides, remainder, total } = await getAudienceGuides("beginner");
    expect(guides.length).toBe(AUDIENCE_GUIDE_LIMIT);
    expect(remainder).toBeGreaterThanOrEqual(50);
    expect(total).toBe(guides.length + remainder);
  });

  it("only lists guides whose entry path is declared for the hub's audience", async () => {
    const paths = await loadPaths();
    const audienceOf = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.audience]));

    for (const audience of AUDIENCES) {
      const { guides } = await getAudienceGuides(audience);
      for (const guide of guides) {
        expect(audienceOf.get(guide.entryPath), `${audience}: ${guide.slug}`).toContain(audience);
        expect(guide.title).toBeTruthy();
        expect(guide.slug).toMatch(/^[a-z0-9-]+$/);
      }
      // Every hub has at least one guide — the smallest, advanced, has one.
      expect(guides.length, audience).toBeGreaterThanOrEqual(1);
      expect(guides.length).toBeLessThanOrEqual(AUDIENCE_GUIDE_LIMIT);
    }
  });

  it("orders guides by reach: no stranded guide ahead of a winnable one", async () => {
    const bridges = await loadBridges();
    const verdictOf = new Map(bridges.map((b) => [b.slug, b.frontmatter.serp_verdict]));
    const { guides } = await getAudienceGuides("beginner");
    const verdicts = guides.map((g) => verdictOf.get(g.slug));
    const firstAuthority = verdicts.indexOf("authority");
    const lastWinnable = verdicts.lastIndexOf("winnable");
    if (firstAuthority !== -1 && lastWinnable !== -1) {
      expect(firstAuthority).toBeGreaterThan(lastWinnable);
    }
  });

  it("lists at most eight lessons, each on a path of the hub's audience, without repeats", async () => {
    const paths = await loadPaths();

    for (const audience of AUDIENCES) {
      const lessons = await getAudienceLessons(audience);
      expect(lessons.length, audience).toBeGreaterThanOrEqual(1);
      expect(lessons.length).toBeLessThanOrEqual(AUDIENCE_LESSON_LIMIT);
      expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);

      for (const lesson of lessons) {
        const onPath = paths.find((p) => p.frontmatter.id === lesson.pathId);
        expect(onPath?.frontmatter.audience, `${audience}: ${lesson.id}`).toContain(audience);
        expect(onPath?.frontmatter.threads).toContain(lesson.id);
        expect(lesson.url).toBe(`/threads/${lesson.id}`);
      }
    }
  });

  it("maps every audience to a picker level or to none, and every level back to a hub", () => {
    const levels = new Set(LEVELS.map((l) => l.slug));
    const mapping = Object.fromEntries(AUDIENCES.map((a) => [a, pickerLevelFor(a)]));
    expect(mapping).toEqual({
      beginner: "beginner",
      intermediate: "intermediate",
      advanced: "advanced",
      performer: "advanced",
      teacher: null,
    });
    for (const level of Object.values(mapping)) {
      if (level !== null) expect(levels.has(level), level).toBe(true);
    }
    // Every picker level has at least one hub to point back at.
    for (const level of levels) {
      expect(audiencesForPickerLevel(level).length, level).toBeGreaterThanOrEqual(1);
    }
    expect(audiencesForPickerLevel("advanced")).toEqual(["advanced", "performer"]);
  });

  it("finds the four pedagogy atoms for the teacher hub", async () => {
    const atoms = await getPedagogyAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(4);
    for (const atom of atoms) expect(atom.url).toMatch(/^\/[a-z0-9/-]+$/);
  });
});
