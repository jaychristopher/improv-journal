import Link from "next/link";

import type { ContentStatus } from "@/lib/schema";

/**
 * A visible byline and last-updated date.
 *
 * Every guide already carried `dateModified` in its structured data and showed
 * the reader nothing. That is the wrong way round for these results in
 * particular: the pages this site competes with rank with titles ending "in
 * 2026" and "Best in 2026", because a list of questions is judged largely on
 * whether it is current. A machine-readable date settles nothing for somebody
 * deciding, in about a second, whether to scroll or go back.
 *
 * The date is built from its parts rather than passed through `new Date`.
 * "2026-08-22" parses as UTC midnight, so formatting it in local time renders
 * the 21st for every reader west of Greenwich — a silent off-by-one that would
 * also disagree with the dateModified emitted alongside it.
 *
 * The byline is here for the same reason the date is. Every one of the 252
 * Article entities on this site named an author, gave it @id /about#author and
 * url /about — and not one content page showed a reader who wrote it. Only
 * /about itself carried the name anywhere a person could see it, and /about
 * had no inbound link from any page body, only the footer. So the site was
 * asserting authorship to parsers and hiding it from people, which is the
 * mismatch structured data is not supposed to have: it is meant to describe
 * what is on the page.
 */

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatUpdated(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  const dayNumber = Number(day);
  if (dayNumber < 1 || dayNumber > 31) return null;
  return `${dayNumber} ${MONTHS[monthIndex]} ${year}`;
}

/**
 * `minutes` joins the same line for the same reason as the other two. A reader
 * decides whether to start before they decide whether to finish, and the guides
 * span 1,095 to 4,790 words with nothing on the page distinguishing them.
 *
 * `status` is the frontmatter's own word for how finished the page is — seed,
 * draft or validated. The About page has promised since the first commit that
 * "content carries a status of seed, draft, or validated, and those labels are
 * meant honestly", and on 2026-09-22 the label rendered on the source
 * transcript page and nowhere else: 284 drafts, 26 seeds and 9 validated pages
 * said nothing about which they were, and the reader was told the label
 * existed on the one page that did not show it (tracker entry 318). It rides
 * the byline because that is the line a reader already reads for "how current
 * is this", and "how finished is this" is the same question. One muted word,
 * after the date, so a seed says it is a seed on the page where the reader
 * decides whether to continue (entry 319).
 *
 * The word links the About paragraph that explains the ladder and states the
 * distribution. It reads "draft" on 284 of 319 pages (entry 323, 2026-09-22),
 * so a reader meeting it for the first time is meeting the norm, not a
 * warning, and the page that says so is one click away.
 */
export function UpdatedOn({
  date,
  minutes,
  status,
  className,
}: {
  date?: string;
  minutes?: number;
  status?: ContentStatus;
  className?: string;
}) {
  const formatted = date ? formatUpdated(date) : null;

  return (
    <p className={className} data-track="byline">
      {/* The visible "By Jay Christopher" was removed on 2026-09-24. The
          author is still declared in the Article and Organization markup
          (seo.ts, ArticleJsonLd) and in the feeds, which is where a machine
          reads it; the line itself now carries only what a reader came to
          it for — how current the page is, how long it takes, and how
          finished it is. */}
      {date && formatted ? (
        <>
          {"Updated "}
          <time dateTime={date.slice(0, 10)}>{formatted}</time>
        </>
      ) : null}
      {minutes ? `${date && formatted ? " · " : ""}${minutes} min read` : null}
      {status ? (
        <>
          {date || minutes ? " · " : ""}
          <Link href="/about#status" className="hover:underline">
            <span data-status={status}>{status}</span>
          </Link>
        </>
      ) : null}
    </p>
  );
}
