---
key: SA-2.1
type: task
summary: The referring-domain count grows 30-40 a month on its own, and one genuine DR 43 citation is buried in it
epic: "[[Search alignment]]"
parent: "[[SA-2 The link profile is unreadable, and nobody is watching it]]"
status: Done
priority: High
sequence: 1
executable: mixed
estimate: 120m
labels: [seo, backlinks, measurement, disavow]
impact: 4
radius: 5
opportunity: 20
complexity: 3
roi: 6.7
blocked_by: []
blocks: []
files:
  - scripts/seo-audit.mjs
  - src/lib/citations.mjs
  - src/lib/__tests__/citations-resolve.test.ts
---

# SA-2.1 — Separate the real citation from the spam

## What was found

Referring domains, Ahrefs `site-explorer-refdomains-history`, subdomains mode,
monthly:

| Month   | Refdomains |
| ------- | ---------- |
| 2026-03 | 0          |
| 2026-04 | 20         |
| 2026-05 | 43         |
| 2026-06 | 86         |
| 2026-07 | 153        |
| 2026-08 | 173        |
| 2026-09 | 214        |

It has risen every month since the site launched, by roughly 30 to 40 a month,
without anybody doing outreach. This is automated: the site is being scraped
into link-shop directories.

**And a correction to a finding from 2026-09-24.** That audit reported "586
referring domains, all nofollow backlink-shop spam." That is wrong, and it is
wrong in the way that matters. It ordered by domain rating, and the high-DR rows
happened to be nofollow. Ordered by `dofollow_links` instead:

| Domain              | DR       | Dofollow | First seen |
| ------------------- | -------- | -------- | ---------- |
| **befreed.ai**      | **43.0** | **6**    | 2026-09-10 |
| cartermanageus.com  | 0.0      | 2        | 2026-09-11 |
| blogerreviewers.com | 0.1      | 2        | 2026-08-13 |
| mokra.shop          | 0.0      | 2        | 2026-09-13 |
| lemvi.shop          | 0.0      | 2        | 2026-09-13 |
| wecelebrities.com   | 6.0      | 2        | 2026-08-04 |
| murvi.shop          | 0.0      | 1        | 2026-09-18 |
| nivira.shop         | 0.2      | 1        | 2026-09-18 |

Two things the earlier reading missed:

1. **There is one real-looking citation.** `befreed.ai`, DR 43, six dofollow
   links, first seen two weeks ago. It is by a wide margin the best link this
   site has, it arrived without anybody asking, and nothing in the repo knows
   it exists.
2. **Some of the spam is dofollow**, and the `.shop` names — mokra, lemvi,
   murvi, nivira — are one network, first seen within days of each other. Only
   dofollow spam can carry a penalty; nofollow spam is noise. The distinction
   the earlier reading collapsed is exactly the one a disavow decision rests on.

## Why it matters more than its traffic

Nothing on this site ranks for anything contested at DR 0.2, so link
acquisition is the constraint every other task in this epic sits behind. The
number that would tell the owner whether outreach is working rises by 30 to 40
a month regardless. The signal is buried in noise that grows faster than the
signal ever will.

## Run

1. **Find out what befreed.ai is and what it cited.** Fetch the six linking
   pages. If it is a real citation, the question worth answering is _which_
   pages it chose and why — that is a repeatable acquisition channel and the
   only evidence on this site of anyone linking it voluntarily.
2. **Classify the dofollow tail.** Pull every refdomain with
   `dofollow_links > 0`. Separate plausible citations from the link-shop
   network. Report the count of each; do not guess at intent from the name
   alone.
3. **Decide disavow on that evidence, and write the decision down either way.**
   Google's own guidance is that most sites should not use the tool and that it
   generally ignores obvious spam. The bar for filing is dofollow spam at a
   volume that could plausibly be read as a scheme — not discomfort at the
   list. A recorded "no, and here is why" is a complete outcome for this step.
4. **Make the number readable.** Add a refdomain reading to the audit that
   separates dofollow from nofollow and names the known spam networks, so the
   next person can see at a glance whether a real link has arrived. The comment
   block in `scripts/seo-audit.mjs` already carries dated GSC readings and says
   to move the date when refreshing — follow that convention rather than
   inventing a second one.

