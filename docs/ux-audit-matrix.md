# UX Audit Matrix: Page × Persona Context Review

**Date:** 2026-04-22
**Goal:** Evaluate whether each page gives the right amount of context for each persona arriving from their likely entry path. Not too much, not too little, right next steps visible.

**Scoring:**
- **Context:** Too little / Right / Too much
- **Next step:** Clear / Unclear / Missing
- **Overwhelm risk:** Low / Medium / High
- **Action:** None / Tweak / Rewrite / Add content
- **Status** (added 2026-09-22): Built / Open / Superseded — what did it and when, by commit, tracker entry or backlog task. Added under tracker entry 293, which found this audit cited by no test, task or entry five months on; `src/lib/__tests__/ux-audit-status.test.ts` fails if a Tweak row loses its status.

---

## Personas

| ID | Persona | Typical entry | What they need |
|----|---------|--------------|----------------|
| A | New-to-improv beginner | Search → bridge, quiz | Permission to start, no jargon, clear first step |
| B | Life-application seeker | Search → bridge | Practical takeaways, connection to their problem, optional depth |
| C | Team leader/facilitator | Search → bridge | Exercises they can run Monday, credibility signals |
| D | Practicing improviser (stuck) | Search or direct | Diagnostic language, specific drills, not beginner content |
| E | Performer (mastery) | Quiz or direct | Advanced frameworks, tradition-aware, respects their experience |
| F | Teacher | Quiz → teaching path | Pedagogy, curriculum design, not "how to improv" |
| G | Returning visitor | Homepage → continue | Where they left off, progress, motivation to continue |

---

## 1. HOMEPAGE (/)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| A - Beginner | HIGH | Right | Clear | Low | Hero speaks directly to curiosity. "Start here" recommendation + quiz gives two clear entry points. No jargon. | None | — |
| B - Life seeker | HIGH | Right | Clear | Low | Hero question resonates ("conversations magic vs flat"). Quiz step 1 "understand people better" maps well. "Specific problem" → /guides is smart. | None | — |
| C - Team leader | MED | Too little | Unclear | Low | Nothing on the homepage signals "this is for teams/leaders." Quiz step 1 option 2 ("team to work better") exists but team leaders might not self-select into "understand people better" first. | Tweak — consider making quiz step 0 have a team-specific option, or add a team callout below the quiz | Open until 2026-09-22. The quiz gained "I lead a team" that morning (a318790, 04:48) and lost it when the symptom quiz replaced the quiz six hours later (53e7f30, 10:56); the five symptoms are all first-person, so nothing above the guide clusters said teams. Built by backlog task EC-4.1 (2026-09-22): one line under the quiz to /topics/teams and /paths/improv-for-teams. |
| D - Improviser | MED | Right | Clear | Low | Quiz step 0 option 2 ("I do improv") is direct. Substeps are well-differentiated. | None | — |
| E - Performer | LOW | Right | Clear | Low | Quiz reaches performer paths in 2 clicks (step 0 → step 2 → step 3). Fast enough for someone who knows what they want. Direct links at bottom work as bypass. | None | — |
| F - Teacher | MED | Right | Clear | Low | Quiz step 0 option 3 goes directly to teaching path. One click. Clean. | None | — |
| G - Returning | HIGH | Right | Clear | Low | ContinueJourney card shows above quiz with path name, thread position, and resume link. "Start over" available. Good. | None | — |

**Homepage verdict:** Strong for most personas. One gap: team leaders have no obvious signal before entering the quiz. The hero framing ("conversations") doesn't scream "team dynamics."

---

## 2. BRIDGE PAGES (/{slug})

