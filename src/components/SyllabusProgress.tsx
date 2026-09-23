"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  trackLearningPathStarted,
  trackLearningRecommendationClicked,
  trackLearningRecommendationShown,
} from "@/lib/analytics";
import {
  completedLessons,
  conceptsVisitedFor,
  formatJourneyDueDate,
  getJourneyRecommendation,
  getJourneyState,
  getThreadJourneyState,
  isThreadVisited,
  type PathLessonPrerequisites,
  setCurrentPath,
} from "@/lib/journey";

interface SyllabusProgressProps {
  pathId: string;
  threadIds: string[];
  /**
   * Lesson → the lessons on this path that teach what it requires: one
   * path's slice of `getLessonPrerequisites()` from
   * `@/lib/journey-prerequisites`. Optional; without it a shaky lesson is
   * recommended again rather than the lesson it builds on.
   */
  prerequisites?: PathLessonPrerequisites;
  /**
   * Lesson → its title and how many concepts it composes, from
   * `lessonConceptCounts` in `@/lib/drill-lessons`. With it, "3 of 12
   * concepts read" is listed beside the lesson once the concept pages have
   * written to the record, and a lesson whose every concept is read counts
   * as visited for the count (`isThreadVisited`); without it the concept
   * pages' visits are invisible here, as they were before entry 333.
   */
  concepts?: Record<string, { title: string; concepts: number }>;
}

/** One lesson's "N of M concepts read", listed only when N is at least 1. */
interface ConceptsReadLine {
  id: string;
  title: string;
  read: number;
  total: number;
}

interface RecommendationState {
  kind: "continue" | "review" | "practice";
  threadId: string;
  current: number;
  total: number;
  reason: string;
}

