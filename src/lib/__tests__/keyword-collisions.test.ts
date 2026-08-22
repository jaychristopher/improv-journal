import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

describe("keyword collisions", () => {
  /**
   * Two guides targeting the same term split the signal between them. Every
   * instance found on this site was a stranded, high-difficulty page holding a
   * target that belonged to a winnable one — so the collision was not merely
   * redundant, it was actively backing the page that could not rank.
   */
  it("never targets the same keyword from two guides", async () => {
    const owners = new Map<string, string[]>();

    for (const bridge of await loadBridges()) {
      for (const { keyword } of bridge.frontmatter.target_keywords ?? []) {
        const key = keyword.trim().toLowerCase();
        owners.set(key, [...(owners.get(key) ?? []), bridge.slug]);
      }
    }

    const collisions = [...owners.entries()]
      .filter(([, pages]) => pages.length > 1)
      .map(([keyword, pages]) => `"${keyword}" — ${pages.join(", ")}`);

    expect(collisions).toEqual([]);
  });

  it("gives every guide a distinct primary keyword", async () => {
    const primaries = (await loadBridges())
      .map((b) => (b.frontmatter.target_keywords ?? [])[0]?.keyword?.toLowerCase())
      .filter((k): k is string => Boolean(k));

    const dupes = primaries.filter((k, i) => primaries.indexOf(k) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  it("leaves every guide with at least one keyword after deduplication", async () => {
    const bare = (await loadBridges())
      .filter((b) => (b.frontmatter.target_keywords ?? []).length === 0)
      .map((b) => b.slug);

    expect(bare).toEqual([]);
  });
});
