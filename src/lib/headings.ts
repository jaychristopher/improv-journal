/**
 * Section headings, pulled back out of rendered content.
 *
 * The concept pages carry 860 H2s with slug ids. An anchored outline is what
 * Google builds "jump to" sitelinks from, and those only appear when the page
 * actually offers the anchors as navigation — an id nobody links to is an id
 * nobody can be sent to.
 *
 * H3s are included for that exact reason. The renderer anchors them too, and
 * 53 of them across 17 concept pages were sitting there addressable and
 * unreachable — the precise case the sentence above describes. They are
 * reported with their level so the contents list can nest them rather than
 * flattening a sub-point into a section.
 */

/** A section a reader — or a search result — can be sent directly to. */
export interface ContentHeading {
  id: string;
  text: string;
  /** 2 for a section, 3 for a sub-point nested under one. */
  level: 2 | 3;
}

const HEADING = /<h([23])\b[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;

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
    const level = Number(match[1]) as 2 | 3;
    const id = match[2];
    const text = toPlainText(match[3]);
    if (!text || seen.has(id)) continue;
    seen.add(id);
    headings.push({ id, text, level });
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
