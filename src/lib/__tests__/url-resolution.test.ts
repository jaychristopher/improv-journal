import { describe, it, expect } from "vitest";
import { getAtomUrl } from "../content";
import type { AtomType } from "../schema";

describe("getAtomUrl", () => {
  // ─── System URLs ──────────────────────────────────────────────────────────

  it("maps axiom atoms to /system/{id}", () => {
    expect(getAtomUrl({ id: "irreversibility", type: "axiom" })).toBe(
      "/system/irreversibility"
    );
    expect(getAtomUrl({ id: "cognitive-bandwidth", type: "axiom" })).toBe(
      "/system/cognitive-bandwidth"
    );
  });

  it("maps insight atoms to /system/{id}", () => {
    expect(getAtomUrl({ id: "reality-construction", type: "insight" })).toBe(
      "/system/reality-construction"
    );
    expect(getAtomUrl({ id: "beyond-the-stage", type: "insight" })).toBe(
      "/system/beyond-the-stage"
    );
  });

  it("maps principle atoms to /system/principles/{id}", () => {
    expect(getAtomUrl({ id: "be-present", type: "principle" })).toBe(
      "/system/principles/be-present"
    );
    expect(getAtomUrl({ id: "be-brave", type: "principle" })).toBe(
      "/system/principles/be-brave"
    );
  });

  it("maps antipattern atoms to /system/diagnosis/{id}", () => {
    expect(getAtomUrl({ id: "bulldozing", type: "antipattern" })).toBe(
      "/system/diagnosis/bulldozing"
    );
  });

  it("maps pattern atoms to /system/diagnosis/{id}", () => {
    expect(getAtomUrl({ id: "heightening", type: "pattern" })).toBe(
      "/system/diagnosis/heightening"
    );
  });

  it("maps framework atoms to /system/diagnosis/{id}", () => {
    expect(
      getAtomUrl({ id: "systemic-collapse-modes", type: "framework" })
    ).toBe("/system/diagnosis/systemic-collapse-modes");
  });

  // ─── Practice URLs ────────────────────────────────────────────────────────

  it("maps exercise atoms to /practice/exercises/{id}", () => {
    expect(getAtomUrl({ id: "mirroring", type: "exercise" })).toBe(
      "/practice/exercises/mirroring"
    );
  });

  it("maps technique atoms to /practice/techniques/{id}", () => {
    expect(getAtomUrl({ id: "yes-and", type: "technique" })).toBe(
      "/practice/techniques/yes-and"
    );
    expect(getAtomUrl({ id: "active-listening", type: "technique" })).toBe(
      "/practice/techniques/active-listening"
    );
  });

  it("maps pedagogy atoms to /practice/techniques/{id}", () => {
    expect(getAtomUrl({ id: "side-coaching", type: "pedagogy" })).toBe(
      "/practice/techniques/side-coaching"
    );
  });

  it("maps format atoms to /practice/formats/{id}", () => {
    expect(getAtomUrl({ id: "harold", type: "format" })).toBe(
      "/practice/formats/harold"
    );
    expect(getAtomUrl({ id: "armando", type: "format" })).toBe(
      "/practice/formats/armando"
    );
  });

  it("maps definition atoms to /practice/vocabulary/{id}", () => {
    expect(getAtomUrl({ id: "offers", type: "definition" })).toBe(
      "/practice/vocabulary/offers"
    );
    expect(getAtomUrl({ id: "game-of-the-scene", type: "definition" })).toBe(
      "/practice/vocabulary/game-of-the-scene"
    );
  });

  // ─── Library URLs ─────────────────────────────────────────────────────────

  it("maps reference atoms to /library/{id}", () => {
    expect(getAtomUrl({ id: "ref-impro-johnstone", type: "reference" })).toBe(
      "/library/ref-impro-johnstone"
    );
  });

  // ─── Coverage ─────────────────────────────────────────────────────────────

  it("handles every AtomType without falling to default", () => {
    const types: AtomType[] = [
      "principle",
      "technique",
      "exercise",
      "insight",
      "definition",
      "pattern",
      "antipattern",
      "axiom",
      "framework",
      "reference",
      "format",
      "pedagogy",
    ];
    for (const type of types) {
      const url = getAtomUrl({ id: "test", type });
      expect(url).not.toBe("/atoms/test"); // should never fall to old URL
      expect(url).toMatch(
        /^\/(system|practice|library)\//
      );
    }
  });

  it("never produces a URL containing /atoms/", () => {
    const types: AtomType[] = [
      "principle", "technique", "exercise", "insight", "definition",
      "pattern", "antipattern", "axiom", "framework", "reference",
      "format", "pedagogy",
    ];
    for (const type of types) {
      const url = getAtomUrl({ id: "anything", type });
      expect(url).not.toContain("/atoms/");
    }
  });
});
