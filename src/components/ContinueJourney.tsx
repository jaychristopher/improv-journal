"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect, useState } from "react";

import { clearJourney, getJourneyState, getNextUnvisitedThread } from "@/lib/journey";

interface PathInfo {
  title: string;
  threads: string[];
}

interface ContinueJourneyProps {
  paths: Record<string, PathInfo>;
}

export function ContinueJourney({ paths }: ContinueJourneyProps) {
  const [state, setState] = useState<{
    pathTitle: string;
    pathId: string;
    nextThreadId: string;
    current: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    const journey = getJourneyState();
    if (!journey) return;

    const pathInfo = paths[journey.pathId];
    if (!pathInfo) return;

    const nextThread = getNextUnvisitedThread(pathInfo.threads);
    if (!nextThread) return; // all done

    const visitedCount = pathInfo.threads.filter((t) => journey.visitedThreads.includes(t)).length;

    track("continue_shown", {
      path: journey.pathId,
      threads_visited: visitedCount,
      total_threads: pathInfo.threads.length,
    });

    queueMicrotask(() =>
      setState({
        pathTitle: pathInfo.title,
        pathId: journey.pathId,
        nextThreadId: nextThread,
        current: visitedCount + 1,
        total: pathInfo.threads.length,
      }),
    );
  }, [paths]);

  if (!state) return null;

  return (
    <section className="mb-8">
      <Link
        href={`/threads/${state.nextThreadId}`}
        onClick={() =>
          track("continue_clicked", { path: state.pathId, thread: state.nextThreadId })
        }
        className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-lg border p-5 transition-colors"
      >
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          Continue your journey
        </span>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <span className="font-semibold">{state.pathTitle}</span>
            <span className="text-foreground/40 ml-2 text-sm">
              Thread {state.current} of {state.total}
            </span>
          </div>
          <span className="text-foreground/30 transition-transform group-hover:translate-x-1">
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
