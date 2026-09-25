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
 * endpoint returns 34 (SA-14.1, SA-16.1). Guides first, because that is the
 * layer the promotion block can promote; the atoms it has shown are
 * GSC_SURFACED_ATOMS below (SA-5.1), and the seven library entries stay in
 * docs/seo/rank-tracker-keywords.txt until SA-19.1 reads them.
 *
 * `position` is the average position GSC reported over the window, and
 * `impressions` the count. Refresh with `gsc-pages` from GSC_SURFACED_FROM and
 * move GSC_SURFACED_ON when you do; the overlap guard reads this list, so a
 * refresh that drops a slug must be able to say why. Library URLs changed on
 * 2026-09-24 (/library/ref-<id> → /library/<id>, SA-7.1): rows for the old
 * paths before that date are pages that moved, not pages that were lost.
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
 * The atoms Search Console has shown, with the query each was shown for
 * (SA-5.1). `gsc-keywords` from GSC_SURFACED_FROM, read GSC_SURFACED_ON: per
 * page, the query with the most impressions and its average position. The
 * promotion block does not read this — an atom has no reach figure and no
 * `/${slug}` route — but the audit's atom section and
 * layer-collisions.test.ts do: a keyword block on an atom not named here is
 * the bulk edit SA-5.1 ruled out. Twelve of 205; the best three sit at 10
 * to 11 on terms the keyword index cannot price.
 */
export const GSC_SURFACED_ATOMS = Object.freeze([
  {
    slug: "performance-state",
    path: "/how-it-works/performance-state",
    query: "stimulation performance",
    position: 48.5,
    impressions: 13,
  },
  {
    slug: "pattern-break",
    path: "/practice/techniques/pattern-break",
    query: "pattern break",
    position: 10.4,
    impressions: 5,
  },
  {
    slug: "meaning-is-relational",
    path: "/how-it-works/meaning-is-relational",
    query: "relational meaning",
    position: 61.3,
    impressions: 3,
  },
  {
    slug: "space-work",
    path: "/practice/techniques/space-work",
    query: "space work",
    position: 38.5,
    impressions: 2,
  },
  {
    slug: "yes-and",
    path: "/practice/techniques/yes-and",
    query: "yes and rule",
    position: 31.0,
    impressions: 1,
  },
  {
    slug: "pacing",
    path: "/practice/techniques/pacing",
    query: "what is pacing and leading",
    position: 90.0,
    impressions: 1,
  },
  {
    slug: "interdependence",
    path: "/how-it-works/interdependence",
    query: "structural interdependence",
    position: 45.0,
    impressions: 1,
  },
  {
    slug: "justification",
    path: "/practice/vocabulary/justification",
    query: "retrospective justification meaning",
    position: 10.0,
    impressions: 1,
  },
  {
    slug: "blocking",
    path: "/how-it-works/diagnosis/blocking",
    query: "resistance blocking",
    position: 63.0,
    impressions: 1,
  },
  {
    slug: "mirroring",
    path: "/practice/exercises/mirroring",
    query: "mirroring exercise",
    position: 46.0,
    impressions: 1,
  },
  {
    slug: "emotion-switch",
    path: "/practice/exercises/emotion-switch",
    query: "emotion switch",
    position: 11.0,
    impressions: 1,
  },
  {
    slug: "base-reality",
    path: "/practice/vocabulary/base-reality",
    query: "base reality meaning",
    position: 50.0,
    impressions: 1,
  },
]);

/**
 * The best position GSC has shown a guide at, or undefined if never shown.
 * @param {string} slug
 * @returns {number | undefined}
 */
export function surfacedPositionOf(slug) {
  return GSC_SURFACED_GUIDES.find((g) => g.slug === slug)?.position;
}
