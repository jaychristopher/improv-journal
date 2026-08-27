import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const BRIDGES = path.join(process.cwd(), "content", "bridges");

/** A heading that asks something — the house form is `### Does this work?`. */
const QUESTION_HEADING = /^#{2,3} .*\?\s*$/m;

/**
 * Every guide answers questions in the reader's own words.
 *
 * This started as a measurement rather than a rule. Search Console shows the
 * site holding page-one positions only for narrow, named things — a specific
 * framework, a named book, a named technique — while generic terms sit between
 * 30 and 90. The single query producing the most impressions is somebody
 * looking for a listening framework by quoting the phrase they half-remember,
 * and the page that ranks for it is one that had already written the question
 * down and answered it.
 *
 * 72 of the 78 guides had adopted that convention. The six that had not
 * included how-to-read-body-language, which carries the highest declared
 * demand on the site by an order of magnitude, so the layer's biggest page was
 * the one missing the treatment every comparable page had.
 *
 * Deliberately not asserting FAQPage structured data alongside it. Google
 * restricted FAQ rich results to government and health domains in 2023, so the
 * schema would be markup that changes nothing here; the value is the question
 * heading matching how people actually type, which needs no schema at all.
 */
describe("guides answer questions", () => {
  it("gives every guide at least one question heading", () => {
    const missing: string[] = [];
    let guides = 0;

    for (const file of fs.readdirSync(BRIDGES).filter((f) => f.endsWith(".md"))) {
      guides += 1;
      const raw = fs.readFileSync(path.join(BRIDGES, file), "utf-8");
      const body = raw
        .split(/\n---\n/)
        .slice(1)
        .join("\n---\n");
      if (!QUESTION_HEADING.test(body)) missing.push(file.replace(/\.md$/, ""));
    }

    // The layer itself, so a bad read fails here rather than passing on nothing.
    expect(guides).toBeGreaterThanOrEqual(78);
    expect(missing).toEqual([]);
  });
});
