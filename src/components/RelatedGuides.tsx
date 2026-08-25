import Link from "next/link";

import type { RelatedGuide } from "@/lib/related-bridges";

/**
 * Sibling-guide links rendered at the foot of every bridge page.
 * Keeps the guide cluster interlinked so crawlers reach every guide
 * from any other guide in one hop.
 *
 * The link text is the guide's head keyword rather than its title. This block
 * is the largest source of internal anchor text on the site and it was
 * spending it on full headlines — /rules-of-improv's most common inbound
 * anchor was "the rules of improv (and why half of them are wrong)", sixteen
 * times over. related-bridges had computed the right keyword all along and the
 * interface said it was the label; nothing rendered it. The description
 * underneath still carries the enticement the headline was doing.
 */
export function RelatedGuides({ guides }: { guides: RelatedGuide[] }) {
  if (guides.length === 0) return null;

  return (
    <nav aria-labelledby="related-guides-heading">
      <h2
        id="related-guides-heading"
        className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase"
      >
        Related guides
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative h-full rounded-lg border p-3 transition-colors">
              <Link
                href={`/${guide.slug}`}
                className="block text-sm font-medium after:absolute after:inset-0"
              >
                {guide.label ?? guide.title}
              </Link>
              <span className="text-foreground/60 mt-1 block text-xs">{guide.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
