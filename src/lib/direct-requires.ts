import { median } from "./graph-robustness";

/**
 * The prerequisite relation, reduced to what each atom needs *next*.
 *
 * The atoms' `requires` edges are written as their own closure. Of the 553
 * `requires` edges that do not sit inside a cycle, 355 (64%) are implied by
 * a longer chain of `requires` already in the graph: 173 by an ordinary
 * chain (A requires B, B requires C, and A also declares C) and 182 only
 * because the target sits in the 19-atom knot (tracker entry 141), where
 * every member reaches every other, so an atom that declares two knot
 * members has declared them all. Seventy-nine of the 140 atoms outside the
 * knot with any prerequisite do exactly that; `commitment` is required
 * directly by 70 atoms and needed as a *first* prerequisite by 5; the median
 * atom declares 3 prerequisites and would keep 1 (tracker entry 277,
 * 2026-09-22). Every surface that read the relation — the sidebar's "Builds
 * on" group, the paths' leans-on and forward-needs blocks, the journey's
 * prerequisite map — said the same thing two or three times.
 *
 * This module is the reduction. The frontmatter keeps the authored closure,
 * since it is also documentation; what the pages show is `directRequires`:
 * an atom's declared targets minus those reachable from another declared
 * target through `requires` chains — a transitive reduction at the atom —
 * with a strongly connected component collapsed to one member, the one the
 * graph requires most (`coreRepresentative`). Everything the reduction drops
 * is returned as `implied`,
 * each with the direct target it is reachable through, so a surface can
 * fold them rather than lose them: the dropped edges are still links, and
 * the link graph is the one ranking input the site controls.
 *
 * Pure over `{ id, links }`. Edges to ids that are not atoms, and self-loops,
 * are dropped, so the graph is exactly the atoms and the `requires` edges
 * between them. Reachability is computed once per strongly connected
 * component over the condensation, which is a DAG.
 */

export interface RequiresNode {
  id: string;
  links?: readonly { id: string; relation: string }[];
}

export interface RequiresGraph {
  /** Every atom id, in input order. */
  nodes: string[];
  /** Declared `requires` targets per atom, in declared order, deduplicated, atoms only, no self-loops. */
  out: Map<string, string[]>;
  /**
   * Atom id → how many atoms declare `requires` toward it, over the same
   * edges `out` holds: the count the core page prints as "required by".
   * The rank a collapsed cycle's representative is chosen by.
   */
  inDegree: Map<string, number>;
  /** Strongly connected components, members in input order; singletons included. */
  components: string[][];
  /** Atom id → index into `components`. */
  componentOf: Map<string, number>;
  /** Component index → the component indexes reachable from it, itself included. */
  reach: Map<number, Set<number>>;
  /**
   * Atom id → the atoms reachable from it without crossing an edge inside a
   * cycle: the reach the graph would keep if every knot were cut open. What
   * this misses is what the cycles alone imply.
   */
  acyclicReach: Map<string, Set<string>>;
}

export interface DirectRequire {
  id: string;
  /**
   * True when the atom declared two or more members of the same cycle and
   * this is the one that stands for the rest: the declared member the graph
   * requires most, first-declared on a tie (`coreRepresentative`). `core`
   * then holds the whole component, this id included, in the graph's input
   * order.
   */
  viaCore: boolean;
  core: string[];
}

export interface ImpliedRequire {
  id: string;
  /** The direct target this one is reachable through. */
  via: string;
  /**
   * `chain` when another declared target reaches this one along edges none
   * of which sits inside a cycle — the implication would survive the knot
   * being cut open; `knot` when every such path crosses a cycle, so the
   * edge is implied by the cycle alone.
   */
  by: "chain" | "knot";
}

export interface DirectRequiresResult {
  declared: string[];
  direct: DirectRequire[];
  implied: ImpliedRequire[];
}

/**
 * Tarjan's algorithm, iterative so a long chain cannot overflow the stack.
 * Components come out in reverse topological order of the condensation
 * (a component is emitted after everything it reaches), which is the order
 * the reachability pass below wants.
 */
