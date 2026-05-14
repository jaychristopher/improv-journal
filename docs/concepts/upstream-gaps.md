# Upstream Pipeline Gaps — Derived from Real Friction

**Source run:** SOP 01 + SOP 02 against `content/threads/shaping-shared-reality.md`
**Run artifact:** `docs/concepts/shaping-shared-reality-buildup.md`
**Cost of discovery:** ~2,755 Ahrefs API units, ~70 min wall-clock

> **Why this doc exists:** The existing `docs/sop/` is a 19-step pipeline that starts after a video has been picked from the channel plan. Taking a thread-level concept through this pipeline surfaces specific friction points where the upstream half is undocumented. Each friction below is concrete (we hit it; here's where; here's what we did) and maps to a proposed upstream SOP.

---

## Friction log — what broke, where, what we did

### F1. Channel-plan lookup fails at SOP 01 step 1

**Where:** `docs/sop/01-persona-jtbd.md:24` — *"Look up the video in the channel plan."*
**What:** The thread isn't in `docs/youtube-channel-plan.md`. Threads are explicit Phase 2 (`youtube-channel-plan.md:519`). No keyword, no KD, no pillar, no slug to look up.
**Adapter applied:** Invented a substitute sequence — assign pillar by content register, identify closest planned-video cousin (L17), scan candidate keywords. ~15 min of unscripted work.
**Gap:** No SOP step bridges *concept-level content* (threads, undeveloped atoms) → *channel plan entry*.

### F2. Output file location convention is undefined for non-video buildups

**Where:** SOP 01 outputs `docs/youtube-week-N/<slug>-buildup.md`. SOP 02 appends to the same file.
**What:** Thread isn't in a youtube-week-N batch. Where does its buildup live?
**Adapter applied:** Wrote to `docs/concepts/<slug>-buildup.md` as a proposed new convention. Created the directory.
**Gap:** Path conventions in `docs/sop/README.md:111` cover per-video and per-batch artifacts only. No convention for pre-batch / concept-level artifacts.

### F3. Keyword-candidate scan is a missing SOP step

**Where:** SOP 02 step 1 — *"Run serp-overview"* — assumes the keyword is already chosen.
**What:** With no channel-plan entry, no keyword was chosen. Had to scan 12 candidate keywords via `keywords-explorer-overview` *before* running serp-overview. This step doesn't exist in any current SOP.
**Adapter applied:** Inserted "Step 0 — Keyword scan" before SOP 02 step 1. ~5 min of API time, ~10 min of interpretation.
**Gap:** SOP for *picking* a candidate keyword for a piece of concept-level content. Should accept the concept's thematic content as input and output 1-3 candidate keywords with volume/KD/intent metrics.

### F4. SERP intent check is implicit, not enforced

**Where:** SOP 02 step 3 — *"Identify white-space gaps."*
**What:** First-pass keyword `how to influence people` had great surface metrics (vol 1900, TP 4300, KD 13). The SERP run revealed 14/15 top results were Dale Carnegie book pages — the query is *navigational/branded*, not informational. This is a fast-fail signal but the SOP doesn't formalize it as a check. We discovered it by reading the SERP table by hand.
**Adapter applied:** Added "Strategic conclusion" section to flag the intent mismatch and propose pivots.
**Gap:** SOP 02 needs a "SERP intent check" step that runs *before* white-space analysis. Spec: if N-of-15 top results are dominated by a single branded entity (book / product / brand), the query is navigational and the keyword should be rejected without further analysis. ~928 units of API spend would have been avoided if this check ran on the candidate list rather than the chosen keyword.

### F5. Thread → video routing is undocumented

**Where:** No SOP covers this. SOP 03 (bridge content audit) assumes a bridge exists; SOP 04 (script v1) assumes the bridge is the script's source material.
**What:** The thread is content-complete and a near-perfect conceptual backbone for L17 "How to Have Difficult Conversations." But there's no documented step that says *"use thread X as the conceptual framework for video Y."* The thread→video mapping has to be made editorially each time.
**Adapter applied:** Captured the recommendation as "Option B" in the buildup doc's strategic conclusion. No formal artifact produced.
**Gap:** SOP for routing mature threads to existing video slots (or to new video slots that need to be added to the channel plan).

