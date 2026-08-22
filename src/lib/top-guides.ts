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

export async function getTopGuides(limit = 8): Promise<TopGuide[]> {
  const bridges = await loadBridges();

  return (
    bridges
      .map((bridge) => {
        const keywords = bridge.frontmatter.target_keywords ?? [];
        const primary = keywords[0];
        const head = [...keywords].sort((a, b) => b.volume - a.volume)[0];
        return {
          slug: bridge.slug,
          label: head ? titleCase(head.keyword) : bridge.frontmatter.title,
          reach: reachOf(keywords),
          difficulty: primary?.difficulty,
          verdict: bridge.frontmatter.serp_verdict,
        };
      })
      .filter((guide) => guide.reach > 0)
      // Unmeasured difficulty is kept: absent data is not evidence of being stranded.
      .filter((guide) => guide.difficulty === undefined || guide.difficulty <= STRANDED_DIFFICULTY)
      .filter((guide) => guide.verdict !== "authority")
      .sort((a, b) => b.reach - a.reach || a.slug.localeCompare(b.slug))
      .slice(0, limit)
  );
}
