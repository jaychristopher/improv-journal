import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildsOnFoldSummary,
  buildsOnGroup,
  CORE_ITEM_SUFFIX,
  coreItemLabel,
} from "../../components/AtomDetail";
import { loadAtoms } from "../content";
import {
  coreRepresentative,
  directRequires,
  directRequiresReport,
  requiredByView,
  requiresGraph,
  requiresView,
  stronglyConnectedComponents,
} from "../direct-requires";
import { CORE_HREF } from "../the-core";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

/**
 * The prerequisite relation is written as its own closure.
 *
 * Tracker entry 277 (2026-09-22): of the 553 `requires` edges that do not
 * sit inside a cycle, most are implied by a chain of `requires` already in
 * the graph — an atom declares B and C when B already requires C, or names
 * two members of the 19-atom knot (entry 141), where every member reaches
 * every other. `reality-construction` declares 16 prerequisites of which 3
 * are the next thing to read; `commitment` is required by 70 atoms and
 * needed next by a handful; the median atom declares 3 and keeps 1. The
 * "Builds on" group, the paths' leans-on and forward-needs blocks and the
 * journey's prerequisite map all read the closure and said the same thing
 * two or three times.
 *
 * `directRequires` is the reduction those surfaces now read. These guards
 * hold the population, the reading on the day it was applied, and the
 * invariants a reduction must keep: a subset of what was declared, nothing
 * lost, no atom emptied, and a cycle collapsed to one item.
 */
