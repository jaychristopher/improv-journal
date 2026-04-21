import { describe, expect, it } from "vitest";

import { getThreadBySlug, loadPaths } from "../content";

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
});
