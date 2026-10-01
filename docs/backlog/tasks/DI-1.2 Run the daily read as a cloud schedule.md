---
key: DI-1.2
type: task
summary: Drop the API-key workflow and run the daily city read as a scheduled Claude session instead, with a runbook it follows and no secret to keep
epic: "[[Improv directory]]"
parent: "[[DI-1 The archive and the engine]]"
status: Done
priority: High
sequence: 2
executable: agent
estimate: 1h
labels: [directory, engine, automation]
impact: 5
radius: 4
opportunity: 20
complexity: 2
roi: 10.0
blocked_by: []
blocks: []
files:
  - scripts/directory-engine.mjs
  - docs/directory-engine-run.md
---

# DI-1.2 — The daily read, on a schedule

## What was found

The archive shipped with a GitHub Actions workflow that called the Anthropic
API every morning, which meant the repository had to hold
`ANTHROPIC_API_KEY`. The owner's answer (2026-10-01): "I want this done as a
cloud scheduled job — not with an api key."

They are right that the key bought nothing. The daily work is a research
task — search the web for a city's improv theatres, open their sites, write
down what is there — which is what a Claude session does anyway. The key was
a second way of reaching the same model, with a bill, a secret to rotate and
a workflow that failed plainly every morning until somebody set it.

## Run

The schedule is a cloud scheduled Claude session, daily, following
`docs/directory-engine-run.md`. The script is now everything around the
reading rather than the reading itself:

```bash
node scripts/directory-engine.mjs --plan 10 --out <dir>   # the cities due, a prompt each
node scripts/directory-engine.mjs --seed <dir>            # import the replies, advance the cycle
```

## Verify

```bash
node scripts/directory-engine.mjs --plan 3
node scripts/directory-engine.mjs --prompt chicago
npx vitest run directory
```

Then, after the first scheduled run, the commit it pushed: `data/directory`
only, the cities named in the message, and the cursor in `engine-state.json`
moved on by as many cities as it read.

## Acceptance criteria

- No API key anywhere in the repository, and nothing that needs one.
- The cycle advances only on a successful import, so a missed day costs
  nothing and the same cities are due tomorrow.
- The runbook is specific enough to be followed unattended, including what
  not to touch.

## Scoring

Impact 5, radius 4, opportunity 20, complexity 2, ROI 10.0.

## Outcome

2026-10-01: done. `.github/workflows/directory-engine.yml` is deleted, the
API path and the `@anthropic-ai/sdk` dependency are gone, and the engine's
commands are now `--plan`, `--prompt`, `--seed` and `--dry`. `--seed` moves
the cursor past the last city it imported, which is what makes a dropped run
free: planning reads the cursor and never writes it.

The reading itself is the scheduled session's own web search, so there is no
key, no bill beyond the session, and no secret to rotate. The runbook is
`docs/directory-engine-run.md`.
