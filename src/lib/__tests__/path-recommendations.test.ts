import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";
import { AUDIENCE_LADDER, audienceRank, progressionEdges } from "../path-progression";
import { getRecommendedPath } from "../path-recommendations";
import type { Audience } from "../schema";

/**
 * The audience recommender names the path each audience starts on. For that
 * to agree with the chain the path page walks, the recommended path has to
 * be the *entry* of its audience's run on the chain: no path at the same or
 * a higher level may point at it, or a reader sent there by /learn has been
 * dropped into the middle of a sequence. This was one of the three routers
 * tracker entry 247 (2026-09-21) found disagreeing; this is the property
 * that makes it agree.
 */
describe("recommended paths", () => {
  it("names a real path of the right audience for all five audiences", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBe(11);
    const byId = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter]));
    for (const audience of AUDIENCE_LADDER) {
      const rec = getRecommendedPath(audience);
      const fm = byId.get(rec.id);
      expect(fm, `${audience}: ${rec.id}`).toBeDefined();
      expect(fm!.audience, `${audience}: ${rec.id}`).toContain(audience);
      expect(rec.title).toBe(fm!.title);
    }
  });

  it("is the entry of its audience's chain: every predecessor has a lower audience", async () => {
    const paths = await loadPaths();
    const primary = new Map(
      paths.map((p) => [p.frontmatter.id, p.frontmatter.audience[0] as Audience]),
    );
    const edges = progressionEdges();
    expect(edges.length).toBeGreaterThanOrEqual(8);

    let predecessorsSeen = 0;
    for (const audience of AUDIENCE_LADDER) {
      const rec = getRecommendedPath(audience);
      for (const { from, to } of edges) {
        if (to !== rec.id) continue;
        predecessorsSeen += 1;
        expect(
          audienceRank(primary.get(from)!),
          `${from} (${primary.get(from)}) points at ${rec.id}, the ${audience} entry`,
        ).toBeLessThan(audienceRank(audience));
      }
    }
    // Guard the guard: three of the five entries have predecessors.
    expect(predecessorsSeen).toBeGreaterThanOrEqual(3);
  });
});