### 2a. Beginner-targeted bridges (what-is-improv, rules-of-improv)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| A - Beginner | HIGH | Right | Clear | Low | Long-form educational content that builds understanding before asking for commitment. "Try this" exercises + "Go deeper" CTA to beginner-foundations. No jargon. | None | — |
| B - Life seeker | MED | Too much | Unclear | Medium | These bridges are improv-focused, not problem-focused. A life seeker who landed here was probably searching for something else. The "Go deeper" CTA leads to an improv path, which may feel like a genre mismatch. | Tweak — add a "Not an improviser?" callout near the CTA linking to /guides for problem-focused content | Superseded. Built 2026-04-22 (585850b) as LevelRedirect's bridge hatch, "Not an improviser? Browse guides by topic", but the mount now requires a guide with an entry path and no primary CTA, and every guide with an entry path gets a fallback CTA — it renders on none of the 78 built guides (2026-09-22). The route out is the breadcrumb: Home › Guides › the guide's topic cluster, on every guide since 2026-08-21 (5efb3bf). |
| D - Improviser | LOW | Too basic | Missing | Low | An experienced improviser landing on "what is improv" or "rules of improv" will bounce — content is beneath their level. No signal that deeper content exists. | Tweak — add a "Looking for something more advanced?" link to /learn/intermediate or /learn/performer | Superseded. Never built on the guide. The guide's CTA hands off to its entry path; the path page's "Start by level" link (entry 250) reaches the audience hub, whose up arrow is derived from the ladder (entry 247) and says which way it goes (entry 281). Two clicks from the guide rather than the one the audit asked for. |

### 2b. Life-application bridges (how-to-stop-overthinking, how-to-be-witty, etc.)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| B - Life seeker | HIGH | Right | Clear | Low | Problem-first framing. Improv principles presented as solutions, not as improv education. "Try this" exercises are practical. "Go deeper" CTA to a learning path works for those who want more. | None | — |
| A - Beginner | MED | Right | Clear | Low | These bridges work as gentle on-ramps. Someone curious about improv who searches "how to be less awkward" gets value and a path to learn more. | None | — |
| D - Improviser | LOW | Too basic | Missing | Low | An improviser who lands here gets useful content but no signal that there's advanced material. The CTA routes to beginner/intermediate paths. | Tweak — same as 2a, add "already an improviser?" escape hatch | Superseded, as 2a D: the level hatch lives on the path page and the hub, not the guide (entries 247, 250, 281). |

### 2c. Team-targeted bridges (team-building-activities, team-bonding, etc.)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| C - Team leader | HIGH | Right | Clear | Low | Exercises with clear instructions, time estimates, group sizes implied. "Go deeper" → improv-for-teams path. Credibility through improv-science framing. | None | — |
| B - Life seeker | MED | Right | Clear | Low | Overlap works — team dynamics are personal dynamics at scale. Content is accessible to non-leaders. | None | — |
| A - Beginner | LOW | Right | Clear | Low | Can follow exercises without improv experience. Not overwhelming. | None | — |

### 2d. Improviser-targeted bridges (how-to-be-funny, stage-fright, how-to-get-better-at-improv)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| D - Improviser | HIGH | Right | Clear | Low | Speaks their language. Diagnostic framing. "Go deeper" → self-coaching-toolkit or systems-of-improv. | None | — |
| A - Beginner | MED | Right | Clear | Low | "How to be funny" and "stage fright" are common beginner concerns. Content is accessible. | None | — |
| E - Performer | LOW | Too basic | Unclear | Low | "How to get better at improv" is pitched at intermediate. Performer needs a signal toward mastery content. | Tweak — add performer-level escape hatch | Superseded, as 2a D. how-to-get-better-at-improv hands off to the Self-Coaching Toolkit, whose hub reads "Ready for mastery? Try Advanced Game and Character" (entries 247, 250, 281). |

### 2e. Teacher bridge (how-to-give-feedback)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| F - Teacher | HIGH | Right | Clear | Low | Directly relevant. "Go deeper" → teaching-improv path. | None | — |
| C - Team leader | MED | Right | Clear | Low | Feedback skills transfer to team context. Accessible. | None | — |

### 2f. Theory bridge (improv-theory)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| E - Performer | MED | Right | Clear | Low | Five-tradition overview respects their experience. "Go deeper" → reference-guide. | None | — |
| F - Teacher | MED | Right | Clear | Low | Tradition comparison is useful for curriculum design. | None | — |
| D - Improviser | MED | Right | Clear | Medium | Dense content. 2,000+ words of tradition analysis. Might overwhelm someone looking for practical help. But self-selecting audience (they searched "improv theory"). | None | — |

