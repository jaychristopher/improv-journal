/**
 * Shared SEO utilities.
 * Central module for metadata generation across all pages.
 */

import type { AtomType } from "./schema";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.physicsofconnection.com";

export const SITE_NAME = "The Physics of Connection";

export const AUTHOR_NAME = "Jay Christopher";

export const AUTHOR_PATH = "/about";

/**
 * Stable identifier for the author entity.
 *
 * Every article on the site names its author, but named a bare string, which
 * resolves to nothing. Pointing each mention at one @id — defined once, on the
 * about page — lets the mentions be understood as the same person.
 */
export const AUTHOR_ID = `${SITE_URL}${AUTHOR_PATH}#author`;

export const ORGANIZATION_ID = `${SITE_URL}#organization`;

/** Reference to the author entity, for embedding in other structured data. */
export function authorRef() {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: AUTHOR_NAME,
    url: `${SITE_URL}${AUTHOR_PATH}`,
  };
}

/** Reference to the publishing organization. */
export function publisherRef() {
  return { "@type": "Organization", "@id": ORGANIZATION_ID, name: SITE_NAME, url: SITE_URL };
}

/**
 * Share-card image for a page's `openGraph.images`.
 *
 * Declaring an `openGraph` block in a page's metadata suppresses the
 * root-level opengraph-image, so every page that set one previewed with no
 * image at all. Pointing each block at the /og route restores a card, and
 * makes it specific to the page rather than a generic site banner.
 */
export function ogImages(title: string, eyebrow?: string) {
  const params = new URLSearchParams({ title });
  if (eyebrow) params.set("eyebrow", eyebrow);
  return [{ url: `/og?${params.toString()}`, width: 1200, height: 630, alt: title }];
}

/** Roughly where Google truncates a title in results. */
export const TITLE_MAX = 60;

/** Roughly where Google truncates a description in results. */
export const DESCRIPTION_MAX = 158;

const BRAND_SUFFIX_LENGTH = " | ".length + SITE_NAME.length;

/**
 * Title for a page's `metadata.title`.
 *
 * The root layout appends " | The Physics of Connection" to every title. On a
 * long title that suffix is not just wasted — it pushes the keyword-bearing
 * end of the title past the truncation point. Return an absolute title in that
 * case so the page keeps its own words, and let the template add the brand
 * only where it genuinely fits.
 */
export function pageTitle(title: string): string | { absolute: string } {
  if (title.length + BRAND_SUFFIX_LENGTH <= TITLE_MAX) return title;
  return { absolute: title };
}

/**
 * Strip markdown formatting and extract clean text for meta descriptions.
 * Removes frontmatter, headings, bold labels, links, code, emphasis.
 * Returns first 1-2 sentences up to maxLen characters.
 */
export function extractDescription(markdownContent: string, maxLen = 155): string {
  const text = markdownContent
    .replace(/^---[\s\S]*?---\n*/m, "") // frontmatter
    .replace(/^#{1,6}\s+.*$/gm, "") // headings
    .replace(/^\s*\*\*[^*]+\*\*:?\s*/m, "") // leading bold labels
    .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
    .replace(/\*([^*]+)\*/g, "$1") // italic
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/\n{2,}/g, " ") // collapse paragraphs
    .replace(/\n/g, " ") // remaining newlines
    .replace(/\s{2,}/g, " ") // collapse whitespace
    .trim();

  // Take up to maxLen characters, breaking at sentence boundary if possible
  if (text.length <= maxLen) return text;

  const truncated = text.substring(0, maxLen);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > maxLen * 0.5) {
    return truncated.substring(0, lastSentence + 1);
  }
  return truncated.substring(0, truncated.lastIndexOf(" ")) + "...";
}

const TYPE_LABELS: Record<string, string> = {
  principle: "an improv principle",
  technique: "an improv technique",
  exercise: "an improv exercise",
  insight: "an improv insight",
  definition: "an improv concept",
  pattern: "an improv pattern",
  antipattern: "a common improv failure mode",
  law: "a law of human connection",
  framework: "an improv framework",
  format: "an improv format",
  pedagogy: "an improv teaching method",
  reference: "an improv reference",
};

/**
 * Longest run of complete sentences from `text` that fits within `maxLen`.
 * Returns "" when even the first sentence is too long, so callers can fall
 * back rather than emit a fragment.
 */
function fitSentences(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text.trim();

  let out = "";
  for (const sentence of text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []) {
    const next = out + sentence;
    if (next.trimEnd().length > maxLen) break;
    out = next;
  }
  return out.trim();
}

/**
 * Build a meta description for an atom.
 *
 * Leads with the concept's own words rather than restating the title: the
 * title already sits directly above the description in a result, so repeating
 * it there spent roughly a third of the snippet saying nothing new — and the
 * remainder was then cut mid-word. The type label is appended only when the
 * text alone leaves room for it.
 */
export function atomDescription(
  title: string,
  type: AtomType,
  extracted: string,
  maxLen = DESCRIPTION_MAX,
): string {
  const label = TYPE_LABELS[type] ?? "an improv concept";
  const fallback = `${title} — ${label}.`;

  const body = fitSentences(extracted, maxLen);
  if (!body) return fallback.length <= maxLen ? fallback : extractDescription(extracted, maxLen);

  const suffix = ` ${title} is ${label}.`;
  if (body.length + suffix.length <= maxLen) return `${body}${suffix}`;
  return body;
}

/**
 * Build full canonical URL from a path.
 */
export function buildCanonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
