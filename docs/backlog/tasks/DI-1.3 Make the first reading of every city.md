---
key: DI-1.3
type: task
summary: Read all sixty cities once, before the Actions secret exists, with Claude in a session, and import the readings through the engine's own checks and fetches
epic: "[[Improv directory]]"
parent: "[[DI-1 The archive and the engine]]"
status: Done
priority: High
sequence: 3
executable: agent
estimate: 3h
labels: [directory, engine, content]
impact: 5
radius: 4
opportunity: 20
complexity: 2
roi: 10.0
blocked_by: []
blocks: []
files:
  - data/directory
  - scripts/directory-engine.mjs
---

# DI-1.3 — The first reading

## What was found

The archive is only an archive once every city has been read, and the
daily workflow cannot run until the owner sets its secret (DI-1.2). The
engine therefore has a `--seed <dir>` mode: a folder of `<slug>.json`
replies in the shape the API prompt asks for, one a city, taken through the
same road as an API reading — every entry checked, every website fetched,
merged, ranked, written.

## Run

Six research agents, ten cities each, searched the live web and opened
every organisation's site before listing it, writing one reply a city to the
session's scratchpad. Then:

```bash
node scripts/directory-engine.mjs --seed <the seed folder>
```

## Verify

```bash
node -e "const fs=require('fs');const d='data/directory';const cities=JSON.parse(fs.readFileSync(d+'/cities.json','utf8')).cities;let read=0,n=0;for(const c of cities){const f=d+'/'+c.slug+'.json';if(!fs.existsSync(f))continue;read++;n+=JSON.parse(fs.readFileSync(f,'utf8')).entries.length}console.log(read,'cities read,',n,'entries')"
```

Then `npx vitest run directory` (the data guard holds the shape) and the
built hub lists every city with its count.

## Acceptance criteria

- Every city file exists; the data guard's floors (fifty cities read, two
  hundred entries) hold.
- Every listed site answered a fetch at import; nothing is a listing site.

## Scoring

Impact 5, radius 4, opportunity 20, complexity 2, ROI 10.0.

## Outcome

2026-10-01: all 60 cities read, 227 organisations listed after the engine's
checks and fetches, 22 cities thin (fewer than three verified places, served
and noindexed). The readers' own notes: the search budget ran out partway, so
several smaller cities are a verified floor rather than a census, and the
daily engine's first passes should re-sweep them. The data guard holds the
shape; the floors (fifty cities read, two hundred entries) are set under
these numbers.
