---
key: PG-4
type: story
summary: The generator emits eleven events to Vercel Analytics and PostHog and no script or person has ever read one back
epic: "[[Prompt generator]]"
status: To Do
priority: Medium
labels: [measurement, analytics, posthog]
tasks:
  - "[[PG-4.1 Read a week of generator events in PostHog]]"
---

# PG-4 — Nothing reads the generator events back

`src/lib/analytics.ts` sends every `trackEvent` to Vercel Analytics and to
PostHog. The generator emits `prompt_generator_opened`, `_category`,
`_settings`, `_auto`, `_reset`, `_exhausted`, `_closed`, `prompt_generated`,
`prompt_line_redrawn` and `prompt_copied`, each carrying the kind as
`category` and the room as `use_case`. A grep of `scripts/` and `docs/` for
any of those names finds only the emit sites.

So the redesign of 2026-09-30 — kind first, the rooms blended, the cog — and
whatever PG-2 adds are judged by nobody. One reading a week after PG-2 lands
answers the questions the next round needs: which kinds get tapped, whether
the cog is opened at all and which rooms are set, whether hands and the timer
are used, how often a pool is exhausted. The reading goes into the persona
study's "What to do", and decides between printing slips from the cog and a
cast setting.
