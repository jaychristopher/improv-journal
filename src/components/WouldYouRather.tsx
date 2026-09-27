"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { browserStorage, createSeenStore, type SeenStore } from "@/lib/prompt-generator";
import {
  GROUP_SIZES,
  roomInfo,
  SESSION_LONG_AT,
  SESSION_NUDGE_AT,
  variantFor,
  type VariantInfo,
  WOULD_YOU_RATHER_BANK,
  WOULD_YOU_RATHER_ROOMS,
  type WouldYouRatherPair,
  type WouldYouRatherRoom,
} from "@/lib/would-you-rather-bank";
import { deal, WYR_SEEN_KEY } from "@/lib/would-you-rather-game";

import { HeroTakeover } from "./HeroTakeover";
import { ToolChoice, ToolQuiet } from "./ToolControls";
import { WouldYouRatherMark } from "./WouldYouRatherMark";

/**
 * The hero on /would-you-rather-questions.
 *
 * The page's own argument is that a list is the wrong product: the answer is
 * worthless, the defence is the game, and the game dies on "it depends". A
 * reader holding a phone in a room full of people does not want 164 questions
 * under eight headings — they want the next pair, the rule said out loud, and
 * the way to run it for the number of people in front of them.
 *
 * So the tool asks two things and then deals: who is playing, which decides
 * the sets in play, and how many, which decides the variant the page
 * prescribes for that size. A pair is a card with two sides and no third
 * option, because the one rule is that you have to pick — and the pick is
 * the whole tap: the next pair deals itself once the choice has shown for a
 * moment. A "next" button after a pick was a second tap with no reason in
 * it (2026-09-27); the defence the page asks for is in the standing rule
 * above every pair instead, where it was read before, not after.
 *
 * Closed, it is a card with four buttons and it renders on the server, so the
 * html carries the way in. The dialog is client-only; nothing in it is a route.
 */

type Step = "size" | "pair";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * How long a picked side stays lit before the next pair deals. Long enough
 * for the press to register as the choice it was, short enough that nobody
 * reaches for a button that is not there.
 */
export const PICK_HOLD_MS = 250;

/** Where it is mounted. Only the guide today; the prop keeps a tool page cheap. */
type WouldYouRatherSurface = "guide-hero" | "tool-page";

