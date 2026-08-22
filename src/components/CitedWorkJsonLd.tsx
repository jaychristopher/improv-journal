import type { CitedWork, ExternalLink } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

/**
 * schema.org entity markup for a library reference.
 *
 * Library pages compete for exact work-title queries ("improvisation for the
 * theater", "anne bogart viewpoints"), where search engines resolve results
 * against a known entity. Emitting Book/Blog/PodcastSeries with author, ISBN,
 * and publisher lets the page be matched to the real work rather than treated
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
  const sameAs = externalLinks.map((link) => link.url).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": work.type,
    name: work.name,
    author: work.authors.map((name) => ({ "@type": "Person", name })),
    description,
    url: `${SITE_URL}${url}`,
    ...(work.publisher ? { publisher: { "@type": "Organization", name: work.publisher } } : {}),
    ...(work.published ? { datePublished: work.published } : {}),
    ...(work.isbn ? { isbn: work.isbn } : {}),
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