describe("direct requires", () => {
  it("reduces a chain, collapses a cycle, and never routes back through the atom", () => {
    const graph = requiresGraph([
      // a declares b and c; b requires c, so c is implied by the chain.
      {
        id: "a",
        links: [
          { id: "b", relation: "requires" },
          { id: "c", relation: "requires" },
        ],
      },
      { id: "b", links: [{ id: "c", relation: "requires" }] },
      { id: "c", links: [] },
      // k1, k2, k3 are a cycle; d names two of them and one outsider.
      { id: "k1", links: [{ id: "k2", relation: "requires" }] },
      { id: "k2", links: [{ id: "k3", relation: "requires" }] },
      { id: "k3", links: [{ id: "k1", relation: "requires" }] },
      {
        id: "d",
        links: [
          { id: "k2", relation: "requires" },
          { id: "c", relation: "requires" },
          { id: "k1", relation: "requires" },
          { id: "d", relation: "requires" },
          { id: "not-an-atom", relation: "requires" },
          { id: "k2", relation: "enables" },
        ],
      },
      // e is in a two-cycle with f, and requires x; f reaches x only through e.
      {
        id: "e",
        links: [
          { id: "f", relation: "requires" },
          { id: "x", relation: "requires" },
        ],
      },
      { id: "f", links: [{ id: "e", relation: "requires" }] },
      { id: "x", links: [] },
    ]);

    expect(stronglyConnectedComponents(graph.nodes, graph.out).filter((c) => c.length > 1)).toEqual(
      [
        ["k1", "k2", "k3"],
        ["e", "f"],
      ],
    );

    const a = directRequires(graph, "a");
    expect(a.direct.map((d) => d.id)).toEqual(["b"]);
    expect(a.implied).toEqual([{ id: "c", via: "b", by: "chain" }]);

    // Self-loops, unknown ids and other relations are not declared prerequisites.
    const d = directRequires(graph, "d");
    expect(d.declared).toEqual(["k2", "c", "k1"]);
    expect(d.direct).toEqual([
      { id: "k2", viaCore: true, core: ["k1", "k2", "k3"] },
      { id: "c", viaCore: false, core: [] },
    ]);
    expect(d.implied).toEqual([{ id: "k1", via: "k2", by: "knot" }]);

    // e's only route from f to x runs through e itself, so x stays direct.
    const e = directRequires(graph, "e");
    expect(e.direct.map((d) => d.id)).toEqual(["f", "x"]);
    expect(e.implied).toEqual([]);

    expect(directRequires(graph, "c")).toEqual({ declared: [], direct: [], implied: [] });
    expect(directRequires(graph, "nowhere")).toEqual({ declared: [], direct: [], implied: [] });
  });

  /**
   * The two views of the same graph, from both ends (entries 301 and 302).
   * `requiresView` partitions an atom's declared targets into open and
   * folded; `requiredByView` partitions a target's holders the same way,
   * and the two agree edge for edge: what one end opens the other opens,
   * what one folds the other folds. A holder that names a cycle twice is
   * open on the member it named first — standing for the core — and folded
   * with `viaCore` on the rest; a holder whose other target reaches the
   * atom by an ordinary chain is folded without it. The declared view opens
   * everything and folds nothing.
   */
  it("reads the relation in two views, and the views agree at both ends", () => {
    const graph = requiresGraph([
      { id: "k1", links: [{ id: "k2", relation: "requires" }] },
      { id: "k2", links: [{ id: "k3", relation: "requires" }] },
      { id: "k3", links: [{ id: "k1", relation: "requires" }] },
      { id: "b", links: [{ id: "c", relation: "requires" }] },
      { id: "c", links: [] },
      {
        id: "d",
        links: [
          { id: "k2", relation: "requires" },
          { id: "b", relation: "requires" },
          { id: "c", relation: "requires" },
          { id: "k1", relation: "requires" },
        ],
      },
      { id: "e", links: [{ id: "c", relation: "requires" }] },
    ]);

    const d = requiresView(graph, "d", "direct");
    expect(d.open).toEqual(["k2", "b"]);
    expect(d.folded).toEqual(["c", "k1"]);
    expect([...d.cores.keys()]).toEqual(["k2"]);
    expect(d.cores.get("k2")).toEqual(["k1", "k2", "k3"]);
    const declared = requiresView(graph, "d", "declared");
    expect(declared).toEqual({ open: ["k2", "b", "c", "k1"], folded: [], cores: new Map() });
    expect(requiresView(graph, "nowhere", "direct")).toEqual({
      open: [],
      folded: [],
      cores: new Map(),
    });

    // From the targets' end. k2: d opens it, standing for the core. k1: d
    // folds it into k2's core item. c: b and e open it, d folds it through
    // b — a chain, not the knot.
    expect(requiredByView(graph, "k2", "direct")).toEqual({
      open: [
        { id: "k1", viaCore: false },
        { id: "d", viaCore: true },
      ],
      folded: [],
    });
    expect(requiredByView(graph, "k1", "direct")).toEqual({
      open: [{ id: "k3", viaCore: false }],
      folded: [{ id: "d", viaCore: true }],
    });
    expect(requiredByView(graph, "c", "direct")).toEqual({
      open: [
        { id: "b", viaCore: false },
        { id: "e", viaCore: false },
      ],
      folded: [{ id: "d", viaCore: false }],
    });
    expect(requiredByView(graph, "c", "declared")).toEqual({
      open: [
        { id: "b", viaCore: false },
        { id: "d", viaCore: false },
        { id: "e", viaCore: false },
      ],
      folded: [],
    });
    expect(requiredByView(graph, "nowhere", "direct")).toEqual({ open: [], folded: [] });

    // Both ends, every edge, on the small graph; requires-views.test.ts
    // walks the corpus the same way.
    for (const atom of graph.nodes) {
      const { open, folded } = requiresView(graph, atom, "direct");
      for (const t of open) {
        expect(requiredByView(graph, t, "direct").open.map((h) => h.id)).toContain(atom);
      }
      for (const t of folded) {
        expect(requiredByView(graph, t, "direct").folded.map((h) => h.id)).toContain(atom);
      }
    }
  });

  /**
   * The sidebar's shape of the same result: the direct list open, a cycle
   * as "<Title> and the core" on the member named first, and everything
   * the reduction dropped — the implied targets, then the rest of the core
   * less the page's own atom — as links in the fold. A declared target the
   * graph does not know is not an atom and cannot be reduced, so it stays
   * in the open list as declared; nothing is listed twice.
   */
  it("shapes the Builds on group: direct items open, the implied and the core folded", () => {
    const graph = requiresGraph([
      { id: "k1", links: [{ id: "k2", relation: "requires" }] },
      { id: "k2", links: [{ id: "k3", relation: "requires" }] },
      { id: "k3", links: [{ id: "k1", relation: "requires" }] },
      { id: "b", links: [{ id: "c", relation: "requires" }] },
      { id: "c", links: [] },
      {
        id: "d",
        links: [
          { id: "k2", relation: "requires" },
          { id: "b", relation: "requires" },
          { id: "c", relation: "requires" },
          { id: "k1", relation: "requires" },
          { id: "ghost", relation: "requires" },
          { id: "b", relation: "extends" },
        ],
      },
    ]);
    const titles: Record<string, string> = {
      k1: "K One",
      k2: "K Two",
      k3: "K Three",
      b: "B",
      c: "C",
    };
    const atomOf = (id: string) =>
      titles[id] ? { title: titles[id], url: `/x/${id}` } : undefined;
    const declared = graph.out
      .get("d")!
      .concat("ghost")
      .map((id) => ({
        id,
        relation: "requires" as const,
        title: titles[id] ?? id,
        url: `/x/${id}`,
      }));

    const group = buildsOnGroup("d", declared, graph, atomOf);
    // k1 and k2 are each required twice (by the cycle and by d), so the tie
    // keeps the first-declared, k2. The item is the member's link with the
    // core page as a suffix link (entry 315), the two halves of the label.
    expect(group.direct).toEqual([
      { key: "k2", href: "/x/k2", label: "K Two", suffix: CORE_ITEM_SUFFIX },
      { key: "b", href: "/x/b", label: "B" },
      { key: "ghost", href: "/x/ghost", label: "ghost" },
    ]);
    expect(CORE_ITEM_SUFFIX.href).toBe(CORE_HREF);
    expect(`${group.direct[0].label}${CORE_ITEM_SUFFIX.join}${CORE_ITEM_SUFFIX.label}`).toBe(
      coreItemLabel("K Two"),
    );
    expect(group.folded).toEqual([
      { key: "c", href: "/x/c", label: "C" },
      { key: "k1", href: "/x/k1", label: "K One" },
      { key: "k3", href: "/x/k3", label: "K Three" },
    ]);
    expect(buildsOnFoldSummary(group.folded.length)).toBe("and 3 more it builds on through these");

    // A knot member's own page names two of its cycle: the fold lists the
    // implied one and the rest of the core, never the page itself. k3 is
    // required by k1 and k2, k2 by k1 alone, so k3 stands for the core
    // although k1 named k2 first — the most-required rule of entry 315
    // (until 2026-09-22 this opened on k2).
    const knot = requiresGraph([
      {
        id: "k1",
        links: [
          { id: "k2", relation: "requires" },
          { id: "k3", relation: "requires" },
        ],
      },
      { id: "k2", links: [{ id: "k3", relation: "requires" }] },
      { id: "k3", links: [{ id: "k1", relation: "requires" }] },
    ]);
    const own = buildsOnGroup(
      "k1",
      [
        { id: "k2", relation: "requires", title: "K Two", url: "/x/k2" },
        { id: "k3", relation: "requires", title: "K Three", url: "/x/k3" },
      ],
      knot,
      atomOf,
    );
    expect(own.direct).toEqual([
      { key: "k3", href: "/x/k3", label: "K Three", suffix: CORE_ITEM_SUFFIX },
    ]);
    expect(own.folded.map((l) => l.key)).toEqual(["k2"]);
  });

  it("holds the corpus reading: most declared prerequisites are implied by a chain or the knot", async () => {
    const atoms = await loadAtoms();
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const report = directRequiresReport(graph);

    // The population, so a loader that stops reading `requires` fails here.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(report.atomsWithPrerequisites).toBeGreaterThanOrEqual(150);
    expect(report.edgesAcyclic).toBeGreaterThanOrEqual(550);
    expect(report.core.length).toBeGreaterThanOrEqual(15);
    expect(report.core).toContain("commitment");
    expect(report.core).toContain("active-listening");

    // The reading on 2026-09-22: 618 edges, 65 inside a cycle, 553 acyclic,
    // of which 225 direct and 328 implied (59%) — 181 by a chain that
    // survives the knot being cut open, 147 by the knot alone. The entry
    // counted 355 (64%) with a reduction that let a knot atom's edge be
    // implied through knot members it never declared; this one lets only
    // declared targets imply, and never along a path back through the
    // atom, which is what a page can honestly fold. Both sit in the band.
    // A floor, because the redundancy is the finding; a ceiling, because a
    // reduction that dropped everything would pass a floor alone.
    const share = report.edgesImplied / report.edgesAcyclic;
    expect(share).toBeGreaterThanOrEqual(0.55);
    expect(share).toBeLessThanOrEqual(0.65);
    expect(report.impliedByKnot).toBeGreaterThanOrEqual(100);
    expect(report.impliedByChain).toBeGreaterThanOrEqual(150);
    expect(report.impliedByChain + report.impliedByKnot).toBe(report.edgesImplied);
    expect(report.edgesDirect + report.edgesImplied).toBe(report.edgesAcyclic);

    // The median atom declares 3 and keeps 1; the widest, 16 and 7.
    expect(report.medianDeclared).toBe(3);
    expect(report.medianDirect).toBe(1);
    expect(report.maxDirect).toBeLessThan(report.maxDeclared);
    // 79 of the 140 atoms outside the knot with a prerequisite name it twice.
    expect(report.atomsNamingCoreTwice).toBeGreaterThanOrEqual(70);

    // `commitment`: required by 70, the next thing to read for 9 on entry
    // 277's rule; 23 since 2026-09-22 (entry 315), because it is the member
    // the graph requires most and so stands for the core on 18 of the 43
    // pages that collapse it, where the first-declared rule gave it 4. The
    // holders that open it on its own — not as the face of the core — are
    // still a handful.
    const requiring = graph.nodes.filter((id) => graph.out.get(id)!.includes("commitment"));
    const next = graph.nodes
      .map((id) => directRequires(graph, id).direct.find((d) => d.id === "commitment"))
      .filter((d) => d !== undefined);
    expect(requiring.length).toBeGreaterThanOrEqual(60);
    expect(next.length).toBeLessThanOrEqual(26);
    expect(next.filter((d) => !d.viaCore).length).toBeLessThanOrEqual(12);
    expect(next.filter((d) => !d.viaCore).length).toBeGreaterThan(0);
    expect(next.filter((d) => d.viaCore).length).toBeGreaterThanOrEqual(15);
  });

  it("keeps every atom's direct list inside its declared list, loses nothing, and empties no atom", async () => {
    const atoms = await loadAtoms();
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    let checked = 0;
    for (const atom of atoms) {
      const id = atom.frontmatter.id;
      const { declared, direct, implied } = directRequires(graph, id);
      if (declared.length === 0) continue;
      checked += 1;
      const declaredSet = new Set(declared);
      for (const d of direct) expect(declaredSet.has(d.id), `${id}: ${d.id}`).toBe(true);
      for (const i of implied) {
        expect(declaredSet.has(i.id), `${id}: ${i.id}`).toBe(true);
        // Credited to something the atom declares, never to itself.
        expect(declaredSet.has(i.via), `${id}: ${i.id} via ${i.via}`).toBe(true);
        expect(i.via).not.toBe(i.id);
      }
      // A partition of the declared list: nothing dropped, nothing doubled.
      const all = [...direct.map((d) => d.id), ...implied.map((i) => i.id)].sort();
      expect(all, id).toEqual([...declared].sort());
      // No atom with prerequisites is left with none.
      expect(direct.length, id).toBeGreaterThan(0);
      // The knot collapses to at most one item: the declared member the
      // graph requires most, first-declared on a tie (entry 315; the first
      // member declared until 2026-09-22).
      const coreItems = direct.filter((d) => d.viaCore);
      expect(coreItems.length, id).toBeLessThanOrEqual(1);
      for (const item of coreItems) {
        expect(item.core.length).toBeGreaterThan(1);
        expect(item.core).toContain(item.id);
        const named = declared.filter((t) => item.core.includes(t));
        expect(coreRepresentative(graph, named), id).toBe(item.id);
        const rank = (t: string) => graph.inDegree.get(t) ?? 0;
        for (const t of named) {
          expect(rank(item.id), `${id}: ${item.id} vs ${t}`).toBeGreaterThanOrEqual(rank(t));
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(150);
  });

  /**
   * The built pages. `commitment` names four knot members and opens on one,
   * "Active Listening and the core", with the rest in a fold under it;
   * `reality-construction` declares sixteen, thirteen of them implied, and
   * used to open its sidebar on all of them (entry 277's worked example).
   */
  it.runIf(built)(
    "folds the implied prerequisites under the direct list on the built pages",
    () => {
      const group = (
        file: string,
      ): { open: number; folded: number; summary: string; text: string; html: string } => {
        const html = fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
        const aside = html.split('data-track="concept-sidebar"')[1]?.split("</aside>")[0] ?? "";
        expect(aside.length, file).toBeGreaterThan(0);
        // The Builds on group: from its term to the next term or the block's end.
        const at = aside.indexOf(">Builds on<");
        expect(at, `${file} has a Builds on group`).toBeGreaterThan(-1);
        const end = aside.indexOf("<dt", at + 1);
        const dd = aside.slice(at, end === -1 ? undefined : end);
        const fold = /<details[^>]*>[\s\S]*?<\/details>/g;
        const summaries = [...dd.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) =>
          m[1].replace(/<[^>]+>/g, "").trim(),
        );
        const summary = summaries.find((s) => /^and \d+ more it builds on/.test(s)) ?? "";
        // The core item's "and the core" is a second link on the line, to
        // the core's page (entry 315); it is not an item, so it is not
        // counted as one here.
        const items = (s: string) =>
          (s.match(/<a /g) ?? []).length -
          (s.match(new RegExp(`href="${CORE_HREF}"`, "g")) ?? []).length;
        const open = items(dd.replace(fold, ""));
        const folded = items(dd) - open;
        return {
          open,
          folded,
          summary,
          text: dd.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "),
          html: dd,
        };
      };

      const commitment = group(path.join(APP, "practice", "techniques", "commitment.html"));
      expect(commitment.open).toBe(1);
      expect(commitment.text).toContain(coreItemLabel("Active Listening"));
      expect(commitment.html.replace(/<details[\s\S]*?<\/details>/g, "")).toContain(
        `href="${CORE_HREF}"`,
      );
      expect(commitment.summary).toBe(buildsOnFoldSummary(commitment.folded));
      // The three implied members and the rest of the nineteen — less the
      // page's own atom — all still links: 17 on 2026-09-22.
      expect(commitment.folded).toBeGreaterThanOrEqual(17);
      expect(commitment.html).not.toContain('href="/practice/techniques/commitment"');
      expect(commitment.text).toContain("Be Present");

      const reality = group(path.join(APP, "how-it-works", "reality-construction.html"));
      expect(reality.open).toBeLessThan(6);
      expect(reality.open).toBeGreaterThanOrEqual(3);
      expect(reality.summary).toMatch(/^and \d+ more it builds on through these$/);
      expect(reality.folded).toBeGreaterThanOrEqual(13);
    },
  );
});
