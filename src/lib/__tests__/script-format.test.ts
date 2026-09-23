import { describe, expect, it } from "vitest";

import {
  getScriptGuideFormat,
  getScripts,
  PROVENANCE_MARKERS,
  type ScriptFile,
  type ScriptGuideFormat,
} from "../script-register";

/**
 * `content/scripts/SCRIPT_GUIDE.md` against the scripts that were written to it.
 *
 * The guide is a specification — 9 emote tags, 3 pacing tags, no markdown, no
 * speaker labels, 800-1200 words — and on 2026-09-22 it was the best-kept
 * schema in the corpus and the only one with no test: 319 scripts, 12,800
 * bracketed directions, 5 outside the vocabulary, 0 files with markdown or a
 * speaker label (tracker entry 348). That is the shape entry 144 predicted, a
 * schema kept exactly where a machine reads it — the voice model reads these,
 * and `transcripts.ts` deletes every tag before a person sees a word.
 *
 * Nothing here retypes the guide. The vocabulary and both word bands are
 * parsed out of it, so editing the specification moves the guard rather than
 * breaking it, and a guide whose Format section stops parsing throws instead
 * of silently permitting everything.
 *
 * The word band is a reading, not a rule: the count outside it is held as a
 * ceiling that may only fall, because which scripts get re-cut to length is
 * the author's recording decision. `docs/seeds.md` lists them for that call.
 */

const format: ScriptGuideFormat = getScriptGuideFormat();
const scripts = getScripts();
const vocabulary = new Set(format.tags);

/** Every bracketed direction in the corpus, with the file it came from. */
const uses = scripts.flatMap((s) => s.directions.map((tag) => ({ tag, file: s.file })));

const strays = uses.filter((u) => !vocabulary.has(u.tag) && !PROVENANCE_MARKERS.has(u.tag));

/**
 * The 5 delivery tags in the corpus that the guide does not define, on
 * 2026-09-22. Each is a plausible direction a writer reached for mid-script;
 * the fix is either a re-cut line or a 13th tag in the guide, and both are
 * the author's. Allowed by name so a 6th cannot arrive unnoticed, and held as
 * a ceiling: this list may shrink, never grow.
 */
const ALLOWED_STRAYS: readonly string[] = [
  "quiet in content/scripts/atoms/be-brave-tts.txt",
  "amused in content/scripts/atoms/ref-wickens-multiple-resources-tts.txt",
  "quiet in content/scripts/bridges/active-listening-tts.txt",
  "surprised in content/scripts/bridges/how-to-give-feedback-tts.txt",
  "laughs in content/scripts/bridges/how-to-make-small-talk-tts.txt",
];

function inBand(script: ScriptFile): boolean {
  const band = script.layer === "threads" ? format.threadWordBand : format.wordBand;
  return script.words >= band.min && script.words <= band.max;
}

