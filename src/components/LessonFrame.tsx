import Link from "next/link";
import type { ReactNode } from "react";

import { autolinkInline } from "@/lib/content";
import { DRILLS_LABEL, DRILLS_SHOW_LABEL } from "@/lib/relation-labels";

interface LessonPracticeLink {
  id: string;
  href: string;
  title: string;
  /**
   * Where the link came from — a drill the lesson composes, a neighbour, or
   * the exercise picker's level page when no drill at the reader's level is
   * reachable (`getPracticeRecommendationsForThread`). Rendered as
   * `data-source` so the built page says which, and looks the same either way.
   */
  source?: "direct" | "linked" | "level-page";
  /**
   * Why the drill is here: its Trains line names `concept` (`trains`), or it
   * only shares an edge with `concept`. Rendered as a note under the title,
   * "trains Be Honest" or "shows Base Reality", so a graph-chosen drill is
   * not presented as a purpose-chosen one (tracker entry 297).
   */
  purpose?: { trains: boolean; concept: string };
}

/**
 * The verb the note opens with, read off the sidebar's two drills labels
 * ("Drills that train this" → "trains") so the practice row and the concept
 * sidebar describe the same edge in the same word and relation-labels.ts
 * stays the one place the words are declared.
 */
function purposeVerb(trains: boolean): string {
  const label = trains ? DRILLS_LABEL : DRILLS_SHOW_LABEL;
  return `${label.replace(/^Drills that /, "").replace(/ this$/, "")}s`;
}

interface LessonFrameProps {
  lessonGoal?: string;
  keyTakeaway?: string;
  commonMistake?: string;
  practicePrompt?: string;
  practiceReps?: string;
  successSignal?: string;
  transferPrompt?: string;
  practiceLinks?: LessonPracticeLink[];
  reflectionPrompt?: string;
  pathTitle?: string;
  pathHref?: string;
  /** The page the frame sits on, so a field never links back to it. */
  currentUrl?: string;
  listenContent?: ReactNode;
  children: ReactNode;
}

/**
 * The frame's prose fields go through the site's autolinker, the same one the
 * lesson body gets, and render as HTML.
 *
 * They were rendered as plain strings. So on Quieting the Planning Mind the
 * practice prompt "Run mirroring, a one-word scene, or a blind offer" linked
 * nothing, on a page whose sidebar linked all three exercises — the prose a
 * learner acts on was the one prose on the page outside the link pipeline.
 */
async function linkFields(
  fields: Record<string, string | undefined>,
  currentUrl: string | null,
): Promise<Record<string, string | undefined>> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = value ? await autolinkInline(value, currentUrl) : undefined;
  }
  return out;
}

function Prose({ html, className }: { html: string; className: string }) {
  return (
    <p
      className={`${className} [&_a]:underline [&_a]:underline-offset-2`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export async function LessonFrame({
  lessonGoal,
  keyTakeaway,
  commonMistake,
  practicePrompt,
  practiceReps,
  successSignal,
  transferPrompt,
  practiceLinks = [],
  reflectionPrompt,
  pathTitle,
  pathHref,
  currentUrl,
  listenContent,
  children,
}: LessonFrameProps) {
  const linked = await linkFields(
    {
      lessonGoal,
      keyTakeaway,
      commonMistake,
      practicePrompt,
      successSignal,
      transferPrompt,
      reflectionPrompt,
    },
    currentUrl ?? null,
  );

  const hasIntro = Boolean(pathTitle || lessonGoal || keyTakeaway);
  const hasListen = Boolean(listenContent);
  const hasOutro = Boolean(
    commonMistake ||
    practicePrompt ||
    practiceReps ||
    successSignal ||
    transferPrompt ||
    reflectionPrompt ||
    practiceLinks.length,
  );

  return (
    <>
      {hasIntro && (
        <details
          open
          data-track="lesson-overview"
          className="border-foreground/10 bg-surface mb-8 rounded-xl border p-6 [&>summary]:cursor-pointer [&>summary]:list-none [&>summary::-webkit-details-marker]:hidden"
        >
          <summary className="flex items-center justify-between">
            <div>
              {pathTitle && pathHref ? (
                <p className="text-foreground/40 text-xs tracking-wider uppercase">
                  Part of{" "}
                  <Link
                    href={pathHref}
                    className="hover:text-foreground/60 underline-offset-2 hover:underline"
                  >
                    {pathTitle}
                  </Link>
                </p>
              ) : (
                <p className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Lesson overview
                </p>
              )}
            </div>
            <span className="text-foreground/30 text-xs">collapse</span>
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {linked.lessonGoal && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  What you&apos;ll learn
                </h2>
                <Prose
                  html={linked.lessonGoal}
                  className="text-foreground/70 mt-2 text-sm leading-relaxed"
                />
              </section>
            )}
            {linked.keyTakeaway && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Key takeaway
                </h2>
                <Prose
                  html={linked.keyTakeaway}
                  className="text-foreground/70 mt-2 text-sm leading-relaxed"
                />
              </section>
            )}
          </div>
        </details>
      )}

      {hasListen && (
        <section
          className="border-foreground/10 bg-foreground/[0.03] mb-8 rounded-xl border p-6"
          data-track="listen"
        >
          <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
            Listen
          </h2>
          <div className="mt-3">{listenContent}</div>
        </section>
      )}

      {children}

      {hasOutro && (
        <section
          className="border-foreground/10 bg-foreground/[0.03] mt-10 rounded-xl border p-6"
          data-track="lesson-reps"
        >
          <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
            Turn this into reps
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(practicePrompt || practiceReps) && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Do this now
                </h2>
                {linked.practicePrompt && (
                  <Prose
                    html={linked.practicePrompt}
                    className="text-foreground/70 mt-2 text-sm leading-relaxed"
                  />
                )}
                {practiceReps && (
                  <p className="text-foreground/50 mt-2 text-xs leading-relaxed">
                    Rep target: {practiceReps}
                  </p>
                )}
              </section>
            )}
            {linked.successSignal && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Know it worked when
                </h2>
                <Prose
                  html={linked.successSignal}
                  className="text-foreground/70 mt-2 text-sm leading-relaxed"
                />
              </section>
            )}
            {linked.commonMistake && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Watch for this
                </h2>
                <Prose
                  html={linked.commonMistake}
                  className="text-foreground/70 mt-2 text-sm leading-relaxed"
                />
              </section>
            )}
            {linked.transferPrompt && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Use this in life
                </h2>
                <Prose
                  html={linked.transferPrompt}
                  className="text-foreground/70 mt-2 text-sm leading-relaxed"
                />
              </section>
            )}
            {practiceLinks.length > 0 && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Practice with others
                </h2>
                <div className="mt-2 space-y-2">
                  {practiceLinks.map((practiceLink) => (
                    <Link
                      key={practiceLink.id}
                      href={practiceLink.href}
                      data-source={practiceLink.source}
                      className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 text-sm transition-colors"
                    >
                      {practiceLink.title}
                      {practiceLink.purpose && (
                        <span
                          className="text-foreground/50 mt-1 block text-xs"
                          data-purpose={practiceLink.purpose.trains ? "trains" : "shows"}
                        >
                          {purposeVerb(practiceLink.purpose.trains)} {practiceLink.purpose.concept}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {linked.reflectionPrompt && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Reflect
                </h2>
                <Prose
                  html={linked.reflectionPrompt}
                  className="text-foreground/70 mt-2 text-sm leading-relaxed"
                />
              </section>
            )}
          </div>
        </section>
      )}
    </>
  );
}
