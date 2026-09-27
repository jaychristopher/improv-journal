---
key: MZ-1.1
type: task
summary: Open an Amazon Associates account for the site and set NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG in Vercel, then redeploy
epic: "[[Monetization]]"
parent: "[[MZ-1 The library sends readers to Amazon untagged and nothing measures the click]]"
status: To Do
priority: Medium
sequence: 1
executable: human
estimate: 20m
labels: [monetization, affiliate, account]
impact: 2
radius: 2
opportunity: 4
complexity: 1
roi: 4.0
blocked_by: []
blocks: []
files:
  - src/lib/affiliate.ts
  - src/components/BuyTheBook.tsx
  - src/components/Footer.tsx
---

# MZ-1.1 — Create the account, set the tag

## What was found

The code has been ready since the buy cards shipped: `src/lib/affiliate.ts`
reads `NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG`, tags every edition link and every
tagged search, renders the FTC disclosure beside the buttons and the
participation statement in the footer — both only when the tag is set, since
2026-09-27 — and marks every retail link `sponsored nofollow noopener`. The
built pages carry `https://www.amazon.com/dp/…` with no `tag=` because the
variable has never been set.

At the record's traffic (75 library visitors in 90 days) this earns cents. It
is on the board because it costs twenty minutes once and nothing after, and
because Amazon's three-sales-in-180-days rule needs the clock started before
the traffic exists to satisfy it.

## Run

1. Sign up at affiliate-program.amazon.com with the site's URL. The About page
   and the library entries are the content Amazon reviews; both exist.
2. Take the tracking id Amazon issues (the form is `something-20`).
3. In Vercel, Project → Settings → Environment Variables, add
   `NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG` for Production with that value.
4. Redeploy the current production deployment (`vercel redeploy <url>`, or push
   any commit): the variable bakes in at build time and does nothing until
   then (CLAUDE.md, Deployment).

## Verify

```bash
curl -s https://www.physicsofconnection.com/library/attention-and-effort-kahneman | grep -o 'amazon.com/dp/[^"]*'
curl -s https://www.physicsofconnection.com/library/attention-and-effort-kahneman | grep -c "We earn a commission"
curl -s https://www.physicsofconnection.com/ | grep -c "As an Amazon Associate"
```

The first prints links ending in `?tag=<the id>`; the second and third print
`1`.

## Acceptance criteria

- Every retail link on the 32 library entries carries the tag on production.
- The disclosure is on the 32 entries and the participation statement is in
  the footer, and neither was there before the tag was set.
- The Associates dashboard shows the site as an approved site.

## Scoring

Impact 2: cents at today's traffic, rising with it. Radius 2: 32 pages, and
the footer of all of them. Opportunity 4. Complexity 1: an account and a
variable. ROI 4.0.

## Outcome

_Not started._