## Verify

- The six befreed.ai target URLs are recorded, with what they cite.
- Dofollow refdomains are split into plausible and spam, with counts.
- The disavow decision is written down with its reasoning, whichever way it goes.
- Re-reading the audit answers "has a real link arrived since?" without another
  Ahrefs query.

## Scoring

- **impact 4** — this does not bring a visitor by itself, which is why it is not 5. It is the constraint everything else queues behind: at DR 0.2 no page wins
  a contested term, and this is both the first evidence of a voluntary citation
  and the first sight of dofollow spam. Judging outreach is impossible while the
  metric moves on its own.
- **radius 5** — domain-wide. The link profile is the one input that affects
  every page's ceiling at once.
- **opportunity 20**
- **complexity 3** — not mechanical. It needs a judgement call on disavow, which
  Google warns against making casually and which is unpleasant to unwind, plus
  reading the linking pages rather than the domain names. Not 4: no content
  changes and no URL changes.
- **roi 6.7** — below SA-1.1's 8.0, correctly. That one converts a ranking the
  site already holds, for less work and with a more certain result.

## Outcome

**Done 2026-09-25.** Two citations, not one; the rest of the profile is one
trade; no disavow, with the reasons written down; and the audit now prints the
profile split the one way that makes it readable, from a dated list that a
guard reads too.

**Step 1 — befreed.ai is an AI learning product, and it cited four pages.**
`site-explorer-all-backlinks`, subdomains mode (`history: all_time` returns
the same rows), holds four live dofollow links from `www.befreed.ai/podcast/…`.
Each is a generated podcast lesson — two hosts, a transcript — that lists the
guide under "Knowledge Sources" as one of six, with our full `<title>` and URL
as the anchor:

| Episode                              | Cites                       | First seen |
| ------------------------------------ | --------------------------- | ---------- |
| social-intelligence-reading-the-room | /how-to-read-body-language  | 2026-08-12 |
| magnetic-presence-art-of-being-seen  | /how-to-be-more-charismatic | 2026-08-25 |
| ten-second-scan-reading-the-room     | /how-to-read-the-room       | 2026-09-07 |
| mechanics-of-dry-wit                 | /how-to-be-witty            | 2026-09-22 |

The card said six. That is the referring-domains endpoint's `dofollow_links`
column, which reports six for befreed.ai and about twice the live backlink
rows for the spam domains as well (126 across the 57 domains against 63 rows);
the backlink table is the count to use. Four is the number.

Two things about _which_ pages. All four are generic communication guides —
the group this audit's "ever surfaced, by subject" reading says Google has
never shown — and none of the four is in `gsc-surfaced.mjs` or among the 83
queries in the rank-tracker list. The one product that cites this site chose
the pages Google ignores. And the arrivals are 13, 13 and 15 days apart, which
reads as a pipeline still drawing on the site rather than a one-off. That is
the only acquisition channel on the site with evidence behind it, and it is an
AI product reading pages on a site whose Cloudflare layer returns 403 to AI
crawlers (CLAUDE.md, Deployment); whatever befreed fetched with got through.
SA-8.1 is where that question belongs.

**Step 2 — the dofollow tail, read by anchor.** 63 live dofollow links from 57
domains (`is_dofollow eq true`: 63 rows; `dofollow_links gt 0`: 57 rows):

| Class        | Domains | Links |
| ------------ | ------- | ----- |
| Citations    | 2       | 5     |
| Directory    | 1       | 1     |
| Link-selling | 54      | 57    |

- **Citations.** befreed.ai above, and sofiavicedomini.me (DR 6, 2026-08-18):
  a working actress's own post on improvisation for character, linking
  `/practice/techniques/character-through-game` with the page title as the
  anchor. Fetched and read — hand-written, no SEO trade anywhere on the site.
- **Directory.** ev6.net, an IPv6 site list, linking
  `audio.physicsofconnection.com`. Automated, harmless, not a citation.
