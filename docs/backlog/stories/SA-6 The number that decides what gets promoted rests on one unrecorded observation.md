---
key: SA-6
type: story
summary: serp_min_dr gates promotion and ranks the audit, but 48 of 71 verdicts carry it with no distribution behind it — including the 44,000 traffic potential page it currently props up
epic: "[[Search alignment]]"
status: Done
priority: High
labels: [seo, serp, evidence, promotion]
tasks:
  - "[[SA-6.1 Corroborate the floors that are load-bearing]]"
---

# SA-6 — The load-bearing number nobody wrote down

`serp_min_dr` is the lowest domain rating observed holding a top-ten position.
It is the closest thing this site has to proof that a results page is open to a
domain with no authority, and the repo treats it that way: `top-guides.ts`
promotes a guide to all 386 pages when that floor is under 6, and
`npm run seo:audit` ranks the winnable set by it.

`top-guides.ts` also knows it is not enough on its own. `CORROBORATING_REACHABLE`
exists because one weak result proves little — how-to-overcome-fear-of-failure
has a lone DR 1 against seven domains between 62 and 99, and that page was
being promoted sitewide on it. The rule the file settled on is that where the
top-ten distribution has been recorded, the floor must be backed by a second
reachable result; where it has not, the floor stands alone, on the principle
that absent data is not evidence of being shut out.

That asymmetry was a reasonable call when it was made. What nobody has said out
loud is how far it reaches: 48 of 71 verdicts have no distribution, so for two
thirds of the guide layer the corroboration rule never runs at all. And the
single largest opportunity on the site by this measure — 21-questions-game, at
44,000 traffic potential with a floor of DR 2 — is one of the 48.

The audit already prints the warning: "6 of these rest on a single reachable
result — treat the minimum with care." Nothing acts on it.
