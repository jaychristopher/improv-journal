import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  INBOUND_GROUP_LIMIT,
  inboundGroupsFor,
  mergeSymmetricInbound,
  outboundGroupsFor,
  pairedWith,
} from "../../components/AtomDetail";
import { SIDEBAR_VISIBLE } from "../../components/SidebarLinkGroup";
import { getAtomUrl, getInboundLinks, loadAtoms } from "../content";
import { requiredByView, requiresGraph } from "../direct-requires";
import { principleFailures } from "../principle-failures";
import {
  chooseOpenGroups,
  foldSummary,
  inboundKey,
  openCost,
  outboundKey,
  SIDEBAR_OPEN_BUDGET,
  sidebarBudgetGroups,
} from "../sidebar-budget";
import { buildTrainsIndex } from "../trains";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

interface Row {
  id: string;
  type: string;
  /** Every link the two blocks hold, open or folded, after the reciprocal dedupe. */
  slots: number;
  /**
   * Slots in an open group: all of an outbound group, the capped dozen of an
   * inbound one. The holders "Required by" folds as implied (entry 301) are
   * slots but never open — they sit a fold below the group's own.
   */
  open: number;
  /** Links the open groups put outside any fold, which is what `sidebar-load` counts. */
  visible: number;
}

/**
 * The connections and inbound blocks as AtomDetail computes them, with the
 * same functions, so this reads the rule the page applies and not a copy.
 *
 * Until 2026-09-22 (entry 327) the reconstruction passed no page type, no
 * neighbour types and no Trains index, so it counted a neighbour declared
 * from both ends twice once the drill's edge stopped being dropped for the
 * page's reciprocal — the same drill as "Example of" and as a drill. It now
 * passes what the page passes: the types, the pairing (entry 328) and the
 * Trains index, and reads the outbound sizes off `outboundGroupsFor`, so the
 * counters and pair groups are the groups the page ranks.
 */
async function sidebarRows(): Promise<Row[]> {
  const atoms = await loadAtoms();
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const graph = requiresGraph(atoms.map((a) => a.frontmatter));
  const failures = principleFailures(atoms);
  const { trainedBy } = buildTrainsIndex(atoms);
  const rows: Row[] = [];
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    const resolved = (fm.links ?? []).map((l) => {
      const target = byId.get(l.id);
      return {
        id: l.id,
        relation: l.relation,
        title: target?.title ?? l.id,
        url: target ? getAtomUrl({ id: l.id, type: target.type }) : `/how-it-works/${l.id}`,
        type: target?.type,
      };
    });
    const inbound = await getInboundLinks(fm.id);
    const connections = mergeSymmetricInbound(resolved, inbound, fm.type);
    const outbound = outboundGroupsFor(fm.type, connections, pairedWith(fm, failures)).map((g) => ({
      relation: g.key,
      size: g.links.length,
    }));
    // The direct view of the inbound `requires` edges, as the page passes it
    // (entry 301): "Required by" ranks on the holders it opens.
    const inboundGroups = inboundGroupsFor(
      inbound,
      resolved,
      new Set(trainedBy.get(fm.id) ?? []),
      fm.type,
      requiredByView(graph, fm.id, "direct"),
    ).filter((g) => g.key !== "contrasts");
    const open = chooseOpenGroups(sidebarBudgetGroups(outbound, inboundGroups));

    const row: Row = { id: fm.id, type: fm.type, slots: 0, open: 0, visible: 0 };
    for (const g of outbound) {
      row.slots += g.size;
      if (open.has(outboundKey(g.relation))) {
        row.open += g.size;
        row.visible += openCost(g.size);
      }
    }
    for (const g of inboundGroups) {
      const size = g.links.length + g.omitted;
      row.slots += size + g.folded.length;
      if (open.has(inboundKey(g.key))) {
        row.open += Math.min(INBOUND_GROUP_LIMIT, size);
        row.visible += openCost(size);
      }
    }
    rows.push(row);
  }
  return rows;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/** Links outside every fold, folds nested as `sidebar-load` strips them. */
function stripFolds(s: string): string {
  let prev: string;
  do {
    prev = s;
    s = s.replace(/<details[^>]*>(?:(?!<details)[\s\S])*?<\/details>/g, "");
  } while (s !== prev);
  return s;
}

/**
 * What a reader sees of the graph without a click.
 *
 * Until 2026-09-22 the column opened its first three outbound groups in
 * relation order and its first inbound group, twelve links each, and that
 * budget opened 60% of the sidebar's slots overall, 83% of the outbound and
 * 33% of the inbound, and least where the graph is densest: the antipatterns
 * opened a median 44%, the principles 50%, `active-listening` 18 of 96,
 * `commitment` 25 of 105, and 40 atoms opened under half, while the
 * references and formats opened 97 to 100% because they have one or two
 * groups (tracker entry 272). The rich club was the least visible place on
 * the site for the one audience that does not read folded links.
 *
 * The groups now open by size, pooled across both blocks, inside the same
 * per-column budget, and these are the readings on the day of the change.
 * Every floor sits just under the measured number and may only rise; a
 * change that opened less would fail here and not on a reader.
 *
 * Later the same day (entry 301) the "Required by" group began ranking on
 * the holders it opens — the atoms whose own "Builds on" opens the page —
 * and folding the rest, so the rich-club pages stop leading with a closure
 * count. The floors below that moved, moved for that reason and are marked:
 * the folded holders are still on the page and still links, one fold
 * deeper, and this file counts them as slots that are not open.
 */
