# SOP A-02 · Atom SEO Validation

## Purpose

For an atom (or a batch of cousin atoms) at status `draft`, check that the atom's vocabulary connects to audience search behavior. Decide one of: **keep** title as internal taxonomy, **rename** to a higher-volume direct-match cousin, **alias** via a redirect, or **flag a bridge candidate** (work routes to SOP A-06).

A-02's most common outcome is "keep" — atom titles are precision-named for the graph's internal taxonomy, not for search. The point of this SOP is to **confirm** the keep decision with evidence (or surface the rare case where rename/alias/bridge is the right move) — not to force every atom to be SEO-discoverable.

## Inputs

- Atom file(s) at `content/atoms/<id>.md`, status: draft (or a batch of cousin atoms from the same thread/composition)
- The atom's sources block — academic terms cited in the atom body are the prime alias/bridge candidates

## Outputs

Append findings to `docs/concepts/<batch-slug>-atoms-seo.md` (one consolidated doc per batch) containing:

- Per-atom candidate keyword table (exact title + 3-5 paraphrase candidates × {volume, KD, parent_topic, parent_volume})
- Per-atom decision (keep / rename / alias / bridge-candidate) with rationale
- Cross-atom patterns (when scanning a batch)
- Bridge candidates flagged for downstream A-06 (with proposed bridge slug + target keyword)
- API cost

When a single atom is scanned standalone, output to `docs/atoms/<id>-seo.md` instead.

## Tools

- `mcp__claude_ai_ahrefs__keywords-explorer-overview` — single batch call with comma-separated keywords (~50 units per keyword, ~600-1000 units per atom batch of 4)
- Read tool for inspecting atom body to identify cited academic terms

## Steps

1. **Read the atom body.** Note the academic terms in the **Specific sources** block and inline — these are the prime alias/bridge candidates because they're already grounded in the atom's argument.
2. **Brainstorm 3-5 paraphrase candidates per atom.** Cover:
   - The atom's exact editorial title (always include — its 0-vol result is data)
   - The named academic source/term cited in the body
   - 1-2 "how to" phrasings that match the atom's content (search-language version of the title)
   - 1 broader cousin term (the wider domain the atom sits in)
3. **Batch the scan.** Combine candidates across cousin atoms into a single `keywords-explorer-overview` call. `select`: `keyword, volume, difficulty, cpc, traffic_potential, parent_topic, parent_volume, intents`. `order_by: volume:desc`.
4. **Apply the same SERP intent fast-check from A-04.** If a candidate has `parent_volume >> volume` AND `parent_topic` is a brand/book/product, flag as navigational. Treat the same way as A-04 — reject from alias consideration.
5. **Score each candidate per atom:**
   - **Rename candidate** if: volume ≥ 500 AND KD ≤ 30 AND parent_topic semantically matches the atom AND the candidate term is the kind of phrase the atom's content would *naturally* be called by an outside reader. (Rare.)
   - **Alias candidate** if: volume ≥ 300 AND KD ≤ 40 AND parent_topic semantically matches AND the candidate doesn't *replace* the editorial frame, just provides a search-friendly back-door. (Also rare — requires alias infrastructure, see "Alias implementation" below.)
   - **Bridge candidate** if: volume ≥ 1000 AND KD ≤ 40 AND parent_topic is a clean academic / how-to neighborhood AND the atom's body already cites the term. (Most common high-leverage outcome.)
   - **Keep (no action)** if none of the above. Default outcome.
6. **Document the decision per atom** with rationale: which threshold did the recommendation pass, or which thresholds did it fail and why.
7. **Surface cross-atom patterns** when scanning a batch. The bigger insight is often "all 4 atoms had 0-vol titles" — confirms the architecture rather than indicting any one atom.
8. **Flag bridge candidates** with proposed slug (`content/bridges/<slug>.md`) and target keyword. Don't create the bridge — that's A-06.

### Alias implementation (when needed)

Alias slugging is **not natively supported** in the current schema. To enable an atom alias, one of:

- **Schema change:** add `aliases: string[]` to `AtomFrontmatter` and update `src/lib/redirects.ts` to generate redirects from each alias to the canonical URL. (Right answer if aliases become common.)
- **Manual redirect:** add a one-off entry to `generateHubRedirects()` in `src/lib/redirects.ts`. (Acceptable for 1-2 cases.)
- **Rename instead of alias:** if alias requires infra and the rename is acceptable, just rename. Update the atom's `id` (and filename), update all back-references via grep+edit.

Flag alias work in the findings doc; don't implement during A-02. Alias implementation is a content-platform change, not an SEO-research output.

