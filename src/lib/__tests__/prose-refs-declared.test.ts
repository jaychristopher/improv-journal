import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "../content";
import type { AtomType } from "../schema";

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
/**
 * Types a guide can be said to "rest on".
 *
 * entry_atoms is the concepts a guide is built from, not an index of
 * everything it mentions. theatre-games names twenty-seven exercises because
 * it is a list of games — declaring those would put twenty-seven cards in its
 * concepts block and skew the atom-overlap weight in related-bridges. Applying
 * this filter to the guides took the raw count from 187 to 44, and the 44 were
 * load-bearing: "That is `heightening`", "`obvious-choice` is the reason it
 * works".
 */
const CONCEPT_TYPES: AtomType[] = [
  "principle",
  "law",
  "definition",
  "technique",
  "antipattern",
  "pattern",
  "insight",
  "framework",
];

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

  it("are declared in the entry_atoms of the guide that names them", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    expect(bridges.length).toBeGreaterThan(50);

    const typeOf = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.type]));
    const undeclared: string[] = [];

    for (const bridge of bridges) {
      const declared = new Set(bridge.frontmatter.entry_atoms ?? []);

      for (const match of bridge.content.matchAll(/`([a-z0-9-]{3,40})`/g)) {
        const id = match[1];
        const type = typeOf.get(id);
        if (!type || !CONCEPT_TYPES.includes(type) || declared.has(id)) continue;
        undeclared.push(`${bridge.slug} -> ${id}`);
      }
    }

    expect([...new Set(undeclared)]).toEqual([]);
  });
});
