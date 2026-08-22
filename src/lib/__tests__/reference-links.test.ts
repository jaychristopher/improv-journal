import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

async function references() {
  return (await loadAtoms()).filter((a) => a.frontmatter.type === "reference");
}

describe("reference relations", () => {
  it("every reference declares the concepts it informs", async () => {
    const bare = (await references())
      .filter((a) => (a.frontmatter.links ?? []).length === 0)
      .map((a) => a.frontmatter.id);

    expect(bare).toEqual([]);
  });

  it("those references resolve to real, non-reference atoms", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));
    const broken: string[] = [];

    for (const ref of await references()) {
      for (const link of ref.frontmatter.links ?? []) {
        const target = byId.get(link.id);
        if (!target) broken.push(`${ref.frontmatter.id} -> ${link.id} (missing)`);
        else if (target.frontmatter.type === "reference") {
          broken.push(`${ref.frontmatter.id} -> ${link.id} (reference)`);
        }
      }
    }

    expect(broken).toEqual([]);
  });

  /**
   * Each reference used to repeat its frontmatter links as a prose line at the
   * foot of the entry, left to the auto-linker to turn into links — which
   * matches on title text and so caught almost none of them. The frontmatter is
   * the source now; the prose mirror should not come back.
   */
  it("does not repeat its links as prose", async () => {
    const offenders = (await references())
      .filter((a) => /\*\*Referenced by atoms:\*\*/.test(a.content))
      .map((a) => a.frontmatter.id);

    expect(offenders).toEqual([]);
  });

  it("keeps a reference's own concepts distinct from the atoms citing it", async () => {
    const atoms = await loadAtoms();

    for (const ref of await references()) {
      const informs = new Set((ref.frontmatter.links ?? []).map((l) => l.id));
      const citing = atoms
        .filter(
          (a) =>
            a.frontmatter.type !== "reference" &&
            a.frontmatter.links?.some((l) => l.id === ref.frontmatter.id),
        )
        .map((a) => a.frontmatter.id)
        .filter((id) => !informs.has(id));

      // The page renders these as two lists; nothing may appear in both.
      expect(citing.filter((id) => informs.has(id))).toEqual([]);
    }
  });
});
