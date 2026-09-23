import { describe, expect, it } from "vitest";

import { inboundGroupsFor } from "../../components/AtomDetail";
import {
  AGE_FLOOR_MONTHS,
  ageNormalisedRank,
  byRank,
  cohortOf,
  graphClock,
  inDegreeIndex,
  monthsSince,
  newestCohort,
  recentInDegree,
  reserveNewestSlot,
} from "../atom-rank";
import { getAtomUrl, getInboundLinks, loadAtoms } from "../content";
import { requiredByView, requiresGraph } from "../direct-requires";
import { orderedTechniques } from "../hub-order";
import type { AtomFrontmatter } from "../schema";
import { trainedBy } from "../trains";

/**
 * Every list the site ordered by in-degree was a list ordered by age.
 *
 * The edges were written toward the atoms that existed when they were
 * written, so in-degree follows `created`: on 2026-09-22 the 27 March atoms
 * (13% of the graph) had a median in-degree of 17, the 128 April atoms 7,
 * the 46 August atoms 1. 7 surfaces ordered by that count — the inbound
 * sidebar groups, "Counter it with", the principles hub's failure lines,
 * the library's "Pages that cite it", the JSON-LD `subjectOf`, the
 * techniques hub and the related-concepts tiebreak — and on each the
 * August work sat last: the March cohort held the first slot in 26% of the
 * 508 inbound groups, August in 11%, and no August atom was among the top
 * 20 by in-degree (tracker entry 307). For the newest fifth of the corpus
 * the "importance signal" was a signal that they were new.
 *
 * The rule those surfaces share now is in-degree per month since the atom
 * was first published, measured to the corpus's own clock. These hold the
 * rule's arithmetic, the cohort readings it produces, and the surfaces to
 * the rule.
 *
 * The divisor's date was `created` until 2026-09-22 and is the atom's
 * `firstPublished` since (entry 321; first-published.ts): the first commit
 * that added the file, or `created` where the initial commit imported it.
 * That change moved no reading: git dates every one of the 126 atoms it
 * saw added to the day `created` says, and the 79 it did not see keep
 * `created` — see first-published.test.ts for the count. Cohorts are still
 * read from `created`; a cohort is a batch, and the stamp is what names it.
 *
 * The divisor's floor was 1 month until the evening of 2026-09-22 and is
 * AGE_FLOOR_MONTHS (3) since. At 1, a month-old August drill with 3 edges
 * out-ranked every April drill with fewer than 17, and hesitation's
 * "Counter it with" (cap 3) became 3 August warm-ups (entry 322): the rank
 * had not lifted the newest cohort but seated it. At 3 the lift is a
 * third of what it was, and every cohort reading below was re-dated to
 * say so — the figure under floor 1 is kept beside each so the trade is
 * visible: the August share of the index groups' first slots went 11% →
 * 16% → 12%, of the rendered groups' 11% → 18% → 13%, the top 20 by rank
 * holds 2 August works → 0, and viewpoints, 9th on the techniques hub, is
 * 25th. The floor is the entry's, not a number raised to pass a test; the
 * seat the newest cohort keeps on the short lists is now the reserved
 * slot's, which is what it was written for.
 */

type Atom = Awaited<ReturnType<typeof loadAtoms>>[number];

const atom = (id: string, created: string, links: { id: string }[] = [], updated = created) => ({
  frontmatter: {
    id,
    title: id,
    type: "definition",
    created,
    updated,
    links: links.map((l) => ({ id: l.id, relation: "requires" as const })),
  } as unknown as AtomFrontmatter,
});

/** The August cohort by `created`, named rather than read as the newest so a later batch does not move these readings. */
const august = (atoms: readonly Atom[]) =>
  new Set(atoms.filter((a) => cohortOf(a.frontmatter) === "2026-08").map((a) => a.frontmatter.id));

/** Share of a count by cohort, rounded to whole percent. */
function shares(counts: Map<string, number>): Record<string, number> {
  const total = [...counts.values()].reduce((n, c) => n + c, 0);
  const out: Record<string, number> = {};
  for (const [cohort, n] of [...counts].sort()) out[cohort] = Math.round((100 * n) / total);
  return out;
}

