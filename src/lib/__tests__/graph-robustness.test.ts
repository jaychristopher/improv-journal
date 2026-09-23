import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import {
  articulationPoints,
  bridges,
  connectedComponents,
  coreNumbers,
  isolated,
  leaves,
  median,
  undirectedGraph,
} from "../graph-robustness";

/**
 * The atom graph has no weak point (tracker entry 268, 2026-09-22): one
 * component, no articulation point, no bridge, no leaf, and a 13-core of 97
 * atoms. Every structural test before this one measured centrality; none
 * measured fragility, so an edit that introduced a cut point — an atom whose
 * removal strands a region — would have shipped unnoticed. These are dated
 * readings of the graph, and the floors are set so that the next such edit
 * fails here.
 *
 * The corpus answers are all zeros and a maximum, which is exactly what a
 * detector that finds nothing would also return. The first block runs the
 * same functions on graphs built to have cut points, bridges and leaves, so
 * a zero on the corpus means the graph has none, not that the search does.
 */

/** A path a–b–c–d: two cut points, three bridges, two leaves, all in the 1-core. */
const PATH = [
  { id: "a", links: [{ id: "b" }] },
  { id: "b", links: [{ id: "c" }] },
  { id: "c", links: [{ id: "d" }] },
  { id: "d", links: [] },
];

/** Two triangles joined by one edge c–d: c and d are cut points, c–d the bridge. */
const BARBELL = [
  { id: "a", links: [{ id: "b" }, { id: "c" }] },
  { id: "b", links: [{ id: "c" }] },
  { id: "c", links: [{ id: "d" }] },
  { id: "d", links: [{ id: "e" }, { id: "f" }] },
  { id: "e", links: [{ id: "f" }] },
  { id: "f", links: [] },
];

describe("graph robustness detectors", () => {
  it("find the cut points, bridges and leaves of a path", () => {
    const g = undirectedGraph(PATH);
    expect(g.edges.length).toBe(3);
    expect(connectedComponents(g).length).toBe(1);
    expect(articulationPoints(g)).toEqual(["b", "c"]);
    expect(bridges(g)).toEqual([
      ["a", "b"],
      ["b", "c"],
      ["c", "d"],
    ]);
    expect(leaves(g)).toEqual(["a", "d"]);
    expect([...coreNumbers(g).values()]).toEqual([1, 1, 1, 1]);
  });

  it("find the one bridge between two triangles, and the 2-core on both sides", () => {
    const g = undirectedGraph(BARBELL);
    expect(articulationPoints(g)).toEqual(["c", "d"]);
    expect(bridges(g)).toEqual([["c", "d"]]);
    expect(leaves(g)).toEqual([]);
    const core = coreNumbers(g);
    for (const id of ["a", "b", "c", "d", "e", "f"]) expect(core.get(id), id).toBe(2);
    // Without the bridge the components are the two triangles.
    expect(connectedComponents(g, { withoutEdge: ["c", "d"] }).length).toBe(2);
    expect(connectedComponents(g, { withoutNode: "c" }).length).toBe(2);
  });

  it("read edges in either direction once, and drop self-loops and unknown ids", () => {
    const g = undirectedGraph([
      { id: "a", links: [{ id: "b" }, { id: "b" }, { id: "a" }, { id: "ghost" }] },
      { id: "b", links: [{ id: "a" }] },
      { id: "c", links: [] },
    ]);
    expect(g.edges).toEqual([["a", "b"]]);
    expect(isolated(g)).toEqual(["c"]);
    expect(connectedComponents(g).length).toBe(2);
  });

  it("take the median of odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});

describe("the atom graph", () => {
  const build = async () => {
    const atoms = await loadAtoms();
    const graph = undirectedGraph(atoms.map((a) => a.frontmatter));
    return { atoms, graph };
  };

  it("is one dense object with no seam", async () => {
    const { atoms, graph } = await build();
    // Population: 205 atoms, 2,022 distinct undirected edges on 2026-09-22.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(graph.edges.length).toBeGreaterThanOrEqual(1900);

    expect(connectedComponents(graph).length).toBe(1);
    expect(articulationPoints(graph)).toEqual([]);
    expect(bridges(graph)).toEqual([]);
    expect(leaves(graph)).toEqual([]);
    expect(isolated(graph)).toEqual([]);
  });

  it("has a 13-core of at least 95 atoms", async () => {
    const { graph } = await build();
    const core = coreNumbers(graph);
    const max = Math.max(...core.values());
    // 13 with 97 members on 2026-09-22. The floor on the count is two under.
    expect(max).toBe(13);
    expect([...core.values()].filter((k) => k === max).length).toBeGreaterThanOrEqual(95);
  });

  it("keeps the drills and the library as the periphery it measured", async () => {
    const { atoms, graph } = await build();
    const core = coreNumbers(graph);
    const byType = (type: string) =>
      atoms.filter((a) => a.frontmatter.type === type).map((a) => core.get(a.frontmatter.id)!);

    const exercises = byType("exercise");
    const references = byType("reference");
    // Guard the guard: 27 exercises and 32 references on 2026-09-22.
    expect(exercises.length).toBeGreaterThanOrEqual(25);
    expect(references.length).toBeGreaterThanOrEqual(30);

    // Exercises' median core number: 10 on 2026-09-22, five of 27 in the
    // 13-core. This is a floor on the graph, not on the exercise pages: the
    // "Drills that pair with this" block (drill-pairs.ts) is derived at
    // render from shared targets and adds no frontmatter edge, so it moves
    // nothing here. Only authored exercise → exercise links would, and the
    // floor is where a future edit that removes them is noticed.
    expect(median(exercises)).toBeGreaterThanOrEqual(10);
    // References' median core number: 6.5 on 2026-09-22, the lowest of any
    // type — the sixteen lowest-core atoms are all references, eleven of
    // them the science added 2026-08-23. Recorded, with room for one work
    // to lose an edge.
    expect(median(references)).toBeGreaterThanOrEqual(6);
    expect(median(references)).toBeLessThan(median(exercises));
  });
});
