import Link from "next/link";

import type { GuideConcept, GuideLesson } from "@/lib/guide-concepts";
import { NOT_DISCUSSED_LABEL } from "@/lib/named-concepts";

/**
 * The concept pages a guide is built on.
 *
 * Gives each guide an explicit route down into the principles and techniques
 * it rests on, completing a link graph that previously only pointed upward
 * from atom to guide.
 *
 * The "Taught in depth" line is the guide's hand-off to the curriculum: the
 * lessons composing the most of the same atoms. Before it, 8 of 78 guides
 * linked any lesson and 18 of 25 lessons had no guide pointing at them
 * (tracker entry 145). Each lesson says what the two pages share in words —
 * "works through Active Listening and Offers", the lesson's `note` — so a
 * hand-off whose overlap is entirely declared reads as empty (entry 298).
 *
 * Under the cards, a guide whose declared `subject` names an entity the site
 * has no concept for says so. 22 guides declare a subject and 19 of them name
 * a thing no atom titles — Small talk, Body language, Improv (tracker entry
 * 340, 2026-09-22) — so the page tells a knowledge graph what it is about and
 * cannot say which of the ideas below it that is. The subject is the page's
 * declared topic and the concepts are what it is built from; the 2
 * disagreeing is information the page should carry rather than hide.
 *
 * Each concept card says whether the guide's words name the idea. The
 * declaration is written by subject and the body argues about half of it —
 * 256 of 455 entry atoms across the guides (tracker entry 294) — and the
 * block used to present both halves alike. A concept the body never utters
 * carries `data-named="false"` and NOT_DISCUSSED_LABEL, so a reader sees
 * which ideas the page argued and which it merely lists. The lesson page's
 * "Composed from" list makes the same mark with the same words.
 */
export function GuideConcepts({
  concepts,
  drills = [],
  lessons = [],
  subjectGap = null,
  walked = [],
}: {
  concepts: GuideConcept[];
  drills?: GuideConcept[];
  lessons?: GuideLesson[];
  /**
   * The name of a declared `subject` no concept of this site carries
   * (`getGuideSubjectGap` in lib/guide-concepts.ts), or null. 19 of the 22
   * guides that declare one name a thing no atom titles (tracker entry 340).
   */
  subjectGap?: string | null;
  /**
   * Drills the guide walks through section by section without declaring
   * (`walkedDrills` in lib/headed-concepts.ts): derived from the headings,
   * so `entry_atoms` keeps its narrow meaning, and empty below 2 headed
   * drills so the row is a marker that discriminates, 6 of 78 guides
   * (tracker entries 323, 324).
   */
  walked?: { id: string; title: string; url: string }[];
}) {
  if (concepts.length === 0 && drills.length === 0 && lessons.length === 0 && walked.length === 0) {
    return null;
  }

  return (
    <nav aria-labelledby="guide-concepts-heading" data-track="guide-concepts" data-derived="true">
      <h2
        id="guide-concepts-heading"
        className="text-foreground/40 mb-3 text-sm font-semibold tracking-wider uppercase"
      >
        The ideas behind this guide
      </h2>
      <ul className="space-y-2">
        {concepts.map((concept) => (
          <li key={concept.id} data-named={concept.named ? "true" : "false"}>
            <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-3 transition-colors">
              <Link
                href={concept.url}
                className="block text-sm font-medium after:absolute after:inset-0"
              >
                {concept.title}
                {!concept.named && (
                  <span className="text-foreground/40 ml-1.5 text-xs font-normal">
                    {NOT_DISCUSSED_LABEL}
                  </span>
                )}
              </Link>
              <span className="text-foreground/60 mt-1 block text-xs">{concept.description}</span>
            </div>
          </li>
        ))}
      </ul>
      {subjectGap && (
        <p className="text-foreground/60 mt-4 text-sm" data-subject-gap>
          This page&rsquo;s declared subject, <em>{subjectGap}</em>, is not one of the concepts
          above.
        </p>
      )}
      {walked.length > 0 && (
        <p className="text-foreground/60 mt-4 text-sm" data-guide-walked>
          Drills walked through:{" "}
          {walked.map((drill, i) => (
            <span key={drill.id}>
              {i > 0 && ", "}
              <Link href={drill.url} className="text-foreground font-medium hover:underline">
                {drill.title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {lessons.length > 0 && (
        <p className="text-foreground/60 mt-4 text-sm" data-guide-lessons>
          Taught in depth:{" "}
          {lessons.map((lesson, i) => (
            <span key={lesson.id}>
              {i > 0 && "; "}
              <Link href={lesson.href} className="text-foreground font-medium hover:underline">
                {lesson.title}
              </Link>{" "}
              ({lesson.shared} shared ideas
              {lesson.note && <span data-hand-off-note>; {lesson.note}</span>})
            </span>
          ))}
        </p>
      )}
      {drills.length > 0 && (
        <>
          <h3
            id="guide-drills-heading"
            className="text-foreground/40 mt-6 mb-3 text-sm font-semibold tracking-wider uppercase"
          >
            Practise it
          </h3>
          <ul className="space-y-2" aria-labelledby="guide-drills-heading">
            {drills.map((drill) => (
              <li key={drill.id}>
                <div className="border-foreground/10 bg-surface hover:border-foreground/30 relative rounded-lg border p-3 transition-colors">
                  <Link
                    href={drill.url}
                    className="block text-sm font-medium after:absolute after:inset-0"
                  >
                    {drill.title}
                  </Link>
                  <span className="text-foreground/60 mt-1 block text-xs">{drill.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  );
}
