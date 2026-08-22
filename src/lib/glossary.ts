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
import { leadParagraph } from "./seo";

export const GLOSSARY_URL = "/practice/vocabulary";

export interface GlossaryTerm {
  id: string;
  term: string;
  url: string;
  /** The entry's opening definition, taken verbatim from its own content. */
  definition: string;
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
