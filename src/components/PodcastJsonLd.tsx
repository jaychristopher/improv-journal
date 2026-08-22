import { toAbsoluteSiteUrl } from "@/lib/audio";
import { SITE_URL } from "@/lib/seo";

interface PodcastJsonLdProps {
  title: string;
  description?: string;
  audioUrl: string;
  pageUrl: string;
  duration?: string; // formatted "M:SS"
}

export function PodcastJsonLd({
  title,
  description,
  audioUrl,
  pageUrl,
  duration,
}: PodcastJsonLdProps) {
  // Convert "M:SS" to ISO 8601 duration "PTxMxS"
  let isoDuration: string | undefined;
  if (duration) {
    const [mins, secs] = duration.split(":").map(Number);
    isoDuration = `PT${mins}M${secs}S`;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: title,
    description: description ?? title,
    url: toAbsoluteSiteUrl(pageUrl, SITE_URL),
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: toAbsoluteSiteUrl(audioUrl, SITE_URL),
      encodingFormat: "audio/mpeg",
    },
    ...(isoDuration && { duration: isoDuration }),
    partOfSeries: {
      "@type": "PodcastSeries",
      // Reference the series defined on its own page rather than restating a
      // hardcoded name, so an episode and its series resolve to one entity.
      "@id": `${SITE_URL}/listen/physics-of-connection#series`,
      name: "The Physics of Connection",
      url: toAbsoluteSiteUrl("/listen/physics-of-connection", SITE_URL),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
