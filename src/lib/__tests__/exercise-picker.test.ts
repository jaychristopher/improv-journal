import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  EXERCISE_FOCUS_MAP,
  exerciseFocuses,
  FOCUSES,
  LEVELS,
  matchesLevel,
} from "@/app/tools/exercise-picker/picker-config";

import sitemap from "../../app/sitemap";
import { loadAtoms } from "../content";
import {
  getIndexableCombinations,
  getPickerExercises,
  getPopulatedCombinations,
  isIndexableCombination,
  isPopulated,
  loadPickerExercises,
  MIN_INDEXABLE_EXERCISES,
} from "../exercise-picker";

/**
 * The focus registry, checked against the content it enumerates.
 *
 * EXERCISE_FOCUS_MAP was a hand list of 17 ids, held as two identical copies
 * (picker-config and the client component), and the population it described
 * was 27: the ten games added in August were entered in neither copy, so the
 * picker could offer them only through whatever focus tags they happened to
 * carry, and no test read the map at all. Focuses are now derived from each
 * exercise's own frontmatter with the hand map as an override; this guards
 * the derivation against the next cohort, and the population against a
 * changed filter passing on nothing.
 */
describe("exercise focus coverage", () => {
  it("offers every exercise atom under at least one focus", async () => {
    const exercises = await loadPickerExercises();
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const offered = new Set<string>();
    for (const level of LEVELS) {
      for (const focus of FOCUSES) {
        for (const ex of await getPickerExercises(level.slug, focus.tag, focus.extraTags)) {
          offered.add(ex.id);
        }
      }
    }

    const unreachable = exercises.map((e) => e.id).filter((id) => !offered.has(id));
    expect(unreachable).toEqual([]);
  });

  it("derives a focus for every exercise the hand map leaves out", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    const unmapped = exercises.filter((a) => !(a.frontmatter.id in EXERCISE_FOCUS_MAP));
    // The hand map stops at the April cohort; the derivation has to carry
    // everything after it, so the case it exists for must be present.
    expect(unmapped.length).toBeGreaterThanOrEqual(10);

    const focusTags = new Set(FOCUSES.flatMap((f) => [f.tag, ...f.extraTags]));
    for (const atom of unmapped) {
      const focuses = exerciseFocuses(
        atom.frontmatter.id,
        atom.frontmatter.tags ?? [],
        atom.frontmatter.links,
      );
      expect(focuses.length, atom.frontmatter.id).toBeGreaterThan(0);
      for (const focus of focuses) expect(focusTags.has(focus), focus).toBe(true);
    }
  });

  it("keeps the hand map as an override, not a second source", () => {
    // A mapped exercise gets exactly its mapped focuses plus its own focus
    // tags — the derivation must not widen a hand entry, or the picker's
    // results for the seventeen it covers would change underneath it.
    expect(
      exerciseFocuses(
        "space-work-scene",
        ["exercises", "beginner", "physicality"],
        [
          { id: "be-present", relation: "requires" },
          { id: "commitment", relation: "requires" },
        ],
      ),
    ).toEqual(["physicality"]);

    // An unmapped exercise reads what it illustrates first, and only what it
    // requires when it illustrates nothing the table knows.
    expect(
      exerciseFocuses(
        "new-game",
        ["exercises"],
        [
          { id: "be-present", relation: "illustrates" },
          { id: "commitment", relation: "requires" },
        ],
      ),
    ).toEqual(["presence"]);
    expect(
      exerciseFocuses("new-game", ["exercises"], [{ id: "commitment", relation: "requires" }]),
    ).toEqual(["courage"]);
    // Opposition is not training.
    expect(
      exerciseFocuses("new-game", ["exercises"], [{ id: "be-brave", relation: "contrasts" }]),
    ).toEqual([]);
  });

  /**
   * A format's prerequisites are not its purpose.
   *
   * 19 of 24 formats `require` commitment, and the `requires` fallback read
   * that as the focus of 13 of the 14 short forms on /improv-games (tracker
   * entry 203, 2026-09-21). For a format the fallback is off: tags, the hand
   * map and `illustrates` still count, and a format with none of those gets
   * nothing here — the games hub files it under its own facet. The default
   * type is exercise, so every picker call site keeps its answer.
   */
  it("reads no requires edge for a format", () => {
    const links = [
      { id: "commitment", relation: "requires" as const },
      { id: "ensemble", relation: "requires" as const },
    ];
    expect(exerciseFocuses("micetro", [], links, "format")).toEqual([]);
    // The same edges on an exercise still fall through to requires.
    expect(exerciseFocuses("micetro", [], links, "exercise")).toEqual(["courage", "ensemble"]);
    expect(exerciseFocuses("micetro", [], links)).toEqual(["courage", "ensemble"]);

    // What a format declares is still read: a tag, an illustrates edge, the hand map.
    expect(exerciseFocuses("freeze-tag", ["shortform", "physicality"], links, "format")).toEqual([
      "physicality",
    ]);
    expect(
      exerciseFocuses(
        "two-headed-expert",
        [],
        [...links, { id: "group-mind", relation: "illustrates" }],
        "format",
      ),
    ).toEqual(["ensemble"]);
    expect(exerciseFocuses("mirroring", [], links, "format")).toEqual(EXERCISE_FOCUS_MAP.mirroring);
  });

  it("offers no format through the picker", async () => {
    // The formats facet is the hub's, not the picker's: every picker surface
    // filters to exercise atoms, so `formats` never needs a picker page.
    const exercises = await loadPickerExercises();
    expect(exercises.length).toBeGreaterThanOrEqual(25);
    const atoms = await loadAtoms();
    for (const ex of exercises) {
      expect(atoms.find((a) => a.frontmatter.id === ex.id)?.frontmatter.type, ex.id).toBe(
        "exercise",
      );
      expect(ex.focuses, ex.id).not.toContain("formats");
    }
    expect(FOCUSES.map((f) => f.tag)).not.toContain("formats");
  });

  it("holds the focus map in one place", () => {
    // The client component carried a byte-identical copy of the map, and the
    // two agreed until content was added to neither. It now receives focuses
    // from the server and must not grow its own registry back.
    const client = fs.readFileSync(
      path.join(
        process.cwd(),
        "src",
        "app",
        "tools",
        "exercise-picker",
        "ExercisePickerClient.tsx",
      ),
      "utf-8",
    );
    expect(client).not.toMatch(/EXERCISE_FOCUS_MAP|"mirroring":|mirroring: \[/);
  });
});

