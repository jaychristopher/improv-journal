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
 *   - shared drills: the exercises both guides' rendered bodies link
 *   - shared significant tokens across title + target keywords
 *
 * `entry_atoms` means "the atoms a guide is built to enter from" and is kept
 * narrow because this module scores on it (the reverse index in content.ts
 * says so and must stay true). The drills a guide walks through are the 1
 * kind of concept a guide never declares — 28 of the 31 undeclared section
 * headings are exercises (tracker entry 324) — so the rail read them from
 * nowhere: on 34 of 78 guides the guide sharing the most rendered concept
 * links was off the rail, and the concepts those pairs shared were drills,
 * 83 of 148 (entry 325, 2026-09-22). The rail now reads the drills from the
 * rendered body, so the field need not widen to carry them.
 *
 * A small curated seed list wins placement where an editorial pairing is
 * better than the computed one.
 *
 * Then the guide's topic cluster: below the strong siblings, candidates filed
 * in the same cluster come before candidates filed elsewhere, each group in
 * score order. See `getRelatedBridges` for why, and for why the strong
 * siblings are exempt.
 *
 * And on a page whose own verdict is `authority`, the winnable candidates in
 * each tier come before the gated ones. See `getRelatedBridges` for the
 * reading behind that, and for why a winnable page is left as it was.
 *
 * Last, a fair-share pass over the whole layer, because a rail scored page by
 * page is a graph nobody reads as one. See `FAIR_SHARE_SLOTS_PER_RAIL` and
 * `fairShareRails`.
 */

import { anchorLabel } from "./anchor-text";
import { clusterMap, STRONG_PAIR_ATOMS } from "./cluster-cohesion";
import { getAtomUrl, loadAtoms, loadBridges } from "./content";
import { GUIDE_CATEGORIES } from "./guide-categories";
import { isAuthority } from "./guide-cohorts";
import type { BridgeFrontmatter, BridgeTargetKeyword } from "./schema";

/** Above this, a term is not winnable from the site's current authority. */
const STRANDED_DIFFICULTY = 30;

const ATOM_WEIGHT = 3;
const PATH_WEIGHT = 2;
const TOKEN_WEIGHT = 1;
/**
 * Per exercise both guides' rendered bodies link. Below ATOM_WEIGHT so the
 * declared signal still leads: 1 declared atom outscores 1 shared drill, and
 * the tier a guide sits in is decided by declared atoms first. Chosen by
 * measuring on 2026-09-22 (tracker entry 325): at 1 the drill-organised
 * guides still lost their top drill-sharer on 2 of 9 pages, because a
 * 3-atom sibling at 9 points outscored 7 shared drills; at 2 they lose it
 * on 0, and the guide sharing the most rendered concept links is off the
 * rail on 23 of 78 guides against 34 before (LINK_SHARER_MISSES_CEILING in
 * related-bridges.test.ts).
 */
export const DRILL_WEIGHT = 2;
/**
 * Shared drills that make a pair strong siblings, wherever filed: the first
 * count whose drill score reaches what STRONG_SIBLING_ATOMS declared atoms
 * carry, so by the score's own arithmetic a drill-strong pair is at least
 * as related as an atom-strong one. Needed because the drill term alone
 * could not reach the rail: `theatre-games` is filed under Improv Skills
 * and `active-listening-exercises` under Communication, so the 11 drills
 * they share put theatre-games in the elsewhere tier behind 6 same-cluster
 * guides, and the score term moved the miss count from 34 to 33. With the
 * door it is 23. Declared atoms still decide the wide limit.
 */
export const STRONG_SIBLING_DRILLS = Math.ceil((STRONG_PAIR_ATOMS * ATOM_WEIGHT) / DRILL_WEIGHT);

export const RELATED_GUIDE_LIMIT = 4;
/**
 * Guides with more than four strong siblings get six slots. Guides that share
 * three or more entry atoms are hand-linked 25% of the time (tracker entry
 * 244, 2026-09-21), so for the 209 unlinked pairs this widget is the only
 * connection; capping it at four hid the fifth and sixth sibling exactly where
 * the relatedness was strongest.
 */
