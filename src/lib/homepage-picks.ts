/**
 * The homepage's own guide picks: the promotion sort, minus the footer.
 *
 * "Where most people start" used to render `getTopGuides()` — the same 27
 * guides the footer already stamps on every page, in the same order. So the
 * page with the most link equity on the site added no entrance the chrome
 * lacked, while every winnable guide under the promotion floor had no
 * sitewide entrance at all: the top of that band was
 * virtual-team-building-activities at 5,800 of traffic potential,
 * team-building-questions at 3,700, team-dynamics at 3,500 (tracker entry
 * 117, 2026-09-21).
 *
 * This module keeps the rule the footer uses — rank by reach, rankable
 * first — and removes the footer's set, so the homepage and the footer
 * together cover more guides than either alone and the middle band gets its
 * entrance. Only `winnable` guides qualify: the footer keeps unchecked guides
 * on the principle that no evidence is not evidence of being shut out, but
 * the homepage's editorial slot is narrower, and a page nobody has looked at
 * should earn a footer place on reach before it earns this one.
 */

import { anchorLabel } from "./anchor-text";
import { loadBridges } from "./content";
import type { BridgeTargetKeyword } from "./schema";
import { getTopGuides, type TopGuide } from "./top-guides";

/**
 * Same reading as top-guides: traffic potential where measured, peak declared
 * volume where not. Duplicated rather than imported because top-guides keeps
 * it private; the homepage-picks test asserts the two agree on every promoted
 * guide, so a change there fails here instead of drifting.
 */
export function reachOf(keywords: BridgeTargetKeyword[]): number {
  const primary = keywords[0];
  if (primary?.traffic_potential) return primary.traffic_potential;
  return keywords.length > 0 ? Math.max(...keywords.map((k) => k.volume)) : 0;
}

/**
 * Winnable guides the footer does not carry, by reach, capped at the footer's
 * own size so the section stays the length it was.
 */
export async function getHomepagePicks(limit?: number): Promise<TopGuide[]> {
  const [bridges, promoted] = await Promise.all([loadBridges(), getTopGuides()]);
  const footer = new Set(promoted.map((guide) => guide.slug));
  const cap = limit ?? promoted.length;

  return bridges
    .filter((bridge) => bridge.frontmatter.serp_verdict === "winnable")
    .filter((bridge) => !footer.has(bridge.slug))
    .map((bridge) => {
      const keywords = bridge.frontmatter.target_keywords ?? [];
      return {
        slug: bridge.slug,
        label:
          anchorLabel(
            keywords,
            bridge.frontmatter.subject,
            // The label must be a phrase the guide says; see anchor-text.
            `${bridge.frontmatter.title}\n${bridge.content}`,
          ) ?? bridge.frontmatter.title,
        // Carried for the shape only: the homepage renders `label`, and the
        // footer's keyword/title alternation (entry 287) is the footer's.
        title: bridge.frontmatter.title,
        reach: reachOf(keywords),
        difficulty: keywords[0]?.difficulty,
      };
    })
    .sort((a, b) => b.reach - a.reach || a.slug.localeCompare(b.slug))
    .slice(0, cap);
}
