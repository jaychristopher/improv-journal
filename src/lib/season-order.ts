import { lessonAtomOrder, type LinkedAtoms } from "./lesson-order";
import { audienceRank as ladderRank } from "./path-progression";
import { sortPrinciples } from "./principle-order";
import type { Audience, Link } from "./schema";

/**
 * The order a podcast season plays its episodes in.
 *
 * The Improv Lab is declared a serial and its hub copy says "play in order",
 * and until 2026-09-22 the order was a table of contents by type: seven
 * seasons in the order Principles, Exercises, Techniques, Laws, Diagnosis,
 * Formats, Vocabulary, alphabetical inside. Read against the graph, 241 of
 * the 618 `requires` edges between its 173 episodes pointed at an episode
 * that played *later* — 200 in a later season, 41 later in the same one —
 * and the Vocabulary season, the definitions everything else rests on, was
 * seventh, so 79 of the 142 episodes before it required a definition the
 * listener had not heard (tracker entry 303). Deep Cuts was worse in kind:
 * its Lessons and Paths seasons played in filename order although the site
 * has a lesson order (`getThreadOrderKey`) and a path order
 * (`getPathProgressionRank`), so *Advanced Game and Character* opened the
 * Paths season and 11 of the 28 consecutive path steps played in reverse
 * (entry 304).
 *
 * This module is the one place a season's order is derived, so the feed,
 * the show page and the tests read the same rule:
 *
 * - an atom season plays `dependencyOrder`: a stable topological sort of its
 *   `requires` edges, prerequisite first, with the old list order as the
 *   tiebreak — the same walk `lessonAtomOrder` does inside a lesson (entry
 *   273), applied to a season;
 * - a season of lessons plays the order the paths teach them, a season of
 *   paths plays the progression, and the library plays by how often the
 *   corpus cites each work.
 *
 * `content.ts` calls this module for its atom seasons, so this module must
 * not import `content.ts`; the lesson and path helpers take the site's own
 * key functions as arguments instead of importing them.
 */

/** The parts of an atom a season order reads. */
interface OrderableAtom {
  frontmatter: {
    id: string;
    title: string;
    type: string;
    links?: readonly Pick<Link, "id" | "relation">[];
  };
}

/** A `requires` edge, dependent → prerequisite. */
interface RequiresEdge {
  from: string;
  to: string;
}

/**
 * The tiebreak: the order a season played before dependencies were read.
 * Principles in their own published order (`principle-order.ts`), then
 * everything else by title, then id, so two runs agree on ties.
 */
export function seasonTieOrder<T extends OrderableAtom>(atoms: readonly T[]): T[] {
  const principles = atoms.filter((a) => a.frontmatter.type === "principle");
  const rest = atoms
    .filter((a) => a.frontmatter.type !== "principle")
    .sort(
      (a, b) =>
        a.frontmatter.title.localeCompare(b.frontmatter.title) ||
        a.frontmatter.id.localeCompare(b.frontmatter.id),
    );
  return [...sortPrinciples(principles), ...rest];
}

/**
 * Every `requires` edge whose two ends are both in `atoms`, each once.
 * Self-links and unknown targets are dropped.
 */
