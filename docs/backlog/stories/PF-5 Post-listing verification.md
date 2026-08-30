---
key: PF-5
type: story
summary: Prove the listings are live and keep the feeds from silently regressing
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 5
story_points: 2
executable: agent
labels: [podcast, monitoring]
blocked_by:
  - "[[PF-2 Directory submission]]"
blocks: []
tasks:
  - "[[PF-5.1 Add a feed regression guard]]"
  - "[[PF-5.2 Verify the listings resolve]]"
---

# PF-5 — Post-listing verification

Two different jobs. The guard protects the feed from a future edit; the
verification confirms the directories actually ingested it.

PF-5.1 does not truly depend on PF-2 and can be pulled forward if the
submission stalls. PF-5.2 genuinely cannot run until something is listed.

## Acceptance criteria

- A test fails if `itunes:owner`, `podcast:guid` or the show notes disappear
- Each recorded directory URL returns a live listing
