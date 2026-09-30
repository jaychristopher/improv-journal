"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  CLASSIC_PART_LABELS,
  CLASSIC_PARTS,
  type ClassicPart,
  conceptGloss,
  DEFAULT_USE_CASE,
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
 * The hero on /improv-prompts, and the tool on /tools/improv-prompt-generator.
 *
 * Closed, it is a card that asks one thing: what kind of start? Seven
 * buttons, an icon and a label each — the classic who-where-what and the six
 * kinds the guide has a section for. The first tap takes over the viewport
 * and hands the reader a prompt of that kind, and another, and another —
 * best first, never a repeat on this device — until they close it from the
 * corner.
 *
 * Until 2026-09-30 the first question was where the reader was using it, and
 * the kind came second. The owner's reading was that the room is nominally
 * useful next to the kind, so the rooms are blended into one ranking by
 * default and the room became a setting: a cog in the corner opens it, it
 * stays on the device, and a school or a work room still filters the pool
 * the way the guide says (docs/improv-prompts-personas.md, "What to do").
 * The cog also holds how many prompts a card deals at once and whether the
 * card changes on its own — the two things Andi Smith's generator has that
 * a teacher running rounds reaches for — and a way to forget what the
 * device has seen. Nothing else is a control. The room descriptions that
 * sat under the four buttons went with them; a button says its label and
 * shows its icon.
 *
 * The inline card renders on the server, so the html carries the way in. The
 * dialog is client-only, which is fine: nothing in it is a route.
 */

type Step = "kind" | "prompt" | "settings";

interface Draw {
  kind: PromptKind;
  /** The prompts on the card: one, or as many as the cog says. Empty when the pool is spent. */
  picks: Pick[];
  /** The pool a single kind draws from, or the ways the classic can fall. */
  poolSize: number;
  /** The three lines of the classic; null on a single kind. */
  parts: ClassicDraw | null;
  drawnAt: number;
  /** The nth card dealt this session; focus and the clock are keyed on it. */
  card: number;
}

/** How many a card can deal at once. Andi Smith's generator offers 1 to 8. */
const COUNTS = [1, 2, 3, 4, 6, 8] as const;
/** Seconds before the card changes on its own; 0 is off. */
const EVERY = [0, 30, 60, 120, 180, 300] as const;

/** What the cog holds. Kept on the device. */
interface Settings {
  /** The room, or `any` for the blend of all four. */
  room: PromptUseCase;
  /** Prompts per card, for a teacher dealing to pairs. The classic stays one card. */
  count: number;
  /** Seconds between cards when the card runs itself; 0 leaves it to the reader. */
  every: number;
}

const SETTINGS_KEY = "improv-prompts:settings:v1";
const DEFAULT_SETTINGS: Settings = { room: DEFAULT_USE_CASE, count: 1, every: 0 };

function readSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const stored = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    const count = COUNTS.find((c) => c === stored.count) ?? DEFAULT_SETTINGS.count;
    const every = EVERY.find((e) => e === stored.every) ?? DEFAULT_SETTINGS.every;
    return {
      room: PROMPT_USE_CASES.find((u) => u.id === stored.room)?.id ?? DEFAULT_USE_CASE,
      count,
      every,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: Settings) {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // A locked-down browser forgets, and the cog asks again next time. Fine.
  }
}

/** "30 s", "1 min", "2 min", for the timer's buttons. */
function everyLabel(seconds: number): string {
  if (seconds === 0) return "Off";
  return seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;
}

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/**
 * Where the generator is mounted. The guide hero is a card above the article
 * and links out to the tool page; the tool page is the full version and owns
 * the "improv prompt generator" keyword, so the hero's heading stays neutral
 * rather than competing with it.
 */
type PromptGeneratorSurface = "guide-hero" | "tool-page";

/** Whether a card has anything on it, single or classic. */
function hasPrompt(draw: Draw): boolean {
  return draw.parts ? CLASSIC_PARTS.some((part) => draw.parts?.[part]) : draw.picks.length > 0;
}

