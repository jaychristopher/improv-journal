import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadBridges, loadThreads } from "../content";
import { SITE_URL } from "../seo";

const BUILD = path.join(process.cwd(), ".next", "server", "app");
const FEED = path.join(BUILD, "feed.xml.body");
const built = fs.existsSync(FEED);
const feed = built ? fs.readFileSync(FEED, "utf-8") : "";

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
