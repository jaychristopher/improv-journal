import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DRILLS_LABEL,
  INBOUND_GROUP_LIMIT,
  inboundGroupsFor,
  requiredByFoldSummary,
} from "../../components/AtomDetail";
import { ageNormalisedRank } from "../atom-rank";
import { getAtomUrl, getInboundLinks, loadAtoms } from "../content";
import { requiredByView, requiresGraph } from "../direct-requires";
import { DRILLS_SHOW_LABEL } from "../relation-labels";
import { trainedBy } from "../trains";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Edges are declared in one direction. `commitment` is required by seventy
 * atoms and its page listed none of them; a drill declares `illustrates`
 * toward the concept it trains and the concept page could not show the drill.
 * Seventeen hand-written prose links were the author working around exactly
 * this. The inbound index is what lets the page read the graph backwards, so
 * these guards assert that it finds the edges, not merely that it returns.
 */
describe("inbound atom links", () => {
  it("finds the atoms that require commitment", async () => {
    const atoms = await loadAtoms();
    // The population, so a changed loader fails here rather than passing on nothing.
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const inbound = await getInboundLinks("commitment");
    const requiredBy = inbound.filter((l) => l.relation === "requires");
    // 70 on 2026-09-21 (entry 95). The floor guards the direction, not the count.
    expect(requiredBy.length).toBeGreaterThanOrEqual(50);

    // Every entry is a real atom that really declares the edge.
    for (const link of requiredBy) {
      const source = atoms.find((a) => a.frontmatter.id === link.id);
      expect(source, link.id).toBeDefined();
      expect(
        source!.frontmatter.links.some((l) => l.id === "commitment" && l.relation === "requires"),
        `${link.id} → commitment`,
      ).toBe(true);
      expect(link.url).toContain(`/${link.id}`);
    }
  });

  it("lets a concept find the drill that illustrates it", async () => {
    // bippity-bippity-bop declares `illustrates` toward spontaneity, and
    // spontaneity declares nothing back — the case entry 181 found the author
    // patching by hand.
    const inbound = await getInboundLinks("spontaneity");
    const drill = inbound.find((l) => l.id === "bippity-bippity-bop");
    expect(drill).toBeDefined();
    expect(drill!.relation).toBe("illustrates");
    expect(drill!.type).toBe("exercise");

    // Until 2026-09-22 this edge landed under "Drills that train this".
    // bippity-bippity-bop is one of the three exercises with no Trains line
    // at all, so the drill makes no such claim and the edge now lands under
    // the weaker "Drills that show this" (entry 274). The concept still finds
    // the drill; only the word changed.
    const groups = inboundGroupsFor(inbound, []);
    const drills = groups.find((g) => g.label === DRILLS_SHOW_LABEL);
    expect(drills).toBeDefined();
    expect(drills!.links.map((l) => l.id)).toContain("bippity-bippity-bop");
    expect(groups.find((g) => g.label === DRILLS_LABEL)).toBeUndefined();
  });

  it("keeps the strong label for a drill whose own Trains line names the concept", async () => {
    // first-line-drill's line reads "**Trains:** Be Brave — the threshold
    // moment of starting", and it declares `illustrates` toward be-brave: the
    // edge and the drill agree, which is the only case the strong label is
    // used.
    const inbound = await getInboundLinks("be-brave");
    const confirmed = new Set(await trainedBy("be-brave"));
    expect(confirmed.has("first-line-drill")).toBe(true);
    const groups = inboundGroupsFor(inbound, [], confirmed);
    const drills = groups.find((g) => g.label === DRILLS_LABEL);
    expect(drills).toBeDefined();
    expect(drills!.links.map((l) => l.id)).toContain("first-line-drill");
    expect(
      groups.find((g) => g.label === DRILLS_SHOW_LABEL)?.links.map((l) => l.id) ?? [],
    ).not.toContain("first-line-drill");
    // Train before show, so the confirmed group is met first.
    const keys = groups.map((g) => g.key);
    if (keys.includes("shows")) expect(keys.indexOf("drills")).toBeLessThan(keys.indexOf("shows"));
  });

  it("splits every exercise's illustrates edge by whether the drill claims it, corpus-wide", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    let train = 0;
    let show = 0;
    let trainConcepts = 0;
    let showConcepts = 0;
    for (const atom of atoms) {
      if (atom.frontmatter.type === "exercise") continue;
      const id = atom.frontmatter.id;
      const groups = inboundGroupsFor(await getInboundLinks(id), [], new Set(await trainedBy(id)));
      const t = groups.find((g) => g.key === "drills");
      const s = groups.find((g) => g.key === "shows");
      if (t) {
        trainConcepts += 1;
        train += t.links.length + t.omitted;
      }
      if (s) {
        showConcepts += 1;
        show += s.links.length + s.omitted;
      }
    }
    // Before any reciprocal edge is dropped: 17 confirmed edges on 15
    // concepts and 73 unconfirmed on 37 (69 from the 24 drills with a Trains
    // line, entry 274, plus 4 from the three drills without one), measured
    // 2026-09-22. The floors sit one under; the ceiling on "train" guards
    // against a parser that starts matching everything.
    expect(train).toBeGreaterThanOrEqual(16);
    expect(trainConcepts).toBeGreaterThanOrEqual(14);
    expect(show).toBeGreaterThanOrEqual(70);
    expect(showConcepts).toBeGreaterThanOrEqual(35);
    expect(train).toBeLessThan(show);
  });

  it("covers the whole corpus: every declared edge to a known atom is an inbound edge somewhere", async () => {
    const atoms = await loadAtoms();
    const known = new Set(atoms.map((a) => a.frontmatter.id));
    let declared = 0;
    let found = 0;
    for (const atom of atoms) {
      for (const link of atom.frontmatter.links ?? []) {
        if (!known.has(link.id)) continue;
        declared += 1;
        const inbound = await getInboundLinks(link.id);
        if (inbound.some((l) => l.id === atom.frontmatter.id && l.relation === link.relation)) {
          found += 1;
        }
      }
    }
    // 2,422 edges on 2026-09-20 (entry 95).
    expect(declared).toBeGreaterThanOrEqual(2000);
    expect(found).toBe(declared);
  });

  it("ranks a long group by the linking atom's own in-degree", async () => {
    // The index's own order. Since 2026-09-22 the page re-ranks the members
    // by in-degree per month of age before grouping (entry 307; the
    // sidebar-groups tests below), so this is the order a caller gets
    // without a rank, not the order the sidebar shows.
    const inbound = await getInboundLinks("commitment");
    for (let i = 1; i < inbound.length; i += 1) {
      expect(inbound[i - 1].inDegree).toBeGreaterThanOrEqual(inbound[i].inDegree);
    }
  });
});

