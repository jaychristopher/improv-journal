import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";

/** Types that render on a concept route. */
const CONCEPT_TYPES = new Set([
  "technique",
  "definition",
  "exercise",
  "format",
  "principle",
  "antipattern",
  "pattern",
  "insight",
  "law",
  "pedagogy",
  "framework",
]);

async function conceptAtoms() {
  const atoms = await loadAtoms();
  return atoms.filter((a) => CONCEPT_TYPES.has(a.frontmatter.type));
}

describe("concept page structure", () => {
  it("gives the body real headings, not bold paragraphs", async () => {
    const atoms = await conceptAtoms();
    expect(atoms.length).toBeGreaterThan(100);

    // Every heading below the H1 used to be navigation the template added.
    // The sections existed only as bold labels, which contribute nothing to
    // the outline Google reads.
    const withoutHeadings = atoms.filter((a) => !/^## /m.test(a.content));
    expect(withoutHeadings.map((a) => a.frontmatter.id)).toHaveLength(1);
  });

  it("does not leave a bold label sitting where a heading belongs", async () => {
    const atoms = await conceptAtoms();
    for (const atom of atoms) {
      const paragraphs = atom.content.split("\n\n").slice(1);
      const labels = paragraphs.filter((p) => /^\*\*[^*\n]{2,60}\*\*:?(\s|$)/.test(p.trim()));
      // A few survive on purpose: labels too long or too sentence-like to be
      // section names. A page full of them means the promotion stopped running.
      expect(labels.length, atom.frontmatter.id).toBeLessThan(4);
    }
  });

  it("renders headings with clean, unique anchor ids", async () => {
    const atoms = await conceptAtoms();
    const sampled = atoms.filter((a) => /^## /m.test(a.content)).slice(0, 40);
    expect(sampled.length).toBeGreaterThan(20);

    for (const atom of sampled) {
      const ids = [...atom.html.matchAll(/<h[2-6][^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
      expect(ids.length, atom.frontmatter.id).toBeGreaterThan(0);
      expect(new Set(ids).size, `duplicate anchor in ${atom.frontmatter.id}`).toBe(ids.length);
      for (const id of ids) {
        expect(id, atom.frontmatter.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      }
    }
  });

  it("keeps the lead paragraph as prose, since every excerpt comes from it", async () => {
    const atoms = await conceptAtoms();
    for (const atom of atoms) {
      const lead = atom.content.split("\n\n")[0].trim();
      expect(lead.startsWith("#"), atom.frontmatter.id).toBe(false);
    }
  });
});
