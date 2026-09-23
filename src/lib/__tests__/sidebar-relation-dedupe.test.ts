import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  counterPurposeNote,
  inboundGroupsFor,
  isDrillTarget,
  mergeSymmetricInbound,
  outboundGroupsFor,
  type OutgoingLink,
  pairedWith,
} from "../../components/AtomDetail";
import { ageNormalisedRank } from "../atom-rank";
import { getAtomUrl, getInboundLinks, loadAtoms } from "../content";
import { drillsCountering } from "../counter-drills";
import { principleFailures } from "../principle-failures";
import {
  COUNTERS_LABEL,
  DRILLS_LABEL,
  DRILLS_SHOW_LABEL,
  FAILURES_LABEL,
  PRINCIPLE_LABEL,
  RELATION_LABELS,
} from "../relation-labels";
import { buildTrainsIndex } from "../trains";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const DETAIL = path.join(ROOT, "src", "components", "AtomDetail.tsx");
const BE_BRAVE = path.join(APP, "how-it-works", "principles", "be-brave.html");
/**
 * A build directory is not a finished build, and a finished build is not
 * necessarily this source: the groups asserted below changed in AtomDetail
 * on 2026-09-22 with a build on disk from before it. The built checks wait
 * for a build at least as new as the component and skip cleanly until then.
 */
const built =
  fs.existsSync(BE_BRAVE) &&
  fs.existsSync(path.join(APP, "index.html")) &&
  fs.statSync(BE_BRAVE).mtimeMs >= fs.statSync(DETAIL).mtimeMs;

type Atom = Awaited<ReturnType<typeof loadAtoms>>[number];

/** The page's own edges, resolved as AtomDetail resolves them: title, url and the neighbour's type. */
function resolve(fm: Atom["frontmatter"], byId: Map<string, Atom["frontmatter"]>): OutgoingLink[] {
  return (fm.links ?? []).map((l) => {
    const target = byId.get(l.id);
    return {
      id: l.id,
      relation: l.relation,
      title: target?.title ?? l.id,
      url: target ? getAtomUrl({ id: l.id, type: target.type }) : `/how-it-works/${l.id}`,
      type: target?.type,
    };
  });
}

/**
 * Both blocks of one page's sidebar, computed with the page's own functions
 * and the inputs the page passes — types, the Trains index, the pairing and
 * the rank — so this reads the rule the page applies and not a copy.
 */
async function sidebarOf(fm: Atom["frontmatter"], atoms: readonly Atom[]) {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const resolved = resolve(fm, byId);
  const inbound = await getInboundLinks(fm.id);
  const { trainedBy } = buildTrainsIndex(atoms);
  const pairs = pairedWith(fm, principleFailures(atoms));
  const outbound = outboundGroupsFor(
    fm.type,
    mergeSymmetricInbound(resolved, inbound, fm.type),
    pairs,
  );
  const inboundGroups = inboundGroupsFor(
    inbound,
    resolved,
    new Set(trainedBy.get(fm.id) ?? []),
    fm.type,
    undefined,
    ageNormalisedRank(atoms),
  ).filter((g) => g.key !== "contrasts");
  const out = (key: string) => outbound.find((g) => g.key === key)?.links.map((l) => l.key) ?? [];
  const inb = (key: string) =>
    inboundGroups.find((g) => g.key === key)?.links.map((l) => l.id) ?? [];
  return { outbound, inboundGroups, out, inb };
}