export function stronglyConnectedComponents(
  nodes: readonly string[],
  out: ReadonlyMap<string, readonly string[]>,
): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  for (const root of nodes) {
    if (index.has(root)) continue;
    const work: { node: string; next: number }[] = [{ node: root, next: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);

    while (work.length > 0) {
      const frame = work[work.length - 1];
      const targets = out.get(frame.node) ?? [];
      if (frame.next < targets.length) {
        const target = targets[frame.next];
        frame.next += 1;
        if (!index.has(target)) {
          index.set(target, counter);
          low.set(target, counter);
          counter += 1;
          stack.push(target);
          onStack.add(target);
          work.push({ node: target, next: 0 });
        } else if (onStack.has(target)) {
          low.set(frame.node, Math.min(low.get(frame.node)!, index.get(target)!));
        }
        continue;
      }
      work.pop();
      if (work.length > 0) {
        const parent = work[work.length - 1].node;
        low.set(parent, Math.min(low.get(parent)!, low.get(frame.node)!));
      }
      if (low.get(frame.node) === index.get(frame.node)) {
        const component: string[] = [];
        let member: string;
        do {
          member = stack.pop()!;
          onStack.delete(member);
          component.push(member);
        } while (member !== frame.node);
        components.push(component);
      }
    }
  }

  const position = new Map(nodes.map((id, i) => [id, i]));
  return components.map((c) => c.sort((a, b) => position.get(a)! - position.get(b)!));
}

/** The `requires` digraph of the atoms, with its components and their reach. */
export function requiresGraph(atoms: readonly RequiresNode[]): RequiresGraph {
  const nodes = atoms.map((a) => a.id);
  const known = new Set(nodes);
  const out = new Map<string, string[]>();
  for (const atom of atoms) {
    const targets: string[] = [];
    for (const link of atom.links ?? []) {
      if (link.relation !== "requires") continue;
      if (link.id === atom.id || !known.has(link.id) || targets.includes(link.id)) continue;
      targets.push(link.id);
    }
    out.set(atom.id, targets);
  }

  const inDegree = new Map<string, number>();
  for (const targets of out.values()) {
    for (const target of targets) inDegree.set(target, (inDegree.get(target) ?? 0) + 1);
  }

  const components = stronglyConnectedComponents(nodes, out);
  const componentOf = new Map<string, number>();
  components.forEach((members, i) => {
    for (const id of members) componentOf.set(id, i);
  });

  // Tarjan emits a component after every component it reaches, so a single
  // pass in emission order sees each successor's reach already complete.
  const reach = new Map<number, Set<number>>();
  components.forEach((members, i) => {
    const set = new Set<number>([i]);
    for (const id of members) {
      for (const target of out.get(id)!) {
        const j = componentOf.get(target)!;
        if (j === i) continue;
        for (const k of reach.get(j)!) set.add(k);
      }
    }
    reach.set(i, set);
  });

  // The same pass at the atom, over inter-component edges only. A target's
  // set is complete before its source's because the target's component was
  // emitted first.
  const acyclicReach = new Map<string, Set<string>>();
  for (const members of components) {
    for (const id of members) {
      const set = new Set<string>();
      for (const target of out.get(id)!) {
        if (componentOf.get(target) === componentOf.get(id)) continue;
        set.add(target);
        for (const x of acyclicReach.get(target)!) set.add(x);
      }
      acyclicReach.set(id, set);
    }
  }

  return { nodes, out, inDegree, components, componentOf, reach, acyclicReach };
}

/**
 * Which declared member stands for a collapsed cycle: the one the graph
 * requires most, by the declared `requires` in-degree `requiresGraph`
 * counts, with the first-declared member breaking a tie.
 *
 * Until 2026-09-22 it was the first-declared member alone, chosen for
 * stability (entry 277) and stable, but the first-declared member is the
 * author's typing order, so the core wore fifteen faces on the 43 pages
 * that collapse it — "Active Listening and the core" on 13, "Be Present and
 * the core" on 5, eleven members on one or two pages each — and agreed with
 * the core page's own most-required-first order on 4 of them (tracker entry
 * 315). The in-degree is the count that page prints beside each member, so
 * the sidebar, the show notes and the page now name the same member wherever
 * the atom's declarations allow. Entry 307's age-normalised rank would need
 * each atom's `created`, which the `{ id, links }` graph does not carry; the
 * in-degree is what the module can read from its own edges.
 *
 * `named` is the cycle's members in the order the atom declared them; an
 * empty list has no representative.
 */
export function coreRepresentative(
  graph: Pick<RequiresGraph, "inDegree">,
  named: readonly string[],
): string | undefined {
  let best: string | undefined;
  let bestRank = -1;
  for (const id of named) {
    const rank = graph.inDegree.get(id) ?? 0;
    if (rank > bestRank) {
      best = id;
      bestRank = rank;
    }
  }
  return best;
}

