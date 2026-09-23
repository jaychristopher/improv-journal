import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { GET } from "../../app/feed.xml/route";
import { loadBridges, loadThreads } from "../content";
import { SITE_URL } from "../seo";

const BUILD = path.join(process.cwd(), ".next", "server", "app");
const FEED = path.join(BUILD, "feed.xml.body");
const built = fs.existsSync(FEED);
const feed = built ? fs.readFileSync(FEED, "utf-8") : "";

interface Entry {
  id: string;
  title: string;
  published: string;
  updated: string;
  category: string;
}

function parseEntries(xml: string): Entry[] {
  return xml
    .split("<entry>")
    .slice(1)
    .map((e) => {
      const field = (tag: string) => new RegExp(`<${tag}>(.*?)</${tag}>`).exec(e)?.[1] ?? "";
      return {
        id: field("id"),
        title: field("title"),
        published: field("published"),
        updated: field("updated"),
        category: /<category term="([^"]+)"/.exec(e)?.[1] ?? "",
      };
    });
}

/**
 * The route itself, not the last build: these run without `npm run build`,
 * so a regression is caught on the change and not on the next deploy.
 */
describe("content feed route", () => {
  const rendered = GET().then((r) => r.text());

  it("carries lessons as well as guides", async () => {
    // Fifty guides and no lessons was the state for a month. The window was
    // one field wide, 53 items tied on it, and every thread fell on the far
    // side of the cut. The feed is now a window per layer.
    const entries = parseEntries(await rendered);
    const lessons = entries.filter((e) => e.category === "Lesson");
    const guides = entries.filter((e) => e.category === "Guide");
    expect(lessons.length).toBeGreaterThanOrEqual(10);
    expect(guides.length).toBeGreaterThanOrEqual(30);
    for (const l of lessons) expect(l.id).toContain("/threads/");
  });

  it("carries fifty entries, cut after sorting", async () => {
    const entries = parseEntries(await rendered);
    expect(entries.length).toBe(50);
    const [bridges, threads] = await Promise.all([loadBridges(), loadThreads()]);
    // The window is a window: there is more content than it holds, so the
    // cut is real and the ordering rule decides membership.
    expect(bridges.length + threads.length).toBeGreaterThan(entries.length);
  });

  it("orders deterministically: updated, then published, then title", async () => {
    const entries = parseEntries(await rendered);
    expect(entries.length).toBeGreaterThan(1);
    for (let i = 1; i < entries.length; i += 1) {
      const prev = entries[i - 1];
      const cur = entries[i];
      const label = `${prev.title} → ${cur.title}`;
      expect(prev.updated >= cur.updated, label).toBe(true);
      if (prev.updated !== cur.updated) continue;
      expect(prev.published >= cur.published, label).toBe(true);
      if (prev.published !== cur.published) continue;
      // Same day twice over: only the title can decide, and it must.
      expect(prev.title.localeCompare(cur.title), label).toBeLessThanOrEqual(0);
    }
    // Guard the guard: the batch stamps mean ties exist, so the tie-break
    // above is exercised and not vacuously true.
    const tied = entries.filter((e, i) => i > 0 && entries[i - 1].updated === e.updated);
    expect(tied.length).toBeGreaterThan(0);
  });

  it("renders the same feed regardless of the order files were read", async () => {
    // Glob order was what decided membership before. Rendering twice is a
    // weak check on its own, so this also asserts the first entry is the
    // newest by rule, which glob order could not guarantee.
    const first = parseEntries(await rendered);
    const second = parseEntries(await GET().then((r) => r.text()));
    expect(second.map((e) => e.id)).toEqual(first.map((e) => e.id));
    const newest = [...first].sort((a, b) => b.updated.localeCompare(a.updated))[0];
    expect(first[0].updated).toBe(newest.updated);
  });
});

describe("content feed", () => {
  it.runIf(built)("is a well-formed Atom document", () => {
    expect(feed.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    for (const required of ["<title>", "<id>", "<updated>", 'rel="self"']) {
      expect(feed, required).toContain(required);
    }
  });

  it.runIf(built)("gives every entry the fields Atom requires", () => {
    const entries = feed.split("<entry>").slice(1);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      for (const required of ["<title>", "<id>", "<updated>", "<published>", "<link "]) {
        expect(entry, required).toContain(required);
      }
    }
  });

  it.runIf(built)("uses absolute, resolvable entry ids", async () => {
    const [bridges, threads] = await Promise.all([loadBridges(), loadThreads()]);
    const known = new Set([
      ...bridges.map((b) => `${SITE_URL}/${b.slug}`),
      ...threads.map((t) => `${SITE_URL}/threads/${t.frontmatter.id}`),
    ]);

    const ids = [...feed.matchAll(/<id>(.*?)<\/id>/g)].map((m) => m[1]).slice(1);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(known.has(id), id).toBe(true);
  });

  it.runIf(built)("orders entries newest first", () => {
    const dates = [...feed.matchAll(/<entry>[\s\S]*?<updated>(.*?)<\/updated>/g)].map((m) => m[1]);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it.runIf(built)("escapes markup in titles and summaries", () => {
    const body = feed.replace(/<\?xml[\s\S]*?\?>/, "");
    // No stray raw ampersands: every & must begin an entity.
    expect(/&(?!(amp|lt|gt|quot|apos);)/.test(body)).toBe(false);
  });

  it.runIf(built)("is advertised for autodiscovery on every page", () => {
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.endsWith(".html") && !path.relative(BUILD, full).startsWith("_")) {
          pages.push(full);
        }
      }
    };
    walk(BUILD);

    const missing = pages
      .filter((f) => !fs.readFileSync(f, "utf-8").includes('type="application/atom+xml"'))
      .map((f) => path.relative(BUILD, f));

    expect(missing).toEqual([]);
  });
});
