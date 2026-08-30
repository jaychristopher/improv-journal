---
key: PF-2.4
type: task
summary: Write the resulting listing URLs into the repo so later runs can verify them
parent: "[[PF-2 Directory submission]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 4
executable: mixed
estimate: 20m
labels: [podcast, distribution, docs]
blocked_by:
  - "[[PF-2.1 Submit to Apple Podcasts]]"
  - "[[PF-2.2 Submit to Spotify]]"
  - "[[PF-2.3 Submit to Podcast Index]]"
blocks:
  - "[[PF-5.2 Verify the listings resolve]]"
files:
  - docs/backlog/directory-listings.md
---

# PF-2.4 — Record the listing URLs

Without this, a later run has no way to confirm anything was ever listed. That is
exactly the position this epic started from: the only way to answer "did we
submit?" was to search git history and find nothing.

## Run

The human supplies the URLs; the agent writes the file. Create
`docs/backlog/directory-listings.md`:

```markdown
---
type: reference
epic: "[[Podcast finalization]]"
updated: <date>
---

| Show | Apple | Spotify | Podcast Index |
|---|---|---|---|
| The Physics of Connection | <url> | <url> | <url> |
| The Improv Lab | <url> | <url> | <url> |
| Deep Cuts | <url> | <url> | <url> |
```

Add each show's canonical listing URL, not a search result.

## Verify

```bash
test -f docs/backlog/directory-listings.md && grep -c 'https' docs/backlog/directory-listings.md
```

The file exists and holds one URL per show per directory that was actually
submitted. Leave a cell blank rather than guessing a URL — a wrong URL here is
worse than a missing one, because [[PF-5.2 Verify the listings resolve]] will
report it as live.

## Acceptance criteria

- Every submitted show has a recorded URL per directory
- Each URL returns 200

## Outcome

_Not started._