/**
 * The sidebar keeps the stronger line when a neighbour is declared from both ends.
 *
 * `inboundGroupsFor` drops an inbound edge whose reciprocal relation the page
 * already declares outbound, so a mutual pair is one line. Until 2026-09-22
 * it kept the outbound line whichever label it wore, and on `illustrates`
 * the outbound label is the weak one: 23 concept pages declared `illustrates`
 * toward a drill (31 edges — 13 from principles, 9 from techniques, 6 from
 * definitions), each rendered "Example of: <drill>", the principle an example
 * of the drill; and where the drill declared the edge back, 22 times on 19
 * pages, the drill's own edge was dropped as already shown, so "Drills that
 * train this" — the label built for exactly that edge (entry 274) — never
 * rendered on the 7 principle pages whose drills' Trains lines name them.
 * *Be Brave* read "Example of 2: Initiation; First Line Drill" and had no
 * drills group (tracker entry 327).
 *
 * Two changes, both in AtomDetail. The reciprocal rule exempts a drill's
 * edge, so the 22 are drills again. And a concept's own `illustrates` toward
 * an exercise is read as the exercise's edge (`isDrillTarget`) and grouped
 * with the drills, so the 9 one-way edges are drills too and "Example of"
 * keeps the non-exercise targets. On 2026-09-22 that moved 11 Trains-backed
 * drills into "Drills that train this" and 20 into "Drills that show this",
 * and emptied "Example of" of every drill on every concept page.
 *
 * The second half is entry 328: the 24 `contrasts` edges that pair the 9
 * principles with the 10 failures (`principleFailures`, entry 155) were 24
 * of the 32 "Compare" items on the principle pages and 24 of the 104 on the
 * failure pages, under the same neutral word as the techniques and formats
 * they merely differ from. They are now "Failures this addresses" on the
 * principle's page — the hub's phrase, imported from relation-labels — and
 * "Principle it violates" on the failure's, where the group leads the block
 * above "Drills that counter this", so the diagnosis route reads failure →
 * principle → drill on one page. Every other `contrasts` edge keeps
 * "Compare": 8 on the principle pages, 80 on the failure pages.
 */
