import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadThreads } from "../content";
import { readingMinutes } from "../reading-time";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * Lessons and library entries say how long they are, and the number is the
 * page's own.
 *
 * The reading-time line reached guides first and stopped there (EC-3.3). The
 * omissions were the wrong ones: lessons are the only pages the homepage sells
 * as a time commitment, and library entries are the best-ranking pages on the
 * site. Both showed a byline and a date and nothing about length.
 *
 * The figure has to come from the html the article renders, not from a
 * frontmatter estimate — one lesson declares `estimated_minutes: 6` for a body
 * that reads in one — so the built page is checked against `readingMinutes` of
 * the same html the route passes in. A constant, or a number from somewhere
 * else, fails the equality rather than the presence check.
 *
 * Paths carry a course workload figure and sources are transcripts read for
 * provenance rather than start to finish, so neither is asserted here; that
 * decision is written down in the EC-3.3 task file.
 */
describe("reading time on lessons and library entries", () => {
  it("is never zero for any lesson or library entry", async () => {
    const threads = await loadThreads();
    const references = (await loadAtoms()).filter((a) => a.frontmatter.type === "reference");
    // Guard the guard: the corpus, not an empty list, is what passes.
    expect(threads.length).toBeGreaterThanOrEqual(25);
    expect(references.length).toBeGreaterThanOrEqual(30);

    for (const t of threads) expect(readingMinutes(t.html)).toBeGreaterThanOrEqual(1);
    for (const a of references) expect(readingMinutes(a.html)).toBeGreaterThanOrEqual(1);

    // The range is real on both routes: the shortest is a fraction of the
    // longest, so a constant could not have produced these numbers.
    const lesson = threads.map((t) => readingMinutes(t.html));
    const library = references.map((a) => readingMinutes(a.html));
    expect(Math.max(...lesson)).toBeGreaterThanOrEqual(Math.min(...lesson) * 2);
    expect(Math.max(...library)).toBeGreaterThanOrEqual(Math.min(...library) * 2);
  });

  it.runIf(built)("appears on every built lesson, from that lesson's html", async () => {
    const missing: string[] = [];
    const wrong: string[] = [];
    let pages = 0;

    for (const thread of await loadThreads()) {
      const page = path.join(APP, "threads", `${thread.frontmatter.id}.html`);
      if (!fs.existsSync(page)) continue;
      pages += 1;
      const text = fs.readFileSync(page, "utf-8").replace(/<[^>]+>/g, "");
      const match = /·\s*(\d+)\s*min read/.exec(text);
      if (!match) {
        missing.push(thread.frontmatter.id);
        continue;
      }
      const expected = readingMinutes(thread.html);
      if (Number(match[1]) !== expected) {
        wrong.push(`${thread.frontmatter.id}: shows ${match[1]}, html reads in ${expected}`);
      }
    }

    expect(pages).toBeGreaterThanOrEqual(25);
    expect(missing).toEqual([]);
    expect(wrong).toEqual([]);
  });

  it.runIf(built)("appears on every built library entry, from that entry's html", async () => {
    const missing: string[] = [];
    const wrong: string[] = [];
    let pages = 0;

    for (const atom of await loadAtoms()) {
      if (atom.frontmatter.type !== "reference") continue;
      const page = path.join(APP, "library", `${atom.frontmatter.id}.html`);
      if (!fs.existsSync(page)) continue;
      pages += 1;
      const text = fs.readFileSync(page, "utf-8").replace(/<[^>]+>/g, "");
      const match = /·\s*(\d+)\s*min read/.exec(text);
      if (!match) {
        missing.push(atom.frontmatter.id);
        continue;
      }
      const expected = readingMinutes(atom.html);
      if (Number(match[1]) !== expected) {
        wrong.push(`${atom.frontmatter.id}: shows ${match[1]}, html reads in ${expected}`);
      }
    }

    expect(pages).toBeGreaterThanOrEqual(30);
    expect(missing).toEqual([]);
    expect(wrong).toEqual([]);
  });
});
