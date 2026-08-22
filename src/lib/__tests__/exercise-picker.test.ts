import { describe, expect, it } from "vitest";

import { FOCUSES, LEVELS } from "@/app/tools/exercise-picker/picker-config";

import { loadAtoms } from "../content";
import { getPickerExercises, getPopulatedCombinations, isPopulated } from "../exercise-picker";

describe("exercise picker combinations", () => {
  it("never publishes a combination with no exercises", async () => {
    for (const { level, focus } of await getPopulatedCombinations()) {
      const config = FOCUSES.find((f) => f.slug === focus)!;
      const exercises = await getPickerExercises(level, config.tag, config.extraTags);
      expect(exercises.length, `${level}/${focus}`).toBeGreaterThan(0);
    }
  });

  it("excludes exactly the combinations that match nothing", async () => {
    const populated = await getPopulatedCombinations();
    const empty: string[] = [];

    for (const level of LEVELS) {
      for (const focus of FOCUSES) {
        const exercises = await getPickerExercises(level.slug, focus.tag, focus.extraTags);
        const listed = populated.some((c) => c.level === level.slug && c.focus === focus.slug);
        expect(listed, `${level.slug}/${focus.slug}`).toBe(exercises.length > 0);
        if (exercises.length === 0) empty.push(`${level.slug}/${focus.slug}`);
      }
    }

    // These combinations exist as filters but have nothing behind them; they
    // are deliberately not published rather than shipped as empty pages.
    expect(empty.length).toBeGreaterThan(0);
    expect(populated.length + empty.length).toBe(LEVELS.length * FOCUSES.length);
  });

  it("agrees with isPopulated", async () => {
    expect(await isPopulated("beginner", "presence")).toBe(true);
    expect(await isPopulated("beginner", "emotion")).toBe(false);
    expect(await isPopulated("nope", "presence")).toBe(false);
  });

  it("gives every listed exercise a description and a real url", async () => {
    for (const { level, focus } of await getPopulatedCombinations()) {
      const config = FOCUSES.find((f) => f.slug === focus)!;
      for (const ex of await getPickerExercises(level, config.tag, config.extraTags)) {
        expect(ex.href.startsWith("/practice/exercises/")).toBe(true);
        expect(ex.description.length).toBeGreaterThan(30);
      }
    }
  });
});

describe("source references", () => {
  it("only lists real source documents under sources", async () => {
    const atoms = await loadAtoms();
    const referenceIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "reference").map((a) => a.frontmatter.id),
    );

    // A reference belongs in `links`, not `sources`: the sources field renders
    // as /sources/{id}, so a reference id there becomes a dead link.
    const misfiled = atoms.flatMap((a) =>
      (a.frontmatter.sources ?? [])
        .filter((s) => referenceIds.has(s))
        .map((s) => `${a.frontmatter.id}: ${s}`),
    );

    expect(misfiled).toEqual([]);
  });
});
