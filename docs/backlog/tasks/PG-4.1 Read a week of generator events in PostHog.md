---
key: PG-4.1
type: task
summary: A week after the One word kind lands, read the generator's events in PostHog and record what the kinds, the cog, the hands and the timer are actually used for
epic: "[[Prompt generator]]"
parent: "[[PG-4 Nothing reads the generator events back]]"
status: To Do
priority: Medium
sequence: 1
executable: human
estimate: 45m
labels: [measurement, analytics, posthog]
impact: 3
radius: 3
opportunity: 9
complexity: 1
roi: 9.0
blocked_by:
  - "[[PG-2.2 Build the One word kind on a branch and merge after the review]]"
blocks: []
files:
  - docs/improv-prompts-personas.md
---

# PG-4.1 — The first reading of the generator's events

## What was found

Every `trackEvent` reaches PostHog (`src/lib/analytics.ts`) and nothing has
ever read one back. The generator carries the kind as `category` and the room
as `use_case` on every event, so the questions the next round needs are one
query each.

## Run

In PostHog, over the seven days after PG-2.2 deployed:

1. `prompt_generator_category` broken down by `category` — which kinds get
   tapped, and whether `word` is among them.
2. `prompt_generator_settings` broken down by `use_case`, `count` and `every`
   — is the cog opened, which rooms are set, are hands and the timer used.
3. `prompt_generated` where `prompt_id` contains `+` (a hand) against the
   rest, and `prompt_generator_exhausted` by `category` — do pools run dry.
4. `prompt_generator_opened` by `surface` — the guide hero against the tool
   page.

Write the numbers, with the date range, into `docs/improv-prompts-personas.md`
under "What to do", and say which of the two deferred items — print slips
from the cog, or a cast setting — they argue for.

## Verify

The persona study carries a dated paragraph with the four readings, and this
card's Outcome repeats the headline number.

## Acceptance criteria

- Four readings, each a number with a date range, none invented.
- A decision line for the next round.

## Scoring

Impact 3, radius 3, opportunity 9, complexity 1, ROI 9.0.

## Outcome

_Not started._
