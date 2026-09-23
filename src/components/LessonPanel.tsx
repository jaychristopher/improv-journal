import Link from "next/link";

import { LessonPanelToggle } from "@/components/LessonPanelToggle";
import { LessonSources } from "@/components/LessonSources";
import type { SharedConceptLesson } from "@/lib/lesson-crosslinks";
import type { LessonSource } from "@/lib/lesson-sources";
import { NOT_DISCUSSED_LABEL } from "@/lib/named-concepts";

/** The id the client toggle finds the fold by. */
export const LESSON_PANEL_ID = "about-this-lesson";

interface LessonPanelProps {
  /** The lesson's composed atoms in dependency order (`lessonAtomOrder`). */
  atoms: { id: string; title: string; url: string }[];
  /** The ids among `atoms` the lesson's own words name (`namedAtomIds`). */
  namedAtoms: Set<string>;
  /**
   * Atom id → the 1 other lesson that also teaches it
   * (`sharedConceptsFor`). 28 concepts sit in 2 or more lessons and nothing
   * on either lesson said so, which is the same overlap that breaks the
   * concept card's chain (tracker entries 326 and 339); the list is where
   * the concepts already are, so the mark goes here rather than in a block.
   */
  alsoTaughtIn: Map<string, SharedConceptLesson>;
  sources: LessonSource[];
  handingOff: { slug: string; href: string; title: string }[];
  /** Guides handing off here beyond the cap, folded into "and N more". */
  moreHandingOff: number;
}

/**
 * "About this lesson": the composed-from list, the sources block and the
 * guides that hand off here, in one native fold.
 *
 * A lesson page carried a median twelve tracked blocks around 481 words of
 * essay, one block per forty words against one per 311 on a guide, and three
 * of the twelve — composed-from, sources, hand-offs — are lists derived from
 * the same `atoms` declaration (tracker entry 306, 2026-09-22). They are what
 * the reader did not come for, so they fold together; the drills row, the
 * prev/next and the overview frame stay where they were.
 *
 * Open on the server, so every list is in the HTML a crawler reads and a
 * first visit sees it; LessonPanelToggle closes it for a viewer who closed
 * it before. Each inner block keeps its own `data-track` and markup: the
 * click listener takes the innermost wrapper, and lesson-order,
 * named-concepts, hand-off and lesson-sources tests read the blocks by name.
 * The provenance marker (`data-derived`, tracker entry 310) sits on the fold
 * alone: the inner blocks inherit it and carry no second "computed" caption.
 * The fold is also one of the page's caption regions (`data-derived-region`,
 * tracker entry 317), so a derived block mounted inside it later keeps its
 * own marker and draws no caption of its own.
 */
export function LessonPanel({
  atoms,
  namedAtoms,
  alsoTaughtIn,
  sources,
  handingOff,
  moreHandingOff,
}: LessonPanelProps) {
  return (
    <details
      open
      id={LESSON_PANEL_ID}
      data-track="lesson-panel"
      data-derived="true"
      data-derived-region="lesson-panel"
      className="group border-foreground/10 mt-12 border-t pt-8 [&>summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="text-foreground/40 text-sm font-semibold tracking-wider uppercase">
          About this lesson
        </span>
        <span className="text-foreground/30 text-xs">
          <span className="group-open:hidden">expand</span>
          <span className="hidden group-open:inline">collapse</span>
        </span>
      </summary>
      <LessonPanelToggle target={LESSON_PANEL_ID} />

      <nav className="mt-6" data-track="composed-from">
        <h2 className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase">
          Composed from
        </h2>
        <ul className="space-y-2">
          {atoms.map((atom) => (
            <li key={atom.id} data-named={namedAtoms.has(atom.id) ? "true" : "false"}>
              <Link href={atom.url} className="text-sm hover:underline">
                {atom.title}
              </Link>
              {!namedAtoms.has(atom.id) && (
                <span className="text-foreground/40 ml-1.5 text-xs">{NOT_DISCUSSED_LABEL}</span>
              )}
              {alsoTaughtIn.has(atom.id) && (
                <span className="text-foreground/40 ml-1.5 text-xs" data-also-taught-in="true">
                  also taught in{" "}
                  <Link href={alsoTaughtIn.get(atom.id)!.href} className="hover:underline">
                    <em>{alsoTaughtIn.get(atom.id)!.title}</em>
                  </Link>
                </span>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <LessonSources sources={sources} />

      {handingOff.length > 0 && (
        <nav
          className="border-foreground/10 mt-8 border-t pt-8"
          aria-labelledby="handing-off"
          data-track="handing-off"
        >
          <h2
            id="handing-off"
            className="text-foreground/40 mb-4 text-sm font-semibold tracking-wider uppercase"
          >
            Guides that hand off here
          </h2>
          <ul className="space-y-2">
            {handingOff.map((guide) => (
              <li key={guide.slug}>
                <Link href={guide.href} className="text-sm hover:underline">
                  {guide.title}
                </Link>
              </li>
            ))}
          </ul>
          {moreHandingOff > 0 && (
            <p className="text-foreground/50 mt-3 text-xs">
              and{" "}
              <Link href="/guides" className="underline">
                {moreHandingOff} more
              </Link>
            </p>
          )}
        </nav>
      )}
    </details>
  );
}
