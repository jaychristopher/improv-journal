import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "@/lib/content";

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
      // CRLF-tolerant on purpose. `\n---\n` cannot match `\r\n---\r\n`, so on a
      // Windows-saved file the body came back empty and this reported zero
      // questions on a guide that has five. Same shape as the silent false
      // passes line-endings.test.ts exists to document; this repo turns LF into
      // CRLF often enough that anything reading content has to expect it.
      const body = raw
        .split(/\r?\n---\r?\n/)
        .slice(1)
        .join("\n---\n");
      if (!QUESTION_HEADING.test(body)) missing.push(file.replace(/\.md$/, ""));
    }

    // The layer itself, so a bad read fails here rather than passing on nothing.
    expect(guides).toBeGreaterThanOrEqual(78);
    expect(missing).toEqual([]);
  });
});

/**
 * A rendered answer, split out of a guide's HTML: the heading that asked the
 * question and everything up to the next h2/h3.
 */
function renderedAnswers(html: string): { question: string; body: string }[] {
  const answers: { question: string; body: string }[] = [];
  for (const part of html.split(/(?=<h[23][^>]*>)/)) {
    const m = /^<h([23])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*)$/.exec(part);
    if (!m) continue;
    const question = m[2].replace(/<[^>]+>/g, "").trim();
    const body = m[3].trim();
    if (/\?$/.test(question) && body) answers.push({ question, body });
  }
  return answers;
}

/**
 * The answers are wired into the graph, not left as leaves.
 *
 * Entry 127 in docs/novel-insights.md measured the question sections as a
 * 38,687-word answer corpus and found 238 of 343 answers touching no atom.
 * That count was taken on the markdown (`](/` or a backtick), and the
 * obvious suspicion was that the answers bypassed the autolinker. They do
 * not: a guide's questions are ordinary `###` headings in its body, and the
 * body is rendered through the same `loadFiles` pipeline as every atom, so
 * the prose autolinker, linkAtomRefs, linkSources, linkCitations and
 * linkEntities all run over them. This reads the rendered HTML the page
 * actually ships, which is where the claim has to hold.
 *
 * Measured 2026-09-21: 342 answers across 78 guides, 129 with an internal
 * href. The floor sits just under that. It is not higher for a reason worth
 * knowing before anyone tries to raise it from the rendering side: the prose
 * autolinker links each target once per page, and the question section is
 * the last thing on the page, after every concept it could name has already
 * been linked above. Re-running the autolinker over each answer in isolation
 * (a fresh once-per-page set per answer) lifts the count only to 138 — the
 * other two hundred answers name nothing the site has a page for, or name
 * one of the GENERIC_ONE_WORD_ATOM_TITLES that are deliberately never
 * autolinked. Moving this number is content work (a "see: atom" line from
 * the guide's entry_atoms, or a hand-written link to the generic title), not
 * pipeline work. Debt: 213 unlinked answers as of 2026-09-21.
 */
describe("guide answers link into the graph", () => {
  it("renders at least 125 answers with an internal link", async () => {
    const bridges = await loadBridges();

    let answers = 0;
    let linked = 0;
    for (const bridge of bridges) {
      for (const answer of renderedAnswers(bridge.html)) {
        answers += 1;
        if (/href="\/[^"]*"/.test(answer.body)) linked += 1;
      }
    }

    // Guard the guard: the split has to have found the layer at all.
    expect(answers).toBeGreaterThanOrEqual(300);
    expect(linked).toBeGreaterThanOrEqual(125);
  });
});
