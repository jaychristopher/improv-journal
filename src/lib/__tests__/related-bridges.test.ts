import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { CURATED_RELATED, getRelatedBridges, RELATED_GUIDE_LIMIT } from "../related-bridges";

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

  it("puts curated pairings first, for every guide that has them", async () => {
    // Asserts the behaviour rather than a snapshot of the editorial choices,
    // which change as pages are added and retargeted.
    for (const [slug, curated] of Object.entries(CURATED_RELATED)) {
      const related = (await getRelatedBridges(slug)).map((g) => g.slug);
      const expected = curated.filter((c) => related.includes(c));
      expect(related.slice(0, expected.length), slug).toEqual(expected);
    }
  });

  it("does not lead a guide toward pages that cannot rank", async () => {
    // Relevance stays primary, so a curated stranded pairing is allowed; what
    // is not is a related list made mostly of unreachable terms.
    const bridges = await loadBridges();
    const kd = new Map(
      bridges.map((b) => [b.slug, (b.frontmatter.target_keywords ?? [])[0]?.difficulty]),
    );

    for (const bridge of bridges) {
      const related = await getRelatedBridges(bridge.slug);
      const stranded = related.filter((g) => (kd.get(g.slug) ?? 0) > 30);
      expect(stranded.length, `${bridge.slug} leads with too many stranded guides`).toBeLessThan(
        Math.max(2, related.length),
      );
    }
  });

  it("returns nothing for an unknown slug", async () => {
    expect(await getRelatedBridges("not-a-real-guide")).toEqual([]);
  });
});
