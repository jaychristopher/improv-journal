/**
 * Which six neighbours the search page's mini graph draws.
 *
 * Until 2026-09-22 `MiniGraph` took `links.slice(0, 6)`: the first six links
 * in frontmatter order, which is authoring order, and the authoring habit
 * (tracker entry 277) is to declare the core closure first. Measured over
 * every atom (entry 280): 182 of 205 atoms have more than six links, the
 * median atom drew half its edges, 38% of the 1,189 satellites drawn were
 * the 19-atom knot — the principles, `commitment`, `offers`, `trust`, the
 * atoms every atom declares — and 39 graphs drew a single relation. The
 * picture a searcher got of "what this connects to" was the top of the
 * author's list, not the shape of the neighbourhood, and it disagreed with
 * the sidebar on the atom's own page, which ranks its groups by size.
 *
 * The six are now chosen by relation priority — `requires`, `contrasts`,
 * `enables`, then `extends`, `illustrates` — with at most two from any one
 * relation before moving to the next, so an atom with two relations draws
 * both and one with three draws all three. Declared order still breaks ties
 * inside a relation. Once every relation has had its two, the remaining
 * slots fill in the same priority order.
 *
 * Knot members collapse. When two or more of the chosen satellites belong to
 * the knot they become one satellite labelled "the core", linking the page
 * that defines it (`CORE_HREF`, entries 309 and 315; until 2026-09-22 it
 * linked the first-declared member, a different one on every page), placed
 * where the first-declared member was, and the slots they held go to the
 * atom's own neighbours. The knot is strongly connected under `requires` (entry 141:
 * every member reaches every other through `requires` alone), so an atom
 * that names two members has, by the graph's own logic, named them all, and
 * drawing three of them says less than drawing one node and the three
 * neighbours it displaced. The core carries the
 * highest-priority relation among the atom's knot links, because that is the
 * strongest claim the atom makes about the closure.
 *
 * Measured 2026-09-22 over the same 205 atoms, before → after: knot share
 * of satellites 38.1% → 14.6% (453 of 1,189 → 169 of 1,158); single-relation
 * graphs 39 → 28, and every one of the 28 is an atom that declares only one
 * relation; graphs drawing four or five relations 32 → 79; median distinct
 * relations drawn 3 → 3, mean 2.49 → 3.08. The 182 truncated graphs are
 * still truncated — six is six — but the hub now says so with "+N more".
 * `mini-graph-picks.test.ts` holds those numbers as ceilings and floors.
 *
 * One caveat the picker cannot fix from here: `scripts/build-search-index.mjs`
 * serialises only an atom's first eight non-reference links, so on the
 * built search page the picker chooses from eight and "+N more" counts from
 * eight. Over that truncated input the knot share is 16.8% and the mean
 * relations drawn 2.61; over the full frontmatter it is the figure above.
 *
 * `requires` is read in the direct view (direct-requires.ts, tracker entry
 * 302). Leading with the relation drew the closure: of the 198 `requires`
 * satellites the graphs drew on 2026-09-22, 62 (on 51 atoms) were
 * prerequisites the atom's own page had folded as implied — an edge the
 * page says the atom holds only through another. Given the atom's direct
 * set, the picker draws no implied `requires` satellite; the link still
 * counts in "+N more", because it is still declared. The core is untouched:
 * the collapse decision is made over the declared links as before, and the
 * node stands for every knot link the atom declares, direct or implied,
 * since naming two members is naming the closure. The search page has no
 * graph to reduce against, so the index carries a `direct` flag on each
 * `requires` link (`build-search-index.mjs`), and `MiniGraph` reads the set
 * off the links it is given.
 */

import { type RequiresGraph, requiresView } from "./direct-requires";
import { CORE_HREF, CORE_PHRASE } from "./the-core";

