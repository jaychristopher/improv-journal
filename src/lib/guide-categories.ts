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

import { type AlsoCloseGuide, alsoCloseTo } from "./cluster-cohesion";
import { loadBridges } from "./content";
import type { BridgeFrontmatter } from "./schema";

export interface GuideCategory {
  slug: string;
  title: string;
  /** Shown on the hub. Deliberately terse. */
  description: string;
  /** The search snippet. Separate because the visible blurb is far too short for one. */
  metaDescription: string;
  /**
   * What the guides in this category have in common, and how to pick one.
   *
   * The hubs were a heading, a one-line blurb and a list, which is a directory
   * rather than a page — their only headings were the navigation blocks. A
   * reader arriving at a category does not yet know which of eighteen guides is
   * theirs, and the site's own answer everywhere else is to sort by what is
   * going wrong rather than by what sounds relevant. These say that per
   * category, in the terms that category actually uses.
   */
  orientation: string[];
  slugs: string[];
}

export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    slug: "personal-growth",
    title: "Personal Growth",
    description: "Overthinking, confidence, creativity, fear, and presence.",
    metaDescription:
      "Overthinking, confidence, creativity, fear, and presence — improv practices for the parts of life that go wrong inside your own head.",
    orientation: [
      `Almost everything in this category is an attention problem wearing the costume of a character problem. Overthinking, awkwardness, the fear before speaking, the sense of not being present — each is usually described as a fixed trait ("I'm an anxious person") and each turns out to be a question of where a finite amount of attention is currently pointed.`,
      `That matters for choosing, because the two framings lead to different pages. If you are looking for the guide that will tell you to be different, none of these do it. They tell you where to put your attention instead, which is a smaller instruction and the only one that works under pressure.`,
      `Pick by the moment it goes wrong rather than by the label. Loops that run after the event are overthinking. Discomfort during a conversation is awkwardness. Dread arriving days beforehand is a different thing again, and the guides say so where it applies rather than selling you a technique for it.`,
    ],
    slugs: [
      "how-to-stop-overthinking",
      "how-to-be-more-confident",
      "confidence-building-exercises",
      "how-to-be-more-creative",
      "how-to-be-witty",
      "how-to-think-on-your-feet",
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
    orientation: [
      `Nearly all conversation advice is about output — what to say, which question to ask, how to phrase the difficult thing. The guides here are mostly about input, because that is where improv locates the problem: a conversation fails when somebody stops receiving, and everything downstream of that is a symptom.`,
      `So the ones about listening and reading a room underpin the rest. The question lists are useful and they are the surface layer; a good question asked by somebody not attending to the answer produces a worse conversation than a dull question asked by somebody who is.`,
      `Choose by which half is failing. If you run out of things to say, the starters and question lists help. If conversations feel flat despite having plenty to say, the problem is on the receiving side and the listening guides are the ones to read.`,
    ],
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
      "36-questions-to-fall-in-love",
      "questions-to-ask-a-girl",
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
    orientation: [
      `The recurring finding across these is that most team problems are structural rather than interpersonal, and that exercises cannot fix conditions. A team that is under-resourced, or whose disagreement has been punished once, does not have a skills gap — and running an activity at it is visible enough as management theatre to make the next attempt harder.`,
      `Which is why several of these guides spend as much space on when not to run something as on how to run it. That is not hedging. It is the most useful thing improv has to say about groups: the ensemble is a set of conditions, and the conditions are set by whoever holds the most status in the room.`,
      `Choose by whether you are trying to change a behaviour or a condition. Activities and questions work on behaviour. Safety, feedback and how decisions get made are conditions, and they change more slowly and from the top.`,
    ],
    slugs: [
      "team-building-activities",
      "improv-team-building",
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
    orientation: [
      `This is the craft itself rather than its applications, and it is the part of the site with the most first-hand material behind it — sixty years of practice, five traditions that disagree with each other in useful ways, and a vocabulary precise enough to diagnose why a specific scene died.`,
      `The guides split three ways. Some define the form and its parts, for readers who want to know what improv actually is before deciding anything. Some are collections you can run tonight — games, prompts, exercises — with the rules included rather than linked. And some are about the people and ideas the whole thing rests on, which is the layer most improv writing skips and the reason the rest is more than a list of tips.`,
      `If you are new, start with what improv is and the rules that get quoted at you, in that order — the second is considerably more useful once you know what it is describing.`,
    ],
    slugs: [
      "what-is-improv",
      "rules-of-improv",
      "how-to-be-funny",
      "how-to-get-better-at-improv",
      "improv-theory",
      "framing-effect",
      "theatre-games",
      "improv-games-for-kids",
      "improv-warm-up-games",
      "2-person-improv-games",
      "improv-prompts",
      "viewpoints",
      "del-close",
      "viola-spolin",
      "yes-and-improv",
    ],
  },
];

