---
key: MZ-1
type: story
summary: Thirty-two buy cards send readers to Amazon with no Associates tag, the pages disclose a commission nobody earns, and no event records the click
epic: "[[Monetization]]"
status: In Progress
priority: Medium
labels: [monetization, affiliate, library, measurement]
tasks:
  - "[[MZ-1.1 Create the Associates account and set the tag]]"
  - "[[MZ-1.2 Measure the buy-card click]]"
---

# MZ-1 — The buy cards earn nothing and say they do

Every library entry ends with a reader deciding whether to buy a book, and
since the buy cards landed every one of those decisions has had a button. The
button's link carries no tag: `NEXT_PUBLIC_AMAZON_ASSOCIATES_TAG` was never
set, so the 75 people who read a library entry in the last 90 days went to
Amazon and earned the site nothing.

Two things were wrong around that. The card told them "we earn a commission if
you buy through these links", which was untrue, and the footer carried the
Associates participation statement on every page without an account behind it.
And the click itself was invisible: the delegated listener recorded internal
links only, so the one number an Associates decision needs — clicks a month
against Amazon's three-sales-in-180-days rule — did not exist.

The second and third are code and are done. The first is an account.
