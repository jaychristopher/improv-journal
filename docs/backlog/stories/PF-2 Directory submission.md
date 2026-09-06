---
key: PF-2
type: story
summary: Get all three shows listed in the directories that matter
epic: "[[Podcast finalization]]"
status: To Do
priority: High
sequence: 2
story_points: 5
executable: mixed
labels: [podcast, distribution]
blocked_by:
  - "[[PF-1 Feed completeness]]"
blocks:
  - "[[PF-5 Post-listing verification]]"
tasks:
  - "[[PF-2.1 Submit to Apple Podcasts]]"
  - "[[PF-2.2 Submit to Spotify]]"
  - "[[PF-2.3 Submit to Podcast Index]]"
  - "[[PF-2.4 Record the directory URLs in the repo]]"
---

# PF-2 — Directory submission

Nothing has been submitted anywhere. Confirmed on 2026-08-30 by searching the
full git history and `docs/` for any submission record and finding none — and
in any case a submission before that date would have been rejected, because
`itunes:owner` was missing until then.

Most of this story is a human's to do. Directory submission means signing into
an account and pasting a URL into a form, and the ownership check is an email
sent to `jay@cosm.agency`. An agent should prepare, report, and stop.

## Acceptance criteria

- All three shows submitted to Apple Podcasts and Spotify
- All three feeds added to Podcast Index
- The resulting public URLs recorded in `docs/backlog/directory-listings.md`
