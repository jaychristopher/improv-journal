import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "../content";
import { getEntryAtomDemand, getGuideConcepts } from "../guide-concepts";
import { mentionCount } from "../named-concepts";

describe("guide concepts", () => {
  it("gives every guide the concepts it declares", async () => {
    const bare: string[] = [];

    for (const bridge of await loadBridges()) {
      const declared = bridge.frontmatter.entry_atoms ?? [];
      if (declared.length === 0) continue;
      const concepts = await getGuideConcepts(bridge.slug);
      if (concepts.length === 0) bare.push(bridge.slug);
    }

    expect(bare).toEqual([]);
  });

  it("resolves every rendered concept to a real atom url", async () => {
    const known = new Set((await loadAtoms()).map((a) => a.frontmatter.id));

    for (const bridge of await loadBridges()) {
      for (const concept of await getGuideConcepts(bridge.slug)) {
        expect(known.has(concept.id), `${bridge.slug} -> ${concept.id}`).toBe(true);
        expect(concept.url.startsWith("/")).toBe(true);
        expect(concept.title.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Until 2026-09-22 this asserted declared order. That morning the block
   * moved to the atom the site's guides route the most search demand to
   * (tracker entry 282: each guide's primary traffic potential split over
   * its entry atoms and summed per atom, so `offers` at 137,734 outranked
   * everything), and this test asserted that order for the whole block.
   * That evening entry 296 measured it against the pages: the block led
   * with the concept the body discusses most on 16 of 78 guides, down from
   * 32 under the authored order, and with a concept the body never names
   * on 9 — a sitewide statistic in a page-level slot. The rule is now: the
   * concepts the body names first, ranked by the page's own mention count
   * (title mentions plus backticked ids), then the merely declared ones by
   * demand, with demand the tiebreak among equal mention counts and declared
   * order the last tiebreak. concept-block-order.test.ts holds the head of
   * the list; this holds the tail, where the demand rule still lives, and
   * the demand scorer itself, so a scorer that returned nothing would not
   * pass as "all ties".
   */
  it("orders named concepts by mention count, then the un-named tail by demand, never repeating", async () => {
    const demand = await getEntryAtomDemand();
    // Ten atoms carry 65% of 1.27 million; the scorer has to have found them.
    // 76 atoms scored on 2026-09-22 (the union of the guides' entry atoms).
    expect(demand.size).toBeGreaterThanOrEqual(60);
    expect(demand.get("offers") ?? 0).toBeGreaterThan(100_000);
    const top = [...demand.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    expect(top.slice(0, 4)).toEqual(["offers", "safety-in-the-room", "obvious-choice", "trust"]);

    let guides = 0;
    let tails = 0;
    let tailPairs = 0;
    for (const bridge of await loadBridges()) {
      const declared = bridge.frontmatter.entry_atoms ?? [];
      const concepts = await getGuideConcepts(bridge.slug);
      const ids = concepts.map((c) => c.id);
      expect(new Set(ids).size, bridge.slug).toBe(ids.length);
      if (ids.length === 0) continue;
      guides += 1;

      // Headed before un-headed (a section heading is the page's own
      // statement of its subjects, tracker entry 324, 2026-09-22), then named
      // before un-named, and the named ones by the page's own count; equal
      // counts fall back to demand.
      const mentions = concepts.map((c) => mentionCount(bridge.content, c.title, c.id));
      for (let i = 0; i < concepts.length; i++) {
        expect(concepts[i].named, `${bridge.slug}: ${ids[i]}`).toBe(mentions[i] > 0);
        if (concepts[i].headed) expect(concepts[i].named, `${bridge.slug}: ${ids[i]}`).toBe(true);
        if (i === 0) continue;
        const pair = `${bridge.slug}: ${ids[i - 1]} before ${ids[i]}`;
        if (concepts[i - 1].headed !== concepts[i].headed) {
          expect(concepts[i - 1].headed, pair).toBe(true);
          continue;
        }
        expect(mentions[i - 1], pair).toBeGreaterThanOrEqual(mentions[i]);
        if (mentions[i - 1] === mentions[i]) {
          expect(demand.get(ids[i - 1]) ?? 0, pair).toBeGreaterThanOrEqual(demand.get(ids[i]) ?? 0);
        }
      }

      // The un-named tail: demand order, declared order breaking ties.
      const tail = concepts.filter((c) => !c.named).map((c) => c.id);
      if (tail.length > 1) tails += 1;
      for (let i = 1; i < tail.length; i++) {
        tailPairs += 1;
        const prev = demand.get(tail[i - 1]) ?? 0;
        const next = demand.get(tail[i]) ?? 0;
        expect(prev, `${bridge.slug}: ${tail[i - 1]} before ${tail[i]}`).toBeGreaterThanOrEqual(
          next,
        );
        if (prev === next) {
          expect(
            declared.indexOf(tail[i - 1]),
            `${bridge.slug}: tie ${tail[i - 1]}/${tail[i]}`,
          ).toBeLessThan(declared.indexOf(tail[i]));
        }
      }
    }
    expect(guides).toBeGreaterThanOrEqual(70);
    // Guard the guard: the tail rule has to have been exercised. With
    // backticks counted, guides name 370 of 455 declared concepts, which
    // leaves 85 un-named across the corpus; the floors sit under the number
    // of guides with a tail of two or more, and of tail pairs, measured
    // 2026-09-22: 22 guides, 29 pairs.
    expect(tails).toBeGreaterThanOrEqual(10);
    expect(tailPairs).toBeGreaterThanOrEqual(20);
  });

  it("drops references to atoms that do not exist rather than linking to them", async () => {
    const known = new Set((await loadAtoms()).map((a) => a.frontmatter.id));
    const dangling: string[] = [];

    for (const bridge of await loadBridges()) {
      for (const id of bridge.frontmatter.entry_atoms ?? []) {
        if (!known.has(id)) dangling.push(`${bridge.slug} -> ${id}`);
      }
      const rendered = (await getGuideConcepts(bridge.slug)).map((c) => c.id);
      for (const id of rendered) expect(known.has(id)).toBe(true);
    }

    // Reported, not asserted away: these are content references to atoms that
    // were never written. They render as nothing rather than as dead links.
    if (dangling.length > 0) {
      console.warn(`entry_atoms with no matching atom:\n  ${dangling.join("\n  ")}`);
    }
    expect(dangling.length).toBeLessThan(10);
  });

  it("gives each concept a usable description", async () => {
    const thin: string[] = [];
    for (const bridge of await loadBridges()) {
      for (const c of await getGuideConcepts(bridge.slug)) {
        if (c.description.length < 30) thin.push(`${c.id} (${c.description.length})`);
      }
    }
    expect([...new Set(thin)]).toEqual([]);
  });

  it("returns nothing for a slug that is not a guide", async () => {
    expect(await getGuideConcepts("not-a-guide")).toEqual([]);
  });
});
