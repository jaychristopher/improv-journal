import type { PageSubject } from "@/lib/schema";
import { authorRef, ogImages, publisherRef, SITE_URL } from "@/lib/seo";

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  /**
   * The same eyebrow the page hands to ogImages, so the image named here is the
   * one already declared as og:image rather than a second, different card.
   */
  eyebrow?: string;
  subject?: PageSubject;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  eyebrow,
  subject,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url: `${SITE_URL}${url}`,
    /**
     * Google lists image among the recommended properties for Article and
     * describes it as what lets Search, News and Assistant show visual content
     * for a page. All 227 Article entities on this site omitted it while every
     * one of those pages was already generating a 1200x630 card at /og for its
     * og:image — the asset existed and the markup simply never pointed at it.
     *
     * Nothing in Article is strictly required, so this was valid markup the
     * whole time. It was just valid markup with the picture left out.
     */
    image: `${SITE_URL}${ogImages(title, eyebrow)[0].url}`,
    // Naming the subject is what lets a result be matched to the entity rather
    // than to a page that mentions its name.
    ...(subject
      ? {
          about: {
            "@type": subject.type,
            name: subject.name,
            ...(subject.description ? { description: subject.description } : {}),
            ...(subject.sameAs?.length ? { sameAs: subject.sameAs } : {}),
          },
        }
      : {}),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    author: authorRef(),
    publisher: publisherRef(),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
