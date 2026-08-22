import type { ContentHeading } from "@/lib/headings";

/**
 * The page's own sections, offered as navigation.
 *
 * Rendered above the body rather than in a sidebar so it survives on a phone,
 * where most of these pages are read, and so a crawler meets the outline
 * before the prose.
 */
export function TableOfContents({ headings }: { headings: ContentHeading[] }) {
  if (headings.length === 0) return null;

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
      <ol className="space-y-1.5">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className="text-foreground/70 hover:text-foreground text-sm hover:underline"
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
