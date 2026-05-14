# SOP A-06 · Bridge Creation from Thread/Atom

## Purpose

Create the SEO-catching bridge article (`content/bridges/<slug>.md`) that supports a planned video or surfaces a high-leverage atom-cluster for search. Bridges are the *surface layer* of the content architecture — they catch search traffic and route it inward to threads (for full conceptual treatment), atoms (for granular reference), and paths (for journey context).

A-06 fires under one of three triggers:
- **A-05 routing** (Option B or C) lands on a video whose bridge doesn't yet exist
- **A-02 SEO validation** flags an atom-derived bridge candidate (e.g., `framing-effect` flagged from `framing-as-angle-of-approach`)
- **Channel-plan triage** identifies a video slot whose bridge is still 🔴 not-started

This SOP is the upstream prerequisite for SOP 03 (Bridge content audit) — which assumes the bridge exists. A-06 is what produces the bridge SOP 03 audits.

## Inputs

- Target keyword from A-02 (atom-derived) or from channel plan (video-derived) — with volume + KD already verified
- Primary atom(s) the bridge will reference (typically 3-5 from `entry_atoms`)
- A thread that provides the full conceptual treatment (referenced as a depth-link in the bridge)
- Entry path (existing path under `content/paths/`) the bridge will feed into
- Optional: SOP 02 SERP output for the bridge's keyword (if not yet run, do step 2 below)

## Outputs

- `content/bridges/<slug>.md` with:
  - Complete frontmatter per `BridgeFrontmatter` schema (`src/lib/schema.ts:114`):
    - `title` (60-70 chars, includes primary keyword)
    - `description` (1-2 sentences, includes primary keyword, hook-shaped)
    - `target_keywords` array — primary + 3-4 long-tail variants with volumes
    - `entry_atoms` — 3-5 atom IDs the bridge references
    - `entry_path` — single path ID the bridge feeds into
    - `status: draft`, `created`, optional `primary_problem` + CTA fields
  - Body of ~1500-2500 words following the canonical 7-section pattern (below)

## Tools

- Read tool — existing bridges as voice templates (`how-to-deal-with-rejection.md` is a high-quality reference)
- `mcp__claude_ai_ahrefs__serp-overview` — optional, only if SOP 02 SERP not yet run for this keyword
- Edit / Write for the bridge file
- `npm run build` to verify the bridge's `entry_atoms` and `entry_path` all exist

## Steps

