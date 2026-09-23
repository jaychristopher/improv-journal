import { describe, expect, it } from "vitest";

import { loadPaths, loadThreads } from "../content";
import { getNextPath } from "../path-progression";
import { getRecommendedPath } from "../path-recommendations";
import {
  compareSeedShare,
  getLadderSeedShare,
  NEXT_PATH_SEED_MARGIN,
  seedSlots,
  tallyStatus,
} from "../status-distribution";
import { getStatusDistribution } from "../system-counts";

/**
 * The helper behind entry 323's remedy: the ladder's seed share, measured
 * once, and the comparison that decides whether a next-path card has
 * anything to add to it. The pure functions are pinned so the page and the
 * guards agree on what "within the margin" means; the content-facing ones
 * are held against the loaders and against system-counts, which tallies the
 * same field for the About page.
 */
describe("seedSlots and compareSeedShare", () => {
  it("counts seed slots and gives an empty path no share", () => {
    expect(seedSlots(["seed", "draft", "seed", undefined])).toEqual({
      slots: 4,
      seedSlots: 2,
      share: 0.5,
    });
    expect(seedSlots([])).toEqual({ slots: 0, seedSlots: 0, share: 0 });
  });

  it("says nothing within the margin, and which way beyond it", () => {
    const ladder = seedSlots(["seed", "seed", "seed", "draft"]); // 0.75
    // A lesson in 4 either side is the margin, and the boundary is inside it.
    expect(NEXT_PATH_SEED_MARGIN).toBe(0.25);
    expect(compareSeedShare(seedSlots(["seed", "seed", "seed", "seed"]), ladder)).toBeNull();
    expect(compareSeedShare(seedSlots(["seed", "seed", "draft", "draft"]), ladder)).toBeNull();
    expect(compareSeedShare(seedSlots(["seed", "draft", "draft", "draft"]), ladder)).toBe("below");
    expect(compareSeedShare(seedSlots(["draft", "draft"]), ladder)).toBe("below");
    expect(compareSeedShare(seedSlots(["seed", "seed"]), seedSlots(["draft", "draft"]))).toBe(
      "above",
    );
    // No lessons, no note — whatever the ladder says.
    expect(compareSeedShare(seedSlots([]), ladder)).toBeNull();
    // The margin is a parameter, so a guard can ask what a wider one does.
    expect(compareSeedShare(seedSlots(["draft", "draft"]), ladder, 0.8)).toBeNull();
  });

  it("tallies the three states and nothing else", () => {
    expect(tallyStatus(["draft", "seed", "draft", "validated", "draft"])).toEqual({
      seed: 1,
      draft: 3,
      validated: 1,
    });
    expect(tallyStatus([])).toEqual({ seed: 0, draft: 0, validated: 0 });
  });
});

describe("getLadderSeedShare", () => {
  it("reads every lesson slot on every path, and the first rung is the beginner's path", async () => {
    const [ladder, paths, threads] = await Promise.all([
      getLadderSeedShare(),
      loadPaths(),
      loadThreads(),
    ]);
    const statusOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.status]));
    const slots = paths.flatMap((p) => p.frontmatter.threads ?? []);
    expect(ladder.all.slots).toBe(slots.length);
    expect(ladder.all.seedSlots).toBe(slots.filter((id) => statusOf.get(id) === "seed").length);
    expect(ladder.firstRung).toBe(getRecommendedPath("beginner").id);
    const first = paths.find((p) => p.frontmatter.id === ladder.firstRung);
    expect(first, "the first rung is a path in content").toBeDefined();
    expect(ladder.all.slots - ladder.beyondFirstRung.slots).toBe(
      (first!.frontmatter.threads ?? []).length,
    );
    // 39 slots, 29 seeds; 37 and 29 beyond Foundations, on 2026-09-22.
    expect(ladder.all.slots).toBeGreaterThanOrEqual(30);
    expect(ladder.beyondFirstRung.share).toBeGreaterThan(0.5);
  });

  it("no next-path card points at the first rung, so the norm is measured without it", async () => {
    const [ladder, paths] = await Promise.all([getLadderSeedShare(), loadPaths()]);
    const targets = paths
      .map((p) => getNextPath(p.frontmatter.id)?.id)
      .filter((id): id is string => Boolean(id));
    // 9 cards on 2026-09-22; the population guard for the claim below.
    expect(targets.length).toBeGreaterThanOrEqual(8);
    expect(targets).not.toContain(ladder.firstRung);
  });

  it("agrees with system-counts on how many lessons are seeds", async () => {
    const [{ byLayer }, threads] = await Promise.all([getStatusDistribution(), loadThreads()]);
    expect(tallyStatus(threads.map((t) => t.frontmatter.status))).toEqual(byLayer.lessons);
  });
});