**Bridge verdict:** Strong overall. One recurring pattern: **no escape hatch for wrong-persona visitors.** If a performer lands on a beginner bridge, or an improviser lands on a life-application bridge, there's no signal that better-matched content exists. This is fixable with a small component.

---

## 3. PATH PAGES (/paths/[slug])

### 3a. Beginner paths

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| A - Beginner | HIGH | Right | Clear | Low | "Who this is for", prerequisites, learning objectives, estimated time — all clearly presented. Syllabus shows threads with descriptions and durations. Start button is prominent. | None | — |
| B - Life seeker | HIGH | Right | Clear | Medium | Path page is information-dense: objectives, prerequisites, who-it's-for, time estimate, practice cadence, sidebar. Life seekers may just want to dive in. The meta-information might feel like school. | Tweak — consider whether improv-for-life path description speaks to life seekers vs improv students | Superseded. The path's description ("No stage required") and who-this-is-for ("drawn more to human connection than performance") date from 2026-04-13, and the syllabus rewrite of 2026-08-22 renders both at the top of the page; nothing left to tweak. |
| C - Team leader | HIGH | Right | Clear | Medium | improv-for-teams path page works. But "course path" label and academic structure may create friction for someone who wants "exercises for my Monday meeting." | Tweak — add a "quick start" option or highlight the most practical thread | Built 2026-04-22 (53e7f30): a "Start this path" button to the first lesson at the head of every path page (`path-start`), and the syllabus lists each lesson with its rep target and success signal. |
| D - Improviser | MED | Too basic | Unclear | Low | If an improviser lands on beginner-foundations, nothing tells them "this isn't for you — try self-coaching-toolkit." Prerequisites say "no experience required" which is a negative signal for them. | Tweak — add a "too basic?" callout linking to intermediate/performer paths | Built 2026-04-22 (585850b) on the path page as "Already comfortable with improv? Try the Self-Coaching Toolkit"; unmounted 2026-08-22 by the syllabus rewrite; since entry 250 (2026-09-21) on the audience hub the path's "Start by level" link reaches, with the target derived from the ladder (entry 247) and its direction said (entry 281). |

### 3b. Intermediate path (self-coaching-toolkit)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| D - Improviser | HIGH | Right | Clear | Low | Prerequisites assume familiarity. Diagnostic framing matches their need. Thread descriptions are specific enough to be intriguing. | None | — |
| A - Beginner | LOW | Too much | Unclear | High | If a beginner accidentally reaches this, the diagnostic language and assumed experience would be intimidating. No "start here instead" signal. | Tweak — add "new to improv? start with Foundations" callout | Built as 3a D. The intermediate hub reads "New to improv? Start with Foundations" (entries 247, 250). |

### 3c. Performer paths

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| E - Performer | HIGH | Right | Clear | Low | Prerequisites, advanced language, tradition references — respects experience. 3 threads is the right length for focused mastery work. | None | — |
| D - Improviser | MED | Too advanced | Unclear | Medium | Prerequisites might not be met ("comfort with finding and heightening the game"). No suggestion for where to start if you're not ready. | Tweak — add "not there yet? try self-coaching-toolkit" callout | Superseded by entry 247 (2026-09-21). Built 2026-04-22 (585850b) as the toolkit; the one ladder now puts the reference guide directly under performer, so the performer hub's down arrow reads "Need to solidify the basics? Try the Improv Reference Guide". The toolkit is one rung further down. |

### 3d. Teacher path

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| F - Teacher | HIGH | Right | Clear | Low | Clear audience targeting. Prerequisites match ("solid personal improv experience"). 4 threads with good progression. | None | — |
| E - Performer | LOW | Right | Unclear | Low | A performer who stumbles here sees "for experienced improvisers who have started teaching" — clear self-selection signal. But no "go back to performer paths" link. | Tweak — minor, add cross-link | Superseded by entry 247 (2026-09-21). Teacher sits below advanced and performer on the ladder, so the teacher hub's up arrow is the reference guide ("Want the full map?"); the performer paths are one more rung up, on /paths. |

