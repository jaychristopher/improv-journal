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

/**
 * Remove inline emphasis markers, including nested pairs.
 *
 * The old single-pass `\*\*([^*]+)\*\*` could not cross an asterisk, so a
 * bibliographic line like `**Author. *Title.* Publisher, 1979.**` matched
 * nothing on the bold pass and then matched the wrong pair on the italic
 * pass, leaving an orphan `*` at the head of the text. Every one of the
 * sixteen reference pages — the best-ranking cluster on the site — opened its
 * meta description with that stray asterisk.
 */
function stripEmphasis(text: string): string {
  let out = text;
  // Nesting unwraps one layer per pass; four is well clear of any depth the
  // content actually uses.
  for (let i = 0; i < 4; i += 1) {
    const next = out.replace(/(\*{1,3}|_{1,3})(?=\S)([\s\S]*?\S)\1/g, "$2");
    if (next === out) break;
    out = next;
  }
  return out;
}

/**
 * Drop a leading paragraph that is entirely bold.
 *
 * Reference atoms open with the full citation — author, title, publisher,
 * year — which is already the page title. Using it as the description spends
 * the whole SERP snippet restating the headline.
 */
function dropBoldLeadParagraph(body: string): string {
  const blocks = body.split(/\n{2,}/);
  const firstIndex = blocks.findIndex((block) => block.trim().length > 0);
  if (firstIndex === -1) return body;
  if (!/^\*\*[\s\S]+\*\*$/.test(blocks[firstIndex].trim())) return body;
  // Never leave a page with nothing left to describe it.
  if (!blocks.slice(firstIndex + 1).some((block) => block.trim().length > 0)) return body;
  return blocks.slice(firstIndex + 1).join("\n\n");
}

/**
 * Pull the first prose paragraph out of a markdown document and strip
 * formatting. Unlike `extractDescription`, paragraph boundaries are
 * preserved so a definition is never spliced onto the sentence after it.
 */
export function leadParagraph(markdownContent: string, maxLen = 300): string {
  const body = markdownContent
    .replace(/^---[\s\S]*?---\n*/m, "") // frontmatter
    .replace(/^#{1,6}\s+.*$/gm, ""); // headings

  const paragraph = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith(">"));
  if (!paragraph) return "";

  const text = stripEmphasis(paragraph)
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (text.length <= maxLen) return text;

  const truncated = text.substring(0, maxLen);
  const lastSentence = truncated.lastIndexOf(". ");
  if (lastSentence > maxLen * 0.5) return truncated.substring(0, lastSentence + 1);
  return `${truncated.substring(0, truncated.lastIndexOf(" "))}...`;
}

/**
 * Exercise atoms open with a bold "Trains:" label naming the skill built.
 * Useful on the page itself, but as a description it reads as a stray label,
 * so the prefix is dropped and the sentence it introduces is kept.
 */
export function stripLeadLabel(markdownContent: string): string {
  const match = /^---[\s\S]*?---\n*/m.exec(markdownContent);
  const frontmatter = match ? match[0] : "";
  const body = markdownContent.slice(frontmatter.length);
  return frontmatter + body.replace(/^\s*\*\*[^*]+\*\*:?\s*/, "");
}

/** Roughly where Google truncates a title in results. */
export const TITLE_MAX = 60;

/** Roughly where Google truncates a description in results. */
export const DESCRIPTION_MAX = 158;

const BRAND_SUFFIX_LENGTH = " | ".length + SITE_NAME.length;

/**
 * Qualify a title that would otherwise be indistinguishable from the homepage.
 *
 * A learning path and a podcast both share the site's name. Left alone they
 * render the same <title> as the homepage and as each other, so the three
 * compete for the same query.
 */
export function qualifyIfSiteName(title: string, qualifier: string): string {
  return title.trim().toLowerCase() === SITE_NAME.toLowerCase() ? `${title} (${qualifier})` : title;
}

