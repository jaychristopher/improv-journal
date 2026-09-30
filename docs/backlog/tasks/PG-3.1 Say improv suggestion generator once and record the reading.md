---
key: PG-3.1
type: task
summary: Register the tool page's keywords and results-page reading in the route registry, and say "improv suggestion generator" once in the page's prose
epic: "[[Prompt generator]]"
parent: "[[PG-3 The tool page never says suggestion]]"
status: To Do
priority: Medium
sequence: 1
executable: agent
estimate: 30m
labels: [seo, keywords, tool-page]
impact: 2
radius: 1
opportunity: 2
complexity: 1
roi: 2.0
blocked_by: []
blocks: []
files:
  - src/lib/route-keywords.ts
  - src/app/tools/improv-prompt-generator/page.tsx
---

# PG-3.1 — The term, the registry, the reading

## What was found

The tool page's numbers live in a comment at the top of its route file,
where `scripts/seo-audit.mjs` cannot see them, because when it was written
there was nowhere structured to put them. `src/lib/route-keywords.ts` now
exists for exactly this (SA-11.1, 2026-09-25) and the page is not in it. And
the page never says "suggestion": "improv suggestion generator" is 150 a
month (Ahrefs, US, 2026-09-30), the same size as the term the title owns.

## Run

1. `ROUTE_KEYWORDS["/tools/improv-prompt-generator"]`, first the keyword the
   title says: "improv prompt generator" 150 / difficulty 2 / potential 150 /
   parent "improv generator" (2026-09-19); "improv suggestion generator" 150
   (2026-09-30, volume only — nothing else was returned); "improv
   suggestions" 10 / 0 / 70 / parent "improv prompt generator" (2026-09-30);
   "improv scenario generator" 20 (2026-09-19). A comment in the file's voice.
2. `ROUTE_SERP["/tools/improv-prompt-generator"]` from the reading of
   "improv prompt generator" (US, 2026-09-30, top 10): DRs 95, 92, 20, 40, 4,
   0, 35, 39, 10; the DR 0 page at 6 on 15 visits; Reddit first on 109 of the
   1,889 the nine organic results earn; a prompts article at 7 on 1,429; People
   Also Ask at 10. Winnable. The sibling term's page in `serp_audience`.
3. The route's header comment points at the registry instead of restating
   numbers.
4. The intro's first sentence: "An improv suggestion generator is usually a
   random word." — paid for net-zero in the same paragraph, because route
   prose sits under a ceiling that may only fall. Once, in body prose; not a
   heading, not the description.
5. Not the rank tracker: `docs/seo/rank-tracker-keywords.txt` forbids
   never-surfaced terms. SA-18.1 decides.

## Verify

```bash
npm run build
npx vitest run route-serp keyword-collisions layer-collisions hub-prose-links snippet-endings prompt-generator-rendered
grep -c "improv suggestion generator" .next/server/app/tools/improv-prompt-generator.html
```

The tests are green and the grep prints 2: the sentence, and its copy in the
page's RSC payload (every server-rendered string appears twice in a built
page). Nothing in a heading.

## Acceptance criteria

- The audit can see the page's keywords (`npm run seo:audit` lists the route).
- The phrase appears once in the built page and in no heading.
- `npm run check` exits 0.

## Scoring

Impact 2: a 150-a-month sibling term. Radius 1. Opportunity 2. Complexity 1.
ROI 2.0.

## Outcome

_Not started._
