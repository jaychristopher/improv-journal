import { authorSameAs } from "@/lib/author-entities";
import { type ArticleRef, citedWorkId } from "@/lib/jsonld-edges";
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
  citedBy = [],
}: {
  work: CitedWork;
  url: string;
  description: string;
  externalLinks?: ExternalLink[];
  /**
   * The concept Articles that cite this work, from `workCitedBy`. Listed
   * under `subjectOf` after the page itself; see the note there.
   */
  citedBy?: ArticleRef[];
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
    // The Book had ISBN, author and DOI and no `@id`, so the 328 concept
    // edges into the library could name it only as an untyped URL. The
    // fragment keeps it distinct from the WebPage below, whose `@id` is the
    // bare page URL; the concept pages cite this id through the same helper.
    "@id": citedWorkId(url),
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
    // `subjectOf` — "a CreativeWork or Event about this Thing" — is the one
    // schema.org property that runs from a work toward the pages that discuss
    // it: the entry itself first, then every concept page whose edges cite
    // the work, the list the "Pages that cite it" block below renders.
    // schema.org has no inverse of `citation`; `workExample` would make each
    // concept page an edition of the book and `isBasedOn` runs the other way
    // and belongs on the concept (novel-insights entry 261).
    subjectOf: [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${url}`,
        name: `${work.name} — notes and citations`,
        isPartOf: { "@type": "CollectionPage", "@id": `${SITE_URL}/library` },
      },
      ...citedBy,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
