"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  formatJourneyDueDate,
  getJourneyRecommendation,
  getThreadJourneyState,
  isThreadVisited,
  setCurrentPath,
} from "@/lib/journey";

interface SyllabusProgressProps {
  pathId: string;
  threadIds: string[];
}

interface RecommendationState {
  kind: "continue" | "review" | "practice";
  threadId: string;
  current: number;
  total: number;
  reason: string;
}

export function SyllabusProgress({ pathId, threadIds }: SyllabusProgressProps) {
  const [recommendation, setRecommendation] = useState<RecommendationState | null>(null);
  const [visitedCount, setVisitedCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const nextRecommendation = getJourneyRecommendation(threadIds);
    const count = threadIds.filter((id) => isThreadVisited(id)).length;

    queueMicrotask(() => {
      setRecommendation(nextRecommendation);
      setVisitedCount(count);
      setMounted(true);
    });
  }, [pathId, threadIds]);

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
          if (!isStarted) {
            trackEvent("path_started", { path: pathId, source: "syllabus" });
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
    </div>
  );
}

export function SyllabusCheckmark({ threadId }: { threadId: string }) {
  const [visited, setVisited] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setVisited(isThreadVisited(threadId)));
  }, [threadId]);

  if (!visited) return null;

  return <span className="text-foreground/30 text-xs">&#10003;</span>;
}
