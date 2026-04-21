"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect, useState } from "react";

import { isThreadVisited, markThreadVisited } from "@/lib/journey";

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
    // Mark current thread as visited
    markThreadVisited(threads[currentThreadIndex]?.id ?? "");

    // Read all visited state
    const v = new Set<string>();
    for (const t of threads) {
      if (isThreadVisited(t.id)) v.add(t.id);
    }
    queueMicrotask(() => setVisited(v));

    track("thread_viewed", {
      thread: threads[currentThreadIndex]?.id ?? "",
      path: pathId,
      position: currentThreadIndex + 1,
      total: threads.length,
    });

    // Check for path completion (all threads visited after marking current)
    if (v.size === threads.length) {
      track("path_completed", { path: pathId, threads_count: threads.length });
    }
  }, [threads, currentThreadIndex, pathId]);

  return (
    <div className="mb-8">
      {/* Compact bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full cursor-pointer items-center gap-3 text-left"
      >
        <div className="flex-1">
          <div className="text-foreground/40 text-xs">
            <span className="font-medium">{pathTitle}</span>
            <span>
              {" "}
              · {currentThreadIndex + 1} of {threads.length}
            </span>
          </div>
          {/* Segmented progress bar */}
          <div className="mt-1.5 flex gap-1">
            {threads.map((t, i) => (
              <div
                key={t.id}
                className={[
                  "h-1 flex-1 rounded-full",
                  i === currentThreadIndex
                    ? "bg-foreground/40"
                    : visited.has(t.id)
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

      {/* Expanded outline */}
      {expanded && (
        <div className="border-foreground/10 mt-3 rounded-lg border p-4">
          <ol className="space-y-2">
            {threads.map((t, i) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                {/* Checkmark or number */}
                {visited.has(t.id) ? (
                  <span className="text-foreground/30 w-5 text-center text-xs">✓</span>
                ) : (
                  <span className="text-foreground/20 w-5 text-center text-xs">{i + 1}</span>
                )}
                {i === currentThreadIndex ? (
                  <span className="font-medium">{t.title}</span>
                ) : (
                  <Link
                    href={`/threads/${t.id}`}
                    className="text-foreground/50 hover:text-foreground/80 hover:underline"
                  >
                    {t.title}
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