describe("sidebar open share", () => {
  it("opens the largest groups first and stops at the budget", () => {
    const groups = [
      { key: "out:requires", size: 3 },
      { key: "out:enables", size: 2 },
      { key: "in:requires", size: 26 },
      { key: "in:drills", size: 7 },
      { key: "in:illustrates", size: 4 },
      { key: "in:enables", size: 1 },
    ];
    // 5 + 5 + 4 + 3 + 2 + 1 = 20: a leaf shows everything.
    expect([...chooseOpenGroups(groups)].sort()).toEqual(groups.map((g) => g.key).sort());
    // Six groups of six cost five each: four open on a budget of 20, and the
    // stop is at the first breach, not a skip to a smaller group behind it.
    const sixes = ["a", "b", "c", "d", "e", "f"].map((key) => ({ key, size: 6 }));
    expect([...chooseOpenGroups([...sixes, { key: "one", size: 1 }])]).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    // Ties keep the caller's order, so a tied outbound group beats an inbound one.
    expect([
      ...chooseOpenGroups(
        [
          { key: "in:x", size: 9 },
          { key: "out:y", size: 9 },
        ],
        5,
      ),
    ]).toEqual(["in:x"]);
    // The budget is the old rule's worst case: four groups at the fold cap.
    expect(SIDEBAR_OPEN_BUDGET).toBe(4 * SIDEBAR_VISIBLE);
  });

  it("writes a closed group's summary as its count and first three names", () => {
    expect(foldSummary("Required by", 26, ["Yes, And", "Commitment", "Offers", "Status"])).toBe(
      "Required by 26: Yes, And; Commitment; Offers …",
    );
    // Three or fewer: every name, no ellipsis.
    expect(foldSummary("Compare", 2, ["Blocking", "Bulldozing"])).toBe(
      "Compare 2: Blocking; Bulldozing",
    );
    // A capped inbound group states the whole count and names from the kept dozen.
    expect(foldSummary("Required by", 70, ["A", "B", "C"])).toBe("Required by 70: A; B; C …");
  });

  it("shows most of the graph without a click, and most of it where the graph is densest", async () => {
    const rows = await sidebarRows();
    // The population, so a changed loader fails here rather than passing on nothing.
    expect(rows.length).toBeGreaterThanOrEqual(200);
    const withSlots = rows.filter((r) => r.slots > 0);
    expect(withSlots.length).toBeGreaterThanOrEqual(200);

    const slots = rows.reduce((s, r) => s + r.slots, 0);
    const open = rows.reduce((s, r) => s + r.open, 0);
    // 4,380 slots, 3,626 open (82.8%) on 2026-09-22; 60% under the old rule.
    // 3,524 open (80.5%) once "Required by" ranks on its direct holders
    // (entry 301): the 370 inbound `requires` edges the direct view folds
    // are slots the reader meets behind the group's own fold.
    //
    // 3,490 open (79.7%) later the same day, read with the page's own types
    // (entries 327 and 328). The slots are the same 4,380: the 22 drills the
    // reciprocal rule dropped are now drills and no longer "Example of", one
    // line each way. The open count fell by 19 because the principle–failure
    // pairing is a group of its own on 19 pages and the budget is not larger:
    // the pair group opens on 12 (4 principles, 8 failures) and folds on 7,
    // and where it opens it displaces a group of the same size — hesitation's
    // "Extended by" 4 — and where it folds the "Compare" it left behind is
    // smaller than the groups around it. That is the split's cost and it is
    // recorded, not hidden: the floor sits a hair under the reading and may
    // only rise.
    expect(slots).toBeGreaterThanOrEqual(4000);
    expect(open / slots).toBeGreaterThanOrEqual(0.79);

    const share = (type: string) =>
      median(withSlots.filter((r) => r.type === type).map((r) => r.open / r.slots));
    // Medians on 2026-09-22: antipattern 100% (44% before), principle 65%
    // (50% before; 63% under entry 301, since the principles are the knot
    // and the knot is where "Required by" folds most). The principles' floor
    // is the lower because a principle has every relation in both
    // directions and the twelve-cap on its inbound groups is what the reader
    // does not see; raising it is a budget change, not a selection one.
    // Antipattern 90% under entry 328: the "Principle it violates" group is
    // one more group on every failure page, and on blocking and
    // internal-computation it folds, as does the "Compare" beside it. The
    // floor follows the reading down and may only rise.
    expect(share("antipattern")).toBeGreaterThanOrEqual(0.88);
    expect(share("principle")).toBeGreaterThanOrEqual(0.6);
    expect(median(withSlots.map((r) => r.open / r.slots))).toBeGreaterThanOrEqual(0.95);

    // Atoms opening under half: 40 on the entry's reconstruction, 32 under
    // the component's own old rule, 3 by size alone: active-listening,
    // commitment and be-present, the three heaviest, whose ten groups cannot
    // fit a budget of four fold caps in any order. 8 under entry 301: five
    // knot members join them — be-brave, be-honest, ensemble, offers, trust
    // — whose "Required by" is now 1 to 3 direct holders over 13 to 24
    // folded, so the group ranks last and the closure it folds sits two
    // folds down. Each still opens everything else it has. 9 under entry
    // 328: be-changeable's "Compare" 5 was its third open group, and split
    // into "Failures this addresses" 3 and "Compare" 2 both rank below its
    // "Unlocks" 4, which opens instead. The ceiling follows the reading up
    // by that one page and may only fall.
    const underHalf = withSlots.filter((r) => r.open / r.slots < 0.5).map((r) => r.id);
    expect(underHalf.length, underHalf.join(", ")).toBeLessThanOrEqual(9);
    for (const id of ["active-listening", "commitment", "be-present"]) {
      expect(underHalf).toContain(id);
    }

    // The rich club, before and after: active-listening 18 then 30 of 96,
    // commitment 25 then 33 of 105, be-present 27 then 39 of 81. Under
    // entry 301 commitment opens 29 (its "Required by" opens its 9 direct
    // holders, not a capped dozen of 70) and be-present 31 (the group, 4
    // direct over 31 folded, no longer ranks in; "Unlocks" opens instead);
    // active-listening keeps 30 with 19 direct holders. Read with the
    // page's types (entry 327) active-listening opens 28: its "Example of"
    // held last-word-response, which is a drill and now sits in a drills
    // group of its own that the budget folds; commitment opens 33 and
    // be-present 32. The one floor that moved follows its reading down.
    const by = (id: string) => rows.find((r) => r.id === id)!;
    expect(by("active-listening").open).toBeGreaterThanOrEqual(28);
    expect(by("commitment").open).toBeGreaterThanOrEqual(29);
    expect(by("be-present").open).toBeGreaterThanOrEqual(31);

    // And the ceiling the budget exists for: no atom's two blocks put more
    // outside a fold than the old rule's worst case.
    expect(Math.max(...rows.map((r) => r.visible))).toBeLessThanOrEqual(SIDEBAR_OPEN_BUDGET);
  });

  /**
   * The built page, on the page the entry names: links in the connections
   * and inbound blocks outside every fold, against the 18 open of about 98
   * the old rule gave (entry 272's testable check).
   */
  it.runIf(built)("opens more of active-listening's connections on the built page", () => {
    const page = path.join(APP, "practice", "techniques", "active-listening.html");
    expect(fs.existsSync(page)).toBe(true);
    const html = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const aside = html.split("<aside")[1]?.split("</aside>")[0] ?? "";
    // The two blocks: from the Connections heading to the Part of heading.
    const blocks = aside.slice(aside.indexOf("Connections"), aside.indexOf("Part of"));
    expect(blocks.length).toBeGreaterThan(0);
    const total = (blocks.match(/<a /g) ?? []).length;
    const outsideFolds = (stripFolds(blocks).match(/<a /g) ?? []).length;
    // 20 outside any fold on 2026-09-22, four groups at the fold cap of
    // five, against 18 under the old rule counted the entry's way; by that
    // count the page now opens 30 of 96. The DOM holds 44, not 96, because
    // an inbound group keeps its capped dozen (INBOUND_GROUP_LIMIT) and
    // counts the rest; the entry's "about 80 inside" was its reconstruction,
    // not the page.
    expect(total).toBeGreaterThanOrEqual(40);
    expect(outsideFolds).toBeGreaterThanOrEqual(19);
    expect(outsideFolds).toBeLessThanOrEqual(SIDEBAR_OPEN_BUDGET);

    // Every closed group's summary is a sentence: label, count, names.
    const summaries = [...blocks.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)]
      .map((m) => m[1].replace(/<[^>]+>/g, "").trim())
      // SidebarLinkGroup's own fold reads "N more →Show fewer", and since
      // 2026-09-22 the Builds on group carries a fold of its own for the
      // prerequisites the reduction implied, "and N more it builds on
      // through these" (entry 277, direct-requires.test.ts), as does the
      // Required by group for the holders that hold the page as implied,
      // "Required by N directly, M through …" (entry 301,
      // requires-views.test.ts); the rest are groups.
      .filter(
        (s) =>
          !/^\d+ more/.test(s) &&
          !/^and \d+ more it builds on/.test(s) &&
          !/^Required by \d+ directly, /.test(s),
      );
    expect(summaries.length).toBeGreaterThanOrEqual(5);
    for (const s of summaries) expect(s).toMatch(/^[A-Z][^:]+ \d+: .+/);
  });
});
