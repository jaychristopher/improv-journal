import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import {
  CORE_LABEL,
  directRequiresOf,
  KNOT,
  MAX_SATELLITES,
  PER_RELATION_FIRST_PASS,
  pickMiniGraphSatellites,
  RELATION_PRIORITY,
} from "../mini-graph-picks";
import type { Link } from "../schema";
import { CORE_HREF } from "../the-core";

/**
 * The search page's mini graph used to draw an atom's first six declared
 * links, and declaration order is closure-first: on 2026-09-22, 453 of the
 * 1,189 satellites drawn sitewide (38.1%) were the 19-atom knot, 39 graphs
 * drew one relation, and the two loosest relations were the first declared on
 * 133 of 205 atoms (tracker entry 280). The picker chooses by relation
 * priority, two per relation before the next, and collapses the knot to one
 * node. These tests hold the measured result so a change to the rule, the
 * knot list or the corpus that quietly hands the slots back to the closure
 * fails here rather than on the search page.
 */

type GraphAtom = { id: string; links: Link[] };

async function graphAtoms(): Promise<GraphAtom[]> {
  const atoms = await loadAtoms();
  return atoms
    .map((a) => ({ id: a.frontmatter.id, links: a.frontmatter.links ?? [] }))
    .filter((a) => a.links.length > 0);
}

/** Tarjan's strongly connected components over the `requires` digraph. */
function requiresComponents(atoms: GraphAtom[]): string[][] {
  const ids = new Set(atoms.map((a) => a.id));
  const out = new Map(
    atoms.map((a) => [
      a.id,
      a.links.filter((l) => l.relation === "requires" && ids.has(l.id)).map((l) => l.id),
    ]),
  );
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const components: string[][] = [];
  let counter = 0;

  const visit = (v: string) => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of out.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      components.push(component);
    }
  };
  for (const id of ids) if (!index.has(id)) visit(id);
  return components;
}

