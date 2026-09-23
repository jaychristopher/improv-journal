import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  inboundGroupsFor,
  mergeSymmetricInbound,
  outboundGroupsFor,
} from "../../components/AtomDetail";
import { getAtomUrl, getInboundLinks, loadAtoms, loadThreads } from "../content";
import { KNOT } from "../mini-graph-picks";
import { RELATION_LABELS } from "../relation-labels";
import {
  chooseOpenGroups,
  FORWARD_RELATION,
  openCost,
  outboundKey,
  SIDEBAR_OPEN_BUDGET,
  sidebarBudgetGroups,
} from "../sidebar-budget";
import { getAtomWhatsNext, RELATED_TIERS, relatedTier } from "../whats-next";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The related-concepts card steps forward.
 *
 * The graph has one forward relation, `enables` — 256 edges, rendered
 * "Unlocks" — and until 2026-09-22 no router read it. The card on the 68
 * concept pages that sit in no lesson ranked neighbours by lesson
 * membership, edge count and degree, relation-blind, so its first suggestion
 * was an `illustrates` target 36 times, a `requires` target — a step back to
 * a prerequisite the sidebar's "Builds on" already lists — 16 times, an
 * `enables` target twice, and a member of the 19-atom knot 38 times: the
 * most-connected neighbour is the centre, and for a concept whose
 * prerequisites are the centre, a prerequisite (tracker entry 292). The
 * router now ranks by the relation's direction before anything else, the
 * knot takes one slot, and the hint beside each title is the relation's own
 * word, so a reader knows which way they are stepping.
 *
 * Measured on the day of the change, before → after: first suggestion an
 * `enables` target 2 → 17 — every page that has one — a `requires` target
 * 16 → 0, a knot member 38 → 24; 38 of the 68 pages lead with a different
 * atom. The ceilings here sit just above the after-measure and may only
 * fall.
 */