1. **Confirm the bridge has a clean trigger.** One of (A-05 routing, A-02 SEO finding, channel-plan slot). If none — wait. Bridges without triggers become orphan SEO pages that don't connect to anything.
2. **Verify SERP intent for the target keyword.** Reuse SOP A-04's SERP intent fast-check: if `parent_topic` is a brand/book/product and `parent_volume >> volume`, the SERP is navigational and the bridge can't win. Reject the keyword and revisit A-02 for a different candidate. If SERP is informational (educational/Wikipedia/Q&A pages dominate), proceed.
3. **Identify the white space.** Read the top 10 SERP results. What perspective is NOT represented? The improv-tradition angle is almost always the channel-native white space — confirm by scanning for our authors (Johnstone, Close, Spolin, Napier, UCB, Madson, Sawyer). If any of the top 10 already names an improv source, find a narrower angle.
4. **Choose `entry_atoms` (3-5).** Include:
   - The atom that most directly grounds the bridge's claim (usually the A-02 flagger)
   - 1-2 atoms that provide the improv-side practical moves
   - 1 atom that provides the structural/mechanism explanation
   - 1 atom that provides a contrast or boundary (when the bridge's claim fails)
   Avoid: bundling 8+ atoms (the bridge becomes a list, not an argument)
5. **Choose `entry_path` (1).** Pick the path whose audience best matches the bridge's persona. For life-application bridges → `improv-for-life`. For team/work → `improv-for-teams`. For performers → `mastering-the-form`. The path is the journey the bridge feeds into; pick the journey the search visitor would want next, not the one the bridge content most resembles.
6. **Read a voice template.** Open the closest-cousin existing bridge. Read it in full before drafting. The channel voice (see `docs/sop/REFERENCE-channel-voice.md`) is specific — specificity, warmth, no hype, citation density. The template re-anchors voice before drafting.
7. **Write frontmatter.** Title: include primary keyword, 60-70 char total. Description: 1-2 sentences, includes primary keyword, hook-shaped. target_keywords: primary + 3-4 long-tail with verified volumes (from A-02 or A-04 scan output).
8. **Write the body in the canonical 7-section pattern:**
   - **Hook with primary-source citation** (1-2 paragraphs). Lead with the named study or named teacher + year. The citation grounds the bridge as authoritative and gives AI engines a magnet.
   - **The reframe** — what the topic is *really* about that the SERP gets wrong. This is the channel-native angle from step 3.
   - **The mechanism** — why the reframe is structurally true (science + improv-tradition citations).
   - **Three practical moves** — concrete actions the reader can take today. Each move named, with one paragraph of how-to.
   - **When this is the wrong tool** — explicit boundary cases. Honest about failure modes. This is what separates the channel from generic self-help.
   - **The deeper point** — close on the structural implication. Lift the topic from tactical to architectural.
   - **CTA/cross-references** — link to the thread (full treatment), 3-5 atoms (granular), and the path (journey).
9. **Keyword integration.** Primary keyword in: H1, description, 2-4× naturally in body (NOT stuffed). Don't force long-tail keywords into spoken voice — they belong in description/tags.
10. **Cross-link wiring.** Bridge links to atoms via their canonical URLs (e.g., `/how-it-works/principles/<id>` for principles, `/practice/vocabulary/<id>` for definitions). The URL-routing logic is in `src/lib/redirects.ts:15` (`atomTypeToUrl`); verify atom types before writing URLs.
11. **Run `npm run build`.** Confirm all `entry_atoms` exist, `entry_path` exists, no schema validation errors.

## Quality bar

- Body length 1500-2500 words. Below 1500 = thin, won't earn SERP position. Above 2500 = bloated, audience scrolls away.
- Primary keyword in H1, description, and 2-4× in body naturally (not stuffed)
- ≥3 cited sources with author + year + work
- White-space angle named explicitly — what the bridge says that no top-10 SERP result says
- Three practical moves named and substantive (not vague: "be intentional"; substantive: "lead with the frame, not the conclusion — establish the frame first, then let the conclusion land inside it")
- "When this is the wrong tool" section present and honest (≥3 cases)
- CTA / cross-references link to thread + 3-5 atoms + 1 path
- All `entry_atoms` and `entry_path` exist; `npm run build` passes

## Common pitfalls

- **Writing a bridge without a trigger.** Bridges that don't support a video or surface a flagged atom-cluster become orphan SEO pages. They consume production time without compounding into the channel. The trigger gate in step 1 is non-optional.
- **Skipping the SERP intent check.** A-04's fast-check applies to bridges too. A bridge keyword whose SERP is brand-dominated cannot win regardless of how well you write. Verify intent first.
- **Bundling 8+ atoms in `entry_atoms`.** The bridge becomes a "see also" list instead of an argument. 3-5 is the sweet spot.
- **Force-fitting `entry_path`.** Pick the journey the visitor would *want next*, not the one the bridge content most resembles. A bridge about framing might feel academic but the right entry_path is `improv-for-life` because that's the audience's actual journey.
- **Generic three practical moves.** "Be intentional about framing" is not a practical move. "Use their vocabulary instead of yours" is. The move is testable — the reader could do it today and notice the difference.
- **No "when this fails" section.** The channel's competitive position rests on epistemic honesty. Bridges that read like marketing copy don't compound; bridges that name failure modes do. Always include the boundary section.
- **Keyword stuffing.** Repeating the primary keyword 8+ times in 1500 words reads as SEO-bait to both humans and search engines. 2-4 natural occurrences plus title + description is sufficient.
- **Cross-references that don't route.** Linking to `/atoms/<id>` when atoms actually live at `/how-it-works/principles/<id>` etc. breaks the visitor's path. Always verify the atom's `type` and use the right URL prefix from `redirects.ts`.

## Estimated time

- 5 min — trigger confirmation + SERP intent check (or read existing SOP 02 output)
- 10 min — atom + path selection
- 10 min — voice template read + frontmatter draft
- 60-90 min — body draft (the heaviest step)
- 10 min — cross-link wiring + keyword integration verify + build run
- **Total: ~1.5-2 hours per bridge**

## Lessons from prior production

- **First run (2026-05-14, `framing-effect` bridge for `framing-as-angle-of-approach` atom):** SERP intent check passed cleanly — top 10 was Wikipedia / Decision Lab / Simply Psychology / Scribbr / academic PDFs / Reddit Q&A. **Educational SERP, not navigational.** White space angle: zero top-10 results positioned framing as a *skill to use*; all positioned it as a *bias to defend against*. Improv-perspective angle was uncontested.
- **Same run:** The atom's primary-source citation (Tversky & Kahneman 1981) became the bridge's opening paragraph almost verbatim. **Atoms with strong primary-source citations convert to bridges faster** — the hook is already written. Confirm this pattern across future runs; if true, prioritize bridge-creation for atoms whose Specific sources block leads with a primary-source academic paper.
- **Same run:** Three reference layers wired in the CTA — thread (full conceptual treatment), 3-5 atoms (granular), and path (journey). Each layer answers a different visitor question: *"give me the full argument" / "let me drill into one piece" / "what should I read next."* Treat all three as required, not optional.
- **Same run:** ~1900 words drafted in ~70 min. Voice template (`how-to-deal-with-rejection.md`) re-anchored channel voice before drafting; without it, the body drifted academic. **Always read a voice template first**, even when you wrote the source atoms.
- **Same run:** Bridge complements but does NOT duplicate the thread. The thread is the structural argument; the bridge is the search visitor's entry point. The same content shows up in both at different abstraction levels — atom-level depth in the thread, applied-skill level in the bridge.
- **API spend:** 891 units for one SERP check (re-running A-04 fast-check at bridge layer). Reuse the SERP output from A-02 if available to avoid re-running.

## Decision: when this SOP fires vs. defers

| Trigger | Fire A-06 now | Defer |
|---|---|---|
| A-05 routes thread to existing video, bridge exists | — | No bridge work needed |
| A-05 routes thread to existing video, bridge missing | ✓ | — |
| A-05 routes thread to new video (Option C) | — | Bridge work follows after SOP 01 + 02 for the new video |
| A-02 flags bridge candidate with vol ≥ 1000, KD ≤ 40 | ✓ | — |
| A-02 flags bridge candidate with marginal metrics | — | Defer until volume justifies the production cost (~2 hours) |
| Channel-plan slot 🔴 not-started, video scheduled in next 4 weeks | ✓ | — |
| Channel-plan slot 🔴 not-started, video deferred to Phase 2 | — | Wait |