/** True when `from` reaches `to` through one or more `requires` edges. */
function reaches(graph: RequiresGraph, from: string, to: string): boolean {
  const a = graph.componentOf.get(from);
  const b = graph.componentOf.get(to);
  if (a === undefined || b === undefined) return false;
  if (a === b) return from !== to && graph.components[a].length > 1;
  return graph.reach.get(a)!.has(b);
}

/**
 * The atoms `from` reaches on paths that avoid `without`. A path from one
 * of an atom's targets back through the atom itself must not count as
 * implying another of its targets — `be-present` requires `irreversibility`,
 * and the only route there from its other target, `cognitive-bandwidth`,
 * runs through `be-present`. Only an atom inside a cycle can be on such a
 * path, so outside the knot this is the component reach; inside it, a walk.
 */
function reachableAvoiding(graph: RequiresGraph, from: string, without: string): Set<string> {
  const seen = new Set<string>();
  const stack = [from];
  while (stack.length > 0) {
    const node = stack.pop()!;
    for (const next of graph.out.get(node) ?? []) {
      if (next === without || seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return seen;
}

/**
 * The atom's declared `requires` targets, reduced to the ones no other
 * declared target reaches (on a path that does not pass back through the
 * atom), with each cycle the atom names twice collapsed to its
 * `coreRepresentative`. Unknown atoms have nothing declared. The direct
 * list keeps declared order, so a representative declared after an
 * ordinary target follows it.
 */
export function directRequires(graph: RequiresGraph, atomId: string): DirectRequiresResult {
  const declared = graph.out.get(atomId) ?? [];
  const direct: DirectRequire[] = [];
  const implied: ImpliedRequire[] = [];
  const componentOf = (id: string) => graph.componentOf.get(id)!;
  const inCycle = graph.components[componentOf(atomId)]?.length > 1;

  const reachCache = new Map<string, Set<string>>();
  const reachesAvoidingSelf = (from: string, to: string): boolean => {
    if (!inCycle) return reaches(graph, from, to);
    let set = reachCache.get(from);
    if (!set) {
      set = reachableAvoiding(graph, from, atomId);
      reachCache.set(from, set);
    }
    return set.has(to);
  };

  // The members the atom names per component, in declared order, and the
  // one that stands for them: most-required, first-declared on a tie.
  const namedIn = new Map<number, string[]>();
  for (const id of declared) {
    const c = componentOf(id);
    const list = namedIn.get(c);
    if (list) list.push(id);
    else namedIn.set(c, [id]);
  }
  const representative = new Map<number, string>();
  const named = new Map<number, number>();
  for (const [c, ids] of namedIn) {
    named.set(c, ids.length);
    representative.set(c, coreRepresentative(graph, ids)!);
  }

  const reachedFromOutside = (id: string): boolean =>
    declared.some(
      (other) => componentOf(other) !== componentOf(id) && reachesAvoidingSelf(other, id),
    );

  for (const id of declared) {
    const c = componentOf(id);
    if (representative.get(c) !== id || reachedFromOutside(id)) continue;
    const collapsed = graph.components[c].length > 1 && (named.get(c) ?? 0) > 1;
    direct.push({ id, viaCore: collapsed, core: collapsed ? [...graph.components[c]] : [] });
  }

  // Each implied target is credited to a direct one that reaches it — its
  // component's representative when that is direct, else the first direct
  // target that does. Whether the implication needs a cycle is a separate
  // question, answered over the acyclic edges: a chain survives the knot
  // being cut open, a knot implication does not.
  const directIds = new Set(direct.map((d) => d.id));
  for (const id of declared) {
    if (directIds.has(id)) continue;
    const rep = representative.get(componentOf(id))!;
    const via =
      rep !== id && directIds.has(rep)
        ? rep
        : (direct.find((d) => reachesAvoidingSelf(d.id, id))?.id ??
          declared.find((o) => o !== id && reachesAvoidingSelf(o, id))!);
    const byChain = declared.some((o) => o !== id && graph.acyclicReach.get(o)!.has(id));
    implied.push({ id, via, by: byChain ? "chain" : "knot" });
  }

  return { declared, direct, implied };
}

/**
 * What a group of atoms needs next, read with each collapsed cycle as one
 * thing.
 *
 * `directRequires` names a cycle by one member, its `coreRepresentative`,
 * and that is right on the concept page: the sidebar shows "Commitment and
 * the core" and links both halves. A path is a different reader. Until
 * 2026-09-22 the paths' leans-on and forward-needs blocks and the journey's
 * prerequisite map took the representative as *the* prerequisite, so when
 * entry 315 moved the representative from the first-declared member to the
 * most-required one, Beginner Foundations — whose first lesson teaches
 * `active-listening` and whose second teaches `commitment` — went from
 * owing nothing forward to owing `commitment` from lesson 2, and forward
 * concepts across the paths went 24 → 32 without a thread list changing.
 * The name of the representative had become a schedule.
 *
 * This is the reading for a group: each `viaCore` prerequisite is the whole
 * component, satisfied by any member the group holds; an ordinary
 * prerequisite is itself. Needs any of whose `ids` the group holds are
 * dropped, the rest come back once each, keyed so a caller can count and
 * dedupe them — `requiredBy` is how many of the group's atoms need it, and
 * `declared` is which members the group's atoms actually named (all of
 * them for an ordinary need), so a surface that must print one member can
 * prefer a door the atoms themselves point at. Order is first appearance
 * over `atomIds` in declared order.
 *
 * `core: "rest"` reads a core need as the members the group does *not*
 * hold, dropped only when it holds them all. That is the journey's
 * question — a lesson that composes `active-listening` and `offers` and
 * rests on the knot is not its own remedy for being shaky on it; the
 * lesson teaching the rest of the knot is — where a path's is the
 * default `"any"`: a path that teaches one door into the core has taught
 * the core, and a lesson that composes a member of it does not owe the
 * core forward.
 */
export interface RequireSet {
  /** The id for an ordinary need; `core:` and the component's first member for a cycle. */
  key: string;
  /** Every id that satisfies the need: one for an ordinary need, the whole cycle for a core one. */
  ids: string[];
  /** The ids the group's atoms declared toward it, in the graph's input order. */
  declared: string[];
  viaCore: boolean;
  /** How many of the group's atoms need it. */
  requiredBy: number;
}

export function requireSets(
  graph: RequiresGraph,
  atomIds: Iterable<string>,
  options: { core?: "any" | "rest" } = {},
): RequireSet[] {
  const own = new Set(atomIds);
  const rest = options.core === "rest";
  const position = new Map(graph.nodes.map((id, i) => [id, i]));
  const sets = new Map<string, RequireSet>();
  for (const atomId of own) {
    if (!graph.out.has(atomId)) continue;
    const { declared, direct } = reduced(graph, atomId);
    const seen = new Set<string>();
    for (const d of direct) {
      // A need the group holds is not a need: an ordinary target it
      // composes, a core it composes any member of — or, reading the rest,
      // all of.
      const full = d.viaCore ? d.core : [d.id];
      const ids = d.viaCore && rest ? full.filter((id) => !own.has(id)) : full;
      if (ids.length === 0 || (!(d.viaCore && rest) && full.some((id) => own.has(id)))) continue;
      const key = d.viaCore ? `core:${d.core[0]}` : d.id;
      if (seen.has(key)) continue;
      seen.add(key);
      const members = new Set(ids);
      const named = d.viaCore ? declared.filter((id) => members.has(id)) : [d.id];
      const existing = sets.get(key);
      if (existing) {
        existing.requiredBy += 1;
        for (const id of named) if (!existing.declared.includes(id)) existing.declared.push(id);
      } else {
        sets.set(key, {
          key,
          ids: [...ids],
          declared: [...named],
          viaCore: d.viaCore,
          requiredBy: 1,
        });
      }
    }
  }
  for (const set of sets.values()) {
    set.declared.sort((a, b) => position.get(a)! - position.get(b)!);
  }
  return [...sets.values()];
}

export interface DirectRequiresReport {
  /** Atoms with at least one declared prerequisite. */
  atomsWithPrerequisites: number;
  /** Declared `requires` edges, atoms only, no self-loops. */
  edgesDeclared: number;
  /** Declared edges whose endpoints share a cycle. */
  edgesCyclic: number;
  /** Declared edges that do not sit inside a cycle; the split below is over these. */
  edgesAcyclic: number;
  edgesDirect: number;
  edgesImplied: number;
  impliedByChain: number;
  impliedByKnot: number;
  /** Members of the largest strongly connected component. */
  core: string[];
  /** Atoms outside the core that declare two or more of its members. */
  atomsNamingCoreTwice: number;
  medianDeclared: number;
  medianDirect: number;
  maxDeclared: number;
  maxDirect: number;
}

/** The whole-corpus reading, for the tests and the tracker. */
export function directRequiresReport(graph: RequiresGraph): DirectRequiresReport {
  const core = graph.components.reduce(
    (best, c) => (c.length > best.length ? c : best),
    [] as string[],
  );
  const coreSet = new Set(core);
  let edgesDeclared = 0;
  let edgesCyclic = 0;
  let edgesDirect = 0;
  let impliedByChain = 0;
  let impliedByKnot = 0;
  let atomsNamingCoreTwice = 0;
  const declaredCounts: number[] = [];
  const directCounts: number[] = [];

  for (const id of graph.nodes) {
    const { declared, direct, implied } = directRequires(graph, id);
    if (declared.length === 0) continue;
    declaredCounts.push(declared.length);
    directCounts.push(direct.length);
    edgesDeclared += declared.length;
    // An edge inside the atom's own cycle is counted apart: it is neither
    // direct nor implied in the entry's sense, since the cycle makes it both.
    const c = graph.componentOf.get(id)!;
    const acyclic = (t: string) => graph.componentOf.get(t) !== c;
    edgesCyclic += declared.filter((t) => !acyclic(t)).length;
    edgesDirect += direct.filter((d) => acyclic(d.id)).length;
    for (const entry of implied) {
      if (!acyclic(entry.id)) continue;
      if (entry.by === "chain") impliedByChain += 1;
      else impliedByKnot += 1;
    }
    if (!coreSet.has(id) && declared.filter((t) => coreSet.has(t)).length >= 2) {
      atomsNamingCoreTwice += 1;
    }
  }

  return {
    atomsWithPrerequisites: declaredCounts.length,
    edgesDeclared,
    edgesCyclic,
    edgesAcyclic: edgesDeclared - edgesCyclic,
    edgesDirect,
    edgesImplied: impliedByChain + impliedByKnot,
    impliedByChain,
    impliedByKnot,
    core,
    atomsNamingCoreTwice,
    medianDeclared: median(declaredCounts),
    medianDirect: median(directCounts),
    maxDeclared: Math.max(0, ...declaredCounts),
    maxDirect: Math.max(0, ...directCounts),
  };
}

/**
 * The two readings of the relation, named.
 *
 * After entry 277 the site read `requires` by two rules on eight surfaces:
 * three on the reduction (the concept page's "Builds on", the paths'
 * leans-on and forward-needs, the journey's prerequisite map) and five on
 * the closure (the page's own "Required by", the search graph's satellites,
 * the episode notes' "Builds on:" line, the JSON-LD `mentions`, the lesson
 * drill walk), so the same 618 edges were 225 in one place and 618 in the
 * next, and `commitment` said "Required by 70" while nine pages opened it
 * under "Builds on" (tracker entries 301 and 302, 2026-09-22). The rule's
 * reach had been decided by file ownership rather than by the relation.
 *
 * `requiresView` and `requiredByView` are the one accessor. A surface that
 * reads `requires` names its view in the call — `"direct"` is the reduction
 * with what it dropped returned as `folded`, `"declared"` is the closure
 * with nothing folded — and `requires-views.test.ts` walks the modules that
 * render the relation to check each imports one of them. `mentions` keeps
 * the declared view on purpose (jsonld-edges.ts says why).
 */
export type RequiresViewName = "direct" | "declared";

export interface RequiresView {
  /** The targets the view shows, in declared order. */
  open: string[];
  /** The declared targets the view puts behind a fold; empty in the declared view. */
  folded: string[];
  /**
   * Open ids that stand for a cycle the atom named more than once, each
   * with the whole component in the graph's input order (the direct view's
   * `viaCore` items). Empty in the declared view.
   */
  cores: Map<string, string[]>;
}

/**
 * The label of a collapsed cycle, on its representative member:
 * "Commitment and the core". One spelling for every surface that shows the
 * direct view — the sidebar's Builds on group and the episode notes' line —
 * so the page and the feed name the knot the same way. The phrase is
 * `CORE_PHRASE` in the-core.ts, spelled here too because that module
 * imports this one; `the-core.test.ts` holds the two equal. The surfaces
 * that render the label link its two halves separately — the title to the
 * member, the phrase to the core page — so the string is for the plain-text
 * feed line and for tests; `CORE_ITEM_JOIN` is the seam they split it on.
 */
export function coreItemLabel(title: string): string {
  return `${title}${CORE_ITEM_JOIN}the core`;
}

/** What sits between the member's title and "the core" in a core item. */
export const CORE_ITEM_JOIN = " and ";

export interface RequiredBy {
  /** The atom that declares `requires` toward the target. */
  id: string;
  /**
   * On an open holder: the target is its representative among a cycle's
   * members (`coreRepresentative`), so the target stands for the core on its
   * page. On a folded holder: the
   * target is collapsed into another member's core item — it sits in the
   * same cycle as the direct target it is implied through — rather than
   * implied by an ordinary chain.
   */
  viaCore: boolean;
}

export interface RequiredByView {
  /** Holders whose direct list contains the target, in the graph's input order. */
  open: RequiredBy[];
  /** Holders that declare the target and hold it only as implied; empty in the declared view. */
  folded: RequiredBy[];
}

const reductionCache = new WeakMap<RequiresGraph, Map<string, DirectRequiresResult>>();

/** `directRequires`, memoised per graph: the inbound view asks for every atom's. */
function reduced(graph: RequiresGraph, atomId: string): DirectRequiresResult {
  let byAtom = reductionCache.get(graph);
  if (!byAtom) {
    byAtom = new Map();
    reductionCache.set(graph, byAtom);
  }
  let result = byAtom.get(atomId);
  if (!result) {
    result = directRequires(graph, atomId);
    byAtom.set(atomId, result);
  }
  return result;
}

/** The atom's outbound `requires`, in the named view. */
export function requiresView(
  graph: RequiresGraph,
  atomId: string,
  view: RequiresViewName,
): RequiresView {
  const { declared, direct, implied } = reduced(graph, atomId);
  if (view === "declared") return { open: [...declared], folded: [], cores: new Map() };
  return {
    open: direct.map((d) => d.id),
    folded: implied.map((i) => i.id),
    cores: new Map(direct.filter((d) => d.viaCore).map((d) => [d.id, d.core])),
  };
}

/** The atoms that declare `requires` toward `atomId`, split by the named view. */
export function requiredByView(
  graph: RequiresGraph,
  atomId: string,
  view: RequiresViewName,
): RequiredByView {
  const open: RequiredBy[] = [];
  const folded: RequiredBy[] = [];
  const component = graph.componentOf.get(atomId);
  const inCycle = component !== undefined && graph.components[component].length > 1;
  for (const holder of graph.nodes) {
    if (!graph.out.get(holder)!.includes(atomId)) continue;
    if (view === "declared") {
      open.push({ id: holder, viaCore: false });
      continue;
    }
    const { direct, implied } = reduced(graph, holder);
    const asDirect = direct.find((d) => d.id === atomId);
    if (asDirect) {
      open.push({ id: holder, viaCore: asDirect.viaCore });
      continue;
    }
    const asImplied = implied.find((i) => i.id === atomId)!;
    folded.push({
      id: holder,
      viaCore: inCycle && graph.componentOf.get(asImplied.via) === component,
    });
  }
  return { open, folded };
}

export interface RequiredByReport {
  /** Atoms at least one other atom declares `requires` toward. */
  targets: number;
  /** Declared inbound edges over those targets: the closure's count. */
  declaredInbound: number;
  /** Inbound edges whose holder keeps the target in its direct list. */
  directInbound: number;
  /** Targets whose declared inbound exceeds their direct inbound. */
  overstating: number;
  /** Targets no atom holds as direct. */
  zeroDirect: number;
}

/** The whole-corpus reading of the inbound side, for the tests and the tracker. */
export function requiredByReport(graph: RequiresGraph): RequiredByReport {
  let targets = 0;
  let declaredInbound = 0;
  let directInbound = 0;
  let overstating = 0;
  let zeroDirect = 0;
  for (const id of graph.nodes) {
    const { open, folded } = requiredByView(graph, id, "direct");
    const declared = open.length + folded.length;
    if (declared === 0) continue;
    targets += 1;
    declaredInbound += declared;
    directInbound += open.length;
    if (folded.length > 0) overstating += 1;
    if (open.length === 0) zeroDirect += 1;
  }
  return { targets, declaredInbound, directInbound, overstating, zeroDirect };
}