/**
 * The level rule, checked against the exercises it sorts.
 *
 * `fundamentals` is carried by the ten August warm-up games and by two April
 * drills, and the picker read it as "every level": the advanced level page
 * listed Zip Zap Zop, Big Booty and Pass the Clap directly beneath an
 * orientation paragraph that says "Do not use these as a warm-up", and
 * advanced/presence was seven circle games out of nine (tracker entry 56,
 * 2026-09-21). The rule is now foundational-not-universal, and the client
 * component reads the same function rather than its own copy.
 */
describe("exercise picker levels", () => {
  it("reads fundamentals as foundational, not as every level", () => {
    expect(matchesLevel(["exercises", "fundamentals"], "beginner")).toBe(true);
    expect(matchesLevel(["exercises", "fundamentals"], "intermediate")).toBe(true);
    expect(matchesLevel(["exercises", "fundamentals"], "advanced")).toBe(false);
    expect(matchesLevel(["exercises", "advanced"], "advanced")).toBe(true);
    expect(matchesLevel(["exercises", "beginner"], "advanced")).toBe(false);
  });

  it("offers no warm-up game at advanced", async () => {
    const exercises = await loadPickerExercises();
    const warmUps = exercises.filter((e) => e.tags.includes("warm-up"));
    // Guard the guard: the August cohort is ten games tagged warm-up.
    expect(warmUps.length).toBeGreaterThanOrEqual(10);

    const advanced = exercises.filter((e) => matchesLevel(e.tags, "advanced"));
    expect(advanced.length).toBeGreaterThanOrEqual(4);
    expect(advanced.filter((e) => e.tags.includes("warm-up")).map((e) => e.id)).toEqual([]);

    // The games are still offered where they belong, so the rule narrowed
    // rather than dropped them.
    const beginner = exercises.filter((e) => matchesLevel(e.tags, "beginner"));
    for (const game of warmUps) expect(beginner.map((e) => e.id)).toContain(game.id);
  });

  it("holds the level rule in one place", () => {
    const client = fs.readFileSync(
      path.join(
        process.cwd(),
        "src",
        "app",
        "tools",
        "exercise-picker",
        "ExercisePickerClient.tsx",
      ),
      "utf-8",
    );
    // The client used to decide levels itself, with the universal reading.
    expect(client).not.toMatch(/includes\("fundamentals"\)\) return true/);
    expect(client).toMatch(/matchesLevel as matchesLevelTags/);
  });
});

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

/**
 * The index rule, checked against what it removes.
 *
 * "A facet is indexable when it holds two drills its populated siblings do
 * not" was written for thin facets, and on the September content it fired on
 * the head instead: beginner/ensemble and intermediate/ensemble list the same
 * eleven warm-ups (the `fundamentals` rule admits them at both levels), so
 * each had nothing distinct against the other and both were noindex — the
 * two fullest picker pages on the site, and the one focus a search for
 * "ensemble improv exercises" could not land on (tracker entry 241,
 * 2026-09-21). The comparison now runs upward only, so the lower of two
 * near-duplicates is kept and the upper is the copy. These tests read the
 * rule against the live content, so the next content change that empties a
 * focus out of the index fails here rather than in Search Console.
 */
