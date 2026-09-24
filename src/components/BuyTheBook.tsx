import {
  AFFILIATE_DISCLOSURE,
  AFFILIATE_REL,
  amazonSearchUrl,
  type Edition,
  EDITION_LABELS,
  editionUrl,
} from "@/lib/affiliate";

/**
 * The buy card on a library entry.
 *
 * A library entry is a decision page: a reader arrives having heard of a book
 * and leaves having decided whether to read it. Until now the page answered
 * that and then left them to find it themselves — the only route out was a
 * bare "Amazon ↗" chip in a row of external links, styled like a citation.
 *
 * So the decision and the purchase sit together. The verdict line above the
 * buttons is the entry's own argument about who the book is for, not a
 * blurb: several of these recommend against buying, and saying so is what
 * makes the recommendation worth anything when it is positive.
 *
 * Only formats that exist are offered (`book-editions.ts`). A book with no
 * recorded edition still gets a link, as a tagged search, because sending a
 * reader to the right search is better than sending them nowhere.
 */
export function BuyTheBook({
  title,
  author,
  editions,
  verdict,
}: {
  title: string;
  author?: string;
  editions: Edition[];
  /** One line on who should actually buy it, from the entry's own argument. */
  verdict?: string;
}) {
  const links = editions.length
    ? editions.map((edition) => ({
        key: edition.kind,
        label: EDITION_LABELS[edition.kind],
        href: editionUrl(edition),
      }))
    : [{ key: "search", label: "Find it on Amazon", href: amazonSearchUrl(title, author) }];

  return (
    <aside
      data-track="buy-the-book"
      className="border-border-ui bg-surface mt-8 rounded-xl border p-5 sm:p-6"
    >
      <h2 className="text-foreground-strong text-lg font-semibold">Get the book</h2>
      {verdict && <p className="text-foreground mt-2 text-sm leading-relaxed">{verdict}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        {links.map((link, i) => (
          <a
            key={link.key}
            href={link.href}
            target="_blank"
            rel={AFFILIATE_REL}
            className={[
              "inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold transition-colors",
              i === 0
                ? "bg-foreground text-background hover:bg-foreground-strong"
                : "border-border-ui text-foreground-strong hover:border-foreground-strong hover:bg-foreground/[0.07] border",
            ].join(" ")}
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Close to the links and in the same card, which is what "clear and
          conspicuous" means — a disclosure in the footer is not one. */}
      <p className="text-foreground-dim mt-4 text-xs leading-relaxed">{AFFILIATE_DISCLOSURE}</p>
    </aside>
  );
}
