"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { trackEvent } from "@/lib/analytics";
import type { LessonLine } from "@/lib/whats-next";

import { LessonLineLift } from "./LessonLineLift";

/**
 * Five variants, each constructed by a page: the atom page makes `next-atom`,
 * `back-to-thread` and `related-concepts` (src/lib/whats-next.ts), the path
 * page `path-complete`, the guide page `bridge-primary-cta`. Two more —
 * `next-thread` and `bridge-funnel` — were defined in April and produced by
 * nothing after the August router changes; their render and label code was
 * maintained for a month with no page to show them (tracker entry 250,
 * 2026-09-21). whats-next-coverage.test.ts counts the members.
 */
type WhatsNextVariant =
  | {
      variant: "path-complete";
      nextPathTitle: string;
      nextPathHref: string;
      /**
       * Why this path is next: the audience delta, from path-progression —
       * and, as a node, the client note that says how many of its lessons
       * the reader has already done (tracker entry 295).
       */
      description?: ReactNode;
    }
  /**
   * The atom router's 2 lesson cards. `title`/`href` and `threadTitle`/
   * `threadHref` are the primary lesson's step and make the anchor; `lessons`
   * is a line per lesson the concept sits in, the primary first, so a reader
   * who came from a different lesson finds that lesson's next below the
   * anchor rather than being switched (tracker entry 326).
   */
  | {
      variant: "next-atom";
      title: string;
      href: string;
      lessons: LessonLine[];
    }
  | {
      variant: "back-to-thread";
      threadTitle: string;
      threadHref: string;
      lessons: LessonLine[];
    }
  | {
      variant: "bridge-primary-cta";
      label: string;
      title: string;
      href: string;
      description?: string;
      eventTarget: string;
      /**
       * True when the card's target was chosen by the fallback chain — the
       * drill the closer names, then the entry path — rather than declared
       * as `primary_cta_target`. A declared card is the author's one
       * hand-placed link at the foot of the guide (tracker entry 310) and
       * carries no provenance marker; a computed one does.
       */
      derived?: boolean;
    }
  /**
   * The default the others lacked. Each of them is computed from a
   * thread, a path or a guide, so an atom in none of those — 68 pages, all
   * 32 references and 36 concepts including most of the games — ended with
   * no proposal at all. This one lists the atom's neighbours by the
   * direction of the relation — what this page unlocks first, its
   * prerequisites last — and, within a direction, biased toward pages that
   * do sit in a lesson so the reader can rejoin a path from there. The hint
   * beside each title is the relation's own label from relation-labels.ts
   * ("Unlocks", "Required by", "Extends", "Drills that show this"), the
   * same word the sidebar uses for the same edge, so it says which way the
   * step goes. See src/lib/whats-next.ts for the ranking.
   */
  | {
      variant: "related-concepts";
      items: { id: string; title: string; href: string; hint?: string }[];
    };

const CARD_CLASS =
  "border-foreground/10 bg-surface hover:border-foreground/30 group mt-8 block rounded-lg border p-6 transition-colors";

const LABEL_CLASS = "text-foreground/40 text-xs tracking-wider uppercase";

/**
 * How many lesson lines the card shows open, the primary anchor counted. 1
 * concept sits in 5 lessons and 2 in 4; the rest of the 28 shared ones in 2
 * or 3. The lines past the cap fold under "and N more lessons" rather than
 * being dropped, so the static HTML keeps every lesson's chain whole.
 */
const LESSON_LINES_SHOWN = 3;

/**
 * A link inside the card beside the title anchor. The anchor's stretched
 * pseudo-element covers the card (entry 266), so these sit above it with
 * `relative`; a later positioned element paints over an earlier one.
 */
const LINE_LINK_CLASS = "text-foreground relative font-medium underline underline-offset-2";

/**
 * The step from the foot of a lesson into the next lesson on its path: the
 * lesson's name and its first concept, as a sentence for the primary card's
 * description or a clause on a secondary line.
 */
function onwardStep(onward: NonNullable<LessonLine["onward"]>): ReactNode {
  return (
    <>
      then{" "}
      <Link href={onward.href} className={LINE_LINK_CLASS}>
        {onward.title}
      </Link>{" "}
      in <em>{onward.lessonTitle}</em>
    </>
  );
}

/**
 * One secondary lesson line: where that lesson goes from this page. The
 * lesson's next concept, or — on its last — the lesson itself in the same
 * "Back to" copy the primary card uses, and the next lesson's opener when the
 * path knows one.
 */
function lessonStep(line: LessonLine): ReactNode {
  if (line.next) {
    return (
      <>
        Next in <em>{line.lessonTitle}</em>:{" "}
        <Link href={line.next.href} className={LINE_LINK_CLASS}>
          {line.next.title}
        </Link>
      </>
    );
  }
  return (
    <>
      Back to{" "}
      <Link href={line.lessonHref} className={LINE_LINK_CLASS}>
        {line.lessonTitle}
      </Link>
      {line.onward && <>; {onwardStep(line.onward)}</>}
    </>
  );
}

