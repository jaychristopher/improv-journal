import { describe, expect, it } from "vitest";

import { CLASSIC_PARTS, PROMPT_BANK, PROMPT_USE_CASES, settingsFor } from "@/lib/prompt-bank";
import {
  classicCombinations,
  classicPools,
  pickClassic,
  redrawPool,
  sharesSetting,
} from "@/lib/prompt-generator";
import { ANYWHERE, PROMPT_SETTING_ROWS, PROMPT_SETTINGS } from "@/lib/prompt-settings-data";

/**
 * The three lines have to be able to happen at once.
 *
 * Reported on 2026-10-08, with the axes already pure: "they still end up being
 * incohesive too often ... why would they be loading a dishwasher in a school
 * library, this doesn't make sense". Three clean pools drawn independently
 * gave 433,650 triples and most of them could not happen, because purity is a
 * property of one line and coexistence is not. prompt-classic.test.ts checks
 * each line names one axis; nothing checked that the three shared a world.
 *
 * The fix anchors the draw on the Where and fits the other two to it. These
 * tests hold both halves: that the data saying where a line can be is complete
 * (a missing entry must fail, not default to portable — that opt-out trap is
 * what caused the previous bug in this subject), and that no draw or redraw can
 * put a line somewhere it cannot be.
 */
describe("the settings data is complete", () => {
  const combinable = PROMPT_BANK.filter((p) => p.combinable);

  it("declares a setting for every line that can be drawn", () => {
    // Guard the guard: if this population collapses the rest passes vacuously.
    expect(combinable.length).toBeGreaterThanOrEqual(225);
    const missing = combinable.filter((p) => !(p.text in PROMPT_SETTING_ROWS));
    expect(missing.map((p) => `[${p.category}] ${p.text}`)).toEqual([]);
  });

  it("holds no entry for a line that cannot be drawn", () => {
    // An orphan means a prompt was reworded or excluded and its setting was
    // left behind, which would silently stop constraining anything.
    const texts = new Set(combinable.map((p) => p.text));
    expect(Object.keys(PROMPT_SETTING_ROWS).filter((t) => !texts.has(t))).toEqual([]);
  });

  it("uses only settings the taxonomy names", () => {
    const known = new Set<string>(PROMPT_SETTINGS);
    for (const [text, raw] of Object.entries(PROMPT_SETTING_ROWS)) {
      if (raw === ANYWHERE) continue;
      for (const setting of raw.split("|")) {
        expect(known, `${text} -> ${setting}`).toContain(setting);
      }
    }
  });

  it("never lets a location be anywhere", () => {
    // The Where is the anchor. A location that claimed to be every kind of
    // place would constrain nothing and the bug would be back for that row.
    const places = combinable.filter((p) => p.category === "location");
    expect(places.length).toBeGreaterThanOrEqual(70);
    for (const place of places) {
      expect(PROMPT_SETTING_ROWS[place.text], place.text).not.toBe(ANYWHERE);
      expect(place.settings.length, place.text).toBeLessThan(PROMPT_SETTINGS.length);
    }
  });

  it("leaves every location enough partners to be worth drawing", () => {
    // Cohesion costs combinations, and the cost is not spread evenly: it lands
    // on the narrowest places. This measures the worst one rather than the
    // average, because a healthy average hides a location with two partners.
    //
    // Measured 2026-10-08: the thinnest is the fertility clinic at 24 Whos x
    // 38 Whats in an open room, and a dentist's waiting room at 12 x 36 in the
    // school room, which is the narrowest room because it drops every `a` row.
    // Floors set just under those. 22 of 98 Whos and 34 of 59 Whats travel,
    // which is what pays for this; if that share fell these floors would go
    // first, which is why the assertion is here and not on the share.
    for (const room of PROMPT_USE_CASES) {
      const pools = classicPools(PROMPT_BANK, room.id);
      // 75 in an open room, 66 in the school room, which drops every `a` row.
      expect(pools.location.length, room.id).toBeGreaterThanOrEqual(60);
      for (const place of pools.location) {
        const whos = pools.relationship.filter((p) => sharesSetting(p, place));
        const whats = pools.task.filter((p) => sharesSetting(p, place));
        const where = `${room.id}: ${place.text}`;
        expect(whos.length, where).toBeGreaterThanOrEqual(10);
        expect(whats.length, where).toBeGreaterThanOrEqual(30);
      }
    }
  });
});

describe("no draw puts a line where it cannot be", () => {
  it("fits the Who and the What to the Where, in every room", () => {
    for (const room of PROMPT_USE_CASES) {
      const seen = new Set<string>();
      let drawn = 0;
      // Enough draws to walk the pools dry and keep going, since the spent-pool
      // path is where an unconstrained fallback would have hidden.
      for (let i = 0; i < 250; i++) {
        const draw = pickClassic(PROMPT_BANK, room.id, seen);
        const place = draw.location;
        expect(place, room.id).not.toBeNull();
        for (const part of ["relationship", "task"] as const) {
          const line = draw[part];
          if (!line) continue;
          expect(
            sharesSetting(line.prompt, place!.prompt),
            `${room.id}: "${line.prompt.text}" cannot be at "${place!.prompt.text}"`,
          ).toBe(true);
          drawn++;
        }
        for (const part of CLASSIC_PARTS) {
          const line = draw[part];
          if (line) seen.add(line.prompt.id);
        }
      }
      expect(drawn, room.id).toBeGreaterThan(400);
    }
  });

  it("redraws one line without breaking the two it leaves", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 120; i++) {
      const draw = pickClassic(PROMPT_BANK, "any", seen);
      for (const part of CLASSIC_PARTS) {
        const pool = redrawPool(PROMPT_BANK, part, "any", draw);
        expect(pool.length, part).toBeGreaterThan(0);
        const others = CLASSIC_PARTS.filter((p) => p !== part)
          .map((p) => draw[p]?.prompt)
          .filter((p) => Boolean(p));
        for (const candidate of pool) {
          for (const other of others) {
            expect(
              sharesSetting(candidate, other!),
              `${part} "${candidate.text}" vs "${other!.text}"`,
            ).toBe(true);
          }
        }
      }
      for (const part of CLASSIC_PARTS) {
        const line = draw[part];
        if (line) seen.add(line.prompt.id);
      }
    }
  });

  it("cannot put the reported draw back together", () => {
    // The exact one that was reported, by name, so the regression is legible.
    const dishwasher = PROMPT_BANK.find((p) => p.text.startsWith("Someone loading a dishwasher"));
    const library = PROMPT_BANK.find((p) => p.text === "A school library in the summer holidays");
    const neighbours = PROMPT_BANK.find(
      (p) => p.text === "Two neighbours whose cats have swapped homes",
    );
    expect(dishwasher && library && neighbours).toBeTruthy();
    expect(sharesSetting(dishwasher!, library!)).toBe(false);
    expect(sharesSetting(neighbours!, library!)).toBe(false);
    // And it is still a scene where it belongs.
    const kitchen = PROMPT_BANK.find((p) => p.text.startsWith("A kitchen with the smoke alarm"));
    expect(sharesSetting(dishwasher!, kitchen!)).toBe(true);
    expect(sharesSetting(neighbours!, kitchen!)).toBe(true);
  });

  it("still offers more starts than anyone will use", () => {
    // Coherent triples only, counted per location. The old number was the
    // product of the three pools, which counted the ones that could not happen.
    const total = classicCombinations(PROMPT_BANK, "any");
    expect(total).toBeGreaterThan(50_000);
    expect(settingsFor("A school library in the summer holidays")).toEqual(["school"]);
  });
});
