import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";
import { getRecommendedPath } from "../path-recommendations";

describe("path course scaffolding", () => {
  it("every path has course overview fields", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(10);

    for (const path of paths) {
      const fm = path.frontmatter;

      expect(fm.learning_objectives, `${fm.id} missing learning objectives`).toBeDefined();
      expect(fm.learning_objectives.length, `${fm.id} needs learning objectives`).toBeGreaterThan(
        0,
      );

      expect(fm.who_this_is_for, `${fm.id} missing audience guidance`).toBeDefined();
      expect(fm.who_this_is_for.length, `${fm.id} needs who_this_is_for entries`).toBeGreaterThan(
        0,
      );

      expect(fm.prerequisites, `${fm.id} missing prerequisites`).toBeDefined();
      expect(fm.prerequisites.length, `${fm.id} needs prerequisite guidance`).toBeGreaterThan(0);

      expect(fm.estimated_time?.trim().length, `${fm.id} missing estimated_time`).toBeGreaterThan(
        0,
      );
      expect(
        fm.practice_cadence?.trim().length,
        `${fm.id} missing practice_cadence`,
      ).toBeGreaterThan(0);
      expect(
        fm.completion_outcome?.trim().length,
        `${fm.id} missing completion_outcome`,
      ).toBeGreaterThan(0);
    }
  });

  it("beginner-facing paths have explicit teaching scaffolding", async () => {
    const paths = await loadPaths();
    const beginnerPaths = paths.filter((path) => path.frontmatter.audience.includes("beginner"));
    expect(beginnerPaths.length).toBeGreaterThanOrEqual(3);

    for (const path of beginnerPaths) {
      expect(
        path.frontmatter.learning_objectives.length,
        `${path.frontmatter.id} should have multiple learning objectives`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        path.frontmatter.who_this_is_for.length,
        `${path.frontmatter.id} should say who it is for`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("the recommended beginner starting path exists and is beginner-facing", async () => {
    const recommended = getRecommendedPath("beginner");
    const paths = await loadPaths();
    const starter = paths.find((path) => path.frontmatter.id === recommended.id);

    expect(starter, `recommended beginner path ${recommended.id} missing`).toBeDefined();
    expect(starter?.frontmatter.audience).toContain("beginner");
  });
});
