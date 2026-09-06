import Link from "next/link";

interface ContextBannerProps {
  threadTitle?: string;
  threadHref?: string;
  pathTitle?: string;
  pathHref?: string;
}

/**
 * One line of orientation at the top of a concept page.
 *
 * It used to read "Part of *The Inner Game Expanded* in *Systems of Improv*",
 * and the problem was never the length — it was that both halves are proper
 * nouns with no type attached. Somebody who arrived thirty seconds ago from a
 * search result has never seen either name, so the sentence located the page
 * inside a structure they have no model of. It read as orientation and
 * functioned as jargon.
 *
 * The fix is to say what each name *is*. A reader who is told one is a lesson
 * and the other a sequence meant to be read in order can decide whether to
 * follow it; a reader given two titles cannot. That is the whole change, and it
 * is deliberately not a "what this site is" line — that was tried and dropped,
 * because the honest version of it is the site's own tagline, a count of laws
 * and principles, which means nothing to somebody who searched for a Substack.
 *
 * The type label above the h1 already says what kind of page this is
 * ("concept", "exercise"), so this does not repeat it. Repeating it would be
 * the overload version of the same mistake.
 *
 * Both halves are optional. Requiring both is why 103 of 205 concept pages
 * showed no line at all, and a page that belongs to a sequence but not to a
 * lesson has something worth saying too.
 */
export function ContextBanner({
  threadTitle,
  threadHref,
  pathTitle,
  pathHref,
}: ContextBannerProps) {
  const thread =
    threadTitle && threadHref ? (
      <Link href={threadHref} className="text-foreground/60 hover:underline">
        {threadTitle}
      </Link>
    ) : null;

  const path =
    pathTitle && pathHref ? (
      <Link href={pathHref} className="text-foreground/60 hover:underline">
        {pathTitle}
      </Link>
    ) : null;

  if (!thread && !path) return null;

  return (
    <div className="text-foreground/40 mb-4 text-xs">
      {thread && path ? (
        <>
          {thread} is a lesson in {path} — a sequence meant to be read in order.
        </>
      ) : thread ? (
        <>{thread} is a lesson that works through this in order.</>
      ) : (
        <>Part of {path} — a sequence meant to be read in order.</>
      )}
    </div>
  );
}
