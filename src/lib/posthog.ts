/**
 * The single PostHog instance, on the slim build.
 *
 * The default `posthog-js` entry bundles the session recorder and the surveys
 * module — 184 KB before compression, on every page of a site that is text.
 * Neither is enabled here. `dist/module.slim` is 96 KB and lazy-loads those
 * extras if they are ever switched on, so nothing is given up.
 *
 * Everything imports from here rather than from `posthog-js` directly.
 * Importing both entry points would bundle both builds and create two separate
 * instances, which is what was happening: providers.tsx and analytics.ts each
 * pulled their own.
 *
 * This is a ranking matter as well as a page-weight one. Core Web Vitals feed
 * into ranking, and script that must be parsed before the main thread frees up
 * costs both LCP and INP on the mobile connections most traffic arrives on.
 */
import posthog from "posthog-js/dist/module.slim";

export default posthog;
