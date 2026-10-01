import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { PROMPT_USE_CASES, RUBRIC_AXES, suitsUseCase, WORD_BANK, WORD_KIND } from "../prompt-bank";
import { bandPool } from "../prompt-generator";

/**
 * The word bank behind the "One word" kind (src/lib/prompt-words-data.ts).
 *
 * It sits outside PROMPT_BANK on purpose — the guide's title counts scene
 * starters and a word is not one — so none of the bank's guards see it, and
 * these are its own. The shape is the bank's (a Prompt with category `word`)
 * so the ranking, the bands and the seen store work unchanged; what differs
 * is what a row may be: one lower-case word, chosen for texture, scored by
 * the rule in the data file's header, flagged where it lands on a life or
 * needs adult knowledge, and never a cast, never combinable.
 */
describe("the word bank", () => {
  it("is deep enough for a hand of eight to eight groups", () => {
    // 91 drafted on 2026-09-30 for the owner's teacher to cut to about 80
    // (PG-2.1); the floor sits under the cut, not the draft.
    expect(WORD_BANK.length).toBeGreaterThanOrEqual(75);
  });

  it("is one lower-case word a row, every one different, in its own id space", () => {
    const texts = new Set<string>();
    for (const w of WORD_BANK) {
      expect(w.text, w.id).toMatch(/^[a-z]+$/);
      expect(texts.has(w.text), w.text).toBe(false);
      texts.add(w.text);
      expect(w.id).toMatch(/^word:/);
      expect(w.category).toBe("word");
    }
  });

  it("scores every axis on the 1 to 5 scale and carries neither a cast nor a place in the classic", () => {
    for (const w of WORD_BANK) {
      for (const axis of RUBRIC_AXES) {
        const v = w.scores[axis.id];
        expect(Number.isInteger(v) && v >= 1 && v <= 5, `${w.text} ${axis.id}`).toBe(true);
      }
      expect(w.cast, w.text).toBeUndefined();
      expect(w.combinable, w.text).toBe(false);
      expect(w.loud, w.text).toBe(false);
    }
  });

  it("flags every word that lands on a life, by the bank's own regex", () => {
    // The same pattern prompt-bank.test.ts holds the bank to, so the two
    // banks cannot disagree about what a school room keeps out.
    const landsOnLife =
      /\b(mum|mom|mother|father|dad|parents?|divorce|funeral|ashes|hospital|inheritance|pregnan\w*|fertility|ex|dead|died|dying|fired|drunk|affair|sex|therapist|rehab|custody|grave|widow\w*|debt|cancer|overdose|prison)\b/i;
    const unflagged = WORD_BANK.filter((w) => !w.personal && landsOnLife.test(w.text)).map(
      (w) => w.text,
    );
    expect(unflagged).toEqual([]);
    // And the guard on the guard: the regex does catch the owner's example.
    expect(WORD_BANK.some((w) => w.text === "inheritance" && w.personal)).toBe(true);
  });

  it("leaves every room a deep pool and three bands to draw from", () => {
    for (const room of PROMPT_USE_CASES) {
      const pool = WORD_BANK.filter((w) => suitsUseCase(w, room.id));
      expect(pool.length, room.id).toBeGreaterThanOrEqual(40);
      const bands = bandPool(pool, room.id);
      expect(bands.length, room.id).toBe(3);
      for (const band of bands) expect(band.length, room.id).toBeGreaterThan(0);
    }
  });

  it("keeps its coaching lines short, and has enough of them to meet", () => {
    const coached = WORD_BANK.filter((w) => w.coach);
    // 10 on 2026-09-30.
    expect(coached.length).toBeGreaterThanOrEqual(5);
    for (const w of coached) expect(w.coach!.length, w.text).toBeLessThanOrEqual(110);
  });

  it("uses no word the autolinker would turn into a link inside the guide's run", async () => {
    // A word that is an atom's id or its whole title would be linked where
    // the guide lists the words; "opening", "status" and "trust" were left
    // out for that reason and this holds the rule for the next draft.
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const taken = new Set<string>();
    for (const a of atoms) {
      taken.add(a.frontmatter.id.toLowerCase());
      taken.add(a.frontmatter.title.toLowerCase());
    }
    const clashes = WORD_BANK.map((w) => w.text).filter((t) => taken.has(t));
    expect(clashes).toEqual([]);
  });
  it("is listed in full in the guide's section, as runs rather than list items", () => {
    // Every word is on the page under the kind's own heading, so nothing about
    // words is "unlisted"; and as bold-labelled comma runs, never `- ` lines,
    // because three of the bank's guards read a `- ` line as a scene starter
    // that must be in PROMPT_BANK.
    const markdown = fs.readFileSync(
      path.join(process.cwd(), "content", "bridges", "improv-prompts.md"),
      "utf8",
    );
    const heading = `## ${WORD_KIND.heading}`;
    const start = markdown.indexOf(heading);
    expect(start).toBeGreaterThan(-1);
    const rest = markdown.slice(start + heading.length);
    const section = rest.slice(0, rest.search(/^## /m));
    const listed = new Set<string>();
    for (const m of section.matchAll(/^\*\*[^*]+:\*\* (.+)$/gm)) {
      for (const w of m[1].replace(/\.$/, "").split(",")) listed.add(w.trim());
    }
    expect(listed.size).toBeGreaterThanOrEqual(75);
    expect([...listed].sort()).toEqual(WORD_BANK.map((w) => w.text).sort());
    expect(section.match(/^- /m)).toBeNull();
  });
});
