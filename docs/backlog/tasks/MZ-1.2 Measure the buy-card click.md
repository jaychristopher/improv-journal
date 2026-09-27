---
key: MZ-1.2
type: task
summary: Record the click on an outbound link inside a tracked block, so buy-card clicks a month can be read against Amazon's sales rule, and stop the pages disclosing a commission that is not earned
epic: "[[Monetization]]"
parent: "[[MZ-1 The library sends readers to Amazon untagged and nothing measures the click]]"
status: Done
priority: Medium
sequence: 2
executable: agent
estimate: 45m
labels: [monetization, affiliate, measurement, analytics]
impact: 2
radius: 2
opportunity: 4
complexity: 1
roi: 4.0
blocked_by: []
blocks: []
files:
  - src/app/providers.tsx
  - src/lib/link-events.ts
  - src/components/BuyTheBook.tsx
  - src/components/Footer.tsx
  - src/lib/__tests__/link-events.test.ts
  - src/lib/__tests__/affiliate.test.ts
  - src/lib/__tests__/footer-and-capture.test.ts
---

# MZ-1.2 — Measure the click, and tell the truth about the commission

## What was found

The delegated listener in `providers.tsx` captured `link_clicked` for an
internal link inside a `[data-track]` wrapper and returned early on anything
else, so a click on a buy card's Amazon button — the only click on the site
that could earn money — fired no event. PostHog, 2026-09-27: `buy-the-book`
appears in no click event since the listener landed on 2026-09-21.

At the same time the buy card said "we earn a commission if you buy through
these links" and the footer said "as an Amazon Associate I earn from
qualifying purchases", on a site with no Associates account and no tag.

## Run

```bash
npx vitest run src/lib/__tests__/link-events.test.ts src/lib/__tests__/affiliate.test.ts src/lib/__tests__/footer-and-capture.test.ts
```

## Verify

```bash
grep -c "outbound_clicked" src/app/providers.tsx
grep -c "AMAZON_ASSOCIATES_TAG &&" src/components/BuyTheBook.tsx src/components/Footer.tsx
```

The first prints `1`; the second prints `1` for each file.

## Acceptance criteria

- An external link inside a tracked block fires `outbound_clicked` with the
  block, the host and the destination without its `tag` parameter, through
  `trackEvent` so both transports see it.
- The disclosure and the participation statement render only when the tag is
  set, and the affiliate guard holds both states.
- Internal links still fire `link_clicked` exactly as before.

## Scoring

Impact 2: it earns nothing itself; it is the number MZ-1.1 is judged by.
Radius 2: the 32 buy cards and every tracked block with an external link.
Opportunity 4. Complexity 1. ROI 4.0.

## Outcome

**Done 2026-09-27.** `outboundEvent` in `src/lib/link-events.ts` reads an
external `http(s)` link into `{ block, host, href, page }` with the `tag`
parameter removed, so the event reads the same before and after MZ-1.1; the
listener calls it for any non-internal href inside a tracked block and fires
`outbound_clicked`. The disclosure and the participation statement are behind
`AMAZON_ASSOCIATES_TAG &&`; `affiliate.test.ts` now expects the disclosure
when the tag is set and its absence when it is not, and
`footer-and-capture.test.ts` asserts the condition is in the source. The
first reading to take, after MZ-1.1 has run a month: `outbound_clicked` where
`block = 'buy-the-book'`, by host, against the Associates report.
