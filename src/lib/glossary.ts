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
import { leadParagraph, PLAIN_LEAD_LABEL, stripLeadLabel } from "./seo";
import { CORE_DEFINITION, CORE_HREF } from "./the-core";

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

/**
 * What a term can be: an atom's type, or `site` for a term the site coined
 * for its own structure and defines on a route rather than in an atom. One
 * such term so far, `CORE_TERM` below.
 */
export type GlossaryTermType = AtomType | "site";

/** How the hub groups the list, so 151 entries stay navigable. */
export const GLOSSARY_GROUPS: { label: string; types: GlossaryTermType[] }[] = [
  { label: "Terms", types: ["definition"] },
  { label: "Techniques", types: ["technique", "pedagogy"] },
  { label: "What Goes Wrong", types: ["antipattern", "pattern"] },
  { label: "Principles and Laws", types: ["principle", "law", "framework", "insight"] },
  { label: "Formats", types: ["format"] },
  { label: "Exercises", types: ["exercise"] },
  { label: "Structure", types: ["site"] },
];

export interface GlossaryTerm {
  id: string;
  term: string;
  url: string;
  type: GlossaryTermType;
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

/**
 * "The core": the one term the site coined rather than authored. Eighty-three
 * built pages said "and the core" or "through the core" and no page, entry
 * or tooltip said what it meant (tracker entry 309). It is not an atom — the
 * members are nineteen atoms, recomputed in the-core.ts — so it cannot come
 * out of `loadGlossaryTerms`, whose every entry is a page an atom lives on
 * (glossary.test.ts holds that). The hub appends it to the loaded list, and
 * its definition is the sentence the page opens on, so the entry and the
 * page it links say the same thing.
 */
export const CORE_TERM: GlossaryTerm = {
  id: "the-core",
  term: "The core",
  url: CORE_HREF,
  type: "site",
  definition: CORE_DEFINITION,
};

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
    // A leading bold label is dropped, exactly as stripLeadLabel does on the
    // markdown side. Without this the JSON-LD disagreed with both the meta
    // description and the glossary hub, and the eight principle pages told a
    // crawler their definition was "Alias: Act before you're ready" — the
    // label leaked because only "<label> for:" was filtered. Matched on the
    // <strong> tag rather than on the text so an ordinary sentence that
    // happens to contain an early colon is left alone.
    const label = /^\s*<strong>([^<]*?):?<\/strong>:?\s*/.exec(match[1]);
    // "Trains: Be Changeable" and "Technique for: Be Simple" name a *different*
    // concept than the page, so keeping the sentence would define the wrong
    // thing — Emotion Switch would be described as Be Changeable. Those
    // paragraphs are skipped so the real description below them is used.
    if (label && /^(trains|[A-Za-z ]+ for)$/i.test(label[1].trim())) continue;
    const text = match[1]
      .replace(/^\s*<strong>([^<]*?):?<\/strong>:?\s*/, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
      .replace(/\s+/g, " ")
      .trim()
      // The plain form — "Recovery: Decay is how to recover…" — has no
      // <strong> to match on, so it is dropped by the shape the markdown side
      // uses (see PLAIN_LEAD_LABEL). Without this the three recovery patterns'
      // DefinedTerm carried the label after the meta tag had lost it.
      .replace(PLAIN_LEAD_LABEL, "");
    // "Technique for: Be Simple" is a label, not a definition.
    if (text.length < 25 || /^[A-Za-z ]+ for:/.test(text)) continue;
    return text.length <= maxLen ? text : `${text.slice(0, text.lastIndexOf(" ", maxLen - 1))}…`;
  }
  return "";
}

/**
 * Drop a leading bold label from rendered HTML so it does not reach a
 * description. The markdown side has done this since stripLeadLabel; the HTML
 * side had not, so Article JSON-LD carried "Alias: Act before you're ready"
 * on all eight principle pages while the meta tag on the same page was clean.
 */
export function stripLeadLabelHtml(html: string): string {
  // "**Technique for: Be Positive**" renders as a paragraph containing nothing
  // but the label, and the label links the principle — so the <strong> holds a
  // nested <a> and a [^<] scan cannot cross it. Drop the whole paragraph: it
  // names a different concept, so keeping any of it would describe the wrong
  // thing.
  const withoutLabelPara = html.replace(
    /^\s*<p(?![a-z])[^>]*>\s*<strong>[\s\S]*?<\/strong>\s*<\/p>\s*/,
    "",
  );
  // "**Alias:** Act before you're ready" keeps its sentence — that glosses this
  // same concept — and loses only the label.
  return withoutLabelPara.replace(/(<p(?![a-z])[^>]*>)\s*<strong>[\s\S]*?<\/strong>:?\s*/, "$1");
}
