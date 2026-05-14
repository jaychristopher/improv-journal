# SOP A-05 · Thread → Channel-Plan Routing

## Purpose

After SOP A-04 picks a candidate keyword for a thread, decide whether the thread should **back an existing planned video** (as conceptual source for the eventual script) or **trigger a new entry** in the channel plan. The decision is reversible — both routes are annotations, not destructive edits — but getting it right early avoids duplicating SEO work.

This SOP is what runs *after* a thread is content-complete (status: draft+) and *before* SOP 04 (script v1) ever opens.

## Inputs

- Thread file at `content/threads/<slug>.md` (status: draft or validated)
- SOP A-04 output: primary candidate keyword + 2 alternates (in the buildup doc)
- `docs/youtube-channel-plan.md` Section 7 (Video Inventory) and Section 8 (Production Priority)
- Pillar assignment (P1-P5) for the thread

## Outputs

One of the following routing decisions, written to the thread's buildup doc:

**Option B — Back an existing planned video:**
- Annotation added to the planned video's row in channel plan Section 8 Notes column: `**Conceptual source:** thread <slug> + N atoms (...). See docs/concepts/<slug>-buildup.md.`
- "Routing decision" section added to `docs/concepts/<slug>-buildup.md` naming the target video, the rationale, and which atoms become the script's anchor insights for SOP 01 step 7.

**Option C — Trigger a new channel-plan entry:**
- New row added to Section 7 Video Inventory with: video #, title, target keyword, volume, KD, bridge slug (may need creation), status (🔴 not started).
- Score computed against Section 8 rubric and a priority placement proposed (with surrounding-row context).
- "Routing decision" section added to `docs/concepts/<slug>-buildup.md` justifying why no existing video was a good fit.

**Option D — Park for Phase 2:**
- Thread continues to exist as web content; no channel-plan action taken.
- Annotation in the buildup doc: `**Routing decision: parked for Phase 2.** Re-evaluate after core 67 videos ship.`

## Tools

- Read tool to inspect the channel plan and the thread
- Edit tool to make the channel plan annotation
- No external API required

## Steps

1. **Read the thread** including atoms it composes from. Note the content register, the pillar, the persona it implicitly targets.
2. **Search Section 7 for keyword adjacency.** Open the channel plan and look for planned videos whose target keyword is semantically within 1-2 steps of the candidate keyword from A-04. Use the keyword + the pillar to narrow.
3. **Score the match strength** using a simple rubric:
   - **Exact-keyword match** — A-04's primary keyword IS the planned video's keyword → Option B (route as conceptual source)
   - **Near-exact** — same semantic intent, different phrasing → Option B
   - **Pillar match + adjacent content** — same pillar, content overlaps but doesn't duplicate → Option B (the thread's role becomes "depth backing" for the video)
   - **Different pillar or no semantic adjacency** → Option C (new entry)
   - **Thread is too theoretical or audience-narrow for any current video** → Option D (park)
4. **Sanity-check Option B with intent.** Even on a strong keyword match, verify that the thread's content register matches the existing video's persona. A thread that's structural/explanatory shouldn't be force-fitted as conceptual source for a video whose audience expects 3-step tactics — the script writer will have to fight the thread the whole way. If the thread fights the existing audience, prefer Option C.
5. **If Option B:** identify which 3 atoms become the script's anchor insights (SOP 01 step 7 inputs). The script writer pulls these directly when SOP 01 runs for the video. Note them explicitly in the buildup doc.
6. **If Option C:** score the new video against Section 8's rubric (Volume, Low-Competition, White-Space, Content-Readiness, Cross-pillar Reach). Propose where in the priority list it lands. Flag if it changes priority order above #20 — that's a channel-strategy decision, not a routing decision.
7. **If Option D:** write a brief "park reason" so future-you knows what gate the thread should pass to graduate (e.g., "park until SOP A-02 reveals high-volume alias keyword; park until atom X reaches validated status; park until phase 2").
8. **Apply the channel plan edit** as a single-row annotation (Option B) or single-row addition (Option C). Don't restructure tables or columns.
9. **Write the routing decision** in the buildup doc with the rationale, the alternatives considered, and the reversal path.

## Quality bar

- Decision rule is explicit (one of the four buckets in step 3, named)
- At least two options considered before the pick (Option B vs C, or B vs D)
- Channel plan edit is single-row scope; column structure untouched
- Routing decision is recorded in the buildup doc, not implicit in the channel plan edit alone
- If Option B: the 3 anchor atoms named (so SOP 01 for the video can pull them directly)
- If Option C: priority score computed against Section 8 rubric (no ad-hoc placement)

## Common pitfalls

- **Routing to a video whose keyword has different audience intent.** Conceptual backing only works if the script writer can frame the thread's content in the video's voice. A philosophical thread routed to a tactical-listicle video creates a script-side mess in SOP 04.
- **Triggering Option C without scoring.** New entries that aren't ranked become orphan rows that never make it into a production cycle. If you can't score it, you can't ship it.
- **Touching channel plan structure (sections, headers, column counts) when only adding to one Notes cell is needed.** Section 7's inventory rows have no Notes column — don't add one. Section 8's priority rows have a Notes column — that's where annotations go.
- **Treating routing as permanent.** It isn't. If a thread is routed Option B and later the planned video gets re-scoped, the annotation moves. Annotations are cheap; never let "the routing's already been done" block a re-route.
- **Skipping Option D.** Some threads are not video material — they're advanced/teacher content that lives at `/threads/<slug>` as web content forever. Parking is a valid outcome; don't force everything into the video pipeline.

## Estimated time

- 5 min thread re-read
- 5 min channel-plan adjacency search
- 5 min decision + sanity-check
- 5 min edit + write-up
- **Total: ~20 minutes**

## Lessons from prior production

- **First run (2026-05-14, `shaping-shared-reality` → L17):** Routed Option B. Keyword adjacency was not exact — A-04 picked `how to influence people` as primary, but the SERP intent fast-check failed it; L17's keyword `how to have difficult conversations` was the closest survivable alternative. Decision rule matched on **pillar (P2) + adjacent content** rather than exact keyword. The thread became conceptual backing for an *unrelated-by-keyword but related-by-concept* video. This pattern (pillar + content adjacency without keyword overlap) is common when the thread's editorial frame doesn't have search volume; treat it as a normal Option B path, not an exception.
- **Same run:** The 4 atoms became the script's anchor-insight candidates (SOP 01 step 7). Identifying them at routing time meant SOP 01 for L17 will start with the work mostly done — significant time savings vs. discovering the anchor insights fresh during script production.
- **Same run:** L17's bridge already existed at `content/bridges/how-to-have-difficult-conversations.md`. When Option B routing lands on a video whose bridge exists, SOP A-06 (bridge creation) is skipped. When the bridge is missing, A-06 fires next. Confirm bridge existence as part of step 1.
