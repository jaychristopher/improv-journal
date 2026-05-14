# SOP A-04 · Candidate Keyword Scan

## Purpose

For concept-level content (a thread, an undeveloped atom, or a brand-new video idea) that lacks a channel-plan entry, scan candidate keywords and pick the right primary keyword **before** SOP 02 runs `serp-overview`. The intent fast-check at this stage prevents wasted API spend on navigational/branded queries that look great by raw volume.

This SOP is the upstream complement to SOP 02. SOP 02 assumes the keyword was already picked in SOP 01 step 1 (from the channel plan). When that input is missing, this SOP fills the gap.

## Inputs

- Concept artifact (one of: thread file at `content/threads/<slug>.md`, atom file at `content/atoms/<slug>.md`, or a brief in `docs/concepts/<slug>-buildup.md`)
- Optional: closest cousin video in `docs/youtube-channel-plan.md` (for prior-art context, used in step 7)

## Outputs

Append a "Candidate-keyword scan" section to `docs/concepts/<slug>-buildup.md` containing:

- Candidate keyword table (8-12 candidates × {volume, KD, CPC, traffic potential, parent topic, parent volume, intents})
- SERP intent fast-check verdict per candidate (informational / navigational / branded / unknown)
- Picked primary keyword + rationale
- 2 ranked alternates (in case the primary fails full SERP analysis in SOP 02)
- Rejected candidates with one-sentence reason each

## Tools

- `mcp__claude_ai_ahrefs__keywords-explorer-overview` — single batch call with comma-separated keywords (~50 units per candidate; ~500-700 units for a 10-candidate scan)
- `mcp__claude_ai_ahrefs__doc` — load the schema first if you haven't this session

## Steps

1. **Brainstorm 8-12 candidate keywords** spanning the concept's content register:
   - Direct phrasings of what the concept *is* about
   - User-search phrasings ("how to ___")
   - Adjacent / cousin terms in the same semantic neighborhood
   - The concept's own internal/editorial title (will likely return 0 — that's a useful data point)
2. **Cluster candidates** by content fit (philosophical / tactical / workplace / relational / etc.) so the scan can compare across registers.
3. **Run `keywords-explorer-overview`** with the full list as a single batch:
   ```
   keywords: "kw1,kw2,...,kw12"
   country: "us"
   select: "keyword,volume,difficulty,cpc,traffic_potential,parent_topic,parent_volume,intents"
   order_by: "volume:desc"
   ```
4. **Apply the SERP intent fast-check** to every candidate with volume ≥ 30. A candidate FAILS the check if any of:
   - `parent_volume` is **>5× `volume`** AND `parent_topic` is a named brand / book / product / public figure → **navigational**
   - `intents.navigational: true` OR `intents.branded: true` → **navigational/branded**
   - `parent_topic` shifts entirely from the candidate's semantic neighborhood → **tangential** (Ahrefs grouped it weirdly; treat as unknown until SERP confirms)
5. **Score the survivors** by joint optimization. Rough formula:
   ```
   score = volume × (1 − branded_likelihood) × (1 − KD/100)
   ```
   Where `branded_likelihood` ∈ [0, 1] is judged from `parent_topic` content (clean topic = 0, obvious brand = 1, ambiguous = 0.5).
6. **Pick the primary keyword** as the highest scoring survivor with intent verified informational.
7. **Pick 2 alternates** as fallbacks (in case the primary fails SOP 02's full SERP analysis). Prefer alternates from different intent clusters when possible (e.g., one "how to ___" tactical, one conceptual).
8. **Document rejected candidates** in a single line each: `keyword — vol — KD — rejected because <reason>`.
9. **Write the section** in the buildup doc using the format shown in `docs/concepts/shaping-shared-reality-buildup.md` (Step 0 in that doc's SOP 02 section is the canonical example).

## Quality bar

- 8-12 candidates surveyed (fewer than 8 = under-scanned; more than 12 = noise)
- Primary keyword passes the SERP intent fast-check
- 2 alternates ranked and scored
- All rejected candidates explicitly named with reason (no silent rejection)
- Total metrics captured for each candidate: volume, KD, traffic_potential, parent_topic, parent_volume

## Common pitfalls

- **Picking the highest-volume candidate without the intent fast-check.** This is the Carnegie failure mode — a high-volume keyword whose SERP is dominated by a single brand/book is navigational, not informational, and the audience doesn't want your content. Fast-check first, score second.
- **Treating KD as the only difficulty axis.** A keyword with KD 13 and parent_topic = "how to win friends and influence people" (37K parent volume) is *harder* than a keyword with KD 20 and a clean parent topic, because you're competing against Amazon + Wikipedia + a DR-99 channel in the first case.
- **Discounting 0-volume terms.** A 0-volume editorial title (like `shaping shared reality`) is fine for internal taxonomy — atoms and threads can keep editorial titles. The 0 is a *signal that this title isn't an SEO target*, not a signal that the concept is bad. Use an alias slug if SEO surfacing is needed later.
- **Forgetting the `parent_topic` column.** Without it, the navigational-vs-informational distinction is invisible. The select list in step 3 includes it for a reason.
- **Running this SOP without first reading the concept artifact.** The brainstorm in step 1 needs the concept's actual content register; brainstorming from the title alone produces shallow candidates.

## Estimated time

- 10 min brainstorm + clustering
- 5 min API call (single batch) + result inspection
- 10 min fast-check + scoring + write-up
- **Total: ~25 minutes**

## Lessons from prior production

- **First run (2026-05-14, `shaping-shared-reality`):** `how to influence people` (vol 1900, KD 13, TP 4300) looked like the obvious winner. Failed the fast-check on `parent_topic = "how to win friends and influence people"` (parent_volume 37K — 19× the candidate volume). Dale Carnegie navigational. Discovered at SERP overview cost (928 units); the fast-check at scan time (50 units) would have caught it for ~5% of that cost.
- **Same run:** Concept's editorial title `shaping shared reality` returned 0 volume. Useful data point — confirms editorial titles aren't search vocabulary. Atom titles in this graph almost certainly have the same property; treat them as internal taxonomy, not SEO targets.
- **Same run:** "how to win an argument" (vol 900, KD 2) had great metrics but was an *ideological mismatch* with the concept (the thread's stance is "don't argue head-on"). Add a content-stance check to the fast-check criteria — a keyword that contradicts the concept's content is also a fail, even if metrics are clean.
