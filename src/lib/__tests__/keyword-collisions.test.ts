import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { ROUTE_KEYWORDS, routeKeywordOwners } from "../route-keywords";

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

  /**
   * A hub that lives on a route has no frontmatter, so it was outside the check
   * above entirely — and the biggest keyword on the site sits on one. Nothing
   * would have objected to a guide being built on top of "improv games".
   */
  it("never lets a guide target a keyword a hub already holds", async () => {
    const hubs = routeKeywordOwners();
    expect(hubs.size).toBeGreaterThan(5);

    const collisions: string[] = [];
    for (const bridge of await loadBridges()) {
      for (const { keyword } of bridge.frontmatter.target_keywords ?? []) {
        const route = hubs.get(keyword.trim().toLowerCase());
        if (route) collisions.push(`"${keyword}" — ${bridge.slug} vs ${route}`);
      }
    }
    expect(collisions).toEqual([]);
  });

  it("never lets two hubs hold the same keyword", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const keywords of Object.values(ROUTE_KEYWORDS)) {
      for (const { keyword } of keywords) {
        const key = keyword.trim().toLowerCase();
        if (seen.has(key)) dupes.push(key);
        seen.add(key);
      }
    }
    expect(dupes).toEqual([]);
  });

  it("leaves every guide with at least one keyword after deduplication", async () => {
    const bare = (await loadBridges())
      .filter((b) => (b.frontmatter.target_keywords ?? []).length === 0)
      .map((b) => b.slug);

    expect(bare).toEqual([]);
  });
});
