import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import MiniSearch from "minisearch";

describe("search index", () => {
  const indexPath = path.join(process.cwd(), "public", "search-index.json");

  it("index file exists", () => {
    expect(fs.existsSync(indexPath)).toBe(true);
  });

  it("loads as valid MiniSearch index", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, {
      fields: ["title", "body", "tags"],
      storeFields: ["title", "url", "layer", "type", "docId"],
    });
    expect(ms).toBeDefined();
    expect(ms.documentCount).toBeGreaterThan(150);
  });

  it("search('mirroring') finds mirroring", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, {
      fields: ["title", "body", "tags"],
      storeFields: ["title", "url", "layer", "type", "docId"],
    });
    const results = ms.search("mirroring");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toContain("Mirroring");
  });

  it("fuzzy search('overhtinking') finds overthinking", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, {
      fields: ["title", "body", "tags"],
      storeFields: ["title", "url", "layer", "type", "docId"],
    });
    const results = ms.search("overhtinking", { fuzzy: 0.2 });
    const titles = results.map((r) => r.title.toLowerCase());
    expect(titles.some((t) => t.includes("overthinking"))).toBe(true);
  });

  it("autoSuggest returns query strings, not titles", () => {
    const json = fs.readFileSync(indexPath, "utf-8");
    const ms = MiniSearch.loadJSON(json, {
      fields: ["title", "body", "tags"],
      storeFields: ["title", "url", "layer", "type", "docId"],
    });
    const suggestions = ms.autoSuggest("mirr", { fuzzy: 0.2, prefix: true });
    expect(suggestions.length).toBeGreaterThan(0);
    // autoSuggest returns { suggestion, terms, score } objects
    expect(suggestions[0]).toHaveProperty("suggestion");
    expect(typeof suggestions[0].suggestion).toBe("string");
  });
});
