import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getTopGuides } from "../top-guides";

/**
 * A guide promoted on its SERP floor has to have the reading behind it.
 *
 * `top-guides.ts` promotes a guide from every page on the site when
 * `serp_min_dr` is under 6, on the argument that one page with no authority
 * holding a top-ten position proves the results page is open. The argument is
 * good and the evidence was thin: on 2026-09-25, of the nine guides qualifying
 * that way, six had no `serp_top10_dr` at all, so `CORROBORATING_REACHABLE` —
 * the rule written precisely to stop a lone weak result carrying a page — could
 * not run on them.
 *
 * Reading all nine found three whose floor had gone entirely:
 *
 *   del-close                             2 -> 9    Wikipedia takes 95%
 *   how-to-be-witty                       0 -> 34   the page is Reddit and YouTube
 *   how-to-stop-caring-what-people-think  4 -> 41
 *
 * and one, how-to-overcome-fear-of-failure, whose lone DR 1 result is no longer
 * in the top ten at all — its floor is now 61 and its verdict is `authority`.
 *
 * `npm run seo:audit` has printed "N of these rest on a single reachable result
 * — treat the minimum with care" for some time. Printing it did not stop any of
 * the four. This fails instead.
 *
 * It deliberately does not check the *value* of the floor, only that somebody
 * looked. Whether a reachable position is worth having is `serp_floor_traffic`
 * and `serp_top_share`, and what the page is for is `serp_audience`; those are
 * judgement and belong in a card, not a boolean.
 */
describe("SERP floor evidence", () => {
  it("has a recorded top-ten distribution behind every floor-promoted guide", async () => {
    const [bridges, promoted] = await Promise.all([loadBridges(), getTopGuides()]);
    const bySlug = new Map(bridges.map((b) => [b.slug, b.frontmatter]));

    // Guard the guard: a promotion list that came back empty, or a slug map
    // that stopped matching, would pass this on nothing.
    expect(promoted.length).toBeGreaterThanOrEqual(20);
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const onFloor = promoted
      .map((g) => ({ slug: g.slug, fm: bySlug.get(g.slug) }))
      .filter((g) => g.fm?.serp_min_dr !== undefined && g.fm.serp_min_dr < 6);

    // The floor route is what this is about, so prove some guide still uses it.
    expect(onFloor.length).toBeGreaterThanOrEqual(3);

    const unread = onFloor
      .filter((g) => (g.fm?.serp_top10_dr ?? []).length === 0)
      .map((g) => g.slug);
    expect(
      unread,
      "promoted from every page on a SERP floor nobody has read — " +
        "record serp_top10_dr, or the corroboration rule cannot run",
    ).toEqual([]);
  });

  /**
   * And the reading has to say what the position is worth.
   *
   * 2026-09-25: a DR 2 page at position ten on "21 questions game" earns 1,938
   * visits a month; a DR 9 page at position eight on "del close" earned 7.
   * Recording the floor without recording that is how a page gets promoted
   * sitewide for a position worth nothing.
   */
  it("records what the reachable position earns", async () => {
    const [bridges, promoted] = await Promise.all([loadBridges(), getTopGuides()]);
    const bySlug = new Map(bridges.map((b) => [b.slug, b.frontmatter]));
    const onFloor = promoted
      .map((g) => ({ slug: g.slug, fm: bySlug.get(g.slug) }))
      .filter((g) => g.fm?.serp_min_dr !== undefined && g.fm.serp_min_dr < 6);
    expect(onFloor.length).toBeGreaterThanOrEqual(3);

    const unpriced = onFloor
      .filter((g) => g.fm?.serp_floor_traffic === undefined)
      .map((g) => g.slug);
    expect(unpriced, "floor recorded, its traffic not — see SA-21.1").toEqual([]);
  });
});
