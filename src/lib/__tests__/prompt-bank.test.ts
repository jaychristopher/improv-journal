import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  PROMPT_BANK,
  PROMPT_CATEGORIES,
  PROMPT_USE_CASES,
  type PromptCategory,
  type PromptUseCase,
  RUBRIC_AXES,
  RUBRIC_WEIGHTS,
  suitsUseCase,
} from "../prompt-bank";

/**
 * The generator is only as good as the bank behind it.
 *
 * /improv-prompts is one of the faster-growing pages on the site, and the hero
 * became a tool that hands a reader one prompt at a time. A tool that draws
 * from a thin, repetitive or badly-scored bank feels broken within a minute,
 * so the population, the uniqueness and the scoring are all guarded here
 * rather than trusted.
 */
describe("the prompt bank", () => {
  it("is large enough to feel bottomless", () => {
    // 140 is what the article lists. The tool needs to keep going well past
    // the point where a reader has seen every one of those.
    expect(PROMPT_BANK.length).toBeGreaterThanOrEqual(420);
  });

  it("gives every category enough depth to run a whole class on", () => {
    for (const category of PROMPT_CATEGORIES) {
      const count = PROMPT_BANK.filter((p) => p.category === category.id).length;
      expect(count, category.id).toBeGreaterThanOrEqual(45);
    }
  });

  it("has unique ids and unique texts", () => {
    const ids = new Set<string>();
    const texts = new Set<string>();
    const dupes: string[] = [];
    for (const p of PROMPT_BANK) {
      if (ids.has(p.id)) dupes.push(`id ${p.id}`);
      ids.add(p.id);
      const key = p.text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
      if (texts.has(key)) dupes.push(`text ${p.text}`);
      texts.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it("only uses declared categories", () => {
    const known = new Set(PROMPT_CATEGORIES.map((c) => c.id));
    const strays = PROMPT_BANK.filter((p) => !known.has(p.category)).map((p) => p.id);
    expect(strays).toEqual([]);
  });

  it("scores every axis on the 1 to 5 scale", () => {
    const bad: string[] = [];
    for (const p of PROMPT_BANK) {
      for (const axis of RUBRIC_AXES) {
        const v = p.scores[axis.id];
        if (!Number.isInteger(v) || v < 1 || v > 5) bad.push(`${p.id} ${axis.id}=${v}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("weights each use case to sum to one, so scores stay comparable", () => {
    for (const useCase of PROMPT_USE_CASES) {
      const weights = RUBRIC_WEIGHTS[useCase.id];
      const total = RUBRIC_AXES.reduce((sum, axis) => sum + weights[axis.id], 0);
      expect(total, useCase.id).toBeCloseTo(1, 5);
    }
  });

  it("keeps prompt text short enough to read on a phone in one glance", () => {
    const long = PROMPT_BANK.filter((p) => p.text.length > 110).map((p) => p.text);
    expect(long).toEqual([]);
  });

  /**
   * The article's own three filters for a school room, applied mechanically.
   * A prompt that is not flagged as landing on somebody's life must not name
   * the things that land on somebody's life.
   */
  it("flags every prompt that touches a household, a body, money or a death", () => {
    const landsOnLife =
      /\b(mum|mom|mother|father|dad|parents?|divorce|funeral|ashes|hospital|inheritance|pregnan\w*|fertility|ex|dead|died|dying|fired|drunk|affair|sex|therapist|rehab|custody|grave|widow\w*|debt|cancer|overdose|prison)\b/i;
    const unflagged = PROMPT_BANK.filter((p) => !p.personal && landsOnLife.test(p.text)).map(
      (p) => p.text,
    );
    expect(unflagged).toEqual([]);
  });

  it("leaves every use case a deep pool in every category", () => {
    for (const useCase of PROMPT_USE_CASES) {
      for (const category of PROMPT_CATEGORIES) {
        const pool = PROMPT_BANK.filter(
          (p) => p.category === category.id && suitsUseCase(p, useCase.id),
        );
        // A reader who picks the narrowest combination still gets a session's worth.
        expect(pool.length, `${useCase.id}/${category.id}`).toBeGreaterThanOrEqual(20);
      }
    }
  });

  it("excludes what the article says to exclude from a school room", () => {
    const school: PromptUseCase = "school";
    const leaked = PROMPT_BANK.filter(
      (p) => (p.personal || p.adult || p.loud) && suitsUseCase(p, school),
    );
    expect(leaked.map((p) => p.text)).toEqual([]);
  });

  /**
   * The bank must contain everything the article lists, so the tool and the
   * page never disagree about what a good prompt is. This is also the guard
   * that stops a bank rewrite silently dropping the curated set.
   */
  it("contains every prompt the article itself lists", () => {
    const md = fs.readFileSync(
      path.join(process.cwd(), "content/bridges/improv-prompts.md"),
      "utf8",
    );
    const listed = md
      .split("\n")
      .filter((line) => /^- /.test(line))
      .map((line) => line.replace(/^- /, "").trim())
      .map((line) => line.replace(/^["“]|["”]$/g, ""));
    expect(listed.length).toBeGreaterThanOrEqual(140);

    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const inBank = new Set(PROMPT_BANK.map((p) => normalize(p.text)));
    const missing = listed.filter((text) => !inBank.has(normalize(text)));
    expect(missing).toEqual([]);
  });

  it("maps every category onto a heading the article actually has", () => {
    const md = fs.readFileSync(
      path.join(process.cwd(), "content/bridges/improv-prompts.md"),
      "utf8",
    );
    const headings = md
      .split("\n")
      .filter((line) => /^## /.test(line))
      .map((line) => line.replace(/^## /, "").trim());
    for (const category of PROMPT_CATEGORIES) {
      expect(headings, category.id).toContain(category.heading);
    }
  });

  it("writes first lines as things a person would say, without quote marks", () => {
    const lines = PROMPT_BANK.filter((p) => p.category === ("first-line" as PromptCategory));
    const quoted = lines.filter((p) => /^["“]/.test(p.text)).map((p) => p.text);
    expect(quoted).toEqual([]);
    const unpunctuated = lines.filter((p) => !/[.!?…]$/.test(p.text)).map((p) => p.text);
    expect(unpunctuated).toEqual([]);
  });
});
