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
 * option, because the one rule is that you have to pick — and after a pick it
 * asks for the defence, which is the part the page says is the whole point.
 *
 * Closed, it is a card with four buttons and it renders on the server, so the
 * html carries the way in. The dialog is client-only; nothing in it is a route.
 */

type Step = "size" | "pair";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

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
  const headingId = useId();

  const close = useCallback(() => {
    trackEvent("would_you_rather_closed", { surface, room, dealt });
    setOpen(false);
  }, [surface, room, dealt]);

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
    setPicked(side);
    trackEvent("would_you_rather_picked", { room, pair_id: pair?.id ?? null, side });
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
                <button
                  key={r.id}
                  type="button"
                  onClick={(event) => chooseRoom(r.id, event)}
                  className="border-hero-foreground/15 hover:border-hero-foreground/40 hover:bg-hero-foreground/10 rounded-xl border p-3 text-left transition-colors sm:p-4"
                >
                  <span className="text-hero-foreground block text-sm font-semibold sm:text-base">
                    {r.label}
                  </span>
                  <span className="text-hero-muted mt-1 hidden text-xs leading-snug sm:block">
                    {r.note}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-hero-muted/70 mt-5 text-xs">
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
              <p className="text-foreground/50 text-xs">
                {info?.label}
                {variant ? ` · ${variant.label}` : ""}
                {dealt > 0 ? ` · pair ${dealt}` : ""}
              </p>
              <button
                type="button"
                onClick={close}
                className="text-foreground/50 hover:text-foreground shrink-0 text-sm underline underline-offset-4"
              >
                Close
              </button>
            </div>

            {step === "size" && (
              <div className="mt-8">
                <h3 className="text-foreground-strong text-xl font-semibold">How many of you?</h3>
                <p className="text-foreground/60 mt-2 text-sm">
                  This page prescribes a different way to run it at each size. The pairs are the
                  same; the way the room answers is not.
                </p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {GROUP_SIZES.map((size) => {
                    const v = variantFor(size.people);
                    return (
                      <button
                        key={size.people}
                        type="button"
                        onClick={() => chooseSize(size.people)}
                        className="border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 rounded-lg border p-4 text-left transition-colors"
                      >
                        <span className="text-foreground-strong block font-semibold">
                          {size.label}
                        </span>
                        <span className="text-foreground/50 mt-1 block text-xs leading-snug">
                          {v.label}: {v.how}
                        </span>
                      </button>
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
                <p className="text-foreground/50 text-xs">
                  You have to pick. Not both, not neither, not &ldquo;it depends&rdquo; — that is{" "}
                  <Link href="/how-it-works/diagnosis/blocking" className="underline">
                    blocking
                  </Link>
                  , and the opposite is{" "}
                  <Link href="/practice/vocabulary/commitment" className="underline">
                    commitment
                  </Link>
                  .
                </p>

                {/* Not `flex-1`: stretched to the viewport the two options
                    read as two screens rather than as one question, and the
                    second sat a scroll away from the first on a phone. */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(["left", "right"] as const).map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => pick(side)}
                      aria-pressed={picked === side}
                      data-side={side}
                      className={`flex min-h-[7rem] items-center justify-center rounded-xl border p-5 text-center text-lg leading-snug transition-colors sm:text-xl ${
                        picked === side
                          ? "border-foreground/40 bg-foreground/10 text-foreground-strong font-semibold"
                          : picked
                            ? "border-foreground/10 text-foreground/40"
                            : "border-foreground/15 hover:border-foreground/40 hover:bg-foreground/5 text-foreground-strong"
                      }`}
                    >
                      {capitalise(side === "left" ? pair.left : pair.right)}
                    </button>
                  ))}
                </div>

                {picked ? (
                  // The defence is the game. The page: make somebody pick and
                  // argue for it and you get the truth by accident.
                  <p className="text-foreground/70 mt-4 text-sm">
                    Now say why. The choice is worthless on its own — the argument is the game.
                  </p>
                ) : (
                  dealt === 1 && (
                    <p className="text-foreground/50 mt-4 text-sm">
                      Whoever answers first sets the tone for the whole round, thoughtful or jokes.
                      Worth deciding on purpose.
                    </p>
                  )
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => room && dealNext(room, dealt)}
                    className="bg-foreground text-background rounded-lg px-5 py-2.5 text-sm font-semibold"
                  >
                    Next pair
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("size")}
                    className="text-foreground/50 hover:text-foreground text-sm underline underline-offset-4"
                  >
                    Change the room
                  </button>
                </div>

                {dealt >= SESSION_NUDGE_AT && (
                  <p className="text-foreground/50 mt-4 text-xs">
                    {dealt >= SESSION_LONG_AT
                      ? "Past a long session now. The second half of a long list is always weaker."
                      : "A session is ten to fifteen pairs. Stop while people still want another one."}
                  </p>
                )}

                {variant && (
                  <p className="text-foreground/40 mt-6 text-xs leading-relaxed">
                    <span className="text-foreground/60">{variant.label}.</span> {variant.how}{" "}
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
