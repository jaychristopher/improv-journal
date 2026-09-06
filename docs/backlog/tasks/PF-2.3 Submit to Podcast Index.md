---
key: PF-2.3
type: task
summary: Add all three feeds to Podcast Index
parent: "[[PF-2 Directory submission]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 3
executable: human
estimate: 10m
labels: [podcast, distribution, podcastindex]
blocked_by:
  - "[[PF-1.1 Add podcast-guid to all three feeds]]"
blocks:
  - "[[PF-2.4 Record the directory URLs in the repo]]"
files: []
---

# PF-2.3 — Add to Podcast Index

Podcast Index is the open directory most third-party apps read from, so adding
here reaches many clients at once rather than one.

Do this **after** PF-1.1. Podcast Index keys on `podcast:guid`, and adding the
feed before that tag exists means it gets indexed under a generated identity that
will not match once the real one appears.

## Run — human

Submit each feed at **https://podcastindex.org/add**. It is a public form and
takes seconds per feed; no account is required.

## Verify

Search each show at `podcastindex.org` and confirm the entry exists and reports
the same `podcast:guid` computed in [[PF-1.1 Add podcast-guid to all three feeds]].
A mismatch means the feed was indexed before the guid landed — correct it there
rather than regenerating the guid.

## Acceptance criteria

- All three feeds present in Podcast Index
- Each listing shows the `podcast:guid` computed in PF-1.1

## Outcome

_Not started._
