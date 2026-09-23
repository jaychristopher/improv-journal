"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  CATEGORY_QUERY_PARAM,
  conceptGloss,
  PROMPT_BANK,
  PROMPT_CATEGORIES,
  PROMPT_USE_CASES,
  type PromptCategory,
  type PromptCategoryInfo,
  type PromptConceptMap,
  type PromptUseCase,
  type PromptUseCaseInfo,
} from "@/lib/prompt-bank";
import {
  browserStorage,
  createSeenStore,
  type Pick,
  pickNext,
  poolFor,
  type SeenStore,
} from "@/lib/prompt-generator";

import { HeroTakeover } from "./HeroTakeover";

/**
 * The hero on /improv-prompts.
 *
 * Closed, it is a card with four buttons: where are you using this? The first
 * tap takes over the viewport and walks the reader through the kind of prompt
 * they want and then hands them one, and another, and another — best first,
 * never a repeat on this device — until they close it from the corner.
 *
 * The inline card renders on the server, so the html carries the way in. The
 * dialog is client-only, which is fine: nothing in it is a route.
 */

type Step = "room" | "kind" | "prompt";

interface Draw {
  pick: Pick | null;
  poolSize: number;
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Where the generator is mounted. The guide hero is a card under the article's
 * title and links out to the tool page; the tool page is the full version and
 * owns the "improv prompt generator" keyword, so the hero's heading stays
 * neutral rather than competing with it.
 */
type PromptGeneratorSurface = "guide-hero" | "tool-page";

/** The category named in the page's query, if it names one the bank has. */
function presetFromQuery(search: string): PromptCategory | null {
  const wanted = new URLSearchParams(search).get(CATEGORY_QUERY_PARAM);
  return PROMPT_CATEGORIES.find((c) => c.id === wanted)?.id ?? null;
}

export function PromptGenerator({
  surface,
  concepts,
}: {
  surface: PromptGeneratorSurface;
  /**
   * Each category's concepts, resolved by the mounting page (prompt-concepts.ts).
   * Optional so the component still renders where no page resolved them; the
   * concept line under a prompt then renders nothing rather than a bare id.
   */
  concepts?: PromptConceptMap;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("room");
  const [useCase, setUseCase] = useState<PromptUseCase | null>(null);
  const [category, setCategory] = useState<PromptCategory | null>(null);
  // A concept page links here pre-set to its category
  // (`?category=relationship`, PromptTryLine). Read after mount from the
  // location rather than through useSearchParams: on a prerendered route
  // that hook client-renders everything up to the nearest Suspense boundary,
  // and the inline card has to be in the server html — the hero's whole point
  // (prompt-generator-rendered.test.ts).
  const [preset, setPreset] = useState<PromptCategory | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [draws, setDraws] = useState(0);
  const [copied, setCopied] = useState(false);
  const [store] = useState<SeenStore>(() => createSeenStore(browserStorage()));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  const useCaseInfo = PROMPT_USE_CASES.find((u) => u.id === useCase) ?? null;
  const categoryInfo = PROMPT_CATEGORIES.find((c) => c.id === category) ?? null;
  const presetInfo = PROMPT_CATEGORIES.find((c) => c.id === preset) ?? null;
  // The first concept is the one the category *is*; the rest are the sidebar's
  // business. Nothing when the page passed no map or the category has none.
  const concept = categoryInfo ? (concepts?.[categoryInfo.id]?.[0] ?? null) : null;

  useEffect(() => {
    setPreset(presetFromQuery(window.location.search));
  }, []);

  const close = useCallback(() => {
    trackEvent("prompt_generator_closed", { surface, step, draws });
    setOpen(false);
  }, [surface, step, draws]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const first = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    return () => {
      document.body.style.overflow = "";
      // Focus goes back to the button that opened the dialog. This has to
      // happen here, after the re-render, because until then the inline card
      // is still inert and refuses focus — which is exactly what happened
      // when the restore ran inside close().
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
      // Keep Tab inside the dialog: the page behind it is inert to a pointer
      // but not to a keyboard without this.
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

  function drawFrom(nextCategory: PromptCategory, nextUseCase: PromptUseCase, reset = false) {
    const pool = poolFor(PROMPT_BANK, nextCategory, nextUseCase);
    if (reset) {
      store.forget(pool.map((p) => p.id));
      trackEvent("prompt_generator_reset", { use_case: nextUseCase, category: nextCategory });
    }
    const pick = pickNext(pool, nextUseCase, store.seen());
    if (pick) {
      store.markSeen(pick.prompt.id);
      setDraws((n) => n + 1);
      trackEvent("prompt_generated", {
        surface,
        use_case: nextUseCase,
        category: nextCategory,
        band: pick.band,
        prompt_id: pick.prompt.id,
        remaining: pick.remaining,
      });
    } else {
      trackEvent("prompt_generator_exhausted", {
        use_case: nextUseCase,
        category: nextCategory,
        pool: pool.length,
      });
    }
    setCopied(false);
    setDraw({ pick, poolSize: pool.length });
    setStep("prompt");
  }

  function chooseRoom(next: PromptUseCaseInfo, event: React.MouseEvent<HTMLButtonElement>) {
    setUseCase(next.id);
    if (!open) {
      openerRef.current = event.currentTarget;
      setOpen(true);
      trackEvent("prompt_generator_opened", { surface, use_case: next.id, preset });
      // Arrived from a concept page asking for one kind: the first tap goes
      // straight to a prompt of that kind. "A different kind" is still there.
      if (preset) {
        setCategory(preset);
        trackEvent("prompt_generator_category", {
          use_case: next.id,
          category: preset,
          preset: true,
        });
        drawFrom(preset, next.id);
        return;
      }
    }
    setStep("kind");
  }

  function chooseKind(next: PromptCategoryInfo) {
    if (!useCase) return;
    setCategory(next.id);
    trackEvent("prompt_generator_category", { use_case: useCase, category: next.id });
    drawFrom(next.id, useCase);
  }

  async function copyPrompt(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent("prompt_copied", { use_case: useCase, category });
    } catch {
      // No clipboard in this context. The text is on screen; nothing to do.
    }
  }

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open} takeover={surface === "guide-hero"}>
        <div data-track="prompt-generator">
          <span className="text-hero-muted text-xs tracking-wider uppercase">Free tool</span>
          <h2
            id={headingId}
            className="text-hero-foreground mt-2 text-3xl font-semibold tracking-tight sm:text-4xl"
          >
            Give me a prompt
          </h2>
          <p className="text-hero-muted mt-3 max-w-lg text-base leading-relaxed">
            Say where you are using it. Strongest first, one at a time, never the same one twice on
            this device.
            {presetInfo && (
              <span data-prompt-preset={presetInfo.id}>
                {" "}
                Set to {presetInfo.label.toLowerCase()}, as the page you came from asked.
              </span>
            )}
          </p>
          {/* Two columns at every width, and the descriptions only from `sm` up:
            at 390px the one-column version with descriptions ran to 340px of
            buttons and the last one sat below the fold. */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:gap-3">
            {PROMPT_USE_CASES.map((room) => (
              <RoomButton key={room.id} room={room} onChoose={chooseRoom} compact hero />
            ))}
          </div>
          <p className="text-hero-muted/70 mt-5 text-xs">
            {PROMPT_BANK.length} prompts, ranked by the criteria this page argues for.
            {surface === "guide-hero" && (
              <>
                {" "}
                <Link
                  href="/tools/improv-prompt-generator"
                  className="underline underline-offset-2"
                >
                  How the generator ranks them
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </HeroTakeover>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Improv prompt generator"
          className="bg-background text-foreground animate-fade-in fixed inset-0 z-[60] flex h-dvh flex-col"
        >
          <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-8">
            <div className="text-foreground/50 min-w-0 text-xs tracking-wider uppercase">
              {step === "room" && "Where are you using it?"}
              {step === "kind" && useCaseInfo && (
                <button
                  type="button"
                  onClick={() => setStep("room")}
                  className="hover:text-foreground cursor-pointer truncate underline-offset-4 hover:underline"
                >
                  {useCaseInfo.label} &middot; change
                </button>
              )}
              {step === "prompt" && categoryInfo && useCaseInfo && (
                <span className="block truncate">
                  {categoryInfo.label} &middot; {useCaseInfo.label}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-foreground/60 hover:text-foreground hover:bg-foreground/5 -mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
            {step === "room" && (
              <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
                <h2 className="text-foreground-strong text-3xl font-semibold tracking-tight">
                  Where are you using it?
                </h2>
                <div className="mt-6 grid gap-2">
                  {PROMPT_USE_CASES.map((room) => (
                    <RoomButton key={room.id} room={room} onChoose={chooseRoom} />
                  ))}
                </div>
              </div>
            )}

            {step === "kind" && useCaseInfo && (
              <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
                <h2 className="text-foreground-strong text-3xl font-semibold tracking-tight">
                  What kind of start?
                </h2>
                <p className="text-foreground/60 mt-2 text-sm">{useCaseInfo.description}</p>
                <div className="mt-6 grid gap-2">
                  {PROMPT_CATEGORIES.map((kind) => {
                    const poolSize = poolFor(PROMPT_BANK, kind.id, useCaseInfo.id).length;
                    return (
                      <KindButton
                        key={kind.id}
                        kind={kind}
                        poolSize={poolSize}
                        onChoose={chooseKind}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {step === "prompt" && draw && categoryInfo && useCaseInfo && (
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col py-4">
                <div className="flex flex-1 flex-col justify-center">
                  {draw.pick ? (
                    <>
                      <p className="text-foreground/40 text-xs tracking-wider uppercase">
                        {draw.pick.remaining} of {draw.poolSize} left
                      </p>
                      <p
                        key={draw.pick.prompt.id}
                        data-testid="prompt-text"
                        className="text-foreground-strong animate-fade-in mt-4 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
                      >
                        {draw.pick.prompt.text}
                      </p>
                      <p className="text-foreground/60 mt-6 max-w-md text-sm leading-relaxed">
                        {categoryInfo.howToUse}
                      </p>
                      {/* The category is a concept under another name, and
                          howToUse is that concept's page in a sentence, so
                          the sentence is reused as the gloss and the title
                          becomes the link: every prompt is one click from
                          its theory (tracker entry 332). Nothing for a
                          category without a concept, or a mount without the
                          resolved map. */}
                      {concept && (
                        <p
                          className="text-foreground/50 mt-3 max-w-md text-sm leading-relaxed"
                          data-prompt-concept={concept.id}
                        >
                          The idea behind it:{" "}
                          <Link
                            href={concept.href}
                            className="text-foreground/70 italic underline underline-offset-2"
                          >
                            {concept.title}
                          </Link>{" "}
                          &mdash; {conceptGloss(categoryInfo.howToUse)}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-foreground/40 text-xs tracking-wider uppercase">
                        That is all of them
                      </p>
                      <h2 className="text-foreground-strong mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        You have seen every {categoryInfo.label.toLowerCase()} prompt for{" "}
                        {useCaseInfo.label.toLowerCase()}.
                      </h2>
                      <p className="text-foreground/60 mt-4 max-w-md text-sm leading-relaxed">
                        {draw.poolSize} in total. Start again to draw from the same pool, or pick a
                        different kind.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {draw.pick ? (
                    <>
                      <button
                        type="button"
                        onClick={() => drawFrom(categoryInfo.id, useCaseInfo.id)}
                        className="bg-foreground text-background hover:bg-foreground/90 min-h-14 flex-1 cursor-pointer rounded-xl px-5 text-base font-semibold transition-colors sm:flex-none sm:px-8"
                      >
                        Another one
                      </button>
                      <button
                        type="button"
                        onClick={() => copyPrompt(draw.pick?.prompt.text ?? "")}
                        className="border-foreground/15 hover:border-foreground/40 min-h-12 cursor-pointer rounded-xl border px-5 text-sm font-medium transition-colors"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => drawFrom(categoryInfo.id, useCaseInfo.id, true)}
                      className="bg-foreground text-background hover:bg-foreground/90 min-h-14 flex-1 cursor-pointer rounded-xl px-5 text-base font-semibold transition-colors sm:flex-none sm:px-8"
                    >
                      Start again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStep("kind")}
                    className="border-foreground/15 hover:border-foreground/40 min-h-12 cursor-pointer rounded-xl border px-5 text-sm font-medium transition-colors"
                  >
                    A different kind
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

function RoomButton({
  room,
  onChoose,
  compact = false,
  hero = false,
}: {
  room: PromptUseCaseInfo;
  onChoose: (room: PromptUseCaseInfo, event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Hide the description below `sm`, for the inline card on a phone. */
  compact?: boolean;
  /** On the dark takeover panel rather than on the page's own background. */
  hero?: boolean;
}) {
  const labelId = useId();
  const descId = useId();
  return (
    <button
      type="button"
      onClick={(event) => onChoose(room, event)}
      aria-labelledby={labelId}
      aria-describedby={descId}
      className={[
        "group flex min-h-14 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left transition-colors sm:gap-3 sm:px-4",
        hero
          ? "border-hero-foreground/15 hover:border-hero-foreground/40 hover:bg-hero-foreground/10"
          : "border-foreground/10 bg-background hover:border-foreground/40",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span
          id={labelId}
          className={[
            "block text-sm font-semibold",
            hero ? "text-hero-foreground" : "text-foreground-strong",
          ].join(" ")}
        >
          {room.label}
        </span>
        <span
          id={descId}
          className={[
            "mt-0.5 text-xs",
            hero ? "text-hero-muted" : "text-foreground/50",
            compact ? "hidden sm:block" : "block",
          ].join(" ")}
        >
          {room.description}
        </span>
      </span>
      <span
        className={[
          "hidden shrink-0 transition-transform group-hover:translate-x-1 sm:inline",
          hero ? "text-hero-muted/60" : "text-foreground/30",
        ].join(" ")}
      >
        &rarr;
      </span>
    </button>
  );
}

function KindButton({
  kind,
  poolSize,
  onChoose,
}: {
  kind: PromptCategoryInfo;
  poolSize: number;
  onChoose: (kind: PromptCategoryInfo) => void;
}) {
  const labelId = useId();
  const descId = useId();
  return (
    <button
      type="button"
      onClick={() => onChoose(kind)}
      aria-labelledby={labelId}
      aria-describedby={descId}
      className="group border-foreground/10 bg-surface hover:border-foreground/40 flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
    >
      <span className="min-w-0">
        <span id={labelId} className="text-foreground-strong block text-base font-semibold">
          {kind.label}
        </span>
        <span id={descId} className="text-foreground/50 mt-0.5 block text-xs">
          {poolSize} to draw from
        </span>
      </span>
      <span className="text-foreground/30 shrink-0 transition-transform group-hover:translate-x-1">
        &rarr;
      </span>
    </button>
  );
}
