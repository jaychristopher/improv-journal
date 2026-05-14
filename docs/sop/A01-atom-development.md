# SOP A-01 · Atom Development (seed → draft)

## Purpose

Promote a seed atom (stub with frontmatter + a paragraph of intent) to a draft atom (full body with cited sources and a real counter-position). Atoms are the smallest meaningful unit of improv knowledge; draft is the working state most atoms live in until SOP A-02 validates their SEO vocabulary and SOP-level production confirms accuracy.

This SOP is the upstream parent of A-03 (thread composition) — threads compose from atoms with status ≥ draft.

## Inputs

- Seed atom file at `content/atoms/<id>.md` with:
  - Frontmatter populated (`id`, `title`, `type`, `status: seed`, `tags`, `links` placeholder, `sources: []`, `created`, `updated`)
  - 1-2 paragraphs of intent capturing the core claim
  - Optional: a `**To develop:**` block naming sources to chase
- Access to source materials (improv books, academic papers, online citations)

## Outputs

Same atom file, status promoted to `draft`, with:

- Body of ~500-800 words organized around the claim
- 8-12 link relations to other atoms (`requires`, `enables`, `contrasts`, `extends`, `illustrates`)
- **Specific sources** block with ≥3 citable sources (named author + year + work; URLs where useful)
- **Counter-position** block that genuinely pushes back rather than restating the claim
- Inline bold sub-headers (`**Like This.**`) breaking the body into 3-6 sections

## Tools

- Read tool for inspecting existing atoms (use closest-cousin atom as the voice template)
- Edit / Write for the atom file
- `npm run build` to verify the graph compiles cleanly after links are wired

## Steps

1. **Pick a voice template.** Find the existing draft atom whose `type` matches (insight / law / principle / pattern / technique / definition / antipattern / format / pedagogy) and whose content register is closest. Reading the template *before* writing locks in tone, length, and sub-section conventions.
2. **Audit existing graph for connection points.** Grep `content/atoms/` for terms the new atom will touch. Each match is a candidate link — note the relation (`requires` / `enables` / `contrasts` / `extends` / `illustrates`) that fits.
3. **Research sources.** Pull ≥3 sources. Prefer this mix:
   - 1 improv-tradition source (Johnstone / Spolin / Close-Halpern / Napier / UCB Manual / TJ-Dave / Hines / Madson / Sawyer)
   - 1 academic / scientific source (peer-reviewed paper or established framework with year)
   - 1 cross-domain source (philosophy / psychology / rhetoric — wherever the claim's structural argument lives)
   Each source needs author + year + work. URLs only when they help readers reach the source.
4. **Draft the counter-position FIRST.** Write the strongest version of the argument *against* the claim before writing the claim. This prevents motivated reasoning during the body draft. The counter-position should make the reader feel "huh, that's a real concern" — not "oh that's an easy strawman." A good counter-position usually leads to a *narrowed* version of the original claim, captured at the end of the counter-position block.
5. **Write the body.** Structure:
   - Opening claim — 1 paragraph, no hedge
   - Structural argument — why the claim is mechanistically true (not just rhetorically)
   - 3-6 sub-sections with bold inline headers, each developing one facet (mechanism / signature / failure mode / on-stage analogue / practical move)
   - Closing paragraph that lands the implication for the reader (improv practice, off-stage life, or both per atom's tags)
6. **Wire the links.** Add 8-12 link entries to frontmatter. Cover all five relations where the atom has real connections. Use the audit from step 2 to ensure the links route to existing atoms (no broken refs).
7. **Append the Specific sources block.** Format: `Author, *Work* (year), specific section — what it grounds.` Include counter-position-related sources here, not separately.
8. **Append the Counter-position block.** Use the draft from step 4. If the body changed the claim's shape, tighten the counter-position to match.
9. **Update frontmatter:** `status: draft`, `updated: <today's ISO date>`, `sources: []` stays empty (this field links to `content/sources/` files; sources cited in body don't populate it).
10. **Run `npm run build`.** If the graph fails (broken link target, schema issue), fix before marking the atom complete.

## Quality bar

- Body length 500-800 words. Below 500 = under-developed; above 800 = bloated for an atom (consider whether it should be split or promoted to a thread).
- ≥3 sources cited with author + year + work
- Counter-position genuinely pushes back; if you can delete it without weakening the atom, it's not pulling its weight
- 8-12 link relations, no broken targets, mix of relation types (not all `requires`)
- `npm run build` passes
- Body uses bold inline sub-headers, not markdown `##` headers (matches existing atom convention)

## Common pitfalls

- **Writing the claim before the counter-position.** Motivated reasoning baked in. Always counter-position first.
- **Counter-position that restates the claim.** "Counter-position: this isn't always true." That's not a counter — that's a hedge. The real counter names a specific case, a specific tradition, or a specific empirical signature that *contradicts* or *narrows* the claim.
- **Sources without years.** "Johnstone says..." without a year and book title leaves the reader unable to verify. Author + work + year is the minimum.
- **All `requires` relations.** A graph where everything requires everything is unsearchable. Mix in `extends`, `illustrates`, `contrasts` — those carry navigation value the `requires` chain doesn't.
- **Generic body — not type-shaped.** A `law` should feel mechanistic and structural. A `principle` should feel prescriptive. A `pattern` should feel observed-from-the-wild. A `technique` should feel actionable. If body voice doesn't match `type`, the type is wrong or the body is.
- **Inventing an improv source.** If no improv author actually addresses the claim, *say so* in the Specific sources block as an "Attribution note" (see `shared-reality-fragility.md` for the format). Synthesis is fine; pretending it's tradition is not.

## Estimated time

- 10 min — voice template + connection audit
- 20-30 min — source research
- 10 min — counter-position draft
- 30-45 min — body draft
- 10 min — link wiring + frontmatter + build verify
- **Total: ~90 min per atom**

Faster on cousin atoms (when 2 of the 3 sources are already cited in adjacent atoms). Slower on atoms that need genuinely new academic grounding.

## Lessons from prior production

- **First run (2026-05-14, 4 atoms in one session):** `model-of-their-model`, `belief-as-architecture`, `rigid-core-malleable-edge`, `framing-as-angle-of-approach`. ~90 min average per atom held. Voice templates used: `meaning-is-relational` (for laws), `beyond-the-stage` (for insights), `justification` (for principles/definitions).
- **Same run:** counter-positions did real work in 3 of 4 atoms — each forced a narrowing of the original claim. The fourth (`model-of-their-model`) needed a counter-position rewrite mid-draft because the first version was too easy on itself. **Counter-position is the part most likely to need a second pass.**
- **Same run:** the reverse-link pass (adding back-references from older atoms to new) was a separate 15-min step across 8 files. Folding it into A-01 step 6 would catch it consistently; leaving it as a separate pass risks lopsided graphs as new atoms accrete without reverse references.
- **Same run:** the 4 atoms collectively composed the thread `shaping-shared-reality` (via SOP A-03) — drafting all 4 in one session let the cross-references stay coherent. **When a set of atoms naturally compose into a thread, draft them in one session.**