describe("script format", () => {
  it("reads a vocabulary and a word band out of the guide itself", () => {
    // Guard the guard: a Format section that stopped parsing would give an
    // empty vocabulary, and every assertion below would pass on nothing.
    expect(format.emoteTags.length).toBeGreaterThanOrEqual(9);
    expect(format.pauseTags.length).toBeGreaterThanOrEqual(3);
    expect(format.tags.length).toBe(format.emoteTags.length + format.pauseTags.length);
    expect(format.emoteTags).toContain("curious");
    expect(format.pauseTags).toContain("short pause");
    // The guide's example block writes `[emote]` as a placeholder; it is not a tag.
    expect(format.tags).not.toContain("emote");
    expect(format.wordBand.min).toBeGreaterThan(0);
    expect(format.wordBand.max).toBeGreaterThan(format.wordBand.min);
    // Lessons have their own, longer target in the guide's own words.
    expect(format.threadWordBand.min).toBeGreaterThan(format.wordBand.max);
  });

  it("finds every published script and its directions", () => {
    // Populations, so a changed glob fails instead of passing vacuously.
    expect(scripts.length).toBeGreaterThanOrEqual(300);
    expect(uses.length).toBeGreaterThanOrEqual(10_000);
    for (const layer of ["atoms", "bridges", "paths", "threads"] as const) {
      expect(scripts.filter((s) => s.layer === layer).length, layer).toBeGreaterThan(0);
    }
    // Every script is a dialogue with directions and words in it.
    for (const s of scripts) {
      expect(s.directions.length, s.file).toBeGreaterThanOrEqual(10);
      expect(s.words, s.file).toBeGreaterThan(0);
    }
  });

  it("uses only tags the guide defines, bar 5 named strays", () => {
    const named = strays.map((s) => `${s.tag} in ${s.file}`).sort();
    // Each stray is in the allowance by name: a new one fails here.
    for (const stray of named) expect(ALLOWED_STRAYS, stray).toContain(stray);
    // Ceiling, 2026-09-22: 5 of 12,800. It may only fall.
    expect(named.length).toBeLessThanOrEqual(ALLOWED_STRAYS.length);
    // And the overwhelming majority are in vocabulary, so the assertion above
    // is measuring a kept schema rather than an unparsed one.
    const inVocabulary = uses.filter((u) => vocabulary.has(u.tag));
    expect(inVocabulary.length).toBeGreaterThanOrEqual(12_000);
  });

  it("carries the rewrite marker on its own line and nowhere else", () => {
    // `[rewritten]` is provenance, not delivery: 310 of the 319 scripts end on
    // it. It is named rather than counted as a stray, and the shape is held so
    // it cannot drift into the middle of a script and be read as a direction.
    const marked = scripts.filter((s) => s.directions.some((t) => PROVENANCE_MARKERS.has(t)));
    expect(marked.length).toBeGreaterThanOrEqual(300);
    for (const s of marked) {
      const markers = s.directions.filter((t) => PROVENANCE_MARKERS.has(t));
      expect(markers.length, s.file).toBe(1);
      expect(s.directions.at(-1), s.file).toBe(markers[0]);
    }
  });

  it("contains no markdown", () => {
    // Hard assertion: 0 files violate this today, so a floor would be a lie.
    // A heading or a bold run reaches the voice model as spoken punctuation.
    const headings = scripts.filter((s) => s.headingLines.length > 0);
    const bold = scripts.filter((s) => s.boldRuns > 0);
    expect(headings.map((s) => s.file)).toEqual([]);
    expect(bold.map((s) => s.file)).toEqual([]);
  });

  it("contains no speaker labels", () => {
    // Also 0 today. The 2 voices alternate by paragraph; a label would be read
    // aloud as a letter, and `transcripts.ts` strips brackets, not prefixes.
    const labelled = scripts.filter((s) => s.speakerLabelLines.length > 0);
    expect(labelled.map((s) => s.file)).toEqual([]);
  });

  it("holds the count outside the word band as a ceiling", () => {
    const outside = scripts.filter((s) => !inBand(s));
    // Reading, 2026-09-22: 43 of 319 outside their own layer's band — 13 atoms
    // short, 18 guides long, 1 path long, 11 lessons short of the longer band.
    // Counted in spoken words, directions stripped, which is what
    // `transcripts.ts` builds and what a listener hears. Counting the brackets
    // as words as well, and holding every layer to 800-1200 as tracker entry
    // 348's table did, gives 56. A ceiling, because the fix is a re-cut and
    // that is the author's call, not the code's.
    expect(outside.length).toBeLessThanOrEqual(43);
    // Guard the guard: most scripts are inside, so the ceiling is measuring
    // conformance rather than a band that parsed as something absurd.
    expect(scripts.length - outside.length).toBeGreaterThanOrEqual(260);
    // A lesson script is legitimately longer, and the guide says so itself:
    // threads are checked against 1500-2500. Held to 800-1200 they would read
    // as 22 failures out of 25, which is why the band is per layer here.
    const threads = scripts.filter((s) => s.layer === "threads");
    expect(threads.length).toBeGreaterThanOrEqual(20);
    expect(threads.filter((s) => s.words > format.wordBand.max).length).toBeGreaterThanOrEqual(20);
    // Ceiling, 2026-09-22: 11 of the 25 lessons fall short of their own band
    // and none exceeds it.
    expect(threads.filter((s) => !inBand(s)).length).toBeLessThanOrEqual(11);
  });
});