/** The card's words, for the clipboard: one a line. */
function textOf(draw: Draw): string {
  return draw.parts ? classicText(draw.parts) : draw.picks.map((p) => p.prompt.text).join("\n");
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
  const [step, setStep] = useState<Step>("kind");
  // Read from the device on the client's first render and defaulted on the
  // server. The inline card renders the same html either way — the settings
  // only touch what the dialog draws — so hydration has nothing to disagree
  // about, and no effect has to set state after mount.
  const [settings, setSettings] = useState<Settings>(() =>
    typeof window === "undefined" ? DEFAULT_SETTINGS : readSettings(),
  );
  const [kind, setKind] = useState<PromptKind | null>(null);
  // What a screen reader hears when a card changes.
  const [announce, setAnnounce] = useState("");
  const promptRef = useRef<HTMLElement | null>(null);
  const [draw, setDraw] = useState<Draw | null>(null);
  const [draws, setDraws] = useState(0);
  const [copied, setCopied] = useState(false);
  const [forgotten, setForgotten] = useState(false);
  const [now, setNow] = useState(0);
  const [store] = useState<SeenStore>(() => createSeenStore(browserStorage()));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef(0);
  const keysRef = useRef<(event: KeyboardEvent) => void>(() => {});
  const autoRef = useRef<() => void>(() => {});
  const headingId = useId();
  const roomGroupId = useId();
  const countGroupId = useId();
  const everyGroupId = useId();

  const { room, count, every } = settings;
  const roomInfo = PROMPT_USE_CASES.find((u) => u.id === room) ?? PROMPT_USE_CASES[0];
  const roomSet = room !== DEFAULT_USE_CASE;
  const kindInfo = PROMPT_KINDS.find((c) => c.id === kind) ?? null;
  // The first concept is the one the kind *is*; the rest are the sidebar's
  // business. Nothing when the page passed no map or the kind has none.
  const concept = kindInfo ? (concepts?.[kindInfo.id]?.[0] ?? null) : null;
  const card = draw?.card ?? 0;

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

  // A new card takes focus, so a screen reader reads it and a keyboard's
  // Space or Enter still draws the next from there. A redrawn line keeps the
  // card number and so keeps focus on the line that was tapped; the live
  // region carries that one. Declared after the effect above so that when
  // the first tap opens the dialog straight onto a card, the card wins the
  // focus rather than the first button in the header.
  useEffect(() => {
    if (!open || step !== "prompt" || card === 0) return;
    promptRef.current?.focus();
  }, [open, step, card]);

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
  // asking them to set anything. The tick is the only writer: a fresh card's
  // first second reads 0:00 because `elapsed` clamps at zero, so nothing is
  // set inside the effect.
  useEffect(() => {
    if (!open || step !== "prompt" || card === 0) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, step, card]);

  // The card runs itself when the cog says so: after `every` seconds the
  // next card is dealt, as long as this one had something on it. Leaving the
  // prompt step, or the dialog, cancels it.
  useEffect(() => {
    if (!open || step !== "prompt" || card === 0 || every === 0) return;
    const timer = window.setTimeout(() => autoRef.current(), every * 1000);
    return () => window.clearTimeout(timer);
  }, [open, step, card, every]);

  function drawFrom(nextKind: PromptKind, reset = false) {
    const cardNumber = ++cardRef.current;
    let next: Draw;
    if (nextKind === "classic") {
      const pools = classicPools(PROMPT_BANK, room);
      if (reset) {
        store.forget(CLASSIC_PARTS.flatMap((part) => pools[part].map((p) => p.id)));
        trackEvent("prompt_generator_reset", { use_case: room, category: nextKind });
      }
      const parts = pickClassic(PROMPT_BANK, room, store.seen());
      const picks = CLASSIC_PARTS.map((part) => parts[part]).filter((p): p is Pick => p !== null);
      if (picks.length > 0) {
        for (const pick of picks) store.markSeen(pick.prompt.id);
        setDraws((n) => n + 1);
        trackEvent("prompt_generated", {
          surface,
          use_case: room,
          category: nextKind,
          band: Math.max(...picks.map((p) => p.band)),
          prompt_id: picks.map((p) => p.prompt.id).join("+"),
          remaining: Math.min(...picks.map((p) => p.remaining)),
        });
      } else {
        trackEvent("prompt_generator_exhausted", {
          use_case: room,
          category: nextKind,
          pool: CLASSIC_PARTS.reduce((n, part) => n + pools[part].length, 0),
        });
      }
      next = {
        kind: nextKind,
        picks: [],
        poolSize: classicCombinations(PROMPT_BANK, room),
        parts,
        drawnAt: Date.now(),
        card: cardNumber,
      };
    } else {
      const category: PromptCategory = nextKind;
      const pool = poolFor(PROMPT_BANK, category, room);
      if (reset) {
        store.forget(pool.map((p) => p.id));
        trackEvent("prompt_generator_reset", { use_case: room, category });
      }
      // As many as the cog asks for, each marked seen before the next is
      // drawn, so a card of four is four different prompts and the pool
      // remembers all of them. A pool with fewer left deals what it has.
      const picks: Pick[] = [];
      for (let i = 0; i < count; i++) {
        const pick = pickNext(pool, room, store.seen());
        if (!pick) break;
        store.markSeen(pick.prompt.id);
        picks.push(pick);
      }
      if (picks.length > 0) {
        setDraws((n) => n + 1);
        trackEvent("prompt_generated", {
          surface,
          use_case: room,
          category,
          band: Math.max(...picks.map((p) => p.band)),
          prompt_id: picks.map((p) => p.prompt.id).join("+"),
          remaining: picks[picks.length - 1].remaining,
        });
      } else {
        trackEvent("prompt_generator_exhausted", {
          use_case: room,
          category,
          pool: pool.length,
        });
      }
      next = {
        kind: nextKind,
        picks,
        poolSize: pool.length,
        parts: null,
        drawnAt: Date.now(),
        card: cardNumber,
      };
    }
    setCopied(false);
    setDraw(next);
    setAnnounce(
      next.parts
        ? CLASSIC_PARTS.map(
            (part) =>
              `${CLASSIC_PART_LABELS[part]}: ${next.parts?.[part]?.prompt.text ?? "every one seen"}`,
          ).join(". ")
        : next.picks.length > 0
          ? next.picks.map((p) => p.prompt.text).join(". ")
          : `You have seen every ${nextKind} prompt.`,
    );
    setStep("prompt");
  }

  /**
   * One line of the classic, redrawn on its own: the lock-and-regenerate the
   * field does with padlocks, done by tapping the line you want to change.
   * A spent line starts its own pool again rather than going blank.
   */
  function redrawPart(part: ClassicPart) {
    if (!draw?.parts) return;
    const pool = poolFor(PROMPT_BANK, part, room, { combinable: true });
    let pick = pickNext(pool, room, store.seen());
    if (!pick) {
      store.forget(pool.map((p) => p.id));
      trackEvent("prompt_generator_reset", { use_case: room, category: part });
      pick = pickNext(pool, room, store.seen());
    }
    if (!pick) return;
    store.markSeen(pick.prompt.id);
    trackEvent("prompt_line_redrawn", {
      surface,
      use_case: room,
      part,
      prompt_id: pick.prompt.id,
      remaining: pick.remaining,
    });
    const next: Draw = { ...draw, parts: { ...draw.parts, [part]: pick } };
    setCopied(false);
    setDraw(next);
    setAnnounce(`${CLASSIC_PART_LABELS[part]}: ${pick.prompt.text}`);
  }

  function takeOver(event: React.MouseEvent<HTMLButtonElement>, why: string) {
    if (open) return;
    openerRef.current = event.currentTarget;
    setOpen(true);
    trackEvent("prompt_generator_opened", { surface, use_case: room, category: why });
  }

  /** The one question: a kind, and straight to a prompt of it. */
  function chooseKind(next: PromptKindInfo, event: React.MouseEvent<HTMLButtonElement>) {
    takeOver(event, next.id);
    setKind(next.id);
    trackEvent("prompt_generator_category", { use_case: room, category: next.id });
    drawFrom(next.id);
  }

  function openSettings(event: React.MouseEvent<HTMLButtonElement>) {
    takeOver(event, "settings");
    setForgotten(false);
    setStep("settings");
  }

  /** Back to the card if there is one, else to the question. */
  function closeSettings() {
    setStep(draw ? "prompt" : "kind");
  }

  function changeSettings(change: Partial<Settings>) {
    const next = { ...settings, ...change };
    setSettings(next);
    writeSettings(next);
    trackEvent("prompt_generator_settings", {
      use_case: next.room,
      count: next.count,
      every: next.every,
    });
  }

  /** Every pool starts again from its strongest prompts. */
  function forgetAll() {
    store.forget(PROMPT_BANK.map((p) => p.id));
    setForgotten(true);
    trackEvent("prompt_generator_reset", { use_case: room, category: "all" });
  }

  async function copyPrompt(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      trackEvent("prompt_copied", { use_case: room, category: kind });
    } catch {
      // No clipboard in this context. The text is on screen; nothing to do.
    }
  }

  // The keys, for a host running a show from a laptop: Space or Enter for
  // another one, C to copy, K for a different kind. Only on the prompt step,
  // and never while a control has focus, where Space and Enter already mean
  // "press this". Kept on a ref so the listener above never goes stale and
  // never has to be re-attached for a state change. The timer's callback
  // lives on a ref for the same reason.
  useEffect(() => {
    keysRef.current = (event: KeyboardEvent) => {
      if (step !== "prompt" || !draw || !kind) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea, select, [contenteditable]")) return;
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        drawFrom(kind, !hasPrompt(draw));
      } else if (event.key === "c" || event.key === "C") {
        void copyPrompt(textOf(draw));
      } else if (event.key === "k" || event.key === "K") {
        setStep("kind");
      }
    };
    autoRef.current = () => {
      if (step !== "prompt" || !draw || !kind || !hasPrompt(draw)) return;
      trackEvent("prompt_generator_auto", { use_case: room, category: kind, every });
      drawFrom(kind);
    };
  });

  const elapsed = draw ? Math.max(0, Math.floor((now - draw.drawnAt) / 1000)) : 0;
  const single = draw && !draw.parts && draw.picks.length === 1 ? draw.picks[0] : null;
  const cast = draw?.parts
    ? CLASSIC_PARTS.some((part) => draw.parts?.[part]?.prompt.cast === "group")
      ? "group"
      : null
    : (single?.prompt.cast ?? null);
  // The how-to, coaching, cast and theory lines are written for the person
  // holding the device. With the room set to a show a laptop is a projector,
  // and the audience should see the question and not the host's notes, so
  // there they sit under the buttons in small type.
  const notesAtFoot = room === "show";
  const notes =
    kindInfo && draw && hasPrompt(draw) ? (
      <div
        data-testid="prompt-notes"
        data-notes={notesAtFoot ? "foot" : "card"}
        className={notesAtFoot ? "text-foreground-dim mt-8 max-w-2xl text-xs leading-relaxed" : ""}
      >
        <p
          className={
            notesAtFoot
              ? ""
              : "text-foreground/80 mt-6 max-w-md text-sm leading-relaxed lg:max-w-2xl lg:text-lg"
          }
        >
          {kindInfo.howToUse}
        </p>
        {single?.prompt.coach && (
          <p
            className={
              notesAtFoot
                ? "mt-2"
                : "text-foreground/80 mt-3 max-w-md text-sm leading-relaxed lg:max-w-2xl lg:text-base"
            }
            data-testid="prompt-coach"
          >
            <span className="text-foreground-dim text-xs tracking-wider uppercase">Coaching</span>{" "}
            {single.prompt.coach}
          </p>
        )}
        {cast && (
          <p
            className={notesAtFoot ? "mt-2" : "text-foreground-dim mt-3 text-sm"}
            data-testid="prompt-cast"
          >
            {cast === "group" ? (
              "Needs three or more."
            ) : (
              <>
                Works for two &mdash;{" "}
                <Link href="/2-person-improv-games" className="underline underline-offset-2">
                  2 person improv games
                </Link>{" "}
                has the rest.
              </>
            )}
          </p>
        )}
        {/* The kind is a concept under another name, and howToUse is that
            concept's page in a sentence, so the sentence is reused as the
            gloss and the title becomes the link: every prompt is one click
            from its theory (tracker entry 332). Nothing for a kind without a
            concept, or a mount without the resolved map. */}
        {concept && (
          <p
            className={
              notesAtFoot
                ? "mt-2"
                : "text-foreground-dim mt-3 max-w-md text-sm leading-relaxed lg:max-w-2xl"
            }
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
      </div>
    ) : null;

  // The classic takes the full row above the six single kinds: it is the one
  // every generator offers and the one a reader arriving from "scene
  // generator" expects. The six are tiles, the icon above the label.
  const kindGrid = (hero: boolean) => (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
      {PROMPT_KINDS.map((each) => (
        <KindButton
          key={each.id}
          kind={each}
          onChoose={chooseKind}
          hero={hero}
          row={each.id === "classic"}
        />
      ))}
    </div>
  );

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open} takeover={surface === "guide-hero"}>
        <div
          data-track="prompt-generator"
          // Two columns across the 16:9 panel from `lg`: stacked, this content
          // is taller than the aspect allows and the ends of it were clipped.
          className={
            surface === "guide-hero"
              ? "lg:grid lg:grid-cols-[1fr_1.25fr] lg:items-center lg:gap-12"
              : ""
          }
        >
          <div className="pr-12">
            {/* Not a heading: the hero sits above the article, and a heading
                here put an h2 before the page's h1. The region is labelled by
                it all the same. It says what the page is in the words a
                searcher typed — the count and "improv prompts" — because
                "Give me a prompt" told someone landing from search nothing
                about what they had found (the owner, 2026-09-30). The count
                is the bank's, so it cannot drift. Never "generator": the tool
                page owns that term. */}
            <p
              id={headingId}
              className="text-hero-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
            >
              {/* One string, so the server html carries the phrase whole
                  rather than the count and the words split by a marker. */}
              {`${PROMPT_BANK.length} improv prompts`}
            </p>
            <p className="text-hero-muted mt-2 max-w-md text-base leading-relaxed lg:mt-4">
              Scene starters for a class, a show or a school room, best first. Pick the kind of
              start you need.
            </p>
          </div>
          <div className="mt-6 lg:mt-0">{kindGrid(true)}</div>
          <button
            type="button"
            onClick={openSettings}
            aria-label="Settings"
            title="Settings: the room, how many at a time, and a timer"
            // Pinned to the panel's own corner (HeroTakeover is `relative`).
            // On a phone the takeover starts under the floating nav, so the
            // cog sits below the nav's icons and beside the heading, which
            // keeps `pr-12` clear for it; from `lg` it goes to the corner.
            className={[
              "text-hero-muted hover:text-hero-foreground hover:bg-hero-foreground/10 absolute flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors",
              surface === "guide-hero"
                ? "top-[5.5rem] right-4 lg:top-4 lg:right-4"
                : "top-3 right-3",
            ].join(" ")}
          >
            <CogIcon />
          </button>
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
          {/* What changed, for a screen reader: the new card, or the one line
              that was redrawn. Visually nothing. */}
          <div role="status" aria-live="polite" className="sr-only" data-testid="prompt-announce">
            {announce}
          </div>
          <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-8">
            <div className="text-foreground-dim min-w-0 text-xs tracking-wider uppercase">
              {step === "kind" && "What kind of start?"}
              {step === "settings" && "Settings"}
              {step === "prompt" && kindInfo && (
                <span className="block truncate">
                  {kindInfo.label}
                  {roomSet && <> &middot; {roomInfo.label}</>}
                </span>
              )}
            </div>
            <div className="-mr-2 flex shrink-0 items-center gap-1">
              {step !== "settings" && (
                <button
                  type="button"
                  onClick={openSettings}
                  aria-label="Settings"
                  title="Settings: the room, how many at a time, and a timer"
                  className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors"
                >
                  <CogIcon />
                </button>
              )}
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-foreground/80 hover:text-foreground hover:bg-foreground/5 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full transition-colors"
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
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-8">
            {step === "kind" && (
              <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6">
                <h2 className="text-foreground-strong text-3xl font-semibold tracking-tight">
                  What kind of start?
                </h2>
                <div className="mt-6">{kindGrid(false)}</div>
              </div>
            )}

            {step === "settings" && (
              <div
                className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-6"
                data-testid="prompt-settings"
              >
                <h2 className="text-foreground-strong text-3xl font-semibold tracking-tight">
                  Settings
                </h2>
                <p className="text-foreground/80 mt-2 text-sm">
                  Kept on this device, and applied from the next card.
                </p>

                <p
                  id={roomGroupId}
                  className="text-foreground-dim mt-6 text-xs tracking-wider uppercase"
                >
                  Playing in
                </p>
                <div
                  className="mt-2 grid gap-2 sm:grid-cols-2"
                  role="group"
                  aria-labelledby={roomGroupId}
                >
                  {PROMPT_USE_CASES.map((each) => (
                    <RoomOption
                      key={each.id}
                      room={each}
                      selected={each.id === room}
                      onChoose={(next) => changeSettings({ room: next.id })}
                    />
                  ))}
                </div>
                <p className="text-foreground-dim mt-2 text-xs">
                  A room shifts the ranking; a school or a work room also keeps out what the guide
                  says to keep out of one.
                </p>

                <p
                  id={countGroupId}
                  className="text-foreground-dim mt-6 text-xs tracking-wider uppercase"
                >
                  How many at a time
                </p>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby={countGroupId}
                >
                  {COUNTS.map((each) => (
                    <ToolChoice
                      key={each}
                      palette="page"
                      selected={each === count}
                      onClick={() => changeSettings({ count: each })}
                      data-count={each}
                      className="min-h-11 min-w-11 px-4 text-center text-sm font-semibold"
                    >
                      {each}
                    </ToolChoice>
                  ))}
                </div>
                <p className="text-foreground-dim mt-2 text-xs">
                  For dealing to pairs. The who, where, what card is always one.
                </p>

                <p
                  id={everyGroupId}
                  className="text-foreground-dim mt-6 text-xs tracking-wider uppercase"
                >
                  Change on its own
                </p>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  role="group"
                  aria-labelledby={everyGroupId}
                >
                  {EVERY.map((each) => (
                    <ToolChoice
                      key={each}
                      palette="page"
                      selected={each === every}
                      onClick={() => changeSettings({ every: each })}
                      data-every={each}
                      className="min-h-11 px-4 text-center text-sm font-semibold"
                    >
                      {everyLabel(each)}
                    </ToolChoice>
                  ))}
                </div>
                <p className="text-foreground-dim mt-2 text-xs">
                  A round each, with no one at the laptop. The clock counts it down.
                </p>

                <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <ToolAction onClick={closeSettings} className="min-h-12 px-6 text-sm">
                    Done
                  </ToolAction>
                  <ToolAction
                    kind="secondary"
                    onClick={forgetAll}
                    disabled={forgotten}
                    className="min-h-12 px-5 text-sm font-medium"
                  >
                    {forgotten
                      ? "Forgotten. Every pool starts again."
                      : "Forget what this device has seen"}
                  </ToolAction>
                </div>
              </div>
            )}

            {step === "prompt" && draw && kindInfo && (
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
                          : `${draw.picks[draw.picks.length - 1].remaining} of ${draw.poolSize} left`}
                        <span aria-hidden="true"> &middot; </span>
                        <span data-testid="prompt-clock">
                          {every > 0
                            ? `${clock(Math.max(0, every - elapsed))} until the next`
                            : `${clock(elapsed)} on this one`}
                        </span>
                      </p>
                      {draw.parts ? (
                        <ClassicCard
                          parts={draw.parts}
                          onRedraw={redrawPart}
                          focusRef={promptRef}
                        />
                      ) : single ? (
                        <p
                          key={single.prompt.id}
                          ref={promptRef as React.RefObject<HTMLParagraphElement | null>}
                          tabIndex={-1}
                          data-testid="prompt-text"
                          className="text-foreground-strong animate-fade-in mt-4 text-3xl leading-tight font-semibold tracking-tight text-balance outline-none sm:text-4xl lg:text-5xl xl:text-6xl"
                        >
                          {single.prompt.text}
                        </p>
                      ) : (
                        // A hand of them, numbered so a teacher can say
                        // "pair three, yours is the third".
                        <ol
                          key={draw.card}
                          ref={promptRef as React.RefObject<HTMLOListElement | null>}
                          tabIndex={-1}
                          data-testid="prompt-set"
                          className="text-foreground-strong animate-fade-in mt-4 grid gap-3 outline-none sm:gap-4"
                        >
                          {draw.picks.map((pick, i) => (
                            <li
                              key={pick.prompt.id}
                              data-testid="prompt-item"
                              className="flex items-baseline gap-3 text-xl leading-snug font-semibold tracking-tight text-balance sm:text-2xl lg:text-3xl"
                            >
                              <span className="text-foreground-dim w-6 shrink-0 text-sm tabular-nums">
                                {i + 1}
                              </span>
                              <span className="[overflow-wrap:anywhere]">{pick.prompt.text}</span>
                            </li>
                          ))}
                        </ol>
                      )}
                      {!notesAtFoot && notes}
                    </>
                  ) : (
                    <>
                      <p className="text-foreground-dim text-xs tracking-wider uppercase">
                        That is all of them
                      </p>
                      <h2 className="text-foreground-strong mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                        You have seen every {kindInfo.label.toLowerCase()} prompt
                        {roomSet && <> for {roomInfo.label.toLowerCase()}</>}.
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
                        onClick={() => drawFrom(kindInfo.id)}
                        className="min-h-14 flex-1 px-5 text-base sm:flex-none sm:px-8"
                      >
                        {draw.picks.length > 1 ? "Another hand" : "Another one"}
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
                      onClick={() => drawFrom(kindInfo.id, true)}
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
                {notesAtFoot && notes}
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
  focusRef,
}: {
  parts: ClassicDraw;
  onRedraw: (part: ClassicPart) => void;
  /** Takes focus when a new card is dealt, so a screen reader reads all three lines. */
  focusRef: React.RefObject<HTMLElement | null>;
}) {
  return (
    <div
      ref={focusRef as React.RefObject<HTMLDivElement | null>}
      tabIndex={-1}
      className="mt-4 grid gap-2 outline-none"
      data-testid="classic-card"
    >
      {CLASSIC_PARTS.map((part) => {
        const pick = parts[part];
        return (
          <ToolChoice
            key={part}
            palette="page"
            data-part={part}
            onClick={() => onRedraw(part)}
            aria-label={`Change the ${CLASSIC_PART_LABELS[part].toLowerCase()} line: ${
              pick ? pick.prompt.text : "every one seen, start this line again"
            }`}
            title="Tap to change just this line"
            // The label stacks above the words below 360px and the words wrap
            // anywhere, so 200% text on a small phone reads instead of clipping.
            className="flex w-full flex-col items-start gap-1 px-4 py-3 min-[360px]:flex-row min-[360px]:items-baseline min-[360px]:gap-3 sm:gap-4"
          >
            <span className="text-foreground-dim shrink-0 text-xs tracking-wider uppercase min-[360px]:w-12 sm:w-14">
              {CLASSIC_PART_LABELS[part]}
            </span>
            <span
              key={pick?.prompt.id ?? "spent"}
              data-testid={`classic-${part}`}
              className="text-foreground-strong animate-fade-in text-xl leading-snug font-semibold tracking-tight text-balance [overflow-wrap:anywhere] sm:text-2xl lg:text-3xl xl:text-4xl"
            >
              {pick ? pick.prompt.text : "Every one seen. Tap to start this line again."}
            </span>
          </ToolChoice>
        );
      })}
    </div>
  );
}

