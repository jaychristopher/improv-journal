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
import type { BridgeFrontmatter } from "./schema";

const ATOM_WEIGHT = 3;
const PATH_WEIGHT = 2;
const TOKEN_WEIGHT = 1;

export const RELATED_GUIDE_LIMIT = 4;

/** Editorial pairings that take precedence over computed matches. */
const CURATED_RELATED: Record<string, string[]> = {
  "how-to-stop-overthinking": ["active-listening", "stage-fright", "how-to-be-funny"],
  "psychological-safety": ["active-listening", "how-to-stop-overthinking"],
  "active-listening": [
    "active-listening-exercises",
    "types-of-listening",
    "how-to-stop-overthinking",
  ],
  "active-listening-exercises": [
    "active-listening",
    "types-of-listening",
    "how-to-be-a-good-listener",
  ],
  "how-to-be-funny": ["active-listening", "stage-fright"],
  "stage-fright": ["how-to-stop-overthinking", "psychological-safety"],
  "team-building-activities": ["psychological-safety", "how-to-give-feedback"],
  "how-to-be-more-confident": ["stage-fright", "how-to-stop-overthinking"],
  "how-to-be-more-creative": ["how-to-be-funny", "how-to-stop-overthinking"],
  "how-to-deal-with-conflict": ["active-listening", "psychological-safety"],
  "how-to-give-feedback": ["psychological-safety", "team-building-activities"],
  "what-is-improv": ["how-to-be-funny", "how-to-stop-overthinking"],
  "team-building-questions": ["team-building-activities", "psychological-safety"],
  "5-minute-team-building": ["team-building-activities", "team-building-questions"],
  "collaboration-skills": ["team-building-activities", "active-listening"],
  "how-to-be-present": ["how-to-stop-overthinking", "active-listening"],
  "how-to-be-vulnerable": ["psychological-safety", "how-to-be-more-confident"],
  "group-dynamics": ["collaboration-skills", "team-building-activities"],
  "interpersonal-communication-skills": ["active-listening", "how-to-be-present"],
  "how-to-overcome-fear-of-failure": ["stage-fright", "how-to-be-vulnerable"],
  "how-to-stop-overthinking-in-a-relationship": [
    "how-to-stop-overthinking",
    "how-to-be-vulnerable",
  ],
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
    .sort((a, b) => b.score - a.score || a.bridge.slug.localeCompare(b.bridge.slug));

  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const ordered: typeof bridges = [];
  const seen = new Set<string>([slug]);

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
    keyword: [...(b.frontmatter.target_keywords ?? [])].sort((x, y) => y.volume - x.volume)[0]
      ?.keyword,
  }));
}