export interface GraphLink {
  id: string;
  relation: string;
  /**
   * On a `requires` link: true when the target is in the atom's direct list
   * (the reduction), false when the atom holds it only as implied. Absent on
   * other relations, and on an index built before 2026-09-22.
   */
  direct?: boolean;
}

export interface GraphSatellite {
  /** The atom the node stands at; for the core, the first-declared knot member, which fixes its place. */
  id: string;
  relation: string;
  /** The node's label when it is not the resolved title of `id`. */
  label?: string;
  /** Where the node links when not to `id`'s own page: the core's page. */
  href?: string;
  /** Every declared link this node stands for: one, or the atom's knot links. */
  members: string[];
}

interface MiniGraphPick {
  satellites: GraphSatellite[];
  /** Declared links the drawn nodes stand for, the collapsed knot counted in full. */
  represented: number;
  /** Declared links no drawn node stands for: the hub's "+N more". */
  more: number;
}

/** The most satellites a graph draws; six fit a 400×240 viewBox at radius 90. */
export const MAX_SATELLITES = 6;

/** How many links one relation may take before the next relation gets its turn. */
export const PER_RELATION_FIRST_PASS = 2;

/** The label the collapsed knot draws under: the one spelling, from the-core.ts. */
export const CORE_LABEL = CORE_PHRASE;

/**
 * Dependencies before associations, and the one relation that says "not
 * this" second, because a contrast is the edge most likely to tell a searcher
 * which of two similar concepts they are looking at. `extends` and
 * `illustrates` last: the loosest relations, and the ones the authoring habit
 * puts first (entry 280: first-declared relation is `illustrates` on 73 atoms
 * and `extends` on 60). Anything the schema does not name draws after these.
 */
export const RELATION_PRIORITY: readonly string[] = [
  "requires",
  "contrasts",
  "enables",
  "extends",
  "illustrates",
];

/**
 * The 19-atom knot: the largest strongly connected component of the
 * `requires` graph, in which every member reaches every other (tracker entry
 * 141; entry 277 measured 61 of the 65 in-cycle `requires` edges inside it).
 * Listed here rather than computed because the search page runs in the
 * browser over the search index, which carries no other atom's links.
 * `mini-graph-picks.test.ts` recomputes the component from the corpus and
 * fails if this list drifts from it.
 */
export const KNOT: ReadonlySet<string> = new Set([
  "active-listening",
  "be-brave",
  "be-changeable",
  "be-honest",
  "be-positive",
  "be-present",
  "be-supportive",
  "be-thankful",
  "cognitive-bandwidth",
  "commitment",
  "do-feel-say",
  "emotional-truth",
  "ensemble",
  "interdependence",
  "offers",
  "presence",
  "shared-reality-fragility",
  "specificity",
  "trust",
]);

function priorityOf(relation: string): number {
  const index = RELATION_PRIORITY.indexOf(relation);
  return index === -1 ? RELATION_PRIORITY.length : index;
}

/** Relations present among `links`, highest priority first; unknown ones last, alphabetically. */
function relationsByPriority(links: readonly GraphLink[]): string[] {
  const present = [...new Set(links.map((l) => l.relation))];
  return present.sort((a, b) => priorityOf(a) - priorityOf(b) || a.localeCompare(b));
}

/**
 * Up to `limit` links by relation priority: each relation in turn takes up to
 * PER_RELATION_FIRST_PASS in declared order, then the leftover slots fill in
 * the same relation order. Returns the chosen links in declared order, so the
 * graph's clockwise reading is still the author's.
 */
function pickByPriority(links: readonly GraphLink[], limit: number): GraphLink[] {
  const relations = relationsByPriority(links);
  const queues = new Map(relations.map((r) => [r, links.filter((l) => l.relation === r)]));
  const chosen = new Set<GraphLink>();

  for (const relation of relations) {
    for (const link of queues.get(relation)!.splice(0, PER_RELATION_FIRST_PASS)) {
      if (chosen.size >= limit) break;
      chosen.add(link);
    }
  }
  for (const relation of relations) {
    for (const link of queues.get(relation)!) {
      if (chosen.size >= limit) break;
      chosen.add(link);
    }
  }
  return links.filter((l) => chosen.has(l));
}

