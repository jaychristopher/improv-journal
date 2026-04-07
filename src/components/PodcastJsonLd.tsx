const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://improv.jaychristopher.com";

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
    url: `${SITE_URL}${pageUrl}`,
    associatedMedia: {
      "@type": "MediaObject",
      contentUrl: `${SITE_URL}${audioUrl}`,
      encodingFormat: "audio/mpeg",
    },
    ...(isoDuration && { duration: isoDuration }),
    partOfSeries: {
      "@type": "PodcastSeries",
      name: "The Physics of Connection",
      url: `${SITE_URL}/listen`,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
