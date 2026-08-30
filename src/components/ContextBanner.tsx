import Link from "next/link";

interface ContextBannerProps {
  threadTitle: string;
  threadHref: string;
  pathTitle: string;
  pathHref: string;
}

/**
 * One relationship at the top of a concept page.
 *
 * It used to carry an `alsoIn` list of every other path the atom belonged to,
 * and render above the breadcrumb. That put as much as 190 characters of
 * internal titles in the highest-attention position on the page, ahead of
 * anything telling the reader where they were — and all of it was duplicated
 * lower down, since the sidebar's "Part of" block lists the same paths and
 * more.
 *
 * A visitor arriving from a search result has never seen any of those names.
 * What the remaining line should actually say is still open; this change is
 * only about how much of it there is and where it sits.
 */
export function ContextBanner({
  threadTitle,
  threadHref,
  pathTitle,
  pathHref,
}: ContextBannerProps) {
  return (
    <div className="text-foreground/40 mb-4 text-xs">
      <span>Part of </span>
      <Link href={threadHref} className="text-foreground/60 hover:underline">
        {threadTitle}
      </Link>
      <span> in </span>
      <Link href={pathHref} className="text-foreground/60 hover:underline">
        {pathTitle}
      </Link>
    </div>
  );
}
