"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  GAME_JOBS,
  type GameJob,
  type GamePools,
  type JobInfo,
  type PickableGame,
  type Symptom,
  SYMPTOMS,
} from "@/lib/game-picker";
import { browserStorage, createSeenStore, type SeenStore } from "@/lib/prompt-generator";

import { HeroTakeover } from "./HeroTakeover";

/**
 * The hero on /improv-games.
 *
 * The page argues two things about choosing and this runs both of them. A
 * game is reached for one of three jobs, and reaching for the wrong kind is
 * the most common way a session goes flat; and inside the middle job the way
 * to choose is to name what is going wrong rather than find something that
 * sounds fun. So the tool asks what it is for, then — where that answer is
 * "fix something" — what is failing, and hands over one game with its rules.
 *
 * A reader standing in front of a room does not want 41 cards and two
 * filters, which is what the page under this already is. It does not want a
 * second page either: the hub used to open with a card sending them to the
 * exercise picker, and that hop is the thing this replaces.
 *
 * Closed, it is a card with three buttons and it renders on the server, so
 * the html carries the way in. The dialog is client-only; nothing in it is a
 * route.
 */

type Step = "job" | "symptom" | "game";

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Per-device, so a second session does not open on the game the first closed on. */
const SEEN_KEY = "improv-games:seen";