describe("sidebar relation dedupe", () => {
  it("reads a concept's own illustrates toward an exercise as the drill's edge", () => {
    expect(isDrillTarget("illustrates", "principle", "exercise")).toBe(true);
    expect(isDrillTarget("illustrates", undefined, "exercise")).toBe(true);
    // An exercise page keeps its own edges as declared: a drill is not a drill for a drill.
    expect(isDrillTarget("illustrates", "exercise", "exercise")).toBe(false);
    expect(isDrillTarget("illustrates", "principle", "reference")).toBe(false);
    expect(isDrillTarget("illustrates", "principle", undefined)).toBe(false);
    expect(isDrillTarget("extends", "principle", "exercise")).toBe(false);
  });

  it("puts the Trains-backed drills under the strong label on their concept pages, and no drill under Example of", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const { trains } = buildTrainsIndex(atoms);
    const edges = new Set(
      atoms.flatMap((a) =>
        (a.frontmatter.links ?? []).map((l) => `${a.frontmatter.id}>${l.relation}>${l.id}`),
      ),
    );
    // The population, derived from content: every concept→drill illustrates
    // edge, split by whether the drill declares it back and whether the
    // drill's Trains line names the concept.
    const mutual: [string, string][] = [];
    const oneWay: [string, string][] = [];
    const trainsBacked: [string, string][] = [];
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      if (fm.type === "exercise") continue;
      for (const l of fm.links ?? []) {
        if (l.relation !== "illustrates" || byId.get(l.id)?.type !== "exercise") continue;
        const back = edges.has(`${l.id}>illustrates>${fm.id}`);
        (back ? mutual : oneWay).push([fm.id, l.id]);
        if (back && (trains.get(l.id) ?? []).includes(fm.id)) trainsBacked.push([fm.id, l.id]);
      }
    }
    // 31 edges on 23 pages, 22 mutual on 19, 11 Trains-backed, 9 one-way, on
    // 2026-09-22. Floors a little under each; the eleven include be-brave →
    // first-line-drill, the entry's case.
    expect(mutual.length).toBeGreaterThanOrEqual(18);
    expect(new Set(mutual.map(([c]) => c)).size).toBeGreaterThanOrEqual(16);
    expect(trainsBacked.length).toBeGreaterThanOrEqual(8);
    expect(oneWay.length).toBeGreaterThanOrEqual(7);
    expect(trainsBacked).toContainEqual(["be-brave", "first-line-drill"]);

    const pages = new Set([...mutual, ...oneWay].map(([c]) => c));
    let strong = 0;
    let shown = 0;
    for (const id of pages) {
      const fm = byId.get(id)!;
      const { out, inb } = await sidebarOf(fm, atoms);
      const drills = inb("drills");
      const shows = inb("shows");
      const examples = out("illustrates");
      for (const [, drill] of trainsBacked.filter(([c]) => c === id)) {
        expect(drills, `${id}: ${drill} trains it`).toContain(drill);
        expect(shows, `${id}: ${drill} is not a mere show`).not.toContain(drill);
        strong += 1;
      }
      for (const [, drill] of [...mutual, ...oneWay].filter(([c]) => c === id)) {
        expect(examples, `${id}: ${drill} is a drill, not an example`).not.toContain(drill);
        expect([...drills, ...shows], `${id}: ${drill} is listed as a drill`).toContain(drill);
        // One line for the neighbour: in one drills group, not both.
        expect(drills.includes(drill) && shows.includes(drill), `${id}: ${drill} twice`).toBe(
          false,
        );
        if (!drills.includes(drill)) shown += 1;
      }
      // "Example of" keeps what the type system means by it: no exercise left in it.
      for (const target of examples) {
        expect(byId.get(target)?.type, `${id}: ${target}`).not.toBe("exercise");
      }
    }
    // 11 under the strong label and 20 under the weak, on 2026-09-22.
    expect(strong).toBe(trainsBacked.length);
    expect(shown).toBeGreaterThanOrEqual(18);
  });

  it("shows First Line Drill on Be Brave as a drill that trains it, once", async () => {
    const atoms = await loadAtoms();
    const fm = atoms.find((a) => a.frontmatter.id === "be-brave")!.frontmatter;
    const { outbound, inboundGroups, out, inb } = await sidebarOf(fm, atoms);
    expect(inb("drills")).toContain("first-line-drill");
    expect(inboundGroups.find((g) => g.key === "drills")?.label).toBe(DRILLS_LABEL);
    expect(out("illustrates")).not.toContain("first-line-drill");
    // The neighbour appears in exactly one group across both blocks.
    const everywhere = [
      ...outbound.flatMap((g) => g.links.map((l) => l.key)),
      ...inboundGroups.flatMap((g) => g.links.map((l) => l.id)),
    ].filter((id) => id === "first-line-drill");
    expect(everywhere).toEqual(["first-line-drill"]);
    // And the rest of "Example of" survives: initiation, the non-drill target.
    expect(out("illustrates")).toContain("initiation");
  });

  it("never lists a drill both as a drill and as an example, corpus-wide", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    let pagesWithDrills = 0;
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      if (fm.type === "exercise") continue;
      const { out, inb } = await sidebarOf(fm, atoms);
      const drills = new Set([...inb("drills"), ...inb("shows")]);
      if (drills.size > 0) pagesWithDrills += 1;
      for (const id of out("illustrates")) expect(drills.has(id), `${fm.id}: ${id}`).toBe(false);
    }
    // 46 concept pages list at least one drill on 2026-09-22 (the 9 one-way
    // edges add none: every page they sit on already had a drill's edge).
    expect(pagesWithDrills).toBeGreaterThanOrEqual(44);
  });

  it("does not drop a mutual extends or requires/enables pair's one line, nor show it twice", () => {
    // The reciprocal rule still holds where both labels are plain words: a
    // mutual `extends` pair is one line under "Extends", and an atom this
    // page unlocks that requires it back is one line under "Unlocks".
    const inbound = [
      { id: "c", title: "C", type: "technique", url: "/x/c", relation: "extends", inDegree: 0 },
      { id: "a", title: "A", type: "technique", url: "/x/a", relation: "requires", inDegree: 0 },
      // A drill declared from both ends: the drill's line wins.
      { id: "d", title: "D", type: "exercise", url: "/x/d", relation: "illustrates", inDegree: 0 },
    ] as const;
    const outgoing: OutgoingLink[] = [
      { id: "c", relation: "extends", title: "C", url: "/x/c", type: "technique" },
      { id: "a", relation: "enables", title: "A", url: "/x/a", type: "technique" },
      { id: "d", relation: "illustrates", title: "D", url: "/x/d", type: "exercise" },
      // One-way, toward a drill: a drill too, under the weak label.
      { id: "e", relation: "illustrates", title: "E", url: "/x/e", type: "exercise" },
      // One-way, toward a reference: an example.
      { id: "r", relation: "illustrates", title: "R", url: "/x/r", type: "reference" },
    ];
    const groups = inboundGroupsFor([...inbound], outgoing, new Set(["d"]), "principle");
    const ids = (key: string) => groups.find((g) => g.key === key)?.links.map((l) => l.id) ?? [];
    expect(ids("extends")).toEqual([]);
    expect(ids("requires")).toEqual([]);
    expect(ids("drills")).toEqual(["d"]);
    expect(ids("shows")).toEqual(["e"]);
    expect(ids("illustrates")).toEqual([]);
    expect(groups.map((g) => g.label)).toEqual([DRILLS_LABEL, DRILLS_SHOW_LABEL]);
    const out = outboundGroupsFor(
      "principle",
      mergeSymmetricInbound(outgoing, [...inbound], "principle"),
    );
    const outIds = (key: string) => out.find((g) => g.key === key)?.links.map((l) => l.key) ?? [];
    expect(outIds("extends")).toEqual(["c"]);
    expect(outIds("enables")).toEqual(["a"]);
    expect(outIds("illustrates")).toEqual(["r"]);
    // On an exercise page nothing moves: its own illustrates stay its own.
    const drillPage = outboundGroupsFor("exercise", outgoing);
    expect(drillPage.find((g) => g.key === "illustrates")?.links.map((l) => l.key)).toEqual([
      "d",
      "e",
      "r",
    ]);
  });

  it("renders every principle–failure pair under the pair labels on both pages, and Compare keeps the rest", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const failures = principleFailures(atoms);
    const pairs = [...failures].flatMap(([p, list]) => list.map((f) => [p, f.id] as const));
    // 24 pairs on 2026-09-22 (entry 155); floor a little under.
    expect(pairs.length).toBeGreaterThanOrEqual(20);

    // `pairedWith` is the map read from either side, and it agrees with the
    // types: a page's pairs are exactly its contrasts neighbours of the
    // other type, so the set and `isPairEdge` cannot disagree.
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      const set = pairedWith(fm, failures);
      if (fm.type !== "principle" && fm.type !== "antipattern") {
        expect(set.size, fm.id).toBe(0);
        continue;
      }
      const other = fm.type === "principle" ? "antipattern" : "principle";
      const inbound = await getInboundLinks(fm.id);
      const byType = new Set(
        [
          ...(fm.links ?? []).filter((l) => l.relation === "contrasts").map((l) => l.id),
          ...inbound.filter((l) => l.relation === "contrasts").map((l) => l.id),
        ].filter((id) => byId.get(id)?.type === other),
      );
      expect([...set].sort(), fm.id).toEqual([...byType].sort());
    }

    let onPrinciple = 0;
    let onFailure = 0;
    let compareOnPrinciples = 0;
    let compareOnFailures = 0;
    const seenPages = new Set<string>();
    for (const [principle, failure] of pairs) {
      const p = await sidebarOf(byId.get(principle)!, atoms);
      const f = await sidebarOf(byId.get(failure)!, atoms);
      expect(p.out("pair"), `${principle}: ${failure}`).toContain(failure);
      expect(p.out("contrasts"), `${principle}: ${failure} is not a comparison`).not.toContain(
        failure,
      );
      expect(p.outbound.find((g) => g.key === "pair")?.label).toBe(FAILURES_LABEL);
      expect(f.out("pair"), `${failure}: ${principle}`).toContain(principle);
      expect(f.out("contrasts"), `${failure}: ${principle} is not a comparison`).not.toContain(
        principle,
      );
      expect(f.outbound.find((g) => g.key === "pair")?.label).toBe(PRINCIPLE_LABEL);
      onPrinciple += 1;
      onFailure += 1;
      // The pair group precedes Counters and Compare in the outbound order,
      // and holds only the other type.
      for (const side of [p, f]) {
        const keys = side.outbound.map((g) => g.key);
        for (const after of ["counters", "contrasts"]) {
          if (keys.includes(after)) expect(keys.indexOf("pair")).toBeLessThan(keys.indexOf(after));
        }
      }
      for (const id of p.out("pair")) expect(byId.get(id)?.type).toBe("antipattern");
      for (const id of f.out("pair")) expect(byId.get(id)?.type).toBe("principle");
      if (!seenPages.has(principle)) {
        seenPages.add(principle);
        compareOnPrinciples += p.out("contrasts").length;
        for (const id of p.out("contrasts")) expect(byId.get(id)?.type).not.toBe("antipattern");
      }
      if (!seenPages.has(failure)) {
        seenPages.add(failure);
        compareOnFailures += f.out("contrasts").length;
        for (const id of f.out("contrasts")) {
          expect(byId.get(id)?.type, `${failure}: ${id}`).not.toBe("principle");
          expect(byId.get(id)?.type, `${failure}: ${id}`).not.toBe("exercise");
        }
      }
    }
    // The split on 2026-09-22: 24 paired against 8 "Compare" on the 9
    // principle pages, 24 against 80 on the 10 failure pages (the failure
    // pages' 104 less the 24; the drills are the counters group). Ceilings
    // on the remainder guard the split from silently widening.
    expect(onPrinciple).toBe(pairs.length);
    expect(onFailure).toBe(pairs.length);
    expect(compareOnPrinciples).toBeGreaterThanOrEqual(6);
    expect(compareOnPrinciples).toBeLessThanOrEqual(12);
    expect(compareOnFailures).toBeGreaterThanOrEqual(70);
    expect(compareOnFailures).toBeLessThanOrEqual(90);
    expect(seenPages.size).toBeGreaterThanOrEqual(18);

    // Without the set nothing splits, and on any other type the same edges
    // are one Compare group: the pairing is the page's to pass.
    const hesitation = byId.get("hesitation")!;
    const resolved = resolve(hesitation, byId);
    const inbound = await getInboundLinks("hesitation");
    const merged = mergeSymmetricInbound(resolved, inbound, "antipattern");
    expect(outboundGroupsFor("antipattern", merged).find((g) => g.key === "pair")).toBeUndefined();
    const asTechnique = outboundGroupsFor("technique", merged, pairedWith(hesitation, failures));
    expect(asTechnique.find((g) => g.key === "pair")).toBeUndefined();
    expect(asTechnique.find((g) => g.key === "contrasts")?.label).toBe(
      RELATION_LABELS.contrasts.outbound,
    );
  });

  it("joins the failure's three legs in one sentence under the counter line", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const failures = principleFailures(atoms);
    const { trains } = buildTrainsIndex(atoms);
    const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
    expect(antipatterns.length).toBeGreaterThanOrEqual(8);
    let withNote = 0;
    for (const a of antipatterns) {
      const fm = a.frontmatter;
      const note = counterPurposeNote(fm.id, atoms);
      const lead = drillsCountering(fm.id, atoms)[0];
      if (!note) {
        // No note only where the line's first drill is not written for the
        // pair, or its line names the failure and no principle.
        const named = trains.get(lead?.id ?? "") ?? [];
        const pairs = pairedWith(fm, failures);
        expect(
          lead === undefined || lead.purpose !== "pair" || !named.some((id) => pairs.has(id)),
          fm.id,
        ).toBe(true);
        continue;
      }
      withNote += 1;
      // The drill is the one the counter line opens with, its purpose is
      // the pair, and the principle is one the group above names.
      expect(note.drill).toBe(lead.id);
      expect(lead.purpose).toBe("pair");
      expect(pairedWith(fm, failures).has(note.principle), `${fm.id}: ${note.principle}`).toBe(
        true,
      );
      expect(trains.get(note.drill), `${fm.id}: ${note.drill} names ${note.principle}`).toContain(
        note.principle,
      );
      expect(note.text).toBe(`${lead.title} trains ${byId.get(note.principle)!.title}`);
    }
    // Hesitation's line opens with Zip Zap Zop, whose line names Be Present
    // (entry 322), so the sentence the entry asks for is on the page.
    const hesitation = counterPurposeNote("hesitation", atoms);
    expect(hesitation).not.toBeNull();
    expect(hesitation!.principle).toBe("be-present");
    expect(hesitation!.text).toBe("Zip Zap Zop trains Be Present");
    // 6 of the 10 failures carry a note on 2026-09-22: bulldozing (Blind
    // Offer trains Be Supportive), hesitation and internal-computation (Zip
    // Zap Zop, Be Present), judgment (Gift Giving, Be Thankful), negation
    // (Yes, And Chain, Be Positive), performing-cleverness (Emotional
    // Honesty Scene, Be Honest); blocking, overcomplication, steering and
    // wimping open on a drill whose line names neither the failure nor its
    // principles. Floor one under.
    expect(withNote).toBeGreaterThanOrEqual(5);
    expect(counterPurposeNote("not-an-atom", atoms)).toBeNull();
    expect(counterPurposeNote("be-brave", atoms)).toBeNull();
  });

  /** The sidebar of a built page, script tags out. */
  function sidebarHtml(file: string): string {
    expect(fs.existsSync(file), file).toBe(true);
    const html = fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const start = html.indexOf('data-track="concept-sidebar"');
    expect(start).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</aside>", start));
  }

  it.runIf(built)(
    "files First Line Drill under Drills that train this on the built Be Brave page",
    () => {
      const sidebar = sidebarHtml(BE_BRAVE);
      const drills = sidebar.indexOf(DRILLS_LABEL);
      expect(drills).toBeGreaterThan(-1);
      // The label's group holds the drill's link; "Example of" does not.
      const href = 'href="/practice/exercises/first-line-drill"';
      expect(sidebar).toContain(href);
      const examples = sidebar.indexOf(RELATION_LABELS.illustrates.outbound);
      const groupEnd = (at: number) => {
        const next = sidebar.indexOf("</details>", at);
        return next === -1 ? sidebar.length : next;
      };
      expect(sidebar.slice(drills, groupEnd(drills))).toContain(href);
      if (examples > -1) expect(sidebar.slice(examples, groupEnd(examples))).not.toContain(href);
      expect(sidebar.split(href).length - 1).toBe(1);
      // And the pair group with the hub's phrase.
      expect(sidebar).toContain(FAILURES_LABEL);
      expect(sidebar).toContain('href="/how-it-works/diagnosis/hesitation"');
    },
  );

  it.runIf(built)(
    "opens the built Hesitation page's block with the principle, then the counters, then the sentence",
    () => {
      const sidebar = sidebarHtml(path.join(APP, "how-it-works", "diagnosis", "hesitation.html"));
      const principle = sidebar.indexOf(PRINCIPLE_LABEL);
      const counters = sidebar.indexOf(COUNTERS_LABEL);
      expect(principle).toBeGreaterThan(-1);
      expect(counters).toBeGreaterThan(principle);
      expect(sidebar.slice(principle, counters)).toContain(
        'href="/how-it-works/principles/be-brave"',
      );
      expect(sidebar).toContain("Zip Zap Zop trains Be Present");
      expect(sidebar.indexOf("Zip Zap Zop trains Be Present")).toBeGreaterThan(counters);
    },
  );
});
