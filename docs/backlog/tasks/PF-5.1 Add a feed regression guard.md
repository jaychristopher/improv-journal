---
key: PF-5.1
type: task
summary: Fail the suite if required feed elements disappear
parent: "[[PF-5 Post-listing verification]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 1
executable: agent
estimate: 45m
labels: [podcast, testing]
blocked_by:
  - "[[PF-1.1 Add podcast-guid to all three feeds]]"
blocks: []
files:
  - src/lib/__tests__/podcast-feed-required.test.ts
---

# PF-5.1 — Feed regression guard

Once a directory has ingested a feed, a missing required element is worse than it
was before listing — the show is already published and silently degrades.

`itunes:owner` is the specific risk. It is environment-gated, so it vanishes from
any build where `PODCAST_OWNER_EMAIL` is unset, and nothing currently notices.

This does not really depend on PF-2 and can be pulled forward if submission stalls.

## Run

Add `src/lib/__tests__/podcast-feed-required.test.ts`, following the conventions
already in `src/lib/__tests__/podcast-show-notes.test.ts` — `it.runIf(built)`, read
`.next/server/app/listen/*/feed.xml.body`, assert presence rather than markup.

Assert per show: `itunes:owner` containing `itunes:email`, `podcast:guid`,
`copyright`, `itunes:category`, `itunes:image`, and at least one `item`.

**The environment problem is the interesting part.** `itunes:owner` is absent from
any local build without the variable set, so a naive assertion fails on a clean
checkout and gets muted. Handle it deliberately: skip the owner assertion when
`process.env.PODCAST_OWNER_EMAIL` is unset, and say in a comment that CI must set
it for the check to mean anything. A guard everyone learns to ignore is worse than
no guard.

## Verify

```bash
PODCAST_OWNER_EMAIL='jay@cosm.agency' npm run build
npx vitest run src/lib/__tests__/podcast-feed-required.test.ts
```

Passes. Then confirm it actually bites — rebuild without the variable and check
the owner assertion skips rather than fails, and temporarily remove `podcast:guid`
to confirm that case fails.

## Acceptance criteria

- Guard passes with the variable set
- Guard skips, with an explanation, when it is not
- Guard fails if `podcast:guid` or `copyright` is removed

## Outcome

_Not started._
