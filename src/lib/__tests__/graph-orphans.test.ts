import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * Every atom is pointed at by something other than a hub.
 *
 * This site's graph is one-way: a link declared in A's frontmatter renders on
 * A's page and nowhere else, so an atom nothing declares is reachable only from
 * its type hub. 28 of 192 were in that state — sixteen of them reference atoms
 * that cite the very concept they support while nothing cites them back.
 *
 * The failure mode is quiet, which is why it needs a test rather than a habit.
 * A new atom renders correctly, sits in the sitemap, appears on its hub, and
 * looks completely healthy while being the least connected page on the site.
 */
describe("graph connectivity", () => {
  it("leaves no atom unreferenced by another document", async () => {
    const [atoms, bridges, threads, paths] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
      loadPaths(),
    ]);
    expect(atoms.length).toBeGreaterThan(100);

    const referenced = new Set<string>();
    const note = (from: string, id: string) => {
      if (id && id !== from) referenced.add(id);
    };

    for (const atom of atoms) {
      const self = atom.frontmatter.id;
      for (const link of atom.frontmatter.links ?? []) note(self, link.id);
    }
    for (const bridge of bridges) {
      for (const id of bridge.frontmatter.entry_atoms ?? []) note(bridge.slug, id);
    }
    for (const thread of threads) {
      for (const id of thread.frontmatter.atoms ?? []) note(thread.slug, id);
    }
    for (const path of paths) {
      for (const id of path.frontmatter.threads ?? []) note(path.slug, id);
    }

    const orphans = atoms
      .map((a) => a.frontmatter.id)
      .filter((id) => !referenced.has(id))
      .sort();

    expect(orphans).toEqual([]);
  });
});
