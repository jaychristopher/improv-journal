import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8");

/**
 * The site asks Google's questions in Google's words.
 *
 * serp-overview on eight of the site's results pages, 2026-09-28, returned
 * thirty People Also Ask questions (docs/seo/people-also-ask.md). The site
 * answered most of them under other words: the rules guide asked "How many
 * rules of improv are there?" and "What are Tina Fey's rules of improv?"
 * while Google asked for the five basic rules, the four, the seven, the
 * three golden ones and the six — on five of the eight pages. A question
 * heading that matches how people type is the one page-one surface a
 * low-authority site reaches (guide-questions.test.ts has the measurement),
 * so the headings below were written from the table, and this keeps the
 * table and the guides saying the same thing.
 */
const ASKED: Record<string, string[]> = {
  "content/bridges/rules-of-improv.md": [
    "### What are the five basic rules of improv?",
    "### How many rules of improv are there?",
    "### What are Tina Fey's four rules of improv?",
  ],
  "content/bridges/what-is-improv.md": [
    "### What should you not do in improv?",
    "### What are improv skills?",
    "### Is improv good for your brain?",
  ],
  "content/bridges/improv-games-for-kids.md": ["### How do you teach kids improv?"],
};

describe("people also ask", () => {
  it("asks the questions the results pages show, in their words", () => {
    const table = read("docs/seo/people-also-ask.md");
    // The reading itself: thirty rows on eight pages, or the table was cut.
    expect(table.split("\n").filter((l) => /^\| [a-z]/.test(l)).length).toBeGreaterThanOrEqual(30);

    for (const [file, headings] of Object.entries(ASKED)) {
      const md = read(file);
      for (const heading of headings) {
        expect(md, `${file} asks ${heading}`).toContain(heading);
        expect(table, `the table records ${heading}`).toContain(heading.replace(/^### /, ""));
      }
    }

    // Where the number is the question, the numbers people search for are named.
    const rules = read("content/bridges/rules-of-improv.md");
    for (const count of ["three golden rules", "four", "five", "six", "seven", "ten"]) {
      expect(rules, count).toContain(count);
    }
  });
});