export function requiresEdges(atoms: readonly OrderableAtom[]): RequiresEdge[] {
  const ids = new Set(atoms.map((a) => a.frontmatter.id));
  const seen = new Set<string>();
  const edges: RequiresEdge[] = [];
  for (const atom of atoms) {
    const from = atom.frontmatter.id;
    for (const link of atom.frontmatter.links ?? []) {
      if (link.relation !== "requires" || link.id === from || !ids.has(link.id)) continue;
      const key = `${from}>${link.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to: link.id });
    }
  }
  return edges;
}

/**
 * The atoms in dependency order: a permutation of `seasonTieOrder` in which
 * every prerequisite precedes the atom that requires it wherever the edges
 * allow. Edges to atoms outside the list are ignored, so a season is ordered
 * by its own edges only; a cycle is one unit emitted where its earliest
 * member sits, members in tie order, and the edges inside it are the residual
 * no order removes.
 *
 * One class of edge is read as already settled: a principle that requires
 * another principle. The principles' published order (`principle-order.ts`)
 * is the site's chosen sequence for that type — the hub's dependency diagram,
 * the pager and the season all hold to it — and five of its edges run
 * against that sequence (be-changeable requires be-positive, which the hub
 * teaches sixth after it). Those five are counted by `forwardEdges` like any
 * other, and left where the principle order puts them.
 */
export function dependencyOrder<T extends OrderableAtom>(atoms: readonly T[]): T[] {
  const base = seasonTieOrder(atoms);
  const byId = new Map(base.map((a) => [a.frontmatter.id, a]));
  const linked: LinkedAtoms = new Map(
    base.map((a) => [
      a.frontmatter.id,
      {
        links: (a.frontmatter.links ?? []).filter(
          (l) =>
            !(
              l.relation === "requires" &&
              a.frontmatter.type === "principle" &&
              byId.get(l.id)?.frontmatter.type === "principle"
            ),
        ),
      },
    ]),
  );
  const ids = lessonAtomOrder(
    { frontmatter: { atoms: base.map((a) => a.frontmatter.id) } },
    linked,
  );
  return ids.map((id) => byId.get(id)!);
}

/**
 * The `requires` edges among `atoms` that point at an atom `order` lists
 * later than the one that declares it — the prerequisite a listener playing
 * `order` has not heard yet. `order` may be a subset of `atoms` (one
 * season); edges with an end outside it are not counted.
 */
export function forwardEdges(
  order: readonly string[],
  atoms: readonly OrderableAtom[],
): RequiresEdge[] {
  const position = new Map(order.map((id, i) => [id, i]));
  return requiresEdges(atoms).filter(
    ({ from, to }) =>
      position.has(from) && position.has(to) && position.get(to)! > position.get(from)!,
  );
}

/**
 * A show's atom seasons as played, and the forward edges that order keeps,
 * split by whether the prerequisite plays in a later season or later in the
 * same one. The measurement entry 303 made, so a test can hold the order to
 * a ceiling.
 */
export function seasonForwardEdges(
  seasons: readonly (readonly string[])[],
  atoms: readonly OrderableAtom[],
): { total: number; crossSeason: number; withinSeason: number } {
  const seasonOf = new Map<string, number>();
  seasons.forEach((ids, i) => ids.forEach((id) => seasonOf.set(id, i)));
  const forward = forwardEdges(seasons.flat(), atoms);
  const crossSeason = forward.filter(({ from, to }) => seasonOf.get(from) !== seasonOf.get(to));
  return {
    total: forward.length,
    crossSeason: crossSeason.length,
    withinSeason: forward.length - crossSeason.length,
  };
}

/**
 * Items sorted by an asynchronous key — the lesson season's order, which is
 * `getThreadOrderKey` (home path's progression rank, then the path's
 * audience, then position in the path, then title) compared by
 * `compareThreadOrderKeys`. Both are passed in rather than imported, see the
 * module comment. Stable: items that compare equal keep their input order.
 */
export async function orderByKey<T, K>(
  items: readonly T[],
  keyOf: (item: T) => Promise<K>,
  compare: (a: K, b: K) => number,
): Promise<T[]> {
  const keyed = await Promise.all(
    items.map(async (item, i) => ({ item, i, key: await keyOf(item) })),
  );
  return keyed.sort((a, b) => compare(a.key, b.key) || a.i - b.i).map((k) => k.item);
}

/** The parts of a path a season order reads. */
interface OrderablePath {
  frontmatter: { id: string; title: string; audience?: readonly string[] };
}

/** A path's place on the audience ladder: its earliest audience, or past the ladder. */
function pathAudienceRank(audience: readonly string[] | undefined): number {
  const ranks = (audience ?? []).map((a) => ladderRank(a as Audience)).filter((i) => i >= 0);
  return ranks.length ? Math.min(...ranks) : Number.MAX_SAFE_INTEGER;
}

/**
 * Paths in the order the site's ladder climbs them: progression rank
 * (`getPathProgressionRank`, passed in), then audience — the two ends of the
 * chain both rank last, and the beginner-facing one comes first — then title.
 * The same rule `getParentPath` breaks its ties with.
 */
export function pathPlayOrder<T extends OrderablePath>(
  paths: readonly T[],
  rankOf: (pathId: string) => number,
): T[] {
  return [...paths].sort(
    (a, b) =>
      rankOf(a.frontmatter.id) - rankOf(b.frontmatter.id) ||
      pathAudienceRank(a.frontmatter.audience) - pathAudienceRank(b.frontmatter.audience) ||
      a.frontmatter.title.localeCompare(b.frontmatter.title),
  );
}

/**
 * How many distinct non-reference atoms declare an edge of any relation
 * toward each atom — the "Concepts that cite this work" count the library
 * entry shows. A work cited by seventy concepts is the one to hear first.
 */
export function citationCounts(atoms: readonly OrderableAtom[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const atom of atoms) {
    if (atom.frontmatter.type === "reference") continue;
    const cited = new Set((atom.frontmatter.links ?? []).map((l) => l.id));
    for (const id of cited) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** The library season: most-cited work first, then title. */
export function libraryPlayOrder<T extends OrderableAtom>(
  references: readonly T[],
  atoms: readonly OrderableAtom[],
): T[] {
  const counts = citationCounts(atoms);
  const count = (a: T) => counts.get(a.frontmatter.id) ?? 0;
  return [...references].sort(
    (a, b) => count(b) - count(a) || a.frontmatter.title.localeCompare(b.frontmatter.title),
  );
}
