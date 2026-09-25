import { describe, expect, it } from "vitest";

import { GSC_SURFACED_GUIDES, GSC_SURFACED_ON } from "../gsc-surfaced.mjs";
import { getTopGuides } from "../top-guides";

/**
 * The promoted set and the set Google actually shows have to overlap.
 *
 * This guards the reconciliation, not the ranking (SA-4.1, 2026-09-25). A test
 * that froze today's promoted set would be the nav-reach mistake again —
 * asserting the mechanism instead of the outcome. What matters is that the
 * block which decides sitewide promotion can see what happened: on the day
 * this was written, 24 guides were promoted from every page on the site and
 * one of them had ever been surfaced. types-of-listening, the best-positioned
 * page on the site at 6.9, was excluded on every estimate the block ran on.
 *
 * After the measured-demand route the overlap is 2 of 23 — types-of-listening
 * joined on first-party evidence, and two guides whose recorded floors said
 * their results pages were closed left the reach route. If a refresh of
 * gsc-surfaced.mjs or a change here drops the overlap back to one, the change
 * did nothing and this says so.
 */
describe("promotion meets measurement", () => {
  it("promotes at least two guides Google has already shown", async () => {
    const promoted = await getTopGuides();
    // Guard the guard: an empty list on either side would overlap on nothing.
    expect(GSC_SURFACED_GUIDES.length).toBeGreaterThanOrEqual(9);
    expect(GSC_SURFACED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(promoted.length).toBeGreaterThanOrEqual(20);

    const surfaced = new Set(GSC_SURFACED_GUIDES.map((g) => g.slug));
    const overlap = promoted.map((g) => g.slug).filter((slug) => surfaced.has(slug));
    expect(overlap, `promoted guides Google has shown, as of ${GSC_SURFACED_ON}`).toEqual(
      expect.arrayContaining(["types-of-listening", "what-is-improv"]),
    );
    expect(overlap.length).toBeGreaterThanOrEqual(2);
  });

  it("promotes every guide Google shows on page one", async () => {
    // The route's own claim: a page already on page one belongs in the block.
    const promoted = new Set((await getTopGuides()).map((g) => g.slug));
    const pageOne = GSC_SURFACED_GUIDES.filter((g) => g.position <= 10).map((g) => g.slug);
    expect(pageOne.length).toBeGreaterThanOrEqual(1);
    for (const slug of pageOne) expect(promoted.has(slug), slug).toBe(true);
  });
});
