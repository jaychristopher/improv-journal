import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GAME_JOBS, poolForJob, poolForSymptom, SYMPTOMS, WARM_UP_TAG } from "../game-picker";
import { loadImprovGames } from "../games";

/**
 * The hero deals from the page's own advice, so the two have to agree.
 *
 * /improv-games argues that the way to choose is to name what is going wrong
 * and take the game that isolates it, and then lists six things that go wrong
 * with the games for each. That list is the tool's second question. If the
 * author adds a game to a bullet and the module does not follow, the tool
 * starts giving a worse answer than the prose underneath it (2026-09-23).
 */
const PAGE = path.join(process.cwd(), "src", "app", "improv-games", "page.tsx");

/** The "How to Choose One" bullets, read out of the route file. */
function pageSymptoms(): { label: string; games: string[] }[] {
  const source = fs.readFileSync(PAGE, "utf8");
  // The id appears in the table-of-contents array first, so the section is
  // anchored on its `data-track` and read up to the next section's id.
  const start = source.indexOf('data-track="choose-a-game"');
  const end = source.indexOf("warm-up-exercise-or-performance-game", start);
  expect(start, "the choose-a-game section is still on the page").toBeGreaterThan(0);
  expect(end, "the section after it is still on the page").toBeGreaterThan(start);
  const section = source.slice(start, end);
  return [...section.matchAll(/text="\*\*([^*]+)\*\*([^"]*)"/g)].map((match) => ({
    label: match[1].trim().replace(/\.$/, ""),
    games: [...match[2].matchAll(/\]\(\/practice\/exercises\/([a-z0-9-]+)\)/g)].map((m) => m[1]),
  }));
}

describe("the symptoms the picker offers", () => {
  it("are the ones the page lists, with the games it names", () => {
    const fromPage = pageSymptoms();
    // Guard the guard: a broken read would agree with an empty module.
    expect(fromPage.length).toBeGreaterThanOrEqual(6);
    expect(SYMPTOMS.length).toBe(fromPage.length);

    for (const [i, symptom] of SYMPTOMS.entries()) {
      expect(symptom.label, `symptom ${i + 1}`).toBe(fromPage[i].label);
      expect([...symptom.games], symptom.label).toEqual(fromPage[i].games);
    }
  });

  it("names only games the hub actually carries", async () => {
    const games = await loadImprovGames();
    expect(games.length).toBeGreaterThanOrEqual(40);
    const ids = new Set(games.map((g) => g.id));
    const missing = SYMPTOMS.flatMap((s) => s.games).filter((id) => !ids.has(id));
    expect(missing).toEqual([]);
  });

  it("gives every symptom something to deal after the ones it names", async () => {
    const games = await loadImprovGames();
    for (const symptom of SYMPTOMS) {
      const pool = poolForSymptom(symptom, games);
      // The named games come first and in order, so the page's pick is what
      // the reader is handed before anything the focus widening found.
      expect(
        pool.slice(0, symptom.games.length).map((g) => g.id),
        symptom.label,
      ).toEqual([...symptom.games]);
      // And there is more than the named ones: `fracture-repair-drill` is the
      // case that proves it, being the only game under its bullet.
      expect(pool.length, symptom.label).toBeGreaterThan(symptom.games.length);
    }
  });
});

describe("the three jobs", () => {
  it("are the page's own, and each has a pool", async () => {
    const games = await loadImprovGames();
    expect(GAME_JOBS.map((j) => j.id)).toEqual(["warm-up", "fix", "perform"]);
    for (const job of GAME_JOBS) {
      const pool = poolForJob(job.id, games);
      // Enough that a session does not exhaust one: 12 warm-ups, 14 formats
      // and 27 exercises on 2026-09-23.
      expect(pool.length, job.id).toBeGreaterThanOrEqual(10);
    }
  });

  it("separates what is played from what is trained, as the page does", async () => {
    const games = await loadImprovGames();
    const perform = poolForJob("perform", games);
    const fix = poolForJob("fix", games);
    expect(
      perform.every((g) => g.kind === "format"),
      "everything to play is a format",
    ).toBe(true);
    expect(
      fix.every((g) => g.kind === "exercise"),
      "everything to fix with is an exercise",
    ).toBe(true);
    // The page's classic mistake is running an exercise as a performance game;
    // the two pools may not overlap, or the tool would be making it.
    const played = new Set(perform.map((g) => g.id));
    expect(fix.filter((g) => played.has(g.id))).toEqual([]);
  });

  it("hands over rules with every game it can deal", async () => {
    const games = await loadImprovGames();
    const dealable = new Set(
      GAME_JOBS.flatMap((job) => poolForJob(job.id, games)).map((g) => g.id),
    );
    const silent = games.filter((g) => dealable.has(g.id) && !g.howToPlay).map((g) => g.id);
    // A game dealt without its one line of rules is a name and a link, which
    // is what the list above already is.
    expect(silent).toEqual([]);
  });

  it("uses the tag the hub's own filter uses for warm-ups", async () => {
    const games = await loadImprovGames();
    const warm = poolForJob("warm-up", games);
    expect(warm.every((g) => g.tags.includes(WARM_UP_TAG))).toBe(true);
    expect(warm.length).toBeGreaterThanOrEqual(10);
  });
});
