"use client";

import { useEffect, useState } from "react";

import type { ConfidenceLevel } from "@/lib/journey";
import {
  formatJourneyRecency,
  getThreadJourneyState,
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

export function LessonCheckpoint({ threadId }: LessonCheckpointProps) {
  const [state, setState] = useState<LessonCheckpointState | null>(null);

  useEffect(() => {
    const threadState = getThreadJourneyState(threadId);
    queueMicrotask(() =>
      setState({
        completed: Boolean(threadState?.completedAt),
        saved: Boolean(threadState?.savedAt),
        confidence: threadState?.confidence,
        lastVisitedAt: threadState?.lastVisitedAt,
      }),
    );
  }, [threadId]);

  if (!state) return null;

  return (
    <section className="border-foreground/10 bg-surface mt-10 rounded-xl border p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Keep your place</h2>
          <p className="text-foreground/50 mt-1 text-sm">
            Save this lesson, mark it complete, and note how solid it feels.
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
          onClick={() =>
            setState((current) => {
              if (!current) return current;
              const saved = toggleThreadSaved(threadId);
              return { ...current, saved };
            })
          }
          className={getButtonClasses(state.saved)}
        >
          {state.saved ? "Saved" : "Save lesson"}
        </button>
        <button
          onClick={() =>
            setState((current) => {
              if (!current) return current;
              const completed = !current.completed;
              setThreadCompleted(threadId, completed);
              return { ...current, completed };
            })
          }
          className={getButtonClasses(state.completed)}
        >
          {state.completed ? "Completed" : "Mark complete"}
        </button>
      </div>

      <div className="mt-5">
        <p className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
          Confidence
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() =>
                setState((current) => {
                  if (!current) return current;
                  setThreadConfidence(threadId, option.value);
                  return { ...current, confidence: option.value };
                })
              }
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
