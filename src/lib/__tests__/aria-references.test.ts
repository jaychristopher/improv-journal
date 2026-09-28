import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const BUILD = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(BUILD, "index.html"));

/**
 * Every aria reference on a page names an id the page has.
 *
 * The site menu labelled each of its four sections with
 * `aria-labelledby="menu-How It Works"` — an id with spaces in it, on every
 * one of 385 pages. An id may not contain whitespace, and aria-labelledby is
 * a space-separated list of ids, so the attribute pointed at "menu-How", "It"
 * and "Works", none of which existed, and the sections a screen reader was
 * meant to navigate by had no name. Nothing rendered differently, which is
 * why it survived from the day the menu got its headings (Nav.tsx). Found
 * 2026-09-28 while reading the heading outline the crawl sees.
 *
 * One page per template is enough to read every component: the homepage, a
 * guide, a hub, a concept, a show. The count of references is asserted so a
 * page that lost its landmarks would fail here rather than pass on nothing.
 */
const PAGES = [
  "index.html",
  "rules-of-improv.html",
  "improv-games.html",
  "practice/techniques/status-dynamics.html",
  "listen/deep-cuts.html",
];

describe("aria references", () => {
  it.runIf(built)("resolve to ids the page carries, and no id has whitespace", () => {
    const broken: string[] = [];
    let references = 0;

    for (const page of PAGES) {
      const html = fs.readFileSync(path.join(BUILD, page), "utf-8");
      const ids = new Set([...html.matchAll(/ id="([^"]*)"/g)].map((m) => m[1]));
      for (const id of ids) {
        if (/\s/.test(id)) broken.push(`${page}: id "${id}" has whitespace`);
      }
      for (const m of html.matchAll(/aria-(?:labelledby|describedby|controls)="([^"]*)"/g)) {
        for (const ref of m[1].split(/\s+/).filter(Boolean)) {
          references += 1;
          if (!ids.has(ref)) broken.push(`${page}: aria reference "${ref}" names no id`);
        }
      }
    }

    expect(references).toBeGreaterThanOrEqual(25);
    expect(broken).toEqual([]);
  });
});
