import Link from "next/link";

import type { LessonCrosslink as CrosslinkLine } from "@/lib/lesson-crosslinks";

/**
 * The 1 sentence a lesson says about the lesson before it.
 *
 * lesson → lesson prose links are 0 across the 25 lessons, 0 of 600 ordered
 * pairs, and the only thing joining them is furniture — the prev/next nav,
 * the progress bar, the program map (tracker entry 339, 2026-09-22). Those
 * say a lesson comes after another; none says what it owes it. This does:
 * the predecessor on the home path, and the concept it taught that this
 * lesson's atoms need next.
 *
 * Placed above the article, under the byline, because it is orientation
 * rather than a further reading — the reader meets it before the prose it
 * describes, and the derived blocks that follow the prose are already a
 * median 12 per lesson (entry 306).
 *
 * `data-lesson-crosslink` is what the built-HTML guard finds it by, and
 * `data-derived="true"` is the provenance marker every computed block
 * carries (entry 310): it draws the one "computed" caption from the
 * stylesheet, because the line stands outside any caption region.
 *
 * The sentence lives here and not in the route file because
 * hub-prose-links.test.ts holds a ceiling on the prose a route file carries,
 * and because the author's replacement for it is a sentence in the lesson
 * body — at which point this component is the thing to delete.
 */
export function LessonCrosslink({ crosslink }: { crosslink: CrosslinkLine | null }) {
  if (!crosslink) return null;
  const { lessonTitle, lessonHref, concepts } = crosslink;
  return (
    <p
      className="text-foreground/60 mt-4 text-sm"
      data-track="lesson-crosslink"
      data-lesson-crosslink="true"
      data-derived="true"
    >
      <Link href={lessonHref} className="hover:underline">
        <em>{lessonTitle}</em>
      </Link>{" "}
      taught{" "}
      {concepts.map((concept, i) => (
        <span key={concept.id}>
          {i > 0 && " and "}
          <Link href={concept.href} className="underline">
            {concept.title}
          </Link>
        </span>
      ))}
      , which this lesson builds on.
    </p>
  );
}
