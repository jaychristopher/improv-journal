import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { pathTeachesOfGuide } from "../guide-concepts";

/**
 * `entry_path` is chosen by audience and `entry_atoms` by subject, and no
 * test joined them: the path a guide sends its reader to teaches a median
 * 40% of the ideas the guide declares, three guides' paths teach none, and
 * 19 teach one (tracker entry 206, 2026-09-21). The card now states the
 * number; this records the population so the debt is visible and can only
 * shrink.
 */
describe("entry path teaches the guide's ideas", () => {
  it("counts, for every guide, the declared ideas its entry path composes", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    let none = 0;
    let one = 0;
    let atLeastTwo = 0;
    for (const b of bridges) {
      const t = await pathTeachesOfGuide(b.slug);
      expect(t, b.slug).not.toBeNull();
      expect(t!.declared, b.slug).toBeGreaterThan(0);
      expect(t!.taught).toBeLessThanOrEqual(t!.declared);
      if (t!.taught === 0) none += 1;
      else if (t!.taught === 1) one += 1;
      else atLeastTwo += 1;
    }
    // 2026-09-21: 3 / 19 / 56. The first two numbers are debt for the author
    // (change the entry path, or teach the ideas on it); they may only fall.
    expect(none).toBeLessThanOrEqual(3);
    expect(one).toBeLessThanOrEqual(19);
    expect(atLeastTwo).toBeGreaterThanOrEqual(56);
  });
});
