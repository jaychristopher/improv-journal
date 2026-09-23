"use client";

import { useEffect, useState } from "react";

import {
  type DrillJourneyState,
  formatJourneyRecency,
  getDrillJourneyState,
  markDrillPracticed,
} from "@/lib/journey";

interface DrillPracticedProps {
  drillId: string;
  /**
   * The lessons whose drill rows list this drill, from
   * `lessonsRecommendingDrill` in `@/lib/drill-lessons`. Each is marked
   * practised with the rep, as the lesson page's own button would.
   */
  lessonIds: string[];
}

/**
 * "I ran this" on a drill page.
 *
 * "Practised" was a counter on a lesson, set by a button under the lesson's
 * prose, and the 27 drill pages — the unit every practice recommendation
 * routes to — wrote nothing, so a reader who ran *Zip Zap Zop* from its own
 * page had done the thing the record calls practice on a page the record
 * could not see (tracker entry 333, 2026-09-22). One press counts a rep on
 * the drill and on each lesson in `lessonIds`; the line under the button
 * says "Ran 3 times, last yesterday" from the drill's own record.
 *
 * Nothing renders until the record is read after mount, so the static page
 * and a crawler see no button and a first press is never a hydration
 * mismatch. Storage is read and written inside a try: a browser that
 * refuses it gets the button and no count, not a broken page.
 */
export function DrillPracticed({ drillId, lessonIds }: DrillPracticedProps) {
  const [record, setRecord] = useState<DrillJourneyState | null | undefined>(undefined);

  useEffect(() => {
    // Deferred, as the other journey readers do: the lint forbids a
    // synchronous setState in an effect, and the read must wait for the
    // browser anyway.
    queueMicrotask(() => {
      try {
        setRecord(getDrillJourneyState(drillId));
      } catch {
        setRecord(null);
      }
    });
  }, [drillId]);

  if (record === undefined) return null;

  const count = record?.timesPracticed ?? 0;
  const status =
    record && count > 0
      ? `Ran ${count} time${count === 1 ? "" : "s"}, last ${formatJourneyRecency(record.lastPracticedAt)}.`
      : null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3" data-drill-practiced={count}>
      <button
        type="button"
        onClick={() => {
          try {
            markDrillPracticed(drillId, lessonIds);
            setRecord(getDrillJourneyState(drillId));
          } catch {
            // The press still happened; the count is the part we could not keep.
          }
        }}
        className={[
          "rounded-full border px-3 py-1.5 text-sm transition-colors",
          count > 0
            ? "border-foreground bg-foreground text-background"
            : "border-foreground/10 bg-surface hover:border-foreground/30",
        ].join(" ")}
      >
        I ran this
      </button>
      {status && <span className="text-foreground/50 text-xs">{status}</span>}
    </div>
  );
}
