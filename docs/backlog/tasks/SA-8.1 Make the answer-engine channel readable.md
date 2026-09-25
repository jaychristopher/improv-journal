---
key: SA-8.1
type: task
summary: Brand Radar refuses to answer without a configured report, so the one channel the site actively builds an 88KB asset for has no measurement of any kind
epic: "[[Search alignment]]"
parent: "[[SA-8 The answer-engine channel is invested in and never measured]]"
status: To Do
priority: Medium
sequence: 1
executable: human
estimate: 60m
labels: [seo, ai-search, llms-txt, measurement]
impact: 2
radius: 3
opportunity: 6
complexity: 1
roi: 6.0
blocked_by: []
blocks: []
files:
  - src/app/robots.ts
  - scripts/check-crawler-access.mjs
---

# SA-8.1 — Make the answer-engine channel readable

## What was found

Measured against production on 2026-09-25.

**The channel is open, and deliberately so.** `npm run seo:crawlers`, eleven
agents, `/` and `/llms.txt`:

| Agent                                         | Kind   | Result  |
| --------------------------------------------- | ------ | ------- |
| Googlebot, bingbot, Applebot                  | search | 200     |
| OAI-SearchBot, PerplexityBot, Google-Extended | answer | 200     |
| ChatGPT-User, Claude-User, Perplexity-User    | live   | 200     |
| **ClaudeBot, GPTBot**                         | answer | **403** |

The two refused are training crawlers, which is exactly the stated edge policy —
`search=yes, ai-train=no, use=reference`. The policy and the reality match.

**The asset is real and recurring.** `/llms.txt` is **88,302 bytes**, and
`prebuild` regenerates it on every deploy.

**Nothing measures the return.** Ahrefs Brand Radar was asked directly for
citations of `physicsofconnection.com` in ChatGPT responses and refused:
`custom prompts require a report_id`. No Brand Radar report exists for this
project. `scripts/seo-audit.mjs` has no AI section. `check-crawler-access.mjs`
reports reachability, which is whether the door is open, not whether anybody
walked through it.

## Three things checked and found clean

Recorded so the next firing does not spend its budget here.

- **The 14-second TTFB is not real.** Ahrefs' crawl flags nine pages under
  "slow server response for AI crawlers", the worst at 14,028 ms. Re-measured
  with curl as Googlebot and as a browser, the same pages return in
  **0.09–0.34 s**. It is throttling of Ahrefs' own crawler, not a site defect.
- **The served robots.txt is clean and matches the source.** CLAUDE.md says
  "Cloudflare rewrites `robots.txt`", and `robots.ts` carries a comment about a
  managed block being injected above whatever it emits. Production now serves
  exactly what `robots.ts` generates and nothing else. That line in CLAUDE.md is
  stale; the 403s remain, but the robots.txt rewrite does not.
- **`llms.txt` being unlinked is probably fine.** Nothing references it —
  0 mentions in robots.txt, 0 of 386 built pages link to it. But root-path
  convention is how the format is discovered, so this is worth one cheap line of
  insurance, not a defect to be alarmed about.

## Run

1. **Configure a Brand Radar report for the project.** This is the whole task
   and it is dashboard work, not repo work. Track `physicsofconnection.com`
   against two or three genuine competitors on prompts the site is actually for
   — how to get better at improv, what "yes, and" means, exercises for
   listening — not on the party-question terms, which would measure the drift
   rather than the theme.
2. **Read it once and write the number down.** Whatever it says, put it in the
   dated comment block at the foot of `scripts/seo-audit.mjs` alongside the GSC
   readings, which is where this repo keeps first-party numbers. A recorded zero
   is a complete outcome and a useful baseline; it is the _absence_ of a number
   that makes the 88KB unarguable either way.
3. **Add the cheap insurance.** One `llms.txt` line in `robots.ts` next to the
   sitemap declaration. It costs nothing, it cannot break discovery that already
   works by convention, and it makes the asset self-documenting for anyone
   reading robots.txt to find out what the site publishes.