export function SyllabusProgress({
  pathId,
  threadIds,
  prerequisites,
  concepts,
}: SyllabusProgressProps) {
  const [recommendation, setRecommendation] = useState<RecommendationState | null>(null);
  const [visitedCount, setVisitedCount] = useState(0);
  const [conceptsRead, setConceptsRead] = useState<ConceptsReadLine[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const nextRecommendation = getJourneyRecommendation(threadIds, prerequisites);
    const count = threadIds.filter((id) => isThreadVisited(id, concepts?.[id]?.concepts)).length;
    // Concept visits are credited to a lesson by the concept page, and a
    // lesson's total is content the record does not hold; only a lesson
    // with both a total and a visit gets a line.
    const read = threadIds.flatMap((id) => {
      const lesson = concepts?.[id];
      const visited = conceptsVisitedFor(id).length;
      if (!lesson || lesson.concepts <= 0 || visited === 0) return [];
      return [
        {
          id,
          title: lesson.title,
          read: Math.min(visited, lesson.concepts),
          total: lesson.concepts,
        },
      ];
    });

    if (nextRecommendation) {
      trackLearningRecommendationShown({
        pathId,
        threadId: nextRecommendation.threadId,
        recommendationKind: nextRecommendation.kind,
        surface: "syllabus_progress",
        threadPosition: nextRecommendation.current,
        threadTotal: nextRecommendation.total,
      });
    }

    queueMicrotask(() => {
      setRecommendation(nextRecommendation);
      setVisitedCount(count);
      setConceptsRead(read);
      setMounted(true);
    });
  }, [pathId, threadIds, prerequisites, concepts]);

  if (!mounted) return null;

  if (!recommendation) {
    return (
      <div className="mb-8">
        <span className="text-foreground/40 text-sm">
          You&apos;ve visited all {threadIds.length} threads in this path.
        </span>
      </div>
    );
  }

  const isStarted = visitedCount > 0;
  const ctaLabel =
    recommendation.kind === "continue"
      ? isStarted
        ? `Continue - Thread ${recommendation.current} of ${recommendation.total}`
        : "Start this path"
      : recommendation.kind === "practice"
        ? `Practice - Thread ${recommendation.current} of ${recommendation.total}`
        : `Review - Thread ${recommendation.current} of ${recommendation.total}`;

  const threadState = getThreadJourneyState(recommendation.threadId);
  const reviewNote =
    recommendation.kind === "review" && threadState?.reviewDueAt
      ? ` Scheduled for ${formatJourneyDueDate(threadState.reviewDueAt)}.`
      : "";

  return (
    <div className="mb-8">
      <Link
        href={`/threads/${recommendation.threadId}`}
        onClick={() => {
          trackLearningRecommendationClicked({
            pathId,
            threadId: recommendation.threadId,
            recommendationKind: recommendation.kind,
            surface: "syllabus_progress",
            threadPosition: recommendation.current,
            threadTotal: recommendation.total,
          });
          if (!isStarted) {
            trackLearningPathStarted({
              pathId,
              surface: "syllabus_progress",
              threadTotal: threadIds.length,
            });
          }
          setCurrentPath(pathId);
        }}
        className="bg-foreground text-background hover:bg-foreground/90 inline-block rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
      >
        {ctaLabel}
      </Link>
      <p className="text-foreground/40 mt-2 text-sm">
        {recommendation.reason}
        {threadState?.confidence === "low"
          ? " Use the lesson practice block before moving on."
          : ""}
        {reviewNote}
      </p>
      {conceptsRead.length > 0 && (
        <ul
          data-track="syllabus-concepts-read"
          className="text-foreground/40 mt-2 space-y-0.5 text-xs"
        >
          {conceptsRead.map((line) => (
            <li key={line.id} data-lesson-id={line.id}>
              <Link href={`/threads/${line.id}`} className="hover:underline">
                {line.title}
              </Link>
              : {line.read} of {line.total} concept{line.total === 1 ? "" : "s"} read
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * `conceptCount`, the lesson's number of concepts, lets a lesson read
 * concept by concept without its page opened earn the tick, as it earns the
 * count above (`isThreadVisited`); the syllabus mount does not pass it yet.
 */
export function SyllabusCheckmark({
  threadId,
  conceptCount,
}: {
  threadId: string;
  conceptCount?: number;
}) {
  const [visited, setVisited] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setVisited(isThreadVisited(threadId, conceptCount)));
  }, [threadId, conceptCount]);

  if (!visited) return null;

  return <span className="text-foreground/30 text-xs">&#10003;</span>;
}

interface PathReadCountProps {
  /** The path's lessons in order, each with its measured reading time. */
  lessons: { id: string; minutes: number }[];
}

/**
 * "2 of these you have read · about 20 min left", beside the header's static
 * "4 lessons · 41 min to read", once the journey record says so.
 *
 * The record is keyed by lesson id, so a lesson completed on Improv for
 * Everyday Life counts here on Systems of Improv, which shares two of its
 * four; following "next path" from Foundations to The Art of Ensemble is 24
 * lesson slots for 19 lessons, and the header promised every slot as new
 * (tracker entry 295, 2026-09-22). Renders nothing until mounted and nothing
 * for a reader with no completed lesson on this path, so the server text is
 * the whole line for the first visit and for crawlers.
 */
export function PathReadCount({ lessons }: PathReadCountProps) {
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    const ids = lessons.map((lesson) => lesson.id);
    queueMicrotask(() => setDone(completedLessons(getJourneyState(), ids)));
  }, [lessons]);

  if (done.length === 0) return null;

  const left = lessons
    .filter((lesson) => !done.includes(lesson.id))
    .reduce((sum, lesson) => sum + lesson.minutes, 0);
  const read =
    done.length === lessons.length
      ? `all ${done.length} of these you have read`
      : `${done.length} of these you have read`;
  const remaining = left > 0 ? ` · about ${left} min left` : " · nothing left to read";

  return (
    <span data-track="path-read-count" className="text-foreground/30 text-xs">
      &middot; {read}
      {remaining}
    </span>
  );
}

/**
 * "(2 of its 4 lessons you have read)" after the next-path card's reason,
 * when the record shows lessons of the next path already completed here or
 * on any earlier path. The card is otherwise the server's; this adds a
 * bracket to its description once the record is read, and nothing before.
 */
export function NextPathReadNote({ threadIds }: { threadIds: string[] }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setCount(completedLessons(getJourneyState(), threadIds).length));
  }, [threadIds]);

  if (count === 0) return null;

  return (
    <span data-track="next-path-read-note">
      {" "}
      ({count} of its {threadIds.length} lesson{threadIds.length === 1 ? "" : "s"} you have read)
    </span>
  );
}
