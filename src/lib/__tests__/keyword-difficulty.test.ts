import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

describe("keyword difficulty", () => {
  /**
   * Written while the provider was unreachable, so difficulty was never
   * retrieved for them. Excluded by name rather than by raising the allowance
   * below, which would quietly buy room for two more pages that had no such
   * excuse. Ahrefs resets on 2026-09-22; fill these in then and delete them
   * from here. Volumes on both came from the recorded research in
   * content/outlines/all-paths.md, so the numbers they do carry are sourced.
   */
  const PROVIDER_UNAVAILABLE = new Set(["improv-games-for-kids", "viola-spolin"]);

  it("records difficulty on nearly every guide's primary keyword", async () => {
    const bridges = await loadBridges();
    const missing = bridges
      .filter((b) => !PROVIDER_UNAVAILABLE.has(b.slug))
      .filter((b) => (b.frontmatter.target_keywords ?? [])[0]?.difficulty === undefined)
      .map((b) => b.slug);

    // Two keywords returned no difficulty from the provider; the rest are recorded.
    expect(missing.length).toBeLessThanOrEqual(2);
  });

  it("uses a plausible 0-100 difficulty", async () => {
    for (const bridge of await loadBridges()) {
      const primary = (bridge.frontmatter.target_keywords ?? [])[0];
      if (primary?.difficulty === undefined) continue;
      expect(primary.difficulty, bridge.slug).toBeGreaterThanOrEqual(0);
      expect(primary.difficulty, bridge.slug).toBeLessThanOrEqual(100);
    }
  });

  it("keeps difficulty on the primary keyword, not scattered across the list", async () => {
    for (const bridge of await loadBridges()) {
      const keywords = bridge.frontmatter.target_keywords ?? [];
      const withDifficulty = keywords.filter((k) => k.difficulty !== undefined);
      if (withDifficulty.length === 0) continue;
      expect(keywords[0].difficulty, bridge.slug).toBeDefined();
    }
  });

  /**
   * The reason this data exists. Effort was going to guides on terms in the
   * 30-70 range while winnable ones sat thin, because volume was recorded and
   * difficulty was not. This asserts the site still has winnable ground rather
   * than being entirely committed to terms it cannot reach.
   */
  it("still targets a meaningful set of winnable terms", async () => {
    const graded = (await loadBridges())
      .map((b) => (b.frontmatter.target_keywords ?? [])[0])
      .filter((k) => k?.difficulty !== undefined);

    const winnable = graded.filter((k) => k!.difficulty! <= 15);
    expect(graded.length).toBeGreaterThan(30);
    expect(winnable.length).toBeGreaterThan(graded.length / 2);
  });
});
