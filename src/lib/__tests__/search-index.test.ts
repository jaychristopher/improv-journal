import fs from "fs";
import MiniSearch from "minisearch";
import path from "path";
import { describe, expect, it } from "vitest";

import { MINISEARCH_OPTIONS } from "../search-index";

describe("search index", () => {
  const indexPath = path.join(process.cwd(), "public", "search-index.json");

  it("index file exists", () => {
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it("loads as valid MiniSearch index", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    expect(ms).toBeDefined();
    expect(ms.documentCount).toBeGreaterThan(150);
  });

  it("search('mirroring') finds mirroring", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    const results = ms.search("mirroring");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain("Mirroring");
  });

  it("fuzzy search('overhtinking') finds overthinking", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    const results = ms.search("overhtinking", { fuzzy: 0.2 });
    const titles = results.map((r) => r.title.toLowerCase());
    expect(titles.some((t) => t.includes("overthinking"))).toBe(true);
  });

  /**
   * An alias is searchable, not only indexed.
   *
   * The builder has indexed `aliases` since 2026-08-27, and the loader kept a
   * second copy of the options that listed three fields. MiniSearch scores
   * only the fields named when the index is *loaded*, so every alias posting
   * was in the JSON and never consulted: "task saturation" returned Small
   * Talk, Gorilla Theatre and Flow. The comment beside the builder recorded a
   * fix the browser did not have. Both now import one options module, and
   * this searches through the loader's copy so the two cannot drift again.
   *
   * The aliases chosen do not appear in their atom's first 500 characters,
   * which was all of the prose the index held when this was written, so the
   * body could not stand in for the missing field and make it pass by
   * accident. "Callback" is avoided because an atom of that name exists and
   * would win on its title.
   *
   * Since 2026-09-22 the index also holds a `sections` field — every h2 and
   * h3 with the sentence under it (novel-insights 337) — so the body is no
   * longer the only other place an alias word could be found. The three
   * cases were re-checked against the built index on that date and each
   * still reaches its atom; if one ever passes on a section mention rather
   * than on its alias, the posting assertion below is the one to read.
   */
  it("finds an atom by a declared alias", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    // A changed builder would otherwise let this pass on a near-empty index.
    expect(ms.documentCount).toBeGreaterThanOrEqual(300);
    expect(MINISEARCH_OPTIONS.fields).toContain("aliases");

    const cases: [alias: string, docId: string][] = [
      ["task saturation", "cognitive-bandwidth"],
      ["escalation", "heightening"],
      ["wipe", "editing"],
    ];
    for (const [alias, docId] of cases) {
      const top = ms
        .search(alias)
        .slice(0, 3)
        .map((r) => r.docId);
      expect(top, `"${alias}" should reach ${docId}`).toContain(docId);
    }
  });

  /**
   * The route pages are in the index, and a hub's own term reaches the hub.
   *
   * Until 2026-09-21 the index held the four content layers and none of the
   * 45 route pages, because the builder read `content/` and the hubs live in
   * `src/app`. So "improv games" — the site's largest term, owned by
   * /improv-games in route-keywords.ts — returned three guides; "podcast"
   * returned a book about a podcast; "exercise picker" returned Mirroring;
   * "beginner" returned Curriculum Design; "ucb" the manual rather than the
   * tradition page (novel-insights 226). The registry built so the hubs were
   * visible to the keyword tooling was invisible to the search tooling.
   *
   * The hubs now come from route-pages.mjs as a fifth layer. Each query here
   * is one a reader types for a route page, and the owning page must be in
   * the first three. The content queries below it are the ones that worked
   * before and must still: adding 45 documents with short titles changes the
   * scoring of everything, and a hub must not crowd out a concept that owns
   * its name.
   */
  it("finds the route page a hub query names", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    // 319 content documents and 45 route pages.
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);

    // The stored fields are the only view of every document at once. 45 route
    // pages at the time of writing; the floor leaves room for a facet or two
    // to drop out of the sitemap, not for a section to go missing.
    const stored = Object.values(
      (JSON.parse(json) as { storedFields: Record<string, Record<string, string>> }).storedFields,
    );
    const hubs = stored.filter((doc) => doc.layer === "hub");
    expect(hubs.length).toBeGreaterThanOrEqual(30);
    for (const hub of hubs) {
      expect(hub.type).toBe("hub");
      expect(hub.docId).toBe(hub.url);
    }

    const cases: [query: string, urls: string[]][] = [
      ["improv games", ["/improv-games"]],
      ["ucb", ["/traditions/ucb"]],
      ["podcast", ["/listen"]],
      ["exercise picker", ["/tools/exercise-picker"]],
      ["beginner", ["/learn/beginner", "/tools/exercise-picker/beginner"]],
      ["learning paths", ["/paths"]],
      ["glossary", ["/practice/vocabulary"]],
    ];
    for (const [query, urls] of cases) {
      const top = ms
        .search(query, MINISEARCH_OPTIONS.searchOptions)
        .slice(0, 3)
        .map((r) => r.url as string);
      expect(
        urls.some((url) => top.includes(url)),
        `"${query}" should reach ${urls.join(" or ")}, got ${top.join(", ")}`,
      ).toBe(true);
    }
  });

  it("still finds the content page a concept query names", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);

    const cases: [query: string, url: string][] = [
      ["del close", "/del-close"],
      ["harold", "/practice/formats/harold"],
      ["mirroring", "/practice/exercises/mirroring"],
      ["task saturation", "/how-it-works/cognitive-bandwidth"],
    ];
    for (const [query, url] of cases) {
      const top = ms
        .search(query, MINISEARCH_OPTIONS.searchOptions)
        .slice(0, 3)
        .map((r) => r.url as string);
      expect(top, `"${query}" should reach ${url}`).toContain(url);
    }
  });

  /**
   * The index carries the section anchors a result deep-links.
   *
   * Until 2026-09-22 a result could only be the page: the index held the
   * first 500 characters of each document and had no idea where anything on
   * it was, so the search page linked the top of the page and the site had 0
   * internal links into any question anchor (novel-insights 337). The
   * builder now stores an `{ id, heading }` per h2 and h3, and the search
   * page sends a result that matched there to `/slug#section-id`.
   *
   * search-depth.test.ts checks the ids against the rendered HTML; this
   * checks the field survives a rebuild at all, which is the failure the
   * aliases bug of 2026-08-27 was.
   */
  it("stores a section anchor for every document that has headings", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const raw = JSON.parse(json) as {
      fieldIds: Record<string, number>;
      storedFields: Record<string, { layer: string; sections?: { id: string; heading: string }[] }>;
    };
    expect(raw.fieldIds).toHaveProperty("sections");
    expect(MINISEARCH_OPTIONS.fields).toContain("sections");
    expect(MINISEARCH_OPTIONS.storeFields).toContain("sections");

    const stored = Object.values(raw.storedFields);
    // 367 documents on 2026-09-22; a builder that wrote a handful would
    // otherwise satisfy the counts below.
    expect(stored.length).toBeGreaterThanOrEqual(360);

    const sections = stored.flatMap((doc) => doc.sections ?? []);
    // 2,665 sections over the 4 content layers on 2026-09-22. The route
    // pages have none: they are rendered from components, not markdown.
    expect(sections.length).toBeGreaterThanOrEqual(2500);
    for (const section of sections.slice(0, 50)) {
      expect(section.id, section.heading).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(section.heading.trim()).toBeTruthy();
    }

    // Every guide has headings, so every guide has anchors.
    const guides = stored.filter((doc) => doc.layer === "guide");
    expect(guides.length).toBeGreaterThanOrEqual(75);
    expect(guides.filter((doc) => (doc.sections ?? []).length === 0)).toEqual([]);
  });

  it("autoSuggest returns query strings, not titles", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    const suggestions = ms.autoSuggest("mirr", { fuzzy: 0.2, prefix: true });
    expect(suggestions.length).toBeGreaterThan(0);
    // autoSuggest returns { suggestion, terms, score } objects
    expect(suggestions[0]).toHaveProperty("suggestion");
    expect(typeof suggestions[0].suggestion).toBe("string");
  });
});
