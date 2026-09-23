"use client";

import { useEffect } from "react";

import { markConceptVisited } from "@/lib/journey";

import { lessonIdFromReferrer } from "./LessonLineLift";

interface ConceptVisitProps {
  atomId: string;
  /** Every lesson composing the atom, the primary first — `getThreadsForAtom`'s order. */
  lessonIds: string[];
}

/**
 * Records a concept page's visit in the journey under one of its lessons.
 *
 * The record was written by the lesson page alone, so a reader walking a
 * lesson concept by concept — the chain the foot cards offer (entry 326) —
 * arrived at the next lesson with the syllabus still at 0 (tracker entry 333,
 * 2026-09-22). The lesson credited is the one the reader came from when the
 * referrer is a lesson page among `lessonIds`, the same read as the foot
 * card's lift; otherwise the primary, the first id, which is the lesson the
 * page's own context banner names. A concept in no lesson records nothing.
 *
 * Renders nothing and holds no state: the write is the whole job, and an
 * effect that only writes is one the lint's setState rule has no view on.
 * Every browser access is in a try: `document.referrer` throws in some
 * sandboxed contexts and local storage in private ones, and the record is
 * worth nothing next to the page.
 */
export function ConceptVisit({ atomId, lessonIds }: ConceptVisitProps) {
  useEffect(() => {
    if (lessonIds.length === 0) return;
    try {
      const referred = lessonIdFromReferrer(document.referrer, window.location.origin);
      const lessonId = referred && lessonIds.includes(referred) ? referred : lessonIds[0];
      markConceptVisited(lessonId, atomId);
    } catch {
      // A record the browser will not let us keep is no worse than the record before it.
    }
  }, [atomId, lessonIds]);

  return null;
}
