/**
 * The guide layer as two cohorts, read from what the guides declare.
 *
 * The 78 bridges were written in two batches — 40 in April 2026, 37 in
 * August, one in May — and the batches differ in what they aim at and in what
 * Ahrefs said back (tracker entry 305, 2026-09-22). The April guides target a
 * median 1,300 monthly traffic potential and hold 13 of the site's 18
 * `authority` verdicts; the August guides target a median 27,000 on the
 * primary keyword and hold 4. Hand links follow the verdict without a rule
 * saying so: a winnable guide receives a median 3 hand links from other
 * guides, an authority one 1, and the August cohort links itself 2.8 times a
 * guide against the April cohort's 1.2. The derived surfaces did not follow
 * it at all. The schema says an authority guide is "kept for readers and is
 * not a ranking candidate", and every derived block treated it as one.
 *
 * Everything here is pure over the loaded bridges so a test can compute the
 * same readings a page acts on. `isAuthority` is the one predicate the page
 * layer needs; the rest is the reading, kept so a future batch of guides is
 * measured against both cohorts rather than against "the guides".
 */

import type { BridgeFrontmatter } from "./schema";

export interface CohortBridge {
  slug: string;
  content: string;
  frontmatter: Pick<BridgeFrontmatter, "created" | "serp_verdict" | "target_keywords">;
}

/**
 * Whether the SERP for this guide's primary keyword has been read and found
 * gated behind domains the site will not outrank. Read from the field, never
 * derived from difficulty or domain rating: the schema records the verdict as
 * the reading of the whole page of results, and the number is evidence for
 * it, not the criterion.
 */
export function isAuthority(fm: Pick<BridgeFrontmatter, "serp_verdict">): boolean {
  return fm.serp_verdict === "authority";
}

/** `YYYY-MM` of the guide's `created` date: the cohort key. */
function cohortOf(fm: Pick<BridgeFrontmatter, "created">): string {
  return String(fm.created).slice(0, 7);
}

export interface CohortReading {
  /** `YYYY-MM`. */
  cohort: string;
  guides: number;
  winnable: number;
  authority: number;
  /** No `serp_verdict`: nobody has looked, which the schema says is a state. */
  unchecked: number;
  /**
   * Median primary-keyword traffic potential over the guides that declare
   * one. Guides with no keyword are left out rather than counted as zero — an
   * absent Ahrefs number is an absence, not a reading.
   */
  medianTrafficPotential: number | undefined;
  /** How many guides the median was taken over. */
  withTrafficPotential: number;
}

export function median(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 1 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** One reading per creation month, oldest first. */
export function cohortReadings(bridges: readonly CohortBridge[]): CohortReading[] {
  const byCohort = new Map<string, CohortBridge[]>();
  for (const bridge of bridges) {
    const key = cohortOf(bridge.frontmatter);
    const list = byCohort.get(key);
    if (list) list.push(bridge);
    else byCohort.set(key, [bridge]);
  }
  return [...byCohort.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cohort, list]) => {
      const potentials = list
        .map((b) => b.frontmatter.target_keywords?.[0]?.traffic_potential)
        .filter((tp): tp is number => typeof tp === "number");
      return {
        cohort,
        guides: list.length,
        winnable: list.filter((b) => b.frontmatter.serp_verdict === "winnable").length,
        authority: list.filter((b) => isAuthority(b.frontmatter)).length,
        unchecked: list.filter((b) => b.frontmatter.serp_verdict === undefined).length,
        medianTrafficPotential: median(potentials),
        withTrafficPotential: potentials.length,
      };
    });
}

/**
 * The other guides a guide's prose links by hand, each once.
 *
 * The same root-relative markdown shape related-bridges reads, `](/slug)`,
 * narrowed to slugs that are guides and not the page itself. A guide that
 * links a sibling twice counts it once: the tracker's cohort ratios (1.2,
 * 1.0, 2.8, 1.5) are per distinct pair, and counting repeats reads 1.25 /
 * 1.07 / 3.11 / 1.65 instead.
 */
export function handLinkedGuides(bridge: CohortBridge, guideSlugs: ReadonlySet<string>): string[] {
  const linked = new Set<string>();
  for (const m of bridge.content.matchAll(/\]\(\/([a-z0-9-]+)(?=[/#?)\s"])/g)) {
    if (m[1] !== bridge.slug && guideSlugs.has(m[1])) linked.add(m[1]);
  }
  return [...linked];
}

export interface CohortLinkRatio {
  from: string;
  to: string;
  /** Distinct hand links from guides in `from` to guides in `to`. */
  links: number;
  /** Guides in `from`. */
  sources: number;
  /** `links / sources`. */
  perSource: number;
}

/**
 * Hand links per source guide between every pair of cohorts, including a
 * cohort to itself, in cohort order.
 */
export function cohortLinkRatios(bridges: readonly CohortBridge[]): CohortLinkRatio[] {
  const slugs = new Set(bridges.map((b) => b.slug));
  const cohortBySlug = new Map(bridges.map((b) => [b.slug, cohortOf(b.frontmatter)]));
  const cohorts = [...new Set(cohortBySlug.values())].sort();
  const sources = new Map(cohorts.map((c) => [c, 0]));
  const links = new Map<string, number>();
  for (const bridge of bridges) {
    const from = cohortOf(bridge.frontmatter);
    sources.set(from, (sources.get(from) ?? 0) + 1);
    for (const target of handLinkedGuides(bridge, slugs)) {
      const key = `${from}\t${cohortBySlug.get(target)}`;
      links.set(key, (links.get(key) ?? 0) + 1);
    }
  }
  const ratios: CohortLinkRatio[] = [];
  for (const from of cohorts) {
    for (const to of cohorts) {
      const count = links.get(`${from}\t${to}`) ?? 0;
      const n = sources.get(from) ?? 0;
      ratios.push({ from, to, links: count, sources: n, perSource: n === 0 ? 0 : count / n });
    }
  }
  return ratios;
}

/**
 * Median distinct hand links a guide receives from other guides, by verdict.
 * Winnable 3 and authority 1 on 2026-09-22; the tracker's 4 for winnable
 * counted a sibling that linked the same guide twice as two.
 */
export function medianHandInboundByVerdict(
  bridges: readonly CohortBridge[],
): Record<"winnable" | "authority" | "unchecked", number | undefined> {
  const slugs = new Set(bridges.map((b) => b.slug));
  const inbound = new Map<string, number>();
  for (const bridge of bridges) {
    for (const target of handLinkedGuides(bridge, slugs)) {
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
  }
  const of = (pick: (b: CohortBridge) => boolean) =>
    median(bridges.filter(pick).map((b) => inbound.get(b.slug) ?? 0));
  return {
    winnable: of((b) => b.frontmatter.serp_verdict === "winnable"),
    authority: of((b) => isAuthority(b.frontmatter)),
    unchecked: of((b) => b.frontmatter.serp_verdict === undefined),
  };
}
