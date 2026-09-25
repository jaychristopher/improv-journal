---
key: SA-20
type: story
summary: serp_min_dr, serp_top10_dr and serp_verdict all measure reachability and none records intent, so a page can be promoted sitewide into a results page written for primary-school drama teachers
epic: "[[Search alignment]]"
status: To Do
priority: High
labels: [seo, serp, intent, drift]
tasks:
  - "[[SA-20.1 Record who a results page is for, not just whether we could reach it]]"
---

# SA-20 — Reachable is not the same as ours

The SERP discipline in this repo is careful and well argued. `serp_min_dr`
records the lowest domain rating holding a top-ten position, `serp_top10_dr`
records the whole distribution, and `serp_verdict` reads the page as `winnable`
or `authority`. `top-guides.ts` promotes on those numbers and excludes on them.

Every one of them answers the same question: **could a site with no authority
get in?**

None of them answers the other one: **who is the results page for?**

Twenty-two firings of this audit and nobody had read a SERP the site targets.
Two, read on 2026-09-25:

**`theatre games`** — 1,400 volume, difficulty 3, the guide's verdict `winnable`
at `serp_min_dr: 5`, and the page promoted from all 386 pages. The top ten is
Drama Notebook, "Drama Games for Kids", "5 theatre games to play at home",
"high school drama activities", "Easy Games for Drama Class", "One teacher's
favorite 10-minute concentration games", and a People Also Ask block asking
about middle schoolers and classrooms. It is a K-12 drama-education results
page, top to bottom.

**`improv games`** — a different shape entirely. Reddit holds position 2 with
three threads and a "more results from reddit.com" block; Quora takes two slots
at position 5. Roughly half the visible page is forum content.

The verdict on theatre-games is not wrong. A DR 9 blog does sit at position 7,
so the page really is reachable. It is just that reaching it means becoming a
resource for children's drama classes — which is precisely the drift this epic
exists to prevent, authorised by a field that cannot see it.