/**
 * A kind of start: its icon and its label, and nothing under them. A tile —
 * the icon above the label, centred — or, for the classic across the full
 * row, the two side by side.
 */
function KindButton({
  kind,
  onChoose,
  hero = false,
  row = false,
}: {
  kind: PromptKindInfo;
  onChoose: (kind: PromptKindInfo, event: React.MouseEvent<HTMLButtonElement>) => void;
  /** On the dark takeover panel rather than on the page's own background. */
  hero?: boolean;
  /** Across the full row, icon beside label. */
  row?: boolean;
}) {
  return (
    <ToolChoice
      palette={hero ? "hero" : "page"}
      onClick={(event) => onChoose(kind, event)}
      data-kind={kind.id}
      className={
        row
          ? "col-span-full flex min-h-14 w-full items-center justify-center gap-3 px-4 py-3"
          : "flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 px-2 py-3 text-center"
      }
    >
      <KindIcon
        kind={kind.id}
        className={[
          row ? "h-5 w-5" : "h-6 w-6",
          hero ? "text-hero-muted" : "text-foreground-dim",
        ].join(" ")}
      />
      <span
        className={[
          "text-sm leading-tight font-semibold",
          row ? "sm:text-base" : "",
          hero ? "text-hero-foreground" : "text-foreground-strong",
        ].join(" ")}
      >
        {kind.label}
      </span>
    </ToolChoice>
  );
}

