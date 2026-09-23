import Link from "next/link";

import { type RelatedGuide, SHARED_DRILLS_SHOWN } from "@/lib/related-bridges";

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
 *
 * On a guide the site does not expect to rank — `serp_verdict: authority`,
 * kept for readers and not a ranking candidate — the rail is a hand-off
 * rather than a set of neighbours: related-bridges leads it with the siblings
 * that can rank (tracker entry 305), and the heading says so in words, so the
 * page reads as one that passes the reader on. Same block, same `data-track`,
 * so the analytics see one surface.
 *
 * A guide that walks through the same drills says so: "shares 11 drills"
 * under the description, the way the concept block says "trains X", so the
 * reader knows why this guide and not the cluster neighbour (tracker entry
 * 325). Only from SHARED_DRILLS_SHOWN, so the line is a marker and not
 * furniture: 46 of 418 slots carry it (2026-09-22).
 */
export function RelatedGuides({
  guides,
  handsOn = false,
}: {
  guides: RelatedGuide[];
  /** True on an authority guide: the rail is where the page sends the reader next. */
  handsOn?: boolean;
}) {
  if (guides.length === 0) return null;

  return (
    <nav aria-labelledby="related-guides-heading" data-track="related-guides" data-derived="true">
      <h2
        id="related-guides-heading"
        className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase"
      >
        {handsOn ? "Where to go from here" : "Related guides"}
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
              <span className="text-foreground/60 mt-1 line-clamp-2 block text-xs">
                {guide.description}
              </span>
              {(guide.sharedDrills ?? 0) >= SHARED_DRILLS_SHOWN && (
                <span className="text-foreground/40 mt-1 block text-xs" data-shared-drills>
                  shares {guide.sharedDrills} drills
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
