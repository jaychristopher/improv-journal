import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  COUNTERS_LABEL,
  COUNTERS_OUTBOUND_LABEL,
  DRILLS_LABEL,
  DRILLS_SHOW_LABEL,
  FAILURES_LABEL,
  inboundLabel,
  isCounterEdge,
  isPairEdge,
  outboundLabel,
  pairLabel,
  PRINCIPLE_LABEL,
  RECIPROCAL,
  RELATION_LABELS,
} from "../relation-labels";
import { RELATION_STYLE } from "../relation-style";

/**
 * One vocabulary for the five relations.
 *
 * On 2026-09-21 the edge from `commitment` to `be-present` was "Builds on"
 * on commitment's page, "Required by" on be-present's, and "Builds on this"
 * on the related-concepts card between them, because AtomDetail, whats-next
 * and relation-style each carried a `Record<relation, string>` of their own —
 * fourteen strings for five relations, and `extends` labelled "Related" inside
 * a section headed "Related" (tracker entry 227). Each map had a test that it
 * covered five relations; none that the maps agreed. This holds the one module
 * to the schema and every surface to the module, and the last block is a
 * source check so the next derived block cannot add a fifth vocabulary.
 */

const SRC = path.join(process.cwd(), "src");

/**
 * The relations as the schema spells them, read from the source rather than
 * imported, because a type union is erased at runtime and the point is to
 * fail when someone adds a sixth relation to `Link` and forgets the labels.
 */