### 3e. Advanced path (reference-guide)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| E - Performer | MED | Right | Clear | Medium | Dense meta-content. "This isn't a path in the usual sense — it's an index." Clear framing. But 4 threads + "open-ended reference use" is vague about what you'll actually do. | Tweak — make thread descriptions more concrete about the specific value each delivers | Superseded. Since 2026-04-22 (53e7f30) the syllabus renders each lesson's own description, rep target and success signal under its title, and the path essay's four bold paragraphs say what each delivers; the 2026-08-22 rewrite kept both. What a lesson delivers is stated by the lesson. |
| F - Teacher | MED | Right | Clear | Medium | Same as above. Useful for curriculum design but the "reference" framing might undersell the value. | None | — |
| D - Improviser | LOW | Too much | Unclear | High | Multi-tradition analysis, 119 atoms, knowledge graph — this is grad school, and the improviser wanted help with scenes. Needs a clearer "wrong door" signal. | Tweak — add "looking for practical help? try self-coaching-toolkit" | Superseded by entry 247 (2026-09-21). Built 2026-04-22 (585850b) as "Looking for practical help? Try the Self-Coaching Toolkit"; the ladder now puts teacher directly under advanced, so the advanced hub's down arrow reads "Want the classroom version? Try Teaching Improv". |

**Path page verdict:** The path pages are well-structured but have a consistent gap: **no cross-navigation for wrong-level visitors.** Every path should gently redirect visitors who are above or below the intended level.

---

## 4. THREAD PAGES (/threads/[slug])

### 4a. Beginner threads

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| A - Beginner | HIGH | Right | Clear | Low | LessonFrame gives structure: goal, takeaway, practice prompt. Progress bar shows position. "Composed from" atoms are available but not forced. Audio option. Checkpoint for completion. Next thread nav. | None | — |
| B - Life seeker | MED | Right | Clear | Medium | LessonFrame is pedagogically heavy for someone who just wanted to understand conversations better. The "lesson goal / key takeaway / common mistake" framing feels like a class. Content itself is accessible. | Tweak — consider whether LessonFrame metadata should be collapsible or shown differently for non-path visitors | Built 2026-04-22 (a318790): the lesson overview (goal, takeaway) is a `<details open>` with a collapse control (`lesson-overview`). |
| G - Returning | HIGH | Right | Clear | Low | Progress bar shows exactly where they are. Continue card on homepage brought them here. Checkpoint state persists. Clean. | None | — |

### 4b. Life/teams threads

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| B - Life seeker | HIGH | Right | Clear | Medium | Same LessonFrame observation. The "thread · 2 of 4" framing + atoms section assumes path-based learning. A life seeker who arrived from a bridge may not know they're "in a path." | Tweak — ContextBanner component exists for this — verify it fires for non-path visitors | Superseded. ContextBanner is mounted on concept pages only (backlog EC-1 counts its coverage there), never on a lesson. On a lesson the overview's "Part of <path>" line (a318790) and the breadcrumb through the path carry the context for every arrival, path or not. |
| C - Team leader | MED | Right | Clear | Medium | Content is relevant but pedagogical framing may feel heavy. | None | — |
| G - Returning | HIGH | Right | Clear | Low | Works well. | None | — |

### 4c. Intermediate threads

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| D - Improviser | HIGH | Right | Clear | Low | Diagnostic language matches. Exercises are specific. Progress tracking works. | None | — |
| G - Returning | MED | Right | Clear | Low | Same as above. | None | — |

### 4d. Performer threads

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| E - Performer | HIGH | Right | Clear | Low | Advanced frameworks, tradition-aware language, specific references (UCB, Johnstone, etc). Respects experience. | None | — |
| D - Improviser | MED | Too advanced | Unclear | Medium | Terminology assumes familiarity (game types, Viewpoints, Laban effort qualities). No scaffolding for someone who doesn't know these yet. | Tweak — add tooltip or link definitions for advanced terms | Built 2026-04-25 (84d7647): the render-time phrase linker links atom titles and aliases in lesson prose to their concept pages, with the definition as the link's title; tracker entry 103 records the one-word titles it declines. |
| G - Returning | MED | Right | Clear | Low | Works. | None | — |

### 4e. Teacher thread

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| F - Teacher | HIGH | Right | Clear | Low | Pedagogy-specific. Curriculum design, side-coaching, giving notes, reading the room. Directly useful. | None | — |

