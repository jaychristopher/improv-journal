/**
 * Highest-demand guides, for site-wide promotion in the footer.
 *
 * The bridge guides carry essentially all of the site's target search volume,
 * but nothing linked to them site-wide, so their only inbound links came from
 * whichever page happened to mention them. Ranking by declared target volume
 * puts the guides with the most to gain on all 290 pages.
 */

import { loadBridges } from "./content";

export interface TopGuide {
  slug: string;
  /** Head keyword, used as the anchor text. */
  label: string;
  volume: number;
}

/** Highest declared search volume across a guide's target keywords. */
function peakVolume(keywords: { keyword: string; volume: number }[] | undefined): number {
  if (!keywords || keywords.length === 0) return 0;
  return Math.max(...keywords.map((k) => k.volume));
}

function titleCase(keyword: string): string {
  return keyword.charAt(0).toUpperCase() + keyword.slice(1);
}

export async function getTopGuides(limit = 8): Promise<TopGuide[]> {
  const bridges = await loadBridges();

  return bridges
    .map((bridge) => {
      const keywords = bridge.frontmatter.target_keywords ?? [];
      const head = [...keywords].sort((a, b) => b.volume - a.volume)[0];
      return {
        slug: bridge.slug,
        label: head ? titleCase(head.keyword) : bridge.frontmatter.title,
        volume: peakVolume(keywords),
      };
    })
    .filter((guide) => guide.volume > 0)
    .sort((a, b) => b.volume - a.volume || a.slug.localeCompare(b.slug))
    .slice(0, limit);
}
