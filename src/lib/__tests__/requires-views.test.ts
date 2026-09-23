import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { inboundGroupsFor, requiredByFoldSummary } from "../../components/AtomDetail";
import { getAtomUrl, getInboundLinks, loadAtoms } from "../content";
import {
  coreItemLabel,
  requiredByReport,
  requiredByView,
  requiresGraph,
  requiresView,
} from "../direct-requires";
import { getEpisodeNotes } from "../episode-notes";
import {
  CORE_LABEL,
  directRequiresOf,
  flagDirectRequires,
  type GraphLink,
  pickMiniGraphSatellites,
} from "../mini-graph-picks";
import { RELATION_LABELS } from "../relation-labels";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));
const INDEX = path.join(ROOT, "public", "search-index.json");

const src = (rel: string) => fs.readFileSync(path.join(ROOT, "src", rel), "utf-8");

/**
 * One relation, one rule, at both ends and on every surface.
 *
 * Entry 277 (2026-09-22) reduced the `requires` relation for the concept
 * page's "Builds on" group, the paths' leans-on and forward-needs and the
 * journey's prerequisite map, and left five surfaces reading the closure:
 * the page's own "Required by", the search graph's satellites, the episode
 * notes' "Builds on:" line, the JSON-LD `mentions` and the lesson drill walk
 * (entry 302). So `commitment` said "Required by 70" while nine pages opened
 * it under "Builds on"; across the 71 required atoms the declared inbound
 * was 618 and the direct inbound 248, 41 targets overstated, 5 were required
 * by nothing directly (entry 301); the search graph drew 198 `requires`
 * satellites of which 62 were prerequisites the atom's own page had folded;
 * and the feed said "Builds on: Active Listening, Be Positive, Trust,
 * Commitment, Irreversibility" for `yes-and` while the page said "Active
 * Listening and the core".
 *
 * `requiresView` and `requiredByView` in direct-requires.ts are now the one
 * accessor, and every reader-facing surface takes the direct view: the
 * inbound group opens the direct holders and folds the rest under a
 * summary that says both numbers; the search picker draws no implied
 * `requires` satellite; the notes line names the direct list. `mentions`
 * keeps the closure and says why. These guards hold the population, the
 * reading on the day, the agreement of the two ends edge for edge, each
 * surface's behaviour over the whole corpus, and the source-level fact that
 * the surfaces import the accessor — so a ninth surface cannot read
 * `frontmatter.links` for `requires` without choosing a view.
 */
