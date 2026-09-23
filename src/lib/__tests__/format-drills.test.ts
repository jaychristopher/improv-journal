import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { PAIRING_RELATIONS } from "../drill-pairs";
import {
  CARD_LINE_CAP,
  drillsPreparingFor,
  FEEDS_LABEL,
  FORMAT_DRILLS_CAP,
  FORMAT_DRILLS_LABEL,
  formatsFedBy,
  PREPARE_WITH_LABEL,
  preparesNote,
} from "../format-drills";
import { GAME_GROUPS, loadImprovGames } from "../games";
import { median } from "../graph-robustness";
import { buildTrainsIndex } from "../trains";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * "Drills that prepare for this" (tracker entry 283, 2026-09-22). The 27
 * exercises and the 24 formats are the two practice layers, and the graph
 * keeps them apart: ten edges join an exercise and a format in 2,435, no
 * format's body names an exercise, no lesson composes both, so the Harold —
 * 24 formats pointing at it — had no drill that builds toward it. The join
 * is derived: a drill prepares for a format when the two point at the same
 * concept, and the link says which.
 *
 * Measured on 2026-09-22: 24 of 24 formats get at least one drill, median
 * 18 candidates each (min 1: `deconstruction`, whose only shared target is
 * Base Reality with questions-only), and 27 of 27 exercises feed at least
 * one format (median 19). No format gets none, so the debt list is empty;
 * the floors sit one under the measurement and the list of those without is
 * asserted so a format that loses its drills is named, not counted.
 */
