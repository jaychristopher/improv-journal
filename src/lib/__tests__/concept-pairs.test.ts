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

    const record = (guideSlug: string, id: string) => {
      const atom = atomById.get(id);
      if (!atom) return;
      if (ALLOWED.has(`${id}|${guideSlug}`)) return;
      if (pairs.some((p) => p.guide === guideSlug && p.atom === id)) return;
      pairs.push({
        guide: guideSlug,
        atom: id,
        linked: atom.content.includes(`](/${guideSlug})`),
      });
    };

    for (const bridge of bridges) {
      const entry = (bridge.frontmatter.entry_atoms ?? []) as string[];
      for (const id of entry) {
        // Same concept, two pages: the slugs are the same string, or one
        // contains the other ("be-present" inside "how-to-be-present").
        if (!(bridge.slug === id || bridge.slug.includes(id) || id.includes(bridge.slug))) continue;
        record(bridge.slug, id);
      }

      /*
       * A guide can also claim a concept through a keyword rather than through
       * its slug, and matching on slugs alone missed those. /del-close targets
       * "harold improv" while the site's Harold page is an atom, and
       * /how-to-read-the-room targets "reading the room" against an atom of
       * that name — neither slug resembles its atom, so both pairs were
       * invisible here. The read-the-room pair had no link in either direction
       * at all.
       *
       * Stripping the words that turn a concept into a search phrase is what
       * makes "harold improv" and "viewpoints technique" resolve onto an id.
       */
      const asId = (keyword: string) =>
        keyword
          .toLowerCase()
          .replace(
            /\b(improv|improvisation|technique|exercise|game|format|meaning|definition)\b/g,
            " ",
          )
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      for (const { keyword } of bridge.frontmatter.target_keywords ?? []) {
        const id = asId(String(keyword));
        if (id) record(bridge.slug, id);
      }
    }

    // The pairing rule finding nothing would make this pass on an empty set.
    // Seven come from slug matching; the keyword rule adds the rest.
    expect(pairs.length).toBeGreaterThanOrEqual(9);

    const unlinked = pairs.filter((p) => !p.linked).map((p) => `${p.atom} -> /${p.guide}`);
    expect(unlinked).toEqual([]);
  });
});
