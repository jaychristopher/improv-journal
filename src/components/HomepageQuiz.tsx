"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const router = useRouter();
  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);
  const selectedSymptom = useMemo(
    () => symptoms.find((symptom) => symptom.id === selectedSymptomId) ?? null,
    [selectedSymptomId, symptoms],
  );

  useEffect(() => {
    trackEvent("symptom_quiz_viewed", { symptom_count: symptoms.length });
  }, [symptoms.length]);

  function selectSymptom(symptomId: string) {
    trackEvent("symptom_selected", { symptom: symptomId });
    setSelectedSymptomId(symptomId);
  }

  function openRecommendation(
    symptomId: string,
    targetType: "program" | "guide" | "thread",
    href: string,
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

    router.push(href);
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

        {selectedSymptom && (
          <div className="border-foreground/10 bg-foreground/[0.03] mt-6 rounded-xl border p-6">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">
              Recommended route
            </span>
            <h3 className="mt-1 text-xl font-semibold">{selectedSymptom.label}</h3>
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">
              {selectedSymptom.diagnosis}
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={() =>
                  openRecommendation(
                    selectedSymptom.id,
                    "program",
                    selectedSymptom.program.href,
                    selectedSymptom.program.pathId,
                    selectedSymptom.program.pathId,
                  )
                }
                className="bg-foreground text-background hover:bg-foreground/90 inline-flex cursor-pointer items-center justify-between rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors"
              >
                <span>Start the beginner program: {selectedSymptom.program.title}</span>
                <span>&rarr;</span>
              </button>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() =>
                    openRecommendation(
                      selectedSymptom.id,
                      "guide",
                      selectedSymptom.guide.href,
                      selectedSymptom.guide.slug,
                    )
                  }
                  className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 text-left transition-colors"
                >
                  <span className="text-foreground/40 text-xs tracking-wider uppercase">
                    Read this guide
                  </span>
                  <span className="mt-1 block text-sm font-semibold">
                    {selectedSymptom.guide.title}
                  </span>
                </button>

                <button
                  onClick={() =>
                    openRecommendation(
                      selectedSymptom.id,
                      "thread",
                      selectedSymptom.thread.href,
                      selectedSymptom.thread.id,
                      selectedSymptom.program.pathId,
                    )
                  }
                  className="border-foreground/10 bg-surface hover:border-foreground/30 rounded-lg border p-4 text-left transition-colors"
                >
                  <span className="text-foreground/40 text-xs tracking-wider uppercase">
                    Jump to the lesson
                  </span>
                  <span className="mt-1 block text-sm font-semibold">
                    {selectedSymptom.thread.title}
                  </span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedSymptomId(null)}
              className="text-foreground/30 hover:text-foreground/50 mt-4 cursor-pointer text-sm"
            >
              Choose a different problem
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
