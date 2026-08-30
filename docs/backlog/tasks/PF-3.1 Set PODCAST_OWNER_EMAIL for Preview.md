---
key: PF-3.1
type: task
summary: Add the podcast owner variable to the Preview environment
parent: "[[PF-3 Environment parity]]"
epic: "[[Podcast finalization]]"
status: To Do
priority: Low
sequence: 1
executable: mixed
estimate: 10m
labels: [podcast, vercel, config]
blocked_by: []
blocks: []
files: []
---

# PF-3.1 — Preview environment parity

Set for Production and Development on 2026-08-30. Preview failed, and the reason
is worth recording so the next run does not repeat the attempt.

Vercel CLI 53.0.1 returns `action_required: git_branch_required` for the
all-preview-branches case **even when run with the exact command its own error
message recommends**:

```bash
vercel env add PODCAST_OWNER_EMAIL preview --value 'jay@cosm.agency' --yes
```

That looks like a CLI bug rather than a usage error. Do not spend time on it again.

## Run — pick one

**Dashboard (recommended, human):** Vercel → physics-of-connection → Settings →
Environment Variables → add `PODCAST_OWNER_EMAIL` = `jay@cosm.agency`, tick Preview.

**Specific branch (agent):** if only one preview branch matters, the three-argument
form does work:

```bash
vercel env add PODCAST_OWNER_EMAIL preview <branch> --value 'jay@cosm.agency' --yes
```

**Retry the CLI (agent):** if Vercel CLI has moved past 53.0.1, try the
all-branches form once more before falling back.

## Verify

```bash
vercel env ls | grep PODCAST_OWNER_EMAIL
```

Shows Preview alongside Production and Development.

## Acceptance criteria

- Preview builds render `itunes:owner` in the feed

## Outcome

_Not started. Production and Development are set and live._
