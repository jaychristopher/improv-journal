import Link from "next/link";
import type { ReactNode } from "react";

interface LessonPracticeLink {
  id: string;
  href: string;
  title: string;
}

interface LessonFrameProps {
  lessonGoal?: string;
  keyTakeaway?: string;
  commonMistake?: string;
  practicePrompt?: string;
  practiceLinks?: LessonPracticeLink[];
  reflectionPrompt?: string;
  pathTitle?: string;
  pathHref?: string;
  listenContent?: ReactNode;
  children: ReactNode;
}

export function LessonFrame({
  lessonGoal,
  keyTakeaway,
  commonMistake,
  practicePrompt,
  practiceLinks = [],
  reflectionPrompt,
  pathTitle,
  pathHref,
  listenContent,
  children,
}: LessonFrameProps) {
  const hasIntro = Boolean(pathTitle || lessonGoal || keyTakeaway);
  const hasListen = Boolean(listenContent);
  const hasOutro = Boolean(
    commonMistake || practicePrompt || reflectionPrompt || practiceLinks.length,
  );

  return (
    <>
      {hasIntro && (
        <details
          open
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
            {lessonGoal && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  What you&apos;ll learn
                </h2>
                <p className="text-foreground/70 mt-2 text-sm leading-relaxed">{lessonGoal}</p>
              </section>
            )}
            {keyTakeaway && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Key takeaway
                </h2>
                <p className="text-foreground/70 mt-2 text-sm leading-relaxed">{keyTakeaway}</p>
              </section>
            )}
          </div>
        </details>
      )}

      {hasListen && (
        <section className="border-foreground/10 bg-foreground/[0.03] mb-8 rounded-xl border p-6">
          <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
            Listen
          </h2>
          <div className="mt-3">{listenContent}</div>
        </section>
      )}

      {children}

      {hasOutro && (
        <section className="border-foreground/10 bg-foreground/[0.03] mt-10 rounded-xl border p-6">
          <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
            Practice and reflect
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {practicePrompt && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Solo rep
                </h2>
                <p className="text-foreground/70 mt-2 text-sm leading-relaxed">{practicePrompt}</p>
              </section>
            )}
            {practiceLinks.length > 0 && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  With others
                </h2>
                <div className="mt-2 space-y-2">
                  {practiceLinks.map((practiceLink) => (
                    <Link
                      key={practiceLink.id}
                      href={practiceLink.href}
                      className="border-foreground/10 bg-surface hover:border-foreground/30 block rounded-lg border p-3 text-sm transition-colors"
                    >
                      {practiceLink.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {commonMistake && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Watch for this
                </h2>
                <p className="text-foreground/70 mt-2 text-sm leading-relaxed">{commonMistake}</p>
              </section>
            )}
            {reflectionPrompt && (
              <section>
                <h2 className="text-foreground/40 text-xs font-semibold tracking-wider uppercase">
                  Reflect
                </h2>
                <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
                  {reflectionPrompt}
                </p>
              </section>
            )}
          </div>
        </section>
      )}
    </>
  );
}
