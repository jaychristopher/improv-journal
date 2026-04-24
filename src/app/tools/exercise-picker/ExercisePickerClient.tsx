"use client";

import Link from "next/link";
import { useState } from "react";

import { trackEvent } from "@/lib/analytics";

interface Exercise {
  id: string;
  title: string;
  tags: string[];
  href: string;
  description: string;
}

interface ExercisePickerClientProps {
  exercises: Exercise[];
  /** Pre-set the level filter and hide the level selector */
  defaultLevel?: Level;
}

type Level = "beginner" | "intermediate" | "advanced" | null;
type Focus =
  | "presence"
  | "ensemble"
  | "emotion"
  | "physicality"
  | "courage"
  | "recovery"
  | "listening"
  | null;

const LEVEL_OPTIONS: { value: Level; label: string; desc: string }[] = [
  { value: "beginner", label: "Beginner", desc: "New to improv or warming up a new group" },
  { value: "intermediate", label: "Intermediate", desc: "Knows the basics, ready for more" },
  { value: "advanced", label: "Advanced", desc: "Experienced performers or deep practice" },
];

const FOCUS_OPTIONS: { value: NonNullable<Focus>; label: string; desc: string }[] = [
  {
    value: "presence",
    label: "Presence & Listening",
    desc: "Attention, focus, being in the moment",
  },
  { value: "ensemble", label: "Ensemble & Group Mind", desc: "Working together, shared awareness" },
  { value: "emotion", label: "Emotion & Honesty", desc: "Vulnerability, authenticity, feeling" },
  { value: "courage", label: "Courage & Commitment", desc: "Bold choices, taking risks" },
  {
    value: "physicality",
    label: "Physicality & Space",
    desc: "Body awareness, environment, movement",
  },
  {
    value: "recovery",
    label: "Recovery & Adaptation",
    desc: "Handling mistakes, staying flexible",
  },
];

// Tag mapping for exercises that don't have explicit focus tags
const EXERCISE_FOCUS_MAP: Record<string, string[]> = {
  mirroring: ["presence", "ensemble", "listening"],
  "last-word-response": ["presence", "listening"],
  "one-word-scene": ["presence", "courage"],
  "gift-giving": ["ensemble", "courage"],
  "blind-offer": ["courage", "presence"],
  "yes-and-chain": ["presence", "ensemble"],
  "emotional-honesty-scene": ["emotion"],
  "first-line-drill": ["courage"],
  "status-transfer": ["physicality", "ensemble"],
  "space-work-scene": ["physicality"],
  "group-mind-cultivation": ["ensemble"],
  "no-backspace-scene": ["courage", "recovery"],
  "fracture-repair-drill": ["recovery"],
  "directed-scene": ["ensemble", "listening"],
  "emotion-switch": ["emotion", "recovery"],
  "genre-scene": ["courage", "physicality"],
  "organic-opening-exercise": ["ensemble"],
};

function getExerciseFocusTags(exercise: Exercise): string[] {
  return EXERCISE_FOCUS_MAP[exercise.id] ?? [];
}

function matchesLevel(exercise: Exercise, level: Level): boolean {
  if (!level) return true;
  // "fundamentals" exercises match all levels
  if (exercise.tags.includes("fundamentals")) return true;
  return exercise.tags.includes(level);
}

function matchesFocus(exercise: Exercise, focus: Focus): boolean {
  if (!focus) return true;
  const focusTags = getExerciseFocusTags(exercise);
  return exercise.tags.includes(focus) || focusTags.includes(focus);
}

function scoreExercise(exercise: Exercise, level: Level, focus: Focus): number {
  let score = 0;
  if (level && exercise.tags.includes(level)) score += 2;
  if (level && exercise.tags.includes("fundamentals")) score += 1;
  if (focus) {
    const focusTags = getExerciseFocusTags(exercise);
    if (exercise.tags.includes(focus)) score += 2;
    if (focusTags.includes(focus)) score += 1;
  }
  return score;
}