describe("what's next steps forward", () => {
  /** The atoms no lesson composes, with the card each gets. */
  async function untaughtCards() {
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
    const untaught = atoms.filter((a) => !inLesson.has(a.frontmatter.id));
    const cards = [];
    for (const atom of untaught) {
      const next = await getAtomWhatsNext(atom.frontmatter.id);
      if (next?.variant !== "related-concepts") continue;
      const id = atom.frontmatter.id;
      // What this page unlocks, by the graph: its outbound `enables`, and
      // the neighbours whose own `requires` names it.
      const forward = new Set<string>();
      for (const l of atom.frontmatter.links ?? []) {
        if (l.relation === "enables") forward.add(l.id);
      }
      for (const a of atoms) {
        for (const l of a.frontmatter.links ?? []) {
          if (l.id === id && l.relation === "requires") forward.add(a.frontmatter.id);
        }
      }
      // Its prerequisites: outbound `requires`, and the neighbours whose
      // `enables` names it — unless the same neighbour is also forward, as a
      // `requires` cycle inside the knot makes it.
      const backward = new Set<string>();
      for (const l of atom.frontmatter.links ?? []) {
        if (l.relation === "requires") backward.add(l.id);
      }
      for (const a of atoms) {
        for (const l of a.frontmatter.links ?? []) {
          if (l.id === id && l.relation === "enables") backward.add(a.frontmatter.id);
        }
      }
      for (const f of forward) backward.delete(f);
      cards.push({ id, type: atom.frontmatter.type, items: next.items, forward, backward });
    }
    return cards;
  }

  it("reads a relation's direction from this page's side of the edge", () => {
    // Outbound `enables` and inbound `requires` are one fact: the neighbour
    // comes after this page.
    expect(relatedTier({ direction: "outbound", relation: "enables" }, "format", "law")).toBe(
      "forward",
    );
    expect(relatedTier({ direction: "inbound", relation: "requires" }, "format", "law")).toBe(
      "forward",
    );
    // And their converses say the neighbour comes before it.
    expect(relatedTier({ direction: "outbound", relation: "requires" }, "format", "law")).toBe(
      "backward",
    );
    expect(relatedTier({ direction: "inbound", relation: "enables" }, "format", "law")).toBe(
      "backward",
    );
    // `extends` is a sibling when the types match and an extension when not.
    expect(relatedTier({ direction: "outbound", relation: "extends" }, "format", "format")).toBe(
      "sibling",
    );
    expect(relatedTier({ direction: "outbound", relation: "extends" }, "format", "technique")).toBe(
      "extension",
    );
    // A drill's `illustrates` is a drill; any other `illustrates` is an aside.
    expect(relatedTier({ direction: "inbound", relation: "illustrates" }, "law", "exercise")).toBe(
      "drill",
    );
    expect(relatedTier({ direction: "outbound", relation: "illustrates" }, "exercise", "law")).toBe(
      "aside",
    );
    expect(relatedTier({ direction: "outbound", relation: "contrasts" }, "law", "law")).toBe(
      "aside",
    );
    // The order the card ranks them in.
    expect(Object.keys(RELATED_TIERS)).toEqual([
      "forward",
      "sibling",
      "drill",
      "extension",
      "aside",
      "backward",
    ]);
  });

  it("leads with what this page unlocks on every page that unlocks something", async () => {
    const cards = await untaughtCards();
    // The population: 68 pages in no lesson on 2026-09-22.
    expect(cards.length).toBeGreaterThanOrEqual(60);

    const withForward = cards.filter((c) => c.forward.size > 0);
    // 17 of the 68 have an `enables` target. Exact, so a change in the
    // corpus is read here rather than absorbed.
    expect(withForward.length).toBe(17);

    const misled = withForward
      .filter((c) => !c.forward.has(c.items[0].id))
      .map((c) => `${c.id} leads with ${c.items[0].id}, not one of ${[...c.forward].join(", ")}`);
    expect(misled).toEqual([]);

    // The hint on those is the relation's word for a step forward.
    const hints = new Set([RELATION_LABELS.enables.outbound, RELATION_LABELS.requires.inbound]);
    for (const c of withForward) {
      expect(hints, `${c.id}: ${c.items[0].hint}`).toContain(c.items[0].hint);
    }
    // Every card's first item reports the tier the ranking gave it.
    for (const c of withForward) expect(c.items[0].tier, c.id).toBe("forward");
  });

  it("never leads with a prerequisite", async () => {
    const cards = await untaughtCards();
    expect(cards.length).toBeGreaterThanOrEqual(60);
    // 16 pages led with a `requires` target before the change.
    const stepsBack = cards
      .filter((c) => c.backward.has(c.items[0].id))
      .map((c) => `${c.id} leads with its prerequisite ${c.items[0].id}`);
    expect(stepsBack).toEqual([]);
    for (const c of cards) expect(c.items[0].tier, c.id).not.toBe("backward");
    // And the guard's own population: most of these pages do have a
    // prerequisite the old ranking could have led with.
    expect(cards.filter((c) => c.backward.size > 0).length).toBeGreaterThanOrEqual(30);
  });

  it("gives the knot one slot", async () => {
    const cards = await untaughtCards();
    expect(cards.length).toBeGreaterThanOrEqual(60);

    // No card names two members of the core.
    const twice = cards
      .filter((c) => c.items.filter((i) => KNOT.has(i.id)).length > 1)
      .map((c) => c.id);
    expect(twice).toEqual([]);

    // The knot led 38 of 68 cards before, 24 after — the 24 are pages whose
    // forward or sibling neighbour is a core atom, which is the graph's
    // claim and not the ranking's. A ceiling just above that, so a change
    // that sends readers back to the centre fails here.
    const knotFirst = cards.filter((c) => KNOT.has(c.items[0].id)).length;
    expect(knotFirst).toBeLessThanOrEqual(26);
    // The collapse leaves one page (ref-madson-improv-wisdom, whose three
    // neighbours are two core atoms and one other) with two items rather
    // than three; nothing loses more.
    expect(cards.filter((c) => c.items.length < 2).map((c) => c.id)).toEqual([]);
  });

  /**
   * The sidebar's half of the entry: on a page in no lesson, the "Unlocks"
   * group opens whatever its size, because it is the only forward pointer
   * the page has. The weight moves the group up the size ranking without
   * changing what it costs, so the budget — and the column ceiling
   * `sidebar-load` asserts on the built page — is untouched.
   */
  it("weights the Unlocks group open on pages in no lesson without spending more", async () => {
    // The unit: the smallest group ranks first under the weight, and the
    // spend is unchanged.
    const outbound = [
      { relation: "requires", size: 7 },
      { relation: "enables", size: 1 },
      { relation: "illustrates", size: 6 },
    ];
    const inbound = [
      { key: "requires", links: [1, 2, 3, 4, 5, 6], omitted: 2 },
      { key: "drills", links: [1, 2, 3, 4, 5, 6], omitted: 0 },
    ];
    const budget = 3 * openCost(6);
    const plain = chooseOpenGroups(sidebarBudgetGroups(outbound, inbound), budget);
    expect(plain.has(outboundKey(FORWARD_RELATION))).toBe(false);
    const weighted = chooseOpenGroups(
      sidebarBudgetGroups(outbound, inbound, { forward: true }),
      budget,
    );
    expect(weighted.has(outboundKey(FORWARD_RELATION))).toBe(true);
    // One large group gave way to it; the spend did not rise past the budget.
    expect(weighted.size).toBe(3);
    // A page in a lesson keeps the plain ranking.
    expect(sidebarBudgetGroups(outbound, inbound).every((g) => g.weight === undefined)).toBe(true);

    // The corpus: every page in no lesson that has the group opens it, and
    // no such page spends past the budget. On 2026-09-22 the 17 pages with
    // the group already opened it under the plain ranking — their columns
    // spend at most 17 of the 20 — so the weight is a guarantee against the
    // day one grows a bigger group, not a change a reader sees today.
    const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
    const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    let untaught = 0;
    let withGroup = 0;
    let opened = 0;
    let worst = 0;
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      if (inLesson.has(fm.id)) continue;
      untaught += 1;
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
      const inboundLinks = await getInboundLinks(fm.id);
      const connections = mergeSymmetricInbound(resolved, inboundLinks, fm.type);
      const out = outboundGroupsFor(fm.type, connections).map((g) => ({
        relation: g.key,
        size: g.links.length,
      }));
      const inb = inboundGroupsFor(inboundLinks, resolved, new Set(), fm.type).filter(
        (g) => g.key !== "contrasts",
      );
      const open = chooseOpenGroups(sidebarBudgetGroups(out, inb, { forward: true }));
      let spent = 0;
      for (const g of out) if (open.has(outboundKey(g.relation))) spent += openCost(g.size);
      for (const g of inb) {
        if (open.has(`in:${g.key}`)) spent += openCost(g.links.length + g.omitted);
      }
      worst = Math.max(worst, spent);
      if (out.some((g) => g.relation === FORWARD_RELATION)) {
        withGroup += 1;
        if (open.has(outboundKey(FORWARD_RELATION))) opened += 1;
      }
    }
    expect(untaught).toBeGreaterThanOrEqual(60);
    expect(withGroup).toBe(17);
    expect(opened).toBe(withGroup);
    expect(worst).toBeLessThanOrEqual(SIDEBAR_OPEN_BUDGET);
  });

  /**
   * The built page, on one whose first suggestion changed: big-booty, a
   * warm-up in no lesson, led with `be-present` ("Example of") and now leads
   * with `ensemble`, which it unlocks. The card's first anchor is that page
   * and its hint is the relation's word.
   */
  it.runIf(built)("leads big-booty's card with what it unlocks, and says so", () => {
    const page = path.join(APP, "practice", "exercises", "big-booty.html");
    expect(fs.existsSync(page)).toBe(true);
    const html = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const card = html.split('aria-label="Related concepts"')[1]?.split("</nav>")[0] ?? "";
    expect(card.length).toBeGreaterThan(0);
    const first = card.split("<li")[1]?.split("</li>")[0] ?? "";
    expect(first).toMatch(/href="\/practice\/vocabulary\/ensemble"/);
    const hint = first.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(hint).toContain(RELATION_LABELS.enables.outbound);
    expect(hint).not.toContain(RELATION_LABELS.requires.outbound);
  });
});