/**
 * Name the domain in a concept page's title tag.
 *
 * The 133 concept pages are the best-ranking cluster on the site — Search
 * Console has them at positions 7 to 11 where the guides sit at 40 to 90 —
 * and three of them had the word "improv" anywhere in the title. The rest
 * were bare English words: Blocking, Discovery, Negation, Steering, Callback,
 * Judgment. Nothing in the strongest on-page signal said which Blocking this
 * is, and the median title spent 41 of the 60 characters available.
 *
 * The qualifier is an appositive rather than a prepositional phrase because
 * titles like "Recovery: Decay" and "Rigid Core, Malleable Edge" do not take
 * "in Improv" gracefully, and every one of them takes an em-dashed label.
 *
 * The H1 keeps the bare term. Only the title tag carries the qualifier.
 */
const CONCEPT_QUALIFIERS: Record<string, string> = {
  technique: "Improv Technique",
  definition: "Improv Term",
  exercise: "Improv Exercise",
  format: "Improv Format",
  principle: "Improv Principle",
  antipattern: "Improv Failure Mode",
  pattern: "Improv Pattern",
  insight: "Improv Insight",
  law: "A Law of Improv",
  pedagogy: "Improv Teaching Method",
  framework: "Improv Framework",
};

export function conceptTitle(title: string, type: string): string {
  const qualifier = CONCEPT_QUALIFIERS[type];
  if (!qualifier) return title;
  // Already says it. Adding a second "improv" reads as keyword stuffing.
  if (/improv/i.test(title)) return title;
  const qualified = `${title} \u2014 ${qualifier}`;
  return qualified.length <= TITLE_MAX ? qualified : title;
}

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
  // A page named after the site would otherwise render the brand twice —
  // "The Physics of Connection | The Physics of Connection".
  if (title.toLowerCase().includes(SITE_NAME.toLowerCase())) return { absolute: title };
  if (title.length + BRAND_SUFFIX_LENGTH <= TITLE_MAX) return title;
  return { absolute: title };
}

/**
 * Strip markdown formatting and extract clean text for meta descriptions.
 * Removes frontmatter, headings, bold labels, links, code, emphasis.
 * Returns first 1-2 sentences up to maxLen characters.
 */
export function extractDescription(markdownContent: string, maxLen = 155): string {
  const prose = dropBoldLeadParagraph(
    markdownContent
      .replace(/^---[\s\S]*?---\n*/m, "") // frontmatter
      .replace(/^#{1,6}\s+.*$/gm, "") // headings
      .replace(/^\s*\|.*$/gm, ""), // table rows, which collapse into pipe soup
  );
  // Anchored to the string start: a bold run mid-document is content, not a
  // label. The old /m flag let it fire on any line. Keep the label when it is
  // the whole entry — stripping it there leaves nothing to describe the page.
  const labelled = prose.replace(/^\s*\*\*[^*\n]+\*\*:?\s*/, "");
  const body = labelled.trim().length > 0 ? labelled : prose;

  const text = stripEmphasis(body)
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
 * Clamp a hand-written description to the SERP limit at a sentence boundary.
 *
 * Descriptions written directly in a route were never measured, so eleven
 * pages shipped snippets Google cuts mid-word. Trimming to a whole sentence
 * loses less than the truncation does.
 */
export function metaDescription(text: string, maxLen = DESCRIPTION_MAX): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;

  // Whole sentences from the front. The lookbehind tolerates a closing quote
  // after the stop, so `...a character choice.'` is not split mid-quotation.
  const sentences = trimmed.split(/(?<=[.!?]["'\u201d\u2019)\]]?)\s+/);
  let kept = "";
  for (const sentence of sentences) {
    const next = kept ? `${kept} ${sentence}` : sentence;
    if (next.length > maxLen) break;
    kept = next;
  }

  // Keeping only a short opening clause says less than a trimmed full snippet
  // would, and the snippet is the only thing a searcher reads before deciding.
  if (kept.length >= maxLen * 0.6) return kept;
  const cut = trimmed.slice(0, maxLen - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > maxLen * 0.5 ? cut.slice(0, space) : cut}\u2026`;
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
