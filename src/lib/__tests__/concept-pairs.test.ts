import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "../content";

/**
 * Where a guide and an atom name the same concept, the atom must link to the guide.
 *
 * Seven concepts have both: a guide written for the search query and an atom
 * holding the primitive. In every one of the seven the atom was the better
 * linked of the pair, and not narrowly. The backtick concept syntax turns each
 * mention of `active-listening` into a link, so across 171 atoms and 72 guides
 * the most-referenced primitives accumulate enormous internal equity — that
 * atom had 114 inbound links inside page bodies against nine for the guide of
 * the same name, and be-present had 103 against fourteen.
 *
 * Search Console shows what that buys: "yes and rule" surfaces
 * /practice/techniques/yes-and at position 41, not /yes-and-improv, which is
 * the page carrying the keyword research and the SERP verdict. The graph was
 * quietly electing its own primitives over the pages built to rank.
 *
 * One editorial link from an atom with 114 inbound is worth more than a dozen
 * from obscure pages, so this is cheap to satisfy and expensive to ignore. The
 * rule is only that the link exists, in the body, pointing at the guide.
 */

/**
 * Pairs that name the same concept but should NOT link. Expected to stay empty;
 * an entry here needs a reason why the two pages are genuinely unrelated.
 */
const ALLOWED = new Set<string>([]);

describe("guide and atom concept pairs", () => {
  it("have the atom linking to the guide", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    const atomById = new Map(atoms.map((a) => [String(a.frontmatter.id), a]));

    const pairs: Array<{ guide: string; atom: string; linked: boolean }> = [];

    for (const bridge of bridges) {
      const entry = (bridge.frontmatter.entry_atoms ?? []) as string[];
      for (const id of entry) {
        // Same concept, two pages: the slugs are the same string, or one
        // contains the other ("be-present" inside "how-to-be-present").
        if (!(bridge.slug === id || bridge.slug.includes(id) || id.includes(bridge.slug))) continue;
        const atom = atomById.get(id);
        if (!atom) continue;
        if (ALLOWED.has(`${id}|${bridge.slug}`)) continue;
        pairs.push({
          guide: bridge.slug,
          atom: id,
          linked: atom.content.includes(`](/${bridge.slug})`),
        });
      }
    }

    // The pairing rule finding nothing would make this pass on an empty set.
    expect(pairs.length).toBeGreaterThanOrEqual(7);

    const unlinked = pairs.filter((p) => !p.linked).map((p) => `${p.atom} -> /${p.guide}`);
    expect(unlinked).toEqual([]);
  });
});
