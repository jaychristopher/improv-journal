/**
 * Section headings, pulled back out of rendered content.
 *
 * The concept pages carry 860 H2s with slug ids. An anchored outline is what
 * Google builds "jump to" sitelinks from, and those only appear when the page
 * actually offers the anchors as navigation — an id nobody links to is an id
 * nobody can be sent to.
 */

/** A section a reader — or a search result — can be sent directly to. */
export interface ContentHeading {
  id: string;
  text: string;
}

const HEADING = /<h2\b[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g;

function toPlainText(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/\s+/g, " ")
    .trim();
}

export function extractHeadings(html: string): ContentHeading[] {
  const headings: ContentHeading[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(HEADING)) {
    const id = match[1];
    const text = toPlainText(match[2]);
    if (!text || seen.has(id)) continue;
    seen.add(id);
    headings.push({ id, text });
  }

  return headings;
}

/**
 * Below this a contents list is noise — the reader can see the whole page.
 */
export const MIN_HEADINGS_FOR_CONTENTS = 3;

export function contentsFor(html: string): ContentHeading[] {
  const headings = extractHeadings(html);
  return headings.length >= MIN_HEADINGS_FOR_CONTENTS ? headings : [];
}