- **Link-selling.** 44 links carry the anchor "High Quality Dofollow Backlinks
  DA 50 PA 40 Premium PBN Network Service physicsofconnection.com … Buy
  Backlinks Online Cheap" and 13 carry "Trusted Contextual Link Placements for
  physicsofconnection.com …". Every one points at the homepage. The pages are
  either the shared `/all/2255/16.html` or `/<category>/<sales-slug>-<hash>`;
  DR 0–0.6 but for bunero.shop at 60 and toponlinegamblingcasinos.online at 43. The first arrived 2026-08-03.

Two corrections to readings made from names. The five-letter `.shop` domains
(mokra, lemvi, murvi — 27 of them) are not a network apart from the
content-farm names: same two anchor templates, same page shapes, same weeks.
And none of it is aimed at this site. The anchors are adverts to whoever
searches their own domain, with this site's name as the sample text; a bought
link would carry our keyword and point at a money page, and these carry "Buy
Backlinks" and point at the root.

The nofollow side is the same trade at higher DR. Of 603 live referring
domains (`site-explorer-backlinks-stats`: 1,115 live links; 779 domains and
1,504 links all-time), 546 carry no dofollow link, and the top anchor across
the whole profile — "Boost Rankings & Massive Traffic | High DR & High Traffic
SEO Backlinks for Casino, Crypto … For physicsofconnection.com" — sits on 463
of them. The earliest (itxoft-\*.site, fiverr-\*.site, DR 59–68) arrived
2026-04-14, two weeks after launch.

**The card's own table was www only.** Its series (20, 43, 86, 153, 173, 214)
is `www.physicsofconnection.com` in subdomains mode, reproduced exactly today.
The whole domain — apex, www and audio — reads 23, 46, 262, 415, 399, 606 and
matches the stats endpoint's 603. The gap is the trade pointing at the bare
apex; both citations point at www. The audit prints the whole-domain series
and says which one the card used.

**Step 3 — no disavow, decided 2026-09-25.** Google's page
(support.google.com/webmasters/answer/2648487): "in most cases, Google can
assess which links to trust without additional guidance, so most sites will
not need to use this tool"; the stated bar is a considerable number of spammy
links _and_ a manual action caused or likely; and "if used incorrectly, this
feature can potentially harm your site's performance." Against that:

- 57 dofollow links from DR-0 pages, all to the homepage, whose anchors
  advertise the linker's own service, is scraping, not a scheme a reviewer
  could read as bought — a scheme carries the target's keywords.
- No sign of harm: the site's best month (2026-08, 19 clicks at 1.53%) is the
  month the dofollow spam began.
- A file would have to be kept against a list that grew by about 200 domains
  in June and again in September, and the site has exactly two real links to
  lose to a wrong line in it.

Reopen on either of two observations, neither made: a manual action in
Search Console, or spam anchors carrying this site's own keywords at its
pages.

**Step 4 — readable without another query.** `src/lib/citations.mjs` is the
dated list — domain, DR, first seen, pages cited, what the citing page is —
in the shape of `gsc-surfaced.mjs`. `scripts/seo-audit.mjs` imports it and
closes with the profile: live domains, dofollow domains, the citations by name
and page, the trade's counts, the decision, the monthly series, and the
refresh rule — pull `dofollow_links > 0` by `first_seen desc`; an anchor that
names a page is a citation, one that names the site is not.
`citations-resolve.test.ts` fails if a cited path stops being a bridge, an
atom URL or a redirect source, because a slug rename is an ordinary edit here
and would 404 the best links the site has without failing anything else.
CLAUDE.md carries the one-paragraph version so the "586 domains, all nofollow
spam" reading is not made a third time.

**What moved.** No content, no URLs. Registers 17 done, 24 open; the SA-2
story closes with its only task. `npm run check` green, 277 files, 1,444 tests.

**Re-read in 30 days:** `site-explorer-referring-domains`, `dofollow_links gt
0`, `first_seen desc`, against the list; and whether befreed.ai's cadence
held — on 13–15 days the next episode would land between 2026-10-05 and
2026-10-07.
