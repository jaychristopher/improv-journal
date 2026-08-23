/**
 * Highest-value guides, for site-wide promotion in the footer.
 *
 * This is the largest internal-link lever on the site — eight links on every
 * one of 300-odd pages. It originally ranked on raw search volume, which put
 * four guides in the list that cannot rank at all: active-listening at
 * difficulty 68, psychological-safety at 64, how-to-be-more-confident at 54,
 * how-to-stop-overthinking at 34. Half the site's promotion capacity was
 * pointing at pages whose terms are out of reach.
 *
 * It now ranks on reach — traffic potential where measured, volume where not —
 * and excludes anything above the difficulty at which depth stops converting.
 *
 * Difficulty is not sufficient on its own. It is computed from the backlinks of
 * the pages ranking, so it says nothing about a result page held by Slack,
 * Indeed or Harvard. Three of the eight slots were going to guides that clear
 * the difficulty bar and cannot rank anyway: team building activities at
 * difficulty 5 against Asana and BambooHR, networking tips at 11, how to read
 * body language at 3 against Verywell and Psychology Today. Where the results
 * have actually been looked at and found closed, that reading excludes the
 * page. Guides not yet checked stay eligible, because no evidence is not
 * evidence of being shut out.
 */

import { loadBridges } from "./content";
import type { BridgeTargetKeyword } from "./schema";

/** Above this, the term is not winnable from the site's current authority. */
const STRANDED_DIFFICULTY = 30;

export interface TopGuide {
  slug: string;
  /** Head keyword, used as the anchor text. */
  label: string;
  /** Traffic potential where known, otherwise peak declared volume. */
  reach: number;
  difficulty?: number;
}

/**
 * Anchor text for a guide, chosen from its declared keywords.
 *
 * The highest-volume keyword is not always the right label. Twelve guides
 * declare one whose parent topic differs from their primary's, and on those the
 * anchor was describing a topic the page is not aiming at: "overthinking" for
 * a guide targeting "how to stop overthinking", "communication skills" for
 * people-skills, "constructive feedback" for how-to-give-feedback. Sitewide
 * anchor text is a strong signal about what a page is for, and it was pointing
 * at the wrong subject on 330 pages at a time.
 *
 * So: the highest-volume keyword that shares the primary's parent topic, which
 * keeps the better-phrased variants ("theater games" over "theatre games") and
 * rejects the ones that belong to another topic. Falls back to the primary.
 */
function anchorKeyword(keywords: BridgeTargetKeyword[]): BridgeTargetKeyword | undefined {
  const primary = keywords[0];
  if (!primary) return undefined;
  const sameTopic = keywords.filter((k) => !primary.parent || k.parent === primary.parent);
  return [...(sameTopic.length > 0 ? sameTopic : [primary])].sort((a, b) => b.volume - a.volume)[0];
}

function titleCase(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

/**
 * What a page could actually bring in. Traffic potential is the traffic the
 * top-ranking page receives across every term it ranks for, so it is a far
 * better estimate than the volume of one keyword — "what is improv" is 1,600 a
 * month and a traffic potential of 50.
 */
function reachOf(keywords: BridgeTargetKeyword[]): number {
  const primary = keywords[0];
  if (primary?.traffic_potential) return primary.traffic_potential;
  return keywords.length > 0 ? Math.max(...keywords.map((k) => k.volume)) : 0;
}

/**
 * Promoted guides are chosen by reach, not by a count.
 *
 * This was 8, and the eight inside the cut were getting 327 inbound internal
 * links each — one from every page — while the six immediately outside got
 * between 10 and 17, holding about 172,000 of traffic potential between them.
 * Raising it to 14 fixed that, and then broke again the moment another guide
 * was published: a fixed count silently evicts whichever page now ranks last,
 * which is exactly the fault it was meant to cure.
 *
 * So the cut is a floor instead. Ranked by reach the winnable guides drop off
 * sharply — 16,000 to 5,800 — and 10,000 sits inside that gap, so everything
 * above the break is promoted and nothing below it. A guide published tomorrow
 * joins on its own merits and evicts nobody. MAX_PROMOTED is only a backstop
 * against the list growing unreasonably long.
 */
const PROMOTION_FLOOR = 10_000;
const MAX_PROMOTED = 24;

export async function getTopGuides(limit = MAX_PROMOTED): Promise<TopGuide[]> {
  const bridges = await loadBridges();

  return (
    bridges
      .map((bridge) => {
        const keywords = bridge.frontmatter.target_keywords ?? [];
        const primary = keywords[0];
        const head = anchorKeyword(keywords);
        return {
          slug: bridge.slug,
          label: head ? titleCase(head.keyword) : bridge.frontmatter.title,
          reach: reachOf(keywords),
          difficulty: primary?.difficulty,
          verdict: bridge.frontmatter.serp_verdict,
        };
      })
      .filter((guide) => guide.reach >= PROMOTION_FLOOR)
      // Unmeasured difficulty is kept: absent data is not evidence of being stranded.
      .filter((guide) => guide.verdict !== "authority")
      // A checked-open guide beats the difficulty proxy. "How to stop
      // overthinking" is difficulty 34 and had been excluded on that alone,
      // while a DR 1 site holds position five on it — 16,000 a month the
      // footer was declining to promote because of a backlink estimate.
      .filter(
        (guide) =>
          guide.verdict === "winnable" ||
          guide.difficulty === undefined ||
          guide.difficulty <= STRANDED_DIFFICULTY,
      )
      .sort((a, b) => b.reach - a.reach || a.slug.localeCompare(b.slug))
      .slice(0, limit)
  );
}
