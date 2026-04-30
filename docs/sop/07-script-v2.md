# SOP 07 · Script v2 (Final)

## Purpose

Apply the combined edit list from SOPs 05 and 06 to produce the final, audio-ready script. v2 is what generates audio — every word matters.

## Inputs

- Script v1 (SOP 04)
- Combined edit list from SOP 05 + SOP 06

## Outputs

`content/scripts/youtube/<NN>-<slug>-tts-v2.txt`

The v1 file is preserved (committed already). v2 is a separate file so we can diff and revert if needed.

## Tools

- Write tool only.

## Steps

1. **Open v1.** Copy the entire script into a new v2 file. Don't delete the v1.
2. **Apply edits in order.**
   - **Hook trim first.** This is the highest-leverage change.
   - **Stakes line second.** Insert the explicit cost line after the hook.
   - **Open-loop tease.** Move the "X moves in Y minutes" promise into the first 30s.
   - **Midpoint isolation.** Add `[short pause]` before AND after the midpoint reveal.
   - **CTA reposition.** Confirm the URL is at the end, not earlier.
   - **Closing callback.** Verify the last line echoes the opening.
3. **Apply the SOP 06 craft edits.** Bridges, gradient, hype removal.
4. **Re-run the SOP 05 rubric** on v2. Score should land 60-65/65 (A).
5. **Word count check.** Target 600-720 spoken words for ~4-5 min audio. If over 720, cut. If under 600, the script may be too thin — review for missing context.
6. **Read v2 aloud.** Time it. Should land at 4:00-5:00 minutes.
7. **Save and commit** along with the buildup doc that captures the v2 changes.

## Quality bar

- Projected SOP 05 rubric score ≥ 60/65 (A)
- Word count 600-720 spoken
- Read-aloud timing 4:00-5:00 (one viewer can sit through this)
- Hook ≤ 8 spoken words
- Midpoint reveal isolated by `[short pause]` flanks
- CTA only at end
- Last line callbacks to first

## Common pitfalls

- **Polishing v1 without a fresh listen.** Read v2 aloud once you finish. Lines that look fine on the page sometimes sound stilted aloud.
- **Adding new content beyond the edit list.** v2 is a tightening pass, not a re-invention. If you want to add new content, you've identified a SOP 04 gap; go back and revise v1.
- **Forgetting word count.** 4 min audio is much better retention than 6 min. Cut anything that doesn't earn its place.

## Estimated time

30-60 minutes.

## Lessons from prior production

- L2 v1 → v2: 720 → 640 spoken words. Audio went from estimated 5:08 to actual 5:47 (post-compression 5:47). TTS pacing is slightly slower than typical reading speed; budget accordingly.
- v2 always feels worse than v1 right after writing. Wait an hour or sleep on it. Often v2 is correct and the discomfort is loss of familiarity.
- Test the hook on someone who hasn't read v1. If they can't repeat it after one read, it's not punchy enough.