export function ExercisePickerClient({ exercises, defaultLevel }: ExercisePickerClientProps) {
  const [level, setLevel] = useState<Level>(defaultLevel ?? null);
  const [focus, setFocus] = useState<Focus>(null);
  const [results, setResults] = useState<Exercise[] | null>(null);
  const hideLevel = defaultLevel !== undefined && defaultLevel !== null;

  function pickExercises() {
    let candidates = exercises.filter((e) => matchesLevel(e, level) && matchesFocus(e, focus));

    // If too few matches, relax focus filter
    if (candidates.length < 3 && focus) {
      candidates = exercises.filter((e) => matchesLevel(e, level));
    }

    // Score and sort
    candidates.sort((a, b) => scoreExercise(b, level, focus) - scoreExercise(a, level, focus));

    // Take top 3 (with some randomness if there are ties)
    const top = candidates.slice(0, 3);

    trackEvent("exercise_picker_used", {
      level: level ?? "any",
      focus: focus ?? "any",
      result_count: top.length,
    });

    setResults(top);
  }

  function reset() {
    setLevel(null);
    setFocus(null);
    setResults(null);
  }

  if (results) {
    return (
      <div>
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {results.length === 0 ? "No exercises match" : "Your exercises"}
          </h2>
          <button
            onClick={reset}
            className="text-foreground/40 hover:text-foreground/60 cursor-pointer text-sm"
          >
            Start over
          </button>
        </div>

        {results.length === 0 ? (
          <p className="text-foreground/50 text-sm">
            Try a different combination of level and focus.
          </p>
        ) : (
          <div className="space-y-4">
            {results.map((exercise, i) => (
              <Link
                key={exercise.id}
                href={exercise.href}
                className="border-foreground/10 bg-surface hover:border-foreground/30 group block rounded-xl border p-6 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-foreground/30 text-xs font-medium">{i + 1}</span>
                    <h3 className="mt-0.5 text-lg font-semibold group-hover:underline">
                      {exercise.title}
                    </h3>
                    <p className="text-foreground/50 mt-2 text-sm leading-relaxed">
                      {exercise.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {exercise.tags
                        .filter((t) => t !== "exercises")
                        .slice(0, 4)
                        .map((tag) => (
                          <span
                            key={tag}
                            className="bg-foreground/5 text-foreground/40 rounded-full px-2 py-0.5 text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  </div>
                  <span className="text-foreground/30 shrink-0 pt-1 transition-transform group-hover:translate-x-0.5">
                    &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="text-foreground/30 mt-8 text-xs">
          Click any exercise for full instructions, variations, and the principles behind it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Step 1: Level (hidden when pre-set by variant page) */}
      {!hideLevel && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">What level is the group?</h2>
          <p className="text-foreground/40 mb-4 text-sm">
            Pick the experience level of most participants.
          </p>
          <div className="space-y-2">
            {LEVEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setLevel(option.value)}
                className={`block w-full cursor-pointer rounded-lg border p-4 text-left transition-colors ${
                  level === option.value
                    ? "border-foreground/30 bg-foreground/5"
                    : "border-foreground/10 bg-surface hover:border-foreground/20"
                }`}
              >
                <span className="font-medium">{option.label}</span>
                <span className="text-foreground/50 ml-2 text-sm">{option.desc}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Focus */}
      <section>
        <h2 className="mb-1 text-lg font-semibold">What do you want to work on?</h2>
        <p className="text-foreground/40 mb-4 text-sm">Optional — leave blank for a general mix.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {FOCUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setFocus(focus === option.value ? null : option.value)}
              className={`cursor-pointer rounded-lg border p-4 text-left transition-colors ${
                focus === option.value
                  ? "border-foreground/30 bg-foreground/5"
                  : "border-foreground/10 bg-surface hover:border-foreground/20"
              }`}
            >
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-foreground/50 mt-0.5 block text-xs">{option.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Pick button */}
      <button
        onClick={pickExercises}
        className="bg-foreground text-background hover:bg-foreground/90 cursor-pointer rounded-lg px-6 py-3 text-sm font-semibold transition-colors"
      >
        Find exercises
      </button>
    </div>
  );
}
