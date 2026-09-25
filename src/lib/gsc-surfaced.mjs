/**
 * The guides Search Console has ever shown, and where.
 *
 * One dated source read by two things that used to disagree: `top-guides.ts`,
 * which decides sitewide promotion, and `scripts/seo-audit.mjs`, which kept its
 * own hand-typed copy of this list under a different date. Kept as an .mjs so
 * both can import it — the same arrangement as keyword-parents.mjs.
 *
 * Read from GSC_SURFACED_FROM, always. Seventeen firings of the audit loop
 * read the page table from June and saw twelve pages; from February the same
 * endpoint returns 34 (SA-14.1, SA-16.1). Bridges only here, because this is
 * the layer the promotion block can promote; the full 34, with the atoms and
 * library entries, is in the audit's layer table and the query list in
 * docs/seo/rank-tracker-keywords.txt.
 *
 * `position` is the average position GSC reported over the window, and
 * `impressions` the count. Refresh with `gsc-pages` from GSC_SURFACED_FROM and
 * move GSC_SURFACED_ON when you do; the overlap guard reads this list, so a
 * refresh that drops a slug must be able to say why.
 */

export const GSC_SURFACED_FROM = "2026-02-01";
export const GSC_SURFACED_ON = "2026-09-25";

/**
 * @typedef {{ slug: string, position: number, impressions: number }} SurfacedGuide
 */

/** @type {readonly SurfacedGuide[]} */
export const GSC_SURFACED_GUIDES = Object.freeze([
  { slug: "types-of-listening", position: 6.9, impressions: 15 },
  { slug: "what-is-improv", position: 75.6, impressions: 10 },
  { slug: "5-minute-team-building", position: 67.8, impressions: 10 },
  { slug: "team-building-activities", position: 89.8, impressions: 9 },
  { slug: "team-building-questions", position: 72.0, impressions: 8 },
  { slug: "team-bonding-activities", position: 57.2, impressions: 5 },
  { slug: "rules-of-improv", position: 47.0, impressions: 1 },
  { slug: "how-to-get-better-at-improv", position: 37.0, impressions: 1 },
  { slug: "how-to-be-vulnerable", position: 48.0, impressions: 1 },
]);

/**
 * The best position GSC has shown a guide at, or undefined if never shown.
 * @param {string} slug
 * @returns {number | undefined}
 */
export function surfacedPositionOf(slug) {
  return GSC_SURFACED_GUIDES.find((g) => g.slug === slug)?.position;
}
