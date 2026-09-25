/**
 * The links somebody chose to give this site, and the pages they point at.
 *
 * Two domains out of 603, read on CITATIONS_READ from Ahrefs
 * `site-explorer-all-backlinks` (subdomains mode, dofollow only), with every
 * anchor read and both linking sites fetched (SA-2.1). Nothing else in the
 * profile is a citation: the other 601 domains are one automated directory
 * and 600 pages selling backlinks that use this site's name as their sample
 * text. Those are counted in `scripts/seo-audit.mjs`, not named here.
 *
 * One dated list read by two things, the same arrangement as
 * gsc-surfaced.mjs. The audit prints it beside the trade so a new real link
 * is visible at a glance, and citations-resolve.test.ts fails if a page one
 * of these points at stops existing — a slug rename is an ordinary edit here
 * and would send the best links the site has to a 404 without failing
 * anything else.
 *
 * Refresh: pull referring domains with dofollow_links > 0 ordered by
 * first_seen desc and read the anchor of anything newer than CITATIONS_READ.
 * An anchor that names a page is a citation; one that names the site is an
 * advert. Add the citation here with what the citing page is, and move the
 * date whether or not there was one.
 */

export const CITATIONS_READ = "2026-09-25";

/**
 * @typedef {{ domain: string, dr: number, firstSeen: string, pages: readonly string[], what: string }} Citation
 */

/** @type {readonly Citation[]} */
export const CITATIONS = Object.freeze([
  {
    domain: "befreed.ai",
    dr: 43,
    firstSeen: "2026-08-12",
    pages: [
      "/how-to-read-body-language",
      "/how-to-be-more-charismatic",
      "/how-to-read-the-room",
      "/how-to-be-witty",
    ],
    what: "generated podcast lessons listing the guide under Knowledge Sources; one every 13-15 days",
  },
  {
    domain: "sofiavicedomini.me",
    dr: 6,
    firstSeen: "2026-08-18",
    pages: ["/practice/techniques/character-through-game"],
    what: "a working actress's own post on improvisation for character, hand-written",
  },
]);
