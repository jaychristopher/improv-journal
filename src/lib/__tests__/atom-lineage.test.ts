import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lineageOf, schoolHandoffOf } from "../atom-lineage";
import { getAtomsForTradition, getAtomUrl, loadAtoms } from "../content";
import { TRADITION_IDS } from "../tradition-guides";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The lineage line on concept pages (tracker entry 331, 2026-09-22).
 *
 * A concept is in a school's set when it cites one of the school's works
 * (`getAtomsForTradition`), and the tradition page lists it on that basis;
 * nothing on the concept's page said so unless its prose happened to name
 * the founder in a form the linker routes to the school. `lineageOf` derives
 * the line from the same edge. Measured when it shipped: 133 concepts in at
 * least one school's set, 30 drills and formats among them; Spolin's set
 * holds 12 of the 30 drills, the most of the 5 schools.
 */
describe("atom lineage", () => {
  it("names a school for every concept in a school's set, and no other", async () => {
    const atoms = await loadAtoms();
    // Guard the guard.
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const withLineage: string[] = [];
    const drills: string[] = [];
    for (const atom of atoms) {
      const lineage = await lineageOf(atom.frontmatter.id);
      if (lineage.length === 0) continue;
      withLineage.push(atom.frontmatter.id);
      if (atom.frontmatter.type === "exercise" || atom.frontmatter.type === "format") {
        drills.push(atom.frontmatter.id);
      }
      for (const entry of lineage) {
        expect(TRADITION_IDS).toContain(entry.id);
        expect(entry.href).toBe(`/traditions/${entry.id}`);
        expect(entry.label.length).toBeGreaterThan(0);
      }
      // A reference atom is a work, not a concept with a lineage.
      expect(atom.frontmatter.type).not.toBe("reference");
    }
    // 133 on 2026-09-22.
    expect(withLineage.length).toBeGreaterThanOrEqual(25);
    // 30 on 2026-09-22: the drills and formats with a provenance edge.
    expect(drills.length).toBeGreaterThanOrEqual(28);

    // The line is the tradition page's set read from the other end: every
    // member of a school's set carries that school, and nothing else does.
    for (const tradition of TRADITION_IDS) {
      const set = new Set((await getAtomsForTradition(tradition)).map((a) => a.frontmatter.id));
      expect(set.size).toBeGreaterThan(0);
      for (const atom of atoms) {
        const carries = (await lineageOf(atom.frontmatter.id)).some((l) => l.id === tradition);
        expect(carries, `${atom.frontmatter.id} / ${tradition}`).toBe(set.has(atom.frontmatter.id));
      }
    }
  });

  it("gives Spolin's drills the school her prose never reached", async () => {
    const atoms = await loadAtoms();
    const spolinDrills: string[] = [];
    for (const atom of atoms) {
      if (atom.frontmatter.type !== "exercise" && atom.frontmatter.type !== "format") continue;
      const lineage = await lineageOf(atom.frontmatter.id);
      if (lineage.some((l) => l.id === "spolin")) spolinDrills.push(atom.frontmatter.id);
    }
    // 12 on 2026-09-22, the most of the 5 schools; Mirroring is the case
    // the tracker names.
    expect(spolinDrills.length).toBeGreaterThanOrEqual(10);
    expect(spolinDrills).toContain("mirroring");
    expect(await lineageOf("no-such-atom")).toEqual([]);
  });

  it("hands the 2 biography guides up to their schools", () => {
    expect(schoolHandoffOf("viola-spolin")).toMatchObject({
      id: "spolin",
      href: "/traditions/spolin",
    });
    expect(schoolHandoffOf("del-close")).toMatchObject({ id: "close", href: "/traditions/close" });
    expect(schoolHandoffOf("viola-spolin")!.label.length).toBeGreaterThan(0);
    // A guide that is not a founder's page has no school line, and the
    // schools that have no biography guide hand nothing off.
    expect(schoolHandoffOf("rules-of-improv")).toBeNull();
    expect(schoolHandoffOf("theatre-games")).toBeNull();
  });

  /**
   * AtomDetail mounts `LineageLine` beside the lesson context since
   * 2026-09-22, so this reads the built pages: every concept with a lineage
   * carries `data-atom-lineage`, and no concept without one does. Fails
   * against a build older than the mount; rebuild.
   */
  it.runIf(built)("marks the lineage line on the built concept pages", async () => {
    expect(built).toBe(true);
    const atoms = await loadAtoms();
    let marked = 0;
    let unmarked = 0;
    for (const atom of atoms) {
      if (atom.frontmatter.type === "reference") continue;
      const lineage = await lineageOf(atom.frontmatter.id);
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      const file = path.join(APP, `${url}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      const has = html.includes("data-atom-lineage");
      if (lineage.length > 0) {
        expect(has, `${atom.frontmatter.id} has a lineage and no line`).toBe(true);
        marked++;
      } else {
        expect(has, `${atom.frontmatter.id} has a line and no lineage`).toBe(false);
        unmarked++;
      }
    }
    expect(marked).toBeGreaterThanOrEqual(10);
    expect(unmarked).toBeGreaterThanOrEqual(10);
  });
});
