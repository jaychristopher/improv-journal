/**
 * How well the topic clusters follow the guides' own declarations.
 *
 * `GUIDE_CATEGORIES` is a hand map; `entry_atoms` is what each guide says it
 * is built on. Measured against each other (tracker entry 290, 2026-09-22),
 * three clusters are neighbourhoods — a pair inside Communication, Teams or
 * Personal Growth shares about twice the atoms of a pair straddling it — and
 * one is a label: Improv Skills' guides share a mean 0.72 atoms with each
 * other and 0.65 with everyone else. And 134 of the 277 pairs sharing three
 * or more atoms cross a cluster line, so the strongest pairs are often the
 * ones the map splits.
 *
 * Everything here is pure over the loaded bridges and the category map, so
 * the test can compute the same numbers the hub renders. The async loaders
 * live in guide-categories.
 */

import type { GuideCategory } from "./guide-categories";
import type { BridgeFrontmatter } from "./schema";

/**
 * A pair sharing this many entry atoms is a strong pair. The same bar as
 * related-bridges' `STRONG_SIBLING_ATOMS`, defined here so that module can
 * import the cluster helpers without a cycle.
 */
export const STRONG_PAIR_ATOMS = 3;

/** The rail on a topic hub shows at most this many cross-cluster guides. */
export const ALSO_CLOSE_LIMIT = 6;

export interface ClusterBridge {
  slug: string;
  frontmatter: Pick<BridgeFrontmatter, "title" | "description" | "entry_atoms">;
}

/** Guide slug to the slug of the cluster it is filed under. */
export function clusterMap(categories: readonly GuideCategory[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const category of categories) {
    for (const slug of category.slugs) map.set(slug, category.slug);
  }
  return map;
}

/** Entry atoms two guides declare in common. */
export function sharedEntryAtoms(a: ClusterBridge, b: ClusterBridge): number {
  const own = new Set(a.frontmatter.entry_atoms ?? []);
  let count = 0;
  for (const atom of b.frontmatter.entry_atoms ?? []) if (own.has(atom)) count += 1;
  return count;
}

export interface ClusterCohesion {
  cluster: string;
  title: string;
  /** Guides in the cluster that exist. */
  size: number;
  /** Mean atoms shared by a pair with both guides in the cluster. */
  insideMean: number;
  /** Mean atoms shared by a pair with exactly one guide in the cluster. */
  outsideMean: number;
  /** insideMean / outsideMean; Infinity where nothing is shared outside. */
  ratio: number;
}

/**
 * Per cluster, the mean shared entry atoms of a pair inside it against a pair
 * straddling it. A real topic's inside mean is well above its outside mean; a
 * bucket's are the same number.
 */
export function clusterCohesion(
  bridges: readonly ClusterBridge[],
  categories: readonly GuideCategory[],
): ClusterCohesion[] {
  const clusterOf = clusterMap(categories);
  return categories.map((category) => {
    const members = bridges.filter((b) => clusterOf.get(b.slug) === category.slug);
    let insideSum = 0;
    let insidePairs = 0;
    let outsideSum = 0;
    let outsidePairs = 0;
    for (const member of members) {
      for (const other of bridges) {
        if (other.slug === member.slug) continue;
        const shared = sharedEntryAtoms(member, other);
        if (clusterOf.get(other.slug) === category.slug) {
          // Count each inside pair once.
          if (other.slug > member.slug) {
            insideSum += shared;
            insidePairs += 1;
          }
        } else {
          outsideSum += shared;
          outsidePairs += 1;
        }
      }
    }
    const insideMean = insidePairs ? insideSum / insidePairs : 0;
    const outsideMean = outsidePairs ? outsideSum / outsidePairs : 0;
    return {
      cluster: category.slug,
      title: category.title,
      size: members.length,
      insideMean,
      outsideMean,
      ratio: outsideMean === 0 ? Infinity : insideMean / outsideMean,
    };
  });
}

export interface CrossClusterPair {
  a: string;
  b: string;
  clusterA: string;
  clusterB: string;
  shared: number;
}

/**
 * The strongest pairs the map splits: guides in different clusters sharing
 * at least `min` entry atoms, strongest first, then by slug so the order is
 * stable. Each pair appears once, `a` before `b` alphabetically.
 */
export function crossClusterPairs(
  bridges: readonly ClusterBridge[],
  categories: readonly GuideCategory[],
  min = STRONG_PAIR_ATOMS,
): CrossClusterPair[] {
  const clusterOf = clusterMap(categories);
  const sorted = [...bridges].sort((x, y) => x.slug.localeCompare(y.slug));
  const pairs: CrossClusterPair[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const clusterA = clusterOf.get(sorted[i].slug);
    if (!clusterA) continue;
    for (let j = i + 1; j < sorted.length; j++) {
      const clusterB = clusterOf.get(sorted[j].slug);
      if (!clusterB || clusterB === clusterA) continue;
      const shared = sharedEntryAtoms(sorted[i], sorted[j]);
      if (shared < min) continue;
      pairs.push({ a: sorted[i].slug, b: sorted[j].slug, clusterA, clusterB, shared });
    }
  }
  return pairs.sort(
    (x, y) => y.shared - x.shared || x.a.localeCompare(y.a) || x.b.localeCompare(y.b),
  );
}

export interface AlsoCloseGuide {
  slug: string;
  title: string;
  description: string;
  /** The cluster this guide is filed under. */
  cluster: string;
  clusterTitle: string;
  /** The guide in the current cluster it shares most atoms with. */
  closestTo: string;
  closestToTitle: string;
  shared: number;
}

/**
 * For one cluster, the guides filed elsewhere that share at least `min` entry
 * atoms with a guide in it: the hub's "Also close to" rail. Ranked by the
 * most atoms shared with any guide in the cluster, descending, then by slug;
 * each outside guide appears once, naming the in-cluster guide it is closest
 * to (ties broken by slug) and its own cluster. Capped so the rail stays a
 * rail: every cluster has twenty to thirty-two such neighbours.
 */
export function alsoCloseTo(
  categorySlug: string,
  bridges: readonly ClusterBridge[],
  categories: readonly GuideCategory[],
  { min = STRONG_PAIR_ATOMS, limit = ALSO_CLOSE_LIMIT }: { min?: number; limit?: number } = {},
): AlsoCloseGuide[] {
  const clusterOf = clusterMap(categories);
  const titleOf = new Map(categories.map((c) => [c.slug, c.title]));
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const best = new Map<string, AlsoCloseGuide>();
  for (const pair of crossClusterPairs(bridges, categories, min)) {
    let inside: string;
    let outside: string;
    if (pair.clusterA === categorySlug) [inside, outside] = [pair.a, pair.b];
    else if (pair.clusterB === categorySlug) [inside, outside] = [pair.b, pair.a];
    else continue;
    // Pairs arrive strongest first, then alphabetical, so the first sighting
    // of an outside guide is its closest in-cluster partner.
    if (best.has(outside)) continue;
    const guide = bySlug.get(outside);
    const partner = bySlug.get(inside);
    if (!guide || !partner) continue;
    const cluster = clusterOf.get(outside)!;
    best.set(outside, {
      slug: outside,
      title: guide.frontmatter.title,
      description: guide.frontmatter.description,
      cluster,
      clusterTitle: titleOf.get(cluster) ?? cluster,
      closestTo: inside,
      closestToTitle: partner.frontmatter.title,
      shared: pair.shared,
    });
  }
  return [...best.values()]
    .sort((x, y) => y.shared - x.shared || x.slug.localeCompare(y.slug))
    .slice(0, limit);
}
