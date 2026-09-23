import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";
import {
  AUDIENCE_LADDER,
  audienceRank,
  describeDirection,
  describeStep,
  getNextPath,
  getNextPathAbove,
  getPathAudience,
  isOnProgression,
  progressionEdges,
} from "../path-progression";
import type { Audience } from "../schema";

/**
 * PROGRESSION is the site's one ladder: the path page's "Next path" card,
 * the lesson rank, the prerequisite order and, since tracker entry 247
 * (2026-09-21), the audience hubs' up/down arrows all read it. Two of its
 * ten edges ran down the audience ladder — teaching-improv (teacher) to the
 * intermediate toolkit, and The Art of Ensemble (performer) to the advanced
 * reference shelf — so the chain demoted teachers and performers at its
 * end. These guards read the ladder from content/paths so a re-pointed edge
 * or a re-audienced path fails here rather than on a reader.
 */
describe("path progression", () => {
  const primaryAudience = async () => {
    const paths = await loadPaths();
    // Guard the guard: eleven paths, or a changed loader passes vacuously.
    expect(paths.length).toBe(11);
    return new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.audience[0] as Audience]));
  };

  it("holds each path's primary audience as content/paths declares it", async () => {
    const audiences = await primaryAudience();
    for (const [id, audience] of audiences) {
      expect(getPathAudience(id), id).toBe(audience);
      expect(AUDIENCE_LADDER, `${id}: ${audience}`).toContain(audience);
    }
  });

  it("never sends a reader down the audience ladder", async () => {
    const audiences = await primaryAudience();
    const edges = progressionEdges();
    expect(edges.length).toBeGreaterThanOrEqual(8);

    const down = edges
      .filter(
        ({ from, to }) => audienceRank(audiences.get(to)!) < audienceRank(audiences.get(from)!),
      )
      .map(({ from, to }) => `${from} (${audiences.get(from)}) → ${to} (${audiences.get(to)})`);
    expect(down).toEqual([]);

    // Every edge lands on a real path.
    for (const { from, to } of edges) {
      expect(audiences.has(from), from).toBe(true);
      expect(audiences.has(to), to).toBe(true);
    }
  });

  it("sends the teacher up to the reference shelf and ends the performer's chain", () => {
    expect(getNextPath("teaching-improv")?.id).toBe("reference-guide");
    expect(getNextPath("the-art-of-ensemble")).toBeNull();
    expect(getNextPath("reference-guide")).toBeNull();
    // Both ends are still on the chain for ranking purposes; a stranger is not.
    expect(isOnProgression("the-art-of-ensemble")).toBe(true);
    expect(isOnProgression("reference-guide")).toBe(true);
    expect(isOnProgression("not-a-path")).toBe(false);
  });

  it("reaches every path from a beginner start or a side entrance", async () => {
    const audiences = await primaryAudience();
    const onChain = [...audiences.keys()].filter((id) => isOnProgression(id));
    expect(onChain.sort()).toEqual([...audiences.keys()].sort());
  });

  /**
   * The reason used to stop at the audience delta, so the intermediate
   * reader sent up to the performer track and the teacher sent up to the
   * reference guide read the same "next level up" — and those steps go
   * opposite ways through the graph, outward to the formats and back to the
   * core (tracker entry 281, 2026-09-22). Now the reason says the direction
   * too; path-gradient.test.ts measures that the direction is the true one.
   */
  it("says why the next path is next, from the audience delta and the direction", () => {
    expect(getNextPath("systems-of-improv")?.reason).toBe(
      "The next level up. It works inward on the ideas everything else depends on.",
    );
    expect(getNextPath("self-coaching-toolkit")?.reason).toBe(
      "The next level up. It works outward into formats and show craft, the specific end of the graph.",
    );
    expect(getNextPath("teaching-improv")?.reason).toBe(
      "The next level up. It returns to the core ideas in depth, not a continuation of the performer track.",
    );
    expect(getNextPath("beginner-foundations")?.reason).toBe(
      "The same level, next in sequence. It works inward on the ideas everything else depends on.",
    );
    expect(describeStep("mastering-the-form", "the-art-of-ensemble")).toBe(
      "The same level, next in sequence. It works outward into formats and show craft, the specific end of the graph.",
    );
    // A target with no direction to claim keeps the level alone.
    expect(describeDirection("teaching-improv")).toBeUndefined();
    expect(describeStep("beginner-foundations", "teaching-improv")).toBe("The next level up.");
  });

  it("finds the point where a chain climbs above a level", () => {
    expect(getNextPathAbove("beginner-foundations", "beginner")?.id).toBe("self-coaching-toolkit");
    expect(getNextPathAbove("self-coaching-toolkit", "intermediate")?.id).toBe(
      "advanced-game-and-character",
    );
    expect(getNextPathAbove("teaching-improv", "teacher")?.id).toBe("reference-guide");
    expect(getNextPathAbove("reference-guide", "advanced")).toBeNull();
    expect(getNextPathAbove("advanced-game-and-character", "performer")).toBeNull();
  });
});
