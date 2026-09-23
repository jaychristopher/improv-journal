import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { ATOM_TYPE_NAMES, countAtomTypes } from "../../app/about/atom-types";
import { loadAtoms } from "../content";

/**
 * The About page names every kind of atom the schema defines.
 *
 * It used to list five by hand — "principles, techniques, exercises,
 * definitions, and failure patterns" — the type system as it stood in April.
 * Seven of the twelve were missing, including the laws the site is named
 * for and every type added since. A list written in prose cannot be checked,
 * so the page now renders from `ATOM_TYPE_NAMES`, keyed by `AtomType`; the
 * compiler makes a missing key an error, and this reads the union out of
 * `schema.ts` as text so the check is against the schema's own list rather
 * than the constant's idea of it.
 */
describe("About page atom types", () => {
  const schema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.ts"), "utf-8");
  const union = /export type AtomType =([\s\S]*?);/.exec(schema)?.[1] ?? "";
  const schemaTypes = [...union.matchAll(/"([a-z]+)"/g)].map((m) => m[1]).sort();

  it("names exactly the types in schema.ts", () => {
    // Guards the regex: a reshaped union that matched nothing would otherwise
    // let an empty list pass against an empty list.
    expect(schemaTypes.length).toBeGreaterThanOrEqual(12);
    expect(Object.keys(ATOM_TYPE_NAMES).sort()).toEqual(schemaTypes);
  });

  it("gives every type a distinct, plural, reader-facing name", () => {
    const names = Object.values(ATOM_TYPE_NAMES);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name, name).toMatch(/^[a-z][a-z ]+s$/);
    }
  });

  it("counts every atom under one of the names, and no name is empty", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const counted = countAtomTypes(atoms);
    expect(counted.map((k) => k.type).sort()).toEqual(schemaTypes);
    expect(counted.reduce((sum, k) => sum + k.count, 0)).toBe(atoms.length);
    // A kind with nothing in it would render "0 insights" on the About page —
    // true, but the kind of true that should be a deliberate decision.
    expect(counted.filter((k) => k.count === 0).map((k) => k.type)).toEqual([]);
  });

  it("is what the About page renders from", () => {
    // The constant is only a guard if the page reads it. knip would flag an
    // unused export, but not one that the page imported and then stopped
    // rendering.
    const page = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "about", "page.tsx"),
      "utf-8",
    );
    expect(page).toMatch(/countAtomTypes\(atoms\)/);
    expect(page).toMatch(/kinds\.map\(/);
    // And the hand-written list is gone.
    expect(page).not.toMatch(/principles,\s*techniques,\s*exercises,\s*definitions/);
  });
});
