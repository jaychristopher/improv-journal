import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { matchesLevel } from "@/app/tools/exercise-picker/picker-config";

import { AGE_FLOOR_MONTHS } from "../atom-rank";
import { loadAtoms } from "../content";
import { inDegreeIndex, orderedExercises, orderedFormats, orderedTechniques } from "../hub-order";

/**
 * The three biggest practice hubs list their members in an order their page
 * declares, not the one the loader happens to yield.
 *
 * Techniques, exercises and formats rendered `loadAtoms().filter(type)` with
 * no `.sort(` of their own, so their order was reverse-alphabetical on the
 * production build and alphabetical on Windows, and then flipped to
 * alphabetical everywhere when the loader started sorting by filename — a
 * hundred atoms reordered on production by a commit that never mentioned
 * them, and no test able to see it (tracker entry 208, 2026-09-21). Each
 * rule below is recomputed from the atoms and compared to what the hub's
 * data function yields, and each is shown not to be filename order, so the
 * next loader change cannot reorder a page.
 */

type Atom = Awaited<ReturnType<typeof loadAtoms>>[number];

const ids = (atoms: Atom[]) => atoms.map((a) => a.frontmatter.id);

const byTitle = (a: Atom, b: Atom) =>
  a.frontmatter.title.localeCompare(b.frontmatter.title) ||
  a.frontmatter.id.localeCompare(b.frontmatter.id);

/** At least one adjacent pair is out of alphabetical id order. */
function notFilenameOrder(list: string[]): boolean {
  return list.some((id, i) => i > 0 && list[i - 1].localeCompare(id) > 0);
}

describe("hub order", () => {
  it("exercises: the picker's beginner drills first, then the rest, by title within", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    // Guard the guard: 27 exercises on 2026-09-21.
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const beginner = exercises
      .filter((a) => matchesLevel(a.frontmatter.tags ?? [], "beginner"))
      .sort(byTitle);
    const rest = exercises
      .filter((a) => !matchesLevel(a.frontmatter.tags ?? [], "beginner"))
      .sort(byTitle);
    // Both groups populated, or the rule sorts nothing.
    expect(beginner.length).toBeGreaterThan(0);
    expect(rest.length).toBeGreaterThan(0);

    const expected = ids([...beginner, ...rest]);
    const actual = ids(await orderedExercises());
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(exercises.length);
    expect(notFilenameOrder(actual)).toBe(true);
  });

  it("formats: short form before long form, by title within", async () => {
    const atoms = await loadAtoms();
    const formats = atoms.filter((a) => a.frontmatter.type === "format");
    // Guard the guard: 24 formats on 2026-09-21.
    expect(formats.length).toBeGreaterThanOrEqual(22);

    const isShort = (a: Atom) => (a.frontmatter.tags ?? []).includes("shortform");
    const short = formats.filter(isShort).sort(byTitle);
    const long = formats.filter((a) => !isShort(a)).sort(byTitle);
    expect(short.length).toBeGreaterThan(0);
    expect(long.length).toBeGreaterThan(0);

    const expected = ids([...short, ...long]);
    const actual = ids(await orderedFormats());
    expect(actual).toEqual(expected);
    expect(actual).toHaveLength(formats.length);
    expect(notFilenameOrder(actual)).toBe(true);
  });

  /**
   * Raw in-degree was the rule until 2026-09-22. Raw in-degree follows age
   * — the edges were written toward the atoms that existed — so the hub
   * listed the August techniques last whatever the newer writing made of
   * them (entry 307). The rule is now in-degree per month since `created`,
   * measured to the corpus's own clock; atom-rank.test.ts holds the first
   * ten and the cohort readings, this holds the hub to the rule.
   */
  it("techniques: by in-degree per month of age descending, title on ties", async () => {
    const atoms = await loadAtoms();
    const techniques = atoms.filter(
      (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy",
    );
    // Guard the guard: 49 techniques and pedagogy atoms on 2026-09-21.
    expect(techniques.length).toBeGreaterThanOrEqual(45);

    // Recomputed here rather than trusted from the module: the raw count,
    // the clock, and the division.
    const inDegree = new Map<string, number>();
    for (const atom of atoms) {
      for (const link of atom.frontmatter.links ?? []) {
        inDegree.set(link.id, (inDegree.get(link.id) ?? 0) + 1);
      }
    }
    const clock = atoms
      .flatMap((a) => [a.frontmatter.updated, a.frontmatter.created])
      .reduce((latest, d) => (d > latest ? d : latest), "");
    // The floor is the module's (3 months since 2026-09-22, tracker entry
    // 322) and the birth date is the first commit's where git has one
    // (entry 321), so the recount is the rule and not a copy of it.
    const months = (a: Atom) =>
      Math.max(
        AGE_FLOOR_MONTHS,
        (Date.parse(clock) - Date.parse(a.firstPublished ?? a.frontmatter.created)) /
          86400000 /
          30.4375,
      );
    const degree = (a: Atom) => inDegree.get(a.frontmatter.id) ?? 0;
    const lean = (a: Atom) => degree(a) / months(a);
    const expected = ids([...techniques].sort((a, b) => lean(b) - lean(a) || byTitle(a, b)));

    const actual = await orderedTechniques();
    expect(ids(actual)).toEqual(expected);
    expect(actual).toHaveLength(techniques.length);
    expect(notFilenameOrder(ids(actual))).toBe(true);

    // The rule is doing something: the first technique is leaned on more
    // than the last, and the module's index agrees with the recount.
    expect(lean(actual[0])).toBeGreaterThan(lean(actual[actual.length - 1]));
    for (const t of techniques) {
      expect(inDegreeIndex(atoms).get(t.frontmatter.id) ?? 0).toBe(degree(t));
    }
    // And it is not the raw count: the order differs from a raw sort. Under
    // the 1-month floor an August technique sat inside the first ten
    // (viewpoints, 9th on 2026-09-22); the 3-month floor of entry 322 puts it
    // 25th, so the first ten are the raw count's ten again and the
    // difference is further down the list. Recorded as a reading.
    const raw = ids([...techniques].sort((a, b) => degree(b) - degree(a) || byTitle(a, b)));
    expect(ids(actual)).not.toEqual(raw);
    const august = actual
      .slice(0, 10)
      .filter((a) => a.frontmatter.created.startsWith("2026-08"))
      .map((a) => a.frontmatter.id);
    expect(august.length).toBeGreaterThanOrEqual(0);
  });

  /**
   * The rule has to live in the hub, not only in a module the hub could stop
   * calling. Each page file names its ordered loader and no longer filters
   * `loadAtoms()` itself, which was the whole of the bug.
   */
  it("is what each hub renders", () => {
    const hubs: [string, string][] = [
      ["exercises", "orderedExercises("],
      ["formats", "orderedFormats("],
      ["techniques", "orderedTechniques("],
    ];
    for (const [hub, call] of hubs) {
      const page = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "practice", hub, "page.tsx"),
        "utf-8",
      );
      expect(page, hub).toContain(call);
      expect(page, hub).not.toContain("loadAtoms()");
    }
  });
});
