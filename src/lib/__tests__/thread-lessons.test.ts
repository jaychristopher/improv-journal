import { describe, expect, it } from "vitest";

import { getThreadBySlug, loadPaths } from "../content";
import { getRecommendedPath } from "../path-recommendations";

const REQUIRED_LESSON_FIELDS = [
  "lesson_goal",
  "key_takeaway",
  "common_mistake",
  "practice_prompt",
  "reflection_prompt",
] as const;

describe("thread lesson scaffolding", () => {
  it("beginner-facing paths only sequence lessons with teaching metadata", async () => {
    const paths = await loadPaths();
    const beginnerThreadIds = new Set(
      paths
        .filter((path) => path.frontmatter.audience.includes("beginner"))
        .flatMap((path) => path.frontmatter.threads ?? []),
    );

    expect(beginnerThreadIds.size).toBeGreaterThanOrEqual(10);

    for (const threadId of beginnerThreadIds) {
      const thread = await getThreadBySlug(threadId);
      expect(thread, `missing thread ${threadId}`).toBeDefined();

      const fm = thread?.frontmatter;
      for (const field of REQUIRED_LESSON_FIELDS) {
        expect(fm?.[field], `${threadId} missing ${field}`).toBeDefined();
        expect(fm?.[field]?.trim().length, `${threadId} needs ${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("the recommended beginner program threads have reps, success signals, and transfer prompts", async () => {
    const recommended = getRecommendedPath("beginner");
    const paths = await loadPaths();
    const starter = paths.find((path) => path.frontmatter.id === recommended.id);

    expect(starter, `recommended beginner path ${recommended.id} missing`).toBeDefined();

    for (const threadId of starter!.frontmatter.threads ?? []) {
      const thread = await getThreadBySlug(threadId);
      expect(thread, `missing thread ${threadId}`).toBeDefined();

      const fm = thread!.frontmatter;
      expect(fm.practice_reps?.trim().length, `${threadId} missing practice_reps`).toBeGreaterThan(
        0,
      );
      expect(
        fm.success_signal?.trim().length,
        `${threadId} missing success_signal`,
      ).toBeGreaterThan(0);
      expect(
        fm.transfer_prompt?.trim().length,
        `${threadId} missing transfer_prompt`,
      ).toBeGreaterThan(0);
    }
  });
});
