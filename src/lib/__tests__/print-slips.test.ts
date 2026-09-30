import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BUILD = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(path.join(BUILD, "index.html"));

/**
 * Printed, the guide's lists are slips.
 *
 * The method every drama teacher actually uses is print, cut, bag, draw, and
 * one competitor gates fifty opening lines behind an email for exactly that
 * (docs/improv-prompts-competitors.md, item 13). The stylesheet does it for
 * every list on every guide with no control — a print rule scoped to the
 * article body — and the improv prompts guide says so where a teacher is
 * reading about running a round.
 */
describe("print slips", () => {
  it("styles the article's lists as slips and hides what only makes sense on a screen", () => {
    const css = fs.readFileSync(path.join(ROOT, "src", "app", "globals.css"), "utf8");
    const print = css.slice(css.indexOf("@media print"));
    expect(print.length).toBeGreaterThan(200);
    expect(print).toMatch(/article\[data-track="body"\] li \{[^}]*border-bottom: 1px dashed/);
    expect(print).toMatch(/break-inside: avoid/);
    expect(print).toMatch(/body > :not\(main\) \{\s*display: none !important;/);
    expect(print).toContain('content: "physicsofconnection.com"');
  });

  it("tells the teacher, in the section about running a round", () => {
    const md = fs.readFileSync(path.join(ROOT, "content", "bridges", "improv-prompts.md"), "utf8");
    const round = md.slice(md.indexOf("### Running a round with a full class"));
    const section = round.slice(0, round.indexOf("### Which prompts suit which age"));
    expect(section).toContain("**Print this page for the bag.**");
  });

  it.runIf(built)("renders that line on the built guide", () => {
    const html = fs.readFileSync(path.join(BUILD, "improv-prompts.html"), "utf8");
    expect(html).toContain("Print this page for the bag.");
  });
});
