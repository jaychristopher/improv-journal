---
key: DI-2
type: story
summary: The city pages target real demand but register no keywords, so the audit cannot see them and nothing reads whether search finds them
epic: "[[Improv directory]]"
status: To Do
priority: Medium
labels: [seo, keywords, search-console]
tasks:
  - "[[DI-2.1 Register the directory's terms once Search Console shows the pages]]"
---

# DI-2 — Nobody can see whether the city pages are found

"improv classes near me" is 3,600 searches a month in the US and "improv
near me" 800 (Ahrefs, 2026-09-30), and the hub answers both; the city terms
run from 700 (New York) down to nothing. None of it is registered in
`src/lib/route-keywords.ts`, on purpose: a route that registers a term takes
on the collision guard's title rule and the llms listing rule, and sixty
templated titles are better read by Search Console first than claimed
blind. When `gsc-pages` from 2026-02-01 shows the hub or a city page, the
terms it surfaced for go into the registry with that date, and the hub's
title is reconsidered against them.
