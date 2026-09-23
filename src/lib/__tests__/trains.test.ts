import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { buildTrainsIndex, titlesNamedIn, trainedBy, trainsLine, trainsOf } from "../trains";

/**
 * The `**Trains:**` line as data (tracker entry 274, 2026-09-22).
 *
 * The concept sidebar labelled every inbound `illustrates` edge from an
 * exercise "Drills that train this" — 86 edges from the 24 drills with a
 * Trains line — and no code read the line the label was paraphrasing. Read,
 * the lines name 28 concept titles on 16 drills; 23 of those are linked from
 * the drill by some relation and 17 by `illustrates`. So the strong label was
 * backed by the drill's own statement of purpose on 17 of 86 edges, and the
 * other 69 are concepts the drill shows rather than claims to train. This
 * module is now the one reader of the line; the guards below hold the parse
 * to the corpus and the corpus to the parse.
 *
 * One of the 28 is excluded on purpose: group-mind-cultivation's line names
 * "mirroring" as what the drill goes *beyond*, and `mirroring` is an
 * exercise. A drill trains a concept, not another drill, so exercise titles
 * are not candidates — 27 named on 16 drills, 22 linked, 17 by
 * `illustrates`. The floors are set one under each.
 */

const SRC = path.join(process.cwd(), "src");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("the Trains line", () => {
  it("is read on most drills and names a concept on most of those", async () => {
    const atoms = await loadAtoms();
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    // Population: 27 exercises, 24 with a line, on 2026-09-22.
    expect(exercises.length).toBeGreaterThanOrEqual(25);
    const { trains, withLine } = buildTrainsIndex(atoms);
    expect(withLine.length).toBeGreaterThanOrEqual(20);
    expect(withLine.length).toBeLessThanOrEqual(exercises.length);
    for (const id of withLine) {
      expect(
        exercises.some((e) => e.frontmatter.id === id),
        id,
      ).toBe(true);
    }

    const naming = [...trains.values()].filter((ids) => ids.length > 0).length;
    const named = [...trains.values()].reduce((n, ids) => n + ids.length, 0);
    const unique = new Set([...trains.values()].flat());
    // 16 drills name a concept; 27 (drill, concept) pairs over 20 concepts.
    expect(naming).toBeGreaterThanOrEqual(15);
    expect(named).toBeGreaterThanOrEqual(25);
    expect(unique.size).toBeGreaterThanOrEqual(18);
    // The eight prose-only lines (big-booty, directed-scene, …) are read and
    // name nothing; they are not missing lines.
    expect(withLine.length - naming).toBeGreaterThanOrEqual(6);
    expect(trains.get("big-booty")).toEqual([]);
  });

  it("resolves every name to a real concept atom, never a reference or a drill", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const { trains, trainedBy: reverse } = buildTrainsIndex(atoms);
    let checked = 0;
    for (const [exercise, ids] of trains) {
      expect(byId.get(exercise)?.type).toBe("exercise");
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) {
        const target = byId.get(id);
        expect(target, `${exercise} trains ${id}`).toBeDefined();
        expect(target!.type, id).not.toBe("reference");
        expect(target!.type, id).not.toBe("exercise");
        expect(id).not.toBe(exercise);
        // The reverse index agrees.
        expect(reverse.get(id), id).toContain(exercise);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(25);
    for (const [concept, exercises] of reverse) {
      for (const exercise of exercises) expect(trains.get(exercise)).toContain(concept);
    }
    // The async accessors read the same index.
    expect(await trainsOf("first-line-drill")).toEqual(["be-brave"]);
    expect(await trainedBy("be-present")).toEqual(
      expect.arrayContaining(["last-word-response", "zip-zap-zop"]),
    );
    expect(await trainsOf("commitment")).toEqual([]);
    expect(await trainsOf("no-such-atom")).toEqual([]);
  });

  it("confirms the strong label on a minority of the exercises' illustrates edges, tracked", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const { trains, withLine } = buildTrainsIndex(atoms);
    let illustrates = 0;
    let linked = 0;
    let confirmed = 0;
    for (const exercise of withLine) {
      const links = byId.get(exercise)!.links ?? [];
      illustrates += links.filter((l) => l.relation === "illustrates").length;
      for (const id of trains.get(exercise) ?? []) {
        if (links.some((l) => l.id === id)) linked += 1;
        if (links.some((l) => l.id === id && l.relation === "illustrates")) confirmed += 1;
      }
    }
    // 86 illustrates edges from the 24 drills with a line; 22 named concepts
    // linked by any relation; 17 by illustrates — the confirmed share, 17 of
    // 86 on 2026-09-22. Floors one under; the ceiling says the label is
    // still an overclaim on most edges, which is the finding. Raise the
    // ceiling only when the drills' lines change, not the parser.
    expect(illustrates).toBeGreaterThanOrEqual(80);
    expect(linked).toBeGreaterThanOrEqual(21);
    expect(confirmed).toBeGreaterThanOrEqual(16);
    expect(confirmed).toBeLessThan(illustrates / 2);
    // The named-but-unlinked concepts the graph could not see before:
    // specificity, coherence (twice), opening, warm-up (twice) — 5 of 27
    // named on 2026-09-22, the ids the authoring bullet of entry 274 is for.
    expect(linked).toBeLessThan([...trains.values()].reduce((n, ids) => n + ids.length, 0));
  });

  it("matches whole titles, case-insensitively, inside backticks and links, and only the first line", () => {
    const candidates = [
      { id: "be-present", title: "Be Present" },
      { id: "status", title: "Status" },
      { id: "offers", title: "Offers" },
      { id: "warm-up", title: "Warm-Up" },
      { id: "presence", title: "Presence" },
    ];
    expect(titlesNamedIn("be present — attention that can be redirected", candidates)).toEqual([
      "be-present",
    ]);
    // Whole words: "statuses" is not "Status", "offer" is not "Offers".
    expect(titlesNamedIn("shifting statuses and reading an offer", candidates)).toEqual([]);
    // Backticks and links do not stop the match; punctuation neither.
    expect(titlesNamedIn("`Status` awareness, [Offers](/x), warm-up.", candidates)).toEqual([
      "status",
      "offers",
      "warm-up",
    ]);
    // Line order, not candidate order.
    expect(titlesNamedIn("Offers, then Status", candidates)).toEqual(["offers", "status"]);
    // "Presence" is not "Be Present".
    expect(titlesNamedIn("Presence under load", candidates)).toEqual(["presence"]);

    expect(trainsLine("**Trains:** Be Brave — the threshold.\n\n**Trains:** Status.")).toBe(
      "Be Brave — the threshold.",
    );
    expect(trainsLine("**Setup:** two lines.\n**Trains:**   shared timing.  ")).toBe(
      "shared timing.",
    );
    expect(trainsLine("Trains: not bold")).toBeNull();
    expect(trainsLine("")).toBeNull();
    expect(trainsLine(undefined)).toBeNull();
  });

  it("is the only module under src/ that parses the Trains line", () => {
    // seo.ts strips any bold lead label and glossary.ts skips a paragraph
    // whose label is "Trains"; neither reads what the line names. A second
    // reader would be a second vocabulary for what a drill is for, which is
    // what relation-labels.test.ts guards against for the edge labels.
    const allowed = new Set([path.join(SRC, "lib", "trains.ts")]);
    const files = walk(SRC).filter((f) => !/[\\/]__tests__[\\/]/.test(f));
    expect(files.length).toBeGreaterThan(80);
    expect(files.filter((f) => allowed.has(f)).length).toBe(1);
    // A regex that targets the bold label — `\*\*Trains` or `Trains:\*\*` in
    // source — is a parser; the plain string in a comment or a test fixture
    // is not.
    const parser = /\\\*\\\*Trains|Trains:\\\*\\\*/;
    const offenders = files
      .filter((f) => !allowed.has(f))
      .filter((f) => parser.test(fs.readFileSync(f, "utf-8")))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
    expect(parser.test(fs.readFileSync(path.join(SRC, "lib", "trains.ts"), "utf-8"))).toBe(true);
  });
});