describe("mini graph picks", () => {
  it("names the knot the corpus actually has", async () => {
    // The picker carries the knot as a list because the search page runs in
    // the browser with no other atom's links to hand. The list is only right
    // while it is the largest strongly connected component of `requires`.
    const atoms = await graphAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const largest = requiresComponents(atoms).sort((a, b) => b.length - a.length)[0];
    expect([...largest].sort()).toEqual([...KNOT].sort());
    expect(KNOT.size).toBe(19);
  });

  it("draws at most six, and says how many it left out", async () => {
    const atoms = await graphAtoms();
    let truncated = 0;
    for (const atom of atoms) {
      const pick = pickMiniGraphSatellites(atom.links);
      expect(pick.satellites.length, atom.id).toBeLessThanOrEqual(MAX_SATELLITES);
      expect(pick.satellites.length, atom.id).toBeGreaterThan(0);
      // "+N more" is the declared links no node stands for; the core stands
      // for every knot link the atom declares, not only the ones it displaced.
      const stood = pick.satellites.reduce((n, s) => n + s.members.length, 0);
      expect(pick.represented, atom.id).toBe(stood);
      expect(pick.more, atom.id).toBe(atom.links.length - stood);
      expect(pick.more, atom.id).toBeGreaterThanOrEqual(0);
      if (pick.more > 0) truncated += 1;
      // No node stands for a link the atom did not declare, and none twice.
      const declared = new Set(atom.links.map((l) => l.id));
      const members = pick.satellites.flatMap((s) => s.members);
      expect(new Set(members).size, atom.id).toBe(members.length);
      for (const id of members) expect(declared.has(id), `${atom.id} → ${id}`).toBe(true);
    }
    // 182 of 205 atoms have more than six links; on 2026-09-22, 161 graphs
    // still say "+N more" once the knot has collapsed (the other 21 fit). A
    // floor rather than an exact count, since the corpus grows.
    expect(truncated).toBeGreaterThanOrEqual(150);
  });

  it("shows at least two relations wherever the atom declares two", async () => {
    const atoms = await graphAtoms();
    let withTwo = 0;
    const single: string[] = [];
    for (const atom of atoms) {
      const available = new Set(atom.links.map((l) => l.relation)).size;
      const drawn = new Set(pickMiniGraphSatellites(atom.links).satellites.map((s) => s.relation))
        .size;
      if (available >= 2) {
        withTwo += 1;
        if (drawn < 2) single.push(atom.id);
      }
      // Under the old rule 39 graphs drew one relation; 28 atoms declare only one.
      expect(drawn, atom.id).toBeGreaterThanOrEqual(Math.min(available, 2));
    }
    expect(withTwo).toBeGreaterThanOrEqual(170);
    expect(single).toEqual([]);
  });

  it("keeps the knot's share of satellites under the measured ceiling", async () => {
    const atoms = await graphAtoms();
    let satellites = 0;
    let knot = 0;
    let cores = 0;
    let singleRelation = 0;
    const distinct: number[] = [];
    for (const atom of atoms) {
      const pick = pickMiniGraphSatellites(atom.links);
      satellites += pick.satellites.length;
      knot += pick.satellites.filter((s) => KNOT.has(s.id)).length;
      cores += pick.satellites.filter((s) => s.label === CORE_LABEL).length;
      const relations = new Set(pick.satellites.map((s) => s.relation)).size;
      distinct.push(relations);
      if (relations === 1) singleRelation += 1;
    }
    // Guard the guard: 1,158 satellites drawn on 2026-09-22 (1,189 before the
    // collapse, which leaves a few graphs with fewer than six own neighbours).
    expect(satellites).toBeGreaterThanOrEqual(1000);
    // Measured 2026-09-22: 169 of 1,158 (14.6%), against 453 of 1,189 (38.1%)
    // under first-six. A core node counts as a knot satellite, so this is the
    // whole knot presence, collapsed or not. Ceiling just above the measure;
    // the entry's 38% is what the ceiling is guarding against.
    expect(knot / satellites).toBeLessThan(0.16);
    // The collapse happened somewhere: 130 graphs drew a core node.
    expect(cores).toBeGreaterThanOrEqual(100);
    // 28 on 2026-09-22, every one an atom declaring a single relation (the
    // test above pins that); was 39.
    expect(singleRelation).toBeLessThanOrEqual(30);
    // Median distinct relations drawn: 3 before and after; the mean moved
    // from 2.49 to 3.08, and the mean is where the change shows.
    const sorted = [...distinct].sort((a, b) => a - b);
    expect(sorted[Math.floor(sorted.length / 2)]).toBeGreaterThanOrEqual(3);
    const mean = distinct.reduce((a, b) => a + b, 0) / distinct.length;
    expect(mean).toBeGreaterThanOrEqual(2.9);
  });

  describe("the rule on made-up links", () => {
    const link = (id: string, relation: Link["relation"]) => ({ id, relation });

    it("takes two per relation in priority order before any relation gets a third", () => {
      const links = [
        link("i1", "illustrates"),
        link("i2", "illustrates"),
        link("i3", "illustrates"),
        link("i4", "illustrates"),
        link("r1", "requires"),
        link("r2", "requires"),
        link("r3", "requires"),
        link("c1", "contrasts"),
        link("e1", "enables"),
      ];
      const pick = pickMiniGraphSatellites(links);
      // Two requires, the contrast, the enables, then two illustrates fill
      // six; the third requires waits behind every relation's second.
      expect(pick.satellites.map((s) => s.id)).toEqual(["i1", "i2", "r1", "r2", "c1", "e1"]);
      expect(pick.more).toBe(3);
      expect(RELATION_PRIORITY.indexOf("requires")).toBeLessThan(
        RELATION_PRIORITY.indexOf("contrasts"),
      );
      expect(PER_RELATION_FIRST_PASS).toBe(2);
    });

    it("fills the leftover slots in the same priority order", () => {
      const links = [
        link("r1", "requires"),
        link("r2", "requires"),
        link("r3", "requires"),
        link("r4", "requires"),
        link("x1", "extends"),
        link("x2", "extends"),
        link("x3", "extends"),
      ];
      const pick = pickMiniGraphSatellites(links);
      expect(pick.satellites.map((s) => s.id)).toEqual(["r1", "r2", "r3", "r4", "x1", "x2"]);
      expect(pick.more).toBe(1);
    });

    it("keeps declared order among the chosen, so the clockwise reading is the author's", () => {
      const links = [link("x", "extends"), link("r", "requires"), link("y", "extends")];
      expect(pickMiniGraphSatellites(links).satellites.map((s) => s.id)).toEqual(["x", "r", "y"]);
    });

    it("collapses two or more knot members into one node that links the first declared", () => {
      const links = [
        link("commitment", "requires"),
        link("trust", "requires"),
        link("offers", "illustrates"),
        link("own-1", "extends"),
        link("own-2", "extends"),
        link("own-3", "illustrates"),
        link("own-4", "illustrates"),
        link("own-5", "contrasts"),
      ];
      const pick = pickMiniGraphSatellites(links);
      const core = pick.satellites.find((s) => s.label === CORE_LABEL);
      expect(core).toBeDefined();
      // The first-declared member fixes the node's place on the ring; the
      // node itself links the core's page (entry 315).
      expect(core!.id).toBe("commitment");
      expect(core!.href).toBe(CORE_HREF);
      expect(core!.relation).toBe("requires");
      expect([...core!.members].sort()).toEqual(["commitment", "offers", "trust"]);
      // One node for the knot, five for the atom's own neighbours: none lost.
      expect(pick.satellites).toHaveLength(6);
      expect(pick.satellites.filter((s) => KNOT.has(s.id))).toHaveLength(1);
      expect(pick.represented).toBe(8);
      expect(pick.more).toBe(0);
    });

    it("draws a single knot member as itself", () => {
      const links = [link("commitment", "requires"), link("own", "extends")];
      const pick = pickMiniGraphSatellites(links);
      expect(pick.satellites.map((s) => s.label)).toEqual([undefined, undefined]);
      expect(pick.satellites[0].id).toBe("commitment");
    });

    it("draws nothing for nothing", () => {
      expect(pickMiniGraphSatellites([])).toEqual({ satellites: [], represented: 0, more: 0 });
    });

    /**
     * The direct view (entry 302): a `requires` link the atom holds only as
     * implied is not drawn and counts in "+N more"; the slot it would have
     * taken goes to the next candidate. The knot still collapses on the
     * declared links, so the core appears where it did and stands for the
     * implied knot links too. Without a flagged link there is no set, and
     * the declared relation draws as before.
     */
    it("draws no implied requires satellite when given the direct set", () => {
      const links = [
        link("chain-b", "requires"),
        link("chain-c", "requires"),
        link("x1", "extends"),
        link("x2", "extends"),
        link("x3", "extends"),
        link("i1", "illustrates"),
        link("i2", "illustrates"),
        link("i3", "illustrates"),
      ];
      // chain-b requires chain-c elsewhere in the graph: c is implied.
      const pick = pickMiniGraphSatellites(links, new Set(["chain-b"]));
      expect(pick.satellites.map((s) => s.id)).toEqual(["chain-b", "x1", "x2", "x3", "i1", "i2"]);
      expect(pick.more).toBe(2);
      // Declared view: both prerequisites drawn, one fewer own neighbour.
      expect(pickMiniGraphSatellites(links).satellites.map((s) => s.id)).toEqual([
        "chain-b",
        "chain-c",
        "x1",
        "x2",
        "i1",
        "i2",
      ]);

      // Two knot members, one direct and one implied through it: the core
      // node still stands for both, and no implied link draws alone.
      const knotted = [
        link("commitment", "requires"),
        link("trust", "requires"),
        link("own-1", "extends"),
        link("own-2", "contrasts"),
      ];
      const collapsed = pickMiniGraphSatellites(knotted, new Set(["commitment"]));
      const core = collapsed.satellites.find((s) => s.label === CORE_LABEL);
      expect(core).toBeDefined();
      expect([...core!.members].sort()).toEqual(["commitment", "trust"]);
      expect(collapsed.satellites).toHaveLength(3);
      expect(collapsed.more).toBe(0);
      // An empty set folds every prerequisite; the non-requires links draw.
      const none = pickMiniGraphSatellites(links, new Set());
      expect(none.satellites.map((s) => s.relation)).not.toContain("requires");
      expect(none.more).toBe(2);
    });

    it("reads the direct set off the links' flags, and finds none on unflagged links", () => {
      expect(directRequiresOf([link("a", "requires"), link("b", "extends")])).toBeNull();
      const flagged = [
        { ...link("a", "requires"), direct: true },
        { ...link("b", "requires"), direct: false },
        link("c", "extends"),
      ];
      expect([...directRequiresOf(flagged)!]).toEqual(["a"]);
      // A relation other than requires never carries a flag worth reading.
      expect(directRequiresOf([{ ...link("c", "extends"), direct: true }])).toBeNull();
    });
  });
});
