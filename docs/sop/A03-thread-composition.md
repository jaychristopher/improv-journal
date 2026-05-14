# SOP A-03 · Thread Composition

## Purpose

Weave N atoms (status: draft or validated) into a single thread — a "full thought" that develops a coherent argument across the composed atoms, with pedagogy frontmatter that makes the thread usable for both web reading and downstream video production.

Threads are the natural home for synthesis-shaped content that's bigger than an atom but smaller than a path. They are also the canonical input to SOP A-05 (channel-plan routing) and to script production via SOP 04 (when the thread becomes a video's conceptual source).

## Inputs

- N atoms (typically 3-6) with status ≥ draft, all wired into the graph with their own link relations
- A synthesis claim — the "full thought" the thread will develop, larger than any single atom's claim
- Pillar assignment (P1-P5) implied by the thread's content register
- Optional: a user's original prose draft (for threads that originated as personal writing)

## Outputs

Thread file at `content/threads/<slug>.md` with:

- Complete frontmatter (see schema in `src/lib/schema.ts` `ThreadFrontmatter`):
  - `id`, `title`, `status` (start at `draft` when prose is substantive), `created`, `updated`, `tags`
  - `atoms[]` — ordered list of atom IDs the thread composes from
  - Pedagogy fields (all required for ≥ draft): `lesson_goal`, `key_takeaway`, `common_mistake`, `practice_prompt`, `success_signal`, `transfer_prompt`, `reflection_prompt`
  - Optional refinement fields: `practice_reps`, `estimated_minutes`, `difficulty` (`beginner` / `core` / `stretch`), `challenge_day`
- Body prose that develops the synthesis claim across the composed atoms (typically 400-1000 words)

## Tools

- Read tool to inspect composing atoms (every atom in `atoms[]` should be read before drafting)
- Edit / Write for the thread file
- `npm run build` to verify the graph compiles (every atom in `atoms[]` must exist with status ≥ draft, or the graph will have dangling references)

## Steps

1. **Read every atom in the proposed composition.** The thread's argument cannot misrepresent any composing atom. Re-reading also surfaces atoms that *almost* fit — note them as candidates rather than force-fitting them.
2. **Order the atoms by the argument's arc.** The order in `atoms[]` is meaningful — it reflects how the thread builds its claim. Three common arcs:
   - **Mechanism → consequence:** start with structural atoms (laws), build to practical atoms (principles, techniques)
   - **Observation → diagnosis → move:** start with a pattern atom, develop through the law that explains it, end on the technique that responds
   - **Foundation → expansion → synthesis:** start with the most-required atom (lowest in the dependency graph), add atoms that extend it, close with the most-encompassing
3. **Draft the synthesis claim.** One sentence that captures the "full thought." If the claim is just one atom's claim restated, the thread isn't a thread — it's an atom that wandered. The claim should be larger than any single composing atom but smaller than a path.
4. **Write the body.** Two acceptable approaches:
   - **User prose preserved:** when the thread originates as user writing, preserve the original voice and don't over-edit. The atoms are doing the structural work; the thread prose carries the user's framing.
   - **Original synthesis:** write in the project voice (see `docs/sop/REFERENCE-channel-voice.md`), drawing from each composing atom's argument in turn.
   In both cases, the body should make the composition order legible — a reader following the prose should hit each composing atom's argument in sequence, without the atoms being explicitly named.
5. **Populate pedagogy frontmatter.** Each field has a specific job; generic answers are SOP failures:
   - `lesson_goal` — what the reader learns to *do* after reading (action-oriented, not "understand")
   - `key_takeaway` — one sentence the reader should be able to repeat a week later
   - `common_mistake` — the specific wrong move this thread inoculates against
   - `practice_prompt` — a concrete exercise; should fit in one sentence and be doable today
   - `success_signal` — what the reader will observe when the lesson lands
   - `transfer_prompt` — how to apply this in a different context (often: same content, different domain)
   - `reflection_prompt` — a question the reader sits with; usually about a past failure the thread reframes
