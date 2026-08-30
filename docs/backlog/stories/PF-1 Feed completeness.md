---
key: PF-1
type: story
summary: Make all three feeds spec-complete before submitting them anywhere
epic: "[[Podcast finalization]]"
status: To Do
priority: High
sequence: 1
story_points: 3
executable: agent
labels: [podcast, feed]
blocked_by: []
blocks:
  - "[[PF-2 Directory submission]]"
tasks:
  - "[[PF-1.1 Add podcast-guid to all three feeds]]"
  - "[[PF-1.2 Add a copyright line to each channel]]"
  - "[[PF-1.3 Validate all three feeds]]"
---

# PF-1 — Feed completeness

The feeds are valid RSS and Apple-acceptable. They are not spec-complete, and
the gaps matter for the directories that are not Apple.

Verified missing on all three as of 2026-08-30: `podcast:guid`, `copyright`.

`itunes:keywords` is also absent and is deliberately **not** in scope — Apple
deprecated it and ignores it. Do not add it.

## Acceptance criteria

- All three feeds carry a stable `podcast:guid`
- All three feeds carry `copyright`
- All three validate with no errors against a podcast feed validator
- A guard test fails if any of these regress
