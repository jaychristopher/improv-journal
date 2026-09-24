/**
 * The one line a library entry already gives about who should buy the book.
 *
 * Twenty-three of the 32 entries carry a "Who it rewards" section, and its
 * opening paragraph is the entry's own answer — "Somebody who wants the
 * original statement of an idea they have already met second-hand." That is
 * the sentence a reader needs next to a buy button, and writing a second one
 * for the card would mean the page arguing with itself.
 *
 * Read from the markdown rather than declared in frontmatter so it cannot
 * drift: change the section and the card changes with it.
 */

/** Matches "## Who it rewards" and "## Who it rewards, and who it does not". */
const HEADING = /^##\s+Who it rewards.*$/im;

/**
 * The first paragraph under that heading, as plain text, or undefined.
 *
 * Markdown emphasis is stripped because the card renders a string, not html;
 * a link's text is kept and its target dropped for the same reason.
 */
export function bookVerdict(markdown: string): string | undefined {
  const heading = HEADING.exec(markdown);
  if (!heading) return undefined;

  const after = markdown.slice(heading.index + heading[0].length);
  const paragraph = after
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith("#") && !block.startsWith("!["));
  if (!paragraph) return undefined;

  const text = paragraph
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : undefined;
}