**Thread verdict:** Content quality is consistently high. Two patterns emerge: (1) **LessonFrame metadata may overwhelm non-path visitors** who arrive from bridges, and (2) **no level-mismatch guidance** — if you're on the wrong thread for your level, nothing tells you.

---

## 5. LEARN PAGES (/learn/[audience])

| Persona | Page | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|------|---------|---------|-----------|-----------|-------|--------|--------|
| A - Beginner | /learn/beginner | HIGH | Right | Clear | Medium | 7 available paths is a lot. Recommended path is highlighted, which helps. But "which of these 7 should I pick?" could cause decision paralysis. | Tweak — reduce visible paths or group by focus (improv vs life vs teams) | Built 2026-04-22 (86684c3): "Not an improviser?" (life, teams) and "Go deeper into the system" (physics, systems) under the recommended path. The paths hub got the same grouping on 2026-09-22 (EC-4.2). |
| D - Improviser | /learn/intermediate | HIGH | Right | Clear | Low | Only 2 paths. Clean. Recommendation highlighted. | None | — |
| E - Performer | /learn/performer | HIGH | Right | Clear | Low | 3 paths with clear differentiation (game, form, ensemble). Recommendation highlighted. | None | — |
| F - Teacher | /learn/teacher | HIGH | Right | Clear | Low | 1 path. No decision to make. Maybe too sparse — feels like a single-item menu. | Tweak — add supplementary content suggestions (bridges, exercises for class) | Built 2026-04-22 (86684c3) as "Also explore"; extended by entry 201 (2026-09-21) with the guides that route there, the lessons on the path and the four pedagogy atoms. |
| E/F | /learn/advanced | MED | Right | Clear | Low | 1 path. Same "single-item menu" observation. | Tweak — add "also explore" links to traditions, library | Built 2026-04-22 (86684c3) as "Also explore" (traditions, library, how it works); extended by entry 201 (2026-09-21). |

**Learn page verdict:** Beginner has too many choices (7 paths). Teacher and Advanced feel thin (1 path each). Intermediate and Performer are well-balanced.

---

## 6. GUIDES HUB (/guides)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| B - Life seeker | HIGH | Right | Clear | High | 30+ guides in a flat list. No categorization by problem type. A life seeker who clicked "I have a specific problem" from the quiz sees everything at once with no filtering. | Tweak — group guides by category (personal growth, team skills, improv skills) or add filtering | Built 2026-04-22 (5d1f883) as four sections; since 2026-08-21 (5efb3bf) the clusters are hub pages at /topics/* and every guide's breadcrumb names its cluster. |
| A - Beginner | MED | Right | Unclear | High | Same overwhelm issue. Beginner doesn't know which guide is for them. | Same as above | Built, as 6B. |
| C - Team leader | MED | Too little | Unclear | High | Team-relevant guides are buried in the flat list alongside personal growth and improv-specific guides. No way to filter. | Same — add team category/filter | Built, as 6B: Teams & Leadership is one of the four clusters, at /topics/teams. |

**Guides hub verdict:** Flat list with 30+ items and no categorization is the biggest UX problem in the site. Needs grouping or filtering.

---

## 7. PATHS HUB (/paths)

| Persona | Likely? | Context | Next step | Overwhelm | Notes | Action | Status |
|---------|---------|---------|-----------|-----------|-------|--------|--------|
| A - Beginner | MED | Right | Clear | Medium | Journey timeline visualization with levels. Beginner recommendation is prominent. But seeing all 11 paths + levels may feel like a large commitment before you've started. | None — the visualization itself is the solution to overwhelm | — |
| D - Improviser | MED | Right | Clear | Low | Can self-select by level. Sees intermediate and performer paths clearly separated. | None | — |
| E - Performer | MED | Right | Clear | Low | Performer section is visible in the timeline. Three paths clearly differentiated. | None | — |
| B - Life seeker | LOW | Too much | Unclear | High | The paths hub is organized by improv progression level. A life seeker doesn't think of themselves as "beginner → intermediate → performer." The framing doesn't match their mental model. | Tweak — add a "not an improviser?" section linking to improv-for-life, improv-for-teams, or /guides | Open until 2026-09-22. The tweak's line was built 2026-04-22 (86684c3, "Not following the improv track?" above the ladder), but that is a hatch, not an organisation, and the hub kept all eleven on one level ladder — the verdict below. Built by backlog task EC-4.2 (2026-09-22): three focus groups, improv craft / everyday life / teams and teaching, with the ladder's order inside each. |