describe("the arithmetic", () => {
  it("floors an atom's age at 3 months, and reads the clock from the corpus", () => {
    // A day old, a fortnight old, a month old (the August cohort on the
    // clock), 2.7 months old, created after the clock, unparseable: all
    // the floor, so a new atom's edges are not divided into a rank no
    // older atom could reach. The floor was 1 month until 2026-09-22 and
    // a month-old atom with 3 edges then ranked 3.0, above all but the
    // core; at 3 it ranks 1.0 (entry 322).
    expect(monthsSince("2026-09-20", "2026-09-21")).toBe(AGE_FLOOR_MONTHS);
    expect(monthsSince("2026-09-07", "2026-09-21")).toBe(AGE_FLOOR_MONTHS);
    expect(monthsSince("2026-08-22", "2026-09-21")).toBe(AGE_FLOOR_MONTHS);
    expect(monthsSince("2026-07-01", "2026-09-21")).toBe(AGE_FLOOR_MONTHS);
    expect(monthsSince("2026-10-01", "2026-09-21")).toBe(AGE_FLOOR_MONTHS);
    expect(monthsSince("not a date", "2026-09-21")).toBe(AGE_FLOOR_MONTHS);
    expect(AGE_FLOOR_MONTHS).toBe(3);
    // Past the floor the count is continuous, in mean months of 30.44
    // days: 4 months is 4.04, a 365-day year is a shade under 12.
    expect(monthsSince("2026-05-21", "2026-09-21")).toBeCloseTo(4.04, 2);
    expect(monthsSince("2025-09-21", "2026-09-21")).toBeCloseTo(11.99, 2);
    expect(monthsSince("2026-03-29", "2026-09-21")).toBeCloseTo(5.78, 1);

    // The clock is the latest date any atom carries, `updated` or `created`.
    expect(graphClock([atom("a", "2026-03-01", [], "2026-05-01"), atom("b", "2026-04-01")])).toBe(
      "2026-05-01",
    );
    expect(graphClock([atom("a", "2026-03-01"), atom("b", "2026-06-01", [], "2026-04-01")])).toBe(
      "2026-06-01",
    );
  });

  it("divides edges received by months of age", () => {
    const atoms = [
      // old: created 6 months before the clock, 4 edges in.
      atom("old", "2026-03-21", [{ id: "young" }]),
      // young: created this month, 3 edges in — floored to 3 months.
      atom("young", "2026-09-10", [{ id: "old" }]),
      atom("c", "2026-04-21", [{ id: "old" }, { id: "young" }]),
      atom("d", "2026-05-21", [{ id: "old" }, { id: "young" }]),
      atom("e", "2026-09-21", [{ id: "old" }]),
    ];
    const rank = ageNormalisedRank(atoms);
    expect(inDegreeIndex(atoms).get("old")).toBe(4);
    expect(inDegreeIndex(atoms).get("young")).toBe(3);
    expect(rank.get("old")).toBeCloseTo(4 / monthsSince("2026-03-21", "2026-09-21"), 6);
    // 3 edges over the floor's 3 months: 1.0, where the 1-month floor gave
    // 3.0 until 2026-09-22.
    expect(rank.get("young")).toBe(3 / AGE_FLOOR_MONTHS);
    expect(rank.get("young")).toBe(1);
    // Nothing links to `e`: it ranks 0, not undefined.
    expect(rank.get("e")).toBe(0);
    // Under raw in-degree `old` leads; per month of age `young` does, but
    // by 1.0 to 0.66 rather than 3.0 to 0.66: lifted, not seated.
    expect(rank.get("young")!).toBeGreaterThan(rank.get("old")!);
    expect(rank.get("young")! / rank.get("old")!).toBeLessThan(2);
    // The clock can be given, which is how a test pins a reading.
    expect(ageNormalisedRank(atoms, "2027-09-21").get("young")).toBeCloseTo(3 / 12.03, 1);
    // The divisor reads `firstPublished` where the loader supplies it, and
    // `created` only where it does not: an atom stamped in March but first
    // committed in August is aged from August — 1 month, floored to 3 —
    // and not the 6 its stamp would give it.
    const stamped = [
      { ...atom("old", "2026-03-21"), firstPublished: "2026-08-21" },
      ...atoms.slice(1),
    ];
    expect(ageNormalisedRank(stamped, "2026-09-21").get("old")).toBeCloseTo(
      4 / monthsSince("2026-08-21", "2026-09-21"),
      6,
    );
    expect(ageNormalisedRank(stamped, "2026-09-21").get("old")).toBeCloseTo(4 / 3, 6);
    expect(ageNormalisedRank(stamped, "2026-09-21").get("old")).not.toBeCloseTo(
      rank.get("old")!,
      2,
    );
  });

  it("counts recent in-degree as edges from atoms created strictly after the target", () => {
    const atoms = [
      atom("target", "2026-04-05"),
      // Same day: not after.
      atom("same-day", "2026-04-05", [{ id: "target" }]),
      atom("earlier", "2026-03-29", [{ id: "target" }]),
      atom("later", "2026-08-22", [{ id: "target" }]),
      atom("later-2", "2026-08-23", [{ id: "target" }, { id: "later" }]),
    ];
    const recent = recentInDegree(atoms);
    expect(inDegreeIndex(atoms).get("target")).toBe(4);
    expect(recent.get("target")).toBe(2);
    expect(recent.get("later")).toBe(1);
    expect(recent.get("earlier")).toBe(0);
    // An edge to an id the corpus does not hold counts for nothing.
    expect(
      recentInDegree([atom("x", "2026-01-01", [{ id: "ghost" }])]).get("ghost"),
    ).toBeUndefined();
  });

  it("names the newest cohort from the corpus, and reserves one slot for it", () => {
    const atoms = [atom("a", "2026-03-29"), atom("b", "2026-08-22"), atom("c", "2026-08-24")];
    expect([...newestCohort(atoms)].sort()).toEqual(["b", "c"]);
    expect(cohortOf(atoms[0].frontmatter)).toBe("2026-03");

    const newest = new Set(["n1", "n2"]);
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "n1" }, { id: "n2" }, { id: "d" }];
    const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
    // No newest in the first 3: the best-ranked one takes the 3rd
    // slot and the one it displaced follows it; the rest keep their order.
    expect(ids(reserveNewestSlot(list, 3, newest))).toEqual(["a", "b", "n1", "c", "n2", "d"]);
    // Already one in the open slots: unchanged.
    expect(ids(reserveNewestSlot(list, 4, newest))).toEqual(ids(list));
    // None to promote, or nothing past the open slots: unchanged.
    expect(ids(reserveNewestSlot(list, 3, new Set()))).toEqual(ids(list));
    expect(ids(reserveNewestSlot(list.slice(0, 3), 3, newest))).toEqual(["a", "b", "c"]);
    expect(ids(reserveNewestSlot(list, 0, newest))).toEqual(ids(list));
    // A copy, never the input.
    expect(reserveNewestSlot(list, 3, newest)).not.toBe(list);
  });
});

