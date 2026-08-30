---
key: EC-REG
type: register
summary: Running log of context-shaping mistakes, by entry point
epic: "[[Entry-point context]]"
status: Open
updated: 2026-08-30
---

# Context mistakes — running register

Append, do not rewrite. A dated entry that was later fixed is more useful than a
tidy list, because the pattern repeats and the entry is how it gets recognised
the second time.

Columns: what the visitor met, which entry point, and whether it is
**underload** (assumed context they lack) or **overload** (context they did not
need).

---

## 2026-08-30

**Sixteen guide links in a 260px sidebar** — organic search → concept page —
*overload*. Every other sidebar group held 2–9 links; one held 16, because
`ATOM_GUIDE_LIMIT` is 16. The worst page showed 45 links across 8 groups. Fixed
by collapsing overflow into `details`, which keeps the links crawlable. The
lesson worth keeping: the change that caused it was measured only by its SEO
effect, and nobody looked at the column it rendered into.

**No orientation on half the concept pages** — organic search → concept page —
*underload*. `ContextBanner` renders only when an atom belongs to both a thread
and a path, so 103 of 205 pages show none. All 32 library pages are in that group,
and they are the pages ranking best in Search Console. Open: [[EC-1.1 Give every
concept page a cold-arrival line]].

**Context written as internal taxonomy** — organic search → concept page —
*underload*. Where the banner does render it says "Part of *thread* in *path*".
Those names mean nothing to somebody who arrived thirty seconds ago from a Google
result; it locates the page in a structure they have never seen. Open:
[[EC-2.1 Rewrite the context line for someone who just arrived]].

**Byline before orientation** — organic search → any content page — *underload*.
The first thing under the title is "By Jay Christopher · Updated 24 August 2026".
For a returning reader that is provenance. For a cold arrival it is a name they do
not know, placed above any statement of what the site is.

**Context line above the breadcrumb** — organic search → concept page —
*overload*, and an ordering error. On all 102 pages that have one, the first
thing inside `main` was "Part of *thread* in *path* · Also in: *path*, *path*" —
up to 190 characters of internal titles before anything said where the reader
was. Fixed: breadcrumb first, and the extra paths dropped.

**The same navigation twice** — organic search → concept page — *overload*. Every
path that line listed already appears in the sidebar's "Part of" block, which
carries a superset. On be-present the line named three paths and the sidebar
named the same three. Kept one relationship rather than none, because the sidebar
renders below the article on mobile.

**A backlog item whose premise was wrong** — process note. [[EC-1.1 Give every
concept page a cold-arrival line]] was written to cover the 103 pages showing no
context line. Comparing them against the 102 that do showed the covered pages
were the worse ones: the line adds internal names, not orientation. Reframed
rather than done. The lesson is the one this register exists for — the fix was
scoped before the entry point was measured.

**Sixteen links between the title and the first sentence** — organic search →
concept page, on a phone — *overload*. The table of contents renders above the
body deliberately, so it survives on mobile and so a crawler meets the outline
before the prose. Both reasons are good, and both are what make a long outline
expensive: on the device the placement was chosen for, a sixteen-section
reference page put sixteen links in front of the reader before anything they
came for. Median is seven, so folding above eight leaves most pages untouched
and moves 117 links off the top of 48 of them.

**Two ideas that did not survive measurement** — process note. A generic
"what this site is" line looked like the obvious answer to the cold-arrival
problem, until the tagline turned out to be "Seven laws, nine principles" — true,
and meaningless to somebody who searched for a Substack. The nav looked
duplicated in the DOM until the second copy turned out to be the mobile menu,
correctly hidden with `display:none` and so absent from the accessibility tree.
Neither shipped. Recorded because the register is more useful with the misses in
it: both were plausible, and both would have added something irrelevant.

**The same position twice in the first thing on the page** — organic search →
course lesson — *overload*. Landing directly on a lesson, the header showed a
progress bar reading "Foundations: Your First Steps in Improv · 2 of 2" and,
immediately beneath it, an eyebrow reading "thread · 2 of 2". Duplication by
construction rather than a fallback: `positionInPath` is only assigned inside
`if (parentPath)`, which is the progress bar's own render condition, so the
eyebrow could never have been the only place it appeared. Fixed — eyebrow is the
type label now, as it is on concept pages.

**Progress appears after hydration and pushes the page down** — returning reader
→ homepage — *layout shift*. `ContinueJourney` returns null on the server and
renders above the symptom picker once localStorage is read, so for a reader with
saved state everything below moves. Fixed later the same day by sharing a slot with
"Start here" rather than reserving space — see the entry below.

**Told to start what you are already doing** — returning reader → homepage —
*overload, and contradictory*. The "Start here" card and the journey card were
stacked, so a reader mid-course met a card saying "Start the 7-day program"
directly above one saying "continue, thread 2 of 2". Two answers to the same
question in the two most prominent slots on the site. They are alternatives, so
they now share a slot: the card is passed into ContinueJourney and shown until
localStorage says otherwise.

That also closes the layout shift logged earlier the same day — the journey card
now replaces something rather than being inserted above it — which is worth
noting as a pattern. The shift and the contradiction looked like two findings
and had one cause: content that belongs in one slot was occupying two.

---

## Entry points examined, no defect found

- **Podcast listener** following a show-note link — lands on the guide the
  episode was made from (team-building-activities, stage-fright,
  psychological-safety). The page serves them as-is; nothing assumes they read
  rather than listened.
- **Nav duplication** — the second copy is the mobile menu, hidden with
  `display:none` and so already absent from the accessibility tree.

---

## Entry points not yet examined

Recorded so a later pass knows what has and has not been looked at.

- AI answer engine — currently moot, Cloudflare 403s those crawlers
- Social / newsletter arrival
- Mid-course arrival: a thread that is day 4 of a 7-day program, reached directly
