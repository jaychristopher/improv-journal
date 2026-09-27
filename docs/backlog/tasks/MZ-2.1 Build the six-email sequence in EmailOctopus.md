---
key: MZ-2.1
type: task
summary: Build the six-email automation the footer promises in EmailOctopus, triggered by the tag the subscribe route applies, and confirm it stops at six
epic: "[[Monetization]]"
parent: "[[MZ-2 The capture promises six emails that do not exist]]"
status: To Do
priority: Medium
sequence: 1
executable: human
estimate: 90m
labels: [monetization, email, sequence, account]
impact: 3
radius: 1
opportunity: 3
complexity: 2
roi: 1.5
blocked_by: []
blocks: []
files:
  - docs/sequences/tonights-material.md
  - src/app/api/subscribe/route.ts
  - src/lib/subscribe.ts
---

# MZ-2.1 — Build the six

## What was found

`docs/sequences/tonights-material.md` holds the six emails, drafted
2026-09-24, with the trigger written in its frontmatter: the tag
`tonights-material`, applied by `POST /api/subscribe` through
`EMAILOCTOPUS_API_KEY` and `EMAILOCTOPUS_LIST_ID`. EmailOctopus has the list
and the tag and no automation on it. The footer promises "six short notes,
then it stops" on every page, and `footer-and-capture.test.ts` asserts the
promise is rendered; the automation is what makes it true.

All-time capture: 2 submitted, 1 accepted, 1 failed (PostHog, 2026-09-27).

## Run

1. In EmailOctopus, open the list the route posts to and create an
   automation triggered by the tag `tonights-material` being added.
2. Add six steps, one per email in `docs/sequences/tonights-material.md`, in
   its order and with its spacing; paste each email's subject and body as
   written.
3. End the automation after the sixth: no loop, no "final" seventh.
4. Subscribe a test address through the site's footer, confirm it, and let
   the first two land.

## Verify

The test address receives email one at the drafted delay and email two after
it; the automation's report shows the sixth step as the last. The route's own
check is unchanged:

```bash
npx vitest run src/lib/__tests__/footer-and-capture.test.ts
```

## Acceptance criteria

- A confirmed address receives the six, in order, and nothing after.
- Nothing on the site changes: the promise was already rendered.

## Scoring

Impact 3: every option that earns more than cents needs the list, and the
list is empty because it delivers nothing. Radius 1: one automation.
Opportunity 3. Complexity 2: an account's automation builder, six emails.
ROI 1.5.

## Outcome

_Not started._
