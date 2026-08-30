---
key: PF-2.2
type: task
summary: Submit all three shows to Spotify for Podcasters
parent: "[[PF-2 Directory submission]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: High
sequence: 2
executable: human
estimate: 20m
labels: [podcast, distribution, spotify]
blocked_by:
  - "[[PF-1.3 Validate all three feeds]]"
blocks:
  - "[[PF-2.4 Record the directory URLs in the repo]]"
files: []
---

# PF-2.2 — Submit to Spotify

**An agent cannot do this.** Account sign-in plus an emailed verification code.

## Run — human

1. Sign in at **https://podcasters.spotify.com**.
2. Add each of the three feed URLs listed in [[PF-2.1 Submit to Apple Podcasts]].
3. Spotify sends a verification code to the address in `itunes:owner`, which is
   `jay@cosm.agency`.
4. Listing is usually live within hours rather than days.

## Verify

Each show resolves at `open.spotify.com` with the right artwork and its full
episode count: 11 for The Physics of Connection, 26 for The Improv Lab, 25 for
Deep Cuts.

## Acceptance criteria

- All three shows submitted and verified
- Resulting Spotify show URLs handed to [[PF-2.4 Record the directory URLs in the repo]]

## Outcome

_Not started._
