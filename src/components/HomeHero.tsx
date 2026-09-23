"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import {
  type DoorId,
  type DoorInfo,
  type DoorOption,
  HOME_DOORS,
  type HomeDoorOptions,
} from "@/lib/home-doors";
import { setCurrentPath } from "@/lib/journey";

import { HeroTakeover } from "./HeroTakeover";

/**
 * The homepage hero.
 *
 * Two readers arrive here wanting opposite things from the same material, and
 * until now the page asked them both the same question. The symptom quiz
 * below is first-person and applied — "I freeze and overthink" — which is the
 * right question for one of them and no question at all for somebody who
 * plays on Tuesdays and wants a better scene. See home-doors.ts for the
 * account and for where the two sets of answers come from.
 *
 * So the door comes first and the question comes second, tuned to whoever
 * opened it. This does not replace the quiz: that asks what is breaking, this
 * asks what you are here for, and the quiz's routes stay in the page's own
 * html where a crawler can follow them.
 */

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function HomeHero({ options }: { options: HomeDoorOptions }) {
  const [open, setOpen] = useState(false);
  const [door, setDoor] = useState<DoorInfo | null>(null);
  const [chosen, setChosen] = useState<DoorOption | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const headingId = useId();

  const close = useCallback(() => {
    trackEvent("home_door_closed", { door: door?.id ?? null, chose: chosen?.id ?? null });
    setOpen(false);
  }, [door, chosen]);

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

  function openDoor(next: DoorInfo, event: React.MouseEvent<HTMLButtonElement>) {
    setDoor(next);
    setChosen(null);
    openerRef.current = event.currentTarget;
    setOpen(true);
    trackEvent("home_door_opened", { door: next.id });
  }

  function choose(option: DoorOption) {
    setChosen(option);
    trackEvent("home_door_answered", { door: door?.id ?? null, answer: option.id });
  }

  /**
   * A path link sets the journey before it navigates, the way the quiz does,
   * so ContinueJourney has something to resume on the next visit.
   */
  function follow(option: DoorOption, which: "primary" | "secondary", href: string) {
    trackEvent("home_door_followed", {
      door: door?.id ?? null,
      answer: option.id,
      target: href,
      which,
    });
    const path = /^\/paths\/([a-z0-9-]+)$/.exec(href)?.[1];
    if (path) setCurrentPath(path);
  }

  const answers: DoorOption[] = door ? options[door.id as DoorId] : [];

  return (
    <>
      <HeroTakeover labelledBy={headingId} hidden={open}>
        <div
          data-track="home-hero"
          className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12"
        >
          <div>
            <h1
              id={headingId}
              className="text-hero-foreground text-[2.75rem] leading-[0.95] font-bold tracking-tight sm:text-6xl lg:text-7xl"
            >
              Physics of
              <br />
              Connection
            </h1>
            <p className="text-hero-muted mt-5 max-w-md text-base leading-relaxed sm:mt-6 sm:text-lg lg:mt-7">
              Learn conversational magic through the practice of improv.
            </p>
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="text-hero-muted/70 mb-3 text-xs tracking-wider uppercase">
              What are you here for?
            </p>
            <div className="grid gap-2 sm:gap-3">
              {HOME_DOORS.map((info) => (
                <button
                  key={info.id}
                  type="button"
                  onClick={(event) => openDoor(info, event)}
                  className="border-hero-foreground/15 hover:border-hero-foreground/40 hover:bg-hero-foreground/10 rounded-xl border p-4 text-left transition-colors"
                >
                  <span className="text-hero-foreground block text-base font-semibold sm:text-lg">
                    {info.label}
                  </span>
                  <span className="text-hero-muted mt-1 block text-xs leading-snug sm:text-sm">
                    {info.note}
                  </span>
                </button>
              ))}
            </div>
            {/* The two doors share everything underneath; the page says so
                rather than letting the fork read as two sites. */}
            <p className="text-hero-muted/70 mt-5 text-xs leading-relaxed">
              Same material either way. Scroll for what keeps breaking, the guides, and the system
              underneath them.
            </p>
          </div>
        </div>
      </HeroTakeover>

      {open && door && (
        <div
          className="bg-background/95 fixed inset-0 z-50 overflow-y-auto backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={door.label}
          ref={dialogRef}
        >
          <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 py-6 sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-foreground/50 text-xs">{door.label}</p>
              <button
                type="button"
                onClick={close}
                className="text-foreground/50 hover:text-foreground shrink-0 text-sm underline underline-offset-4"
              >
                Close
              </button>
            </div>

            {!chosen && (
              <div className="mt-8">
                <h2 className="text-foreground-strong text-xl font-semibold">{door.question}</h2>
                <p className="text-foreground/60 mt-2 text-sm leading-relaxed">{door.preamble}</p>
                <div className="mt-5 grid gap-2">
                  {answers.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => choose(option)}
                      className="border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5 rounded-lg border p-4 text-left transition-colors"
                    >
                      <span className="text-foreground-strong block font-semibold">
                        {option.label}
                      </span>
                      <span className="text-foreground/50 mt-1 block text-xs leading-snug">
                        {option.note}
                      </span>
                    </button>
                  ))}
                </div>
                {door.id === "improv" && (
                  <p className="text-foreground/50 mt-5 text-xs leading-relaxed">
                    Something to run tonight instead?{" "}
                    <Link href="/improv-games" className="underline underline-offset-2">
                      Improv games
                    </Link>{" "}
                    deals one at a time with how to run it, and{" "}
                    <Link href="/improv-prompts" className="underline underline-offset-2">
                      improv prompts
                    </Link>{" "}
                    gives you somewhere to start a scene.
                  </p>
                )}
                {door.id === "communication" && (
                  <p className="text-foreground/50 mt-5 text-xs leading-relaxed">
                    None of it assumes you want to perform. Improv is only where this got worked out
                    in the most detail, by people who had to do it nightly in front of strangers.
                  </p>
                )}
              </div>
            )}

            {chosen && (
              <div className="mt-8">
                <span className="text-foreground/40 text-xs tracking-wider uppercase">
                  Where to start
                </span>
                <h2 className="text-foreground-strong mt-1 text-2xl font-semibold sm:text-3xl">
                  {chosen.label}
                </h2>
                <p className="text-foreground/70 mt-3 text-base leading-relaxed">
                  {chosen.rationale}
                </p>

                <div className="mt-7 grid gap-3">
                  {([chosen.primary, chosen.secondary] as const).map((link, i) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => follow(chosen, i === 0 ? "primary" : "secondary", link.href)}
                      className={[
                        "block rounded-lg border p-4 transition-colors",
                        i === 0
                          ? "border-foreground/30 bg-foreground/[0.04] hover:border-foreground/50"
                          : "border-foreground/10 hover:border-foreground/30 hover:bg-foreground/5",
                      ].join(" ")}
                    >
                      <span className="text-foreground/40 text-xs tracking-wider uppercase">
                        {link.kicker}
                      </span>
                      <span className="text-foreground-strong mt-1 block font-semibold">
                        {link.label}
                        <span aria-hidden className="ml-1.5 inline-block">
                          &rarr;
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setChosen(null)}
                  className="text-foreground/50 hover:text-foreground mt-6 text-sm underline underline-offset-4"
                >
                  {door.back}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
