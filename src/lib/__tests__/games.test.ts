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

  /**
   * A game listed without its rules is a link, not a game.
   *
   * "improv games" is the site's most winnable term — 3,100 a month at
   * difficulty 1, with a DR 8 page holding position six on no backlinks — and
   * the hub was answering a different question than the one being asked. Every
   * entry described what the game *trains*, because that is how the atoms open,
   * and none of them said how to play. The pages that win the term all put the
   * rules in the list.
   *
   * So rules are required, and required to be usable: long enough to contain a
   * setup and a constraint, short enough to stay a summary rather than a second
   * copy of the atom's own mechanics section.
   */
  it("tells the reader how to play every game", async () => {
    const games = await loadImprovGames();
    expect(games.length).toBeGreaterThan(25);

    const missing = games.filter((g) => !g.howToPlay?.trim()).map((g) => g.id);
    expect(missing).toEqual([]);

    const wrongLength = games
      .filter((g) => {
        const n = g.howToPlay!.trim().length;
        return n < 60 || n > 320;
      })
      .map((g) => `${g.id} (${g.howToPlay!.trim().length})`);
    expect(wrongLength).toEqual([]);
  });

  it("resolves every game to its canonical url", async () => {
    for (const game of await loadImprovGames()) {
      const prefix = game.kind === "exercise" ? "/practice/exercises/" : "/practice/formats/";
      expect(game.href).toBe(`${prefix}${game.id}`);
    }
  });
});
