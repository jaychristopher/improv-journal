import fs from "node:fs";
import path from "node:path";

import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";

import { SPELLING_PAIRS } from "../anchor-text";
import { loadBridges } from "../content";
import { MINISEARCH_OPTIONS } from "../search-index";
import { normaliseDialect } from "../search-index-options.mjs";

const ROOT = process.cwd();
const INDEX = path.join(ROOT, "public", "search-index.json");

function loadIndex() {
  const json = fs.readFileSync(INDEX, "utf-8");
  return { json, ms: MiniSearch.loadJSON(json, MINISEARCH_OPTIONS) };
}

function urls(ms: MiniSearch, query: string): string[] {
  return ms.search(query, MINISEARCH_OPTIONS.searchOptions).map((r) => r.url as string);
}

/**
 * Site search reads British and American spellings as one term.
 *
 * MiniSearch's `fuzzy: 0.2` allows one edit at seven letters, and *theatre*
 * → *theater* is a transposition, two edits under the Levenshtein distance
 * it uses; nor is either a prefix of the other. So the two spellings were
 * two terms, the index held 31 documents that spelt it only the British way
 * and 44 only the American, and the guide that targets "theater games"
 * (Ahrefs 1,900 a month) ranked eighth of 79 for that query and first of 88
 * for "theatre games" (tracker entry 311, 2026-09-22). The one-edit pairs
 * were only half served: "behaviour" returned 24 results and "behavior" 32,
 * because fuzzy matching reaches the other spelling and scores it lower.
 *
 * The fix is `normaliseDialect` in `processTerm` on the one shared options
 * object, folding every British form in anchor-text's SPELLING_PAIRS to its
 * American twin at index time and at query time. Measured after the change
 * on the same day: "theater games" #1 of 91, both spellings 91 results in
 * the same order; behaviour/behavior 32 and 32, identical; the index 442,512
 * → 442,163 bytes.
 *
 * These search through the loader's options, as the browser does, and read
 * the built index, as the browser does, so a builder that folds while the
 * loader does not — or the reverse — fails here rather than in the search
 * box. The aliases bug of 2026-08-27 was exactly that shape.
 */
