import Link from "next/link";

import {
  FORMAT_DRILLS_LABEL,
  type FormatDrills as FormatDrillsList,
  preparesNote,
} from "@/lib/format-drills";

/**
 * "Drills that prepare for this" on a format page.
 *
 * The formats are a well-linked layer that points at techniques, definitions
 * and each other, and at almost nothing a reader could do: ten edges join an
 * exercise and a format in 2,435, so the Harold, with 24 formats pointing at
 * it, had no drill that builds toward it (tracker entry 283, 2026-09-22).
 * The list is derived from shared targets (format-drills.ts) — a drill
 * prepares for a format when the two point at the same concept — and each
 * link names the concept it comes through, so the reader knows why the drill
 * is offered.
 *
 * Same shape as the sidebar groups and the drill-pairs block on an exercise
 * page: heading, links with a note each, and the "and N more" note for what
 * the cap cut. Capped below SIDEBAR_VISIBLE, so it never folds. Renders
 * nothing when the list is empty.
 */
export function FormatDrills({ formatDrills }: { formatDrills: FormatDrillsList }) {
  if (formatDrills.drills.length === 0) return null;
  // No `data-derived` of its own: it renders inside the concept sidebar,
  // which carries the marker for the column (tracker entry 310).
  return (
    <div data-track="format-drills">
      <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
        {FORMAT_DRILLS_LABEL}
      </h2>
      <ul className="space-y-1">
        {formatDrills.drills.map((drill) => (
          <li key={drill.id}>
            <Link href={drill.url} className="text-foreground/70 block hover:underline">
              {drill.title}
            </Link>
            <span className="text-foreground/40 block text-xs">{preparesNote(drill)}</span>
          </li>
        ))}
      </ul>
      {formatDrills.omitted > 0 && (
        <p className="text-foreground/40 mt-1 text-xs">
          and {formatDrills.omitted} more not listed
        </p>
      )}
    </div>
  );
}