6. **Assign pillar via tags.** Pillar (P1-P5) is currently expressed through `tags` rather than a dedicated field. Use tags like `beyond-stage`, `synthesis`, `fundamentals`, `social-reality` plus a pillar-implicit tag from existing convention. (Future SOP refinement: add explicit `pillar` field to schema.)
7. **Reverse-link the composed atoms.** Each atom in `atoms[]` should have at least one link relation that points back at the thread *concept* — usually via newer atoms the thread introduces, or via the highest-level atom in the thread's arc. This prevents lopsided graphs where threads reference atoms that don't reference back.
8. **Run `npm run build`.** Confirm every atom in `atoms[]` exists with status ≥ draft. Dangling references break the graph.

## Quality bar

- Body length 400-1000 words. Below 400 = under-developed synthesis; above 1000 = consider whether this should be a path or split into two threads.
- All atoms in `atoms[]` exist with status ≥ draft (no dangling refs)
- All 7 pedagogy fields populated specifically — none generic ("understand X" is not a `lesson_goal`)
- `key_takeaway` would survive a week's memory (testable: read it, wait, can you restate it?)
- Composition order in `atoms[]` reflects the argument's arc (not alphabetical, not random)
- `npm run build` passes

## Common pitfalls

- **Force-fitting atoms.** A thread that includes 8 atoms because they're "kind of related" is unfocused. Better: 3-5 atoms with a tight arc.
- **Generic pedagogy fields.** "Reflect on the lesson" is not a `reflection_prompt`. "Notice when you do X" is. Specificity is the difference between a useful field and a checked box.
- **Thread body that just restates atom bodies.** The thread's value is the *synthesis* — what the atoms collectively reveal that no single atom shows. If the body is "and then atom 1 says... and then atom 2 says..." it isn't a thread; it's a list.
- **Drafting before reading every composing atom.** Even atoms you wrote a week ago drift in memory. Re-read each one before drafting the thread that composes them.
- **Wrong status for `atoms[]` entries.** Threads at `draft` can compose atoms at `draft`. Threads at `validated` should compose atoms at `validated` (defining "validated" is open — see `docs/concepts/upstream-gaps.md` F9).
- **Skipping the reverse-link step.** New threads accrete forward-references without back-references; the graph becomes lopsided. Step 7 is non-optional.
- **Pillar assignment by intuition without naming it.** Even though the schema doesn't yet have a `pillar` field, naming the pillar in the thread's tags and rationale is needed for SOP A-05 (routing) to work.

## Estimated time

- 15 min — re-read composing atoms
- 5 min — order the arc + draft synthesis claim
- 30-45 min — body draft (longer when synthesizing original; shorter when preserving user prose)
- 15 min — pedagogy field population
- 10 min — reverse-link pass + build verify
- **Total: ~75-90 min per thread**

## Lessons from prior production

- **First run (2026-05-14, `shaping-shared-reality`):** Composed 6 atoms (4 new + 2 existing). User had written original prose; preserved it intact rather than rewriting in project voice. Pedagogy fields took longest — `success_signal` and `transfer_prompt` are the two that resist generics most. ~75 min total, with the user-prose-preservation path being faster than original synthesis would have been.
- **Same run:** Atoms ordered as: epistemic foundation (`model-of-their-model`) → structural mechanism (`belief-as-architecture`) → diagnostic pattern (`rigid-core-malleable-edge`) → practical principle (`framing-as-angle-of-approach`) → on-stage anchor (`status`) → law that ties it together (`shared-reality-fragility`). This **mechanism → consequence** arc held; reader follows it without atoms being named in body. **Pattern confirmed: ordering is part of the argument, not metadata.**
- **Same run:** Reverse-link pass after thread composition added back-references in 8 older atoms. Step 7 is real work — budget 10-15 min for it, not 2.
- **Same run:** Pillar (P2 Better Conversations) was clear from content register but had no explicit frontmatter field — captured only via tags. **Schema refinement candidate:** add explicit `pillar` field to ThreadFrontmatter; until then, `tags` carries the assignment and downstream SOP A-05 reads it from there.
