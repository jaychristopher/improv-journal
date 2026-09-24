/**
 * The buyable editions of each book in the library, by atom id.
 *
 * Kept here rather than in the content files: an ASIN is commerce
 * configuration that changes when a publisher reissues something, and the
 * entries themselves are prose about whether a book is worth reading.
 *
 * Every id below is a real listing. The print ASINs are the ones the entries
 * already carried as plain `amazon.com/dp/…` links in their frontmatter,
 * harvested rather than retyped; the Kahneman audiobook is the 2020s reissue
 * with the Levitin introduction, which is a different product from the 1973
 * monograph the entry reviews. A book with no line here still gets a link, as
 * a tagged search (see `amazonSearchUrl`).
 *
 * Do not add an ASIN you have not seen on the listing itself. A wrong one
 * sends a reader to the wrong book and earns nothing.
 */

import type { Edition } from "./affiliate";

export const BOOK_EDITIONS: Record<string, Edition[]> = {
  "ref-attention-and-effort-kahneman": [
    { kind: "print", asin: "0130505188" },
    { kind: "audiobook", asin: "B0H5QTSPT9" },
  ],
  "ref-brown-daring-greatly": [{ kind: "print", asin: "1592408419" }],
  "ref-csikszentmihalyi-flow": [{ kind: "print", asin: "0060920432" }],
  "ref-fey-bossypants": [{ kind: "print", asin: "0316056898" }],
  "ref-halpern-art-by-committee": [{ kind: "print", asin: "1566081122" }],
  "ref-hines-greatest-improviser": [{ kind: "print", asin: "0982625723" }],
  "ref-impro-johnstone": [{ kind: "print", asin: "0878301178" }],
  "ref-impro-storytellers-johnstone": [{ kind: "print", asin: "0571190995" }],
  "ref-madson-improv-wisdom": [{ kind: "print", asin: "1400081882" }],
  "ref-meisner-on-acting": [{ kind: "print", asin: "0394750594" }],
  "ref-napier-behind-the-scenes": [{ kind: "print", asin: "1566081998" }],
  "ref-napier-improvise": [{ kind: "print", asin: "032500630X" }],
  "ref-sawyer-group-genius": [{ kind: "print", asin: "0465071937" }],
  "ref-sawyer-improvised-dialogues": [{ kind: "print", asin: "1567506771" }],
  "ref-spolin-improvisation-for-theater": [{ kind: "print", asin: "081014008X" }],
  "ref-tj-dave-speed-of-life": [{ kind: "print", asin: "0977309339" }],
  "ref-truth-in-comedy": [{ kind: "print", asin: "1566080037" }],
  "ref-ucb-manual": [{ kind: "print", asin: "0989387801" }],
  "ref-viewpoints-bogart-landau": [{ kind: "print", asin: "1559362413" }],
};

/** The editions recorded for a library entry, or none. */
export function editionsFor(atomId: string): Edition[] {
  return BOOK_EDITIONS[atomId] ?? [];
}
