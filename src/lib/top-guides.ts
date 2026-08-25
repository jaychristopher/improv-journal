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

import { anchorLabel } from "./anchor-text";
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
export const PROMOTION_FLOOR = 10_000;
/**
 * Raised from 24 when the SERP-floor rule was added. Eight guides qualify on
 * it and the list sorts by reach, so at 24 every one of them would have landed
 * below the cut and been sliced off — the rule would have been written and
 * changed nothing. Still a backstop rather than a target.
 */
const MAX_PROMOTED = 32;

/**
 * Measured evidence also earns a slot, not only size.
 *
 * Everything above this point ranks on estimates. Reach is a better estimate
 * than volume and the verdict is better than difficulty, but a page's traffic
 * potential is still a number a tool supplies about a results page nobody has
 * looked at. Where a SERP has actually been read, `serp_top10_dr` records every
 * domain rating in the top ten, and the count sitting under DR 50 is the only
 * direct measure here of whether a low-authority site could displace anything.
 *
 * It disagrees with reach sharply. The three pages with the most reachable
 * results — viewpoints, yes-and-improv and what-is-improv, three apiece —
 * carry 1,100, 1,100 and 250 of potential, so the floor excluded all three from
 * every page on the site. Meanwhile the promoted set is chosen entirely by
 * potential, and the improv cluster is also the one subject Search Console
 * shows this domain getting surfaced for at all. Two independent signals agreed
 * and the promotion block could hear neither.
 *
 * So a guide qualifies on either count. This deliberately does not reorder the
 * large pages against each other: 48 verdicts predate the profile and have no
 * distribution recorded, so there is no basis yet for ranking them this way.
 * It only stops a floor built on estimates from excluding the pages with the
 * best evidence.
 */
const REACHABLE_UNDER = 50;
const PROMOTE_IF_REACHABLE = 3;

/**
 * How low the floor goes, not only how many are near it.
 *
 * The rule above counts top-ten results under DR 50, which measures the width
 * of the opening. It cannot see its depth, and depth is the stronger evidence:
 * one DR 2 page holding a top-ten position is a demonstration that Google will
 * rank a site with no authority for that term, which is the exact question
 * being asked here.
 *
 * del-close is the case that exposed it. Its top ten is
 * [97, 75, 94, 66, 9, 99, 2, 95, 81] — two under 50, so it missed the count by
 * one and its 1,000 of potential is far under the floor, so it was promoted on
 * nothing. It is "del close", 2,000 searches a month, with a DR 2 page sitting
 * in the results, and it was the only improv term this site has where a page
 * that small has already proved the SERP is open. theatre-games at DR 5 and
 * how-to-be-witty at DR 0 were excluded the same way.
 *
 * Set at 6 rather than 10 deliberately. Between 6 and 10 the floor is low but
 * unremarkable and twelve guides qualify, which would have been most of the
 * promotion block chosen on one number. Under 6 the claim is narrow and hard
 * to argue with: a site with essentially no domain authority is already
 * ranking there.
 */
const PROMOTE_IF_FLOOR_UNDER = 6;

/**
 * A floor that rests on one result is not corroborated.
 *
 * `npm run seo:audit` says it plainly — "6 of these rest on a single reachable
 * result — treat the minimum with care" — and one of the six was a page this
 * rule had promoted to all 376 pages. how-to-overcome-fear-of-failure has a
 * top ten of [95, 62, 86, 99, 70, 92, 83, 1]: a lone DR 1 against seven
 * domains between 62 and 99. That single page proves less than it looks. It
 * may be ranking on something no amount of authority transfers.
 *
 * So where the distribution has been recorded, the floor has to be backed by a
 * second reachable result. Where it has not — 48 verdicts predate the profile
 * and carry only a minimum — the floor is the only evidence there is and it
 * still counts, on the rule this file already follows elsewhere: absent data
 * is not evidence of being shut out.
 *
 * That asymmetry is deliberate rather than untidy. The stronger test applies
 * to the pages we know more about, not less.
 */
const CORROBORATING_REACHABLE = 2;

export async function getTopGuides(limit = MAX_PROMOTED): Promise<TopGuide[]> {
  const bridges = await loadBridges();

  return (
    bridges
      .map((bridge) => {
        const keywords = bridge.frontmatter.target_keywords ?? [];
        const primary = keywords[0];
        return {
          slug: bridge.slug,
          label: anchorLabel(keywords, bridge.frontmatter.subject) ?? bridge.frontmatter.title,
          reach: reachOf(keywords),
          difficulty: primary?.difficulty,
          verdict: bridge.frontmatter.serp_verdict,
          reachable: (bridge.frontmatter.serp_top10_dr ?? []).filter((dr) => dr < REACHABLE_UNDER)
            .length,
          floor: bridge.frontmatter.serp_min_dr,
          hasDistribution: (bridge.frontmatter.serp_top10_dr ?? []).length > 0,
        };
      })
      .filter(
        (guide) =>
          guide.reach >= PROMOTION_FLOOR ||
          guide.reachable >= PROMOTE_IF_REACHABLE ||
          (guide.floor !== undefined &&
            guide.floor < PROMOTE_IF_FLOOR_UNDER &&
            (!guide.hasDistribution || guide.reachable >= CORROBORATING_REACHABLE)),
      )
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
