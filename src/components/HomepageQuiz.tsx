"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { setCurrentPath } from "@/lib/journey";

interface SymptomRecommendation {
  id: string;
  label: string;
  description: string;
  diagnosis: string;
  program: {
    pathId: string;
    title: string;
    href: string;
  };
  guide: {
    slug: string;
    title: string;
    href: string;
  };
  thread: {
    id: string;
    title: string;
    href: string;
  };
}

interface HomepageQuizProps {
  symptoms: SymptomRecommendation[];
}

export function HomepageQuiz({ symptoms }: HomepageQuizProps) {
  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);

  useEffect(() => {
    trackEvent("symptom_quiz_viewed", { symptom_count: symptoms.length });
  }, [symptoms.length]);

  function selectSymptom(symptomId: string) {
    trackEvent("symptom_selected", { symptom: symptomId });
    setSelectedSymptomId(symptomId);
  }

  /**
   * Records the click. Navigation belongs to the anchor now — it used to be a
   * router.push out of a button, which meant the destination existed only in a
   * handler and never in the markup.
   */
  function trackRecommendation(
    symptomId: string,
    targetType: "program" | "guide" | "thread",
    targetId: string,
    pathId?: string,
  ) {
    trackEvent("symptom_route_clicked", {
      symptom: symptomId,
      target_type: targetType,
      target: targetId,
    });

    if (pathId) {
      setCurrentPath(pathId);
    }
  }

  return (
    <section className="mb-16">
      <div className="animate-fade-in">
        <span className="text-foreground/40 text-xs tracking-wider uppercase">
          Start from the problem
        </span>
        <h2 className="mt-1 text-2xl font-semibold">What keeps breaking right now?</h2>
        <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
          Pick the closest symptom. You&apos;ll get one beginner program, one guide, and one lesson
          to start with.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {symptoms.map((symptom) => (
            <button
              key={symptom.id}
              onClick={() => selectSymptom(symptom.id)}
              className={[
                "group block w-full cursor-pointer rounded-lg border p-5 text-left transition-colors",
                selectedSymptomId === symptom.id
                  ? "border-foreground/30 bg-foreground/[0.03]"
                  : "border-foreground/10 bg-surface hover:border-foreground/30",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold">{symptom.label}</span>
                  <span className="text-foreground/50 mt-0.5 block text-sm">
                    {symptom.description}
                  </span>
                </div>
                <span className="text-foreground/30 shrink-0 transition-transform group-hover:translate-x-1">
                  &rarr;
                </span>
              </div>
            </button>
          ))}
        </div>

        {/*
          Every recommendation renders, and the ones not chosen are hidden
          rather than left out. Previously only the selected panel existed, and
          nothing is selected until somebody clicks, so the server html carried
          no route out of this section at all — five guides, five programs and
          five lessons reachable only by running the page. This is the primary
          entry point on the highest-authority page on the site.
        */}
        {symptoms.map((symptom) => (
          <div
            key={symptom.id}
            // The attribute carries the meaning for assistive tech; the class
            // does the hiding, rather than relying on the UA stylesheet.
            hidden={selectedSymptomId !== symptom.id}
            className={[
              "border-foreground/10 bg-foreground/[0.03] mt-6 rounded-xl border p-6",
              selectedSymptomId === symptom.id ? "" : "hidden",
            ].join(" ")}
          >
            <span className="text-foreground/40 text-xs tracking-wider uppercase">
              Recommended route
            </span>
            <h3 className="mt-1 text-xl font-semibold">{symptom.label}</h3>
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">{symptom.diagnosis}</p>

            <div className="mt-5 flex flex-col gap-3">
              <Link
                href={symptom.program.href}
                onClick={() =>
                  trackRecommendation(
                    symptom.id,
                    "program",
                    symptom.program.pathId,
                    symptom.program.pathId,
                  )
                }
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors"
              >
                <span>Start the beginner program: {symptom.program.title}</span>
                <span>&rarr;</span>
              </Link>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href={symptom.guide.href}
                  onClick={() => trackRecommendation(symptom.id, "guide", symptom.guide.slug)}
                  className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 text-left transition-colors"
                >
                  <span className="text-foreground/40 text-xs tracking-wider uppercase">
                    Read this guide
                  </span>
                  <span className="mt-1 block text-sm font-semibold">{symptom.guide.title}</span>
                </Link>

                <Link
                  href={symptom.thread.href}
                  onClick={() =>
                    trackRecommendation(
                      symptom.id,
                      "thread",
                      symptom.thread.id,
                      symptom.program.pathId,
                    )
                  }
                  className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 text-left transition-colors"
                >
                  <span className="text-foreground/40 text-xs tracking-wider uppercase">
                    Jump to the lesson
                  </span>
                  <span className="mt-1 block text-sm font-semibold">{symptom.thread.title}</span>
                </Link>
              </div>
            </div>

            <button
              onClick={() => setSelectedSymptomId(null)}
              className="text-foreground/30 hover:text-foreground/50 mt-4 cursor-pointer text-sm"
            >
              Choose a different problem
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
