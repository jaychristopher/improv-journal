import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import {
  DRILL_PAIRS_CAP,
  DRILL_PAIRS_LABEL,
  drillPairsFor,
  PAIRING_RELATIONS,
  sharedNote,
} from "../drill-pairs";
import { median } from "../graph-robustness";
import { buildTrainsIndex } from "../trains";

const APP = path.join(process.cwd(), ".next", "server", "app");
const EXERCISES = path.join(APP, "practice", "exercises");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * "Drills that pair with this" on the exercise pages (tracker entry 268,
 * 2026-09-22). The drills are the periphery of the atom graph — five of 27
 * in the 13-core, median core 10 — because they name the concepts they
 * train and almost never each other, so a reader who arrives at a drill has
 * no route to the next one except back out through a concept. The block is
 * derived from shared targets: two drills pair when they train the same
 * concept, and the link says which.
 *
 * Measured on 2026-09-22: all 27 exercises get the block, every one has at
 * least twelve pairing candidates (median 21), so every block is full at the
 * cap of four. None get none. The floors sit one under the measurement.
 */
describe("drill pairs", () => {
  it("gives nearly every exercise a full block, and names the drills that get none", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    // Population: 27 on 2026-09-22.
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const withBlock: string[] = [];
    const without: string[] = [];
    const candidates: number[] = [];
    for (const ex of exercises) {
      const { pairs, omitted } = drillPairsFor(ex.frontmatter.id, atoms);
      candidates.push(pairs.length + omitted);
      (pairs.length > 0 ? withBlock : without).push(ex.frontmatter.id);
    }
    // 27 of 27 on 2026-09-22; floor one under, and the list of those without
    // is asserted so a drill that loses its block is named, not counted.
    expect(withBlock.length).toBeGreaterThanOrEqual(exercises.length - 1);
    expect(without.length).toBeLessThanOrEqual(1);
    // Median pairing candidates 21 on 2026-09-22 (min 12).
    expect(median(candidates)).toBeGreaterThanOrEqual(15);
  });

  it("only pairs drills that really share a trained concept, and says which", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const { trains: trainsIndex } = buildTrainsIndex(atoms);
    const linksTo = (id: string, concept: string) =>
      (byId.get(id)?.links ?? []).some(
        (l) => l.id === concept && PAIRING_RELATIONS.includes(l.relation),
      );
    const claims = (id: string, concept: string) => (trainsIndex.get(id) ?? []).includes(concept);
    const names = (concept: string, drill: string) =>
      (byId.get(concept)?.links ?? []).some((l) => l.id === drill);
    const trainsShared = (pair: { shared: { trains: boolean }[] }) =>
      pair.shared.filter((c) => c.trains).length;

    let checked = 0;
    let trainsNotes = 0;
    for (const ex of atoms.filter((a) => a.frontmatter.type === "exercise")) {
      const { pairs } = drillPairsFor(ex.frontmatter.id, atoms);
      expect(pairs.length).toBeLessThanOrEqual(DRILL_PAIRS_CAP);
      // Ranked by concepts both drills *say* they train, then by everything
      // shared (entry 274, 2026-09-22; until then by the total alone).
      for (let i = 1; i < pairs.length; i += 1) {
        const [prev, next] = [pairs[i - 1], pairs[i]];
        expect(trainsShared(prev)).toBeGreaterThanOrEqual(trainsShared(next));
        if (trainsShared(prev) === trainsShared(next)) {
          expect(prev.shared.length).toBeGreaterThanOrEqual(next.shared.length);
        }
      }
      for (const pair of pairs) {
        expect(pair.id).not.toBe(ex.frontmatter.id);
        expect(byId.get(pair.id)?.type).toBe("exercise");
        expect(pair.url).toBe(`/practice/exercises/${pair.id}`);
        expect(pair.shared.length).toBeGreaterThan(0);
        for (const concept of pair.shared) {
          const both = linksTo(ex.frontmatter.id, concept.id) && linksTo(pair.id, concept.id);
          const claimed = claims(ex.frontmatter.id, concept.id) && claims(pair.id, concept.id);
          const named = names(concept.id, ex.frontmatter.id) && names(concept.id, pair.id);
          expect(
            both || claimed || named,
            `${ex.frontmatter.id} ~ ${pair.id} via ${concept.id}`,
          ).toBe(true);
          // `trains` is exactly the claimed case, and a trains share is
          // listed before any other so the note names it.
          expect(concept.trains, `${ex.frontmatter.id} ~ ${pair.id} via ${concept.id}`).toBe(
            claimed,
          );
          expect(byId.get(concept.id)?.type).not.toBe("exercise");
          expect(concept.title).toBe(byId.get(concept.id)!.title);
        }
        const firstPlain = pair.shared.findIndex((c) => !c.trains);
        const lastTrains = pair.shared.map((c) => c.trains).lastIndexOf(true);
        if (firstPlain >= 0 && lastTrains >= 0) expect(lastTrains).toBeLessThan(firstPlain);
        const note = sharedNote(pair);
        const [first] = pair.shared;
        expect(
          note.startsWith(
            first.trains ? `trains ${first.title} with you` : `shares ${first.title}`,
          ),
          note,
        ).toBe(true);
        if (first.trains) trainsNotes += 1;
        checked += 1;
      }
    }
    // Guard the guard: 27 × 4 = 108 pairs on 2026-09-22, 14 of them with a
    // "trains X with you" note once the Trains lines were read (floor one
    // under). Seven of the 27 top-four lists changed membership and three
    // more changed order when the trains share took precedence.
    expect(checked).toBeGreaterThanOrEqual(100);
    expect(trainsNotes).toBeGreaterThanOrEqual(13);
    expect(trainsNotes).toBeLessThan(checked / 2);
  });

  it("puts the drill that says it trains the same thing first", async () => {
    // zip-zap-zop and last-word-response both open "**Trains:** Be Present";
    // before entry 274 last-word-response's block did not list zip-zap-zop
    // at all, because the three drills it shares more edges with outranked
    // the one that agrees with it about its point.
    const atoms = await loadAtoms();
    const { pairs } = drillPairsFor("last-word-response", atoms);
    expect(pairs[0]?.id).toBe("zip-zap-zop");
    expect(pairs[0].shared[0]).toMatchObject({ id: "be-present", trains: true });
    expect(sharedNote(pairs[0])).toBe("trains Be Present with you");
  });

  it("is empty for anything that is not an exercise", async () => {
    const atoms = await loadAtoms();
    expect(drillPairsFor("commitment", atoms)).toEqual({ pairs: [], omitted: 0 });
    expect(drillPairsFor("no-such-atom", atoms)).toEqual({ pairs: [], omitted: 0 });
  });

  it.runIf(built)("renders on the built exercise pages, tracked", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    const sample = fs.readFileSync(path.join(EXERCISES, "bippity-bippity-bop.html"), "utf-8");
    expect(sample).toContain('data-track="drill-pairs"');
    expect(sample).toContain(DRILL_PAIRS_LABEL);

    let rendered = 0;
    for (const ex of exercises) {
      const file = path.join(EXERCISES, `${ex.frontmatter.id}.html`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
      const start = html.indexOf('data-track="drill-pairs"');
      if (start < 0) continue;
      rendered += 1;
      // The block's links are the pairs, and each is a drill.
      const block = html.slice(start, html.indexOf("</ul>", start));
      const hrefs = [...block.matchAll(/href="(\/[^"?#]*)"/g)].map((m) => m[1]);
      expect(hrefs.length, ex.frontmatter.id).toBeGreaterThan(0);
      expect(hrefs.length).toBeLessThanOrEqual(DRILL_PAIRS_CAP);
      for (const href of hrefs) expect(href).toMatch(/^\/practice\/exercises\//);
      // "shares X" or, where both drills say they train X, "trains X with you".
      expect(block).toMatch(/shares |trains .* with you/);
    }
    expect(rendered).toBeGreaterThanOrEqual(exercises.length - 1);
  });

  it.runIf(built)("does not render on a concept page", () => {
    const html = fs.readFileSync(
      path.join(APP, "how-it-works", "cognitive-bandwidth.html"),
      "utf-8",
    );
    expect(html).not.toContain('data-track="drill-pairs"');
  });
});