describe("the corpus", () => {
  it("has the population the readings were taken on", async () => {
    const atoms = await loadAtoms();
    // 205 atoms and 46 August atoms on 2026-09-22. The cohort is read as
    // the latest month of creation, so a September batch would make it the
    // newest cohort and these numbers a record of the one before it.
    expect(atoms.length).toBeGreaterThanOrEqual(205);
    expect(august(atoms).size).toBeGreaterThanOrEqual(46);
    const newest = newestCohort(atoms);
    expect(newest.size).toBeGreaterThanOrEqual(1);
    expect(graphClock(atoms) >= "2026-09-21").toBe(true);
    for (const id of newest) {
      const fm = atoms.find((a) => a.frontmatter.id === id)!.frontmatter;
      expect(cohortOf(fm) >= "2026-08").toBe(true);
    }
  });

  /**
   * The top 20 under each rule, 2026-09-22, clock 2026-09-21. Raw
   * in-degree: 6 March, 14 April, 0 August. Age-normalised with the 1-month
   * floor (the morning's rule): 5 March, 13 April, 2 August
   * (ref-napier-behind-the-scenes at 5, 10 edges in a month;
   * ref-stiles-improvise-freely at 12, 8 edges). With the 3-month floor
   * (entry 322, the evening): 6 March, 14 April, 0 August — the same 20 as
   * the raw count; Napier is 44th and Stiles 55th, up from 69th and 78th
   * under the raw count, so the rule still lifts them, by 25 and 23
   * places, without seating them. Recent in-degree: 8 March, 12 April, 0
   * August — an August atom can have no edges from later atoms until
   * something is written after it, which is the measure's limit and why it
   * is a check and not an ordering.
   */
  it("lifts the August works toward the top 20 under the age-normalised rule, and seats none", async () => {
    const atoms = await loadAtoms();
    const newest = august(atoms);
    const items = atoms.map((a) => ({ id: a.frontmatter.id, title: a.frontmatter.title }));
    const order = (rank: Map<string, number>) => [...items].sort(byRank(rank)).map((t) => t.id);
    const rawAll = order(inDegreeIndex(atoms));
    const normalisedAll = order(ageNormalisedRank(atoms));
    const raw = rawAll.slice(0, 20);
    const normalised = normalisedAll.slice(0, 20);
    const recent = order(recentInDegree(atoms)).slice(0, 20);
    expect(raw.filter((id) => newest.has(id))).toEqual([]);
    expect(recent.filter((id) => newest.has(id))).toEqual([]);
    // Under the 3-month floor no August work reaches the 20; the reading
    // is 0 and a ceiling of 2 (the 1-month floor's count) is the most the
    // rule could seat again if the floor were lowered.
    expect(normalised.filter((id) => newest.has(id)).length).toBeLessThanOrEqual(2);
    // The rule is still doing something: the 2 most-cited August works
    // stand higher than the raw count puts them. 69 → 44 and 78 → 55 on
    // 2026-09-22; the floor is 20 places each, the gap may only widen.
    for (const [id, rawAt, at] of [
      ["ref-napier-behind-the-scenes", 69, 44],
      ["ref-stiles-improvise-freely", 78, 55],
    ] as const) {
      expect(rawAll.indexOf(id) + 1, id).toBeGreaterThanOrEqual(rawAt - 5);
      expect(normalisedAll.indexOf(id) + 1, id).toBeLessThanOrEqual(at + 5);
      expect(rawAll.indexOf(id) - normalisedAll.indexOf(id), id).toBeGreaterThanOrEqual(20);
    }
    // The core stays the core under every rule: the 4 March atoms the
    // graph leans on most lead all 3.
    for (const list of [raw, normalised, recent]) {
      expect(list.slice(0, 4)).toEqual(["commitment", "active-listening", "be-present", "offers"]);
    }
  });

  /**
   * The entry's measure: the first slot of each (target, relation) group
   * the inbound index holds — 508 groups on 2026-09-22 — by the cohort of
   * the atom in it. Under raw in-degree: March 134 (26%), April 308 (61%),
   * May 8 (2%), August 58 (11%). Under the age-normalised rule with the
   * 1-month floor: March 125 (25%), April 295 (58%), May 7 (1%), August 81
   * (16%). With the 3-month floor (entry 322, the same evening): March 132
   * (26%), April 305 (60%), May 8 (2%), August 63 (12%) — a point above
   * the raw count where the 1-month floor gave 5. The August share is the
   * floor and may only rise toward the cohort's 22% of the graph; the
   * March and April shares are ceilings.
   */
  it("moves the August cohort's first-slot share from 11% to 12% across the inbound index's groups", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const cohort = (id: string) => cohortOf(byId.get(id)!);
    const firstSlots = async (rank: Map<string, number>) => {
      const counts = new Map<string, number>();
      let groups = 0;
      for (const a of atoms) {
        const inbound = [...(await getInboundLinks(a.frontmatter.id))].sort(byRank(rank));
        const seen = new Set<string>();
        for (const l of inbound) {
          if (seen.has(l.relation)) continue;
          seen.add(l.relation);
          groups += 1;
          counts.set(cohort(l.id), (counts.get(cohort(l.id)) ?? 0) + 1);
        }
      }
      return { groups, shares: shares(counts) };
    };
    const before = await firstSlots(inDegreeIndex(atoms));
    const after = await firstSlots(ageNormalisedRank(atoms));
    // Guard the guard: the population the entry counted.
    expect(before.groups).toBeGreaterThanOrEqual(500);
    expect(after.groups).toBe(before.groups);
    // The reading under the old rule, kept so the gap is visible here.
    expect(before.shares["2026-03"]).toBe(26);
    expect(before.shares["2026-08"]).toBe(11);
    // The floor under the new rule: August may only rise toward 22%, March
    // may only fall from 26%. 16 / 25 / 58 under the 1-month floor; 12 /
    // 26 / 60 under the 3-month one, 2026-09-22.
    expect(after.shares["2026-08"]).toBeGreaterThanOrEqual(12);
    expect(after.shares["2026-08"]).toBeLessThanOrEqual(22);
    expect(after.shares["2026-03"]).toBeLessThanOrEqual(26);
    expect(after.shares["2026-04"]).toBeLessThanOrEqual(60);
    // And the rule still moves the count, not only the rounding: 63 August
    // first slots against the raw count's 58.
    expect(after.shares["2026-08"]).toBeGreaterThan(before.shares["2026-08"]);
  });

  /**
   * The same measure on what the page renders: the groups after the
   * reciprocal dedupe, the drill split, the counter split and the direct
   * view — 385 groups on 2026-09-22. Before: March 86 (22%), April 253
   * (66%), May 6 (2%), August 40 (10%). After: March 74 (19%), April 237
   * (62%), May 5 (1%), August 69 (18%); 33 groups change their first slot.
   *
   * 379 later the same day, after entry 315 moved the member that stands
   * for a collapsed cycle from the first-declared to the most-required:
   * which holders the direct "Required by" group opens follows the
   * representative (the targets no holder opens went from 5 to 10), and
   * one group that had an open holder under the first-declared rule has
   * only folded ones now. Before: March 83 (22%), April 248 (65%), May 7
   * (2%), August 41 (11%). After: March 71 (19%), April 233 (61%), May 6
   * (2%), August 69 (18%); 32 groups change their first slot. The floors
   * follow the count; the gap the test is about is the same 8 points.
   *
   * The same evening, under the 3-month age floor (entry 322): the same
   * 379 groups and the same before; after is March 80 (21%), April 243
   * (64%), May 7 (2%), August 49 (13%), and 15 groups change their first
   * slot. The gap is 2 points, not 8: the floor gives back most of the
   * lift so a month-old batch cannot take every seat, and the reserved
   * slot on the short lists is the guarantee instead.
   *
   * Later still (entry 327): 395 groups, because the reciprocal rule
   * stopped dropping a drill's edge for the page's own `illustrates`
   * toward it and the page's own such edges joined the drills groups —
   * 16 drills groups the pages did not have, most of them one April
   * drill on a principle page. Before: March 87 (22%), April 260 (66%),
   * May 7 (2%), August 41 (10%); after: March 85 (22%), April 254 (64%),
   * May 7 (2%), August 49 (12%); 20 groups move. The same 41 and 49
   * August firsts over a larger denominator, so both shares read a point
   * lower and the gap is still 2 points; the readings are re-dated, not
   * the rule.
   */
  it("moves the August share of the rendered groups' first slots from 11% to 13%", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const cohort = (id: string) => cohortOf(byId.get(id)!);
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const rank = ageNormalisedRank(atoms);
    const before = new Map<string, number>();
    const after = new Map<string, number>();
    let groups = 0;
    let moved = 0;
    for (const a of atoms) {
      const fm = a.frontmatter;
      const resolved = (fm.links ?? []).map((l) => {
        const t = byId.get(l.id);
        return {
          id: l.id,
          relation: l.relation,
          title: t?.title ?? l.id,
          url: t ? getAtomUrl({ id: l.id, type: t.type }) : `/how-it-works/${l.id}`,
          type: t?.type,
        };
      });
      const inbound = await getInboundLinks(fm.id);
      const trained = new Set(await trainedBy(fm.id));
      const view = requiredByView(graph, fm.id, "direct");
      const was = inboundGroupsFor(inbound, resolved, trained, fm.type, view).filter(
        (g) => g.key !== "contrasts",
      );
      const now = inboundGroupsFor(inbound, resolved, trained, fm.type, view, rank).filter(
        (g) => g.key !== "contrasts",
      );
      expect(now.map((g) => g.key)).toEqual(was.map((g) => g.key));
      for (const [i, g] of now.entries()) {
        const first = g.links[0];
        if (!first) continue;
        groups += 1;
        after.set(cohort(first.id), (after.get(cohort(first.id)) ?? 0) + 1);
        const old = was[i].links[0].id;
        before.set(cohort(old), (before.get(cohort(old)) ?? 0) + 1);
        if (old !== first.id) moved += 1;
        // Same members, reordered: the rank changes no group's size or its
        // fold, only which dozen the cap keeps and in what order.
        expect(g.links.length + g.omitted).toBe(was[i].links.length + was[i].omitted);
        expect(g.folded.length).toBe(was[i].folded.length);
      }
    }
    expect(groups).toBeGreaterThanOrEqual(395); // 2026-09-22, after entry 327
    // 40 of 385 (10.4%) on the day; 41 of 379 (10.8%) after entry 315; 41
    // of 395 (10.4%) after entry 327.
    expect(shares(before)["2026-08"]).toBe(10);
    // 18 / 19 / 32 under the 1-month floor; 13 / 21 / 15 under the 3-month
    // one (entry 322); 12 / 22 / 20 over entry 327's 395 groups. August may
    // only rise, March only fall, and the count of groups the rule moves
    // may only grow.
    expect(shares(after)["2026-08"]).toBeGreaterThanOrEqual(12);
    expect(shares(after)["2026-03"]).toBeLessThanOrEqual(22);
    expect(moved).toBeGreaterThanOrEqual(20);
  });

  /**
   * The techniques hub's first 10 under the rule, 2026-09-22, with the
   * 1-month floor: commitment, active-listening, obvious-choice, editing,
   * emotional-truth, accepting-the-offer, space-work, initiation,
   * viewpoints, yes-and. Under raw in-degree the 10 were the same set with
   * suggestion in place of viewpoints — no August technique in the 10.
   * Under the 3-month floor (entry 322) the first 10 are the raw count's
   * again, and viewpoints (3 edges, August) is 25th of 49 against 35th
   * raw and 9th under the 1-month floor. The hub has no reserved slot —
   * it is the whole list, not a capped one — so the reading here is the
   * place, held as a ceiling: viewpoints may only rise from 25th.
   */
  it("lifts viewpoints from 35th to 25th on the techniques hub", async () => {
    const atoms = await loadAtoms();
    const newest = august(atoms);
    const hub = (await orderedTechniques()).map((a) => a.frontmatter.id);
    expect(hub.slice(0, 10)).toEqual([
      "commitment",
      "active-listening",
      "obvious-choice",
      "editing",
      "emotional-truth",
      "accepting-the-offer",
      "space-work",
      "initiation",
      "yes-and",
      "suggestion",
    ]);
    // Guard the guard: 49 techniques and pedagogy atoms, 3 of them August.
    expect(hub.length).toBeGreaterThanOrEqual(45);
    expect(hub.filter((id) => newest.has(id)).length).toBeGreaterThanOrEqual(3);
    const techniques = atoms.filter(
      (a: Atom) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy",
    );
    const raw = [...techniques.map((a) => a.frontmatter)]
      .sort(byRank(inDegreeIndex(atoms)))
      .map((fm) => fm.id);
    expect(raw.slice(0, 10)).not.toContain("viewpoints");
    expect(raw.indexOf("viewpoints") + 1).toBeGreaterThanOrEqual(35);
    // 25th on 2026-09-22 under the 3-month floor; the ceiling may only
    // fall. And the first August technique is the first under the raw
    // count too: the rule reorders, it does not invent.
    expect(hub.indexOf("viewpoints") + 1).toBeLessThanOrEqual(25);
    expect(hub.indexOf("viewpoints")).toBeLessThan(raw.indexOf("viewpoints"));
    expect(hub.find((id) => newest.has(id))).toBe("viewpoints");
  });
});
