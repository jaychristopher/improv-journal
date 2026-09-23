import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getGuideConcepts } from "../guide-concepts";
import { mentionCount } from "../named-concepts";

/**
 * The guide's concept block leads with the concept the guide discusses most.
 *
 * On 2026-09-22 the block was ordered by sitewide demand (tracker entry
 * 282): each guide's traffic potential split over its entry atoms and
 * summed per atom, so `offers` led every guide that declared it. Measured
 * against the pages that evening (entry 296), the first card was the body's
 * most-mentioned concept on 16 of 78 guides — down from 32 under the
 * authored order — and a concept the body never names on 9: Trust-Building
 * Exercises opened with Offers (named 0 times) above Trust (25), Viewpoints
 * with Be Present (1) above Viewpoints (29), How to Be More Assertive with
 * Commitment (5) above Status (46). A sitewide statistic had displaced the
 * page's own emphasis in the one slot the reader reads.
 *
 * The block now orders named concepts first by the page's own mention
 * count — title mentions plus backticked ids, which render as the title —
 * and only the "listed, not discussed" tail by demand. After the change the
 * first card is the most-mentioned concept on 78 of 78 guides and a
 * never-mentioned one on 0. These hold it there; the numbers are the
 * measure's own (`mentionCount`) and the population is guarded so a block
 * that returned nothing could not pass.
 */
describe("concept block order", () => {
  async function firstCards() {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const rows: {
      slug: string;
      first: string;
      firstHeaded: boolean;
      firstMentions: number;
      most: number;
      anyNamed: boolean;
    }[] = [];
    for (const bridge of bridges) {
      const concepts = await getGuideConcepts(bridge.slug);
      if (concepts.length === 0) continue;
      const mentions = concepts.map((c) => mentionCount(bridge.content, c.title, c.id));
      rows.push({
        slug: bridge.slug,
        first: concepts[0].id,
        firstHeaded: concepts[0].headed,
        firstMentions: mentions[0],
        most: Math.max(...mentions),
        anyNamed: mentions.some((n) => n > 0),
      });
    }
    // 78 guides with a block on 2026-09-22.
    expect(rows.length).toBeGreaterThanOrEqual(70);
    return rows;
  }

  it("leads with a concept the body names wherever it names any", async () => {
    const rows = await firstCards();
    // With backticks counted every guide names at least one declared
    // concept (78 of 78; 69 by title alone), so the rule has a population.
    const withNamed = rows.filter((r) => r.anyNamed);
    expect(withNamed.length).toBeGreaterThanOrEqual(69);
    const unnamedFirst = withNamed.filter((r) => r.firstMentions === 0).map((r) => r.slug);
    expect(unnamedFirst).toEqual([]);
  });

  it("leads with the body's most-mentioned concept unless a section heads another", async () => {
    const rows = await firstCards();
    const firstIsMost = rows.filter((r) => r.most > 0 && r.firstMentions === r.most);
    // 16 under demand order, 32 under the authored order, 78 under mention
    // order on 2026-09-22, 67 since the same day, when a concept that heads
    // a section moved ahead of the most-mentioned one (tracker entry 324):
    // 20 lead with a headed concept, 11 of which were not the most-mentioned. The floor sits under the
    // measured number so a page whose two top concepts tie can move without
    // failing; the rule itself is exact.
    expect(firstIsMost.length).toBeGreaterThanOrEqual(65);
    let headedFirst = 0;
    for (const r of rows) {
      if (r.firstHeaded) {
        headedFirst += 1;
        continue;
      }
      expect(r.firstMentions, `${r.slug}: ${r.first}`).toBe(r.most);
    }
    // A headed first card is still a named one, and the split accounts for
    // every page: 20 headed firsts on 2026-09-22.
    expect(headedFirst + firstIsMost.length).toBeGreaterThanOrEqual(rows.length);
    expect(headedFirst).toBeGreaterThanOrEqual(15);
  });

  it("never leads with a concept the body does not mention", async () => {
    const rows = await firstCards();
    // 9 on 2026-09-22 under demand order; 0 now, and only 0 is right — a
    // block that says "concepts this is built on" cannot open with one the
    // page never utters while it names another.
    const neverMentioned = rows.filter((r) => r.anyNamed && r.firstMentions === 0);
    expect(neverMentioned.map((r) => r.slug)).toEqual([]);
    // The worst inversions the entry named, read back against the fix.
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    expect(bySlug.get("trust-building-exercises")?.first).toBe("trust");
    expect(bySlug.get("viewpoints")?.first).toBe("viewpoints");
    expect(bySlug.get("how-to-be-more-assertive")?.first).toBe("status");
  });
});