describe("exercise picker indexability", () => {
  async function facetSizes() {
    const sizes = new Map<string, Map<string, number>>();
    for (const focus of FOCUSES) {
      const byLevel = new Map<string, number>();
      for (const level of LEVELS) {
        const exercises = await getPickerExercises(level.slug, focus.tag, focus.extraTags);
        byLevel.set(level.slug, exercises.length);
      }
      sizes.set(focus.slug, byLevel);
    }
    return sizes;
  }

  it("indexes every well-populated focus at some level", async () => {
    const sizes = await facetSizes();
    const wellPopulated = FOCUSES.filter((f) =>
      [...sizes.get(f.slug)!.values()].some((n) => n >= 5),
    );
    // Guard the guard: presence, ensemble and courage clear five today, and a
    // derivation change that emptied them all would pass a vacuous loop.
    expect(wellPopulated.map((f) => f.slug)).toEqual(
      expect.arrayContaining(["presence", "ensemble", "courage"]),
    );

    for (const focus of wellPopulated) {
      const indexedAt: string[] = [];
      for (const level of LEVELS) {
        if (await isIndexableCombination(level.slug, focus.slug)) indexedAt.push(level.slug);
      }
      expect(indexedAt.length, `${focus.slug} is indexed at no level`).toBeGreaterThan(0);
    }
  });

  it("keeps the lower of two near-duplicate facets", async () => {
    // The case that failed: the same eleven at two levels. Beginner is the
    // audience the site routes, so it is the one that survives.
    const sizes = await facetSizes();
    expect(sizes.get("ensemble")!.get("beginner")).toBeGreaterThanOrEqual(10);
    expect(sizes.get("ensemble")!.get("intermediate")).toBeGreaterThanOrEqual(10);

    expect(await isIndexableCombination("beginner", "ensemble")).toBe(true);
    expect(await isIndexableCombination("intermediate", "ensemble")).toBe(false);
    // Advanced ensemble shares nothing with beginner, so it earns its own place.
    expect(await isIndexableCombination("advanced", "ensemble")).toBe(true);
  });

  it("still indexes an upper facet that genuinely adds to the one beneath", async () => {
    // Intermediate courage holds two drills beginner courage does not, which
    // is the distinct rule's floor; the rule change must not have collapsed
    // every focus to its lowest level.
    expect(await isIndexableCombination("beginner", "courage")).toBe(true);
    expect(await isIndexableCombination("intermediate", "courage")).toBe(true);
    // And a thin lower sibling does not absorb an upper one: beginner/recovery
    // holds one drill and is not indexed, so intermediate/recovery stands alone.
    expect(await isIndexableCombination("beginner", "recovery")).toBe(false);
    expect(await isIndexableCombination("intermediate", "recovery")).toBe(true);
  });

  it("never indexes a facet under the count gate", async () => {
    for (const level of LEVELS) {
      for (const focus of FOCUSES) {
        const exercises = await getPickerExercises(level.slug, focus.tag, focus.extraTags);
        if (exercises.length < MIN_INDEXABLE_EXERCISES) {
          expect(
            await isIndexableCombination(level.slug, focus.slug),
            `${level.slug}/${focus.slug}`,
          ).toBe(false);
        }
      }
    }
    expect(await isIndexableCombination("nope", "presence")).toBe(false);
    expect(await isIndexableCombination("beginner", "nope")).toBe(false);
  });

  it("agrees with the sitemap on which facets are indexed", async () => {
    const live: string[] = [];
    for (const level of LEVELS) {
      for (const focus of FOCUSES) {
        if (await isIndexableCombination(level.slug, focus.slug)) {
          live.push(`/tools/exercise-picker/${level.slug}/${focus.slug}`);
        }
      }
    }
    // Seven on the September content; the floor is there so an emptied rule
    // cannot agree with an emptied sitemap.
    expect(live.length).toBeGreaterThanOrEqual(6);

    const listed = (await getIndexableCombinations()).map(
      (c) => `/tools/exercise-picker/${c.level}/${c.focus}`,
    );
    expect(listed.sort()).toEqual(live.sort());

    const inSitemap = (await sitemap())
      .map((entry) => new URL(entry.url).pathname.replace(/\/+$/, ""))
      .filter((p) => /^\/tools\/exercise-picker\/[^/]+\/[^/]+$/.test(p));
    expect(inSitemap.sort()).toEqual(live);
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