### F6. Atom-level SEO validation is absent

**Where:** The 4 atoms I drafted earlier this session (`model-of-their-model`, `belief-as-architecture`, `rigid-core-malleable-edge`, `framing-as-angle-of-approach`) were never checked against search behavior. Atom titles are editorial choices made by a writer's instinct.
**What:** Confirmed by this run: `shaping shared reality` has 0 measurable volume — the thread's own title doesn't match how anyone searches. If atoms have the same problem (and they probably do), the graph's internal language is disconnected from audience mental models.
**Adapter applied:** None. Surfaced as observation only.
**Gap:** SOP for atom-level SEO validation. Should run a lightweight Ahrefs check per atom title / key terms, flag drift between atom vocabulary and audience search vocabulary, and propose renames or aliases.

### F7. Bridge promotion process is undocumented

**Where:** Bridges exist (`content/bridges/how-to-deal-with-rejection.md`) and SOP 03 assumes they exist. But no SOP covers *creating* a bridge from an atom or thread.
**What:** If the thread routes to L17, L17's bridge `content/bridges/how-to-have-difficult-conversations.md` may or may not exist — and if it doesn't, who writes it, when, with what inputs? SOP 03 has a "Pre-condition (hard gate)" added in Cycle 1 concern #11 (`IMPROVEMENT-CYCLE.md:17`) but the bridge-writing process itself is still implicit.
**Adapter applied:** None. Surfaced as observation only.
**Gap:** SOP for bridge creation — when an atom/thread earns a bridge, how the bridge is structured, how it references atoms, how it gets its keyword target.

### F8. No concept-level pillar assignment

**Where:** Channel plan section 1 maps 5 pillars to videos. Atoms and threads have no pillar field in their frontmatter (`src/lib/schema.ts:72,86`).
**What:** Had to derive thread→pillar mapping by reading content register against pillar definitions. Done in seconds, but undocumented and inconsistent across content types.
**Adapter applied:** Asserted P2 in the buildup doc without formal basis.
**Gap:** Either (a) add `pillar` field to atom/thread frontmatter, or (b) add a "pillar map" SOP step at the atom/thread development stage.

### F9. No "concept maturity" gate

**Where:** Atoms have status `seed → draft → validated` (`src/lib/schema.ts:13`). Threads have the same. But "validated" is editorial — there's no checklist that defines what makes an atom validated.
**What:** I promoted four atoms from seed → draft today based on having full bodies + sources + counter-positions. That matches what existing draft atoms look like, but there's no formal criterion. And no atom in the project is currently `validated`.
**Adapter applied:** None. Used `draft` based on body fullness.
**Gap:** Define explicit gates for `seed → draft` (e.g., body fullness, sources cited, counter-position stated) and `draft → validated` (e.g., SEO check passed, used in ≥1 thread, reviewed for accuracy by external source).

### F10. No tooling for the upstream chain

**Where:** YouTube production has `scripts/audit-peak-sync.mjs` for the peak-sync audit step.
**What:** Nothing similar for upstream content. No script to audit atom maturity, thread composition completeness, missing reverse links, or bridge readiness. The reverse-link pass I did earlier this session was hand-done across 8 files.
**Adapter applied:** None.
**Gap:** Tooling for graph audits — broken atom references, dangling thread compositions, atoms missing source citations, atoms with no reverse links, threads without bridges, bridges without atoms.

---

## Proposed upstream SOPs (A-01 through A-06)

Each mirrors the existing SOP contract: Purpose, Inputs, Outputs, Tools, Steps, Quality bar, Common pitfalls, Estimated time, Lessons.

### SOP A-01 — Atom development (seed → draft)

