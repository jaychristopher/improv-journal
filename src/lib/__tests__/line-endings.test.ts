import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";
import { DESCRIPTION_MAX, extractDescription, leadParagraph } from "../seo";

/**
 * A Windows line ending must not change what a page says about itself.
 *
 * This repo warns that LF will become CRLF on almost every commit, and the
 * markdown parsers here find the first paragraph by splitting on a blank line.
 * `/\n{2,}/` cannot match `\r\n\r\n` — there is a `\r` between the newlines —
 * so on a CRLF file the whole document parses as one paragraph.
 *
 * That is not hypothetical. Editing eight atoms with a tool that writes CRLF
 * was enough to make one of them ship its own citation, publisher included, as
 * its search snippet, and it was found by a test failing rather than by anyone
 * noticing. Two more parsers had the same shape: leadParagraph, which supplies
 * the hub previews, and the llms.txt summariser, which supplies the description
 * handed to every AI crawler. Both returned the entire document.
 *
 * The failure mode is what makes it worth a test. Nothing errors — a page just
 * quietly starts describing itself with 300 words of everything.
 */
const LF = [
  "**Trains:** working under load.",
  "Big Booty is a rhythm game whose real function is to flood attention until players stop planning.",
  "A third paragraph nobody should see in a snippet.",
].join("\n\n");

const CRLF = LF.replace(/\n/g, "\r\n");

describe("line endings", () => {
  it("gives leadParagraph the same answer either way", () => {
    expect(leadParagraph(CRLF)).toBe(leadParagraph(LF));
    // And the right answer: the lead label, not the whole document.
    expect(leadParagraph(LF)).not.toContain("third paragraph");
  });

  it("gives extractDescription the same answer either way", () => {
    // Only equality is asserted here. Unlike leadParagraph, this one packs
    // whole sentences up to the budget and is meant to cross a paragraph
    // break — asserting otherwise was my mistake, and it failed on LF as well
    // as CRLF, which is how I noticed.
    expect(extractDescription(CRLF)).toBe(extractDescription(LF));
    expect(extractDescription(LF).length).toBeGreaterThan(40);
  });

  it("drops a bold citation on a CRLF document", () => {
    // The exact shape that shipped: a bold citation with the title in nested
    // italics, followed by the prose that should have been the description.
    const citation = [
      "**Patricia Ryan Madson. *Improv Wisdom.* Bell Tower, 2005.**",
      "The most explicit treatment of improv principles as life philosophy.",
    ].join("\r\n\r\n");
    expect(extractDescription(citation)).not.toContain("Bell Tower");
    expect(extractDescription(citation)).toContain("life philosophy");
  });
});

/**
 * The frontmatter strip must not fire on a horizontal rule.
 *
 * It carried the /m flag, so `^---` matched any line starting with three
 * dashes, and `[\s\S]*?---` then ran to the next one. gray-matter has already
 * removed the real frontmatter by the time these callers run, so the only thing
 * left for that pattern to match is a pair of horizontal rules — and everything
 * between them is silently deleted from the description.
 *
 * No page has two today; 28 have one, and adding a second is an ordinary
 * editorial act. Anchored to the start of the string, which is where
 * frontmatter actually is.
 */
describe("frontmatter stripping", () => {
  it("leaves a body containing horizontal rules intact", () => {
    const body = [
      "The opening sentence that belongs in the description.",
      "---",
      "A middle section that must survive.",
      "---",
      "A closing note.",
    ].join("\n\n");
    expect(extractDescription(body)).toContain("opening sentence");
    // The detecting assertion. With the /m flag the strip ran from the first
    // horizontal rule to the second and deleted the middle section outright,
    // so a long-budget description skipped straight from the opening to the
    // closing note. Asserting on leadParagraph instead proves nothing: it
    // returns the first paragraph either way.
    expect(extractDescription(body, 400)).toContain("middle section");
  });
});

/**
 * A learning path's description must fit the snippet budget.
 *
 * Guides have had this check since they were written; paths never did, and the
 * audit only logs an info-level note. Seven of the eleven were over — the worst
 * at 208 characters against a 158 budget — so every one of them was being cut
 * off with an ellipsis in results, including paths/teaching-improv, which
 * Search Console shows being surfaced.
 *
 * The value of writing a description is deciding what the sentence says. A
 * description long enough to be truncated hands that decision back to the
 * truncation.
 */
describe("path descriptions", () => {
  it("fits the snippet budget", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThan(5);

    const over = paths
      .filter((p) => (p.frontmatter.description ?? "").length > DESCRIPTION_MAX)
      .map((p) => `${p.slug} (${p.frontmatter.description.length})`);

    expect(over).toEqual([]);
  });
});