function schemaRelations(): string[] {
  const src = fs.readFileSync(path.join(SRC, "lib", "schema.ts"), "utf-8");
  const iface = src.match(/export interface Link \{[\s\S]*?\n\}/)?.[0];
  expect(iface, "schema.ts declares `export interface Link`").toBeTruthy();
  const union = iface!.match(/relation:\s*([^;]+);/)?.[1];
  expect(union, "Link has a `relation` union").toBeTruthy();
  return [...union!.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("relation labels", () => {
  it("covers exactly the relations the schema declares", () => {
    const declared = schemaRelations();
    // Guard the guard: five relations on 2026-09-21.
    expect(declared.length).toBe(5);
    expect(Object.keys(RELATION_LABELS).sort()).toEqual([...declared].sort());
    expect(Object.keys(RECIPROCAL).sort()).toEqual([...declared].sort());
  });

  it("gives each direction its own word, except where the relation is symmetric", () => {
    for (const [relation, { outbound, inbound, symmetric }] of Object.entries(RELATION_LABELS)) {
      expect(outbound.length, relation).toBeGreaterThan(0);
      expect(inbound.length, relation).toBeGreaterThan(0);
      if (symmetric) expect(inbound, `${relation} is symmetric`).toBe(outbound);
      else expect(inbound, `${relation} is directed`).not.toBe(outbound);
      // A symmetric relation is its own reciprocal; a directed one may not be
      // unless it has no converse in the schema.
      if (symmetric) expect(RECIPROCAL[relation as keyof typeof RECIPROCAL]).toBe(relation);
    }
    // `contrasts` is the one symmetric relation (entry 162); the rest are directed.
    expect(
      Object.entries(RELATION_LABELS)
        .filter(([, l]) => l.symmetric)
        .map(([r]) => r),
    ).toEqual(["contrasts"]);
    // No two relations share an outbound word, or the sidebar groups merge in the reader's eye.
    const outbounds = Object.values(RELATION_LABELS).map((l) => l.outbound);
    expect(new Set(outbounds).size).toBe(outbounds.length);
  });

  it("keeps the drills case: an exercise's illustrates edge is a drill, everything else is not", () => {
    // Since 2026-09-22 the bare exercise edge reads "Drills that show this";
    // the strong "Drills that train this" needs the drill's own Trains line
    // to name the page (entry 274: 17 of 86 edges), which the caller asserts
    // with the third argument. Until then the bare edge got the strong word.
    expect(inboundLabel("illustrates", "exercise")).toBe(DRILLS_SHOW_LABEL);
    expect(inboundLabel("illustrates", "exercise", true)).toBe(DRILLS_LABEL);
    expect(inboundLabel("illustrates", "format")).toBe(RELATION_LABELS.illustrates.inbound);
    expect(inboundLabel("illustrates", "format", true)).toBe(RELATION_LABELS.illustrates.inbound);
    expect(inboundLabel("illustrates")).toBe(RELATION_LABELS.illustrates.inbound);
    expect(inboundLabel("requires", "exercise")).toBe(RELATION_LABELS.requires.inbound);
    expect(inboundLabel("requires", "exercise", true)).toBe(RELATION_LABELS.requires.inbound);
    expect(DRILLS_LABEL).not.toBe(RELATION_LABELS.illustrates.inbound);
    expect(DRILLS_SHOW_LABEL).not.toBe(RELATION_LABELS.illustrates.inbound);
    expect(DRILLS_SHOW_LABEL).not.toBe(DRILLS_LABEL);
    for (const relation of Object.keys(RELATION_LABELS) as (keyof typeof RELATION_LABELS)[]) {
      expect(outboundLabel(relation)).toBe(RELATION_LABELS[relation].outbound);
    }
  });

  it("keeps the counter case: an exercise's contrasts onto an antipattern, and no other pair", () => {
    // Since 2026-09-22 (entry 286) the 37 `contrasts` edges from drills to
    // failures read "Drills that counter this" on the failure's page and
    // "Counters" on the drill's; both types decide it, so a drill's
    // contrasts onto a principle and a principle's onto a failure keep the
    // symmetric word, as does the edge read without either type.
    const compare = RELATION_LABELS.contrasts;
    expect(isCounterEdge("contrasts", "exercise", "antipattern")).toBe(true);
    expect(isCounterEdge("contrasts", "antipattern", "exercise")).toBe(false);
    expect(isCounterEdge("contrasts", "exercise", "principle")).toBe(false);
    expect(isCounterEdge("contrasts", "principle", "antipattern")).toBe(false);
    expect(isCounterEdge("contrasts", "exercise")).toBe(false);
    expect(isCounterEdge("illustrates", "exercise", "antipattern")).toBe(false);
    expect(inboundLabel("contrasts", "exercise", false, "antipattern")).toBe(COUNTERS_LABEL);
    expect(inboundLabel("contrasts", "exercise", true, "antipattern")).toBe(COUNTERS_LABEL);
    expect(inboundLabel("contrasts", "exercise")).toBe(compare.inbound);
    expect(inboundLabel("contrasts", "exercise", false, "principle")).toBe(compare.inbound);
    // A principle's contrasts onto a failure kept "Compare" here until
    // 2026-09-22; it is the pair case now (entry 328, the next block).
    expect(inboundLabel("contrasts", "definition", false, "antipattern")).toBe(compare.inbound);
    expect(inboundLabel("contrasts")).toBe(compare.inbound);
    expect(inboundLabel("requires", "exercise", false, "antipattern")).toBe(
      RELATION_LABELS.requires.inbound,
    );
    expect(outboundLabel("contrasts", "exercise", "antipattern")).toBe(COUNTERS_OUTBOUND_LABEL);
    expect(outboundLabel("contrasts", "antipattern", "exercise")).toBe(compare.outbound);
    expect(outboundLabel("contrasts", "exercise", "technique")).toBe(compare.outbound);
    expect(outboundLabel("contrasts")).toBe(compare.outbound);
    // Distinct words, and distinct from every relation's own, or the split
    // groups merge in the reader's eye.
    expect(COUNTERS_LABEL).not.toBe(COUNTERS_OUTBOUND_LABEL);
    for (const { outbound, inbound } of Object.values(RELATION_LABELS)) {
      expect(COUNTERS_LABEL).not.toBe(inbound);
      expect(COUNTERS_OUTBOUND_LABEL).not.toBe(outbound);
    }
    expect(COUNTERS_LABEL).not.toBe(DRILLS_LABEL);
    expect(COUNTERS_LABEL).not.toBe(DRILLS_SHOW_LABEL);
  });

  it("keeps the pair case: contrasts between a principle and an antipattern, either way round", () => {
    // Since 2026-09-22 (entry 328) the 24 `contrasts` edges between the 9
    // principles and the 10 antipatterns — the map the principles hub draws
    // as "Failures this addresses" (entry 155) — read "Principle it
    // violates" on the failure's page and the hub's own phrase on the
    // principle's, in place of "Compare". Both orders are the pairing,
    // because `contrasts` is symmetric and the map reads it from either
    // end; any other pair of types, and the edge without types, keeps the
    // symmetric word, and the counter case is not the pair case.
    const compare = RELATION_LABELS.contrasts;
    expect(isPairEdge("contrasts", "principle", "antipattern")).toBe(true);
    expect(isPairEdge("contrasts", "antipattern", "principle")).toBe(true);
    expect(isPairEdge("contrasts", "exercise", "antipattern")).toBe(false);
    expect(isPairEdge("contrasts", "principle", "definition")).toBe(false);
    expect(isPairEdge("contrasts", "principle")).toBe(false);
    expect(isPairEdge("contrasts")).toBe(false);
    expect(isPairEdge("extends", "principle", "antipattern")).toBe(false);
    expect(pairLabel("antipattern")).toBe(PRINCIPLE_LABEL);
    expect(pairLabel("principle")).toBe(FAILURES_LABEL);
    expect(pairLabel("technique")).toBe(compare.outbound);
    expect(pairLabel()).toBe(compare.outbound);
    // The page's own edge: a failure toward a principle, a principle toward a failure.
    expect(outboundLabel("contrasts", "antipattern", "principle")).toBe(PRINCIPLE_LABEL);
    expect(outboundLabel("contrasts", "principle", "antipattern")).toBe(FAILURES_LABEL);
    expect(outboundLabel("contrasts", "principle", "definition")).toBe(compare.outbound);
    // The edge another atom declared: a principle onto a failure's page, and back.
    expect(inboundLabel("contrasts", "principle", false, "antipattern")).toBe(PRINCIPLE_LABEL);
    expect(inboundLabel("contrasts", "antipattern", false, "principle")).toBe(FAILURES_LABEL);
    expect(inboundLabel("contrasts", "principle", true, "antipattern")).toBe(PRINCIPLE_LABEL);
    expect(inboundLabel("contrasts", "principle", false, "technique")).toBe(compare.inbound);
    expect(inboundLabel("contrasts", "antipattern", false, "antipattern")).toBe(compare.inbound);
    expect(inboundLabel("requires", "principle", false, "antipattern")).toBe(
      RELATION_LABELS.requires.inbound,
    );
    // Distinct from each other, from the relations' words and from the
    // drills and counter words, or the groups merge in the reader's eye.
    expect(PRINCIPLE_LABEL).not.toBe(FAILURES_LABEL);
    for (const { outbound, inbound } of Object.values(RELATION_LABELS)) {
      for (const label of [PRINCIPLE_LABEL, FAILURES_LABEL]) {
        expect(label).not.toBe(outbound);
        expect(label).not.toBe(inbound);
      }
    }
    for (const other of [
      DRILLS_LABEL,
      DRILLS_SHOW_LABEL,
      COUNTERS_LABEL,
      COUNTERS_OUTBOUND_LABEL,
    ]) {
      expect(PRINCIPLE_LABEL).not.toBe(other);
      expect(FAILURES_LABEL).not.toBe(other);
    }
  });

  it("is what the mini graph's legend prints", () => {
    for (const relation of Object.keys(RELATION_LABELS) as (keyof typeof RELATION_LABELS)[]) {
      expect(RELATION_STYLE[relation].label).toBe(RELATION_LABELS[relation].outbound);
    }
  });

  it("no group is named after its container", () => {
    const detail = fs.readFileSync(path.join(SRC, "components", "AtomDetail.tsx"), "utf-8");
    // The outbound section is headed "Connections"; it was "Related" while
    // one of the groups inside it was also "Related".
    expect(detail).toMatch(/>\s*Connections\s*<\/h2>/);
    expect(detail).not.toMatch(/>\s*Related\s*<\/h2>/);
    for (const { outbound, inbound } of Object.values(RELATION_LABELS)) {
      expect(outbound).not.toBe("Connections");
      expect(inbound).not.toBe("Referenced by");
    }
  });

  it("is the only file under src/ that maps a relation to a string", () => {
    // The pattern every one of the four old maps shared: a `requires:` key
    // with a string literal value. The module and this test are the only
    // places it may appear; a fifth vocabulary fails here before it ships.
    const allowed = new Set([
      path.join(SRC, "lib", "relation-labels.ts"),
      path.join(SRC, "lib", "__tests__", "relation-labels.test.ts"),
    ]);
    const files = walk(SRC);
    // Guard the guard: the walk sees the whole tree, not an empty directory.
    expect(files.length).toBeGreaterThan(100);
    expect(files.filter((f) => allowed.has(f)).length).toBe(2);
    const offenders = files
      .filter((f) => !allowed.has(f))
      .filter((f) => /requires:\s*"/.test(fs.readFileSync(f, "utf-8")))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
    // The typed labels likewise: the drills words, the counter words and
    // the pair words are declared once, and every surface imports them —
    // the principles hub included, which spelled "Failures this addresses"
    // itself until 2026-09-22 (entry 328). Comments quote the words to
    // explain them, so only code is read.
    const literals = [
      DRILLS_LABEL,
      DRILLS_SHOW_LABEL,
      COUNTERS_LABEL,
      COUNTERS_OUTBOUND_LABEL,
      PRINCIPLE_LABEL,
      FAILURES_LABEL,
    ];
    const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const redeclared = files
      .filter((f) => !allowed.has(f) && !f.includes("__tests__"))
      .filter((f) => {
        const src = code(fs.readFileSync(f, "utf-8"));
        return literals.some((l) => src.includes(`"${l}"`) || src.includes(`'${l}'`));
      })
      .map((f) => path.relative(process.cwd(), f));
    expect(redeclared).toEqual([]);
    // The old names are gone from the three files that carried them.
    for (const file of [
      "components/AtomDetail.tsx",
      "lib/whats-next.ts",
      "lib/relation-style.ts",
    ]) {
      const src = fs.readFileSync(path.join(SRC, file), "utf-8");
      expect(src, file).toMatch(/from "(@\/lib|\.)\/relation-labels"/);
      expect(src, file).not.toMatch(
        /OUTBOUND_HINT|INBOUND_HINT|INBOUND_LABELS|RELATION_LABELS: Record/,
      );
    }
  });
});
