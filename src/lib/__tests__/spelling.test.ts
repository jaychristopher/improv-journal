import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { SPELLING_PAIRS } from "../anchor-text";
import { loadBridges } from "../content";

/**
 * The corpus has no house spelling (tracker entry 279, 2026-09-22): theatre
 * and theater, behaviour and behavior, judgement and judgment, towards and
 * toward all appear, and most files use both conventions inside themselves.
 * Which convention is the author's choice and is not made here — no content
 * is touched. What this holds is the count of files that mix, per layer, as
 * a ceiling that may only fall, so the next edit that adds the other
 * spelling to a file that was consistent fails before it lands.
 *
 * A file "mixes" when it contains at least one British form and at least
 * one American form from SPELLING_PAIRS — whole words, inflections listed
 * one by one, the pairs anchor-text.ts reads for the footer label. A file
 * that is wholly British or wholly American is not counted; the test is
 * about consistency, not dialect.
 *
 * The entry's numbers (atoms 85, guides 62, lessons 6, paths 3, scripts 52)
 * came from a scratch script that is not in the tree. This list, on the same
 * day, counts atoms 66, guides 56, lessons 4, paths 2, scripts 41: lower on
 * every layer, and the by-word totals sit just under the entry's (theatre
 * 173 against its 188, toward 140 against its 155, towards 12 against 12),
 * which is what a script that matched prefixes rather than whole words
 * would have produced — "toward" inside "towards", "theatre" inside
 * "theatresports". The counts here are the ones the pairs list reproduces.
 */

const CONTENT = path.join(process.cwd(), "content");

interface Layer {
  name: string;
  dir: string;
  ext: string;
  /** Files the corpus had on 2026-09-22; a loader that finds fewer is broken. */
  atLeast: number;
  /** Files mixing both conventions on 2026-09-22. May only fall. */
  ceiling: number;
}

const LAYERS: Layer[] = [
  { name: "atoms", dir: "atoms", ext: ".md", atLeast: 200, ceiling: 66 },
  // 56 measured; theatre-games is the one deliberate case and is excluded
  // below, so the ceiling on the rest is 55.
  { name: "guides", dir: "bridges", ext: ".md", atLeast: 70, ceiling: 55 },
  { name: "lessons", dir: "threads", ext: ".md", atLeast: 20, ceiling: 4 },
  { name: "paths", dir: "paths", ext: ".md", atLeast: 10, ceiling: 2 },
  // The TTS scripts, cut from the pages, which inherit the pages' split and
  // add the hosts' own.
  { name: "scripts", dir: "scripts", ext: ".txt", atLeast: 300, ceiling: 41 },
];

/**
 * The one page that mixes on purpose. Its keywords are both spellings, held
 * from Ahrefs ("theatre games" 1,400 a month, "theater games" 1,900, one
 * parent topic), its body says both, and both are meant to be found. Named
 * here so the guides ceiling does not have to carry it, and guarded below so
 * the exception cannot outlive its reason.
 */
const DELIBERATE = new Set(["theatre-games"]);

function filesUnder(dir: string, ext: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) out.push(full);
    }
  };
  walk(dir);
  return out.sort();
}

/** Case-insensitive and not global: a global regex keeps lastIndex between `.test` calls. */
const wordRegex = (words: readonly string[]) => new RegExp(`\\b(?:${words.join("|")})\\b`, "i");
const BRITISH = wordRegex(SPELLING_PAIRS.map((p) => p[0]));
const AMERICAN = wordRegex(SPELLING_PAIRS.map((p) => p[1]));

function mixes(text: string): boolean {
  return BRITISH.test(text) && AMERICAN.test(text);
}

describe("house spelling", () => {
  it("lists pairs that differ only by dialect, each spelling once", () => {
    expect(SPELLING_PAIRS.length).toBeGreaterThanOrEqual(150);
    const seen = new Set<string>();
    for (const [british, american] of SPELLING_PAIRS) {
      expect(british).not.toBe(american);
      expect(british).toMatch(/^[a-z]+$/);
      expect(american).toMatch(/^[a-z]+$/);
      for (const word of [british, american]) {
        expect(seen.has(word), `${word} listed twice`).toBe(false);
        seen.add(word);
      }
    }
    // The bare noun/verb pair is deliberately absent: "practice" is British too.
    expect(seen.has("practice")).toBe(false);
    expect(seen.has("practise")).toBe(false);
  });

  for (const layer of LAYERS) {
    it(`${layer.name}: no more files mix British and American spelling than did on 2026-09-22`, () => {
      const files = filesUnder(path.join(CONTENT, layer.dir), layer.ext);
      expect(files.length, `${layer.name} loaded`).toBeGreaterThanOrEqual(layer.atLeast);

      const mixed = files
        .filter((f) => !DELIBERATE.has(path.basename(f, layer.ext)))
        .filter((f) => mixes(fs.readFileSync(f, "utf8")))
        .map((f) => path.relative(CONTENT, f).split(path.sep).join("/"));

      // Do not raise this to make a failure go away. If a file that was
      // consistent now mixes, fix the file; if the count fell, lower the
      // ceiling and date it.
      expect(mixed.length, `${layer.name} mixing:\n${mixed.join("\n")}`).toBeLessThanOrEqual(
        layer.ceiling,
      );
    });
  }

  it("keeps the deliberate exception only while it is one", async () => {
    // Guard the guard: the exemption is for a page that holds both keywords
    // from Ahrefs and says both. If either stops being true the page should
    // be counted like any other.
    const bridges = await loadBridges();
    for (const slug of DELIBERATE) {
      const bridge = bridges.find((b) => b.slug === slug);
      expect(bridge, slug).toBeDefined();
      const keywords = (bridge!.frontmatter.target_keywords ?? []).map((k) => k.keyword);
      expect(keywords).toContain("theatre games");
      expect(keywords).toContain("theater games");
      expect(mixes(bridge!.content), `${slug} no longer mixes`).toBe(true);
    }
  });
});
