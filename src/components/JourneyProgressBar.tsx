"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { isThreadVisited, markThreadVisited, setCurrentPath } from "@/lib/journey";

interface ThreadInfo {
  id: string;
  title: string;
}

interface JourneyProgressBarProps {
  pathId: string;
  pathTitle: string;
  threads: ThreadInfo[];
  currentThreadIndex: number;
}

export function JourneyProgressBar({
  pathId,
  pathTitle,
  threads,
  currentThreadIndex,
}: JourneyProgressBarProps) {
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setCurrentPath(pathId);
    markThreadVisited(threads[currentThreadIndex]?.id ?? "");

    const nextVisited = new Set<string>();
    for (const thread of threads) {
      if (isThreadVisited(thread.id)) nextVisited.add(thread.id);
    }
    queueMicrotask(() => setVisited(nextVisited));

    trackEvent("thread_viewed", {
      thread: threads[currentThreadIndex]?.id ?? "",
      path: pathId,
      position: currentThreadIndex + 1,
      total: threads.length,
    });

    if (nextVisited.size === threads.length) {
      trackEvent("path_completed", { path: pathId, threads_count: threads.length });
    }
  }, [threads, currentThreadIndex, pathId]);

  return (
    <div className="mb-8">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-3 text-left"
      >
        <div className="flex-1">
          <div className="text-foreground/40 text-xs">
            <span className="font-medium">{pathTitle}</span>
            <span>
              {" "}
              &middot; {currentThreadIndex + 1} of {threads.length}
            </span>
          </div>
          <div className="mt-1.5 flex gap-1">
            {threads.map((thread, index) => (
              <div
                key={thread.id}
                className={[
                  "h-1 flex-1 rounded-full",
                  index === currentThreadIndex
                    ? "bg-foreground/40"
                    : visited.has(thread.id)
                      ? "bg-foreground/20"
                      : "bg-foreground/5",
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            ))}
          </div>
        </div>
        <svg
          className={`text-foreground/30 h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-foreground/10 mt-3 rounded-lg border p-4">
          <ol className="space-y-2">
            {threads.map((thread, index) => (
              <li key={thread.id} className="flex items-center gap-2 text-sm">
                {visited.has(thread.id) ? (
                  <span className="text-foreground/30 w-5 text-center text-xs">&#10003;</span>
                ) : (
                  <span className="text-foreground/20 w-5 text-center text-xs">{index + 1}</span>
                )}
                {index === currentThreadIndex ? (
                  <span className="font-medium">{thread.title}</span>
                ) : (
                  <Link
                    href={`/threads/${thread.id}`}
                    className="text-foreground/50 hover:text-foreground/80 hover:underline"
                  >
                    {thread.title}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          <Link
            href={`/paths/${pathId}`}
            className="text-foreground/40 hover:text-foreground/60 mt-3 block text-xs"
          >
            View full path &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