**Closes:** F9 (partially)
**Purpose:** Promote an atom from seed (stub) to draft (full body with sources + counter-position).
**Inputs:** Seed atom file with frontmatter + 1-2 paragraphs of intent.
**Outputs:** Atom file with full body (~500-800 words), 8-12 link relations, **Specific sources** block (≥3 citable sources with year + work), **Counter-position** block.
**Quality bar:** Body matches existing draft atoms (e.g., `meaning-is-relational.md`, `belief-as-architecture.md`); links route to existing or co-promoted atoms; sources are real and verifiable; counter-position genuinely pushes back rather than restating the claim.

### SOP A-02 — Atom SEO validation

**Closes:** F6
**Purpose:** Check that the atom's vocabulary matches audience search behavior; rename or alias if necessary.
**Inputs:** Atom file (status: draft).
**Outputs:** Append SEO findings to the atom's source-of-truth doc (proposed: `docs/atoms/<id>-seo.md`). Findings include: volume of atom title as query, volume of 3-5 paraphrase candidates, decision (keep title / add alias slug / rename).
**Tools:** `mcp__claude_ai_ahrefs__keywords-explorer-overview` (1 call, ~50 units per atom).
**Quality bar:** Atom title is either a measurable query (vol ≥ 30 in US) or has a documented redirect/alias from a higher-volume paraphrase. If neither is true, status stays `draft` and atom moves to a "low-discovery, internal-only" bucket.
**Common pitfalls:** Atom titles often describe a mechanism that no one searches for by name. Don't force a high-volume term if it changes the atom's meaning — use an alias slug instead and keep the editorial title.

### SOP A-03 — Thread composition

**Closes:** F8 (partial), F9 (partial)
**Purpose:** Compose a thread that weaves N atoms into a single coherent thought; populate pedagogy frontmatter; route to a pillar.
**Inputs:** N atoms (status: draft or validated) with the right composition arc.
**Outputs:** Thread file at `content/threads/<slug>.md` with full prose, `atoms[]` composition, all pedagogy fields (`lesson_goal`, `key_takeaway`, `common_mistake`, `practice_prompt`, `success_signal`, `transfer_prompt`, `reflection_prompt`), pillar tag.
**Quality bar:** All atoms in `atoms[]` exist with status ≥ draft; reverse-links added in composed atoms; pedagogy fields are specific to the thread's lesson, not generic.

### SOP A-04 — Candidate-keyword scan (NEW — closes F3)

**Closes:** F3, F4
**Purpose:** For a thread or proposed video that has no channel-plan entry, scan candidate keywords and pick the right one *before* SOP 02 runs serp-overview.
**Inputs:** Thread file OR proposed-video concept brief.
**Outputs:** Candidate-keyword table with volume, KD, traffic potential, parent topic, branded/navigational flag. Picked primary keyword + rationale.
**Tools:** `mcp__claude_ai_ahrefs__keywords-explorer-overview` (1 call, ~500 units for 10 candidates).
**Steps:**
1. Brainstorm 8-12 candidate keywords spanning the thread's content register
2. Run keywords-explorer-overview on the full list
3. **SERP intent fast-check:** for the top 3 by volume, glance at `parent_topic` and `parent_volume`. If parent_volume >> volume *and* parent_topic is a brand/book/product, the keyword is likely navigational — flag for rejection
4. Pick primary by joint optimization of volume × (1 - branded_likelihood) × (1 - KD/100)
**Quality bar:** Primary keyword passes SERP intent fast-check; at least 3 alternatives ranked in case primary fails the full SERP analysis in SOP 02; rejected branded keywords are explicitly named with one-sentence reason.

### SOP A-05 — Thread → channel-plan routing

