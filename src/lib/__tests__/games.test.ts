import { describe, expect, it } from "vitest";

import { ATOM_FOCUS_MAP, FOCUSES } from "@/app/tools/exercise-picker/picker-config";

import { loadAtoms } from "../content";
import { focusFilterTags, FORMATS_FOCUS, GAME_GROUPS, loadImprovGames } from "../games";

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

  /**
   * The Focus facet filters the list, so a game with no focus is hidden by
   * every choice a reader can make there. It reached 20 of 41: the focus
   * vocabulary was written for exercises, and twelve of the fourteen short
   * forms carried none of it — including the three formats named above as
   * the reason formats are on the page. Focuses now come from the picker's
   * derivation rather than raw tags; this holds the facet to the whole list.
   */
  it("gives every game at least one focus the facet can reach", async () => {
    const games = await loadImprovGames();
    expect(games.length).toBeGreaterThanOrEqual(40);

    const facet = new Set(focusFilterTags(games).map((t) => t.tag));
    const unreachable = games.filter((g) => !g.focuses.some((f) => facet.has(f))).map((g) => g.id);
    expect(unreachable).toEqual([]);

    // Formats in particular: the facet never reached them before.
    for (const format of ["theatresports", "scenes-from-a-hat", "freeze-tag", "micetro"]) {
      expect(games.find((g) => g.id === format)?.focuses.length, format).toBeGreaterThan(0);
    }
  });

  /**
   * No focus is most of the list.
   *
   * The derivation's last resort is the atoms a game `requires`, and for
   * formats that read every show's need for commitment as the show's purpose:
   * on 2026-09-21 courage held 25 of 41 games (61%), 13 of the 14 formats,
   * and seven formats carried courage and nothing else (tracker entry 203).
   * Formats no longer read `requires`; measured the same day after the
   * change, the largest focus is ensemble at 16 of 41 (39%) and courage holds
   * 12, all exercises. The ceiling is set at half so a future registry
   * change that hands a whole kind to one focus fails here rather than
   * shipping a facet whose answer is "most of them".
   */
  it("files no more than half the games under one focus", async () => {
    const games = await loadImprovGames();
    const counts = new Map<string, number>();
    for (const game of games) {
      for (const focus of game.focuses) counts.set(focus, (counts.get(focus) ?? 0) + 1);
    }
    // Guard the guard: the facet has real focuses with real members.
    expect(counts.size).toBeGreaterThanOrEqual(6);

    for (const [focus, count] of counts) {
      expect(count / games.length, `${focus}: ${count} of ${games.length}`).toBeLessThanOrEqual(
        0.5,
      );
    }
  });

  /**
   * A format's prerequisites are not its purpose.
   *
   * These seven `require` commitment, as 19 of the 24 formats do, and carried
   * courage as their only focus for that reason alone. A format may still be
   * courage if its own tags or an `illustrates` edge say so; none of these
   * does today, and the assertion reads the atom rather than assuming it, so
   * adding such an edge moves the format honestly instead of failing here.
   */
  it("does not file a format under courage for requiring commitment", async () => {
    const atoms = await loadAtoms();
    const games = await loadImprovGames();
    const named = [
      "blind-line",
      "bus-stop",
      "gorilla-theatre",
      "micetro",
      "scenes-from-a-hat",
      "superheroes",
      "worlds-worst",
    ];

    for (const id of named) {
      const atom = atoms.find((a) => a.frontmatter.id === id)!;
      expect(atom, id).toBeDefined();
      // The case the test exists for: the edge that used to decide the focus.
      expect(atom.frontmatter.links, id).toContainEqual({ id: "commitment", relation: "requires" });

      const declared =
        (atom.frontmatter.tags ?? []).includes("courage") ||
        atom.frontmatter.links.some(
          (l) => l.relation === "illustrates" && ATOM_FOCUS_MAP[l.id] === "courage",
        );
      const game = games.find((g) => g.id === id)!;
      expect(game.focuses.includes("courage"), `${id}: ${game.focuses.join(",")}`).toBe(declared);
    }
  });

  /**
   * The formats chip is offered only when a game would answer to it.
   *
   * A format with no tag, hand entry or `illustrates` edge to a focus is filed
   * under `formats` rather than under a borrowed one; the chip appears on the
   * hub exactly when that has happened to some game, and the picker's six
   * focuses are always offered.
   */
  it("offers the formats chip only when some game carries it", async () => {
    const games = await loadImprovGames();
    const chips = focusFilterTags(games).map((t) => t.tag);
    for (const focus of FOCUSES) expect(chips).toContain(focus.tag);

    const carried = games.some((g) => g.focuses.includes(FORMATS_FOCUS.tag));
    expect(chips.includes(FORMATS_FOCUS.tag)).toBe(carried);
    // Only formats ever land there; an exercise always has `requires` to read.
    for (const game of games.filter((g) => g.focuses.includes(FORMATS_FOCUS.tag))) {
      expect(game.kind, game.id).toBe("format");
      expect(game.focuses, game.id).toEqual([FORMATS_FOCUS.tag]);
    }

    // And the chip goes away with the last such game.
    const focused = games.map((g) => ({ ...g, focuses: ["ensemble"] }));
    expect(focusFilterTags(focused).map((t) => t.tag)).not.toContain(FORMATS_FOCUS.tag);
    expect(focusFilterTags([]).map((t) => t.tag)).toEqual(FOCUSES.map((f) => f.tag));
  });

  /**
   * One inventory to filter, two kinds to read.
   *
   * Since 2026-09-22 the hub's list renders under "To play" (formats) and
   * "To train" (exercises) — the two layers the graph keeps apart (tracker
   * entry 283) — while the Level and Focus facets keep filtering across both.
   * Nothing above this moved: membership, focuses and rules are pinned as
   * they were, on the same flat list `loadImprovGames` returns. What moved
   * is presentation: the page passes GAME_GROUPS to the filter and each
   * game's `kind` is its group key, so this holds the two to each other.
   */
  it("groups the list by kind, formats to play and exercises to train", async () => {
    const games = await loadImprovGames();
    const keys = GAME_GROUPS.map((g) => g.key);
    expect(keys).toEqual(["format", "exercise"]);
    expect(GAME_GROUPS.map((g) => g.heading)).toEqual(["To play", "To train"]);
    for (const game of games) expect(keys, game.id).toContain(game.kind);
    // Both groups have members, so neither heading renders over nothing.
    for (const key of keys) {
      expect(games.filter((g) => g.kind === key).length, key).toBeGreaterThan(0);
    }
  });

  it("resolves every game to its canonical url", async () => {
    for (const game of await loadImprovGames()) {
      const prefix = game.kind === "exercise" ? "/practice/exercises/" : "/practice/formats/";
      expect(game.href).toBe(`${prefix}${game.id}`);
    }
  });
});
