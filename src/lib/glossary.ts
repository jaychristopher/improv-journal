/**
 * Glossary derivation for the improv vocabulary.
 *
 * The `definition` atoms are the site's strongest search cluster — they rank
 * for definitional long-tail queries ("retrospective justification meaning",
 * "pattern break") because each one opens with a genuine one-sentence
 * definition. This module lifts that lead sentence out of the content so it
 * can drive both DefinedTerm entity markup and the glossary hub, instead of
 * being locked inside the page body.
 */

import { getAtomUrl, loadAtoms } from "./content";

export const GLOSSARY_URL = "/practice/vocabulary";

export interface GlossaryTerm {
  id: string;
  term: string;
  url: string;
  /** The entry's opening definition, taken verbatim from its own content. */
  definition: string;
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

  const text = paragraph
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
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

/** All vocabulary entries, alphabetised by term. */
export async function loadGlossaryTerms(): Promise<GlossaryTerm[]> {
  const atoms = await loadAtoms();

  return atoms
    .filter((a) => a.frontmatter.type === "definition")
    .map((a) => ({
      id: a.frontmatter.id,
      term: a.frontmatter.title,
      url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      definition: leadParagraph(a.content),
    }))
    .sort((a, b) => a.term.localeCompare(b.term));
}
