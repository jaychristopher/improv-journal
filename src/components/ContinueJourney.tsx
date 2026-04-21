"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  clearJourney,
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
}

export function ContinueJourney({ paths }: ContinueJourneyProps) {
  const [state, setState] = useState<ContinueJourneyState | null>(null);

  useEffect(() => {
    const journey = getJourneyState();
    if (!journey) return;

    const pathInfo = paths[journey.pathId];
    if (!pathInfo) return;

    const recommendation = getJourneyRecommendation(pathInfo.threads);
    if (!recommendation) return;

    const threadState = getThreadJourneyState(recommendation.threadId);

    trackEvent("continue_shown", {
      path: journey.pathId,
      thread: recommendation.threadId,
      recommendation: recommendation.kind,
      total_threads: pathInfo.threads.length,
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
      }),
    );
  }, [paths]);

  if (!state) return null;

  const label =
    state.kind === "continue"
      ? "Continue your journey"
      : state.kind === "practice"
        ? "Practice this next"
        : "Pick back up here";

  return (
    <section className="mb-8">
      <Link
        href={`/threads/${state.threadId}`}
        onClick={() =>
          trackEvent("continue_clicked", {
            path: state.pathId,
            thread: state.threadId,
            recommendation: state.kind,
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
