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

export interface GuideCategory {
  slug: string;
  title: string;
  /** Shown on the hub and used as the category page's meta description. */
  description: string;
  slugs: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    slug: "personal-growth",
    title: "Personal Growth",
    description: "Overthinking, confidence, creativity, fear, and presence.",
    slugs: [
      "how-to-stop-overthinking",
      "how-to-be-more-confident",
      "how-to-be-more-creative",
      "how-to-be-witty",
      "how-to-be-less-awkward",
      "how-to-let-go-of-control",
      "how-to-be-vulnerable",
      "how-to-be-present",
      "how-to-overcome-fear-of-failure",
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
    slugs: [
      "active-listening",
      "active-listening-exercises",
      "how-to-be-a-better-conversationalist",
      "how-to-be-a-good-listener",
      "interpersonal-communication-skills",
      "how-to-stop-overthinking-in-a-relationship",
      "how-to-deal-with-conflict",
      "how-to-read-body-language",
      "how-to-make-small-talk",
      "how-to-have-difficult-conversations",
      "types-of-listening",
    ],
  },
  {
    slug: "teams",
    title: "Teams & Leadership",
    description: "Team building, trust, collaboration, feedback, and group dynamics.",
    slugs: [
      "team-building-activities",
      "team-bonding-activities",
      "team-building-questions",
      "5-minute-team-building",
      "psychological-safety",
      "trust-building-exercises",
      "collaboration-skills",
      "group-dynamics",
      "how-to-read-the-room",
      "how-to-give-feedback",
      "emotional-safety",
    ],
  },
  {
    slug: "improv-skills",
    title: "Improv Skills",
    description: "For improvisers — fundamentals, practice, and getting unstuck.",
    slugs: [
      "what-is-improv",
      "rules-of-improv",
      "how-to-be-funny",
      "how-to-get-better-at-improv",
      "improv-theory",
      "framing-effect",
      "theatre-games",
    ],
  },
];

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

  return category.slugs
    .map((slug) => bySlug.get(slug))
    .filter((bridge) => bridge !== undefined)
    .map((bridge) => ({
      slug: bridge.slug,
      title: bridge.frontmatter.title,
      description: bridge.frontmatter.description,
    }));
}