export function WhatsNext(props: WhatsNextVariant) {
  if (props.variant === "related-concepts") {
    return (
      <nav
        aria-label="Related concepts"
        data-track="related-concepts"
        data-derived="true"
        className={CARD_CLASS}
      >
        <span className={LABEL_CLASS}>Related concepts</span>
        <ul className="mt-1 space-y-3">
          {props.items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="group/item flex items-center justify-between gap-4">
                <span>
                  <span className="text-lg font-semibold">{item.title}</span>
                  {item.hint && (
                    <span className="text-foreground/40 ml-2 text-xs">{item.hint}</span>
                  )}
                </span>
                <span className="text-foreground/30 shrink-0 transition-transform group-hover/item:translate-x-1">
                  &rarr;
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  let label: string;
  let title: string;
  let href: string;
  let description: ReactNode | undefined;

  switch (props.variant) {
    case "path-complete":
      label = "Journey complete! Next";
      title = props.nextPathTitle;
      href = props.nextPathHref;
      description = props.description;
      break;
    case "next-atom":
      label = "Continue reading";
      title = props.title;
      href = props.href;
      // With other lessons' lines below, the anchor says which lesson it
      // continues; alone, the context banner above already names it.
      if (props.lessons.length > 1) {
        description = (
          <>
            Next in <em>{props.lessons[0].lessonTitle}</em>.
          </>
        );
      }
      break;
    case "back-to-thread":
      label = "Back to";
      title = props.threadTitle;
      href = props.threadHref;
      // The lesson's last concept: the path goes on, so the card does too.
      if (props.lessons[0]?.onward) {
        description = <>This lesson ends here; {onwardStep(props.lessons[0].onward)}.</>;
      }
      break;
    case "bridge-primary-cta":
      label = props.label;
      title = props.title;
      href = props.href;
      description = props.description;
      break;
  }

  // Each single-card router reports under its variant name to the delegated
  // `link_clicked` listener (tracker entry 259): `next-atom`, `back-to-thread`
  // and `path-complete` are the routers entries 60 and 247 argued about and
  // none was measured. The guide's primary CTA is the exception: it already
  // fires `bridge_cta_clicked` with the target and label, the event
  // docs/growth-strategy.md reports weekly, so it carries no `data-track` and
  // one click is one event rather than two.
  const block = props.variant === "bridge-primary-cta" ? undefined : props.variant;
  // Provenance (tracker entry 310): the three routers are computed from the
  // path, the thread or the graph, so the card carries `data-derived` and the
  // shared "computed" caption from globals.css; the guide CTA carries it only
  // when its target was not declared. The marker sits on the card, not on
  // the tracked anchor, so the caption is a line above the label rather than
  // a word inside the link text.
  const derived = props.variant === "bridge-primary-cta" ? props.derived === true : true;

  // The lessons past the primary, each with its own step (entry 326). The
  // list is its own tracked block inside the derived card, so a click on a
  // secondary line reports as such and the marker is inherited, not doubled.
  // LessonLineLift renders them — the server's order, then the referrer's
  // lesson first once mounted — with `data-lesson-id` on each line so the
  // lift and its test can find a lesson's line.
  const isLessonCard = props.variant === "next-atom" || props.variant === "back-to-thread";
  const secondaryLessons = isLessonCard ? props.lessons.slice(1) : [];

  // The card used to be one <a> whose text was the whole card — label, title
  // and description — so the guide CTA's anchor read "Do this drill Last Word
  // Response If your main issue is…", 104 anchors over twelve words on 98
  // guides, with the target's name buried in the middle (tracker entry 266,
  // 2026-09-22). The anchor is now the title alone; the label and description
  // sit beside it in the card, and a stretched pseudo-element on the anchor
  // keeps the whole card clickable. The click event and data-track stay on
  // the anchor, where the delegated listener finds them.
  return (
    <div className={`${CARD_CLASS} relative`} data-derived={derived ? "true" : undefined}>
      <span className={LABEL_CLASS}>{label}</span>
      <div className="mt-1 flex items-center justify-between gap-4">
        <div>
          <Link
            href={href}
            data-track={block}
            onClick={() => {
              if (props.variant === "bridge-primary-cta") {
                trackEvent("bridge_cta_clicked", {
                  bridge: window.location.pathname.replace(/^\//, ""),
                  target: props.eventTarget,
                  label: props.label,
                });
              }
            }}
            className="text-lg font-semibold after:absolute after:inset-0"
          >
            {title}
          </Link>
          {description && (
            <p className="text-foreground/60 mt-2 text-sm leading-relaxed">{description}</p>
          )}
          {secondaryLessons.length > 0 && (
            <div data-track="next-in-lesson">
              <LessonLineLift
                lines={secondaryLessons.map((line) => ({
                  lessonId: line.lessonId,
                  step: lessonStep(line),
                }))}
                // The anchor is 1 of the open lines, so the block shows 1 fewer.
                open={LESSON_LINES_SHOWN - 1}
              />
            </div>
          )}
        </div>
        <span className="text-foreground/30 shrink-0 transition-transform group-hover:translate-x-1">
          &rarr;
        </span>
      </div>
    </div>
  );
}
