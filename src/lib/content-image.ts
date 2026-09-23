/**
 * The first image in a markdown body, as the site-relative path the page
 * renders it from (`/images/<name>.svg`).
 *
 * The image programme shipped 248 diagrams so that pages would have something
 * for Google Images to index, and then every Article on the site kept naming
 * the text OG card as its `image` (novel-insights entry 190, 2026-09-21). The
 * JSON-LD components take this as an optional `contentImage` and list it first
 * when present; pages without a body image keep the card.
 */
const IMAGE = /!\[[^\]]*\]\(\s*(\/[^\s)]+)/;

export function firstContentImage(markdown: string): string | null {
  return IMAGE.exec(markdown)?.[1] ?? null;
}
