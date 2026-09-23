import { articleId, type CitationRef, type DefinedTermRef } from "@/lib/jsonld-edges";
import type { PageSubject } from "@/lib/schema";
import { articleImages, authorRef, publisherRef, SITE_URL } from "@/lib/seo";

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
  /**
   * The `@id` of this site's own concept page for `subject`, where it has one
   * (`subjectConceptId` in jsonld-edges). 3 of the 22 declared subjects are
   * concepts this site defines (tracker entry 340); naming the `@id` joins the
   * guide's `about` to the DefinedTerm that carries the same record, instead
   * of both pages pointing outward and neither at each other.
   */
  subjectId?: string;
  /**
   * The page's first body image, site-relative (`/images/x.svg`). Listed ahead
   * of the OG card when present; see the note on `image` below.
   */
  contentImage?: string | null;
  /**
   * The works this page cites, as the `@id`s their library pages declare.
   * See `atomCitations` in jsonld-edges.
   */
  citation?: CitationRef[];
  /**
   * The concepts this page's edges name, as the DefinedTerm `@id`s their
   * pages declare. See `atomMentions` in jsonld-edges.
   */
  mentions?: DefinedTermRef[];
}

export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  eyebrow,
  subject,
  subjectId,
  contentImage,
  citation,
  mentions,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    // An Article with no `@id` cannot be pointed at. A work's page names the
    // concept pages that cite it (jsonld-edges `workCitedBy`), and the target
    // of that reference is this entity — a fragment, because on a concept
    // page the bare URL is already the DefinedTerm's `@id`.
    "@id": articleId(url),
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
     *
     * The card is the fallback, not the first choice. The image programme was
     * opened because the site had no body images for Google Images to index,
     * shipped 248 diagrams, and left "whether Article.image should change"
     * open while every page went on naming the text card (novel-insights
     * entry 190). A real diagram beats a rendered title, so a page with a
     * body image lists it first and keeps the card second; Google reads the
     * array and picks. Pages without one are unchanged.
     */
    image: articleImages(title, eyebrow, contentImage),
    // Naming the subject is what lets a result be matched to the entity rather
    // than to a page that mentions its name.
    ...(subject
      ? {
          about: {
            ...(subjectId ? { "@id": subjectId } : {}),
            "@type": subject.type,
            name: subject.name,
            ...(subject.description ? { description: subject.description } : {}),
            ...(subject.sameAs?.length ? { sameAs: subject.sameAs } : {}),
          },
        }
      : {}),
    // On a concept page `datePublished` is the atom's first-published date —
    // the first commit that added the file, or `created` where the file
    // predates the repository (first-published.ts; novel-insights 321) —
    // and `dateModified` is `updated`, the last commit that changed the
    // prose (content-history.mjs; entry 239). Both are read from git where
    // git can speak, so the pair is two dates and not a date and a stamp.
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    author: authorRef(),
    publisher: publisherRef(),
    // The page's typed edges, which the markup had never carried: 2,435 edges
    // in the content graph and none in the JSON-LD a crawler is allowed to
    // read (novel-insights entry 261). The lists are built in jsonld-edges
    // from the same `@id` helpers the target pages declare with.
    ...(citation?.length ? { citation } : {}),
    ...(mentions?.length ? { mentions } : {}),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
