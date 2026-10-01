---
key: DI-1.1
type: task
summary: The sixty-city data model, the engine that reads a city with Claude and verifies every site, the hub and city pages, the daily workflow, and the guards that hold them
epic: "[[Improv directory]]"
parent: "[[DI-1 The archive and the engine]]"
status: Done
priority: High
sequence: 1
executable: agent
estimate: 6h
labels: [product, directory, engine, guard]
impact: 5
radius: 4
opportunity: 20
complexity: 4
roi: 5.0
blocked_by: []
blocks: []
files:
  - data/directory/cities.json
  - scripts/directory-engine.mjs
  - scripts/lib/directory.mjs
  - .github/workflows/directory-engine.yml
  - src/lib/directory.ts
  - src/lib/directory-copy.ts
  - src/app/improv-near-you/page.tsx
  - src/app/improv-near-you/[city]/page.tsx
  - src/app/sitemap.ts
  - src/lib/route-pages.mjs
  - src/lib/__tests__/directory-engine.test.ts
  - src/lib/__tests__/directory.test.ts
---

# DI-1.1 — The archive, the engine, the pages

## What was found

No scheduler, no data folder and no outbound-link convention existed; the
route listing (`src/lib/route-pages.mjs`) throws on any sitemap URL it has
not been told about, and the route files' prose sits under a ceiling with no
headroom. So: data in `data/directory/`, read by `src/lib/directory.ts`; the
engine's pure half in `scripts/lib/directory.mjs` so guards can hold it; the
prose in `src/lib/directory-copy.ts`, registered with `hub-prose-links`; a
derived section in the route listing and the sitemap, gated on three
verified places as the picker's facets are; a GitHub Actions workflow for
the schedule, since Vercel had no crons.

## Run

```bash
node scripts/directory-engine.mjs --dry --cities chicago
```

Prints the fixture pass through the merge; then `npm run build` and
`npx vitest run directory directory-engine hub-prose-links`.

## Verify

```bash
npm run build
npx vitest run directory directory-engine hub-prose-links llms-txt llms-hubs sitemap-coverage flight-share link-tracking derived-provenance hub-headings open-graph snippet-endings
```

All green; `/improv-near-you` and sixty city pages in `.next/server/app`.

## Acceptance criteria

- Every city page is served from the first deploy; thin ones are noindexed
  and absent from the sitemap and llms.txt.
- Every outbound link is the organisation's own site, `rel="noopener noreferrer"`.
- `npm run check` exits 0 with the data files staged.

## Scoring

Impact 5: the demand is the site's largest unclaimed term. Radius 4: sixty
pages, a hub, the sitemap, llms.txt. Opportunity 20. Complexity 4. ROI 5.0.

## Outcome

2026-10-01: built and verified. The engine runs dry, by slug, by cycle,
over all cities, and from a seed folder; the workflow is in place and fails
plainly until the secret exists. The build publishes the hub and the city
pages that pass the gate.
