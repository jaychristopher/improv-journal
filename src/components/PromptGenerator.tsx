"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  CATEGORY_QUERY_PARAM,
  CLASSIC_PART_LABELS,
  CLASSIC_PARTS,
  type ClassicPart,
  conceptGloss,
  PROMPT_BANK,
  PROMPT_KINDS,
  PROMPT_USE_CASES,
  type PromptCategory,
  type PromptConceptMap,
  type PromptKind,
  type PromptKindInfo,
  type PromptUseCase,
  type PromptUseCaseInfo,
} from "@/lib/prompt-bank";
import {
  browserStorage,
  classicCombinations,
  type ClassicDraw,
  classicPools,
  classicText,
  createSeenStore,
  type Pick,
  pickClassic,
  pickNext,
  poolFor,
  type SeenStore,
} from "@/lib/prompt-generator";

import { HeroTakeover } from "./HeroTakeover";
import { ToolAction, ToolChoice } from "./ToolControls";

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
 *
 * What the field had that this did not, and where each went (2026-09-30,
 * docs/improv-prompts-competitors.md): the who-where-what draw is a seventh
 * kind, and tapping one of its lines redraws that line alone; a show gets
 * display-size type above `lg` with no switch; Space, Enter, C and K do what
 * the buttons do for a host at a laptop; what has been drawn this session sits
 * under the buttons; the time on the current prompt ticks beside the count;
 * who a prompt needs and one coaching line come from the bank when a row has
 * them. No control was added above the three the prompt step already had.
 */

type Step = "room" | "kind" | "prompt";

interface Draw {
  kind: PromptKind;
  /** The single prompt, or null on the classic and when a pool is spent. */
  pick: Pick | null;
  /** The pool a single kind draws from, or the ways the classic can fall. */
  poolSize: number;
  /** The three lines of the classic; null on a single kind. */
  parts: ClassicDraw | null;
  drawnAt: number;
  /** The nth card dealt this session; the session list is keyed on it. */
  card: number;
}