/** Above this, a term is not winnable from the site's current authority. */
const STRANDED_DIFFICULTY = 30;

/**
 * What a guide could bring in, as Ahrefs measured it: the primary keyword's
 * traffic potential, or undefined where nobody has looked it up.
 *
 * This used to fall back to the peak declared volume, which is a different
 * number — volume is one keyword's searches, traffic potential is what the
 * top-ranking page takes across every keyword it holds — and the seven guides
 * without a traffic potential were being sorted on it against everyone else's
 * traffic potential. On /topics/improv-skills that put viola-spolin (volume
 * 800, unchecked) above rules-of-improv (traffic potential 400, verdict
 * winnable). One unit per sort key; guides with no measurement rank after
 * those with one, see `byReach`.
 */
export function trafficPotentialOf(bridge: { frontmatter: BridgeFrontmatter }): number | undefined {
  return (bridge.frontmatter.target_keywords ?? [])[0]?.traffic_potential;
}

/** Peak declared volume: the only size the unmeasured guides carry, used among themselves. */
function volumeOf(bridge: { frontmatter: BridgeFrontmatter }): number {
  const keywords = bridge.frontmatter.target_keywords ?? [];
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
export function isStranded(bridge: { frontmatter: BridgeFrontmatter }): boolean {
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
/**
 * How many top-ten results a low-authority site could plausibly displace.
 *
 * Reach is an estimate about a results page nobody has read. Where one has been
 * read, `serp_top10_dr` holds every domain rating in it, and the count under
 * DR 50 is the only direct measure available of whether there is anything here
 * to take. It disagrees with reach: what-is-improv has three reachable results,
 * the most on the site alongside viewpoints and yes-and-improv, and 250 of
 * traffic potential — so reach alone buried it near the bottom of the one
 * cluster this domain demonstrably gets surfaced for.
 */
const REACHABLE_UNDER = 50;
const STRONG_EVIDENCE = 3;

function reachableCount(bridge: { frontmatter: BridgeFrontmatter }): number {
  return (bridge.frontmatter.serp_top10_dr ?? []).filter((dr) => dr < REACHABLE_UNDER).length;
}

export function byReach<T extends { frontmatter: BridgeFrontmatter }>(bridges: T[]): T[] {
  return [...bridges].sort((a, b) => {
    const strandedDiff = Number(isStranded(a)) - Number(isStranded(b));
    if (strandedDiff !== 0) return strandedDiff;
    // Measured evidence goes in front of estimated size, but only where it is
    // strong. This is not a full reachability sort: 48 verdicts predate the
    // profile and have no distribution recorded, so ranking every page this way
    // would mostly be ranking on whether anyone happened to look yet.
    const evidenceDiff =
      Number(reachableCount(b) >= STRONG_EVIDENCE) - Number(reachableCount(a) >= STRONG_EVIDENCE);
    if (evidenceDiff !== 0) return evidenceDiff;
    // Measured before unmeasured, then each on its own unit: traffic potential
    // among the guides that have one, declared volume among those that do not.
    const tpA = trafficPotentialOf(a);
    const tpB = trafficPotentialOf(b);
    if (tpA !== undefined && tpB !== undefined) return tpB - tpA;
    if (tpA !== undefined) return -1;
    if (tpB !== undefined) return 1;
    return volumeOf(b) - volumeOf(a);
  });
}

/**
 * The clusters in the order the hubs list them.
 *
 * `GUIDE_CATEGORIES` is typed with Personal Growth first, and both `/guides`
 * and the homepage rendered the array as it was typed: a reader scrolled past
 * nineteen personal-growth guides before the first communication guide, while
 * the communication cluster holds several times the demand (tracker entry
 * 209, 2026-09-21). The rows inside a cluster had a written rule, `byReach`;
 * the sections had none.
 *
 * The rule: clusters sort by the total reach of their winnable guides — the
 * sum, over guides whose `serp_verdict` is `winnable`, of the primary
 * keyword's traffic potential, or the peak declared volume where no traffic
 * potential was measured — descending, ties broken by title. Only checked and
 * winnable guides count because an `authority` verdict means the page is kept
 * for readers and is not a ranking candidate, and an unchecked one is a
 * guess. Membership, verdicts and numbers are untouched; only the order is
 * derived rather than typed, so a new cluster lands where its numbers put it.
 */
export function orderedCategories(
  bridges: { slug: string; frontmatter: BridgeFrontmatter }[],
): GuideCategory[] {
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const reach = new Map(
    GUIDE_CATEGORIES.map((category) => [category.slug, winnableReach(category, bySlug)]),
  );
  return [...GUIDE_CATEGORIES].sort(
    (a, b) => (reach.get(b.slug) ?? 0) - (reach.get(a.slug) ?? 0) || a.title.localeCompare(b.title),
  );
}

/** The sum of reach across a cluster's winnable guides; see `orderedCategories`. */
export function winnableReach(
  category: GuideCategory,
  bySlug: Map<string, { frontmatter: BridgeFrontmatter }>,
): number {
  let total = 0;
  for (const slug of category.slugs) {
    const bridge = bySlug.get(slug);
    if (!bridge || bridge.frontmatter.serp_verdict !== "winnable") continue;
    total += trafficPotentialOf(bridge) ?? volumeOf(bridge);
  }
  return total;
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

/**
 * Where a cluster's guides send their readers next.
 *
 * A guide's topic cluster and its `entry_path` are two groupings: the
 * communication guides route 27 of 29 to one path, the improv-skills guides
 * route to seven (tracker entry 255, 2026-09-21). The hub says which path most
 * of its guides lead into, and how many, so the routing is visible where the
 * reader chooses a guide.
 */
export async function dominantEntryPath(
  categorySlug: string,
): Promise<{ pathId: string; count: number; total: number } | null> {
  const category = getCategoryBySlug(categorySlug);
  if (!category) return null;
  const bridges = await loadBridges();
  const members = bridges.filter((b) => category.slugs.includes(b.slug));
  const counts = new Map<string, number>();
  for (const b of members) {
    const ep = b.frontmatter.entry_path;
    if (ep) counts.set(ep, (counts.get(ep) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? { pathId: top[0], count: top[1], total: members.length } : null;
}

/**
 * The guides filed elsewhere that a cluster's guides are closest to.
 *
 * 134 of the 277 guide pairs sharing three or more entry atoms cross a
 * cluster line (tracker entry 290, 2026-09-22): funny-questions-to-ask and
 * how-to-be-funny share five and sit in Communication and Improv Skills. The
 * hub listed only its own cluster, so the pairs the map splits were two hubs
 * apart. This is the "Also close to" rail: the pure ranking is in
 * cluster-cohesion, this loads the corpus for it.
 */
export async function alsoCloseToCluster(categorySlug: string): Promise<AlsoCloseGuide[]> {
  if (!getCategoryBySlug(categorySlug)) return [];
  const bridges = await loadBridges();
  return alsoCloseTo(categorySlug, bridges, GUIDE_CATEGORIES);
}
