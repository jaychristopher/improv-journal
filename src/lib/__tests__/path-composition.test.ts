import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { ATOM_TYPE_NAMES } from "@/app/about/atom-types";

import { loadAtoms, loadPaths, loadThreads } from "../content";
import {
  COMPOSITION_TYPE_ORDER,
  formatPathComposition,
  getAudienceComposition,
  getPathComposition,
  typeLabel,
} from "../path-composition";
import type { AtomType } from "../schema";

/**
 * What each path is made of, by atom type, derived from its lessons.
 *
 * Nothing on the site added this up until 2026-09-21: the beginner paths
 * teach the abstract layer (six of nine principles, six of seven laws, no
 * format), the performer paths the concrete one (twenty-six techniques,
 * eight formats), and the teacher paths every law and no drill (tracker
 * entry 249). These keep the row honest: the counts are a partition of the
 * path's distinct atoms, the order is the schema's, and the beginner
 * programme shows the balance the entry measured.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

describe("path composition", () => {
  it("partitions every path's distinct atoms by type, in schema order", async () => {
    const [paths, threads, atoms] = await Promise.all([loadPaths(), loadThreads(), loadAtoms()]);
    expect(paths.length).toBe(11);

    const threadAtoms = new Map(
      threads.map((t) => [t.frontmatter.id, new Set(t.frontmatter.atoms ?? [])]),
    );
    const atomIds = new Set(atoms.map((a) => a.frontmatter.id));
    const order = new Map(COMPOSITION_TYPE_ORDER.map((t, i) => [t, i]));

    for (const p of paths) {
      const id = p.frontmatter.id;
      const composition = await getPathComposition(id);

      // Independently: the union of the lessons' atoms that exist in the corpus.
      const distinct = new Set<string>();
      for (const threadId of p.frontmatter.threads ?? []) {
        for (const a of threadAtoms.get(threadId) ?? []) if (atomIds.has(a)) distinct.add(a);
      }
      const total = composition.reduce((sum, e) => sum + e.count, 0);
      expect(total, `${id}: counts sum to the path's distinct atoms`).toBe(distinct.size);
      expect(total, id).toBeGreaterThan(0);

      // No zero, no repeat, the schema's order, the site's names.
      for (const entry of composition) {
        expect(entry.count, `${id}: ${entry.type}`).toBeGreaterThan(0);
        expect(entry.label, `${id}: ${entry.type}`).toBe(typeLabel(entry.type, entry.count));
      }
      const types = composition.map((e) => e.type);
      expect(new Set(types).size, `${id}: repeated type`).toBe(types.length);
      for (let i = 1; i < types.length; i++) {
        expect(order.get(types[i - 1])!, `${id}: order`).toBeLessThan(order.get(types[i])!);
      }

      // Entry 249: the narrowest path (teacher, 20 atoms) still spans five types.
      expect(types.length, `${id}: breadth`).toBeGreaterThanOrEqual(3);
    }
  });

  it("orders every atom type the schema declares, once", () => {
    const declared = Object.keys(ATOM_TYPE_NAMES) as AtomType[];
    expect([...COMPOSITION_TYPE_ORDER].sort()).toEqual([...declared].sort());
    expect(new Set(COMPOSITION_TYPE_ORDER).size).toBe(COMPOSITION_TYPE_ORDER.length);
  });

  /**
   * Entry 249's beginner row is the union over the five paths declared for
   * beginners, not the beginner programme alone: principles and laws nearly
   * complete, no format, no recovery pattern. The programme by itself is two
   * lessons and five atoms — three techniques, a definition, a failure mode —
   * with no principle, law or drill, which is what its row now shows the
   * reader. Both are asserted so a content change that widens the programme
   * (the entry proposes a format and `fracture-recovery` for the beginner
   * paths) surfaces here rather than passing quietly.
   */
  it("shows the beginner curriculum as principles and laws with no format", async () => {
    const beginner = await getAudienceComposition("beginner");
    const byType = new Map(beginner.map((e) => [e.type, e.count]));
    // Entry 249 (2026-09-21): 6 principles, 6 laws, 0 formats, 0 patterns.
    expect(byType.get("principle")).toBeGreaterThanOrEqual(6);
    expect(byType.get("law")).toBeGreaterThanOrEqual(6);
    expect(byType.has("format")).toBe(false);
    expect(byType.has("pattern")).toBe(false);
    // The row must be able to answer the persona's drill-to-principle question.
    expect(byType.get("exercise")).toBeGreaterThan(0);
    expect(beginner.reduce((sum, e) => sum + e.count, 0)).toBeGreaterThanOrEqual(43);

    // The beginner programme on its own, as its page shows it (2026-09-21):
    // 3 techniques, 1 definition, 1 failure mode. No principle or law yet.
    const programme = await getPathComposition("beginner-foundations");
    expect(programme.map((e) => `${e.count} ${e.label}`)).toEqual([
      "3 techniques",
      "1 definition",
      "1 failure mode",
    ]);
  });

  it("shows the performer curriculum as the concrete layer", async () => {
    const performer = await getAudienceComposition("performer");
    const byType = new Map(performer.map((e) => [e.type, e.count]));
    // Entry 249: 26 techniques, 15 definitions, 8 formats, 3 principles.
    expect(byType.get("technique")).toBeGreaterThanOrEqual(20);
    expect(byType.get("format")).toBeGreaterThanOrEqual(8);
    expect(byType.get("technique")!).toBeGreaterThan(byType.get("principle") ?? 0);
  });

  it("returns nothing for a path that does not exist", async () => {
    expect(await getPathComposition("no-such-path")).toEqual([]);
  });

  it("formats the row with the site's names, in the count's number", () => {
    expect(
      formatPathComposition([
        { type: "principle", label: typeLabel("principle", 6), count: 6 },
        { type: "antipattern", label: typeLabel("antipattern", 1), count: 1 },
      ]),
    ).toBe("6 principles · 1 failure mode");
    expect(formatPathComposition([])).toBe("");
    // Every plural in ATOM_TYPE_NAMES is regular, which is what lets the
    // singular be derived rather than kept in a third map.
    for (const type of Object.keys(ATOM_TYPE_NAMES) as AtomType[]) {
      expect(ATOM_TYPE_NAMES[type], type).toMatch(/[^s]s$/);
      expect(`${typeLabel(type, 1)}s`).toBe(typeLabel(type, 2));
    }
  });

  it.runIf(built)("appears in the header of every built path page", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBe(11);
    for (const p of paths) {
      const id = p.frontmatter.id;
      const html = fs.readFileSync(path.join(APP, "paths", `${id}.html`), "utf-8");
      const composition = await getPathComposition(id);
      const block = html.split("data-path-composition")[1]?.split("</p>")[0] ?? "";
      expect(block, `${id}: composition row`).not.toBe("");
      // Drop the rest of the opening tag's attributes, then any nested markup.
      const text = block
        .slice(block.indexOf(">") + 1)
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      expect(text.replace(/&middot;|&#xB7;|&#183;/g, "·"), id).toBe(
        formatPathComposition(composition),
      );
    }
  });
});
