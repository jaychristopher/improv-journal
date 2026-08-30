---
key: PF-2.1
type: task
summary: Submit all three shows to Apple Podcasts Connect
parent: "[[PF-2 Directory submission]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: High
sequence: 1
executable: human
estimate: 30m
labels: [podcast, distribution, apple]
blocked_by:
  - "[[PF-1.3 Validate all three feeds]]"
blocks:
  - "[[PF-2.4 Record the directory URLs in the repo]]"
files: []
---

# PF-2.1 — Submit to Apple Podcasts

**An agent cannot do this.** It needs an Apple ID sign-in and a verification email
delivered to `jay@cosm.agency`. Report it and stop.

## Run — human

1. Sign in at **https://podcastsconnect.apple.com** with the Apple ID that should
   own these shows.
2. Add each feed in turn:
   - `https://www.physicsofconnection.com/listen/physics-of-connection/feed.xml`
   - `https://www.physicsofconnection.com/listen/improv-lab/feed.xml`
   - `https://www.physicsofconnection.com/listen/deep-cuts/feed.xml`
3. Apple emails `jay@cosm.agency` to verify ownership. That address is what
   `itunes:owner` publishes, and it is the whole reason this was blocked — watch
   for it, including in spam.
4. Review is typically a few days. Rejections arrive by email with a reason.

## Preconditions already satisfied

Do not re-check these; they were verified on 2026-08-30 and are live:
`itunes:owner` with email, 1400x1400 PNG artwork, category with subcategory,
`itunes:explicit`, `itunes:type`, self-referencing `atom:link`, and every episode
carrying an enclosure, GUID, duration and pubDate.

## Verify

The show is listed at `podcasts.apple.com` and Apple Podcasts Connect reports its
status as available rather than in review or rejected. Search Apple Podcasts for
the show title and confirm the artwork and episode count match.

A rejection is not a failure of this task — record the stated reason under
`Outcome` and raise a follow-up task against [[PF-1 Feed completeness]].

## Acceptance criteria

- All three shows submitted
- Ownership verification completed
- Resulting Apple show URLs handed to [[PF-2.4 Record the directory URLs in the repo]]

## Outcome

_Not started._
