"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { browserStorage, createSeenStore, type SeenStore } from "@/lib/prompt-generator";
import {
  PASSES_EACH,
  roomInfo,
  RULES,
  TOTAL,
  TWENTY_ONE_BANK,
  TWENTY_ONE_ROOMS,
  type TwentyOneQuestion,
  type TwentyOneRoom,
} from "@/lib/twenty-one-questions-bank";
import { deal, TOQ_SEEN_KEY } from "@/lib/twenty-one-questions-game";

import { HeroTakeover } from "./HeroTakeover";
import { ToolAction, ToolChoice } from "./ToolControls";
import { TwentyOneQuestionsMark } from "./TwentyOneQuestionsMark";

/**
 * The hero on /21-questions-game.
 *
 * The page's own argument is that the number is the mechanism: a fixed count
 * removes the polite exit and guarantees an ending, and the two rules that
 * matter are the two everybody drops. A reader holding a phone with somebody
 * opposite them does not want 181 questions under nine headings — they want
 * the next question, the count, and the rule said out loud.
 *
 * So the tool asks one thing and then runs the game: who is opposite you,
 * which decides which of the article's sets are in play, and then twenty-one
 * dealt light to deep with the count on every card. It tracks the one pass
 * each, it lets you note a question to come back to — the article's "no
 * follow-ups until the round is over" made a feature — and at twenty-one it
 * stops, because the ending is the point, and hands you the notes and the
 * drill the page says trains what the game rewards.
 *
 * Closed, it is a card with six buttons and it renders on the server, so the
 * html carries the way in. The dialog is client-only; nothing in it is a route.
 */

type Step = "who" | "play" | "done";
type Player = "you" | "them";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Where it is mounted. Only the guide today; the prop keeps a tool page cheap. */
type TwentyOneQuestionsSurface = "guide-hero" | "tool-page";

