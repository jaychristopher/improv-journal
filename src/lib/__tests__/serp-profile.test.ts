import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * A verdict should carry the evidence it was made from.
 *
 * `serp_verdict` is defined as a reading of the whole results page, but the
 * only thing stored was `serp_min_dr` — one number out of ten. So a verdict
 * could never be audited, only trusted, and that has already nearly cost
 * something: the verdicts disagree between DR 36 and DR 40, and with nothing
 * but the minimum recorded there was no way to tell drift from two genuinely
 * different results pages. Deciding it from the minimum would have moved
 * 109,000 of traffic potential using a field that is explicitly not the test.
 *
 * From 2026-08-23 a check records every domain rating in the top ten. Older
 * verdicts cannot be backfilled — those checks are gone — so the requirement
 * starts from the date the practice started rather than pretending otherwise.
 */
const PROFILES_REQUIRED_FROM = "2026-08-23";

/**
 * Checked on the qualifying date but the output is genuinely gone — these three
 * were run early in a long session and the results are no longer recoverable.
 * Listing them is more honest than moving the date to cover them, which would
 * silently exempt twenty other pages that do have profiles. Each one should get
 * a profile the next time its SERP is looked at, and then leave this set.
 */
const OUTPUT_NOT_RETAINED = new Set([
  "questions-to-ask-a-girl",
  "how-to-make-small-talk",
  "how-to-be-a-good-friend",
]);

describe("SERP evidence", () => {
  it("records the top-ten profile for every check made since the practice began", async () => {
    const missing: string[] = [];
    let inScope = 0;

    for (const bridge of await loadBridges()) {
      const checked = bridge.frontmatter.serp_checked;
      if (!checked || checked < PROFILES_REQUIRED_FROM) continue;
      if (OUTPUT_NOT_RETAINED.has(bridge.slug)) continue;
      inScope++;
      if (!bridge.frontmatter.serp_top10_dr?.length) missing.push(bridge.slug);
    }

    // If the date or the field moves, nothing is in scope and this passes.
    expect(inScope).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  /**
   * The cheapest possible check on the pair, and it caught nothing when the
   * fourteen profiles were first written — every minimum matched the number
   * already recorded, which is the reason to trust the rest of the column.
   */
  it("keeps serp_min_dr equal to the minimum of the profile", async () => {
    const wrong: string[] = [];

    for (const bridge of await loadBridges()) {
      const profile = bridge.frontmatter.serp_top10_dr;
      if (!profile?.length) continue;
      const observed = Math.min(...profile);
      if (bridge.frontmatter.serp_min_dr !== observed) {
        wrong.push(
          `${bridge.slug}: recorded ${bridge.frontmatter.serp_min_dr}, profile ${observed}`,
        );
      }
    }

    expect(wrong).toEqual([]);
  });
});
