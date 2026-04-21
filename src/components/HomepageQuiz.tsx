"use client";

import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { setCurrentPath } from "@/lib/journey";
import { getRecommendedPath } from "@/lib/path-recommendations";

interface PathConfig {
  title: string;
  firstThread: string;
}

interface QuizProps {
  paths: Record<string, PathConfig>;
}

interface QuizCard {
  label: string;
  desc: string;
  action: () => void;
}

export function HomepageQuiz({ paths }: QuizProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fadeKey, setFadeKey] = useState(0);
  const beginnerRecommendation = getRecommendedPath("beginner");
  const starterPath = paths[beginnerRecommendation.id];

  useEffect(() => {
    track("quiz_step_viewed", { step: 0 });
  }, []);

  function goToPath(pathId: string) {
    const p = paths[pathId];
    if (!p) return;
    track("path_started", { path: pathId, source: "quiz" });
    setCurrentPath(pathId);
    router.push(`/threads/${p.firstThread}`);
  }

  function goToStep(n: number) {
    track("quiz_step_viewed", { step: n });
    setFadeKey((k) => k + 1);
    setStep(n);
  }

  const steps: QuizCard[][] = [
    // Step 0: "What brings you here?"
    [
      {
        label: "I want to understand people better",
        desc: "How connection works — on stage and off.",
        action: () => goToStep(1),
      },
      {
        label: "I do improv and want to get better",
        desc: "Exercises, techniques, and the system underneath.",
        action: () => goToStep(2),
      },
      {
        label: "I teach or want to teach improv",
        desc: "Curriculum, feedback, and creating safety.",
        action: () => goToPath("teaching-improv"),
      },
    ],
    // Step 1: "Understand people" sub-choices
    [
      {
        label: "I want better conversations and relationships",
        desc: "Improv principles applied to everyday life — no stage required.",
        action: () => goToPath("improv-for-life"),
      },
      {
        label: "I want my team to work better together",
        desc: "Trust, collaboration, and group dynamics from improv ensembles.",
        action: () => goToPath("improv-for-teams"),
      },
      {
        label: "I have a specific problem right now",
        desc: "Overthinking, stage fright, feedback, conflict, and more.",
        action: () => router.push("/guides"),
      },
    ],
    // Step 2: "I do improv" sub-choices
    [
      {
        label: "Just starting out",
        desc: "The essentials every improviser needs first.",
        action: () => goToPath("beginner-foundations"),
      },
      {
        label: "I know the basics but I\u2019m stuck",
        desc: "Name what\u2019s going wrong and break through the plateau.",
        action: () => goToPath("self-coaching-toolkit"),
      },
      {
        label: "I want to push toward mastery",
        desc: "Advanced game, form, and ensemble.",
        action: () => goToStep(3),
      },
    ],
    // Step 3: Mastery sub-choices
    [
      {
        label: "Game & character",
        desc: "Beyond \u2018find the game\u2019 — how games evolve, invert, and break.",
        action: () => goToPath("advanced-game-and-character"),
      },
      {
        label: "Show craft & formats",
        desc: "Harold, montage, and how to shape a whole show.",
        action: () => goToPath("mastering-the-form"),
      },
      {
        label: "Ensemble & group mind",
        desc: "Backline mastery, performance state, and playing as one.",
        action: () => goToPath("the-art-of-ensemble"),
      },
    ],
  ];

  const currentCards = steps[step] ?? steps[0];
  const stepLabels = [
    "What brings you here?",
    "What are you looking for?",
    "Where are you in your journey?",
    "What do you want to focus on?",
  ];

  return (
    <section className="mb-16">
      <div key={fadeKey} className="animate-fade-in">
        <h2 className="mb-6 text-lg font-semibold">{stepLabels[step]}</h2>
        {step === 0 && starterPath && (
          <div className="border-foreground/10 bg-foreground/[0.03] mb-6 rounded-xl border p-5">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">
              {beginnerRecommendation.label}
            </span>
            <h3 className="mt-1 text-lg font-semibold">{starterPath.title}</h3>
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
              {beginnerRecommendation.rationale}
            </p>
            <button
              onClick={() => goToPath(beginnerRecommendation.id)}
              className="bg-foreground text-background hover:bg-foreground/90 mt-4 inline-flex cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            >
              Start here
            </button>
          </div>
        )}
        <div className="space-y-3">
          {currentCards.map((card) => (
            <button
              key={card.label}
              onClick={card.action}
              className="border-foreground/10 bg-surface hover:border-foreground/30 group block w-full cursor-pointer rounded-lg border p-5 text-left transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{card.label}</span>
                  <span className="text-foreground/50 mt-0.5 block text-sm">{card.desc}</span>
                </div>
                <span className="text-foreground/30 shrink-0 transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>
        {step > 0 && (
          <button
            onClick={() => goToStep(step === 3 ? 2 : 0)}
            className="text-foreground/30 hover:text-foreground/50 mt-4 cursor-pointer text-sm"
          >
            &larr; Back
          </button>
        )}
      </div>
    </section>
  );
}