export function TwentyOneQuestions({
  surface,
  /** The concept the pass rule rests on, resolved by the server because a client component cannot read the graph. */
  safetyHref,
}: {
  surface: TwentyOneQuestionsSurface;
  safetyHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("who");
  const [room, setRoom] = useState<TwentyOneRoom | null>(null);
  const [position, setPosition] = useState(0);
  const [question, setQuestion] = useState<TwentyOneQuestion | null>(null);
  const [passes, setPasses] = useState<Record<Player, number>>({ you: 0, them: 0 });
  const [noted, setNoted] = useState<string[]>([]);
  const [excluded] = useState<Set<string>>(() => new Set());
  const [store] = useState<SeenStore>(() => createSeenStore(browserStorage(), TOQ_SEEN_KEY));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  const close = useCallback(() => {
    trackEvent("twenty_one_questions_closed", { surface, room, position, noted: noted.length });
    setOpen(false);
  }, [surface, room, position, noted.length]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      document.body.style.overflow = "";
      // After the re-render, or the inline card is still inert and refuses it.
      const opener = openerRef.current;
      openerRef.current = null;
      opener?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  /** Deal the question for a position and show it. */
  function dealAt(forRoom: TwentyOneRoom, at: number) {
    const next = deal(forRoom, store.seen(), at, excluded);
    if (next.wrapped) store.forget(store.seen());
    if (next.question) {
      // The sequence is the product and number 21 is a constant: neither
      // depends on the seen set, so neither is written to it.
      if (forRoom !== "sequence" && at < TOTAL) store.markSeen(next.question.id);
      trackEvent("twenty_one_questions_dealt", {
        surface,
        room: forRoom,
        position: at,
        question_id: next.question.id,
        category: next.question.category,
        remaining: next.remaining,
      });
    }
    setQuestion(next.question);
    setPosition(at);
    setStep("play");
  }

  function start(forRoom: TwentyOneRoom) {
    excluded.clear();
    setPasses({ you: 0, them: 0 });
    setNoted([]);
    dealAt(forRoom, 1);
  }

  function chooseRoom(next: TwentyOneRoom, event: React.MouseEvent<HTMLButtonElement>) {
    setRoom(next);
    if (!open) {
      openerRef.current = event.currentTarget;
      setOpen(true);
      trackEvent("twenty_one_questions_opened", { surface, room: next });
    }
    start(next);
  }

  function advance() {
    if (!room) return;
    if (position >= TOTAL) {
      trackEvent("twenty_one_questions_finished", {
        surface,
        room,
        passes: passes.you + passes.them,
        noted: noted.length,
      });
      setStep("done");
      return;
    }
    dealAt(room, position + 1);
  }

  /**
   * One pass each. In a pool room the passed question is replaced at the same
   * position, so the round still reaches twenty-one answered; in the sequence
   * room the sequence is the product, so a pass skips forward instead.
   */
  function pass(player: Player) {
    if (!room || !question || passes[player] >= PASSES_EACH) return;
    setPasses((p) => ({ ...p, [player]: p[player] + 1 }));
    trackEvent("twenty_one_questions_passed", { surface, room, position, player });
    if (room === "sequence") {
      advance();
      return;
    }
    excluded.add(question.id);
    dealAt(room, position);
  }

  function note() {
    if (!question) return;
    const text = question.text;
    setNoted((list) => (list.includes(text) ? list.filter((t) => t !== text) : [...list, text]));
    trackEvent("twenty_one_questions_noted", { surface, room, position });
  }

  const info = room ? roomInfo(room) : undefined;
  const isNoted = question ? noted.includes(question.text) : false;
  const passesLeft = (player: Player) => PASSES_EACH - passes[player];

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open}>
        <div
          data-track="twenty-one-questions"
          className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12"
        >
          <div>
            <TwentyOneQuestionsMark id={headingId} />
            <p className="text-hero-muted mt-5 max-w-lg text-base leading-relaxed sm:mt-6 lg:mt-7">
              Run the game. Say who is opposite you, and it deals twenty-one in order — light first,
              deep last — with the count on every card, one pass each, and a stop at the end. Never
              the same question twice on this device.
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {TWENTY_ONE_ROOMS.map((r) => (
                <ToolChoice
                  key={r.id}
                  palette="hero"
                  onClick={(event) => chooseRoom(r.id, event)}
                  className="p-3 sm:p-4"
                >
                  <span className="text-hero-foreground block text-sm font-semibold sm:text-base">
                    {r.label}
                  </span>
                  <span className="text-hero-muted mt-1 hidden text-xs leading-snug sm:block">
                    {r.note}
                  </span>
                </ToolChoice>
              ))}
            </div>
            <p className="text-hero-subtle mt-5 text-xs">
              {TWENTY_ONE_BANK.length + TOTAL} questions, every one of them on this page.
            </p>
          </div>
        </div>
      </HeroTakeover>

      {open && (
        <div
          className="bg-background/95 fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="21 questions"
          ref={dialogRef}
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-foreground-dim text-xs">
                {info?.label}
                {step === "play" ? ` · question ${position} of ${TOTAL}` : ""}
                {step === "done" ? ` · ${TOTAL} of ${TOTAL}` : ""}
              </p>
              <button
                type="button"
                onClick={close}
                className="text-foreground-dim hover:text-foreground shrink-0 text-sm underline underline-offset-4"
              >
                Close
              </button>
            </div>

            {step === "play" && question && (
              <div className="mt-6 flex flex-1 flex-col">
                {/* The two rules that matter, before the question and on
                    every card. The page: these are the ones everybody drops,
                    and dropping them ruins the game. */}
                <p className="text-foreground-dim text-xs">
                  {RULES.turns} {RULES.both}
                </p>

                {/* The count, filled to here. The number is the mechanism, so
                    it is on screen the whole time. */}
                <div
                  aria-hidden
                  className="mt-4 flex w-full items-center gap-1"
                  data-position={position}
                >
                  {Array.from({ length: TOTAL }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < position ? "bg-foreground-strong" : "bg-foreground/20"
                      }`}
                    />
                  ))}
                </div>

                <div
                  data-question
                  className="border-border-ui text-foreground-strong mt-4 rounded-xl border p-5 text-xl leading-snug sm:p-7 sm:text-2xl"
                >
                  {question.text}
                </div>

                {position === 1 && (
                  <p className="text-foreground-dim mt-4 text-sm">
                    Both of you answer this one. Whoever goes first sets the tone for the round.
                  </p>
                )}
                {position === 8 && (
                  <p className="text-foreground-dim mt-4 text-sm">
                    Middle of the round. Still no follow-ups — note the ones you want to come back
                    to.
                  </p>
                )}
                {position === 15 && (
                  <p className="text-foreground-dim mt-4 text-sm">
                    Back half. Answer these yourself before asking the next one.
                  </p>
                )}
                {position === TOTAL && (
                  <p className="text-foreground-dim mt-4 text-sm">
                    The last turn is theirs. This is the one people remember.
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <ToolAction onClick={advance} className="px-5 py-2.5 text-sm">
                    {position >= TOTAL ? "Finish" : "Next question"}
                  </ToolAction>
                  <ToolChoice
                    palette="page"
                    onClick={note}
                    selected={isNoted}
                    className="px-4 py-2.5 text-sm"
                  >
                    {isNoted ? "Noted — come back to this" : "Note this one"}
                  </ToolChoice>
                </div>

                {/* One pass each, and its use is itself informative. The
                    buttons say whose it is, so spending one is visible. */}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {(["you", "them"] as const).map((player) => (
                    <button
                      key={player}
                      type="button"
                      onClick={() => pass(player)}
                      disabled={passesLeft(player) <= 0}
                      data-pass={player}
                      className="text-foreground-dim hover:text-foreground text-sm underline underline-offset-4 disabled:no-underline disabled:opacity-70"
                    >
                      {passesLeft(player) > 0
                        ? `Pass — ${player === "you" ? "you" : "them"}`
                        : `${player === "you" ? "Your" : "Their"} pass is used`}
                    </button>
                  ))}
                </div>

                <p className="text-foreground-dim mt-6 text-xs leading-relaxed">
                  {RULES.pass} The exit is easy on purpose — that is how{" "}
                  <Link href={safetyHref} className="underline">
                    safety in the room
                  </Link>{" "}
                  gets built. {RULES.followUps}
                </p>
              </div>
            )}

            {step === "done" && (
              <div className="mt-8">
                <h3 className="text-foreground-strong text-xl font-semibold">
                  Twenty-one. Stop here.
                </h3>
                <p className="text-foreground/80 mt-2 text-sm">
                  The ending is a feature. Running on undermines the bounded exposure the whole
                  thing depends on.
                </p>

                {noted.length > 0 ? (
                  <>
                    <p className="text-foreground/80 mt-6 text-sm font-semibold">
                      Now go back to the ones you noted. That is the actual conversation — the game
                      was only ever the way in.
                    </p>
                    <ul className="text-foreground-strong mt-3 list-disc space-y-1 pl-5 text-sm">
                      {noted.map((text) => (
                        <li key={text}>{text}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-foreground-dim mt-6 text-sm">
                    Nothing noted this round. Next time, mark the answers you want to dig into and
                    come back to them here.
                  </p>
                )}

                <p className="text-foreground-dim mt-6 text-xs leading-relaxed">
                  The skill this rewards is not asking; it is what you do with the answer while it
                  is still being said.{" "}
                  <Link href="/practice/exercises/last-word-response" className="underline">
                    Last-word response
                  </Link>{" "}
                  trains exactly that, and{" "}
                  <a href="#the-part-you-can-practise" onClick={close} className="underline">
                    the page says why
                  </a>
                  .
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => room && start(room)}
                    className="bg-foreground text-background rounded-lg px-5 py-2.5 text-sm font-semibold"
                  >
                    Play again
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="text-foreground-dim hover:text-foreground text-sm underline underline-offset-4"
                  >
                    Change who you are with
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
