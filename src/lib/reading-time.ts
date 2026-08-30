/** Words per minute for silent reading of ordinary prose. */
const WORDS_PER_MINUTE = 230;

/**
 * How long a page takes to read, in whole minutes.
 *
 * Guides run from 1,095 words to 4,790 — a four-fold spread around a median of
 * 2,489 — and nothing on the page said which one you had landed on. That is a
 * four minute read and an eighteen minute read wearing the same clothes, and the
 * decision it blocks is the one a reader makes first: now, later, or not at all.
 *
 * Counted from rendered html rather than markdown, so the number describes what
 * is actually on the page — headings and list items included, markdown syntax
 * and link urls excluded. Script and style contents are dropped first; leaving
 * them in counted json-ld as prose and roughly doubled some pages.
 *
 * 230 wpm is the middle of the usual range for adult silent reading of
 * non-technical prose. Rounded up, and never zero: "0 min read" is worse than
 * saying nothing.
 */
export function readingMinutes(html: string): number {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return 1;
  return Math.max(1, Math.round(text.split(" ").length / WORDS_PER_MINUTE));
}
