import { beforeAll, describe, expect, it } from "vitest";

import type { AtomType } from "../schema";
import {
  getScriptRegister,
  MIN_TAG_USES_FOR_RATIO,
  registerFor,
  type ScriptRegister,
} from "../script-register";

/**
 * The per-type delivery register, held as readings rather than rules.
 *
 * Every figure here was measured on 2026-09-22 (tracker entry 348) over the
 * atom scripts only, emote tags only, at 8 uses or more per type. They will
 * drift as scripts are re-cut, which is the point of the tolerance: a reading
 * that moved gets re-dated, never a threshold lowered to make it pass.
 *
 * What is asserted tightly is the shape — that the reader returns a profile
 * at all, over a population large enough for a ratio to mean something — and
 * one structural claim that should survive any re-cut: the corpus voices a
 * `pattern` assertively and an `antipattern` gently. That is a judgement about
 * the type system (entries 143, 159, 231) which no page surface makes, and it
 * agrees with the counter-line work of entries 286 and 322 without either
 * having known about the other.
 */

let register: ScriptRegister;

function ratio(type: AtomType, tag: string): number {
  const row = registerFor(register, type);
  expect(row, type).toBeDefined();
  const rate = row!.profile.find((p) => p.tag === tag);
  expect(rate, `${type}/${tag}`).toBeDefined();
  return rate!.ratio;
}

/** A reading, not a rule: dated above, generous enough to absorb a re-cut. */
function reading(type: AtomType, tag: string, measured: number): void {
  const actual = ratio(type, tag);
  expect(actual, `${type}/${tag} measured ${measured}, now ${actual.toFixed(2)}`).toBeCloseTo(
    measured,
    0,
  );
}

describe("script register", () => {
  beforeAll(async () => {
    register = await getScriptRegister();
  });

  it("profiles every atom type that has scripts", () => {
    // Populations, so a broken join fails instead of returning an empty
    // profile that every ratio assertion would skip over.
    expect(register.byType.length).toBeGreaterThanOrEqual(10);
    expect(register.corpusTags).toBeGreaterThanOrEqual(6_000);
    expect(register.corpus.size).toBeGreaterThanOrEqual(9);

    for (const row of register.byType) {
      expect(row.scripts, row.type).toBeGreaterThan(0);
      expect(row.tags, row.type).toBeGreaterThan(0);
      expect(row.profile.length, row.type).toBeGreaterThan(0);
      for (const rate of row.profile) {
        expect(rate.count, `${row.type}/${rate.tag}`).toBeGreaterThanOrEqual(
          MIN_TAG_USES_FOR_RATIO,
        );
        expect(rate.ratio, `${row.type}/${rate.tag}`).toBeGreaterThan(0);
        expect(Number.isFinite(rate.ratio), `${row.type}/${rate.tag}`).toBe(true);
      }
      // Sorted most over-represented first, which is how the header table and
      // the seeds page read it.
      const ratios = row.profile.map((p) => p.ratio);
      expect([...ratios].sort((a, b) => b - a)).toEqual(ratios);
    }

    // The baseline is the sum of the per-type counts: no tag counted twice,
    // none dropped, so a ratio of 1 really is the corpus rate.
    const perType = register.byType.reduce((sum, r) => sum + r.tags, 0);
    expect(perType).toBe(register.corpusTags);
    // Every atom script is accounted for.
    expect(register.byType.reduce((sum, r) => sum + r.scripts, 0)).toBeGreaterThanOrEqual(200);
  });

  it("voices a pattern assertively and an antipattern gently", () => {
    // The structural claim, and the one worth keeping if every number drifts:
    // failures are discussed warmly and patterns confidently. No page says
    // this; only the voice model is told.
    expect(ratio("pattern", "confident")).toBeGreaterThan(ratio("pattern", "warm"));
    expect(ratio("antipattern", "warm")).toBeGreaterThan(ratio("antipattern", "emphatic"));
    expect(ratio("antipattern", "warm")).toBeGreaterThan(ratio("pattern", "warm"));
  });

  it("holds the strongest ratios as dated readings", () => {
    // 2026-09-22, each within half a point, which absorbs a re-cut or 2.
    reading("principle", "conversational", 1.78);
    reading("principle", "matter-of-fact", 0.57);
    reading("insight", "warm", 1.77);
    reading("law", "warm", 1.63);
    reading("technique", "confident", 1.56);
    reading("technique", "matter-of-fact", 0.42);
    reading("reference", "matter-of-fact", 1.52);
    reading("reference", "warm", 0.52);
    reading("pattern", "confident", 1.46);
    reading("antipattern", "warm", 1.31);
  });
});
