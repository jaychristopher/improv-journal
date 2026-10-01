---
key: DI-2.1
type: task
summary: When gsc-pages from 2026-02-01 shows the hub or a city page, register the terms it surfaced for in route-keywords.ts with that date and reconsider the hub's title against them
epic: "[[Improv directory]]"
parent: "[[DI-2 Nobody can see whether the city pages are found]]"
status: To Do
priority: Medium
sequence: 1
executable: mixed
estimate: 45m
labels: [seo, keywords, search-console]
impact: 3
radius: 2
opportunity: 6
complexity: 2
roi: 3.0
blocked_by: []
blocks: []
files:
  - src/lib/route-keywords.ts
  - src/lib/__tests__/keyword-collisions.test.ts
  - src/app/improv-near-you/page.tsx
---

# DI-2.1 — Register what search actually sends

## What was found

The demand was read on 2026-09-30 (Ahrefs, US): "improv classes near me"
3,600 a month at difficulty 0 under the parent "improv classes" (1,300);
"improv near me" 800 under "improv"; "improv classes nyc" 700, chicago and
los angeles 150 each, austin and boston 40, seattle 10. The hub's title says
"Improv Near You" and the city pages "Improv in <city>"; neither registers a
keyword, because the collision guard holds a registered route's title to
the term and sixty templated titles should be read by Google before they
are claimed.

## Run

Not before six weeks of the pages being live. Then, with Ahrefs:
`gsc-pages` from 2026-02-01 filtered to `/improv-near-you`, and
`gsc-keywords` for the queries those pages surfaced for. For each page
that surfaced, add its terms to `ROUTE_KEYWORDS` in
`src/lib/route-keywords.ts` with the Search Console date and the Ahrefs
volume where the index has one, add the route to `HUB_TITLE_SOURCES` in
`keyword-collisions.test.ts` (the hub keeps its title in `src/lib/directory.ts`,
so the guard needs a branch that reads `DIRECTORY_HUB_H1`), and run
`npx vitest run keyword-collisions route-serp llms-hubs`.

If the hub surfaces for "improv classes near me" and not "improv near me",
the title's second half is the thing to reconsider — never the h1 rule.

## Verify

```bash
npx vitest run keyword-collisions route-serp llms-hubs
npm run seo:audit
```

The audit lists `/improv-near-you` with its terms.

## Acceptance criteria

- Every registered term carries a Search Console date and a sourced volume.
- The guards above are green and the hub's title still starts with its h1.

## Scoring

Impact 3, radius 2, opportunity 6, complexity 2, ROI 3.0.

## Outcome

_Not started._
