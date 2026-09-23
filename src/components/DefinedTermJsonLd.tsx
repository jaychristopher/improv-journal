import { getAtomBySlug } from "@/lib/content";
import { GLOSSARY_URL, type GlossaryTerm } from "@/lib/glossary";
import { definedTermId } from "@/lib/jsonld-edges";
import type { AtomFrontmatter } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

/**
 * The frontmatter a DefinedTerm reads beyond what the glossary term carries:
 * the atom's external identity and, on games, its purpose-written rules.
 */
export type DefinedTermFrontmatter = Pick<
  AtomFrontmatter,
  "type" | "sameAs" | "subject" | "how_to_play"
>;

/**
 * Authority records for the term.
 *
 * `sameAs` is the explicit field. An atom that declares a `subject` instead
 * (the Harold, Theatresports, the Meisner technique) is naming the concept it
 * defines — the page-subject guard requires the title to name the subject —
 * so those records identify the term too, and the DefinedTerm was the one
 * piece of markup on the page that ignored them.
 */
export function definedTermSameAs(fm?: DefinedTermFrontmatter): string[] | undefined {
  const explicit = fm?.sameAs?.filter((url) => url.trim().length > 0);
  if (explicit?.length) return explicit;
  const fromSubject = fm?.subject?.sameAs?.filter((url) => url.trim().length > 0);
  return fromSubject?.length ? fromSubject : undefined;
}

/**
 * The term's description.
 *
 * On a game, `how_to_play` is the one sentence written to describe it, and it
 * is what the type hubs, the games hub and the meta description already show
 * (entry 187). The derived lead sentence says what the game *trains*, which
 * is the wrong answer to "what is this term". Concepts keep the lead
 * sentence: that is their definition.
 */
export function definedTermDescription(
  term: Pick<GlossaryTerm, "type" | "definition">,
  fm?: Pick<DefinedTermFrontmatter, "how_to_play">,
): string {
  if (term.type === "exercise" || term.type === "format") {
    const rules = fm?.how_to_play?.trim();
    if (rules) return rules;
  }
  return term.definition;
}

/** The JSON-LD object, kept pure so a test can read it without rendering. */
export function definedTermJsonLd(term: GlossaryTerm, fm?: DefinedTermFrontmatter) {
  const sameAs = definedTermSameAs(fm);
  return {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    // Through the shared helper, because concept pages now point `mentions`
    // at this id (jsonld-edges) and the two must match byte for byte.
    "@id": definedTermId(term.url),
    name: term.term,
    description: definedTermDescription(term, fm),
    termCode: term.id,
    ...(term.aliases?.length ? { alternateName: term.aliases } : {}),
    ...(sameAs ? { sameAs } : {}),
    url: `${SITE_URL}${term.url}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": `${SITE_URL}${GLOSSARY_URL}`,
      name: "Improv Vocabulary",
      url: `${SITE_URL}${GLOSSARY_URL}`,
    },
  };
}

/**
 * schema.org DefinedTerm markup for a single vocabulary entry.
 *
 * These pages answer "what does X mean" queries, where a generic Article tells
 * a crawler nothing about what the page actually is. DefinedTerm, tied back to
 * the glossary's DefinedTermSet, states that the page defines a term of art.
 *
 * The term the caller hands over is the glossary shape — name, lead sentence,
 * aliases. Identity and rules live in the atom's frontmatter, so the atom is
 * looked up by id here (a cached read) rather than widening every caller.
 */
export async function DefinedTermJsonLd({ term }: { term: GlossaryTerm }) {
  const atom = await getAtomBySlug(term.id);
  const jsonLd = definedTermJsonLd(term, atom?.frontmatter);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
