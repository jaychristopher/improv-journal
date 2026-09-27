# Monetizing the site: what is fool-proof, what is not, and why

**Date:** 2026-09-27
**Question:** a way to earn from the site that cannot fail on execution, costs little effort, and asks almost nothing of the reader.
**Answer:** one already exists in the code and is switched off. Everything else either costs effort, needs delivery, or damages the reading. And no mechanism earns more than pocket money at the site's present size; the number that decides revenue is visitors, not the mechanism.

## 1. The site as measured

PostHog, read 2026-09-27 (project shared with another site, filtered to this host).

| Reading | Value |
|---|---|
| Unique visitors a month, April to September | 14 · 108 · 126 · 276 · 193 · 206 (September includes three days of testing traffic) |
| Pageviews a month | roughly 300, 612 in September with the testing |
| How they arrive | 89% with no referrer — a shared link, not a search; 84% land on the homepage as the first page of the visit |
| Search, all of 2026 to date | 36 clicks in Search Console; the site ranks between 40 and 90 for nearly everything it targets |
| Library entries (32 book pages), last 90 days | 75 people, 89 views; the Kahneman entry alone 18 people, *Truth in Comedy* 9, Meisner 7 |
| Buy-card clicks | never measured: the click listener recorded internal links only |
| Email capture, all time | 2 submitted, 1 accepted, 1 failed; the six-email sequence it promises is drafted and not built in EmailOctopus (`docs/sequences/tonights-material.md`) |
| Referring domains | 603, of which two are chosen citations; the rest are link sellers using the site's name (`src/lib/citations.mjs`) |

Two hundred people a month is the whole market for anything sold here.

## 2. The options, priced at two hundred visitors a month

The rates below are assumptions, labelled as such; the site has measured none of them. What they show is the order of magnitude, which is the point.

| Option | Reader friction | Effort to run | Expected at today's traffic | Why or why not |
|---|---|---|---|---|
| **Amazon Associates on the library** | none: the same buttons, tagged | 15 minutes once, then zero | cents a month. ~25 library visitors, maybe one in seven clicks, one in twelve of those buys a $20 book at 4.5% commission: well under a dollar | Built, disclosed, tested. Only the tag is missing. The one risk is Amazon's rule that an account with no three qualifying sales in 180 days is closed; at today's traffic that is a coin toss |
| Display ads | high: every page | an afternoon, then zero | $1 to $5 a month at 300 pageviews | Damages the thing the site is: pages people share because they read clean. Not worth a dollar |
| Tips, sponsor button | none | ten minutes | near zero | Nobody tips a site they found through a shared link once |
| A paid product: the beginner programme as a course, or the seven laws as an ebook | low if sold through Gumroad or Lemon Squeezy | days to package, hours a month after | one or two sales a month at 0.5 to 1% conversion, $15 to $30 | The content exists and the site's message is intact; the effort is real and the revenue is not, until the traffic is ten times what it is |
| Services: team workshops, coaching | low for the buyer | high: somebody has to deliver | one booking is worth more than everything above combined | The team cluster has the demand (team building activities: traffic potential 104,000) and none of the traffic; the guides rank at 70 to 90. And the about page positions the author as a builder of the graph, not a facilitator |
| Paid newsletter tier, sponsorship of the list | low | low once the list exists | nothing | The list has one confirmed address and the sequence it was promised does not exist |

## 3. The ruling

**Fool-proof, low effort, no friction: switch on the Associates tag.** The buy cards are on all 32 library entries, the edition links are recorded per book, the FTC disclosure sits beside the buttons, the paid `rel` is on every link, and `NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG` is read at build time. Set it and redeploy, and every library page earns on the next sale without a line changing. It is fool-proof in the only sense that matters: it cannot break the site and it cannot be done wrong.

**What it is not is income.** At two hundred visitors it earns cents, and the 180-day rule means the account may need re-applying for before the traffic can support it. That is the honest expectation, and it should be written down before the tag goes in, not after.

**What is not the answer.** Ads cost more than they earn. A course or an ebook is a fine product for this material and the wrong first step: the effort is in the marketing, not the packaging, and there is nobody to market it to yet. Services pay best and are the opposite of low effort.

**What actually decides it.** Every row in the table scales with visitors and nothing else. The growth strategy in `docs/growth-strategy.md` exists for that; monetization has no lever of its own.

## 4. Done today

- **Outbound clicks are measured.** The click listener records `outbound_clicked` for an external link inside a tracked block, with the block, the host and the destination without its tag (`src/lib/link-events.ts`). The buy cards become the first number an Associates decision can be checked against: clicks a month against sales a month.
- **The site no longer claims a commission it does not earn.** The FTC disclosure on the buy cards and the Associates participation statement in the footer render only when the tag is set. Untagged, the links are plain links and the page says nothing — which is what is true.
- **The owner's steps are cards.** `MZ-1.1` creates the account and sets the tag; `MZ-2.1` builds the six-email sequence the footer promises, because the list is the only asset here that compounds.

## 5. When to revisit

| Signal | Then |
|---|---|
| `outbound_clicked` from `buy-the-book` reaches 30 a month | Compare against Associates sales; if sales are under 3 in 180 days, expect the account closure and decide whether to reapply |
| Unique visitors pass 2,000 a month | Package the beginner programme or the seven laws as the first paid product, through a hosted checkout, and put one link on the paths hub |
| The list passes 200 confirmed addresses | A paid tier or a sponsor becomes possible; not before |
| A team guide reaches page one | The services question is worth asking then, with the about page rewritten first |

Read the record before each of these, not the plan.
