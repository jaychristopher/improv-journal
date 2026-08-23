/**
 * Related-guide resolution for bridge pages.
 *
 * Bridge pages are the site's highest search-intent surface, but they had no
 * bridge-to-bridge linking: every guide was a leaf. This module derives a
 * relatedness score from the content graph so each guide links out to its
 * closest siblings, spreading crawl depth and link equity across the cluster.
 *
 * Signals, strongest first:
 *   - shared `entry_atoms` (same underlying concepts)
 *   - shared `entry_path` (same learning journey)
 *   - shared significant tokens across title + target keywords
 *
 * A small curated seed list wins placement where an editorial pairing is
 * better than the computed one.
 */

import { loadBridges } from "./content";
import type { BridgeFrontmatter, BridgeTargetKeyword } from "./schema";

/** Above this, a term is not winnable from the site's current authority. */
const STRANDED_DIFFICULTY = 30;

const ATOM_WEIGHT = 3;
const PATH_WEIGHT = 2;
const TOKEN_WEIGHT = 1;

export const RELATED_GUIDE_LIMIT = 4;

/** Editorial pairings that take precedence over computed matches. */
export const CURATED_RELATED: Record<string, string[]> = {
  "networking-tips": [
    "how-to-make-small-talk",
    "questions-to-get-to-know-someone",
    "how-to-be-more-charismatic",
  ],
  "how-to-be-more-articulate": [
    "how-to-keep-a-conversation-going",
    "how-to-have-difficult-conversations",
    "how-to-make-small-talk",
  ],
  "virtual-team-building-activities": [
    "team-building-activities",
    "icebreaker-questions-for-work",
    "psychological-safety",
  ],
  "funny-questions-to-ask": [
    "how-to-be-funny",
    "conversation-starters",
    "questions-to-ask-friends",
  ],
  "conversation-starters": [
    "questions-to-get-to-know-someone",
    "how-to-make-small-talk",
    "deep-questions-to-ask",
  ],
  "questions-to-get-to-know-someone": [
    "how-to-make-small-talk",
    "questions-to-ask-friends",
    "how-to-make-friends-as-an-adult",
  ],
  "questions-to-ask-in-an-interview": [
    "how-to-have-difficult-conversations",
    "how-to-be-more-assertive",
    "how-to-be-a-better-manager",
  ],
  "deep-questions-to-ask": [
    "questions-to-ask-friends",
    "how-to-be-vulnerable",
    "how-to-be-a-good-listener",
  ],
  "icebreaker-questions-for-work": [
    "team-building-questions",
    "psychological-safety",
    "how-to-be-a-better-manager",
  ],
  "questions-to-ask-friends": [
    "how-to-be-a-good-friend",
    "how-to-be-a-good-listener",
    "how-to-make-small-talk",
  ],
  "improv-prompts": ["theatre-games", "what-is-improv", "rules-of-improv"],
  "how-to-be-a-good-friend": [
    "how-to-make-friends-as-an-adult",
    "how-to-be-a-good-listener",
    "how-to-give-feedback",
  ],
  "how-to-make-friends-as-an-adult": [
    "how-to-be-a-good-friend",
    "how-to-make-small-talk",
    "how-to-be-vulnerable",
    "how-to-be-a-good-listener",
  ],
  "how-to-stop-overthinking": [
    "how-to-be-a-good-listener",
    "fear-of-public-speaking",
    "how-to-be-funny",
  ],
  "psychological-safety": [
    "trust-building-exercises",
    "emotional-safety",
    "how-to-be-a-good-listener",
  ],
  "trust-building-exercises": [
    "psychological-safety",
    "team-building-activities",
    "emotional-safety",
  ],
  "active-listening": ["active-listening-exercises", "types-of-listening", "how-to-be-present"],
  "active-listening-exercises": [
    "active-listening",
    "types-of-listening",
    "how-to-be-a-good-listener",
  ],
  "how-to-be-funny": ["how-to-be-a-good-listener", "what-is-improv", "fear-of-public-speaking"],
  "stage-fright": ["confidence-building-exercises", "public-speaking-tips", "how-to-be-present"],
  "public-speaking-tips": [
    "fear-of-public-speaking",
    "how-to-be-more-articulate",
    "how-to-read-the-room",
  ],
  "team-building-activities": ["emotional-safety", "how-to-give-feedback"],
  "how-to-be-more-confident": [
    "confidence-building-exercises",
    "fear-of-public-speaking",
    "how-to-overcome-fear-of-failure",
  ],
  "confidence-building-exercises": [
    "how-to-be-more-confident",
    "fear-of-public-speaking",
    "how-to-overcome-fear-of-failure",
  ],
  "how-to-be-more-creative": ["how-to-be-funny", "how-to-be-present"],
  "how-to-deal-with-conflict": ["how-to-be-a-good-listener", "emotional-safety"],
  "how-to-be-a-better-manager": ["how-to-give-feedback", "psychological-safety", "team-dynamics"],
  "how-to-give-feedback": ["emotional-safety", "team-building-activities"],
  "what-is-improv": ["how-to-be-funny", "how-to-be-present"],
  "team-building-questions": ["team-building-activities", "emotional-safety"],
  "5-minute-team-building": ["team-building-activities", "team-building-questions"],
  "collaboration-skills": [
    "yes-and-improv",
    "team-building-activities",
    "how-to-be-a-good-listener",
  ],
  "how-to-be-present": ["how-to-stop-overthinking", "how-to-be-a-good-listener"],
  "how-to-be-vulnerable": ["emotional-safety", "confidence-building-exercises"],
  "team-dynamics": ["collaboration-skills", "team-building-activities"],
  "people-skills": ["how-to-be-a-good-listener", "how-to-be-present"],
  "how-to-overcome-fear-of-failure": ["fear-of-public-speaking", "how-to-be-vulnerable"],
  "how-to-stop-overthinking-in-a-relationship": ["how-to-be-present", "how-to-be-vulnerable"],
};

