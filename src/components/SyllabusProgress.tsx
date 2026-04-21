"use client";

import { track } from "@vercel/analytics";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getNextUnvisitedThread, isThreadVisited, setCurrentPath } from "@/lib/journey";

interface SyllabusProgressProps {
  pathId: string;
  threadIds: string[];
}

export function SyllabusProgress({ pathId, threadIds }: SyllabusProgressProps) {
  const [nextThread, setNextThread] = useState<string | null>(null);
  const [visitedCount, setVisitedCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const next = getNextUnvisitedThread(threadIds);
    const count = threadIds.filter((id) => isThreadVisited(id)).length;
    queueMicrotask(() => {
      setNextThread(next);
      setVisitedCount(count);
      setMounted(true);
    });
  }, [pathId, threadIds]);

  if (!mounted) return null;

  const allDone = !nextThread;
  const isStarted = visitedCount > 0;

  return (
    <div className="mb-8">
      {!allDone && nextThread && (
        <Link
          href={`/threads/${nextThread}`}
          onClick={() => {
            if (!isStarted) {
              track("path_started", { path: pathId, source: "syllabus" });
            }
            setCurrentPath(pathId);
          }}
          className="bg-foreground text-background hover:bg-foreground/90 inline-block rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
        >
          {isStarted
            ? `Continue — Thread ${visitedCount + 1} of ${threadIds.length}`
            : "Start this path"}
        </Link>
      )}
      {allDone && (
        <span className="text-foreground/40 text-sm">
          ✓ You&apos;ve visited all {threadIds.length} threads in this path
        </span>
      )}
    </div>
  );
}

export function SyllabusCheckmark({ threadId }: { threadId: string }) {
  const [visited, setVisited] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setVisited(isThreadVisited(threadId)));
  }, [threadId]);

  if (!visited) return null;

  return <span className="text-foreground/30 text-xs">✓</span>;
}
