import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { loadImprovGames } from "../games";

describe("improv games collection", () => {
  it("includes every exercise", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    const games = await loadImprovGames();

    for (const exercise of exercises) {
      expect(
        games.some((g) => g.id === exercise.frontmatter.id),
        exercise.frontmatter.id,
      ).toBe(true);
    }
  });

  it("includes short-form formats, which are games", async () => {
    const ids = (await loadImprovGames()).map((g) => g.id);
    expect(ids).toContain("freeze-tag");
    expect(ids).toContain("scenes-from-a-hat");
    expect(ids).toContain("theatresports");
  });

  it("excludes long-form structures, which are not games", async () => {
    const ids = (await loadImprovGames()).map((g) => g.id);
    for (const longform of ["harold", "armando", "la-ronde", "montage", "two-person-longform"]) {
      expect(ids, longform).not.toContain(longform);
    }
  });

  it("takes membership from the shortform tag, not a hardcoded list", async () => {
    const atoms = await loadAtoms();
    const games = await loadImprovGames();

    for (const game of games.filter((g) => g.kind === "format")) {
      const atom = atoms.find((a) => a.frontmatter.id === game.id)!;
      expect(atom.frontmatter.tags).toContain("shortform");
    }
  });

  it("gives every game a real description, not a truncated fragment", async () => {
    const thin = (await loadImprovGames())
      .filter((g) => g.description.length < 40)
      .map((g) => `${g.id} (${g.description.length})`);

    expect(thin).toEqual([]);
    for (const game of await loadImprovGames()) {
      expect(game.description.endsWith("...") && game.description.length < 60).toBe(false);
    }
  });

  it("resolves every game to its canonical url", async () => {
    for (const game of await loadImprovGames()) {
      const prefix = game.kind === "exercise" ? "/practice/exercises/" : "/practice/formats/";
      expect(game.href).toBe(`${prefix}${game.id}`);
    }
  });
});
