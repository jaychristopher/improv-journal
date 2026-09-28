import { SITE_URL } from "@/lib/seo";

/**
 * PodcastSeries markup for a show.
 *
 * The feeds are valid enough to submit to Apple and Spotify, but nothing on
 * the site said a show was a podcast: the pages emitted only WebSite,
 * Organization and BreadcrumbList, the same as any other page. Declaring the
 * series — and pointing webFeed at the RSS — is what lets the page and the feed
 * be understood as the same thing.
 *
 * It carried `numberOfEpisodes` until 2026-09-28, and that was the one
 * structured-data fault on the site: Ahrefs' Site Audit crawl of 2026-09-22
 * failed all three show pages on schema.org validation and nothing else.
 * The property belongs to TVSeries, RadioSeries, VideoGameSeries and
 * CreativeWorkSeason; PodcastSeries inherits from CreativeWorkSeries, which
 * has no episode count, and the type itself adds only `webFeed` and `actor`.
 * The count the feed carries stays on the page in the visible copy.
 * podcast-series.test.ts holds the property set to what the type defines.
 */
export function PodcastSeriesJsonLd({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  const url = `${SITE_URL}/listen/${id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    "@id": `${url}#series`,
    name: title,
    description,
    url,
    webFeed: `${url}/feed.xml`,
    image: `${SITE_URL}/og/podcast?title=${encodeURIComponent(title)}`,
    inLanguage: "en-US",
    publisher: { "@id": `${SITE_URL}#organization` },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
