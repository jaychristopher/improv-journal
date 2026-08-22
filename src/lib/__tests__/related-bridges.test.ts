import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getRelatedBridges, RELATED_GUIDE_LIMIT } from "../related-bridges";

describe("related bridges", () => {
  it("gives every bridge page outbound links to sibling guides", async () => {
    const bridges = await loadBridges();
    const thin: string[] = [];

    for (const bridge of bridges) {
      const related = await getRelatedBridges(bridge.slug);
      if (related.length < 3) thin.push(`${bridge.slug} (${related.length})`);
    }

    expect(thin).toEqual([]);
  });

  it("never links a guide to itself and never repeats a link", async () => {
    const bridges = await loadBridges();

    for (const bridge of bridges) {
      const slugs = (await getRelatedBridges(bridge.slug)).map((g) => g.slug);
      expect(slugs).not.toContain(bridge.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs.length).toBeLessThanOrEqual(RELATED_GUIDE_LIMIT);
    }
  });

  it("resolves to real bridge slugs with titles and descriptions", async () => {
    const bridges = await loadBridges();
    const known = new Set(bridges.map((b) => b.slug));

    const related = await getRelatedBridges("how-to-stop-overthinking");
    expect(related.length).toBeGreaterThan(0);
    for (const guide of related) {
      expect(known.has(guide.slug)).toBe(true);
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.description.length).toBeGreaterThan(0);
    }
  });

  it("puts curated pairings first", async () => {
    const related = await getRelatedBridges("how-to-stop-overthinking");
    expect(related.slice(0, 3).map((g) => g.slug)).toEqual([
      "active-listening",
      "stage-fright",
      "how-to-be-funny",
    ]);
  });

  it("returns nothing for an unknown slug", async () => {
    expect(await getRelatedBridges("not-a-real-guide")).toEqual([]);
  });
});
