import Link from "next/link";

import type { AtomLineage } from "@/lib/atom-lineage";

/**
 * "Lineage: Spolin" — the schools a concept cites, one line under its byline.
 *
 * The guide page carries the same line from `traditionsOf` (entry 271); this
 * is the concept page's, from `lineageOf` (entry 331), so a drill in a
 * school's set reaches the school without depending on whether its prose
 * names the founder. Several schools are joined by a middle dot rather than
 * prose, because the line is a label and not a sentence about influence.
 * Renders nothing where the concept cites no school, so the marker means
 * the edge exists.
 */
export function LineageLine({ lineage }: { lineage: AtomLineage[] }) {
  if (lineage.length === 0) return null;

  return (
    <p
      className="text-foreground/50 mt-2 text-xs"
      data-track="atom-lineage"
      data-atom-lineage="true"
      data-derived="true"
    >
      Lineage:{" "}
      {lineage.map(({ id, label, href }, i) => (
        <span key={id}>
          {i > 0 && " · "}
          <Link href={href} className="underline">
            {label}
          </Link>
        </span>
      ))}
    </p>
  );
}
