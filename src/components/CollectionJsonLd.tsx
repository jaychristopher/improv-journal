import { SITE_URL } from "@/lib/seo";

export interface CollectionEntry {
  name: string;
  url: string;
  description?: string;
}

/**
 * CollectionPage/ItemList markup for an index page.
 *
 * The hub pages listed their contents as bare links, which reads to a crawler
 * as a page that happens to link out rather than as a catalogue of named
 * things. Declaring the list makes the hub itself the entity.
 */
export function CollectionJsonLd({
  name,
  description,
  url,
  items,
  partOf,
}: {
  name: string;
  description: string;
  url: string;
  items: CollectionEntry[];
  partOf?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${url}`,
    name,
    description,
    url: `${SITE_URL}${url}`,
    ...(partOf ? { isPartOf: { "@type": "WebPage", "@id": `${SITE_URL}${partOf}` } } : {}),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        url: `${SITE_URL}${item.url}`,
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
