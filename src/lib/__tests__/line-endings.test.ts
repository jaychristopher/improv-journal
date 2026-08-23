import { describe, expect, it } from "vitest";

import { extractDescription, leadParagraph } from "../seo";

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
