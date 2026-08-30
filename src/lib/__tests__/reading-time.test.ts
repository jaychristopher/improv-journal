import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { readingMinutes } from "../reading-time";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

describe("readingMinutes", () => {
  it("never returns zero", () => {
    // "0 min read" is worse than saying nothing, and an empty body is possible
    // on a stub. One is the floor.
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("<p>Three words here.</p>")).toBe(1);
  });

  it("ignores script and style contents", () => {
    // Every page on this site carries json-ld. Counting it as prose roughly
    // doubled the longest pages, which is how this was noticed.
    const prose = `<p>${"word ".repeat(460)}</p>`;
    const withNoise = `<script type="application/ld+json">${"x ".repeat(2000)}</script>${prose}`;
    expect(readingMinutes(withNoise)).toBe(readingMinutes(prose));
    expect(readingMinutes(prose)).toBe(2);
  });

  it("counts text inside markup rather than the markup", () => {
    const linky = `<p>${'<a href="/some/very/long/url/that/is/not/prose">word</a> '.repeat(230)}</p>`;
    expect(readingMinutes(linky)).toBe(1);
  });
});

/**
 * Every content page tells a reader how long it is.
 *
 * Guides run 1,095 to 4,790 words around a median of 2,489, and the page said
 * nothing about which one you had landed on — a four minute read and an eighteen
 * minute read in identical clothes. The decision it blocked is the first one a
 * reader makes: now, later, or not at all.
 *
 * Asserts the spread as well as the presence, because a constant would satisfy a
 * presence check and tell nobody anything.
 */
describe("reading time on content pages", () => {
  it.runIf(built)("appears, and varies with length", () => {
    const times: number[] = [];
    let pages = 0;

    for (const file of fs.readdirSync(path.join(ROOT, "content", "bridges"))) {
      if (!file.endsWith(".md")) continue;
      const page = path.join(APP, `${file.replace(/\.md$/, "")}.html`);
      if (!fs.existsSync(page)) continue;

      pages += 1;
      const html = fs.readFileSync(page, "utf-8");
      const match = /·\s*(\d+)\s*min read/.exec(html.replace(/<[^>]+>/g, ""));
      if (match) times.push(Number(match[1]));
    }

    expect(pages).toBeGreaterThanOrEqual(70);
    // Every guide carries one.
    expect(times.length).toBe(pages);
    expect(Math.min(...times)).toBeGreaterThanOrEqual(1);
    // And the range is real: the shortest guide is a fraction of the longest.
    expect(Math.max(...times)).toBeGreaterThanOrEqual(Math.min(...times) * 2);
  });
});
