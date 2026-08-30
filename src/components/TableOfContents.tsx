import type { ContentHeading } from "@/lib/headings";

/**
 * How many sections the outline shows before the rest fold away.
 *
 * The median page has seven, so at eight most outlines are untouched and only
 * the long ones fold: 48 of 197 concept pages, and 117 links that no longer sit
 * between the title and the first sentence. The worst case is sixteen.
 */
export const TOC_VISIBLE = 8;

/**
 * The page's own sections, offered as navigation.
 *
 * Rendered above the body rather than in a sidebar so it survives on a phone,
 * where most of these pages are read, and so a crawler meets the outline
 * before the prose.
 *
 * That placement is also what makes a long outline expensive. On a reference
 * page with sixteen sections a phone reader scrolls past sixteen links to reach
 * the first sentence, and the value of an outline is orientation — past a
 * certain length it stops orienting and becomes the thing you scroll through.
 * So the first few stay and the remainder collapse.
 *
 * A native `details`, matching the concept sidebar rather than introducing a
 * second idiom for the same job. No JavaScript, keyboard accessible, and the
 * folded entries stay in the server-rendered html, which is what keeps the
 * outline in front of a crawler as the comment above intends.
 */
export function TableOfContents({ headings }: { headings: ContentHeading[] }) {
  if (headings.length === 0) return null;

  const shown = headings.slice(0, TOC_VISIBLE);
  const rest = headings.slice(TOC_VISIBLE);

  const item = (heading: ContentHeading) => (
    <li key={heading.id} className={heading.level === 3 ? "ml-4" : undefined}>
      <a
        href={`#${heading.id}`}
        className={
          heading.level === 3
            ? "text-foreground/50 hover:text-foreground text-sm hover:underline"
            : "text-foreground/70 hover:text-foreground text-sm hover:underline"
        }
      >
        {heading.text}
      </a>
    </li>
  );

  return (
    <nav
      aria-label="On this page"
      className="border-foreground/10 bg-surface mb-8 rounded-lg border p-4"
    >
      {/* A <p>, not an <h2>: the nav is already labelled for assistive tech, and
          a heading here would put a generic entry at the top of the outline
          Google reads, ahead of the sections the page is actually about. */}
      <p className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
        On this page
      </p>
      <ol className="space-y-1.5">{shown.map(item)}</ol>

      {rest.length > 0 && (
        <details className="group mt-1.5">
          <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer list-none text-xs">
            <span className="group-open:hidden">{rest.length} more sections &rarr;</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ol className="mt-1.5 space-y-1.5">{rest.map(item)}</ol>
        </details>
      )}
    </nav>
  );
}
