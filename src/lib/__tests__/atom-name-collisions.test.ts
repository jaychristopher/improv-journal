import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/**
 * No two atoms may answer to the same name.
 *
 * An atom's id is unique by construction; its title and aliases are not, and
 * three different mechanisms read them. The autolinker turns a title in prose
 * into a link, and when two atoms share one it keeps whichever file loaded
 * first — glob order, not a rule. The schema emits aliases as alternateName,
 * so an alias that duplicates a neighbour's title claims a synonymy. And the
 * search index carries both under the shared word.
 *
 * Five names had two holders when this was written (novel-insights entry
 * 178, 2026-09-21), and every pair was a linked neighbour: "Organic Opening"
 * was the title of a technique and of the exercise that `illustrates` it;
 * "Callback" was an atom and the alias of `reincorporation`, which
 * `contrasts` it, so the schema said they were one thing while the graph
 * said they differ; "Sweep edit" was an atom and an alias of `editing`;
 * "Blocking" was an atom and an alias of the taxonomy that catalogues it.
 * Four were fixed by retitling the exercise and dropping the aliases. The
 * fifth remains below.
 */

/**
 * Names still held by more than one atom, as `name → holders`.
 *
 * "denial" is a genuine shared synonym: `blocking` is the failure and
 * `blocking-taxonomy` the catalogue of its forms, and a reader who searched
 * "denial" is served by either. Recorded 2026-09-21; the set may shrink but
 * not grow.
 */
const KNOWN_COLLISIONS: Record<string, string[]> = {
  denial: ["blocking", "blocking-taxonomy"],
};

const normalise = (name: string) => name.trim().toLowerCase();

describe("atom name collisions", () => {
  it("no title or alias equals another atom's title or alias", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const holders = new Map<string, Set<string>>();
    for (const atom of atoms) {
      const names = [atom.frontmatter.title, ...(atom.frontmatter.aliases ?? [])];
      for (const name of names) {
        const key = normalise(name);
        const set = holders.get(key) ?? new Set<string>();
        set.add(atom.frontmatter.id);
        holders.set(key, set);
      }
    }
    // Guard the guard: aliases must still be loaded for the alias half to mean anything.
    expect([...holders.keys()].length).toBeGreaterThan(atoms.length);

    const collisions: Record<string, string[]> = {};
    for (const [name, ids] of holders) {
      if (ids.size > 1) collisions[name] = [...ids].sort();
    }

    expect(collisions).toEqual(KNOWN_COLLISIONS);
  });
});
