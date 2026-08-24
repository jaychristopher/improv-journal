import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/**
 * A concept named in the prose is declared in the frontmatter.
 *
 * Backtick refs auto-link, so writing `wimping` in a sentence already puts a
 * link on the page. The frontmatter is a separate assertion, and it is the one
 * the related-concepts block and the graph are built from — so a prose ref
 * without a declaration is a relationship the site states once and models not
 * at all.
 *
 * Thirteen had drifted apart, most of them concepts added recently where the
 * sentence was written and the frontmatter was not updated. Nothing about the
 * rendered page looks wrong when that happens, which is why it needs a test.
 */
describe("prose references", () => {
  it("are declared in the frontmatter that cites them", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThan(100);

    const known = new Set(atoms.map((a) => a.frontmatter.id));
    const undeclared: string[] = [];

    for (const atom of atoms) {
      const self = atom.frontmatter.id;
      const declared = new Set((atom.frontmatter.links ?? []).map((l) => l.id));

      for (const match of atom.content.matchAll(/`([a-z0-9-]{3,40})`/g)) {
        const id = match[1];
        if (id === self || !known.has(id) || declared.has(id)) continue;
        undeclared.push(`${self} -> ${id}`);
      }
    }

    expect([...new Set(undeclared)]).toEqual([]);
  });
});
