---
key: SA-18
type: story
summary: Ahrefs records zero organic keywords and zero organic traffic for the domain, its rank tracker has zero keywords in it, and nineteen backlog cards schedule a re-read against the one table that shows half a percent
epic: "[[Search alignment]]"
status: Done
priority: High
labels: [seo, measurement, rank-tracking, verification]
tasks:
  - "[[SA-18.1 Track the sixty queries the site actually has]]"
---

# SA-18 — Nothing is watching

Three endpoints, all agreeing, 2026-09-25:

- `site-explorer-metrics` — `org_keywords: 0`, `org_traffic: 0`,
  `org_keywords_1_3: 0`
- `site-explorer-organic-keywords` — empty
- `management-project-keywords` — empty

Ahrefs' index has no record of this domain ranking for anything, and the rank
tracker attached to its project has nothing in it. Meanwhile Search Console
reports 7,755 impressions, 36 clicks and four queries inside the top ten —
position 6.0 for "will hines substack", 6.9 for a listening query, 10.0 and 10.4
for two others.

This completes a pattern the epic has been assembling in pieces. SA-10.1 found
that Ahrefs cannot see the site's **demand** — seven of ten queries return null
for `traffic_potential`, `difficulty` and `parent_topic`. SA-14.1 found that
GSC's query tables expose **0.5%** of the impressions. This is the third face:
Ahrefs cannot see the site's **positions** either.

So every card in this epic that ends "re-read GSC in 30 days" — SA-1.1, SA-4.1,
SA-6.1, SA-7.1, SA-16.1, SA-17.1 — is scheduled against a table that shows half
a percent of the data and whose contents change with the start date.

And the instrument that would work is sitting empty. A rank tracker does not
need a keyword to have volume in an index; it checks a position for a string you
hand it. It is the one tool that is not blinded by either of the two problems
above, and it has zero keywords in it.
