import { SITE_URL } from "@/lib/seo";

/**
 * PodcastSeries markup for a show.
 *
 * The feeds are valid enough to submit to Apple and Spotify, but nothing on
 * the site said a show was a podcast: the pages emitted only WebSite,
 * Organization and BreadcrumbList, the same as any other page. Declaring the
 * series — and pointing webFeed at the RSS — is what lets the page and the feed
 * be understood as the same thing.
 */
export function PodcastSeriesJsonLd({
  id,
  title,
  description,
  episodeCount,
}: {
  id: string;
  title: string;
  description: string;
  episodeCount: number;
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
    numberOfEpisodes: episodeCount,
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
