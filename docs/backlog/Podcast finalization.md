---
key: PF
type: epic
summary: Podcast finalization
status: In Progress
priority: High
labels: [podcast, distribution, seo]
reporter: jaychristopher
created: 2026-08-30
target: Three shows listed in the major directories with a spec-complete feed
stories:
  - "[[PF-1 Feed completeness]]"
  - "[[PF-2 Directory submission]]"
  - "[[PF-3 Environment parity]]"
  - "[[PF-4 Listen hub depth]]"
  - "[[PF-5 Post-listing verification]]"
---

# PF — Podcast finalization

Three shows, 62 episodes, all live and all currently listed nowhere.

| Show | Episodes | Feed |
|---|---|---|
| The Physics of Connection | 11 | `/listen/physics-of-connection/feed.xml` |
| The Improv Lab | 26 | `/listen/improv-lab/feed.xml` |
| Deep Cuts | 25 | `/listen/deep-cuts/feed.xml` |

## Why this epic exists

The feeds were blocked from submission for months by a single missing tag.
`itunes:owner` is required by Apple and was absent because `PODCAST_OWNER_EMAIL`
was unset in Vercel. That was fixed and deployed on 2026-08-30, and all three
feeds now carry it.

What remains is the work that fixed tag revealed: the feeds are valid but not
spec-complete, nothing has been submitted anywhere, and the hub that holds all
three is thinner than any comparable page on the site.

## What is already done — do not redo

- `itunes:owner` / `itunes:email` live on all three feeds
- `PODCAST_OWNER_EMAIL` set in Vercel Production and Development
- Episode show notes with `content:encoded`, each linking the page it was made from
- Artwork at 1400x1400 PNG, Apple's minimum
- Per-episode enclosure, GUID, duration, pubDate, `itunes:episode`, `itunes:summary`
- `itunes:type`, `itunes:category` with subcategory, `itunes:explicit`, self-referencing `atom:link`

## Execution protocol

This epic is written to be run by an agent with no memory of the conversation
that produced it.

1. Read this file, then every story in `stories/` in `sequence` order.
2. For each story, run its tasks in `sequence` order.
3. Before starting a task, check `blocked_by`. If a blocker is not `Done`, skip it.
4. Honour `executable`:
   - `agent` — run it. The `Run` and `Verify` sections are literal.
   - `human` — do not attempt. Report it and move on.
   - `mixed` — do the agent half, then report what the human must do.
5. After a task passes its `Verify`, set `status: Done` in its frontmatter and
   record what happened under `Outcome`.
6. Never mark a story `Done` while any of its tasks is not.

Two standing rules for this repo, carried in so a future run does not learn
them the hard way:

- **A dev server races production builds.** If a build fails with a type error
  inside `.next/dev/types/`, delete that directory and rebuild. The source is fine.
- **Another agent works in this tree.** Check `git status` before committing and
  stage only your own files. Do not commit `src/lib/diagrams.ts`,
  `src/components/Diagram.tsx`, or the image work in `src/app/**/page.tsx`.

## Definition of done

All three shows are live and findable in Apple Podcasts and Spotify, the feeds
validate clean, and the directory URLs are recorded in the repo so a later run
can verify them without asking anybody.
