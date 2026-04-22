"use client";

import { useEffect, useState } from "react";

import {
  trackLearningConfidenceSet,
  trackLearningLessonCompleted,
  trackLearningLessonSaved,
  trackLearningPracticeLogged,
  trackLearningReviewCompleted,
  trackLearningReviewScheduled,
} from "@/lib/analytics";
import type { ConfidenceLevel } from "@/lib/journey";
import {
  formatJourneyDueDate,
  formatJourneyRecency,
  getJourneyState,
  getThreadJourneyState,
  isThreadQueuedForReview,
  markThreadPracticed,
  markThreadReviewed,
  scheduleThreadReview,
  setThreadCompleted,
  setThreadConfidence,
  toggleThreadSaved,
} from "@/lib/journey";

interface LessonCheckpointProps {
  threadId: string;
}

interface LessonCheckpointState {
  completed: boolean;
  saved: boolean;
  confidence?: ConfidenceLevel;
  lastVisitedAt?: string;
  lastPracticedAt?: string;
  lastReviewedAt?: string;
  practicedCount: number;
  reviewedCount: number;
  reviewQueued: boolean;
  reviewDueAt?: string;
}

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: "low", label: "Still shaky" },
  { value: "medium", label: "Getting there" },
  { value: "high", label: "Solid" },
];

function getButtonClasses(active: boolean): string {
  return [
    "rounded-full border px-3 py-1.5 text-sm transition-colors",
    active
      ? "border-foreground bg-foreground text-background"
      : "border-foreground/10 bg-surface hover:border-foreground/30",
  ].join(" ");
}

function readCheckpointState(threadId: string): LessonCheckpointState {
  const threadState = getThreadJourneyState(threadId);

  return {
    completed: Boolean(threadState?.completedAt),
    saved: Boolean(threadState?.savedAt),
    confidence: threadState?.confidence,
    lastVisitedAt: threadState?.lastVisitedAt,
    lastPracticedAt: threadState?.lastPracticedAt,
    lastReviewedAt: threadState?.lastReviewedAt,
    practicedCount: threadState?.timesPracticed ?? 0,
    reviewedCount: threadState?.timesReviewed ?? 0,
    reviewQueued: isThreadQueuedForReview(threadId),
    reviewDueAt: threadState?.reviewDueAt,
  };
}

function getTrackingContext(threadId: string) {
  return {
    pathId: getJourneyState()?.pathId,
    threadId,
    surface: "lesson_checkpoint" as const,
  };
}

export function LessonCheckpoint({ threadId }: LessonCheckpointProps) {
  const [state, setState] = useState<LessonCheckpointState | null>(null);

  useEffect(() => {
    queueMicrotask(() => setState(readCheckpointState(threadId)));
  }, [threadId]);

  if (!state) return null;

  const statusNotes = [
    state.practicedCount > 0
      ? `Practiced ${state.practicedCount} time${state.practicedCount === 1 ? "" : "s"}${state.lastPracticedAt ? `, last rep ${formatJourneyRecency(state.lastPracticedAt)}` : ""}.`
      : null,
    state.reviewQueued && state.reviewDueAt
      ? `Scheduled to review ${formatJourneyDueDate(state.reviewDueAt)}.`
      : null,
    state.reviewedCount > 0
      ? `Reviewed ${state.reviewedCount} time${state.reviewedCount === 1 ? "" : "s"}${state.lastReviewedAt ? `, last review ${formatJourneyRecency(state.lastReviewedAt)}` : ""}.`
      : null,
  ].filter(Boolean);

  return (
    <section className="border-foreground/10 bg-surface mt-10 rounded-xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lock this in</h2>
          <p className="text-foreground/50 mt-1 text-sm">
            Log a practice rep, queue tomorrow&apos;s review, and keep the lesson moving toward
            automatic.
          </p>
        </div>
        {state.lastVisitedAt && (
          <span className="text-foreground/40 text-xs">
            Last visited {formatJourneyRecency(state.lastVisitedAt)}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => {
            const saved = toggleThreadSaved(threadId);
            trackLearningLessonSaved({
              ...getTrackingContext(threadId),
              saved,
            });
            setState((current) => (current ? { ...current, saved } : current));
          }}
          className={getButtonClasses(state.saved)}
        >
          {state.saved ? "Saved" : "Save lesson"}
        </button>
        <button
          onClick={() => {
            markThreadPracticed(threadId);
            const nextState = readCheckpointState(threadId);
            trackLearningPracticeLogged({
              ...getTrackingContext(threadId),
              practiceCount: nextState.practicedCount,
            });
            setState(nextState);
          }}
          className={getButtonClasses(state.practicedCount > 0)}
        >
          Practiced today
        </button>
        {state.reviewQueued ? (
          <button
            onClick={() => {
              markThreadReviewed(threadId);
              const nextState = readCheckpointState(threadId);
              trackLearningReviewCompleted({
                ...getTrackingContext(threadId),
                reviewCount: nextState.reviewedCount,
              });
              setState(nextState);
            }}
            className={getButtonClasses(state.reviewedCount > 0)}
          >
            Mark reviewed
          </button>
        ) : (
          <button
            onClick={() => {
              scheduleThreadReview(threadId);
              const nextState = readCheckpointState(threadId);
              trackLearningReviewScheduled({
                ...getTrackingContext(threadId),
                reviewCount: nextState.reviewedCount,
                reviewDueDays: 1,
                trigger: "manual",
              });
              setState(nextState);
            }}
            className={getButtonClasses(false)}
          >
            Review tomorrow
          </button>
        )}
        <button
          onClick={() => {
            const completed = !state.completed;
            setThreadCompleted(threadId, completed);
            const nextState = readCheckpointState(threadId);
            trackLearningLessonCompleted({
              ...getTrackingContext(threadId),
              completed,
              reviewQueued: nextState.reviewQueued,
            });
            if (completed && nextState.reviewQueued && !state.reviewQueued) {
              trackLearningReviewScheduled({
                ...getTrackingContext(threadId),
                reviewCount: nextState.reviewedCount,
                reviewDueDays: 1,
                trigger: "completion",
              });
            }
            setState(nextState);
          }}
          className={getButtonClasses(state.completed)}
        >
          {state.completed ? "Completed" : "Mark complete"}
        </button>
      </div>

      {statusNotes.length > 0 && (
        <div className="text-foreground/50 mt-4 space-y-1 text-sm">
          {statusNotes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      )}

      <div className="mt-5">
        <p className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
          Confidence
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setThreadConfidence(threadId, option.value);
                trackLearningConfidenceSet({
                  ...getTrackingContext(threadId),
                  confidence: option.value,
                });
                setState((current) =>
                  current ? { ...current, confidence: option.value } : current,
                );
              }}
              className={getButtonClasses(state.confidence === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
