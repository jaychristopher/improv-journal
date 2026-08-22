"use client";

/**
 * Initialises analytics. The instance and the reason it is the slim build both
 * live in `@/lib/posthog`.
 *
 * There is no React context provider any more: it existed only to feed
 * usePostHog(), and the one consumer now imports the instance directly.
 */
import { useEffect } from "react";

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
  }, []);

  return <>{children}</>;
}
