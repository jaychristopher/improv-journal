import { GLOSSARY_URL, type GlossaryTerm } from "@/lib/glossary";
import { SITE_URL } from "@/lib/seo";

/**
 * schema.org DefinedTerm markup for a single vocabulary entry.
 *
 * These pages answer "what does X mean" queries, where a generic Article tells
 * a crawler nothing about what the page actually is. DefinedTerm, tied back to
 * the glossary's DefinedTermSet, states that the page defines a term of art.
 */
export function DefinedTermJsonLd({ term }: { term: GlossaryTerm }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    "@id": `${SITE_URL}${term.url}`,
    name: term.term,
    description: term.definition,
    termCode: term.id,
    url: `${SITE_URL}${term.url}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": `${SITE_URL}${GLOSSARY_URL}`,
      name: "Improv Vocabulary",
      url: `${SITE_URL}${GLOSSARY_URL}`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
