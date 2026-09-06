---
key: PF-3
type: story
summary: Give Preview builds the same podcast owner variable as Production
epic: "[[Podcast finalization]]"
status: To Do
priority: Low
sequence: 3
story_points: 1
executable: mixed
labels: [podcast, vercel, config]
blocked_by: []
blocks: []
tasks:
  - "[[PF-3.1 Set PODCAST_OWNER_EMAIL for Preview]]"
---

# PF-3 — Environment parity

`PODCAST_OWNER_EMAIL` is set for Production and Development but not Preview, so
a preview deploy renders a feed without `itunes:owner` and cannot be used to
check the thing most likely to break.

Independent of everything else in this epic. Nothing is blocked on it.
