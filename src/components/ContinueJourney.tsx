"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";

import {
  trackLearningRecommendationClicked,
  trackLearningRecommendationShown,
} from "@/lib/analytics";
import {
  clearJourney,
  formatJourneyDueDate,
  formatJourneyRecency,
  getJourneyRecommendation,
  getJourneyState,
  getThreadJourneyState,
} from "@/lib/journey";

interface PathInfo {
  title: string;
  threads: string[];
}

interface ContinueJourneyProps {
  paths: Record<string, PathInfo>;
  /**
   * What to show when there is no journey yet — in practice the "Start here"
   * card, passed down from the server component so it is in the initial html.
   *
   * The two used to be stacked, and a returning reader mid-course met both: a
   * card telling them to start the seven-day program directly above a card
   * telling them to continue it. Occupying one slot makes them alternatives,
   * which is what they always were, and means the journey card replaces
   * something rather than pushing the page down when localStorage is read.
   */
  children?: ReactNode;
}

interface ContinueJourneyState {
  kind: "continue" | "review" | "practice";
  pathTitle: string;
  pathId: string;
  threadId: string;
  current: number;
  total: number;
  reason: string;
  recency?: string;
  reviewDueAt?: string;
  practiceCount?: number;
  reviewCount?: number;
}

export function ContinueJourney({ paths, children }: ContinueJourneyProps) {
  const [state, setState] = useState<ContinueJourneyState | null>(null);

  useEffect(() => {
    const journey = getJourneyState();
    if (!journey) return;

    const pathInfo = paths[journey.pathId];
    if (!pathInfo) return;

    const recommendation = getJourneyRecommendation(pathInfo.threads);
    if (!recommendation) return;

    const threadState = getThreadJourneyState(recommendation.threadId);

    trackLearningRecommendationShown({
      pathId: journey.pathId,
      threadId: recommendation.threadId,
      recommendationKind: recommendation.kind,
      surface: "continue_journey",
      threadPosition: recommendation.current,
      threadTotal: recommendation.total,
    });

    queueMicrotask(() =>
      setState({
        kind: recommendation.kind,
        pathTitle: pathInfo.title,
        pathId: journey.pathId,
        threadId: recommendation.threadId,
        current: recommendation.current,
        total: recommendation.total,
        reason: recommendation.reason,
        recency: threadState?.lastVisitedAt
          ? formatJourneyRecency(threadState.lastVisitedAt)
          : undefined,
        reviewDueAt: threadState?.reviewDueAt,
        practiceCount: threadState?.timesPracticed,
        reviewCount: threadState?.timesReviewed,
      }),
    );
  }, [paths]);

  // No journey, or none readable yet on first paint: the server-rendered card.
  if (!state) return <>{children}</>;

  const label =
    state.kind === "continue"
      ? "Today's next step"
      : state.kind === "practice"
        ? "Today's practice"
        : "Review due";
  const extraContext = [
    state.kind === "review" && state.reviewDueAt
      ? `Scheduled for ${formatJourneyDueDate(state.reviewDueAt)}.`
      : null,
    state.kind === "practice" && state.practiceCount
      ? `Practiced ${state.practiceCount} time${state.practiceCount === 1 ? "" : "s"} so far.`
      : null,
    state.kind === "review" && state.reviewCount
      ? `Reviewed ${state.reviewCount} time${state.reviewCount === 1 ? "" : "s"} already.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  // mt-8 rather than mb-8: this now occupies the slot the "Start here" card
  // sits in, inside the header, and the card it replaces carries mt-8. Matching
  // it keeps the swap from moving the block it sits under.
  return (
    <section className="mt-8">
      <Link
        href={`/threads/${state.threadId}`}
        onClick={() =>
          trackLearningRecommendationClicked({
            pathId: state.pathId,
            threadId: state.threadId,
            recommendationKind: state.kind,
            surface: "continue_journey",
            threadPosition: state.current,
            threadTotal: state.total,
          })
        }
        className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-lg border p-5 transition-colors"
      >
        <span className="text-foreground/40 text-xs tracking-wider uppercase">{label}</span>
        <div className="mt-1 flex items-center justify-between gap-4">
          <div>
            <div>
              <span className="font-semibold">{state.pathTitle}</span>
              <span className="text-foreground/40 ml-2 text-sm">
                Thread {state.current} of {state.total}
              </span>
            </div>
            <p className="text-foreground/50 mt-2 text-sm">
              {state.reason}
              {state.recency ? ` Last touched ${state.recency}.` : ""}
              {extraContext ? ` ${extraContext}` : ""}
            </p>
          </div>
          <span className="text-foreground/30 shrink-0 transition-transform group-hover:translate-x-1">
            &rarr;
          </span>
        </div>
      </Link>
      <button
        onClick={() => {
          clearJourney();
          setState(null);
        }}
        className="text-foreground/30 hover:text-foreground/50 mt-2 cursor-pointer text-xs"
      >
        Start over
      </button>
    </section>
  );
}
