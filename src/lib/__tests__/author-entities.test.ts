import { describe, expect, it } from "vitest";

import { AUTHOR_SAMEAS } from "../author-entities";
import { loadAtoms } from "../content";

/**
 * The library's authority records stay pointed at real, cited people.
 *
 * These become schema.org sameAs on the author of every cited work, which is
 * what lets a crawler resolve "Anne Bogart" to a person rather than treat it
 * as a string. Two things rot: a key stops matching once an author's name is
 * edited in frontmatter, and the entry then silently does nothing; and a URL
 * can be added for the wrong person, which is worse than none because it
 * asserts a false identity.
 *
 * The name check is the one that catches real drift. The URL shape check
 * cannot verify identity — that was done against the Wikipedia API and each
 * article's own description when the entries were written — but it does catch
 * a malformed or non-authority link.
 */
describe("library author entities", () => {
  it("only names authors the library actually cites", async () => {
    const atoms = await loadAtoms();
    const cited = new Set<string>();
    for (const atom of atoms) {
      for (const name of atom.frontmatter.work?.authors ?? []) cited.add(name);
    }

    // Guards against the extractor matching nothing, which would pass on air.
    expect(cited.size).toBeGreaterThan(20);

    const stale = Object.keys(AUTHOR_SAMEAS).filter((name) => !cited.has(name));
    expect(stale).toEqual([]);
  });

  it("points every record at a Wikipedia article", () => {
    const malformed = Object.entries(AUTHOR_SAMEAS)
      .filter(([, url]) => !/^https:\/\/en\.wikipedia\.org\/wiki\/[^/\s]+$/.test(url))
      .map(([name, url]) => `${name}: ${url}`);
    expect(malformed).toEqual([]);
  });

  it("keeps the disambiguated authors disambiguated", () => {
    // "Ian Roberts" and "Ian Roberts (actor)" are both disambiguation pages —
    // a rugby player, a Guyanese educator, others. Only the American actor is
    // the UCB founder. Matt Walsh has the same problem.
    expect(AUTHOR_SAMEAS["Ian Roberts"]).toContain("(American_actor)");
    expect(AUTHOR_SAMEAS["Matt Walsh"]).toContain("(comedian)");
  });
});
