import fs from "fs";
import path from "path";

/**
 * Inline content diagrams.
 *
 * Markdown images render as `<img src="/images/x.svg">`, and an SVG referenced
 * that way is an isolated document: it gets none of the page's CSS, so
 * `currentColor` resolves to its own initial black rather than the prose ink,
 * and it cannot load the site's typeface. Every diagram would be black-on-black
 * in dark mode and set in a fallback face.
 *
 * Inlining the markup puts the diagram inside the page's cascade, which fixes
 * the theme and the typeface, and lets us emit width/height from the viewBox so
 * the image reserves its space instead of shifting the page as it loads.
 *
 * Two call sites share `buildDiagram`, because the site has two kinds of page:
 * markdown content goes through `inlineDiagrams` on the rendered HTML, and JSX
 * route pages — which never touch the markdown pipeline at all — use the
 * `<Diagram>` component. One implementation so the two cannot drift.
 */

const DIAGRAM_DIR = path.join(process.cwd(), "public", "images");

/** Exactly what `remark-html` emits for a markdown image: src then alt. */
const DIAGRAM_IMG = /<img src="(\/images\/[a-z0-9/-]+\.svg)" alt="([^"]*)">/g;

/** The entities `hast-util-to-html` emits when escaping an attribute value. */
function decodeAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#(?:39|x27);/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Build the inlined `<svg>` for a diagram, or null if it cannot be built.
 *
 * `alt` is raw text. It becomes the `<title>`, which — as the first child of an
 * `<svg role="img">` — is the accessible name on its own. Deliberately not
 * `aria-labelledby`: that needs an id, and remark-html's sanitiser prefixes ids
 * with `user-content-`, which would break the reference silently.
 */
export function buildDiagram(src: string, alt: string): string | null {
  const file = path.join(DIAGRAM_DIR, src.replace(/^\/images\//, ""));
  if (!fs.existsSync(file)) return null;

  const svg = fs.readFileSync(file, "utf-8").trim();
  const open = /<svg\b[^>]*>/.exec(svg);
  if (!open) return null;

  // Dimensions come from the viewBox so a diagram file never carries its own,
  // and so a missing viewBox fails here rather than shifting the page.
  const viewBox = /viewBox="([\d.\s-]+)"/.exec(open[0]);
  if (!viewBox) return null;

  const box = viewBox[1].trim().split(/\s+/);
  if (box.length !== 4) return null;
  const [, , width, height] = box;

  // Everything after the opening tag, which already closes with </svg>.
  const body = svg.slice(open.index + open[0].length);

  return (
    `<svg class="dg" role="img" xmlns="http://www.w3.org/2000/svg"` +
    ` viewBox="${viewBox[1]}" width="${width}" height="${height}">` +
    `<title>${escapeText(alt)}</title>${body}`
  );
}

/**
 * Replace diagram `<img>` tags in rendered markdown with the inlined SVG.
 *
 * This runs on the rendered HTML rather than as a remark plugin so it lands
 * after `remark-html`'s sanitiser, which would strip an inlined `<svg>`
 * outright. Widening the sanitiser's schema would also touch the id rewriting
 * that `anchor-targets.test.ts` guards; running afterwards leaves both alone.
 *
 * It must be the outermost transform in the chain: `linkAtomRefs` and
 * `linkEntities` autolink bare text, and would happily rewrite the inside of a
 * `<text>` element.
 */
export function inlineDiagrams(html: string): string {
  return html.replace(DIAGRAM_IMG, (whole, src: string, alt: string) => {
    return buildDiagram(src, decodeAttribute(alt)) ?? whole;
  });
}
