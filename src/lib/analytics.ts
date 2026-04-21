import { track } from "@vercel/analytics";
import posthog from "posthog-js";

/**
 * Send a custom event to both Vercel Analytics and PostHog.
 * Properties must be flat scalars (string | number | boolean | null).
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null>,
) {
  track(name, properties);
  posthog.capture(name, properties);
}