/** One room in the settings: pressed when it is the one set. */
function RoomOption({
  room,
  selected,
  onChoose,
}: {
  room: PromptUseCaseInfo;
  selected: boolean;
  onChoose: (room: PromptUseCaseInfo) => void;
}) {
  return (
    <ToolChoice
      palette="page"
      selected={selected}
      onClick={() => onChoose(room)}
      data-room={room.id}
      className="flex min-h-12 w-full flex-col items-start px-4 py-2.5"
    >
      <span className="text-foreground-strong text-sm font-semibold">{room.label}</span>
      <span className="text-foreground-dim text-xs">{room.description}</span>
    </ToolChoice>
  );
}

const ICON_PROPS = {
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** One icon a kind, drawn here so nothing is loaded for seven glyphs. */
function KindIcon({ kind, className }: { kind: PromptKind; className: string }) {
  const props = { ...ICON_PROPS, className: `shrink-0 ${className}` };
  switch (kind) {
    case "classic":
      // Three lines: who, where, what.
      return (
        <svg {...props}>
          <circle cx="5" cy="6" r="1" />
          <path d="M10 6h10" />
          <circle cx="5" cy="12" r="1" />
          <path d="M10 12h10" />
          <circle cx="5" cy="18" r="1" />
          <path d="M10 18h10" />
        </svg>
      );
    case "relationship":
      // Two people.
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.25" />
          <path d="M2.75 19.5a6.25 6.25 0 0112.5 0" />
          <circle cx="17" cy="9.5" r="2.5" />
          <path d="M15.5 19.5h5.75a4.75 4.75 0 00-5-4.6" />
        </svg>
      );
    case "first-line":
      // A speech bubble.
      return (
        <svg {...props}>
          <path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v7a2.5 2.5 0 01-2.5 2.5H10l-4.5 3.5V16h-.5A2.5 2.5 0 014 13.5v-7z" />
          <path d="M8.5 9h7M8.5 12h4" />
        </svg>
      );
    case "location":
      // A pin.
      return (
        <svg {...props}>
          <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0113 0c0 5.2-6.5 11-6.5 11z" />
          <circle cx="12" cy="10" r="2.25" />
        </svg>
      );
    case "situation":
      // Something wrong.
      return (
        <svg {...props}>
          <path d="M12 4.5l8.25 14.25H3.75L12 4.5z" />
          <path d="M12 10v3.5" />
          <circle cx="12" cy="16.25" r="0.5" fill="currentColor" />
        </svg>
      );
    case "audience-question":
      // A question.
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.5 9.5a2.5 2.5 0 015 0c0 1.75-2.5 2-2.5 3.75" />
          <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
        </svg>
      );
    case "task":
      // A job, ticked.
      return (
        <svg {...props}>
          <rect x="5" y="6" width="14" height="15" rx="2" />
          <path d="M9 4h6v3.5H9z" />
          <path d="M9 14l2 2 4-4" />
        </svg>
      );
  }
}

function CogIcon() {
  return (
    <svg {...ICON_PROPS} className="h-6 w-6">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
