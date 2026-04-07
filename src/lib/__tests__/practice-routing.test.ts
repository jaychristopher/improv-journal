import { describe, it, expect } from "vitest";
import { loadAtoms, getAtomUrl } from "../content";

describe("practice routing", () => {
  it("all technique + pedagogy atoms route to /practice/techniques/", async () => {
    const atoms = await loadAtoms();
    const techs = atoms.filter(
      (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy"
    );
    expect(techs.length).toBeGreaterThanOrEqual(42);
    for (const a of techs) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toMatch(
        /^\/practice\/techniques\//
      );
    }
  });

  it("all format atoms route to /practice/formats/", async () => {
    const atoms = await loadAtoms();
    const formats = atoms.filter((a) => a.frontmatter.type === "format");
    expect(formats.length).toBe(8);
    for (const a of formats) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toMatch(
        /^\/practice\/formats\//
      );
    }
  });

  it("all definition atoms route to /practice/vocabulary/", async () => {
    const atoms = await loadAtoms();
    const defs = atoms.filter((a) => a.frontmatter.type === "definition");
    expect(defs.length).toBeGreaterThanOrEqual(27);
    for (const a of defs) {
      expect(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })).toMatch(
        /^\/practice\/vocabulary\//
      );
    }
  });
});