interface Drawn {
  card: number;
  kind: PromptKind;
  text: string;
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Where the generator is mounted. The guide hero is a card under the article's
 * title and links out to the tool page; the tool page is the full version and
 * owns the "improv prompt generator" keyword, so the hero's heading stays
 * neutral rather than competing with it.
 */
type PromptGeneratorSurface = "guide-hero" | "tool-page";

/** The kind named in the page's query, if it names one the bank has. */
function presetFromQuery(search: string): PromptKind | null {
  const wanted = new URLSearchParams(search).get(CATEGORY_QUERY_PARAM);
  return PROMPT_KINDS.find((c) => c.id === wanted)?.id ?? null;
}

/** Whether a card has anything on it, single or classic. */
function hasPrompt(draw: Draw): boolean {
  return draw.parts ? CLASSIC_PARTS.some((part) => draw.parts?.[part]) : draw.pick !== null;
}

/** The card's words, for the clipboard and the session list. */
function textOf(draw: Draw): string {
  return draw.parts ? classicText(draw.parts) : (draw.pick?.prompt.text ?? "");
}

/** m:ss, for the clock beside the count. */
function clock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PromptGenerator({
  surface,
  concepts,
}: {
  surface: PromptGeneratorSurface;
  /**
   * Each kind's concepts, resolved by the mounting page (prompt-concepts.ts).
   * Optional so the component still renders where no page resolved them; the
   * concept line under a prompt then renders nothing rather than a bare id.
   */
  concepts?: PromptConceptMap;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("room");
  const [useCase, setUseCase] = useState<PromptUseCase | null>(null);
  const [kind, setKind] = useState<PromptKind | null>(null);
  // A concept page links here pre-set to its kind
  // (`?category=relationship`, PromptTryLine). Read after mount from the
  // location rather than through useSearchParams: on a prerendered route
  // that hook client-renders everything up to the nearest Suspense boundary,
  // and the inline card has to be in the server html — the hero's whole point
  // (prompt-generator-rendered.test.ts).
  const [preset, setPreset] = useState<PromptKind | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [draws, setDraws] = useState(0);
  const [history, setHistory] = useState<Drawn[]>([]);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);
  const [store] = useState<SeenStore>(() => createSeenStore(browserStorage()));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef(0);
  const keysRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const headingId = useId();

  const useCaseInfo = PROMPT_USE_CASES.find((u) => u.id === useCase) ?? null;
  const kindInfo = PROMPT_KINDS.find((c) => c.id === kind) ?? null;
  const presetInfo = PROMPT_KINDS.find((c) => c.id === preset) ?? null;
  // The first concept is the one the kind *is*; the rest are the sidebar's
  // business. Nothing when the page passed no map or the kind has none.
  const concept = kindInfo ? (concepts?.[kindInfo.id]?.[0] ?? null) : null;
  const card = draw?.card ?? 0;

  useEffect(() => {
    setPreset(presetFromQuery(window.location.search));
  }, []);

  // Installable: the tool is the one page on the site that gets used standing
  // up, in a hall, with no signal. The worker caches the two pages that mount
  // this and the chunks they need (public/sw.js). Production only, so a dev
  // server never serves yesterday's page.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // A browser that refuses is a browser that stays online. Nothing to do.
    });
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
        return;
      }
      keysRef.current(event);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  // The clock on the current card. A class runs rounds of a minute or two,
  // and the guide says how long; this gives the teacher the number without
  // asking them to set anything.
  useEffect(() => {
    if (!open || step !== "prompt" || card === 0) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, step, card]);

  function remember(next: Draw) {
    const text = textOf(next);
    if (!text) return;
    setHistory((entries) => [
      { card: next.card, kind: next.kind, text },
      ...entries.filter((e) => e.card !== next.card),
    ]);
  }

  function drawFrom(nextKind: PromptKind, nextUseCase: PromptUseCase, reset = false) {
    const cardNumber = ++cardRef.current;
    let next: Draw;
    if (nextKind === "classic") {
      const pools = classicPools(PROMPT_BANK, nextUseCase);
      if (reset) {
        store.forget(CLASSIC_PARTS.flatMap((part) => pools[part].map((p) => p.id)));
        trackEvent("prompt_generator_reset", { use_case: nextUseCase, category: nextKind });
      }
      const parts = pickClassic(PROMPT_BANK, nextUseCase, store.seen());
      const picks = CLASSIC_PARTS.map((part) => parts[part]).filter((p): p is Pick => p !== null);
      if (picks.length > 0) {
        for (const pick of picks) store.markSeen(pick.prompt.id);
        setDraws((n) => n + 1);
        trackEvent("prompt_generated", {
          surface,
          use_case: nextUseCase,
          category: nextKind,
          band: Math.max(...picks.map((p) => p.band)),
          prompt_id: picks.map((p) => p.prompt.id).join("+"),
          remaining: Math.min(...picks.map((p) => p.remaining)),
        });
      } else {
        trackEvent("prompt_generator_exhausted", {
          use_case: nextUseCase,
          category: nextKind,
          pool: CLASSIC_PARTS.reduce((n, part) => n + pools[part].length, 0),
        });
      }
      next = {
        kind: nextKind,
        pick: null,
        poolSize: classicCombinations(PROMPT_BANK, nextUseCase),
        parts,
        drawnAt: Date.now(),
        card: cardNumber,
      };
    } else {
      const category: PromptCategory = nextKind;
      const pool = poolFor(PROMPT_BANK, category, nextUseCase);
      if (reset) {
        store.forget(pool.map((p) => p.id));
        trackEvent("prompt_generator_reset", { use_case: nextUseCase, category });
      }
      const pick = pickNext(pool, nextUseCase, store.seen());
      if (pick) {
        store.markSeen(pick.prompt.id);
        setDraws((n) => n + 1);
        trackEvent("prompt_generated", {
          surface,
          use_case: nextUseCase,
          category,
          band: pick.band,
          prompt_id: pick.prompt.id,
          remaining: pick.remaining,
        });
      } else {
        trackEvent("prompt_generator_exhausted", {
          use_case: nextUseCase,
          category,
          pool: pool.length,
        });
      }
      next = {
        kind: nextKind,
        pick,
        poolSize: pool.length,
        parts: null,
        drawnAt: Date.now(),
        card: cardNumber,
      };
    }
    setCopied(false);
    setDraw(next);
    remember(next);
    setStep("prompt");
  }

  /**
   * One line of the classic, redrawn on its own: the lock-and-regenerate the
   * field does with padlocks, done by tapping the line you want to change.
   * A spent line starts its own pool again rather than going blank.
   */
  function redrawPart(part: ClassicPart) {
    if (!draw?.parts || !useCase) return;
    const pool = poolFor(PROMPT_BANK, part, useCase, { combinable: true });
    let pick = pickNext(pool, useCase, store.seen());
    if (!pick) {
      store.forget(pool.map((p) => p.id));
      trackEvent("prompt_generator_reset", { use_case: useCase, category: part });
      pick = pickNext(pool, useCase, store.seen());
    }
    if (!pick) return;
    store.markSeen(pick.prompt.id);
    trackEvent("prompt_line_redrawn", {
      surface,
      use_case: useCase,
      part,
      prompt_id: pick.prompt.id,
      remaining: pick.remaining,
    });
    const next: Draw = { ...draw, parts: { ...draw.parts, [part]: pick } };
    setCopied(false);
    setDraw(next);
    remember(next);
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
        setKind(preset);
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

  function chooseKind(next: PromptKindInfo) {
    if (!useCase) return;
    setKind(next.id);
    trackEvent("prompt_generator_category", { use_case: useCase, category: next.id });
    drawFrom(next.id, useCase);
  }

  async function copyPrompt(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent("prompt_copied", { use_case: useCase, category: kind });
    } catch {
      // No clipboard in this context. The text is on screen; nothing to do.
    }
  }

  // The keys, for a host running a show from a laptop: Space or Enter for
  // another one, C to copy, K for a different kind. Only on the prompt step,
  // and never while a control has focus, where Space and Enter already mean
  // "press this". Kept on a ref so the listener above never goes stale and
  // never has to be re-attached for a state change.
  useEffect(() => {
    keysRef.current = (event: KeyboardEvent) => {
      if (step !== "prompt" || !draw || !kind || !useCase) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        drawFrom(kind, useCase, !hasPrompt(draw));
      } else if (event.key === "c" || event.key === "C") {
        void copyPrompt(textOf(draw));
      } else if (event.key === "k" || event.key === "K") {
        setStep("kind");
      }
    };
  });

  const elapsed = draw ? Math.max(0, Math.floor((now - draw.drawnAt) / 1000)) : 0;
  const cast = draw?.parts
    ? CLASSIC_PARTS.some((part) => draw.parts?.[part]?.prompt.cast === "group")
      ? "group"
      : null
    : (draw?.pick?.prompt.cast ?? null);

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open} takeover={surface === "guide-hero"}>
        <div
          data-track="prompt-generator"
          // Two columns across the 16:9 panel from `lg`: stacked, this content
          // is taller than the aspect allows and the ends of it were clipped.
          className={
            surface === "guide-hero"
              ? "lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12"
              : ""
          }
        >
          <div>
            <h2
              id={headingId}
              className="text-hero-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Give me a prompt
            </h2>
            <p className="text-hero-muted mt-3 max-w-lg text-base leading-relaxed lg:mt-5">
              Say where you are using it. Strongest first, one at a time, never the same one twice
              on this device.
              {presetInfo && (
                <span data-prompt-preset={presetInfo.id}>
                  {" "}
                  Set to {presetInfo.label.toLowerCase()}, as the page you came from asked.
                </span>
              )}
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            {/* Two columns at every width, and the descriptions only from `sm` up:
            at 390px the one-column version with descriptions ran to 340px of
            buttons and the last one sat below the fold. */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {PROMPT_USE_CASES.map((room) => (
                <RoomButton key={room.id} room={room} onChoose={chooseRoom} compact hero />
              ))}
            </div>
          </div>
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
            <div className="text-foreground-dim min-w-0 text-xs tracking-wider uppercase">
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
              {step === "prompt" && kindInfo && useCaseInfo && (
                <span className="block truncate">
                  {kindInfo.label} &middot; {useCaseInfo.label}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 -mr-2 flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors"
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
                <p className="text-foreground/80 mt-2 text-sm">{useCaseInfo.description}</p>
                <div className="mt-6 grid gap-2">
                  {PROMPT_KINDS.map((each) => {
                    const detail =
                      each.id === "classic"
                        ? `${classicCombinations(PROMPT_BANK, useCaseInfo.id).toLocaleString("en-US")} ways it can fall`
                        : `${poolFor(PROMPT_BANK, each.id, useCaseInfo.id).length} to draw from`;
                    return (
                      <KindButton key={each.id} kind={each} detail={detail} onChoose={chooseKind} />
                    );
                  })}
                </div>
              </div>
            )}

            {step === "prompt" && draw && kindInfo && useCaseInfo && (
              // Wider from `lg`, and the type steps up with it: a laptop on a
              // chair or a projector gets a show screen by being one. On a
              // phone nothing changes.
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col py-4 lg:max-w-4xl">
                <div className="flex flex-1 flex-col justify-center">
                  {hasPrompt(draw) ? (
                    <>
                      <p className="text-foreground-dim text-xs tracking-wider uppercase">
                        {draw.parts
                          ? `${draw.poolSize.toLocaleString("en-US")} ways it can fall`
                          : `${draw.pick?.remaining} of ${draw.poolSize} left`}
                        <span aria-hidden="true"> &middot; </span>
                        <span data-testid="prompt-clock">{clock(elapsed)} on this one</span>
                      </p>
                      {draw.parts ? (
                        <ClassicCard parts={draw.parts} onRedraw={redrawPart} />
                      ) : (
                        <p
                          key={draw.pick?.prompt.id}
                          data-testid="prompt-text"
                          className="text-foreground-strong animate-fade-in mt-4 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl xl:text-6xl"
                        >
                          {draw.pick?.prompt.text}
                        </p>
                      )}
                      <p className="text-foreground/80 mt-6 max-w-md text-sm leading-relaxed lg:max-w-2xl lg:text-lg">
                        {kindInfo.howToUse}
                      </p>
                      {draw.pick?.prompt.coach && (
                        <p
                          className="text-foreground/80 mt-3 max-w-md text-sm leading-relaxed lg:max-w-2xl lg:text-base"
                          data-testid="prompt-coach"
                        >
                          <span className="text-foreground-dim text-xs tracking-wider uppercase">
                            Coaching
                          </span>{" "}
                          {draw.pick.prompt.coach}
                        </p>
                      )}
                      {cast && (
                        <p className="text-foreground-dim mt-3 text-sm" data-testid="prompt-cast">
                          {cast === "group" ? (
                            "Needs three or more."
                          ) : (
                            <>
                              Works for two &mdash;{" "}
                              <Link
                                href="/2-person-improv-games"
                                className="underline underline-offset-2"
                              >
                                2 person improv games
                              </Link>{" "}
                              has the rest.
                            </>
                          )}
                        </p>
                      )}
                      {/* The kind is a concept under another name, and
                          howToUse is that concept's page in a sentence, so
                          the sentence is reused as the gloss and the title
                          becomes the link: every prompt is one click from
                          its theory (tracker entry 332). Nothing for a
                          kind without a concept, or a mount without the
                          resolved map. */}
                      {concept && (
                        <p
                          className="text-foreground-dim mt-3 max-w-md text-sm leading-relaxed lg:max-w-2xl"
                          data-prompt-concept={concept.id}
                        >
                          The idea behind it:{" "}
                          <Link
                            href={concept.href}
                            className="text-foreground/70 italic underline underline-offset-2"
                          >
                            {concept.title}
                          </Link>{" "}
                          &mdash; {conceptGloss(kindInfo.howToUse)}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-foreground-dim text-xs tracking-wider uppercase">
                        That is all of them
                      </p>
                      <h2 className="text-foreground-strong mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        You have seen every {kindInfo.label.toLowerCase()} prompt for{" "}
                        {useCaseInfo.label.toLowerCase()}.
                      </h2>
                      <p className="text-foreground/80 mt-4 max-w-md text-sm leading-relaxed">
                        {draw.parts
                          ? "Every line has been drawn. Start again to draw from the same pools, or pick a different kind."
                          : `${draw.poolSize} in total. Start again to draw from the same pool, or pick a different kind.`}
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {hasPrompt(draw) ? (
                    <>
                      <ToolAction
                        onClick={() => drawFrom(kindInfo.id, useCaseInfo.id)}
                        className="min-h-14 flex-1 px-5 text-base sm:flex-none sm:px-8"
                      >
                        Another one
                      </ToolAction>
                      <ToolAction
                        kind="secondary"
                        onClick={() => copyPrompt(textOf(draw))}
                        className="min-h-12 px-5 text-sm font-medium"
                      >
                        {copied ? "Copied" : "Copy"}
                      </ToolAction>
                    </>
                  ) : (
                    <ToolAction
                      onClick={() => drawFrom(kindInfo.id, useCaseInfo.id, true)}
                      className="min-h-14 flex-1 px-5 text-base sm:flex-none sm:px-8"
                    >
                      Start again
                    </ToolAction>
                  )}
                  <ToolAction
                    kind="secondary"
                    onClick={() => setStep("kind")}
                    className="min-h-12 px-5 text-sm font-medium"
                  >
                    A different kind
                  </ToolAction>
                </div>

                {/* What has been dealt this session, newest first, below the
                    buttons: a teacher who handed eight pairs eight prompts can
                    read them back, and the whole list selects and copies in
                    one go. No star, no save — the ones worth keeping are
                    already on the page. */}
                {history.length > 0 && (
                  <section
                    aria-label="Drawn this session"
                    className="border-foreground/10 mt-10 border-t pt-4"
                  >
                    <p className="text-foreground-dim text-xs tracking-wider uppercase">
                      Drawn this session
                    </p>
                    <ol
                      className="text-foreground/70 mt-2 space-y-1 text-sm"
                      data-testid="prompt-history"
                    >
                      {history.map((entry) => (
                        <li key={entry.card}>{entry.text.replace(/\n/g, " · ")}</li>
                      ))}
                    </ol>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * The three lines of the classic, each a button: tap one and only that line
 * changes. The label is the line's name and the prompt is its text, so a
 * screen reader hears "Who: two neighbours who share a fence…, button".
 */
function ClassicCard({
  parts,
  onRedraw,
}: {
  parts: ClassicDraw;
  onRedraw: (part: ClassicPart) => void;
}) {
  return (
    <div className="mt-4 grid gap-2" data-testid="classic-card">
      {CLASSIC_PARTS.map((part) => {
        const pick = parts[part];
        return (
          <ToolChoice
            key={part}
            palette="page"
            data-part={part}
            onClick={() => onRedraw(part)}
            title="Tap to change just this line"
            className="flex w-full items-baseline gap-3 px-4 py-3 sm:gap-4"
          >
            <span className="text-foreground-dim w-12 shrink-0 text-xs tracking-wider uppercase sm:w-14">
              {CLASSIC_PART_LABELS[part]}
            </span>
            <span
              key={pick?.prompt.id ?? "spent"}
              data-testid={`classic-${part}`}
              className="text-foreground-strong animate-fade-in text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl lg:text-3xl xl:text-4xl"
            >
              {pick ? pick.prompt.text : "Every one seen. Tap to start this line again."}
            </span>
          </ToolChoice>
        );
      })}
    </div>
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
    <ToolChoice
      palette={hero ? "hero" : "page"}
      onClick={(event) => onChoose(room, event)}
      aria-labelledby={labelId}
      aria-describedby={descId}
      className="group flex min-h-14 w-full items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4"
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
            hero ? "text-hero-muted" : "text-foreground-dim",
            compact ? "hidden sm:block" : "block",
          ].join(" ")}
        >
          {room.description}
        </span>
      </span>
      <span
        className={[
          "hidden shrink-0 transition-transform group-hover:translate-x-1 sm:inline",
          hero ? "text-hero-muted/60" : "text-foreground-dim",
        ].join(" ")}
      >
        &rarr;
      </span>
    </ToolChoice>
  );
}

function KindButton({
  kind,
  detail,
  onChoose,
}: {
  kind: PromptKindInfo;
  /** The pool's size, or the ways the classic can fall. */
  detail: string;
  onChoose: (kind: PromptKindInfo) => void;
}) {
  const labelId = useId();
  const descId = useId();
  return (
    <ToolChoice
      palette="page"
      onClick={() => onChoose(kind)}
      aria-labelledby={labelId}
      aria-describedby={descId}
      className="group flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3"
    >
      <span className="min-w-0">
        <span id={labelId} className="text-foreground-strong block text-base font-semibold">
          {kind.label}
        </span>
        <span id={descId} className="text-foreground-dim mt-0.5 block text-xs">
          {detail}
        </span>
      </span>
      <span className="text-foreground-dim shrink-0 transition-transform group-hover:translate-x-1">
        &rarr;
      </span>
    </ToolChoice>
  );
}
