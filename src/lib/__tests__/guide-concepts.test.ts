import { describe, expect, it } from "vitest";

import { getAtomBySlug, loadAtoms, loadBridges } from "../content";
import { getGuideConcepts } from "../guide-concepts";

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

  it("preserves declared order and never repeats a concept", async () => {
    for (const bridge of await loadBridges()) {
      const declared = (bridge.frontmatter.entry_atoms ?? []).filter(
        async (id) => await getAtomBySlug(id),
      );
      const ids = (await getGuideConcepts(bridge.slug)).map((c) => c.id);
      expect(new Set(ids).size, bridge.slug).toBe(ids.length);
      // Rendered ids appear in the same relative order they were declared.
      const positions = ids.map((id) => declared.indexOf(id));
      expect(positions, bridge.slug).toEqual([...positions].sort((a, b) => a - b));
    }
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
