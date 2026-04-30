# SOP 02 · SEO Research

## Purpose

Map the SERP and keyword cluster around the target keyword so the script can target the right phrasing and the upload metadata can capture long-tail traffic.

## Inputs

- Target keyword from SOP 01 (e.g. "how to deal with rejection")
- Country: us (default)
- Ahrefs MCP authenticated

## Outputs

Section in the buildup doc covering:
- SERP top 15 with URL, DR, traffic, angle
- White-space gaps (what NO ONE in top results is saying)
- Long-tail opportunities (related terms with KD ≤ 7)
- Search suggestions (intent variants)
- 2-4 SEO targets to weave naturally into the script and metadata

## Tools

- `mcp__claude_ai_ahrefs__serp-overview` — top 15 ranking results
- `mcp__claude_ai_ahrefs__keywords-explorer-related-terms` — sibling keywords
- `mcp__claude_ai_ahrefs__keywords-explorer-search-suggestions` — autocomplete-style intent variants

## Steps

1. **Run serp-overview.**
   ```
   keyword: "<target keyword>"
   country: "us"
   select: position, url, title, traffic, domain_rating, page_type, top_keyword, top_keyword_volume, refdomains
   top_positions: 15
   ```
2. **Tabulate the top 15.** For each: position, URL, DR, traffic, page type (article/Q&A/video/product), angle (the editorial framing).
3. **Identify white-space gaps.** Walk down the table asking: is there a perspective NOT represented? For our channel it's almost always the improv-perspective angle. Confirm by scanning: do any top results name our authors (Johnstone, Close, Spolin, Napier, UCB)?
4. **Run related-terms.** Pull 30 results sorted by volume desc. Filter to keywords with KD ≤ 7 — these are easy long-tail wins.
5. **Run search-suggestions.** Pull 30 results. Filter for intent variants ("without trying", "in conversation", "to a girl", "for X", etc.).
6. **Pick 2-4 SEO targets** to weave naturally:
   - Primary keyword (must appear 2-4× in script naturally + in URL slug + title)
   - 1-2 long-tail variants for title/description SEO juice
   - 1 conversational variant for naturalness in the spoken script
7. **Write the SEO section** of the buildup doc with: SERP table, gaps, picks.

## Quality bar

- Top 15 SERP captured with traffic + DR
- At least one named white-space gap (not just "no one mentions this")
- 6+ long-tail terms with KD ≤ 7 surfaced for description metadata
- SEO targets explicitly listed for the script writer (you, in iter 3)

## Common pitfalls

- **`select` parameter rejects unknown columns.** Stick to the documented set: `position, url, title, traffic, domain_rating, page_type, top_keyword, top_keyword_volume, refdomains, ahrefs_rank, backlinks, type, value, top_keyword, refdomains, url_rating, update_date, keywords`.
- **`view_for: "also-rank-for"` is invalid.** Don't pass a `view_for` — leave it default.
- **Forgetting the SERP recheck** after writing the script. If the script's hook doesn't differ from any top result, the white-space claim was wrong.
- **Including the SEO targets in spoken voiceover unnaturally.** Stuff them in the description, not the audio. The audio uses the natural phrasing.

## Estimated time

20-30 minutes. Three Ahrefs calls + tabulation + writing the section.

## Lessons from prior production

- L2 SERP analysis showed Reddit at position 1 with DR 95 — confirmed that high-DR forum threads dominate this space. Our angle (improv-perspective citation density) is differentiated enough to compete.
- L31 SERP showed standupcomedyclinic.com (DR 35) outranking scienceofpeople.com (DR 77) — content quality beats DR for thoughtful queries.
- Across 4 videos, the white-space gap was always the same: zero competition is naming improv teachers as sources. This is our channel's defensible position.
