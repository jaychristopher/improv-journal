/**
 * Glossary derivation for the improv vocabulary.
 *
 * The concept pages are the site's strongest search cluster — Search Console
 * has them at positions 7 to 11 where the guides sit between 40 and 90 —
 * because each one opens with a genuine one-sentence definition. This module
 * lifts that lead sentence out of the content so it can drive both DefinedTerm
 * entity markup and the glossary hub, instead of being locked inside the page.
 *
 * It used to cover only the 28 `definition` atoms. But "pattern break",
 * "space work", "heightening", "callback", "blocking", "negation" and
 * "reincorporation" are terms of art that people look up by name — Search
 * Console shows the site drawing definitional queries for several of them —
 * and none of them were definitions by type, so none were in the glossary and
 * none carried term markup. The set is now every named concept the site
 * defines, which is also what makes a DefinedTermSet worth asserting: 151
 * terms in one controlled vocabulary rather than 28.
 */

import { getAtomUrl, loadAtoms } from "./content";
import type { AtomType } from "./schema";
import { leadParagraph, stripLeadLabel } from "./seo";

export const GLOSSARY_URL = "/practice/vocabulary";

/**
 * Types that name something. `reference` is excluded — a book is a cited work,
 * not a term — and everything else on a concept route is a name a person can
 * look up.
 */
const TERM_TYPES: AtomType[] = [
  "definition",
  "technique",
  "antipattern",
  "pattern",
  "principle",
  "law",
  "framework",
  "format",
  "pedagogy",
  "insight",
  "exercise",
];

/** How the hub groups the list, so 151 entries stay navigable. */
export const GLOSSARY_GROUPS: { label: string; types: AtomType[] }[] = [
  { label: "Terms", types: ["definition"] },
  { label: "Techniques", types: ["technique", "pedagogy"] },
  { label: "What Goes Wrong", types: ["antipattern", "pattern"] },
  { label: "Principles and Laws", types: ["principle", "law", "framework", "insight"] },
  { label: "Formats", types: ["format"] },
  { label: "Exercises", types: ["exercise"] },
];

export interface GlossaryTerm {
  id: string;
  term: string;
  url: string;
  type: AtomType;
  /** The entry's opening definition, taken verbatim from its own content. */
  definition: string;
  /** Other names the concept is taught under, for alternateName. */
  aliases?: string[];
}

/** Every named concept the site defines, alphabetised by term. */
export async function loadGlossaryTerms(): Promise<GlossaryTerm[]> {
  const atoms = await loadAtoms();

  return atoms
    .filter((a) => TERM_TYPES.includes(a.frontmatter.type))
    .map((a) => ({
      id: a.frontmatter.id,
      term: a.frontmatter.title,
      url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      type: a.frontmatter.type,
      // Several types open with a bold label ("Technique for: Be Simple")
      // before the definition sentence. The label is not the definition.
      definition: leadParagraph(stripLeadLabel(a.content)),
      aliases: a.frontmatter.aliases,
    }))
    .sort((a, b) => a.term.localeCompare(b.term));
}

/** True when a page should carry DefinedTerm markup. */
export function isGlossaryType(type: AtomType): boolean {
  return TERM_TYPES.includes(type);
}

export function groupGlossaryTerms(terms: GlossaryTerm[]) {
  return GLOSSARY_GROUPS.map((group) => ({
    label: group.label,
    terms: terms.filter((term) => group.types.includes(term.type)),
  })).filter((group) => group.terms.length > 0);
}

/**
 * The definition sentence, recovered from rendered HTML.
 *
 * The detail component only receives rendered html, not the markdown source.
 * The first paragraph is the definition — headings and the bold "Technique
 * for:" label that precedes some of them are both skipped.
 */
export function definitionFromHtml(html: string, maxLen = 300): string {
  for (const match of html.matchAll(/<p(?![a-z])[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/\s+/g, " ")
      .trim();
    // "Technique for: Be Simple" is a label, not a definition.
    if (text.length < 25 || /^[A-Za-z ]+ for:/.test(text)) continue;
    return text.length <= maxLen ? text : `${text.slice(0, text.lastIndexOf(" ", maxLen - 1))}…`;
  }
  return "";
}
