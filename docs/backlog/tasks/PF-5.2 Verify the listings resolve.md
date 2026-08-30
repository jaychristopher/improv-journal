---
key: PF-5.2
type: task
summary: Confirm each recorded directory listing is actually live
parent: "[[PF-5 Post-listing verification]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Low
sequence: 2
executable: agent
estimate: 20m
labels: [podcast, monitoring]
blocked_by:
  - "[[PF-2.4 Record the directory URLs in the repo]]"
blocks: []
files:
  - docs/backlog/directory-listings.md
---

# PF-5.2 — Verify the listings resolve

Genuinely blocked until [[PF-2.4 Record the directory URLs in the repo]] exists.
There is nothing to check before then, and inventing URLs to check would be worse
than waiting.

## Run

```bash
grep -oE 'https?://[^ |)]+' docs/backlog/directory-listings.md | sort -u | while read u; do
  printf "  %-70s %s\n" "$u" "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 25 -L "$u")"
done
```

Apple and Spotify can return 200 for a page that says the show is unavailable in
a region, so spot-check at least one by eye rather than trusting the status code
alone.

## Verify

Every URL returns 200 and the page names the right show.

## Acceptance criteria

- All recorded URLs resolve to a live listing
- Anything not yet live is noted here with the date it was checked

## Outcome

_Not started._