/**
 * The links with the direct view stamped on: each `requires` link gains
 * `direct`, true when the reduction keeps it. This is the one writer of the
 * flag — `build-search-index.mjs` calls it for every atom it serialises —
 * and `directRequiresOf` below is its reader, so the two cannot disagree on
 * what the flag means. Links of other relations pass through untouched.
 */
export function flagDirectRequires<L extends GraphLink>(
  links: readonly L[],
  graph: RequiresGraph,
  atomId: string,
): L[] {
  const open = new Set(requiresView(graph, atomId, "direct").open);
  return links.map((l) => (l.relation === "requires" ? { ...l, direct: open.has(l.id) } : l));
}

/**
 * The atom's direct `requires` targets, read off the links' `direct` flags.
 * Null when no link carries one — an index or a caller without the view —
 * in which case the picker draws the declared relation as it did before.
 */
export function directRequiresOf(links: readonly GraphLink[]): ReadonlySet<string> | null {
  const flagged = links.filter((l) => l.relation === "requires" && l.direct !== undefined);
  if (flagged.length === 0) return null;
  return new Set(flagged.filter((l) => l.direct).map((l) => l.id));
}

/**
 * The satellites to draw for an atom's declared links, and how many links
 * they leave out. Pure over `links`, so the test can run it across the corpus.
 *
 * `direct` is the atom's direct `requires` set: a `requires` link whose
 * target is not in it is implied, is never drawn on its own, and counts in
 * `more`. Without it every declared link is a candidate.
 */
export function pickMiniGraphSatellites(
  links: readonly GraphLink[],
  direct: ReadonlySet<string> | null = null,
  limit: number = MAX_SATELLITES,
): MiniGraphPick {
  const single = (link: GraphLink): GraphSatellite => ({
    id: link.id,
    relation: link.relation,
    members: [link.id],
  });
  const implied = (l: GraphLink) =>
    direct !== null && l.relation === "requires" && !direct.has(l.id);
  const candidates = links.filter((l) => !implied(l));

  // Whether the knot collapses is decided over the declared links, so the
  // core appears wherever it did before the direct view: an implied knot
  // link is still the atom naming the closure.
  const knotDrawn = pickByPriority(links, limit).filter((l) => KNOT.has(l.id));
  if (knotDrawn.length < 2) {
    const first = pickByPriority(candidates, limit);
    return {
      satellites: first.map(single),
      represented: first.length,
      more: links.length - first.length,
    };
  }

  // Two or more knot members would be drawn: one node stands for every knot
  // link the atom declares, and the freed slots go to its own neighbours.
  const knotLinks = links.filter((l) => KNOT.has(l.id));
  const own = candidates.filter((l) => !KNOT.has(l.id));
  const core: GraphSatellite = {
    id: knotLinks[0].id,
    relation: relationsByPriority(knotLinks)[0],
    label: CORE_LABEL,
    href: CORE_HREF,
    members: knotLinks.map((l) => l.id),
  };
  const rest = pickByPriority(own, limit - 1).map(single);

  // The core sits where the first knot member was declared, so the clockwise
  // reading stays the declared one.
  const corePosition = links.indexOf(knotLinks[0]);
  const satellites: GraphSatellite[] = [];
  let placed = false;
  for (const satellite of rest) {
    if (!placed && links.findIndex((l) => l.id === satellite.id) > corePosition) {
      satellites.push(core);
      placed = true;
    }
    satellites.push(satellite);
  }
  if (!placed) satellites.push(core);

  const represented = rest.length + knotLinks.length;
  return { satellites, represented, more: links.length - represented };
}
