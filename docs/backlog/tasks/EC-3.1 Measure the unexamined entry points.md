---
key: EC-3.1
type: task
summary: Look at the five entry points nobody has measured, and log what they meet
parent: "[[EC-3 Audit the untested entry points]]"
epic: "[[Entry-point context]]"
status: Done
priority: Medium
sequence: 1
executable: agent
estimate: 60m
labels: [ux, context, audit]
blocked_by: []
blocks: []
files:
  - docs/backlog/context-mistakes.md
---

# EC-3.1 — Measure, then log

The register lists five entry points as unexamined. This task is to look, not to
fix: append what each one meets to `[[context-mistakes]]`, tagged underload or
overload, and open tasks only for what is worth fixing.

## Run

For each, render the page a visitor actually lands on and read what is above the
fold:

1. **Podcast listener** following a show-note link into a guide
2. **Social or newsletter** arrival on a guide
3. **Mid-course arrival** — a thread that is day 4 of a 7-day program, reached
   directly rather than in sequence. Does anything say it is day 4?
4. **Returning reader** — `ContinueJourney` returns null server-side, so the first
   paint has no trace of their state. Is that right, or is it a gap?
5. **AI answer engine** — currently moot, since Cloudflare 403s those crawlers.
   Record it as blocked rather than examined, and note what would need to change.

## Verify

The register has a dated entry for each of the five, or an explicit note that one
could not be examined and why.

## Acceptance criteria

- Five entries appended, each tagged underload or overload
- Any finding worth acting on has a task
- Nothing fixed in this task — measuring and fixing in one pass is how the sidebar
  problem went unnoticed for a month

## Outcome

Done 2026-09-06. Six entries appended to [[context-mistakes]] — the five listed
here plus one found while looking.

Two could not be examined as written, and that was the useful part. **Mid-course
arrival** has no day 4: `beginner-foundations` advertises seven days at a daily
cadence and contains two lessons, and the homepage renders "7 days · daily · 2
core lessons" in the same card. **AI answer engine** is recorded as blocked —
`npm run seo:crawlers` shows four answer engines refused, and also the three
user-initiated agents, which fire when a person asks about a page rather than
when a crawler indexes it.

Two examined clean: social/newsletter arrival on a guide, where the guide's own
description does the orientation, and the returning reader, re-measured after
the same-day slot-sharing fix closed both earlier entries. The podcast listener
was re-examined because the catalogue grew from 37 episodes to 139 since the
original entry; still clean.

The finding that was not on the list: reading time reached two page types out of
six, missing course lessons and library entries — the longest prose and the
best-ranking pages respectively.

Opened [[EC-3.2 Reconcile the beginner programme's length with its lessons]] and
[[EC-3.3 Extend reading time to lessons and library entries]]. Nothing fixed
here, per the task.