describe("inbound sidebar groups", () => {
  it("caps a group at the limit and counts the rest", async () => {
    // Without the view the group reads the declarations, as it did until
    // 2026-09-22 — the closure, seventy holders, twelve kept. With the rank
    // the page passes (entry 307) the dozen kept are the ones the graph
    // leans on most for their age; until then they were the raw in-degree
    // dozen, which was the March dozen.
    const atoms = await loadAtoms();
    const rank = ageNormalisedRank(atoms);
    const inbound = await getInboundLinks("commitment");
    const groups = inboundGroupsFor(inbound, [], new Set(), undefined, undefined, rank);
    const requiredBy = groups.find((g) => g.key === "requires");
    expect(requiredBy).toBeDefined();
    expect(requiredBy!.links.length).toBe(INBOUND_GROUP_LIMIT);
    expect(requiredBy!.omitted).toBeGreaterThanOrEqual(50 - INBOUND_GROUP_LIMIT);
    expect(requiredBy!.folded).toEqual([]);
    // The kept dozen are the ones with the highest rank, not the first
    // dozen by filename and not the raw in-degree dozen.
    const of = (id: string) => rank.get(id) ?? 0;
    const keptMin = Math.min(...requiredBy!.links.map((l) => of(l.id)));
    const droppedMax = Math.max(
      ...inbound
        .filter((l) => l.relation === "requires" && !requiredBy!.links.some((k) => k.id === l.id))
        .map((l) => of(l.id)),
    );
    expect(keptMin).toBeGreaterThanOrEqual(droppedMax);
    const kept = requiredBy!.links.map((l) => l.id);
    for (let i = 1; i < kept.length; i += 1) {
      expect(of(kept[i - 1])).toBeGreaterThanOrEqual(of(kept[i]));
    }
    // Without the rank the index's own order stands, which the test above
    // ("ranks a long group by the linking atom's own in-degree") reads.
    const unranked = inboundGroupsFor(inbound, []).find((g) => g.key === "requires")!;
    expect(unranked.links.map((l) => l.id)).toEqual(
      inbound
        .filter((l) => l.relation === "requires")
        .slice(0, INBOUND_GROUP_LIMIT)
        .map((l) => l.id),
    );
    expect(unranked.links.map((l) => l.id)).not.toEqual(kept);
  });

  /**
   * With the direct view (entry 301) the "Required by" group opens the
   * atoms whose own "Builds on" opens this page and folds the rest, so the
   * two ends of an edge agree. On `commitment`: 70 declared, 9 open, 61
   * folded — 14 collapsed into another member's core item, 47 implied by a
   * prerequisite of their own — on 2026-09-22. Later that day entry 315
   * made the most-required member the face of the core, and commitment is
   * that member: 23 open (18 as "Commitment and the core"), 47 folded, none
   * of them through the core, and the open list now overflows the group's
   * limit. The open count is the size the budget ranks on; the folded
   * holders keep the order the open list has — by how much the graph leans
   * on each for its age, since 2026-09-22 (entry 307) — so the fold reads
   * the way the open list does. `be-present` is the page that still folds
   * holders through the core (18), so the two-way split is read there.
   */
  it("opens only the direct holders under Required by, and folds the rest with both counts", async () => {
    const atoms = await loadAtoms();
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const rank = ageNormalisedRank(atoms);
    const inbound = await getInboundLinks("commitment");
    const view = requiredByView(graph, "commitment", "direct");
    const group = inboundGroupsFor(inbound, [], new Set(), undefined, view, rank).find(
      (g) => g.key === "requires",
    )!;
    const open = group.links.length + group.omitted;
    expect(open).toBe(view.open.length);
    expect(group.folded.length).toBe(view.folded.length);
    expect(open + group.folded.length).toBe(
      inbound.filter((l) => l.relation === "requires").length,
    );
    // Floors just under the reading; the ratio is the finding.
    expect(open).toBeGreaterThanOrEqual(20);
    expect(open).toBeGreaterThan(INBOUND_GROUP_LIMIT);
    expect(group.omitted).toBe(open - INBOUND_GROUP_LIMIT);
    expect(group.folded.length).toBeGreaterThanOrEqual(45);
    expect(group.folded.filter((h) => h.viaCore).length).toBe(0);
    expect(view.open.filter((h) => h.viaCore).length).toBeGreaterThanOrEqual(15);

    const presentView = requiredByView(graph, "be-present", "direct");
    const present = inboundGroupsFor(
      await getInboundLinks("be-present"),
      [],
      new Set(),
      undefined,
      presentView,
      rank,
    ).find((g) => g.key === "requires")!;
    const viaCore = present.folded.filter((h) => h.viaCore).length;
    expect(viaCore).toBeGreaterThanOrEqual(10);
    expect(viaCore).toBeLessThan(present.folded.length);
    expect(present.folded.length).toBe(presentView.folded.length);
    // Nothing listed twice, and the open list and the fold both run in the
    // rank's order.
    const ids = [...group.links.map((l) => l.id), ...group.folded.map((h) => h.id)];
    expect(new Set(ids).size).toBe(ids.length);
    const of = (id: string) => rank.get(id) ?? 0;
    for (const list of [group.links.map((l) => l.id), group.folded.map((h) => h.id)]) {
      for (let i = 1; i < list.length; i += 1) {
        expect(of(list[i - 1]), `${list[i - 1]} before ${list[i]}`).toBeGreaterThanOrEqual(
          of(list[i]),
        );
      }
    }

    // The summary says both numbers, and names the two ways a holder folds.
    expect(requiredByFoldSummary(9, 14, 47)).toBe(
      "Required by 9 directly, 14 through the core and 47 through their prerequisites",
    );
    expect(requiredByFoldSummary(2, 24, 0)).toBe("Required by 2 directly, 24 through the core");
    expect(requiredByFoldSummary(0, 0, 11)).toBe(
      "Required by 0 directly, 11 through their prerequisites",
    );
  });

  it("drops an inbound edge only when the outgoing side already shows it under the reciprocal label", () => {
    const inbound = [
      // A requires this page; this page enables A → one fact, shown once.
      { id: "a", title: "A", type: "technique", url: "/x/a", relation: "requires", inDegree: 0 },
      // B requires this page; this page merely extends B → still worth showing.
      { id: "b", title: "B", type: "technique", url: "/x/b", relation: "requires", inDegree: 0 },
      // C and this page extend each other → shown once, under "Extends"
      // (the group was "Related" until 2026-09-21, entry 227).
      { id: "c", title: "C", type: "technique", url: "/x/c", relation: "extends", inDegree: 0 },
      // D illustrates this page, is an exercise, and its Trains line names
      // this page → a drill that trains this.
      { id: "d", title: "D", type: "exercise", url: "/x/d", relation: "illustrates", inDegree: 0 },
      // E illustrates this page and is a format → not a drill.
      { id: "e", title: "E", type: "format", url: "/x/e", relation: "illustrates", inDegree: 0 },
      // F illustrates this page and is an exercise, but its Trains line does
      // not name this page → a drill that shows this (entry 274).
      { id: "f", title: "F", type: "exercise", url: "/x/f", relation: "illustrates", inDegree: 0 },
    ] as const;
    const groups = inboundGroupsFor(
      [...inbound],
      [
        { id: "a", relation: "enables" },
        { id: "b", relation: "extends" },
        { id: "c", relation: "extends" },
      ],
      new Set(["d"]),
    );
    const ids = (key: string) => groups.find((g) => g.key === key)?.links.map((l) => l.id) ?? [];
    expect(ids("requires")).toEqual(["b"]);
    expect(ids("extends")).toEqual([]);
    expect(ids("drills")).toEqual(["d"]);
    expect(ids("shows")).toEqual(["f"]);
    expect(ids("illustrates")).toEqual(["e"]);
    expect(groups.map((g) => g.label)).toEqual([
      "Required by",
      DRILLS_LABEL,
      DRILLS_SHOW_LABEL,
      "Illustrated by",
    ]);
    // Without the set, no drill earns the strong label.
    const bare = inboundGroupsFor([...inbound], []);
    expect(bare.find((g) => g.key === "drills")).toBeUndefined();
    expect(bare.find((g) => g.key === "shows")?.links.map((l) => l.id)).toEqual(["d", "f"]);
  });

  it.runIf(built)("puts both drill labels on the built concept pages, tracked", async () => {
    const atoms = await loadAtoms();
    const concepts = atoms.filter(
      (a) => a.frontmatter.type !== "exercise" && a.frontmatter.type !== "reference",
    );
    // 146 non-reference, non-exercise atoms on 2026-09-22.
    expect(concepts.length).toBeGreaterThanOrEqual(140);
    let read = 0;
    const withTrain: string[] = [];
    const withShow: string[] = [];
    for (const atom of concepts) {
      const file = path.join(APP, `${getAtomUrl(atom.frontmatter).slice(1)}.html`);
      if (!fs.existsSync(file)) continue;
      read += 1;
      const html = fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
      // The sidebar only: the related-concepts card below uses the same word
      // for its hints, and this counts groups, not hints.
      const start = html.indexOf('data-track="concept-sidebar"');
      if (start < 0) continue;
      const sidebar = html.slice(start, html.indexOf("</aside>", start));
      if (sidebar.includes(DRILLS_LABEL)) withTrain.push(atom.frontmatter.id);
      if (sidebar.includes(DRILLS_SHOW_LABEL)) withShow.push(atom.frontmatter.id);
    }
    expect(read).toBeGreaterThanOrEqual(140);
    // Until 2026-09-22 an inbound `illustrates` edge was dropped when the
    // concept declared `illustrates` back (the reciprocal rule), and 11 of
    // the 17 confirmed edges are reciprocated — the concept named its drill
    // as an example, so the drill was listed under "Example of" instead,
    // and "Drills that train this" rendered on 5 concept pages only
    // (commitment, ensemble, group-mind, heightening, offers; 6 edges),
    // "Drills that show this" on 29 (62 edges; four library pages carry it
    // too and are not counted here). Later that day the rule began keeping
    // the drill's line (entry 327, sidebar-relation-dedupe.test.ts), so the
    // strong label reaches 15 pages and the weak one gains the 9 one-way
    // concept→drill edges too. The floors were set one under the old
    // readings and stand; the readings may only rise from here.
    expect(withTrain.length, withTrain.join(", ")).toBeGreaterThanOrEqual(4);
    expect(withShow.length, withShow.join(", ")).toBeGreaterThanOrEqual(28);
    expect(withTrain.length).toBeLessThan(withShow.length);
  });

  it("gives the five most depended-on atoms a page that finally shows who depends on them", async () => {
    for (const id of ["commitment", "active-listening", "be-present", "be-brave", "ensemble"]) {
      const groups = inboundGroupsFor(await getInboundLinks(id), []);
      const total = groups.reduce((n, g) => n + g.links.length + g.omitted, 0);
      expect(total, id).toBeGreaterThanOrEqual(20);
    }
  });
});

