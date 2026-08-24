import { authorSameAs } from "@/lib/author-entities";
import type { CitedWork, ExternalLink } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

/**
 * schema.org entity markup for a library reference.
 *
 * Library pages compete for exact work-title queries ("improvisation for the
 * theater", "anne bogart viewpoints"), where search engines resolve results
 * against a known entity. Emitting Book/Blog/PodcastSeries with author, ISBN,
 * periodical, DOI, and publisher lets the page be matched to the real work rather than treated
 * as an untyped article that merely mentions it.
 */
export function CitedWorkJsonLd({
  work,
  url,
  description,
  externalLinks = [],
}: {
  work: CitedWork;
  url: string;
  description: string;
  externalLinks?: ExternalLink[];
}) {
  // A DOI is the stable identifier a search engine can resolve the article
  // against, so it belongs in sameAs alongside any hand-added links.
  const sameAs = [
    ...externalLinks.map((link) => link.url).filter(Boolean),
    ...(work.doi ? [`https://doi.org/${work.doi}`] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": work.type,
    name: work.name,
    // A named author with no authority record is a string a crawler has to
    // guess at. Every query that reaches these pages is [author] plus [work],
    // so this is the half of the query that most needs resolving.
    author: work.authors.map((name) => {
      const sameAsUrl = authorSameAs(name);
      return { "@type": "Person", name, ...(sameAsUrl ? { sameAs: [sameAsUrl] } : {}) };
    }),
    description,
    url: `${SITE_URL}${url}`,
    ...(work.publisher ? { publisher: { "@type": "Organization", name: work.publisher } } : {}),
    ...(work.published ? { datePublished: work.published } : {}),
    ...(work.isbn ? { isbn: work.isbn } : {}),
    ...(work.periodical ? { isPartOf: { "@type": "Periodical", name: work.periodical } } : {}),
    ...(work.doi
      ? { identifier: { "@type": "PropertyValue", propertyID: "DOI", value: work.doi } }
      : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    subjectOf: {
      "@type": "WebPage",
      "@id": `${SITE_URL}${url}`,
      name: `${work.name} — notes and citations`,
      isPartOf: { "@type": "CollectionPage", "@id": `${SITE_URL}/library` },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
