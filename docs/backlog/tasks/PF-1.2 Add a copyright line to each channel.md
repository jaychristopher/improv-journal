---
key: PF-1.2
type: task
summary: Add a channel-level copyright element
parent: "[[PF-1 Feed completeness]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Medium
sequence: 2
executable: agent
estimate: 15m
labels: [podcast, feed]
blocked_by: []
blocks:
  - "[[PF-1.3 Validate all three feeds]]"
files:
  - src/app/listen/[show]/feed.xml/route.ts
---

# PF-1.2 — Add copyright

Absent from all three channels. Several directories display it and some
validators warn on its absence.

## Run

In the channel block of `src/app/listen/[show]/feed.xml/route.ts`, next to
`<language>`, emit:

```
<copyright>© ${new Date().getFullYear()} ${PODCAST_AUTHOR}</copyright>
```

`PODCAST_AUTHOR` is already defined in that file. Escape the value through the
existing `escapeXml` helper.

**One judgement call to surface rather than decide silently:** a derived year
changes the string on every build, which is harmless but means the feed differs
between January builds. If a fixed first-publication year is wanted instead, that
is the owner's call — ask rather than guess.

## Verify

```bash
npm run build
grep -c "<copyright>" .next/server/app/listen/*/feed.xml.body
```

Prints `1` for each of the three files.

## Acceptance criteria

- Each channel has exactly one `<copyright>`
- The value goes through `escapeXml`

## Outcome

_Not started._
