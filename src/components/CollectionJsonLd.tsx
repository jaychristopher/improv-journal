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
  id,
}: {
  name: string;
  description: string;
  url: string;
  items: CollectionEntry[];
  partOf?: string;
  /**
   * The node's `@id`, where the page's bare URL is already another entity's.
   * On /how-it-works/the-core the bare URL is the DefinedTerm the glossary
   * set and every `mentions` edge point at (jsonld-edges: the term owns the
   * page URL, other nodes take a fragment), so the collection takes
   * `#collection` there. Two definitions on one `@id` are merged by
   * consumers with the choice of name and description left arbitrary; the
   * rendered audit reported it as a critical for five days (2026-09-27).
   */
  id?: string;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}${id ?? url}`,
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
