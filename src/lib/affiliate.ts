/**
 * Amazon Associates links for the library.
 *
 * The library entries are the best-ranking pages on the site and every one of
 * them ends with a reader deciding whether to buy a book. Eighteen of them
 * already carried a bare `amazon.com/dp/…` link in their frontmatter, which
 * sent that traffic to Amazon and earned nothing from it. This is the same
 * link with the tag on it, plus the audiobook where one exists.
 *
 * Two rules the rest of this file exists to keep:
 *
 * 1. **The tag is configuration, not a constant.** It comes from
 *    `NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG`, which bakes in at build time on
 *    Vercel like every other env var here — changing it in the dashboard does
 *    nothing until the next build. With it unset the links still work and
 *    simply earn nothing, so a missing tag is a lost commission rather than a
 *    broken page.
 * 2. **A format is only offered when it exists.** An ASIN is a fact about a
 *    real listing, so they are recorded per book in `book-editions.ts` rather
 *    than guessed from a title. A book with no audiobook renders no audiobook
 *    button.
 *
 * The disclosure is not optional. The FTC requires it to be clear and close
 * to the link, which is why it renders inside the card rather than in the
 * footer.
 */

export const AMAZON_ASSOCIATES_TAG = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG ?? "";

/** What the reader is told, immediately above the buttons. */
export const AFFILIATE_DISCLOSURE =
  "We earn a commission if you buy through these links, at no extra cost to you. It does not affect what goes on this page — several entries here recommend against buying the book.";

/**
 * The Associates Operating Agreement's participation statement.
 *
 * Distinct from AFFILIATE_DISCLOSURE above, which is the FTC's proximity
 * requirement and belongs beside the links it describes. This one is a
 * site-wide statement of membership, and the footer is where it goes: only
 * 32 of 387 pages carry a buy card, and the obligation is not per-page.
 */
export const AFFILIATE_PARTICIPATION = "As an Amazon Associate I earn from qualifying purchases.";

/**
 * `rel` for a paid link.
 *
 * `sponsored` is what Google asks for on an affiliate link specifically;
 * `nofollow` covers crawlers that never learned it. Without `noopener` the
 * destination gets a handle on this window through `window.opener`.
 */
export const AFFILIATE_REL = "sponsored nofollow noopener";

/** A buyable edition of a book. */
export interface Edition {
  kind: "print" | "kindle" | "audiobook";
  /** Amazon's id for the listing — the ISBN-10 for most print books. */
  asin: string;
}

function tagged(url: URL): string {
  if (AMAZON_ASSOCIATES_TAG) url.searchParams.set("tag", AMAZON_ASSOCIATES_TAG);
  return url.toString();
}

/** The product page for an edition, tagged when a tag is configured. */
export function editionUrl(edition: Edition): string {
  const host = edition.kind === "audiobook" ? "https://www.audible.com" : "https://www.amazon.com";
  const path = edition.kind === "audiobook" ? "/pd" : "/dp";
  return tagged(new URL(`${path}/${edition.asin}`, host));
}

/**
 * A tagged search, for a book with no recorded ASIN.
 *
 * Worth having because the alternative is no link at all: a search for the
 * title and author lands the reader on the right listing in one more click
 * and still carries the tag.
 */
export function amazonSearchUrl(title: string, author?: string): string {
  const url = new URL("/s", "https://www.amazon.com");
  url.searchParams.set("k", [title, author].filter(Boolean).join(" "));
  return tagged(url);
}

/** What the button says. */
export const EDITION_LABELS: Record<Edition["kind"], string> = {
  print: "Print",
  kindle: "Kindle",
  audiobook: "Audiobook",
};