export function WouldYouRather({ surface }: { surface: WouldYouRatherSurface }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("size");
  const [room, setRoom] = useState<WouldYouRatherRoom | null>(null);
  const [variant, setVariant] = useState<VariantInfo | null>(null);
  const [pair, setPair] = useState<WouldYouRatherPair | null>(null);
  const [picked, setPicked] = useState<"left" | "right" | null>(null);
  const [dealt, setDealt] = useState(0);
  const [store] = useState<SeenStore>(() => createSeenStore(browserStorage(), WYR_SEEN_KEY));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const holdRef = useRef<number | null>(null);
  const headingId = useId();

  const close = useCallback(() => {
    if (holdRef.current !== null) window.clearTimeout(holdRef.current);
    holdRef.current = null;
    trackEvent("would_you_rather_closed", { surface, room, dealt });
    setOpen(false);
  }, [surface, room, dealt]);

  useEffect(
    () => () => {
      if (holdRef.current !== null) window.clearTimeout(holdRef.current);
    },
    [],
  );

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

  function dealNext(forRoom: WouldYouRatherRoom, count: number) {
    const next = deal(forRoom, store.seen(), count);
    if (next.wrapped) store.forget(store.seen());
    if (next.pair) {
      store.markSeen(next.pair.id);
      setDealt(count + 1);
      trackEvent("would_you_rather_dealt", {
        surface,
        room: forRoom,
        pair_id: next.pair.id,
        category: next.pair.category,
        remaining: next.remaining,
        dealt: count + 1,
      });
    }
    setPicked(null);
    setPair(next.pair);
    setStep("pair");
  }

  function chooseRoom(next: WouldYouRatherRoom, event: React.MouseEvent<HTMLButtonElement>) {
    setRoom(next);
    if (!open) {
      openerRef.current = event.currentTarget;
      setOpen(true);
      trackEvent("would_you_rather_opened", { surface, room: next });
    }
    setStep("size");
  }

  function chooseSize(people: number) {
    if (!room) return;
    const chosen = variantFor(people);
    setVariant(chosen);
    trackEvent("would_you_rather_size", { room, people, variant: chosen.id });
    dealNext(room, 0);
  }

  function pick(side: "left" | "right") {
    // One pick a pair: a second tap during the hold is the first one again.
    if (picked) return;
    setPicked(side);
    trackEvent("would_you_rather_picked", { room, pair_id: pair?.id ?? null, side });
    const forRoom = room;
    const count = dealt;
    holdRef.current = window.setTimeout(() => {
      holdRef.current = null;
      if (forRoom) dealNext(forRoom, count);
    }, PICK_HOLD_MS);
  }

  function skip() {
    if (!room) return;
    trackEvent("would_you_rather_skipped", { room, pair_id: pair?.id ?? null });
    dealNext(room, dealt);
  }

  const info = room ? roomInfo(room) : undefined;

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open}>
        <div
          data-track="would-you-rather"
          className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12"
        >
          <div>
            <WouldYouRatherMark id={headingId} />
            <p className="text-hero-muted mt-5 max-w-lg text-base leading-relaxed sm:mt-6 lg:mt-7">
              Deal me a pair. Say who is playing, and it runs the game: one pair at a time, never
              the same one twice on this device, and the way to play it for the number of people in
              the room.
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {WOULD_YOU_RATHER_ROOMS.map((r) => (
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
              {WOULD_YOU_RATHER_BANK.length} pairs, every one of them on this page.
            </p>
          </div>
        </div>
      </HeroTakeover>

      {open && (
        <div
          className="bg-background/95 fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Would you rather"
          ref={dialogRef}
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-foreground-dim text-xs">
                {info?.label}
                {variant ? ` · ${variant.label}` : ""}
                {dealt > 0 ? ` · pair ${dealt}` : ""}
              </p>
              <ToolQuiet onClick={close} className="shrink-0 text-sm">
                Close
              </ToolQuiet>
            </div>

            {step === "size" && (
              <div className="mt-8">
                <h3 className="text-foreground-strong text-xl font-semibold">How many of you?</h3>
                <p className="text-foreground/80 mt-2 text-sm">
                  This page prescribes a different way to run it at each size. The pairs are the
                  same; the way the room answers is not.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {GROUP_SIZES.map((size) => {
                    const v = variantFor(size.people);
                    return (
                      <ToolChoice
                        key={size.people}
                        palette="page"
                        onClick={() => chooseSize(size.people)}
                        className="p-4"
                      >
                        <span className="text-foreground-strong block font-semibold">
                          {size.label}
                        </span>
                        <span className="text-foreground-dim mt-1 block text-xs leading-snug">
                          {v.label}: {v.how}
                        </span>
                      </ToolChoice>
                    );
                  })}
                </div>
              </div>
            )}

            {step === "pair" && pair && (
              <div className="mt-6 flex flex-1 flex-col">
                {/* The rule, before the pair and on every card. The page calls
                    "it depends" a refusal dressed as thoughtfulness, and one
                    person doing it gives everybody else permission. */}
                <p className="text-foreground-dim text-xs">
                  You have to pick, then say why — the choice is worthless on its own, the argument
                  is the game. Not both, not neither, not &ldquo;it depends&rdquo; — that is{" "}
                  <Link href="/how-it-works/diagnosis/blocking" className="underline">
                    blocking
                  </Link>
                  , and the opposite is{" "}
                  <Link href="/practice/techniques/commitment" className="underline">
                    commitment
                  </Link>
                  .
                </p>

                {/* Not `flex-1`: stretched to the viewport the two options
                    read as two screens rather than as one question, and the
                    second sat a scroll away from the first on a phone. */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(["left", "right"] as const).map((side) => (
                    <ToolChoice
                      key={side}
                      palette="page"
                      onClick={() => pick(side)}
                      selected={picked === side}
                      data-side={side}
                      className={`flex min-h-[7rem] items-center justify-center p-5 text-center text-lg leading-snug sm:text-xl ${
                        picked === side ? "font-semibold" : ""
                      }`}
                    >
                      {capitalise(side === "left" ? pair.left : pair.right)}
                    </ToolChoice>
                  ))}
                </div>

                {dealt === 1 && (
                  <p className="text-foreground-dim mt-4 text-sm">
                    Whoever answers first sets the tone for the whole round, thoughtful or jokes.
                    Worth deciding on purpose.
                  </p>
                )}

                {/* The pick deals the next pair. What is left here is the way
                    past a pair the room cannot use, and the way back. */}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <ToolQuiet onClick={skip} className="text-sm">
                    Skip this pair
                  </ToolQuiet>
                  <ToolQuiet onClick={() => setStep("size")} className="text-sm">
                    Change the room
                  </ToolQuiet>
                </div>

                {dealt >= SESSION_NUDGE_AT && (
                  <p className="text-foreground-dim mt-4 text-xs">
                    {dealt >= SESSION_LONG_AT
                      ? "Past a long session now. The second half of a long list is always weaker."
                      : "A session is ten to fifteen pairs. Stop while people still want another one."}
                  </p>
                )}

                {variant && (
                  <p className="text-foreground-dim mt-6 text-xs leading-relaxed">
                    <span className="text-foreground/80">{variant.label}.</span> {variant.how}{" "}
                    {variant.why}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** The article writes the second option mid-sentence; a card needs it capitalised. */
function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
