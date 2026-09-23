"use client";

/**
 * Initialises analytics. The instance and the reason it is the slim build both
 * live in `@/lib/posthog`.
 *
 * There is no React context provider any more: it existed only to feed
 * usePostHog(), and the one consumer now imports the instance directly.
 */
import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";
import posthog from "@/lib/posthog";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      capture_pageview: false, // handled by PostHogPageView
      capture_pageleave: true,
      // Neither of these was ever switched on, and both are lazy-loaded by the
      // slim build rather than bundled. Saying so explicitly keeps them from
      // being fetched and records that the omission is deliberate.
      disable_session_recording: true,
      disable_surveys: true,
    });

    // Server-rendered link blocks (the concept sidebar, the guide's concept
    // block, related guides, lesson sources, the nav) fire no event of their
    // own and autocapture is off, so a click on "Drills that train this" was
    // indistinguishable from one in the nav (tracker entry 252, 2026-09-21).
    // One delegated listener: any internal link inside a `[data-track]`
    // wrapper reports the wrapper's name and the destination. Through
    // trackEvent, so Vercel Analytics and PostHog see the same navigation:
    // it captured to PostHog alone at first while the guide CTA's event
    // reached both, and the two channels reported to different dashboards
    // (tracker entry 259).
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/")) return;
      const block = anchor.closest("[data-track]")?.getAttribute("data-track");
      if (!block) return;
      trackEvent("link_clicked", { block, href, page: window.location.pathname });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return <>{children}</>;
}
