import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";
import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { SITE_URL } from "../seo";

const LLMS = fs.readFileSync(path.join(process.cwd(), "public", "llms.txt"), "utf-8");
const urls = new Set(
  [...LLMS.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1].replace(SITE_URL, "") || "/"),
);

describe("llms.txt", () => {
  it("lists every URL the sitemap does, and nothing else", async () => {
    // The file says of itself that it lists everything. It listed 339 of the
    // sitemap's 364: the audience hubs, the tradition pages, the podcast
    // shows, the picker facets, the essays index, the resources hub, the
    // prompt generator and the homepage were not in it, because the builder
    // only saw content/ and a hand list of hubs. It now walks the sitemap, and
    // the two must agree in both directions — a URL here that the sitemap
    // does not publish is a page that is noindex, gone, or misspelt.
    const entries = await sitemap();
    const expected = new Set(entries.map((e) => e.url.replace(SITE_URL, "") || "/"));
    expect(expected.size).toBeGreaterThanOrEqual(300);

    const missing = [...expected].filter((u) => !urls.has(u));
    const extra = [...urls].filter((u) => !expected.has(u));
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });

  it("names the route-defined pages the loaders cannot see", () => {
    // The specific omissions the audit found, so the fix is pinned by name
    // and not only by the set comparison above.
    for (const url of [
      "/",
      "/threads",
      "/learn/beginner",
      "/learn/teacher",
      "/traditions/johnstone",
      "/listen/deep-cuts",
      "/tools/improv-prompt-generator",
      "/tools/exercise-picker/beginner",
    ]) {
      expect(urls.has(url), url).toBe(true);
    }
  });

  it("ends every summary at a sentence, never with an ellipsis", () => {
    // 67 of 339 summaries ended in "..." — a 160-character cut with a
    // word-boundary fallback — on the one surface where the truncated line is
    // the whole of what the reader gets. The pages' own description clamp
    // packs whole sentences; the builder now uses it.
    const lines = LLMS.split("\n").filter((l) => l.startsWith("- ["));
    expect(lines.length).toBeGreaterThanOrEqual(300);
    const dangling = lines.filter((l) => /(\.\.\.|…)$/.test(l));
    expect(dangling).toEqual([]);
  });

  it("puts the laws before the guides' alphabet, not after it", () => {
    // Order is the file's only ranking, and it was alphabetical inside every
    // section, so "2 Person Improv Games" led the guides. Guides now run by
    // the reach of the term each answers; concepts by how many other
    // concepts depend on them. Two checks that fail if either regresses.
    const guides = LLMS.slice(LLMS.indexOf("## Guides"), LLMS.indexOf("## Laws"));
    const firstGuide = guides.split("\n").find((l) => l.startsWith("- ["));
    expect(firstGuide, "guides section has entries").toBeTruthy();
    expect(/^- \[\d/.test(firstGuide ?? ""), `guides open with ${firstGuide}`).toBe(false);

    const laws = LLMS.slice(LLMS.indexOf("## Laws"), LLMS.indexOf("## Principles"));
    const lawTitles = [...laws.matchAll(/^- \[([^\]]+)\]/gm)].map((m) => m[1]);
    expect(lawTitles.length).toBeGreaterThanOrEqual(5);
    expect(lawTitles).not.toEqual([...lawTitles].sort((a, b) => a.localeCompare(b)));
  });

  it("lists every guide", async () => {
    const missing = (await loadBridges()).map((b) => `/${b.slug}`).filter((u) => !urls.has(u));
    expect(missing).toEqual([]);
  });

  it("lists every atom", async () => {
    const missing = (await loadAtoms())
      .map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }))
      .filter((u) => !urls.has(u));
    expect(missing).toEqual([]);
  });

  it("lists every thread and path", async () => {
    const [threads, paths] = await Promise.all([loadThreads(), loadPaths()]);
    const missing = [
      ...threads.map((t) => `/threads/${t.frontmatter.id}`),
      ...paths.map((p) => `/paths/${p.frontmatter.id}`),
    ].filter((u) => !urls.has(u));
    expect(missing).toEqual([]);
  });

  it("points at the hubs a crawler should start from", () => {
    for (const hub of [
      "/guides",
      "/practice/vocabulary",
      "/improv-games",
      "/library",
      "/about",
      "/topics/personal-growth",
    ]) {
      expect(urls.has(hub), hub).toBe(true);
    }
  });

  it("is well-formed markdown with a heading, summary and sections", () => {
    expect(LLMS.startsWith("# ")).toBe(true);
    expect(LLMS).toContain("\n> ");
    const lines = LLMS.split("\n");
    const badHeadings = lines
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => l.startsWith("## ") && i > 0 && lines[i - 1].trim() !== "")
      .map(({ l }) => l);
    expect(badHeadings).toEqual([]);
  });

  it("states counts that match the content", async () => {
    const atoms = await loadAtoms();
    const laws = atoms.filter((a) => a.frontmatter.type === "law").length;
    const principles = atoms.filter((a) => a.frontmatter.type === "principle").length;
    expect(LLMS).toContain(`Laws — the underlying physics (${laws})`);
    expect(LLMS).toContain(`Principles — behavioural guidelines (${principles})`);
  });

  it("uses absolute urls, since crawlers read it out of context", () => {
    expect(LLMS).not.toMatch(/\]\(\/(?!\/)/);
  });
});
