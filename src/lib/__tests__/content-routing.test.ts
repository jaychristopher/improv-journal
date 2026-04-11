import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms } from "../content";

describe("content routing completeness", () => {
  it("every atom has a URL that starts with /how-it-works/, /practice/, or /library/", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThan(100); // sanity check

    for (const atom of atoms) {
      const url = getAtomUrl({
        id: atom.frontmatter.id,
        type: atom.frontmatter.type,
      });
      expect(url, `${atom.frontmatter.id} (${atom.frontmatter.type})`).toMatch(
        /^\/(how-it-works|practice|library)\//,
      );
    }
  });

  it("law atoms route to /how-it-works/{id}", async () => {
    const atoms = await loadAtoms();
    const laws = atoms.filter((a) => a.frontmatter.type === "law");
    expect(laws.length).toBe(6);
    for (const a of laws) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toBe(
        `/how-it-works/${a.frontmatter.id}`,
      );
    }
  });

  it("principle atoms route to /how-it-works/principles/{id}", async () => {
    const atoms = await loadAtoms();
    const principles = atoms.filter((a) => a.frontmatter.type === "principle");
    expect(principles.length).toBe(8);
    for (const a of principles) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toBe(
        `/how-it-works/principles/${a.frontmatter.id}`,
      );
    }
  });

  it("exercise atoms route to /practice/exercises/{id}", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    expect(exercises.length).toBeGreaterThanOrEqual(17);
    for (const a of exercises) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toBe(
        `/practice/exercises/${a.frontmatter.id}`,
      );
    }
  });

  it("reference atoms route to /library/{id}", async () => {
    const atoms = await loadAtoms();
    const refs = atoms.filter((a) => a.frontmatter.type === "reference");
    expect(refs.length).toBeGreaterThanOrEqual(14);
    for (const a of refs) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toBe(
        `/library/${a.frontmatter.id}`,
      );
    }
  });

  it("no two different atoms produce the same URL", async () => {
    const atoms = await loadAtoms();
    const urls = atoms.map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }));
    const unique = new Set(urls);
    expect(unique.size).toBe(urls.length);
  });
});