describe("format drills", () => {
  it("gives nearly every format a drill, and names the formats that get none", async () => {
    const atoms = await loadAtoms();
    const formats = atoms.filter((a) => a.frontmatter.type === "format");
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    // Population: 24 formats and 27 exercises on 2026-09-22.
    expect(formats.length).toBeGreaterThanOrEqual(22);
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const without: string[] = [];
    const candidates: number[] = [];
    for (const format of formats) {
      const { drills, omitted } = drillsPreparingFor(format.frontmatter.id, atoms);
      candidates.push(drills.length + omitted);
      if (drills.length === 0) without.push(format.frontmatter.id);
    }
    // 24 of 24 on 2026-09-22; floor one under. The debt: none today. A
    // format that arrives here is one whose requires/illustrates targets no
    // drill shares — add it to this list with the date rather than lowering
    // the floor.
    expect(without).toEqual([]);
    expect(formats.length - without.length).toBeGreaterThanOrEqual(formats.length - 1);
    // Median candidates 18 on 2026-09-22 (min 1).
    expect(median(candidates)).toBeGreaterThanOrEqual(15);

    // The reverse reaches every drill: 27 of 27 on 2026-09-22, median 19.
    const fedCounts: number[] = [];
    const feedNone: string[] = [];
    for (const ex of exercises) {
      const { formats: fed, omitted } = formatsFedBy(ex.frontmatter.id, atoms);
      fedCounts.push(fed.length + omitted);
      if (fed.length === 0) feedNone.push(ex.frontmatter.id);
    }
    expect(feedNone).toEqual([]);
    expect(median(fedCounts)).toBeGreaterThanOrEqual(15);
  });

  it("only offers drills that really share a target with the format, and says which", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const { trains: trainsIndex } = buildTrainsIndex(atoms);
    const linksTo = (id: string, concept: string) =>
      (byId.get(id)?.links ?? []).some(
        (l) => l.id === concept && PAIRING_RELATIONS.includes(l.relation),
      );
    const anyLink = (from: string, to: string) =>
      (byId.get(from)?.links ?? []).some((l) => l.id === to);
    const claims = (drill: string, concept: string) =>
      (trainsIndex.get(drill) ?? []).includes(concept);

    let checked = 0;
    let trainsFirst = 0;
    let direct = 0;
    for (const format of atoms.filter((a) => a.frontmatter.type === "format")) {
      const formatId = format.frontmatter.id;
      const { drills } = drillsPreparingFor(formatId, atoms);
      expect(drills.length).toBeLessThanOrEqual(FORMAT_DRILLS_CAP);
      // Ranked by weighted shared targets (a trains share counts double, a
      // direct edge as much), then title.
      for (let i = 1; i < drills.length; i += 1) {
        expect(drills[i - 1].score).toBeGreaterThanOrEqual(drills[i].score);
        if (drills[i - 1].score === drills[i].score) {
          expect(drills[i - 1].title.localeCompare(drills[i].title)).toBeLessThanOrEqual(0);
        }
      }
      for (const drill of drills) {
        expect(byId.get(drill.id)?.type).toBe("exercise");
        expect(drill.url).toBe(`/practice/exercises/${drill.id}`);
        // Either a shared target or a direct edge; nothing else joins them.
        expect(drill.shared.length > 0 || drill.direct, `${formatId} ~ ${drill.id}`).toBe(true);
        expect(drill.direct).toBe(anyLink(drill.id, formatId) || anyLink(formatId, drill.id));
        for (const concept of drill.shared) {
          // The format points at the concept by a pairing edge; the drill by
          // the same edge or by naming it in its Trains line.
          expect(linksTo(formatId, concept.id), `${formatId} → ${concept.id}`).toBe(true);
          const claimed = claims(drill.id, concept.id);
          expect(
            claimed || linksTo(drill.id, concept.id),
            `${drill.id} → ${concept.id} (for ${formatId})`,
          ).toBe(true);
          expect(concept.trains).toBe(claimed);
          expect(byId.get(concept.id)?.type).not.toBe("exercise");
          expect(byId.get(concept.id)?.type).not.toBe("reference");
          expect(concept.title).toBe(byId.get(concept.id)!.title);
        }
        // Trains shares are listed first so the note names the concept the
        // drill says it trains.
        const firstPlain = drill.shared.findIndex((c) => !c.trains);
        const lastTrains = drill.shared.map((c) => c.trains).lastIndexOf(true);
        if (firstPlain >= 0 && lastTrains >= 0) expect(lastTrains).toBeLessThan(firstPlain);
        const weighted =
          drill.shared.reduce((n, c) => n + (c.trains ? 2 : 1), 0) + (drill.direct ? 2 : 0);
        expect(drill.score).toBe(weighted);
        const note = preparesNote(drill);
        if (drill.shared.length > 0) {
          expect(note.startsWith(`through ${drill.shared[0].title}`), note).toBe(true);
          if (drill.shared[0].trains) trainsFirst += 1;
        } else {
          expect(note).toBe("linked directly");
        }
        if (drill.direct) direct += 1;
        checked += 1;
      }
    }
    // Guard the guard: 93 drills shown across the 24 formats on 2026-09-22
    // (23 full lists of four and deconstruction's one), 51 of them led by a
    // concept the drill's own Trains line names, 7 through one of the
    // graph's ten direct exercise–format edges. Floors sit under each, well
    // under for the trains count since a rewritten Trains line moves it.
    expect(checked).toBeGreaterThanOrEqual(90);
    expect(trainsFirst).toBeGreaterThanOrEqual(40);
    expect(direct).toBeGreaterThanOrEqual(6);
  });

  it("gives the Harold drills through what it requires, led by the one that names it", async () => {
    // The Harold requires group-mind, ensemble, game-of-the-scene,
    // heightening, editing, suggestion, discovery, support-moves and trust.
    // No drill on the site links or names Editing or Game of the Scene
    // (checked 2026-09-22: zero exercises with an edge to `editing`,
    // `sweep-edit` or `game-of-the-scene`, none naming them in a Trains
    // line), so the editing drill entry 283 hoped for cannot be derived until
    // one is written. What the graph does support: organic-opening-exercise
    // links the Harold directly and shares Ensemble; group-mind-cultivation
    // says it trains Group Mind; genre-scene shares Heightening; mirroring
    // shares Ensemble. Six candidates, four shown.
    const atoms = await loadAtoms();
    const { drills, omitted } = drillsPreparingFor("harold", atoms);
    expect(drills.length).toBe(FORMAT_DRILLS_CAP);
    expect(omitted).toBeGreaterThanOrEqual(1);
    expect(drills[0].id).toBe("organic-opening-exercise");
    expect(drills[0].direct).toBe(true);
    expect(drills.map((d) => d.id)).toContain("group-mind-cultivation");
    const groupMind = drills.find((d) => d.id === "group-mind-cultivation")!;
    expect(groupMind.shared[0]).toMatchObject({ id: "group-mind", trains: true });
    expect(preparesNote(groupMind)).toMatch(/^through Group Mind/);
    // The reverse agrees: the Harold is the first format the opening drill feeds.
    expect(formatsFedBy("organic-opening-exercise", atoms).formats[0]?.id).toBe("harold");
  });

  it("is empty for anything that is not a format, or not an exercise", async () => {
    const atoms = await loadAtoms();
    expect(drillsPreparingFor("mirroring", atoms)).toEqual({ drills: [], omitted: 0 });
    expect(drillsPreparingFor("commitment", atoms)).toEqual({ drills: [], omitted: 0 });
    expect(drillsPreparingFor("no-such-atom", atoms)).toEqual({ drills: [], omitted: 0 });
    expect(formatsFedBy("harold", atoms)).toEqual({ formats: [], omitted: 0 });
    expect(formatsFedBy("no-such-atom", atoms)).toEqual({ formats: [], omitted: 0 });
  });

  /**
   * The games hub's cards carry the join. Every format card names the drills
   * that prepare for it and every exercise card the formats it feeds, capped
   * at CARD_LINE_CAP: 41 of 41 cards on 2026-09-22 (14 formats, 27 drills).
   */
  it("gives every game card a prepare-with or feeds line", async () => {
    const games = await loadImprovGames();
    expect(games.length).toBeGreaterThanOrEqual(40);
    const groupKeys = GAME_GROUPS.map((g) => g.key);
    let lines = 0;
    for (const game of games) {
      expect(groupKeys).toContain(game.kind);
      const related = game.kind === "format" ? game.prepareWith : game.feeds;
      const other = game.kind === "format" ? game.feeds : game.prepareWith;
      expect(other, game.id).toEqual([]);
      expect(related.length, game.id).toBeLessThanOrEqual(CARD_LINE_CAP);
      for (const link of related) {
        expect(link.href).toMatch(
          game.kind === "format" ? /^\/practice\/exercises\// : /^\/practice\/formats\//,
        );
      }
      if (related.length > 0) lines += 1;
    }
    // Floor one under the 41 measured.
    expect(lines).toBeGreaterThanOrEqual(games.length - 1);
  });

  it.runIf(built)("renders the games hub as two groups, each card with its line", async () => {
    const html = fs
      .readFileSync(path.join(APP, "improv-games.html"), "utf-8")
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<!-- -->/g, "");
    for (const group of GAME_GROUPS) {
      expect(html).toContain(`data-track="group-${group.key}"`);
      expect(html).toMatch(new RegExp(`<h3[^>]*>${group.heading}</h3>`));
    }
    const games = await loadImprovGames();
    const formats = games.filter((g) => g.kind === "format").length;
    const exercises = games.filter((g) => g.kind === "exercise").length;
    // Guard the guard: 14 formats and 27 exercises on 2026-09-22.
    expect(formats).toBeGreaterThanOrEqual(12);
    expect(exercises).toBeGreaterThanOrEqual(25);

    const prepare = html.match(/data-track="prepare-with"/g)?.length ?? 0;
    const feeds = html.match(/data-track="feeds"/g)?.length ?? 0;
    // Every card had a line on 2026-09-22; floors one under each count.
    expect(prepare).toBeGreaterThanOrEqual(formats - 1);
    expect(feeds).toBeGreaterThanOrEqual(exercises - 1);
    expect(html).toContain(`${PREPARE_WITH_LABEL}:`);
    expect(html).toContain(`${FEEDS_LABEL}:`);
    // The lines link the other layer.
    const prepareLine = /data-track="prepare-with"[^]*?<\/p>/.exec(html)![0];
    expect(prepareLine).toMatch(/href="\/practice\/exercises\//);
    const feedsLine = /data-track="feeds"[^]*?<\/p>/.exec(html)![0];
    expect(feedsLine).toMatch(/href="\/practice\/formats\//);
  });

  it.runIf(built)("renders a prepare-with line under every format on the formats hub", async () => {
    const html = fs
      .readFileSync(path.join(APP, "practice", "formats.html"), "utf-8")
      .replace(/<script[\s\S]*?<\/script>/g, "");
    const atoms = await loadAtoms();
    const formats = atoms.filter((a) => a.frontmatter.type === "format").length;
    expect(formats).toBeGreaterThanOrEqual(22);
    const prepare = html.match(/data-track="prepare-with"/g)?.length ?? 0;
    // 24 of 24 on 2026-09-22; floor one under.
    expect(prepare).toBeGreaterThanOrEqual(formats - 1);
    // The formats hub is not grouped: one inventory of one kind.
    expect(html).not.toContain('data-track="group-format"');
  });

  it.runIf(built)("is what the format page's block would print, and no concept page has it", () => {
    // The block is mounted in AtomDetail for `type === "format"`; until it
    // is, this pins that no page outside the formats carries its marker so
    // mounting it elsewhere by mistake is caught.
    const html = fs.readFileSync(
      path.join(APP, "how-it-works", "cognitive-bandwidth.html"),
      "utf-8",
    );
    expect(html).not.toContain('data-track="format-drills"');
    expect(html).not.toContain(FORMAT_DRILLS_LABEL);
  });
});
