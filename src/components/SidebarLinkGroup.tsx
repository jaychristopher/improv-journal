import Link from "next/link";

export interface SidebarLink {
  key: string;
  href: string;
  label: string;
}

/**
 * How many links a sidebar group shows before the rest collapse.
 *
 * Chosen by measuring rather than by feel. Across the heaviest concept pages
 * every group holds between two and nine links except one: "Guides", which holds
 * sixteen, because ATOM_GUIDE_LIMIT is sixteen. One group of that size in a
 * 260px column visually swamps the seven around it, and a reader arriving cold
 * from search meets a wall instead of a route onward.
 *
 * Five keeps every naturally-sized group intact and only folds the outlier.
 */
export const SIDEBAR_VISIBLE = 5;

/**
 * A sidebar list that shows the first few links and collapses the remainder.
 *
 * Deliberately a native `details` element rather than a client component. It
 * needs no JavaScript, it is keyboard accessible and screen-reader legible
 * without any ARIA of its own, and — the part that matters here — the collapsed
 * links are present in the server-rendered html rather than behind an event
 * handler. Google follows links inside collapsed content; it cannot follow one
 * that only exists after a click.
 *
 * That distinction is not theoretical in this repo. The homepage symptom picker
 * kept its destinations in an onClick and emitted no crawlable route out of the
 * primary entry point on the site until it was rebuilt to render them.
 */
export function SidebarLinkGroup({
  links,
  visible = SIDEBAR_VISIBLE,
}: {
  links: SidebarLink[];
  visible?: number;
}) {
  const shown = links.slice(0, visible);
  const rest = links.slice(visible);

  return (
    <>
      {shown.map((link) => (
        <Link key={link.key} href={link.href} className="text-foreground/70 block hover:underline">
          {link.label}
        </Link>
      ))}

      {rest.length > 0 && (
        <details className="group">
          <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer list-none text-xs">
            <span className="group-open:hidden">{rest.length} more &rarr;</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <div className="mt-1 space-y-1">
            {rest.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-foreground/70 block hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
