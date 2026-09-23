/**
 * The core: the knot of ideas that require each other, and the one page
 * that says so.
 *
 * The `requires` graph has one large strongly connected component — nineteen
 * atoms on 2026-09-22, every one of which reaches every other through
 * `requires` alone (tracker entry 141). Three surfaces built on one night
 * collapse it to a single item: the sidebar's "Builds on" group shows a cycle
 * the atom named twice as "<Title> and the core" (entry 277), the inbound
 * fold counts holders "through the core" (entry 301), the episode notes carry
 * the same label (entry 302) and the search page's mini graph draws one node
 * called "the core" (entry 280). Eighty-three built pages said the words and
 * none defined them (entry 309): a noun with a definite article and no
 * referent. This module is the referent. `CORE_HREF` is the page, `coreLink`
 * the anchor every surface that says "the core" can point at, and
 * `coreMembers` the membership, recomputed from the corpus rather than
 * listed, so a change in the cycle changes the page.
 *
 * `mini-graph-picks.ts` carries the same set as a literal `KNOT`, because the
 * search page runs in the browser with no other atom's links to hand;
 * `the-core.test.ts` holds the two equal. Kept free of `./content` so the
 * client-side graph can import the link.
 *
 * Since 2026-09-22 (entry 315) the phrase is a link on every surface that
 * says it — the sidebar item's "and the core", the fold's "through the
 * core", the show notes' html line and the graph's node — and the member
 * that stands beside it is the one the graph requires most among those the
 * atom declared (`coreRepresentative` in direct-requires.ts), not the one
 * the author typed first. `coreRepresentationCounts` is that rule read the
 * other way: on how many pages each member is the face of the core, which
 * the page prints so the rule is visible.
 */

import { ATOM_TYPE_NAMES } from "@/app/about/atom-types";

import { directRequires, requiresGraph, type RequiresNode } from "./direct-requires";
import type { AtomType } from "./schema";

/** The page that defines the term. */
export const CORE_HREF = "/how-it-works/the-core";

/** How the surfaces spell it: `coreItemLabel` and the graph's `CORE_LABEL` agree. */
export const CORE_PHRASE = "the core";

/**
 * The one sentence the glossary and the page share. The glossary entry is
 * this sentence; the page opens on it and goes on to list the members.
 */
export const CORE_DEFINITION =
  "The ideas on this site that require each other: read any one and you are reading them all, which is why a concept's Builds on list and the show notes fold them into one item.";

/** An anchor for the phrase, for the surfaces that say it. */
export function coreLink(): { href: string; label: string } {
  return { href: CORE_HREF, label: CORE_PHRASE };
}

/** What a member needs to be listed: the frontmatter fields the page reads. */
export interface CoreAtom extends RequiresNode {
  title: string;
  type: AtomType;
}

export interface CoreMember {
  id: string;
  title: string;
  type: AtomType;
  /**
   * How many atoms declare `requires` toward this one — the closure's count,
   * not the direct view's, since the question on this page is how much of the
   * graph leans on the member, not what a reader should open next.
   */
  requiredBy: number;
}

export interface CoreTypeGroup {
  type: AtomType;
  /** "principles", or "law" when there is one: the About page's names. */
  label: string;
  count: number;
  /** Most-required first, then by title. */
  members: CoreMember[];
}

/**
 * The members of the core, in the graph's input order: the largest strongly
 * connected component of `requires`. Recomputed on every call; the corpus is
 * cached upstream and the graph is a few hundred edges. An empty corpus, or
 * one with no cycle, yields the empty list rather than a singleton, because a
 * lone atom is not a core.
 */
export function coreMembers(atoms: readonly RequiresNode[]): string[] {
  const { components } = requiresGraph(atoms);
  let largest: string[] = [];
  for (const component of components) {
    if (component.length > largest.length) largest = component;
  }
  return largest.length > 1 ? [...largest] : [];
}

/** The order the groups appear in: the layer the site names first, first. */
const TYPE_ORDER: readonly AtomType[] = [
  "principle",
  "definition",
  "law",
  "technique",
  "insight",
  "framework",
  "pattern",
  "antipattern",
  "pedagogy",
  "exercise",
  "format",
  "reference",
];

/**
 * The About page's plural, singularised the way `typeLabel` in
 * path-composition.ts does it (every plural there is regular). Not imported
 * from there, because that module loads content and this one must stay
 * importable from the browser.
 */
function groupLabel(type: AtomType, count: number): string {
  const plural = ATOM_TYPE_NAMES[type];
  return count === 1 ? plural.replace(/s$/, "") : plural;
}

/**
 * The members grouped by type, each with its declared `requires` in-degree.
 * Groups come out in `TYPE_ORDER` and only for types the core has; members
 * inside a group most-required first, so the count beside each name is also
 * the order.
 */
export function coreMemberSummary(atoms: readonly CoreAtom[]): CoreTypeGroup[] {
  const members = new Set(coreMembers(atoms));
  const byId = new Map(atoms.map((a) => [a.id, a]));
  const { out } = requiresGraph(atoms);

  const requiredBy = new Map<string, number>();
  for (const targets of out.values()) {
    for (const target of targets) {
      if (members.has(target)) requiredBy.set(target, (requiredBy.get(target) ?? 0) + 1);
    }
  }

  const grouped = new Map<AtomType, CoreMember[]>();
  for (const id of members) {
    const atom = byId.get(id)!;
    const list = grouped.get(atom.type) ?? [];
    list.push({ id, title: atom.title, type: atom.type, requiredBy: requiredBy.get(id) ?? 0 });
    grouped.set(atom.type, list);
  }

  return TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
    const list = grouped
      .get(type)!
      .sort((a, b) => b.requiredBy - a.requiredBy || a.title.localeCompare(b.title));
    return { type, label: groupLabel(type, list.length), count: list.length, members: list };
  });
}

/**
 * How many atoms' "Builds on" lists open on each member as "<Title> and the
 * core": the pages where the member stands for the core. Read from the same
 * reduction the sidebar and the show notes render (`directRequires`), so the
 * count is the rule and not a second reading of it. On 2026-09-22 the
 * first-declared rule spread 43 such pages over 15 members (active-listening
 * 13, be-present 5, commitment 4 …); the most-required rule puts them on 7
 * (commitment 18, active-listening 14). A member no page opens on is absent
 * from the map; read it as 0.
 */
export function coreRepresentationCounts(atoms: readonly RequiresNode[]): Map<string, number> {
  const graph = requiresGraph(atoms);
  const counts = new Map<string, number>();
  for (const id of graph.nodes) {
    for (const d of directRequires(graph, id).direct) {
      if (d.viaCore) counts.set(d.id, (counts.get(d.id) ?? 0) + 1);
    }
  }
  return counts;
}
