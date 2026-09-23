/**
 * Robustness of the atom graph: the questions every structural measure so
 * far skipped.
 *
 * In-degree, PageRank, eccentricity and the 19-atom knot (tracker entries
 * 141, 153, 174, 238) all read the graph from its centre. None asked what
 * holds it together — which atom's removal would disconnect something, which
 * single edge is the only path between two regions, which concept hangs off
 * one other. Entry 268 (2026-09-22) asked, and the answer was none of each:
 * 205 atoms, 2,022 distinct undirected edges, no articulation point, no
 * bridge, no leaf, and a 13-core of 97 atoms. The periphery is typed rather
 * than stray — the library and the drills have the lowest core numbers,
 * because they receive edges and send few to each other.
 *
 * Every function here is pure over `links: [{ id }]`. The graph is undirected
 * — an edge is a declared relation in either direction — because the
 * question is connectivity, not who declared what. Self-loops and edges to
 * ids that are not atoms are dropped, so the graph is exactly the set of
 * atoms and the edges between them.
 *
 * At 205 nodes the simple algorithms are the right ones: articulation points
 * and bridges by removal and recount, core numbers by peeling. A Tarjan
 * lowpoint pass would be faster and harder to read, for a graph that the
 * tests walk in under a second.
 */

export interface GraphNode {
  id: string;
  links?: readonly { id: string }[];
}

export interface UndirectedGraph {
  /** Every atom id, in input order. */
  nodes: string[];
  /** Neighbours of each node. Symmetric: `b ∈ adj(a)` iff `a ∈ adj(b)`. */
  adjacency: Map<string, Set<string>>;
  /** Each distinct edge once, endpoints in sorted order. */
  edges: [string, string][];
}

/** The undirected graph of the atoms' declared edges. */
export function undirectedGraph(atoms: readonly GraphNode[]): UndirectedGraph {
  const nodes = atoms.map((a) => a.id);
  const adjacency = new Map<string, Set<string>>(nodes.map((id) => [id, new Set<string>()]));
  const edges: [string, string][] = [];
  const seen = new Set<string>();
  for (const atom of atoms) {
    for (const link of atom.links ?? []) {
      if (link.id === atom.id || !adjacency.has(link.id)) continue;
      const pair: [string, string] = atom.id < link.id ? [atom.id, link.id] : [link.id, atom.id];
      const key = `${pair[0]} -- ${pair[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(pair);
      adjacency.get(atom.id)!.add(link.id);
      adjacency.get(link.id)!.add(atom.id);
    }
  }
  return { nodes, adjacency, edges };
}

/**
 * Connected components, each a list of node ids in discovery order. Takes
 * an optional node to ignore and an optional edge to ignore, which is how
 * the cut-point and bridge searches below ask their question.
 */
export function connectedComponents(
  graph: UndirectedGraph,
  options: { withoutNode?: string; withoutEdge?: [string, string] } = {},
): string[][] {
  const { withoutNode, withoutEdge } = options;
  const skipsEdge = (a: string, b: string) =>
    withoutEdge !== undefined &&
    ((withoutEdge[0] === a && withoutEdge[1] === b) ||
      (withoutEdge[0] === b && withoutEdge[1] === a));
  const seen = new Set<string>();
  const components: string[][] = [];
  for (const start of graph.nodes) {
    if (start === withoutNode || seen.has(start)) continue;
    const component: string[] = [];
    const stack = [start];
    seen.add(start);
    while (stack.length > 0) {
      const node = stack.pop()!;
      component.push(node);
      for (const next of graph.adjacency.get(node) ?? []) {
        if (next === withoutNode || seen.has(next) || skipsEdge(node, next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    components.push(component);
  }
  return components;
}

/** Nodes whose removal raises the number of components. */
export function articulationPoints(graph: UndirectedGraph): string[] {
  const base = connectedComponents(graph).length;
  return graph.nodes.filter(
    (node) => connectedComponents(graph, { withoutNode: node }).length > base,
  );
}

/** Edges whose removal raises the number of components. */
export function bridges(graph: UndirectedGraph): [string, string][] {
  const base = connectedComponents(graph).length;
  return graph.edges.filter(
    (edge) => connectedComponents(graph, { withoutEdge: edge }).length > base,
  );
}

/** Nodes with exactly one neighbour. Nodes with none are `isolated`. */
export function leaves(graph: UndirectedGraph): string[] {
  return graph.nodes.filter((node) => graph.adjacency.get(node)!.size === 1);
}

/** Nodes with no neighbour at all. */
export function isolated(graph: UndirectedGraph): string[] {
  return graph.nodes.filter((node) => graph.adjacency.get(node)!.size === 0);
}

/**
 * Core number of every node: the largest k such that the node is in the
 * k-core, the maximal subgraph in which every node has at least k neighbours
 * inside it. Standard peeling — repeatedly remove every node of degree at
 * most k, then raise k — which is O(n + m) per level and, at thirteen levels
 * on this graph, nothing.
 */
export function coreNumbers(graph: UndirectedGraph): Map<string, number> {
  const degree = new Map<string, number>();
  for (const node of graph.nodes) degree.set(node, graph.adjacency.get(node)!.size);
  const core = new Map<string, number>();
  const remaining = new Set(graph.nodes);
  let k = 0;
  while (remaining.size > 0) {
    let peeled = true;
    while (peeled) {
      peeled = false;
      for (const node of [...remaining]) {
        if (degree.get(node)! > k) continue;
        core.set(node, k);
        remaining.delete(node);
        peeled = true;
        for (const next of graph.adjacency.get(node)!) {
          if (remaining.has(next)) degree.set(next, degree.get(next)! - 1);
        }
      }
    }
    k += 1;
  }
  return core;
}

/** Median of a list of numbers; NaN for an empty list. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