describe("symmetric relations render once", () => {
  /**
   * `contrasts` is declared one way 70% of the time while its label is the
   * same in both directions (tracker entry 229, 2026-09-21). The Compare
   * group is the union of both directions and the inbound block skips it.
   */
  it("merges inbound contrasts into the Compare group and out of Referenced by", async () => {
    const { getInboundLinks, loadAtoms } = await import("../content");
    const { inboundGroupsFor, mergeSymmetricInbound } = await import("../../components/AtomDetail");
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const target = atoms.find((a) => a.frontmatter.id === "performing-cleverness")!;
    const inbound = await getInboundLinks(target.frontmatter.id);
    const outgoing = (target.frontmatter.links ?? []).map((l) => ({
      id: l.id,
      relation: l.relation,
      title: l.id,
      url: `/x/${l.id}`,
    }));
    const merged = mergeSymmetricInbound(outgoing, inbound);
    const compare = merged.filter((l) => l.relation === "contrasts");
    const declaredOut = outgoing.filter((l) => l.relation === "contrasts").length;
    // 22 atoms contrast performing-cleverness; it contrasts 4 back.
    expect(compare.length).toBeGreaterThan(declaredOut);
    expect(compare.length).toBeGreaterThanOrEqual(20);
    expect(new Set(compare.map((l) => l.id)).size).toBe(compare.length);
    const groups = inboundGroupsFor(inbound, outgoing).filter((g) => g.key === "contrasts");
    // The page filters this group out; the raw grouping still computes it.
    expect(groups.length).toBeLessThanOrEqual(1);

    // Since 2026-09-22 the page passes its own type, and on an antipattern
    // the five drills that contrast performing-cleverness leave the merged
    // Compare for "Drills that counter this", the first inbound group
    // (entry 286, counter-drills.test.ts). The union is unchanged; only the
    // word over the drills is.
    const typed = mergeSymmetricInbound(outgoing, inbound, "antipattern").filter(
      (l) => l.relation === "contrasts",
    );
    const drills = inbound.filter((l) => l.relation === "contrasts" && l.type === "exercise");
    expect(drills.length).toBeGreaterThanOrEqual(4);
    expect(typed.length).toBe(compare.length - drills.length);
    const split = inboundGroupsFor(inbound, outgoing, new Set(), "antipattern");
    expect(split[0].key).toBe("counters");
    expect(split[0].links.map((l) => l.id).sort()).toEqual(drills.map((l) => l.id).sort());
  });
});
