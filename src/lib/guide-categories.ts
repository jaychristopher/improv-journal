/**
 * Topic clusters for the guides.
 *
 * These groupings already existed, but only as a visual arrangement inside the
 * guides hub. Nothing else knew about them: the guides declared `Home >
 * {title}` in their breadcrumbs, skipping both their cluster and the hub, and
 * each cluster had no page of its own to gather its guides onto.
 *
 * Promoting them to real hubs gives each cluster a pillar page and gives the
 * guides a hierarchy to declare.
 */

import { loadBridges } from "./content";
import type { BridgeFrontmatter } from "./schema";

export interface GuideCategory {
  slug: string;
  title: string;
  /** Shown on the hub. Deliberately terse. */
  description: string;
  /** The search snippet. Separate because the visible blurb is far too short for one. */
  metaDescription: string;
  slugs: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    slug: "personal-growth",
    title: "Personal Growth",
    description: "Overthinking, confidence, creativity, fear, and presence.",
    metaDescription:
      "Overthinking, confidence, creativity, fear, and presence — improv practices for the parts of life that go wrong inside your own head.",
    slugs: [
      "how-to-stop-overthinking",
      "how-to-be-more-confident",
      "confidence-building-exercises",
      "how-to-be-more-creative",
      "how-to-be-witty",
      "how-to-be-less-awkward",
      "how-to-let-go-of-control",
      "how-to-be-vulnerable",
      "how-to-be-present",
      "how-to-overcome-fear-of-failure",
      "public-speaking-tips",
      "fear-of-public-speaking",
      "stage-fright",
      "how-to-stop-caring-what-people-think",
      "how-to-be-more-assertive",
      "how-to-deal-with-rejection",
      "how-to-stop-people-pleasing",
      "how-to-be-more-charismatic",
    ],
  },
  {
    slug: "communication",
    title: "Relationships & Communication",
    description: "Listening, conversation, conflict, and connection.",
    metaDescription:
      "Listening, conversation, conflict, and connection — what improv knows about the mechanics of being understood and understanding someone else.",
    slugs: [
      "active-listening",
      "active-listening-exercises",
      "how-to-keep-a-conversation-going",
      "how-to-be-more-articulate",
      "how-to-make-friends-as-an-adult",
      "how-to-be-a-good-friend",
      "questions-to-ask-friends",
      "fun-questions-to-ask-friends",
      "would-you-rather-questions",
      "questions-for-couples",
      "this-or-that-questions",
      "most-likely-to-questions",
      "21-questions-game",
      "party-games",
      "questions-to-get-to-know-someone",
      "conversation-starters",
      "funny-questions-to-ask",
      "deep-questions-to-ask",
      "how-to-be-a-good-listener",
      "people-skills",
      "how-to-stop-overthinking-in-a-relationship",
      "how-to-deal-with-conflict",
      "how-to-read-body-language",
      "how-to-make-small-talk",
      "networking-tips",
      "how-to-have-difficult-conversations",
      "types-of-listening",
    ],
  },
  {
    slug: "teams",
    title: "Teams & Leadership",
    description: "Team building, trust, collaboration, feedback, and group dynamics.",
    metaDescription:
      "Team building, trust, collaboration, feedback, and group dynamics — improv methods for groups that have to think together under pressure.",
    slugs: [
      "team-building-activities",
      "virtual-team-building-activities",
      "team-building-questions",
      "icebreaker-questions-for-work",
      "questions-to-ask-in-an-interview",
      "5-minute-team-building",
      "how-to-be-a-better-manager",
      "psychological-safety",
      "trust-building-exercises",
      "collaboration-skills",
      "team-dynamics",
      "how-to-read-the-room",
      "how-to-give-feedback",
      "emotional-safety",
    ],
  },
  {
    slug: "improv-skills",
    title: "Improv Skills",
    description: "For improvisers — fundamentals, practice, and getting unstuck.",
    metaDescription:
      "For improvisers: fundamentals, practice, and getting unstuck — the craft itself, from first principles to diagnosing a scene that died.",
    slugs: [
      "what-is-improv",
      "rules-of-improv",
      "how-to-be-funny",
      "how-to-get-better-at-improv",
      "improv-theory",
      "framing-effect",
      "theatre-games",
      "improv-prompts",
    ],
  },
];

/** Above this, a term is not winnable from the site's current authority. */
const STRANDED_DIFFICULTY = 30;

/**
 * What a guide could bring in: traffic potential where measured, peak declared
 * volume where not.
 */
function reachOf(bridge: { frontmatter: BridgeFrontmatter }): number {
  const keywords = bridge.frontmatter.target_keywords ?? [];
  const primary = keywords[0];
  if (primary?.traffic_potential) return primary.traffic_potential;
  return keywords.length > 0 ? Math.max(...keywords.map((k) => k.volume)) : 0;
}

/**
 * Whether a guide should be placed after the reachable ones.
 *
 * Difficulty is the stand-in. Where the results have actually been looked at,
 * that reading wins in both directions — which matters here because the two
 * highest-reach guides in the teams cluster clear the difficulty bar easily
 * and cannot rank: team building activities at difficulty 5 against Asana and
 * BambooHR, questions to ask in an interview at 9 against Indeed. They were
 * holding first and second place on that hub. Meanwhile how-to-stop-
 * overthinking is difficulty 34 with a DR 1 site at position five, and was
 * being pushed to the back on the score alone.
 */
function isStranded(bridge: { frontmatter: BridgeFrontmatter }): boolean {
  const verdict = bridge.frontmatter.serp_verdict;
  if (verdict === "authority") return true;
  if (verdict === "winnable") return false;
  const difficulty = (bridge.frontmatter.target_keywords ?? [])[0]?.difficulty;
  return difficulty !== undefined && difficulty > STRANDED_DIFFICULTY;
}

/**
 * Order guides within a cluster by what they can actually bring in.
 *
 * The declared order was roughly biggest-first, which tracks volume and so put
 * the least reachable pages at the top: /topics/personal-growth opened with
 * how-to-stop-overthinking at difficulty 34 and how-to-be-more-confident at
 * 54, while how-to-be-vulnerable sat eighth. First position on a cluster hub
 * is the most valuable slot it has.
 *
 * Stranded guides are not hidden — they are placed after the reachable ones.
 */
export function byReach<T extends { frontmatter: BridgeFrontmatter }>(bridges: T[]): T[] {
  return [...bridges].sort((a, b) => {
    const strandedDiff = Number(isStranded(a)) - Number(isStranded(b));
    if (strandedDiff !== 0) return strandedDiff;
    return reachOf(b) - reachOf(a);
  });
}

export function getCategoryBySlug(slug: string): GuideCategory | undefined {
  return GUIDE_CATEGORIES.find((c) => c.slug === slug);
}

/** The cluster a guide belongs to, or undefined if it has not been placed in one. */
export function getCategoryForGuide(guideSlug: string): GuideCategory | undefined {
  return GUIDE_CATEGORIES.find((c) => c.slugs.includes(guideSlug));
}

export interface CategorisedGuide {
  slug: string;
  title: string;
  description: string;
}

/** Guides belonging to a cluster, in declared order, skipping any that no longer exist. */
export async function getGuidesInCategory(categorySlug: string): Promise<CategorisedGuide[]> {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return [];

  const bridges = await loadBridges();
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));

  const found = category.slugs
    .map((slug) => bySlug.get(slug))
    .filter((bridge) => bridge !== undefined);

  return byReach(found).map((bridge) => ({
    slug: bridge.slug,
    title: bridge.frontmatter.title,
    description: bridge.frontmatter.description,
  }));
}