**Paths hub verdict:** Good for improvisers who think in levels. Alienating for life-application visitors who don't see themselves on an improv progression.

---

## Summary

### Top findings:

1. **Guides hub is a flat list of 30+ items with no categorization** — highest-priority fix. Life seekers, beginners, and team leaders all hit this page from the quiz ("I have a specific problem") and see an undifferentiated wall.

2. **No wrong-level escape hatches anywhere.** If a performer lands on beginner content, or a beginner lands on advanced content, nothing suggests where to go instead. This is a consistent gap across bridges, paths, and threads.

3. **LessonFrame metadata may overwhelm bridge-to-thread visitors.** People who arrive at a thread from a bridge (not through a path) see lesson goals, key takeaways, common mistakes, practice prompts — pedagogical structure they didn't sign up for. The content itself is great, but the framing assumes a "student" mindset.

4. **Homepage has no team-leader signal.** The quiz reaches teams through "understand people better" → "team to work better together" — a 2-click path that requires self-identification into a non-obvious category first.

5. **/learn/beginner shows 7 paths** — decision paralysis risk. /learn/teacher and /learn/advanced show 1 path each — feels thin.

6. **Paths hub (/paths) is organized by improv level** — alienating for non-improvisers who think in problems, not levels.

### Quick wins (tweak):

- Add category grouping or filters to /guides (personal growth / team skills / improv skills / teaching)
- Add "wrong level?" cross-links to path pages (e.g., "too basic? try self-coaching-toolkit" / "new to improv? start with Foundations")
- Add "not an improviser?" escape to beginner bridges linking to /guides
- Add team-specific entry signal on homepage (either quiz step 0 option or visible callout)
- Group /learn/beginner paths by focus (improv track vs life-application vs teams)

### Deeper work (rewrite/restructure):

- Guides hub needs categorized layout with sections or filters
- Consider making LessonFrame metadata collapsible or contextual (show full frame for path visitors, minimal for bridge visitors)
- Paths hub needs a non-improviser section or alternate organization

### New content needed:

- "Not sure where to start?" component for wrong-level visitors on path pages
- Category/filter system for guides hub
- Possible: team-specific landing page or quiz branch

---

## Status, 2026-09-22

Filled in five months on, under tracker entry 293. Of the 21 Tweak rows:

- **Built: 10.** Most of it the same morning as the audit, in four commits nobody cited — 5d1f883 (guides hub in four sections), 585850b (LevelRedirect), a318790 (collapsible lesson overview), 86684c3 (/learn/beginner by focus, "Also explore", the paths hub's non-improviser line) — plus 53e7f30 that afternoon (the path start button and syllabus) and 84d7647 three days later (the phrase linker). The level hatches were then re-derived from the graph in September without reference to this document: entry 247 made one ladder, 250 re-mounted the arrows on the audience hubs after the path page's rewrite had dropped them, 281 gave each arrow a direction, and 201 gave the thin hubs their guides and lessons.
- **Superseded: 9.** Six are level hatches whose target or surface the ladder moved (2a D, 2b D, 2d E, 3c D, 3d E, 3e D): the audit asked for a link on the guide or a link to the toolkit, and the site has a link on the hub, to whichever path the ladder puts on the next rung. One (2a B) was built and is now unreachable — LevelRedirect's bridge context renders on no built guide, and the breadcrumb does its job. Two (3a B, 3e E) were answered by the content and the syllabus rather than by a tweak. 4b B named a component that was never mounted on lessons.
- **Open until tonight: 2.** The homepage team-leader signal (1C) and the paths hub grouped by focus (7B) — backlog tasks EC-4.1 and EC-4.2, both done 2026-09-22.

Not counted above: the three "Deeper work" items. The guides hub's categorised layout is built (6B). The LessonFrame is collapsible but not contextual — it opens for everyone. The paths hub now has the alternate organisation.