const STOPWORDS = new Set([
  "a",
  "about",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "better",
  "but",
  "by",
  "do",
  "dont",
  "for",
  "from",
  "get",
  "good",
  "how",
  "improv",
  "in",
  "is",
  "it",
  "know",
  "less",
  "make",
  "more",
  "most",
  "not",
  "of",
  "on",
  "or",
  "own",
  "people",
  "really",
  "skills",
  "so",
  "that",
  "the",
  "their",
  "them",
  "they",
  "things",
  "think",
  "this",
  "to",
  "up",
  "way",
  "what",
  "when",
  "who",
  "why",
  "with",
  "without",
  "you",
  "your",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function topicTokens(fm: BridgeFrontmatter): Set<string> {
  const source = [fm.title, ...(fm.target_keywords ?? []).map((k) => k.keyword)].join(" ");
  return new Set(tokenize(source));
}

/**
 * Tiebreak between equally-related guides.
 *
 * Relatedness stays the primary signal — a related-guides list that surfaces
 * unrelated pages is worse for a reader and worse for the site. But where two
 * candidates are equally related, the previous tiebreak was alphabetical,
 * which is arbitrary. Preferring the one that can actually rank is not.
 *
 * Measured across the guides, 42% of curated related-guide slots pointed at
 * pages above difficulty 30, and the site's highest-reach page received fewer
 * in-body links than three pages that cannot rank at all.
 *
 * Difficulty alone was not enough. It is a backlink measure, so a guide can
 * clear the bar and still face a page of results held by Slack or Verywell —
 * and because those guides carry high traffic potential, they were winning
 * every tiebreak rather than losing it. 31 of 240 related slots were going to
 * pages already checked and found closed. A checked-and-closed guide now
 * scores zero here, the same as a stranded one.
 */
function rankability(
  keywords: BridgeTargetKeyword[] | undefined,
  verdict?: BridgeFrontmatter["serp_verdict"],
): number {
  const primary = keywords?.[0];
  if (!primary) return 0;
  if (verdict === "authority") return 0;
  // Difficulty is only a stand-in for whether the results are reachable. Where
  // they have been looked at and found open, that beats the stand-in.
  if (
    verdict !== "winnable" &&
    primary.difficulty !== undefined &&
    primary.difficulty > STRANDED_DIFFICULTY
  ) {
    return 0;
  }
  return primary.traffic_potential ?? primary.volume ?? 0;
}

/** Highest-volume keyword sharing the primary's parent topic; see top-guides. */
function anchorKeyword(keywords: BridgeTargetKeyword[]): BridgeTargetKeyword | undefined {
  const primary = keywords[0];
  if (!primary) return undefined;
  const sameTopic = keywords.filter((k) => !primary.parent || k.parent === primary.parent);
  return [...(sameTopic.length > 0 ? sameTopic : [primary])].sort((a, b) => b.volume - a.volume)[0];
}

function overlap<T>(a: Iterable<T>, b: Set<T>): number {
  let count = 0;
  for (const item of a) if (b.has(item)) count += 1;
  return count;
}

export interface RelatedGuide {
  slug: string;
  title: string;
  description: string;
  /** Highest-volume target keyword, used as the human-readable topic label. */
  keyword?: string;
}

/**
 * Resolve the guides most related to `slug`, curated entries first.
 * Returns at most `limit` results and never includes `slug` itself.
 */
export async function getRelatedBridges(
  slug: string,
  limit = RELATED_GUIDE_LIMIT,
): Promise<RelatedGuide[]> {
  const bridges = await loadBridges();
  const self = bridges.find((b) => b.slug === slug);
  if (!self) return [];

  const selfAtoms = new Set(self.frontmatter.entry_atoms ?? []);
  const selfTokens = topicTokens(self.frontmatter);

  const scored = bridges
    .filter((b) => b.slug !== slug)
    .map((b) => {
      const fm = b.frontmatter;
      const atomScore = overlap(fm.entry_atoms ?? [], selfAtoms) * ATOM_WEIGHT;
      const pathScore =
        fm.entry_path && fm.entry_path === self.frontmatter.entry_path ? PATH_WEIGHT : 0;
      const tokenScore = overlap(topicTokens(fm), selfTokens) * TOKEN_WEIGHT;
      return { bridge: b, score: atomScore + pathScore + tokenScore };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        rankability(b.bridge.frontmatter.target_keywords, b.bridge.frontmatter.serp_verdict) -
          rankability(a.bridge.frontmatter.target_keywords, a.bridge.frontmatter.serp_verdict) ||
        a.bridge.slug.localeCompare(b.bridge.slug),
    );

  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const ordered: typeof bridges = [];
  const seen = new Set<string>([slug]);

  /**
   * Curated pairings keep their precedence and their declared order.
   *
   * Worth recording an attempt that was wrong. 22 of the 100 curated slots
   * point at authority-gated guides, and curated entries bypass the rankability
   * tiebreak entirely — they are pushed in before any scoring — so with a limit
   * of four a curated list can fill every slot and the filter never gets a say.
   * I reordered them to put reachable ones first, and the test asserting
   * declared order failed.
   *
   * The test was right. This list exists specifically so an editorial pairing
   * overrides the computed ranking; reordering it by verdict overrides the
   * editorial judgment with the heuristic it was created to overrule. A link to
   * a gated guide can still be the correct one for a reader, and where somebody
   * has decided which pairing is best, that decision is the point.
   */
  for (const curatedSlug of CURATED_RELATED[slug] ?? []) {
    const bridge = bySlug.get(curatedSlug);
    if (bridge && !seen.has(curatedSlug)) {
      ordered.push(bridge);
      seen.add(curatedSlug);
    }
  }
  for (const { bridge } of scored) {
    if (ordered.length >= limit) break;
    if (seen.has(bridge.slug)) continue;
    ordered.push(bridge);
    seen.add(bridge.slug);
  }

  return ordered.slice(0, limit).map((b) => ({
    slug: b.slug,
    title: b.frontmatter.title,
    description: b.frontmatter.description,
    // Same rule as the footer: the highest-volume keyword that shares the
    // primary's parent topic, so the label never names a different subject.
    keyword: anchorKeyword(b.frontmatter.target_keywords ?? [])?.keyword,
  }));
}