export function GamePicker({ pools }: { pools: GamePools }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("job");
  const [job, setJob] = useState<GameJob | null>(null);
  const [symptom, setSymptom] = useState<Symptom | null>(null);
  const [game, setGame] = useState<PickableGame | null>(null);
  const [dealt, setDealt] = useState(0);
  const [store] = useState<SeenStore>(() => createSeenStore(browserStorage(), SEEN_KEY));
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  const close = useCallback(() => {
    trackEvent("game_picker_closed", { job, dealt });
    setOpen(false);
  }, [job, dealt]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = "";
      // After the re-render, or the hero card is still inert and refuses it.
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

  /**
   * Deal from a pool of ids, preferring one this device has not been given.
   *
   * A symptom pool is ordered — the games the page itself names for it come
   * first — so the unseen ones are taken in order rather than at random, and
   * a reader who asks about listening is handed Mirroring, which is the
   * answer the prose underneath would have given them.
   */
  function dealFrom(ids: string[], forJob: GameJob, forSymptom: Symptom | null) {
    if (ids.length === 0) return;
    const seen = store.seen();
    let unseen = ids.filter((id) => !seen.has(id));
    if (unseen.length === 0) {
      store.forget(ids);
      unseen = ids;
    }
    const next = pools.games[unseen[0]];
    if (!next) return;
    store.markSeen(next.id);
    setGame(next);
    setDealt((count) => count + 1);
    setStep("game");
    trackEvent("improv_game_dealt", {
      job: forJob,
      symptom: forSymptom?.id ?? null,
      game_id: next.id,
      remaining: unseen.length - 1,
    });
  }

  function chooseJob(next: JobInfo, event: React.MouseEvent<HTMLButtonElement>) {
    setJob(next.id);
    setSymptom(null);
    if (!open) {
      openerRef.current = event.currentTarget;
      setOpen(true);
      trackEvent("game_picker_opened", { job: next.id });
    }
    // Only the middle job asks a second question. A warm-up has no wrong
    // answers by the page's own account, and a performance game is chosen to
    // be watched rather than to fix anything.
    if (next.id === "fix") {
      setStep("symptom");
      return;
    }
    dealFrom(pools.jobs[next.id], next.id, null);
  }

  function chooseSymptom(next: Symptom) {
    setSymptom(next);
    trackEvent("game_picker_symptom", { symptom: next.id });
    dealFrom(pools.symptoms[next.id] ?? [], "fix", next);
  }

  function again() {
    if (!job) return;
    dealFrom(symptom ? (pools.symptoms[symptom.id] ?? []) : pools.jobs[job], job, symptom);
  }

  const jobInfo = GAME_JOBS.find((info) => info.id === job);
  const total = Object.keys(pools.games).length;

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open}>
        <div
          data-track="game-picker"
          className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12"
        >
          <div>
            <h2
              id={headingId}
              className="text-hero-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Give me a game
            </h2>
            <p className="text-hero-muted mt-3 max-w-lg text-base leading-relaxed lg:mt-5">
              Say what you need it for. One game at a time with how to run it — and if something is
              going wrong, name it and get the game that makes it impossible.
            </p>
          </div>
          <div className="mt-6 lg:mt-0">
            <div className="grid gap-2 sm:gap-3">
              {GAME_JOBS.map((info) => (
                <button
                  key={info.id}
                  type="button"
                  onClick={(event) => chooseJob(info, event)}
                  className="border-hero-foreground/15 hover:border-hero-foreground/40 hover:bg-hero-foreground/10 rounded-xl border p-3 text-left transition-colors sm:p-4"
                >
                  <span className="text-hero-foreground block text-sm font-semibold sm:text-base">
                    {info.label}
                  </span>
                  <span className="text-hero-muted mt-1 hidden text-xs leading-snug sm:block">
                    {info.note}
                  </span>
                </button>
              ))}
            </div>
            {/* The hub used to open with a card for this; a footnote keeps the
                edge without putting a second tool in front of the first. */}
            <p className="text-hero-muted/70 mt-5 text-xs">
              {total} games, every one of them on this page — or{" "}
              <Link href="/tools/exercise-picker" className="underline underline-offset-2">
                filter them by level and focus
              </Link>
              .
            </p>
          </div>
        </div>
      </HeroTakeover>

      {open && (
        <div
          className="bg-background/95 fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Give me a game"
          ref={dialogRef}
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-foreground/50 text-xs">
                {jobInfo?.label}
                {symptom ? ` · ${symptom.label.toLowerCase()}` : ""}
              </p>
              <button
                type="button"
                onClick={close}
                className="text-foreground/50 hover:text-foreground shrink-0 text-sm underline underline-offset-4"
              >
                Close
              </button>
            </div>

            {step === "job" && (
              <div className="mt-8">
                <h3 className="text-foreground-strong text-xl font-semibold">What is it for?</h3>
                <p className="text-foreground/60 mt-2 text-sm">
                  These get lumped together as improv games and they do three different jobs.
                  Reaching for the wrong kind is the most common way a session goes flat.
                </p>
                <div className="mt-5 grid gap-2">
                  {GAME_JOBS.map((info) => (
                    <button
                      key={info.id}
                      type="button"
                      onClick={(event) => chooseJob(info, event)}
                      className="border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 rounded-lg border p-4 text-left transition-colors"
                    >
                      <span className="text-foreground-strong block font-semibold">
                        {info.label}
                      </span>
                      <span className="text-foreground/50 mt-1 block text-xs leading-snug">
                        {info.note}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === "symptom" && (
              <div className="mt-8">
                <h3 className="text-foreground-strong text-xl font-semibold">
                  What is going wrong?
                </h3>
                <p className="text-foreground/60 mt-2 text-sm">
                  Almost every game here exists because some specific thing was failing and somebody
                  built a constraint that made it impossible.
                </p>
                <div className="mt-5 grid gap-2">
                  {SYMPTOMS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => chooseSymptom(entry)}
                      className="border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 text-foreground-strong rounded-lg border p-4 text-left font-semibold transition-colors"
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
                <p className="text-foreground/50 mt-5 text-xs leading-relaxed">
                  Cannot name it yet? That is its own problem and worth solving first —{" "}
                  <Link href="/how-it-works/diagnosis" className="underline underline-offset-2">
                    what it looks like when a scene breaks
                  </Link>
                  .
                </p>
              </div>
            )}

            {step === "game" && game && (
              <div className="mt-6">
                <span className="text-foreground/40 text-xs tracking-wider uppercase">
                  {game.kind === "format" ? "To play" : "To run"}
                </span>
                <h3 className="text-foreground-strong mt-1 text-2xl font-semibold sm:text-3xl">
                  {game.title}
                </h3>
                {/* The rules, not what it trains. Somebody standing in front of
                    a room needs to know what happens next in it. */}
                <p className="text-foreground/80 mt-4 text-base leading-relaxed">
                  {game.howToPlay}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={again}
                    className="bg-foreground text-background rounded-lg px-5 py-2.5 text-sm font-semibold"
                  >
                    Another one
                  </button>
                  <Link
                    href={game.href}
                    className="text-foreground/70 hover:text-foreground text-sm underline underline-offset-4"
                  >
                    How it fails, and how to coach it
                  </Link>
                  <button
                    type="button"
                    onClick={() => setStep(job === "fix" ? "symptom" : "job")}
                    className="text-foreground/50 hover:text-foreground text-sm underline underline-offset-4"
                  >
                    {job === "fix" ? "Something else is wrong" : "Change what it is for"}
                  </button>
                </div>

                {/* The page's classic mistake, said where it is about to be
                    made: an exercise handed over as though it were a game.
                    Keyed to the job rather than the kind — a warm-up is an
                    exercise too, and telling somebody to run one slowly and
                    interrupt often contradicts the job they just chose. */}
                {job === "fix" && (
                  <p className="text-foreground/40 mt-8 text-xs leading-relaxed">
                    Run it slowly and interrupt often. It is not built to be watched — the moment
                    players sense an audience they start playing for the laugh, and whatever it was
                    isolating is gone.
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
