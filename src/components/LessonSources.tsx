import Link from "next/link";

import { LESSON_SOURCES_CAP, type LessonSource } from "@/lib/lesson-sources";

interface LessonSourcesProps {
  sources: LessonSource[];
}

/**
 * "Sources behind this lesson": the library works reached through the
 * lesson's composed atoms. See `lessonSources` for why this exists. Renders
 * nothing for a lesson whose atoms cite no work, rather than an empty heading.
 */
export function LessonSources({ sources }: LessonSourcesProps) {
  if (sources.length === 0) return null;

  const shown = sources.slice(0, LESSON_SOURCES_CAP);
  const more = sources.length - shown.length;

  // No `data-derived` of its own: it renders inside the lesson panel, which
  // carries the marker for the fold (tracker entry 310).
  return (
    <nav
      className="border-foreground/10 mt-8 border-t pt-8"
      aria-labelledby="lesson-sources"
      data-track="lesson-sources"
    >
      <h2
        id="lesson-sources"
        className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase"
      >
        Sources behind this lesson
      </h2>
      <ul className="space-y-2">
        {shown.map((source) => (
          <li key={source.id}>
            <Link href={source.url} className="text-sm hover:underline">
              {source.title}
            </Link>
          </li>
        ))}
      </ul>
      {more > 0 && (
        <p className="text-foreground/50 mt-3 text-xs">
          and{" "}
          <Link href="/library" className="underline">
            {more} more
          </Link>
        </p>
      )}
    </nav>
  );
}
