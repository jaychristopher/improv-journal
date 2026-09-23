import Link from "next/link";

import type { ContentHeading } from "@/lib/headings";

/**
 * A section whose heading is a concept's title, and where the concept
 * lives. Computed by the caller (headedConcepts in lib/headed-concepts.ts)
 * so the list stays presentational and the pages that pass nothing render
 * as before.
 */
export interface TocConcept {
  headingId: string;
  href: string;
  title: string;
}

/**
 * How many top-level sections the outline shows before the rest fold away.
 *
 * Counted in sections, not entries, and that distinction is the whole point.
 * The first version of this folded the list by raw count, which meant a page
 * whose opening section had three subsections spent most of its budget on one
 * section and hid the others: 121 of 127 folded outlines were concealing a
 * top-level section, one of them fourteen. An outline that cannot show what a
 * page covers is worse than a long one, because it is wrong rather than merely
 * tiring.
 *
 * Top-level sections run to a median of seven and a maximum of twenty-two, so
 * ten shows every page's shape in full except the thirty longest, against a
 * worst case of twenty-seven when every entry was listed.
 */
export const TOC_VISIBLE = 10;

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
 *
 * `concepts`: on the guides, a section headed with a concept's title —
 * "2. Mirroring", "Side-Coaching: Adjust Without Stopping" — gets a small
 * trailing link to the concept, marked `data-toc-concept`, so the reader who
 * arrives through the contents can reach the graph from the section they
 * came for. The outline and the concept block were 2 maps of the page that
 * barely overlapped: 23 of 455 declared concepts head a section and 34
 * headings name a concept the guide does not declare (tracker entry 324,
 * 2026-09-22). The entry's own link is untouched; the mark is a second
 * anchor after it.
 */
export function TableOfContents({
  headings,
  concepts = [],
}: {
  headings: ContentHeading[];
  concepts?: TocConcept[];
}) {
  if (headings.length === 0) return null;

  // Top-level first: the visible outline is what the page covers, and the
  // subsections are detail behind the fold. Pages built entirely from level-3
  // headings have no top level to prefer, so they fall back to raw order.
  const topLevel = headings.filter((h) => h.level !== 3);
  const budget =
    topLevel.length > 0 ? topLevel.slice(0, TOC_VISIBLE) : headings.slice(0, TOC_VISIBLE);
  const shownIds = new Set(budget.map((h) => h.id));
  const shown = headings.filter((h) => shownIds.has(h.id));
  const rest = headings.filter((h) => !shownIds.has(h.id));

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
      {concepts
        .filter((concept) => concept.headingId === heading.id)
        .map((concept) => (
          <Link
            key={concept.href}
            href={concept.href}
            data-toc-concept
            aria-label={`Concept: ${concept.title}`}
            title={`Concept: ${concept.title}`}
            className="text-foreground/40 hover:text-foreground ml-1.5 text-xs"
          >
            &#8599;
          </Link>
        ))}
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
            <span className="group-open:hidden">Show all {headings.length} sections &rarr;</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <ol className="mt-1.5 space-y-1.5">{rest.map(item)}</ol>
        </details>
      )}
    </nav>
  );
}
