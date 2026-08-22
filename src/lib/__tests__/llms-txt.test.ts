import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { SITE_URL } from "../seo";

const LLMS = fs.readFileSync(path.join(process.cwd(), "public", "llms.txt"), "utf-8");
const urls = new Set(
  [...LLMS.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1].replace(SITE_URL, "") || "/"),
);

describe("llms.txt", () => {
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