**Closes:** F5, F8
**Purpose:** Route a mature thread to either an existing planned video (as conceptual backbone) or a new channel-plan entry.
**Inputs:** Thread (status: draft+), pillar assignment, candidate-keyword scan output.
**Outputs:** Either (a) a line added to the relevant video's buildup doc — *"Conceptual source: thread X"* — or (b) a new row added to `docs/youtube-channel-plan.md` section 7 (Video Inventory) with title, keyword, vol, KD, slug, pillar.
**Decision rule:** If the candidate keyword is already an existing planned video's keyword (within 1-2 semantic steps), route to (a). Else route to (b).
**Quality bar:** The decision is documented with the alternative options explicitly named (matches our shaping-shared-reality buildup's "Options A/B/C" pattern).

### SOP A-06 — Bridge creation from thread/atom

**Closes:** F7
**Purpose:** Create the bridge article that supports a planned video, derived from one thread or multiple atoms.
**Inputs:** Channel-plan entry for a video; one or more source threads/atoms; target keyword from SOP 02.
**Outputs:** `content/bridges/<slug>.md` with full prose, atom references, internal CTAs to thread + path.
**Quality bar:** Bridge passes SOP 03's bridge content audit; primary keyword appears in H1 + 2-4× naturally in body; ≥3 atoms referenced as link-outs.

---

## Progress on the punch list (updated 2026-05-14)

| SOP | Status | Notes |
|---|---|---|
| A-01 Atom development | **Drafted** | `docs/sop/A01-atom-development.md` — codified from 4-atom run this session |
| A-02 Atom SEO validation | **Drafted** | `docs/sop/A02-atom-seo-validation.md` — codified from 4-atom batch scan (636 units). Bridge candidate `framing-effect` flagged. |
| A-03 Thread composition | **Drafted** | `docs/sop/A03-thread-composition.md` — codified from shaping-shared-reality run |
| A-04 Candidate keyword scan | **Drafted** | `docs/sop/A04-candidate-keyword-scan.md` — includes SERP intent fast-check |
| A-05 Thread → channel-plan routing | **Drafted** | `docs/sop/A05-thread-channel-plan-routing.md` — four-bucket decision rule |
| A-06 Bridge creation | **Drafted** | `docs/sop/A06-bridge-creation.md` — codified from `framing-effect` bridge creation. Bridge shipped at `content/bridges/framing-effect.md`. |

**Routing applied:** `shaping-shared-reality` → L17 (Option B). See `docs/concepts/shaping-shared-reality-buildup.md` "Routing decision" section.

## Status: upstream pipeline COMPLETE

All six A-series SOPs drafted. End-to-end run validated by producing thread `shaping-shared-reality` (with 4 new atoms) + bridge `framing-effect` in one continuous chain. The pipeline now has a documented path for any new concept: seed atom → A-01 → A-02 → A-03 → A-04 → A-05 → A-06 → existing 18-step video pipeline.

## Remaining next moves

In priority order:

1. **Move L17 forward** — with conceptual source + 3 anchor insights already wired in, SOP 01 for L17 starts mostly done. The `framing-effect` bridge now also exists as an alternative SEO surface for the same content cluster. Run when ready to enter production cycle.
2. **First production cycle through the new upstream chain** — pick the next thread/concept candidate and run it end-to-end through A-01 → A-06. The SOPs will improve from real friction in cycle 2 of upstream production.
3. **Consider scheduling a `framing-effect` video** — the bridge now exists; the channel plan does not yet have a video slot for it. Decision point: add a new long-form video entry (Option C from A-05) OR let `framing-effect` exist as a standalone SEO bridge without a paired video.

---

## Lessons-style observations (for the eventual SOP A-* lessons sections)

- **The first keyword you'd guess is often wrong.** "How to influence people" is the obvious target for this thread's content. It's also a Dale Carnegie navigational query. ~928 units of API spend uncovered this; the SERP intent fast-check (proposed in SOP A-04) would have caught it in 50 units.
- **Threads have richer content than bridges; bridges have higher SEO leverage than threads.** The thread is the load-bearing concept; the bridge is the SEO-catching surface. Bridges should be derived from threads, not the other way around.
- **The atoms I drafted today (4) have full bodies but zero search-vocabulary validation.** This is fine — they're internal primitives. But if any of them surfaces in a bridge or video title, SOP A-02 needs to run first.
- **`status: validated` is currently aspirational across the whole graph.** No atom in the project is `validated`. The status field works as a relative gradient (seed < draft < validated) but the validated end-point lacks a clear gate. SOP A-02's pass criteria could become the gate.