describe("site search folds dialect spellings", () => {
  it("maps every British form in SPELLING_PAIRS to its American twin, and nothing else", () => {
    // 190 pairs on 2026-09-22; a truncated table would make the loop vacuous.
    expect(SPELLING_PAIRS.length).toBeGreaterThanOrEqual(150);
    for (const [british, american] of SPELLING_PAIRS) {
      expect(normaliseDialect(british), british).toBe(american);
      // The canonical side is a fixed point, so a document already spelt
      // American is not re-spelt away from what the reader types.
      expect(normaliseDialect(american), american).toBe(american);
    }
    for (const word of ["improv", "games", "theatresports", "practice", "licence", "grey"]) {
      expect(normaliseDialect(word), word).toBe(word);
    }
    // MiniSearch's default processTerm lower-cases; ours must still, and then fold.
    expect(MINISEARCH_OPTIONS.processTerm("Theatre")).toBe("theater");
    expect(MINISEARCH_OPTIONS.processTerm("BEHAVIOUR")).toBe("behavior");
    expect(MINISEARCH_OPTIONS.processTerm("Harold")).toBe("harold");
  });

  it("built the index with no British term from the table in it", () => {
    const { json } = loadIndex();
    const parsed = JSON.parse(json) as { index: [string, unknown][] };
    const terms = new Set(parsed.index.map(([term]) => term));
    // 4,214 terms on 2026-09-22; the guard, so an emptied index cannot pass.
    expect(terms.size).toBeGreaterThanOrEqual(3500);
    expect(terms.has("theater")).toBe(true);
    expect(terms.has("behavior")).toBe(true);
    // The corpus writes these British forms (tracker entry 279: theatre 173
    // times, behaviour 108), so their absence here is the builder folding,
    // not the corpus never saying them.
    const british = SPELLING_PAIRS.map(([b]) => b).filter((b) => terms.has(b));
    expect(british).toEqual([]);
  });

  it("returns the theatre-games guide first for both spellings of its keyword", () => {
    const { ms } = loadIndex();
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);
    const british = urls(ms, "theatre games");
    const american = urls(ms, "theater games");
    expect(british[0]).toBe("/theatre-games");
    expect(american[0]).toBe("/theatre-games");
    // Not merely both first: the same results in the same order, since the
    // two queries are now one query.
    expect(american).toEqual(british);
    expect(british.length).toBeGreaterThanOrEqual(60);
  });

  /**
   * A small fixture of pairs, one from each shape the table holds: the
   * two-edit transposition, the -our/-or, -ise/-ize, -re/-er, -ement/-ment
   * and -wards/-ward families, and a capitalised query, since the fold
   * follows the lower-casing. Each side must return something, or the
   * equality would hold on two empty lists.
   */
  it("returns the same results, in the same order, for each dialect pair", () => {
    const { ms } = loadIndex();
    const pairs: [british: string, american: string][] = [
      ["theatre", "theater"],
      ["behaviour", "behavior"],
      ["judgement", "judgment"],
      ["towards", "toward"],
      ["realise", "realize"],
      ["centre", "center"],
      ["organisation", "organization"],
      ["favourite", "favorite"],
      ["Behaviour", "behavior"],
      ["improv theatre", "improv theater"],
    ];
    for (const [british, american] of pairs) {
      const a = ms.search(british, MINISEARCH_OPTIONS.searchOptions);
      const b = ms.search(american, MINISEARCH_OPTIONS.searchOptions);
      expect(a.length, british).toBeGreaterThan(0);
      expect(
        a.map((r) => [r.url, r.score]),
        `"${british}" and "${american}"`,
      ).toEqual(b.map((r) => [r.url, r.score]));
    }
  });

  /**
   * Every guide's primary keyword returns the guide first.
   *
   * This is the one number that says the site's search and its SEO
   * discipline agree. Measured 2026-09-22, before and after the fold: 71 of
   * 78 first, 77 in the top three. The fold did not move the count, because
   * the theatre-games guide declares "theatre games" as its primary and
   * "theater games" second — the American spelling is what the fold fixed,
   * and it is asserted above. The seven that were not first were collisions,
   * not spelling: five were the concept or reference the guide is about
   * outranking it on its title ("psychological safety" → Edmondson's paper;
   * "viola spolin" → her book; "yes and improv" → the Yes, And technique;
   * "anne bogart viewpoints" → the Viewpoints book; "how to be present" →
   * the Be Present principle), and the other two a sibling guide ("how to
   * stop overthinking" → the relationship variant) and a hub ("improv warm
   * up games" → /improv-games, the guide second).
   *
   * Later the same day the five twins were answered by indexing each
   * guide's primary keyword as a field of its own (tracker entry 316;
   * search-names.test.ts has the account and the twin-by-twin check), and
   * the count rose to 76 first, 78 in the top three. The two that remain
   * are the sibling and the hub, each a reasonable first answer for a
   * reader who typed those words; whether the guide should beat them is a
   * ranking question, not a spelling one, and is left as debt here.
   *
   * The floor is one under the count so a rewording does not fail it; the
   * miss list is exact so a guide that newly loses its own keyword is named.
   */
  it("returns each guide first for its primary keyword, with the misses named", async () => {
    const bridges = await loadBridges();
    const withKeyword = bridges.filter((b) => b.frontmatter.target_keywords?.[0]?.keyword);
    // 78 on 2026-09-22.
    expect(withKeyword.length).toBeGreaterThanOrEqual(75);

    const { ms } = loadIndex();
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);

    const KNOWN_NOT_FIRST = new Set(["/how-to-stop-overthinking", "/improv-warm-up-games"]);
    const notFirst: string[] = [];
    const notInTopThree: string[] = [];
    for (const bridge of withKeyword) {
      const keyword = bridge.frontmatter.target_keywords![0].keyword;
      const ranked = urls(ms, keyword);
      const rank = ranked.indexOf(`/${bridge.slug}`);
      if (rank !== 0) notFirst.push(`/${bridge.slug}`);
      if (rank < 0 || rank > 2) {
        notInTopThree.push(`/${bridge.slug} "${keyword}" → ${ranked.slice(0, 3).join(", ")}`);
      }
    }

    expect(withKeyword.length - notFirst.length, notFirst.join("\n")).toBeGreaterThanOrEqual(75);
    expect(notFirst.filter((slug) => !KNOWN_NOT_FIRST.has(slug))).toEqual([]);
    // 78 of 78 in the top three since the keyword field; the warm-up guide
    // sat fifth behind the games hub and three picker pages before it.
    expect(
      withKeyword.length - notInTopThree.length,
      notInTopThree.join("\n"),
    ).toBeGreaterThanOrEqual(77);
  });

  /**
   * The parity rule, read from the source.
   *
   * MiniSearch applies `processTerm` to a document's terms when the index is
   * built and to a query's terms when it is searched, from whichever options
   * object each side was given. Fold on one side only and the two never
   * meet: an index of "theater" searched with "theatre" finds nothing at
   * all, which is worse than the eighth place this began from. So the
   * builder and the browser loader must read the same module, and neither
   * may declare its own fields or processTerm. The builder reads it through
   * jiti, because the module imports anchor-text.ts, but the path is the
   * path.
   */
  it("builder and loader import the one options module and declare none of their own", () => {
    const builder = fs.readFileSync(path.join(ROOT, "scripts", "build-search-index.mjs"), "utf-8");
    const loader = fs.readFileSync(path.join(ROOT, "src", "lib", "search-index.ts"), "utf-8");
    for (const [name, source] of [
      ["builder", builder],
      ["loader", loader],
    ] as const) {
      expect(source, `${name} imports the shared options`).toContain("search-index-options.mjs");
      expect(source, `${name} uses MINISEARCH_OPTIONS`).toContain("MINISEARCH_OPTIONS");
      expect(source, `${name} declares no field list of its own`).not.toMatch(/\bfields\s*:/);
      expect(source, `${name} declares no processTerm of its own`).not.toMatch(/processTerm\s*:/);
    }
    expect(builder).toMatch(/new MiniSearch\(MINISEARCH_OPTIONS\)/);
    expect(loader).toMatch(/loadJSON\(json, MINISEARCH_OPTIONS\)/);
    // And the fold is on the options object itself, not a search option,
    // where the builder would never see it.
    expect(typeof MINISEARCH_OPTIONS.processTerm).toBe("function");
    expect("processTerm" in MINISEARCH_OPTIONS.searchOptions).toBe(false);
  });
});