4. **Correct CLAUDE.md's deployment section.** It states that Cloudflare
   rewrites robots.txt. Production no longer shows that. Say what is true today
   — the 403s for ClaudeBot and GPTBot persist, the robots.txt rewrite does not
   — and date it, so the next reader does not go hunting for a block that is not
   there.

## Verify

- A Brand Radar report exists and has returned at least one reading.
- That reading, including a zero, is recorded and dated in `seo-audit.mjs`.
- `robots.txt` in production advertises `llms.txt`.
- CLAUDE.md's description of the edge matches what `npm run seo:crawlers`
  prints.
- `npm run check` green.

## Scoring

- **impact 2** — the epic's rule is explicit that impact is capped by evidence,
  and here the evidence is not merely missing but currently unobtainable: Brand
  Radar refused the query. What _is_ measured is only the cost side — 88KB a
  deploy, six agents admitted, zero visibility. Not 1, because the cost is real
  and recurring and the measured facts are retrieved rather than assumed, and
  because a recorded zero would justify either continuing or stopping. Not 3,
  because no number anywhere says this channel has sent this site a visitor.
- **radius 3** — `robots.txt` and `llms.txt` are site-wide artifacts governing
  how one whole class of client sees all 386 pages. Not 4: it changes no page,
  no content and no ranking logic.
- **opportunity 6**
- **complexity 1** — genuinely mechanical on the repo side: one line in
  `robots.ts`, one dated comment, one CLAUDE.md correction. Nothing here can
  break a ranking and all of it reverts in a single commit. The Brand Radar
  setup is a login and a form, which is why `executable` is `mixed` rather than
  `agent` — that is a gating fact, not a difficulty.
- **roi 6.0** — the highest ratio in the epic outside SA-1.1, and it earns that
  on cheapness rather than size. This is the shape ROI ordering exists to
  surface: small opportunity, near-zero cost. Do not read the 6.0 as a claim
  that this matters as much as SA-2.1, which shares it at four times the
  opportunity.

## Outcome

**Steps 3 and 4 done 2026-09-25; steps 1 and 2 wait on a report.**

**Step 1 — no report exists.** `management-brand-radar-reports` returned an
empty list on 2026-09-25, so nothing here can be read yet. Creating one is
dashboard work: track `physicsofconnection.com` against two or three genuine
competitors on the prompts the site is for — how to get better at improv,
what "yes, and" means, exercises for listening — not the party-question
terms. `executable` is set to `human` for that reason.

**Step 2 — the recorded absence.** `scripts/seo-audit.mjs` now closes with an
answer-engine reading: nine of eleven agents served, ClaudeBot and GPTBot
refused by policy, llms.txt 88,346 bytes rebuilt each deploy, Brand Radar
reports 0, citations not measured. When the report exists, read it once, put
the number in `ANSWER_ENGINES`, and move the date — that is the rest of this
step, and an agent can do it.

**Step 3 — no llms.txt line, and why.** Next's robots metadata route is typed
`rules`, `sitemap`, `host` and nothing else; the line would mean replacing
`robots.ts` with a route handler for the sake of one comment in robots.txt.
llms.txt is discovered at its root path by convention, `npm run seo:crawlers`
checks it is served, and the reasoning is in `robots.ts` so it is not
re-proposed. (One measurement made on the way: the card's 88,302 bytes is
88,346 today.)

**Step 4 — CLAUDE.md says what is true today.** Production serves exactly
what `robots.ts` emits — fetched and compared on 2026-09-25 — and ClaudeBot
and GPTBot are refused while the other nine agents are served, which is the
stated policy and not a fault. The bullet says so, dated, and `robots.ts`'s
own comment no longer describes an injected block that is gone.

**Worth carrying into the report when it exists:** the one AI product known
to cite this site, befreed.ai (SA-2.1), reached four communication guides
Google has never surfaced. The channel's first evidence is already in the
link profile.

`npm run check` green.