describe("requires views", () => {
  it("holds the corpus reading: 618 declared inbound, 248 direct, over 71 targets", async () => {
    const atoms = await loadAtoms();
    // The population, so a loader that stops reading `requires` fails here.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const report = requiredByReport(graph);

    // Read 2026-09-22 (entry 301): targets 71, declared inbound 618, direct
    // inbound 248, 41 targets overstating, 5 required by nothing directly.
    // Bands rather than exact counts, since the corpus grows; the ratio
    // between the two inbound counts is the finding, and a reduction that
    // kept everything or dropped everything would leave the band.
    expect(report.targets).toBeGreaterThanOrEqual(65);
    expect(report.declaredInbound).toBeGreaterThanOrEqual(600);
    expect(report.directInbound).toBeGreaterThanOrEqual(230);
    expect(report.directInbound).toBeLessThanOrEqual(270);
    expect(report.directInbound / report.declaredInbound).toBeGreaterThanOrEqual(0.35);
    expect(report.directInbound / report.declaredInbound).toBeLessThanOrEqual(0.45);
    expect(report.overstating).toBeGreaterThanOrEqual(35);
    // 5 on entry 301's reading; 10 since 2026-09-22, when the core item
    // moved to the member the graph requires most (entry 315): be-positive,
    // be-supportive, be-thankful, emotional-truth and shared-reality-fragility
    // had opened only as the face of the core on pages that declared them
    // first, and now open nowhere. The band moved with the rule, not to pass.
    expect(report.zeroDirect).toBeGreaterThanOrEqual(3);
    expect(report.zeroDirect).toBeLessThanOrEqual(12);

    // The entry's worked examples: commitment 70 / 9, be-brave 30 / 2,
    // trust 14 / 1, meaning-is-relational 11 / 0. Commitment is 70 / 23
    // since entry 315: the most-required member is the face of the core on
    // 18 pages, so the direct holders it gained are pages that open it as
    // "Commitment and the core"; opened on its own it is still 5.
    const counts = (id: string) => {
      const { open, folded } = requiredByView(graph, id, "direct");
      return {
        declared: open.length + folded.length,
        direct: open.length,
        alone: open.filter((h) => !h.viaCore).length,
      };
    };
    expect(counts("commitment").declared).toBeGreaterThanOrEqual(60);
    expect(counts("commitment").direct).toBeLessThanOrEqual(26);
    expect(counts("commitment").alone).toBeLessThanOrEqual(12);
    expect(counts("commitment").alone).toBeGreaterThan(0);
    expect(counts("be-brave").direct).toBeLessThanOrEqual(4);
    expect(counts("trust").direct).toBeLessThanOrEqual(3);
    expect(counts("meaning-is-relational").direct).toBe(0);
    expect(counts("meaning-is-relational").declared).toBeGreaterThanOrEqual(8);

    // The declared view is the closure: nothing folded, everything open.
    for (const id of ["commitment", "be-brave", "yes-and"]) {
      const declared = requiredByView(graph, id, "declared");
      expect(declared.folded).toEqual([]);
      expect(declared.open.length).toBe(counts(id).declared);
      expect(requiresView(graph, id, "declared").folded).toEqual([]);
    }
  });

  it("agrees at both ends: every direct edge open on both pages, every implied edge folded on both", async () => {
    const atoms = await loadAtoms();
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    let directEdges = 0;
    let impliedEdges = 0;
    let coreEdges = 0;
    for (const atom of atoms) {
      const id = atom.frontmatter.id;
      const { open, folded, cores } = requiresView(graph, id, "direct");
      for (const target of open) {
        directEdges += 1;
        const holders = requiredByView(graph, target, "direct");
        const holder = holders.open.find((h) => h.id === id);
        expect(holder, `${id} opens ${target}; ${target} must open ${id}`).toBeDefined();
        expect(holders.folded.map((h) => h.id)).not.toContain(id);
        // The knot flag is the same fact seen from the other end.
        expect(holder!.viaCore, `${id} → ${target} viaCore`).toBe(cores.has(target));
      }
      for (const target of folded) {
        impliedEdges += 1;
        const holders = requiredByView(graph, target, "direct");
        const holder = holders.folded.find((h) => h.id === id);
        expect(holder, `${id} folds ${target}; ${target} must fold ${id}`).toBeDefined();
        expect(holders.open.map((h) => h.id)).not.toContain(id);
        if (holder!.viaCore) coreEdges += 1;
      }
      // A partition of the declared list at this end too.
      const declared = requiresView(graph, id, "declared").open;
      expect([...open, ...folded].sort()).toEqual([...declared].sort());
    }
    // Guard the guard: the walk covered the graph. 248 direct and 370
    // implied edges on 2026-09-22; 107 of the implied are collapsed into a
    // core item (viaCore) and 263 implied by a chain; the sums equal the
    // report's.
    expect(directEdges).toBeGreaterThanOrEqual(230);
    expect(impliedEdges).toBeGreaterThanOrEqual(340);
    expect(coreEdges).toBeGreaterThanOrEqual(90);
    expect(coreEdges).toBeLessThan(impliedEdges);
    const report = requiredByReport(graph);
    expect(directEdges).toBe(report.directInbound);
    expect(directEdges + impliedEdges).toBe(report.declaredInbound);
  });

  it("draws no implied requires satellite in the search graph, over every atom", async () => {
    const atoms = await loadAtoms();
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    let graphs = 0;
    let requiresDrawn = 0;
    let impliedDrawn = 0;
    let cores = 0;
    let impliedCounted = 0;
    for (const atom of atoms) {
      const links: GraphLink[] = atom.frontmatter.links ?? [];
      if (links.length === 0) continue;
      graphs += 1;
      const flagged = flagDirectRequires(links, graph, atom.frontmatter.id);
      const direct = directRequiresOf(flagged);
      const { folded } = requiresView(graph, atom.frontmatter.id, "direct");
      // Every requires link carries the flag, and the flag agrees with the view.
      for (const l of flagged) {
        if (l.relation === "requires") {
          expect(l.direct, `${atom.frontmatter.id} → ${l.id} flagged`).toBeDefined();
          expect(l.direct, `${atom.frontmatter.id} → ${l.id}`).toBe(!folded.includes(l.id));
        } else expect(l.direct).toBeUndefined();
      }
      const pick = pickMiniGraphSatellites(flagged, direct);
      for (const s of pick.satellites) {
        if (s.label === CORE_LABEL) {
          cores += 1;
          continue;
        }
        if (s.relation !== "requires") continue;
        requiresDrawn += 1;
        if (folded.includes(s.id)) impliedDrawn += 1;
      }
      // The implied links still count: nothing declared goes unmentioned.
      const stood = new Set(pick.satellites.flatMap((s) => s.members));
      impliedCounted += folded.filter((id) => !stood.has(id)).length;
      expect(pick.more).toBeGreaterThanOrEqual(folded.filter((id) => !stood.has(id)).length);
    }
    // Read 2026-09-22 over the full frontmatter, before → after: `requires`
    // satellites 198 → 162, implied among them 62 → 0, core nodes 130 → 130,
    // 51 graphs changed, 2 drew one fewer. Over the built index's eight-link
    // input, 191 → 147, 56 → 0, cores 134, 43 changed, 14 drew one fewer.
    expect(graphs).toBeGreaterThanOrEqual(200);
    expect(requiresDrawn).toBeGreaterThanOrEqual(140);
    expect(impliedDrawn).toBe(0);
    expect(cores).toBeGreaterThanOrEqual(120);
    // 136 implied links no node stands for on 2026-09-22; the other 234
    // sit inside a core node's members, which is where the page puts them.
    expect(impliedCounted).toBeGreaterThanOrEqual(120);
  });

  it("ships the flag in the built search index, on every requires link", () => {
    // The prebuild writes the index; the picker reads the flag from it in
    // the browser, where there is no graph to reduce against. The index in
    // `public/` is committed, so this runs unbuilt.
    expect(fs.existsSync(INDEX)).toBe(true);
    const index = JSON.parse(fs.readFileSync(INDEX, "utf-8")) as {
      storedFields: Record<string, { layer?: string; links?: string }>;
    };
    let atomsWithLinks = 0;
    let requiresLinks = 0;
    let flagged = 0;
    let direct = 0;
    for (const doc of Object.values(index.storedFields)) {
      if (doc.layer !== "atom" || !doc.links) continue;
      const links = JSON.parse(doc.links) as GraphLink[];
      if (links.length === 0) continue;
      atomsWithLinks += 1;
      for (const l of links) {
        if (l.relation !== "requires") {
          expect(l.direct).toBeUndefined();
          continue;
        }
        requiresLinks += 1;
        if (l.direct !== undefined) flagged += 1;
        if (l.direct) direct += 1;
      }
    }
    // 472 `requires` links in the eight-link index on 2026-09-22, 197 of
    // them direct; the index grew 434,055 → 441,882 bytes for the flags.
    expect(atomsWithLinks).toBeGreaterThanOrEqual(200);
    expect(requiresLinks).toBeGreaterThanOrEqual(400);
    expect(flagged).toBe(requiresLinks);
    expect(direct).toBeGreaterThanOrEqual(150);
    expect(direct).toBeLessThan(requiresLinks);
  });

  it("names the direct list on the episode notes' Builds on line, folded counted", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const label = RELATION_LABELS.requires.outbound;

    // `yes-and` (entry 302's audible case): five declared, one direct — the
    // knot member standing for the core — and four folded. The member was
    // active-listening, the first named, until 2026-09-22; it is commitment
    // since entry 315, the one the graph requires most of the four it names.
    const yesAnd = byId.get("yes-and")!;
    const view = requiresView(graph, "yes-and", "direct");
    expect(view.open).toEqual(["commitment"]);
    expect(view.folded.length).toBe(4);
    expect(view.cores.has("commitment")).toBe(true);
    const notes = (await getEpisodeNotes(getAtomUrl(yesAnd)))!;
    const line = notes.lines.find((l) => l.label === label)!;
    expect(line).toBeDefined();
    expect(line.names.map((n) => n.title)).toEqual([coreItemLabel(byId.get("commitment")!.title)]);
    expect(line.more).toBe(4);
    expect(line.names[0].url.endsWith(getAtomUrl(byId.get("commitment")!))).toBe(true);

    // Every concept's line equals its direct list, corpus-wide: the names
    // are the open targets in order (a core item labelled), and "+N more"
    // is the folded count plus whatever the cap cut.
    let lines = 0;
    let folded = 0;
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      const { open, folded: foldedIds, cores } = requiresView(graph, fm.id, "direct");
      const expected = open
        .filter((id) => byId.get(id)?.type !== "reference")
        .map((id) => {
          const title = byId.get(id)!.title;
          return cores.has(id) ? coreItemLabel(title) : title;
        });
      const foldedCount = foldedIds.filter((id) => byId.get(id)?.type !== "reference").length;
      const n = await getEpisodeNotes(getAtomUrl(fm));
      const l = n?.lines.find((x) => x.label === label);
      if (expected.length === 0 && foldedCount === 0) {
        expect(l, `${fm.id} has no Builds on line`).toBeUndefined();
        continue;
      }
      lines += 1;
      expect(l, fm.id).toBeDefined();
      expect(
        l!.names.map((x) => x.title),
        fm.id,
      ).toEqual(expected.slice(0, l!.names.length));
      expect(l!.more, fm.id).toBe(Math.max(0, expected.length - l!.names.length) + foldedCount);
      folded += foldedCount;
    }
    // 159 lines on 2026-09-22, 371 folded prerequisites counted on them;
    // the line's names fell from 2,315 to 1,995 across all lines.
    expect(lines).toBeGreaterThanOrEqual(150);
    expect(folded).toBeGreaterThanOrEqual(340);
  });

  it("has every reader-facing surface import the accessor, and mentions state its choice", () => {
    // The surfaces that render `requires`, and the accessor each must name.
    const accessor = /\b(requiresView|requiredByView)\b/;
    const fromModule = /from "(\.\/|@\/lib\/|\.\.\/lib\/)direct-requires"/;
    for (const file of [
      "lib/episode-notes.ts",
      "lib/mini-graph-picks.ts",
      "components/AtomDetail.tsx",
    ]) {
      const text = src(file);
      expect(text, `${file} imports direct-requires`).toMatch(fromModule);
      expect(text, `${file} names a view`).toMatch(accessor);
      expect(text, `${file} says which view`).toMatch(/"direct"/);
    }
    // The flag has one writer and one reader, in the same module.
    expect(src("lib/mini-graph-picks.ts")).toMatch(/export function flagDirectRequires/);
    expect(src("lib/mini-graph-picks.ts")).toMatch(/export function directRequiresOf/);
    expect(src("components/MiniGraph.tsx")).toMatch(/directRequiresOf\(links\)/);
    expect(fs.readFileSync(path.join(ROOT, "scripts", "build-search-index.mjs"), "utf-8")).toMatch(
      /flagDirectRequires\(/,
    );

    // `mentions` keeps the closure on purpose: no accessor, and the comment
    // that says so — the choice is recorded where it is made.
    const jsonld = src("lib/jsonld-edges.ts");
    expect(jsonld).not.toMatch(fromModule);
    expect(jsonld).toMatch(/`mentions` keeps the declared closure of `requires` by choice/);
    expect(jsonld).toMatch(/entries 277, 301 and 302/);

    // The inbound summary's copy, spelled once, from the relation's own label.
    expect(requiredByFoldSummary(9, 61, 0)).toBe(
      `${RELATION_LABELS.requires.inbound} 9 directly, 61 through the core`,
    );
  });

  /**
   * The built page (entry 301's testable check): `commitment` no longer
   * says "Required by 70". The group opens its direct holders and the fold
   * under it gives both numbers, which sum to the declared count; and on
   * the other end, a page the fold names shows commitment inside its own
   * "Builds on" fold, not in its open list.
   */
  it.runIf(built)("shows the two-number summary on the built commitment page", async () => {
    const atoms = await loadAtoms();
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const view = requiredByView(graph, "commitment", "direct");
    // The group as the page builds it: the reciprocal rule drops a holder
    // commitment itself "unlocks" (one of the nine on 2026-09-22, so the
    // page opens eight), and the fold holds what is left of the closure.
    const commitment = atoms.find((a) => a.frontmatter.id === "commitment")!.frontmatter;
    const group = inboundGroupsFor(
      await getInboundLinks("commitment"),
      commitment.links ?? [],
      new Set(),
      commitment.type,
      view,
    ).find((g) => g.key === "requires")!;
    expect(group.links.length + group.omitted).toBeLessThanOrEqual(view.open.length);
    expect(group.folded.length).toBeLessThanOrEqual(view.folded.length);
    // 61 folded on entry 301's reading, 47 since entry 315 (44 once the
    // reciprocal rule has dropped the holders commitment itself unlocks):
    // the 14 holders that folded commitment into another member's core item
    // now open it as the core's face, so nothing folds it "through the
    // core" any more.
    expect(group.folded.length).toBeGreaterThanOrEqual(42);

    const file = path.join(APP, "practice", "techniques", "commitment.html");
    const html = fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const aside = html.split('data-track="concept-sidebar"')[1]?.split("</aside>")[0] ?? "";
    expect(aside.length).toBeGreaterThan(0);
    const summaries = [...aside.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, "").trim(),
    );
    const summary = summaries.find((s) => /^Required by \d+ directly, /.test(s));
    expect(summary, summaries.join(" | ")).toBeDefined();
    const numbers = [...summary!.matchAll(/\d+/g)].map((m) => Number(m[0]));
    expect(numbers[0]).toBe(group.links.length + group.omitted);
    expect(numbers.slice(1).reduce((a, b) => a + b, 0)).toBe(group.folded.length);
    // Commitment, the most-required member, is never folded through the
    // core since entry 315 (it is the face wherever it is named), so its
    // summary has one part; core-links.test.ts reads "through the core" on
    // be-present, and its link to the core's page.
    expect(summary).not.toContain("through the core");
    expect(summary).toContain("through their prerequisites");
    // The closure count appears only as the sum, never as the group's own.
    expect(aside).not.toMatch(/Required by 70\b/);
    // Every folded holder is still a link on the page.
    for (const holder of group.folded) {
      const fm = atoms.find((a) => a.frontmatter.id === holder.id)!.frontmatter;
      expect(aside, `${holder.id} linked`).toContain(`href="${getAtomUrl(fm)}"`);
    }

    // The other end: every holder the fold names shows commitment inside
    // its own "Builds on" fold, not in its open list — the edge is folded
    // on both pages. (Entry 301 named reality-construction as the worked
    // example; it declares no `requires` toward commitment in this corpus,
    // so the check walks the fold instead of trusting one name.)
    let checked = 0;
    for (const holder of group.folded) {
      const fm = atoms.find((a) => a.frontmatter.id === holder.id)!.frontmatter;
      const page = path.join(APP, `${getAtomUrl(fm).slice(1)}.html`);
      if (!fs.existsSync(page)) continue;
      const other = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
      const otherAside = other.split('data-track="concept-sidebar"')[1]?.split("</aside>")[0] ?? "";
      const at = otherAside.indexOf(">Builds on<");
      expect(at, `${holder.id} has a Builds on group`).toBeGreaterThan(-1);
      const end = otherAside.indexOf("<dt", at + 1);
      const dd = otherAside.slice(at, end === -1 ? undefined : end);
      const openPart = dd.replace(/<details[\s\S]*?<\/details>/g, "");
      expect(openPart, `${holder.id} opens commitment`).not.toContain(
        'href="/practice/techniques/commitment"',
      );
      expect(dd, `${holder.id} folds commitment`).toContain(
        'href="/practice/techniques/commitment"',
      );
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(42);
  });
});
