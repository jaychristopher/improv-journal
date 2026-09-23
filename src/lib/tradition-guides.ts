/**
 * The join between the traditions layer and the guide layer.
 *
 * The five tradition pages read the atoms, the library and the counter-
 * positions and never the bridges, so a tradition linked zero guides beyond
 * the footer — while 40 of the 78 guides named a founder in the body and a
 * reader landing on one of them could not reach the school it was quoting
 * (tracker entry 271, 2026-09-22). This module reads the guides for each
 * tradition in the one way the guides actually cite it: by name in the prose.
 *
 * Membership is a mention rather than a frontmatter declaration because the
 * guides declare no tradition and the prose is the only record. A guide draws
 * on a tradition when its body names the founder — full name or the surname
 * the entity linker also accepts — or links the tradition's page by hand. The
 * count is how many times the name occurs, which is what `traditionsOf` reads
 * to decide whether a guide leans on a school (twice or more) or merely
 * mentions it in passing.
 */

import { loadBridges } from "./content";
import { byReach } from "./guide-categories";
import type { BridgeFrontmatter } from "./schema";

export type TraditionId = "johnstone" | "spolin" | "close" | "ucb" | "annoyance";

export const TRADITION_IDS: TraditionId[] = ["johnstone", "spolin", "close", "ucb", "annoyance"];

/**
 * How each tradition is named in the guides. The surname regexes match the
 * full name too, so a page saying "Keith Johnstone" and later "Johnstone" is
 * counted once per occurrence and not twice for the first. Close is only ever
 * the full name: "Close" alone is an English word, which is why the entity
 * linker refuses it as a surname and this refuses it as a mention.
 */
const FOUNDER_NAMES: Record<TraditionId, RegExp[]> = {
  johnstone: [/\bJohnstone\b/g],
  spolin: [/\bSpolin\b/g],
  close: [/\bDel Close\b/g],
  ucb: [/\bUCB\b/g],
  annoyance: [/\bAnnoyance\b/g, /\bNapier\b/g],
};

/**
 * The guide that *is* the tradition's person page. It draws on the tradition
 * by definition and the tradition page already hands off to it from its
 * header, so listing it again under "guides that draw on this tradition"
 * would be a second link to the same page in the same viewport.
 */
const OWN_GUIDE: Partial<Record<TraditionId, string>> = {
  spolin: "viola-spolin",
  close: "del-close",
};

export interface TraditionGuide {
  slug: string;
  title: string;
  description: string;
  /** Occurrences of the founder's name in the body. Zero when the guide reaches the tradition only by a hand link. */
  mentions: number;
  frontmatter: BridgeFrontmatter;
}

/** How many times a body names the tradition's founder. Pure, so the tests can read it on fixtures. */
export function countFounderMentions(body: string, tradition: TraditionId): number {
  let n = 0;
  for (const pattern of FOUNDER_NAMES[tradition]) {
    n += [...body.matchAll(pattern)].length;
  }
  return n;
}

/**
 * The guides that draw on a tradition, ordered by reach as the topic hubs
 * order theirs — winnable before gated, then measured traffic potential —
 * with ties broken by how often the guide names the founder.
 */
export async function guidesDrawingOn(tradition: TraditionId): Promise<TraditionGuide[]> {
  const bridges = await loadBridges();
  const drawing: TraditionGuide[] = [];
  for (const bridge of bridges) {
    if (bridge.slug === OWN_GUIDE[tradition]) continue;
    const mentions = countFounderMentions(bridge.content, tradition);
    const linksPage = bridge.html.includes(`href="/traditions/${tradition}"`);
    if (mentions === 0 && !linksPage) continue;
    drawing.push({
      slug: bridge.slug,
      title: bridge.frontmatter.title,
      description: bridge.frontmatter.description,
      mentions,
      frontmatter: bridge.frontmatter,
    });
  }
  // byReach is a stable sort, so the mention order survives among guides it
  // cannot separate.
  drawing.sort((a, b) => b.mentions - a.mentions || a.slug.localeCompare(b.slug));
  return byReach(drawing);
}

/** `guidesDrawingOn` for every tradition at once, for the hub's cards. */
export async function guideCountsByTradition(): Promise<Record<TraditionId, number>> {
  const counts = {} as Record<TraditionId, number>;
  for (const tradition of TRADITION_IDS) {
    counts[tradition] = (await guidesDrawingOn(tradition)).length;
  }
  return counts;
}

export interface GuideLineage {
  tradition: TraditionId;
  mentions: number;
}

/**
 * The traditions a guide leans on: those whose founder it names twice or
 * more, most-cited first. One mention is a citation; two is a source, and
 * the guide page's lineage line reads this so the debt is stated rather than
 * left to the inline links.
 */
export async function traditionsOf(slug: string): Promise<GuideLineage[]> {
  const bridges = await loadBridges();
  const bridge = bridges.find((b) => b.slug === slug);
  if (!bridge) return [];
  return (
    TRADITION_IDS.map((tradition) => ({
      tradition,
      mentions: countFounderMentions(bridge.content, tradition),
    }))
      // A page about Spolin does not "draw on" Spolin; it is the source.
      .filter((l) => l.mentions >= 2 && OWN_GUIDE[l.tradition] !== slug)
      .sort((a, b) => b.mentions - a.mentions)
  );
}
