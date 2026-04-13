import { SITE_NAME, SITE_URL } from "@/lib/seo";

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${SITE_URL}${url}`,
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    author: { "@type": "Person", name: "Jay Christopher" },
    publisher: { "@type": "Organization", name: SITE_NAME },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