export const RELATED_GUIDE_LIMIT_WIDE = 6;
export const STRONG_SIBLING_ATOMS = STRONG_PAIR_ATOMS;

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

/**
 * The guides a guide's own prose already links.
 *
 * Root-relative markdown links, `](/slug)`, are how a guide links a sibling
 * guide by hand; the same shape also reaches `/practice/...` and `/paths/...`,
 * which cannot collide with a guide slug because guides are published at the
 * root and those are directories. Only the first path segment is taken, so a
 * fragment or query on the link does not hide it.
 */
export function bodyLinkedSlugs(markdown: string): Set<string> {
  const slugs = new Set<string>();
  for (const m of markdown.matchAll(/\]\(\/([a-z0-9-]+)(?=[/#?)\s"])/g)) slugs.add(m[1]);
  return slugs;
}

function overlap<T>(a: Iterable<T>, b: Set<T>): number {
  let count = 0;
  for (const item of a) if (b.has(item)) count += 1;
  return count;
}

let _drillSets: Promise<Map<string, Set<string>>> | null = null;

/**
 * Guide slug → the ids of the exercises its rendered body links.
 *
 * Read from `bridge.html` rather than the markdown because most concept
 * links are written by the prose autolinker at render time: the exercise
 * guides backtick a few drills and link a dozen. The href is mapped back to
 * an atom through `getAtomUrl`, the same way the reverse index in content.ts
 * does it, and only exercises are kept. `getGuideDrills` in guide-concepts.ts
 * reads backticks and stops at 4, which is right for a card row and wrong
 * for a score. Computed once: the rail asks for every pair, 78 × 77.
 */
function guideDrillSets(): Promise<Map<string, Set<string>>> {
  if (!_drillSets) {
    _drillSets = (async () => {
      const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
      const exerciseByUrl = new Map<string, string>();
      for (const atom of atoms) {
        if (atom.frontmatter.type !== "exercise") continue;
        const id = atom.frontmatter.id;
        exerciseByUrl.set(getAtomUrl({ id, type: "exercise" }), id);
      }
      const sets = new Map<string, Set<string>>();
      for (const bridge of bridges) {
        const drills = new Set<string>();
        for (const match of bridge.html.matchAll(/href="(\/[^"?#]*)"/g)) {
          const url = match[1].length > 1 ? match[1].replace(/\/$/, "") : match[1];
          const id = exerciseByUrl.get(url);
          if (id) drills.add(id);
        }
        sets.set(bridge.slug, drills);
      }
      return sets;
    })();
  }
  return _drillSets;
}

export interface RelatedGuide {
  slug: string;
  title: string;
  description: string;
  /**
   * What another page calls this one when it links to it: the head keyword,
   * not the title. Undefined only when the guide declares no keywords, in
   * which case the caller falls back to the title.
   */
  label?: string;
  /**
   * How many exercises both guides' rendered bodies link. The rail says it
   * on a guide that shares SHARED_DRILLS_SHOWN or more, so a reader knows
   * why this guide and not the cluster neighbour (tracker entry 325).
   */
  sharedDrills?: number;
}

/**
 * From this many shared drills the rail item carries a "shares N drills"
 * line. A marker that is true everywhere it appears is a fact about the
 * site, not the page (tracker entry 323): at 3, the line lands on 46 of
 * the 418 slots on 20 of the 78 guides (2026-09-22), the drill-organised
 * guides and their neighbours, so it discriminates. At 2 it would be 97.
 */
export const SHARED_DRILLS_SHOWN = 3;

/**
 * Slots a guide's rail gives up so a guide nothing points at gets one.
 *
 * Read as a directed graph, the rail scored page by page was 1 strongly
 * connected component of 72 guides and 6 singletons, 5 of which received no
 * rail link at all: funny-questions-to-ask (traffic potential 17,000, the
 * site's second-largest page), framing-effect, del-close, how-to-read-the-room
 * and improv-theory each offered 4 neighbours and were offered by none of the
 * other 77 (tracker entry 336, 2026-09-22). They are not the unrelated pages:
 * funny-questions-to-ask shares declared concepts with 27 guides. They are the
 * pages whose every sharer already has 4 better sharers, so the cap — not the
 * score — decides who is never linked, and the rail reproduced the shape entry
 * 108 found in the footer, a promoted core and a starved fringe.
 *
 * So after the scoring and the cap, each guide with no inbound rail link takes
 * 1 slot on the rail of the guide that scores it highest, displacing that
 * rail's last computed slot. At 1 the cost is bounded and visible: 5 of the 418
 * slots moved, the rail's worst-scoring slot on 5 pages. Curated entries keep
 * their precedence and are never displaced, a guide the host's body already
 * links is still never offered (only scored candidates are eligible, and the
 * body-linked ones are not scored), no rail gives up more than this many slots,
 * and a slot whose own guide would drop to 0 inbound is not taken — the pass
 * must not create the starvation it removes.
 */
export const FAIR_SHARE_SLOTS_PER_RAIL = 1;

type Bridge = Awaited<ReturnType<typeof loadBridges>>[number];

/** Everything the scoring reads, loaded once for the whole layer. */
interface RailContext {
  bridges: Bridge[];
  drillSets: Map<string, Set<string>>;
  clusterOf: ReturnType<typeof clusterMap>;
}

/** One guide's rail as the scoring and the cap leave it, before fair share. */
interface ScoredRail {
  /** The chosen slugs, curated first and computed after, already capped. */
  slugs: string[];
  /** How many leading slots are curated, and so immovable. */
  curated: number;
  /** Every candidate that scored above 0, and what it scored here. */
  scores: Map<string, number>;
}

/**
 * The rail for 1 guide, by score alone. Everything the module comment and
 * `getRelatedBridges` describe — the tiers, the curated precedence, the
 * body-link exclusion, the hands-on ordering, the wide limit — happens here.
 *
 * Separate from the public entry point because the fair-share pass needs every
 * guide's rail and every guide's scores before it can answer for 1 of them,
 * and a pass that called the public function would call itself.
 */
function scoreRail(self: Bridge, ctx: RailContext, limit: number): ScoredRail {
  const slug = self.slug;
  const { bridges, drillSets, clusterOf } = ctx;
  const selfDrills = drillSets.get(slug) ?? new Set<string>();

  const selfAtoms = new Set(self.frontmatter.entry_atoms ?? []);
  const selfTokens = topicTokens(self.frontmatter);
  const inBody = bodyLinkedSlugs(self.content);
  const strongSiblings = bridges.filter(
    (b) =>
      b.slug !== slug &&
      overlap(b.frontmatter.entry_atoms ?? [], selfAtoms) >= STRONG_SIBLING_ATOMS,
  ).length;
  if (limit === RELATED_GUIDE_LIMIT && strongSiblings > RELATED_GUIDE_LIMIT) {
    limit = RELATED_GUIDE_LIMIT_WIDE;
  }

  const selfCluster = clusterOf.get(slug);
  const handsOn = isAuthority(self.frontmatter);
  const scored = bridges
    .filter((b) => b.slug !== slug && !inBody.has(b.slug))
    .map((b) => {
      const fm = b.frontmatter;
      const atomScore = overlap(fm.entry_atoms ?? [], selfAtoms) * ATOM_WEIGHT;
      const pathScore =
        fm.entry_path && fm.entry_path === self.frontmatter.entry_path ? PATH_WEIGHT : 0;
      const tokenScore = overlap(topicTokens(fm), selfTokens) * TOKEN_WEIGHT;
      const sharedDrills = overlap(drillSets.get(b.slug) ?? [], selfDrills);
      const drillScore = sharedDrills * DRILL_WEIGHT;
      const sameCluster = selfCluster !== undefined && clusterOf.get(b.slug) === selfCluster;
      const strong =
        atomScore >= STRONG_SIBLING_ATOMS * ATOM_WEIGHT || sharedDrills >= STRONG_SIBLING_DRILLS;
      // 0: strong sibling, wherever filed; 1: same cluster; 2: elsewhere.
      const tier = strong ? 0 : sameCluster ? 1 : 2;
      return {
        bridge: b,
        score: atomScore + pathScore + tokenScore + drillScore,
        sameCluster,
        tier,
      };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (handsOn
          ? Number(isAuthority(a.bridge.frontmatter)) - Number(isAuthority(b.bridge.frontmatter))
          : 0) ||
        b.score - a.score ||
        Number(b.sameCluster) - Number(a.sameCluster) ||
        rankability(b.bridge.frontmatter.target_keywords, b.bridge.frontmatter.serp_verdict) -
          rankability(a.bridge.frontmatter.target_keywords, a.bridge.frontmatter.serp_verdict) ||
        a.bridge.slug.localeCompare(b.bridge.slug),
    );

  const scores = new Map(scored.map((entry) => [entry.bridge.slug, entry.score]));
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const ordered: string[] = [];
  const seen = new Set<string>([slug, ...inBody]);

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
    if (bySlug.has(curatedSlug) && !seen.has(curatedSlug)) {
      ordered.push(curatedSlug);
      seen.add(curatedSlug);
    }
  }
  const curated = Math.min(ordered.length, limit);
  for (const { bridge } of scored) {
    if (ordered.length >= limit) break;
    if (seen.has(bridge.slug)) continue;
    ordered.push(bridge.slug);
    seen.add(bridge.slug);
  }

  return { slugs: ordered.slice(0, limit), curated, scores };
}

/**
 * Every guide's scored rail, computed once per limit.
 *
 * The rail asks for every pair and the drill sets are read from the rendered
 * html, so the layer is expensive and the page asks for it 78 times; cached
 * the way `guideDrillSets` is, and for the same reason.
 */
const _baseRails = new Map<number, Promise<Map<string, ScoredRail>>>();

function baseRails(limit: number): Promise<Map<string, ScoredRail>> {
  let pending = _baseRails.get(limit);
  if (!pending) {
    pending = (async () => {
      const [bridges, drillSets] = await Promise.all([loadBridges(), guideDrillSets()]);
      const ctx: RailContext = { bridges, drillSets, clusterOf: clusterMap(GUIDE_CATEGORIES) };
      return new Map(bridges.map((b) => [b.slug, scoreRail(b, ctx, limit)]));
    })();
    _baseRails.set(limit, pending);
  }
  return pending;
}

/**
 * The published rails: the scored ones, with the fair-share pass applied.
 *
 * A guide with no inbound rail link claims the last computed slot on the rail
 * of the guide that scores it highest. The claims are taken strongest first —
 * by what the best scorer scores, then by slug — so that where 2 starved
 * guides want the same host, the pair the score likes better gets it and the
 * other falls to its next-best host; without an order the result would depend
 * on the corpus's file order. A host is skipped when it has already given up
 * FAIR_SHARE_SLOTS_PER_RAIL slots, when every slot it has is curated, or when
 * the slot on offer holds a guide that would itself drop to 0 inbound.
 *
 * See FAIR_SHARE_SLOTS_PER_RAIL for the reading this comes from.
 */
const _fairShareRails = new Map<number, Promise<Map<string, string[]>>>();

function fairShareRails(limit: number): Promise<Map<string, string[]>> {
  let pending = _fairShareRails.get(limit);
  if (!pending) {
    pending = (async () => {
      const rails = await baseRails(limit);
      const published = new Map([...rails].map(([slug, rail]) => [slug, [...rail.slugs]]));
      if (FAIR_SHARE_SLOTS_PER_RAIL < 1) return published;

      const inbound = new Map<string, number>([...rails.keys()].map((slug) => [slug, 0]));
      for (const rail of rails.values()) {
        for (const slug of rail.slugs) inbound.set(slug, (inbound.get(slug) ?? 0) + 1);
      }

      const claims = [...inbound]
        .filter(([, count]) => count === 0)
        .map(([slug]) => ({
          slug,
          // Every guide that scored this one, best first: its possible hosts.
          hosts: [...rails]
            .filter(([host, rail]) => host !== slug && rail.scores.has(slug))
            .map(([host, rail]) => ({ host, score: rail.scores.get(slug)! }))
            .sort((a, b) => b.score - a.score || a.host.localeCompare(b.host)),
        }))
        .sort(
          (a, b) =>
            (b.hosts[0]?.score ?? 0) - (a.hosts[0]?.score ?? 0) || a.slug.localeCompare(b.slug),
        );

      const given = new Map<string, number>();
      for (const claim of claims) {
        for (const { host } of claim.hosts) {
          if ((given.get(host) ?? 0) >= FAIR_SHARE_SLOTS_PER_RAIL) continue;
          const rail = published.get(host)!;
          // Curated slots are not the pass's to spend, and a rail that is all
          // curated has nothing to offer.
          if (rail.length <= rails.get(host)!.curated) continue;
          const displaced = rail[rail.length - 1];
          if ((inbound.get(displaced) ?? 0) <= 1) continue;
          rail[rail.length - 1] = claim.slug;
          inbound.set(displaced, inbound.get(displaced)! - 1);
          inbound.set(claim.slug, (inbound.get(claim.slug) ?? 0) + 1);
          given.set(host, (given.get(host) ?? 0) + 1);
          break;
        }
      }
      return published;
    })();
    _fairShareRails.set(limit, pending);
  }
  return pending;
}

/**
 * Resolve the guides most related to `slug`, curated entries first.
 * Returns at most `limit` results and never includes `slug` itself.
 *
 * Nor does it include a guide the body already links. Three structures relate
 * guide to guide — 248 hand links in prose, this widget's 312 slots, and the
 * curated map — and they were built without reading each other: 34% of the
 * widget's slots repeated a link the reader had just passed in the body, and
 * on four guides all four did. The body is in hand here, so the widget now
 * offers only pages the prose does not, and fills from the next-ranked
 * candidates where that empties a slot. That applies to curated pairings
 * too: an editorial pairing the author has already written into the prose is
 * honoured on the page, not twice.
 *
 * Within-cluster first, below the strong siblings. The hub's cluster rail and
 * this widget were two answers to "what is this next to": the rail lists the
 * guide's cluster, the widget ranked by shared atoms alone, and the clusters
 * only half follow the atoms — three are neighbourhoods by the guides' own
 * declarations and Improv Skills is a bucket whose guides share 0.72 atoms
 * inside against 0.65 outside (tracker entry 290, 2026-09-22), so on its
 * pages the widget's first neighbour was usually outside the cluster the
 * page is filed under. Now the computed slots run in three tiers: strong
 * siblings (three or more shared atoms, wherever filed), then the rest of
 * the same cluster, then everyone else, each tier in score order with the
 * cluster breaking ties. The score, the rankability tiebreak, the body-link
 * exclusion, the wide limit and the curated map are unchanged; the cluster
 * is layered into the sort, not in place of the score.
 *
 * The strong siblings are their own tier, in score order, because the two
 * simpler versions were measured first. Cluster above everything connected
 * 166 of the 277 strong pairs by body link or widget where the score alone
 * connected 239, and the 134 strong pairs that cross a cluster line went
 * from 104 connected to 24. Cluster above score inside the strong tier kept
 * the count but moved the wrong pairs: how-to-have-difficult-conversations
 * has fourteen strong siblings for six slots, and its two five-atom pairs,
 * both filed elsewhere, fell off the page behind six same-cluster fours.
 * Those pairs are hand-linked a quarter of the time (entry 244) and this
 * widget is the only route for the rest; the hub's "Also close to" rail
 * carries them cluster to cluster, but a guide page that shares five atoms
 * with another and does not say so is the failure entry 244 fixed. As
 * landed (2026-09-22): the first item changed on 7 of 78 guides and some
 * slot on 49, 243 strong pairs are connected against 239 before (a strong
 * sibling now also outranks a two-atom guide inflated by path and tokens),
 * 108 of the 134 cross-cluster ones against 104, and 54 guides open on a
 * same-cluster guide against 49.
 *
 * On an authority page, winnable first within each tier. The schema says an
 * `authority` guide is kept for readers and is not a ranking candidate, and
 * the 18 of them are mostly the April cohort (13 of 40, against 4 of the 37
 * August guides; tracker entry 305, 2026-09-22). The hand links already
 * choose the winnable guides three to one; the derived blocks were the one
 * place the gated guides received an equal share. So a page the site does
 * not expect to rank hands its reader, and its equity, on to the siblings
 * that can: within each tier the candidates the SERP was read and found open
 * for come before the ones it was read and found closed for, and the rest of
 * the sort — score, cluster, the rankability tiebreak, the body-link
 * exclusion, the curated map's precedence — is as before. A winnable page
 * is not touched: there the rail is a set of neighbours, not a hand-off, and
 * a gated neighbour can still be the closest one. Unchecked candidates sit
 * with the winnable ones, because absent means nobody has looked, not that
 * the results are closed. As landed: on the 18 authority pages the first
 * computed slot was gated on 1 (networking-tips) and is on 0; counting the
 * curated slots, the first item was gated on 4 and is on 3, the three being
 * curated pairings (collaboration-skills, how-to-be-a-good-friend,
 * how-to-make-friends-as-an-adult) that keep their precedence for the
 * reason recorded below; some slot moved on 8 of the 18; 0 slots moved on
 * the 60 other guides.
 *
 * Shared drills (tracker entry 325, 2026-09-22) enter in 2 places and
 * nowhere else. The count is added to the score at DRILL_WEIGHT, so inside
 * a tier a guide that walks through the same exercises moves up; and a pair
 * sharing STRONG_SIBLING_DRILLS or more is a strong sibling, because the
 * pairs the rail missed were the exercise guides — which declare
 * abstractions and link drills — and they were filed in different clusters,
 * so no score inside the tier could reach them. The 3 tiers, the body-link
 * exclusion, the curated map, the hands-on ordering and the wide limit read
 * the same fields as before. As landed: the guide sharing the most rendered
 * concept links is off the rail on 23 of 78 guides against 34, and on 14
 * of those every slot shares fewer against 23; some slot changed on 47
 * guides (150 of the 418 slots) and the first on 13, 10 of them the
 * drill-organised guides and their neighbours — theatre-games opens on
 * active-listening-exercises (11 shared drills) instead of viewpoints (0).
 *
 * And then the fair-share pass, which is the one part of this that is not a
 * property of the page: a rail scored page by page left 5 guides with no
 * inbound rail link at all (tracker entry 336, 2026-09-22), so the layer is
 * scored in full, the starved set read off the inverted graph, and each of
 * them given 1 slot on its best scorer. This function stays the only way in
 * and its signature and result are unchanged; `scoreRail` holds the scoring
 * above, `fairShareRails` the pass, and both are memoised per limit because
 * answering for 1 guide now needs all 78.
 */
export async function getRelatedBridges(
  slug: string,
  limit = RELATED_GUIDE_LIMIT,
): Promise<RelatedGuide[]> {
  const [bridges, drillSets, rails] = await Promise.all([
    loadBridges(),
    guideDrillSets(),
    fairShareRails(limit),
  ]);
  const chosen = rails.get(slug);
  if (!chosen) return [];
  const selfDrills = drillSets.get(slug) ?? new Set<string>();
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));

  return chosen.map((related) => {
    const b = bySlug.get(related)!;
    return {
      slug: b.slug,
      title: b.frontmatter.title,
      description: b.frontmatter.description,
      // Same rule as the footer, from the same function: the highest-volume
      // keyword sharing the primary's parent topic that the page actually says,
      // capitalised as a name where the page's subject says it is one.
      label: anchorLabel(
        b.frontmatter.target_keywords ?? [],
        b.frontmatter.subject,
        `${b.frontmatter.title}\n${b.content}`,
      ),
      sharedDrills: overlap(drillSets.get(b.slug) ?? [], selfDrills),
    };
  });
}
