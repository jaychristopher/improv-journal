/**
 * Shared SEO utilities.
 * Central module for metadata generation across all pages.
 */

import type { AtomType } from "./schema";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.physicsofconnection.com";

export const SITE_NAME = "The Physics of Connection";

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
 * Build a type-aware meta description for an atom.
 */
export function atomDescription(title: string, type: AtomType, extracted: string): string {
  const label = TYPE_LABELS[type] ?? "an improv concept";
  const prefix = `${title} — ${label}.`;
  const remaining = 155 - prefix.length - 1;
  if (remaining < 30) return prefix;
  const desc = extracted.substring(0, remaining).trim();
  const lastSpace = desc.lastIndexOf(" ");
  return `${prefix} ${lastSpace > 0 ? desc.substring(0, lastSpace) : desc}...`;
}

/**
 * Build full canonical URL from a path.
 */
export function buildCanonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