## Quality bar

- 3-5 paraphrase candidates per atom (fewer = under-scanned; more = noise)
- Editorial title included in scan (0-vol result is data, not failure)
- Per-atom decision named with one of {keep, rename, alias, bridge-candidate}
- Rationale references specific threshold pass/fail
- Bridge candidates have proposed slug + target keyword
- Cross-atom patterns surfaced when scanning a batch

## Common pitfalls

- **Forcing an alias because the volume is high.** "Cognitive dissonance" has 213K volume — looks attractive. But the atom `belief-as-architecture` describes the *structural reason* for defense, while cognitive dissonance describes the *aversive experience*. Different mechanisms. Aliasing would mislead. Volume without semantic match is a trap.
- **Treating 0-vol on the editorial title as failure.** It's the expected outcome. The architecture separates internal taxonomy (atom titles) from SEO surface (bridges). 0-vol confirms the separation, not breaks it.
- **Skipping the atom body read.** The body cites academic terms with real volume. Skipping the read produces shallow paraphrase brainstorming and misses the strongest alias/bridge candidates.
- **Single-atom scans when a batch is available.** Scanning 4 cousin atoms together costs ~600 units and surfaces cross-atom patterns. Scanning them individually costs ~600 units total *and* misses the patterns. Batch when possible.
- **Acting on borderline cases.** When volume or KD sits right at the threshold, default to "keep." Aliasing/renaming has real cost (schema work, broken links, content drift). The bar is intentionally high.
- **Recommending bridge creation as part of A-02.** A-02 *flags* bridge candidates. Creation is A-06. Don't conflate the two — bridge creation requires its own persona work, SOP 02 SEO research on the bridge's keyword, and SOP 03 audit.

## Estimated time

- 5-10 min — per-atom body read + paraphrase brainstorm
- 5 min — single batch API call
- 15-20 min — interpretation + per-atom decision write-up + cross-pattern surfacing
- **Total: ~30 min for a 4-atom batch** (~50 min for a standalone single-atom scan because the cross-pattern step disappears but the brainstorm proportionally costs more)

## Lessons from prior production

- **First run (2026-05-14, `shaping-shared-reality` batch):** 4 atoms scanned (`model-of-their-model`, `belief-as-architecture`, `rigid-core-malleable-edge`, `framing-as-angle-of-approach`). 20 keywords, 636 API units. All 4 editorial titles returned 0 volume — confirmed atoms are internal taxonomy. **The architecture works as designed; the SOP exists to verify, not to find failure.**
- **Same run:** Three of four atoms had a 20K+ vol academic cousin (theory of mind 24K / cognitive dissonance 213K / Overton window 24K) that *looked* like a strong alias on raw metrics. All three failed semantic-match review — broader scope, different mechanism, or context-coded. Only `framing-effect` (3,400 vol, KD 30) for `framing-as-angle-of-approach` passed both thresholds and semantic check — and even then, recommendation was bridge-candidate, not alias. **The high-vol cousin is rarely the right alias; it's more often the right bridge keyword.**
- **Same run:** Atom bodies are SEO-rich even when titles aren't. Every atom cited at least one 3K+ vol academic term in its body. The atoms surface for term-based searches via body content. **This means current atoms are more discoverable than 0-vol titles suggest.** Update SOP A-02's intuition: the question isn't "is this atom discoverable" — it's "is the title doing the discovery work, or is the body doing it." Body-doing-it is the more common (and acceptable) outcome.
- **Same run:** `framing-effect` recommendation routes to SOP A-06 (bridge creation). First bridge candidate surfaced from atom-layer SEO work. Validates the chain: atom-layer SEO surfaces bridge candidates → bridge creation in A-06 → channel-plan routing in A-05 → existing 18-step pipeline ships the video.
- **Same run:** Editorial-title 0-vol is a *signal*, not a problem. It means the project's vocabulary is operating below the search-language threshold, which is correct for internal taxonomy and is exactly what allows the atoms to be precise. Don't optimize this away.

## Decision threshold reference

| Volume | KD | Semantic match | Recommendation |
|---:|---:|---|---|
| ≥ 500 | ≤ 30 | exact / very close | **Rename candidate** (rare — requires title change) |
| ≥ 300 | ≤ 40 | close, back-door access | **Alias candidate** (rare — requires alias infra) |
| ≥ 1000 | ≤ 40 | term cited in body | **Bridge candidate** (most common high-leverage) |
| < 300 | any | any | Keep (default) |
| any | any | semantic mismatch | Keep (regardless of volume) |
| any | any | navigational/branded SERP | Keep (per A-04 fast-check) |
