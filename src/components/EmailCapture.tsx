"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { trackEvent } from "@/lib/analytics";
import { DEFAULT_OFFER, type OfferId, OFFERS } from "@/lib/subscribe";

/**
 * The email capture, wherever it appears.
 *
 * One component for every bucket, because the only thing that changes
 * between them is the offer — and the offer is chosen by where the reader
 * is, not by them. See subscribe.ts for why there are three and why each
 * one ends.
 *
 * The accessibility requirements here are not decoration; they came out of
 * an audit and each one has a criterion behind it. A real `<label>`, because
 * a placeholder disappears on the first keystroke and takes the only
 * instruction with it (3.3.2). `autocomplete="email"` (1.3.5). Errors in
 * text, tied by `aria-describedby`, never by colour alone (3.3.1, 1.4.1).
 * The status region is in the DOM before it has anything to say, because a
 * live region created in the same commit as its content is not reliably
 * announced (4.1.3).
 */
export function EmailCapture({
  surface,
  offer = DEFAULT_OFFER,
}: {
  /** Where this instance is mounted. Travels with the analytics event. */
  surface: string;
  offer?: OfferId;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const fieldId = useId();
  const statusId = useId();
  const info = OFFERS[offer];

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    trackEvent("email_capture_submitted", { surface, offer });

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, offer }),
      });
      const body = (await response.json()) as {
        ok: boolean;
        state?: "pending" | "already";
        reason?: string;
      };

      if (body.ok) {
        setState("done");
        // Two different true things. Telling somebody already on the list to
        // check their inbox sends them looking for a mail that is not
        // coming.
        setMessage(
          body.state === "already"
            ? "You are already on this list, so nothing new has been sent."
            : "Check your inbox — there is a confirmation link waiting.",
        );
        trackEvent("email_capture_accepted", { surface, offer, state: body.state ?? "pending" });
        return;
      }

      setState("error");
      // Each reason says what to do next, rather than that something is
      // wrong (3.3.3). "Unconfigured" is the honest one: the address was
      // not taken, and saying so is better than a thank-you that lies.
      setMessage(
        body.reason === "invalid"
          ? "That does not look like an address — it needs the form name@example.com."
          : body.reason === "unconfigured"
            ? "Sign-up is not open yet, so we have not kept your address. Nothing was sent."
            : "That did not go through. Try again in a moment.",
      );
      trackEvent("email_capture_failed", { surface, offer, reason: body.reason ?? "unknown" });
    } catch {
      setState("error");
      setMessage("That did not go through. Try again in a moment.");
      trackEvent("email_capture_failed", { surface, offer, reason: "network" });
    }
  }

  return (
    <div>
      <p className="text-foreground-strong text-sm font-semibold">{info.headline}</p>
      <p className="text-foreground-dim mt-2 text-sm leading-relaxed">{info.promise}</p>

      {state === "done" ? null : (
        <form onSubmit={onSubmit} className="mt-4">
          <label htmlFor={fieldId} className="text-foreground-dim block text-xs">
            Email address
          </label>
          <input
            id={fieldId}
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby={statusId}
            aria-invalid={state === "error"}
            placeholder="name@example.com"
            className="border-border-ui bg-surface text-foreground placeholder:text-foreground-dim focus:border-foreground-strong mt-1 min-h-11 w-full rounded-lg border px-3 text-sm transition-colors"
          />
          <button
            type="submit"
            disabled={state === "sending"}
            className="bg-foreground text-background hover:bg-foreground-strong mt-2 min-h-11 w-full rounded-lg px-4 text-sm font-semibold transition-colors disabled:opacity-70"
          >
            {state === "sending" ? "Sending…" : info.action}
          </button>
        </form>
      )}

      {/* In the DOM from the first render, empty, so the announcement lands. */}
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className="text-foreground-dim mt-2 text-xs leading-relaxed"
      >
        {message}
      </p>

      <p className="text-foreground-dim mt-2 text-xs">
        {info.emails} emails, then it stops. Not a newsletter.{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
      </p>
    </div>
  );
}
