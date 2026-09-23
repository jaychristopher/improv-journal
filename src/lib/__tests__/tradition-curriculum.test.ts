import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  curriculumFor,
  englishList,
  ladderTraditionsSentence,
  LEAD_MARGIN,
  leadingTradition,
  lessonTraditions,
  mixOf,
  pathTraditions,
  rungSchools,
  type TraditionCounts,
} from "../tradition-curriculum";
import { TRADITION_IDS, type TraditionId } from "../tradition-guides";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The join from the traditions to the lessons and paths that teach them.
 *
 * A concept is a school's when it cites the school's works; a lesson
 * composes concepts and a path sequences lessons. Read through, the ladder
 * climbs from Johnstone's room to UCB's — the beginner paths are Close,
 * Johnstone and Spolin, the performer paths UCB and Close, *Advanced Game
 * and Character* UCB on 14 of 23 concepts, *The Game Beneath the Game* UCB
 * on 8 of 8 — and until 2026-09-22 no surface said so: the tradition pages
 * listed 0 lessons and 0 paths, the path pages named a school on 2 of 11
 * (tracker entry 330). These hold the readings the entry took, so a
 * membership table or a lesson's `atoms` changing under them fails here
 * rather than moving a pill silently.
 */
describe("tradition curriculum", () => {
  it("reads every path and lesson against the 5 schools", async () => {
    const [paths, lessons] = await Promise.all([pathTraditions(), lessonTraditions()]);
    // 11 paths and 25 lessons on 2026-09-22; a changed loader finds fewer.
    expect(paths.length).toBeGreaterThanOrEqual(10);
    expect(lessons.length).toBeGreaterThanOrEqual(20);
    expect(TRADITION_IDS).toHaveLength(5);
    for (const unit of [...paths, ...lessons]) {
      expect(Object.keys(unit.counts).sort(), unit.id).toEqual([...TRADITION_IDS].sort());
      // A unit's concepts are what the count is taken from: every path and
      // every lesson composes at least 1, and no school can claim more.
      expect(unit.total, unit.id).toBeGreaterThanOrEqual(1);
      for (const t of TRADITION_IDS) {
        expect(unit.counts[t], `${unit.id} ${t}`).toBeLessThanOrEqual(unit.total);
      }
    }
    // The join is not empty: most units cite at least 1 school's works.
    const claimed = [...paths, ...lessons].filter((u) =>
      TRADITION_IDS.some((t) => u.counts[t] > 0),
    );
    expect(claimed.length).toBeGreaterThanOrEqual(30);
  });

  it("finds UCB leading Advanced Game and Character and no non-performer path", async () => {
    const paths = await pathTraditions();
    const byId = new Map(paths.map((p) => [p.id, p]));
    // Entry 330's reading, 2026-09-22: UCB 14 of 23, Johnstone 9 the runner-up.
    const advanced = byId.get("advanced-game-and-character")!;
    expect(advanced).toBeDefined();
    expect(advanced.counts.ucb).toBe(14);
    expect(advanced.total).toBe(23);
    expect(advanced.leader).toBe("ucb");
    // Foundations: UCB on 0 of its 5 concepts.
    expect(byId.get("beginner-foundations")!.counts.ucb).toBe(0);
    // UCB is the leading school on no beginner, intermediate, teacher or
    // advanced path, by the plain maximum as well as by the margin.
    const nonPerformer = paths.filter((p) => p.audience !== "performer");
    expect(nonPerformer.length).toBeGreaterThanOrEqual(7);
    for (const p of nonPerformer) {
      expect(p.leader, p.id).not.toBe("ucb");
      const max = Math.max(...TRADITION_IDS.map((t) => p.counts[t]));
      expect(p.counts.ucb, `${p.id} UCB is not the plain maximum`).toBeLessThan(max);
    }
  });

  it("finds The Game Beneath the Game UCB on 8 of 8", async () => {
    const lessons = await lessonTraditions();
    const game = lessons.find((l) => l.id === "the-game-beneath-the-game");
    expect(game).toBeDefined();
    expect(game!.counts.ucb).toBe(8);
    expect(game!.total).toBe(8);
    expect(game!.leader).toBe("ucb");
    // And the tradition page's list opens on it, with the full share.
    const ucb = await curriculumFor("ucb");
    expect(ucb.lessons[0]?.id).toBe("the-game-beneath-the-game");
    expect(ucb.lessons[0]?.share).toBe(1);
    expect(ucb.paths.map((p) => p.id)).toContain("advanced-game-and-character");
  });

  it("shows nothing where the schools tie, by the margin", async () => {
    const paths = await pathTraditions();
    const silent = paths.filter((p) => p.leader === null);
    // 10 of 11 paths on 2026-09-22 — Foundations is Johnstone 3, Close 3;
    // Mastering the Form Close 8, UCB 8 — and the margin must silence at
    // least 1, or the pill is on every rung and marks no change (entry 323).
    expect(silent.length).toBeGreaterThanOrEqual(1);
    expect(silent.map((p) => p.id)).toContain("mastering-the-form");
    expect(LEAD_MARGIN).toBeGreaterThan(1);
    // The rule on fixtures: 8 against 8 is nothing, 14 against 9 is UCB,
    // and a unit no school claims is nothing at any margin.
    const counts = (partial: Partial<TraditionCounts>): TraditionCounts => ({
      johnstone: 0,
      spolin: 0,
      close: 0,
      ucb: 0,
      annoyance: 0,
      ...partial,
    });
    expect(leadingTradition(counts({ close: 8, ucb: 8 }))).toBeNull();
    expect(leadingTradition(counts({ ucb: 14, johnstone: 9 }))).toBe("ucb");
    expect(leadingTradition(counts({ close: 13, johnstone: 10 }))).toBeNull();
    expect(leadingTradition(counts({ close: 13, johnstone: 10 }), 1.2)).toBe("close");
    expect(leadingTradition(counts({}))).toBeNull();
    expect(leadingTradition(counts({ spolin: 1 }))).toBe("spolin");
  });

  it("counts a concept once per unit and once per school it cites", () => {
    const members = new Map<TraditionId, Set<string>>([
      ["ucb", new Set(["a", "b"])],
      ["close", new Set(["b"])],
    ]);
    const mix = mixOf(["a", "b", "b", "c"], members);
    expect(mix.total).toBe(3);
    expect(mix.counts.ucb).toBe(2);
    expect(mix.counts.close).toBe(1);
    expect(mix.counts.johnstone).toBe(0);
  });

  it("states the ladder's slope from the rungs' leading schools", async () => {
    const sentence = await ladderTraditionsSentence();
    // Entry 330's reading, 2026-09-22.
    expect(sentence).toBe(
      "Beginner paths lean on Close, Johnstone and Spolin; the performer paths on UCB and Close.",
    );
    const paths = await pathTraditions();
    expect(rungSchools(paths.filter((p) => p.audience === "performer"))[0]).toBe("ucb");
    expect(rungSchools([])).toEqual([]);
    expect(englishList(["UCB"])).toBe("UCB");
    expect(englishList(["UCB", "Close"])).toBe("UCB and Close");
  });

  /**
   * The 3 surfaces, in the built html. These pass once the site is rebuilt
   * with the change; on the build that predates it they fail, which is the
   * point of reading the build rather than the source.
   */
  it.runIf(built)(
    "the tradition pages list the lessons and paths where the school leads",
    async () => {
      let rendered = 0;
      for (const tradition of TRADITION_IDS) {
        const html = fs.readFileSync(path.join(APP, "traditions", `${tradition}.html`), "utf8");
        const curriculum = await curriculumFor(tradition);
        const expected = curriculum.lessons.length + curriculum.paths.length;
        const present = html.includes('data-track="tradition-curriculum"');
        expect(present, `${tradition}: block rendered iff the school leads somewhere`).toBe(
          expected > 0,
        );
        if (!present) continue;
        rendered += 1;
        for (const entry of [...curriculum.lessons, ...curriculum.paths]) {
          expect(html, `${tradition} links ${entry.id}`).toContain(`href="${entry.href}"`);
          expect(html, `${tradition} counts ${entry.id}`).toContain(
            `${entry.count} of ${entry.total} concept`,
          );
        }
      }
      // 4 of the 5 on 2026-09-22: the Annoyance leads no lesson and no path.
      expect(rendered).toBeGreaterThanOrEqual(3);
      const ucb = fs.readFileSync(path.join(APP, "traditions", "ucb.html"), "utf8");
      expect(ucb).toContain('href="/threads/the-game-beneath-the-game"');
      expect(ucb).toContain("8 of 8 concepts");
    },
  );

  it.runIf(built)(
    "the path pages carry the pill where a school leads, and only there",
    async () => {
      const paths = await pathTraditions();
      let pills = 0;
      for (const p of paths) {
        const html = fs.readFileSync(path.join(APP, "paths", `${p.id}.html`), "utf8");
        const pill = html.match(/data-path-tradition="([a-z]+)"/);
        if (p.leader) {
          expect(pill?.[1], `${p.id} names its leading school`).toBe(p.leader);
          expect(html).toContain(`href="/traditions/${p.leader}"`);
          pills += 1;
        } else {
          expect(pill, `${p.id} shows no pill on a tie`).toBeNull();
        }
      }
      // 1 of 11 on 2026-09-22: UCB on Advanced Game and Character.
      expect(pills).toBeGreaterThanOrEqual(1);
    },
  );

  it.runIf(built)("the paths hub's ladder says the slope", async () => {
    const html = fs.readFileSync(path.join(APP, "paths.html"), "utf8");
    expect(html).toContain("data-ladder-traditions");
    const sentence = (await ladderTraditionsSentence())!;
    // The linker adds anchors inside the sentence; the plain text survives it.
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain(sentence.split(";")[0]);
    expect(text).toContain(sentence.split("; ")[1]);
  });
});
