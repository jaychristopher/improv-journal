# SOP 11 · Peak-Sync Audit

## Purpose

Translate the script's content arcs into peak boundaries (with frame counts at 30fps) anchored to actual word timings. This is what the Remotion composition (SOP 12) consumes directly.

## Inputs

- Word timings from SOP 10
- The script's natural section breaks (the [short pause] tags + topic shifts)

## Outputs

- Per-video entry in `scripts/audit-peak-sync.mjs` ANCHORS object
- Per-video block in `docs/youtube-week-1/peak-sync-audit.json` (auto-written by the audit script)

## Tools

- `scripts/audit-peak-sync.mjs` — reads timings JSON + ANCHORS config, prints peak boundaries with frames-at-30fps

## Steps

1. **Identify the peaks.** Walk through the v2 script and break it into 7-12 peaks. Each peak is one visual moment that holds for 20-90 seconds. Rules of thumb:
   - Hook is its own peak (~5-15s)
   - Each named "step" / "exercise" / "rule" is one peak (30-60s each)
   - Closing/CTA is its own peak (~30-60s)
2. **Pick an anchor phrase per peak.** Each peak's start is identified by a 2-4 word phrase that appears UNIQUELY in the script at the peak boundary. Pick distinctive words.
   - **Bad anchor:** ["the", "moment"] — appears 5 times
   - **Good anchor:** ["move", "one"] — appears once
3. **Add the entry to ANCHORS in the audit script:**
   ```js
   L4: {
     timingsPath: "docs/youtube-week-N/L4-timings.json",
     currentPeaks: [estimated_seconds_per_peak], // rough estimate, gets corrected
     peaks: [
       { num: 1, label: "Hook", anchor: ["..."] },
       { num: 2, label: "...", anchor: ["...", "..."] },
       ...
     ],
   },
   ```
4. **Run the audit:**
   ```bash
   node scripts/audit-peak-sync.mjs <video-id>
   ```
5. **Read the output table.** Each peak shows: anchor phrase, audio start time, current vs. corrected duration, delta, and frame count at 30fps.
6. **Fix any "anchor not found" rows.** If your phrase doesn't match the transcription, look at the actual transcription text and pick a different phrase. The audit script normalizes (lowercase, strip non-alpha) but can't handle all word boundary mismatches.
7. **Confirm total = audio length.** Sum of peak durations should equal audio length within rounding (≤ 0.5s diff).

## Quality bar

- Every peak's anchor is found
- Total peak duration matches audio within 0.5s
- Frame counts are integers (the audit script rounds)
- 7-12 peaks total (fewer = each peak too long; more = visual whiplash)

## Common pitfalls

- **Anchor too short or generic.** "the" / "you" / "and" appear hundreds of times. Use 2-3 word phrases.
- **Mismatch between script and transcription.** The script writes "we're" — Scribe transcribes as "we're" usually but sometimes "we are". Pick anchor words that ElevenLabs voices cleanly.
- **Trying to anchor on numbers.** "60 years ago" sometimes transcribes as "sixty years ago" or "60-years ago" depending on TTS. Test with both; the normalizer strips digits AND letters into the same alphabetic stream.
- **Peak spans crossing [short pause] tags incorrectly.** A `[short pause]` is roughly a peak boundary, but not always. Use content-arc shifts as the primary signal.

## Estimated time

15-30 minutes including iteration on bad anchors.

## Lessons from prior production

- The L31 Peak 6 audit failed on first run because anchor was `["the", "rules", "aren't"]` but the actual audio is "the rules of improv aren't" (4 extra words inserted). Switched to `["training", "wheels"]` (2 unique tokens further into the peak).
- L23 anchor for `["sixty", "years"]` failed because TTS pronounced "60 years" with the digit. Anchor changed to `["60", "years"]` and matched cleanly.
- Always confirm the anchor by inspecting the timings JSON manually before declaring a video "done" with audit. Even a perfect-looking output table can mask one mismatch.
- Peak count of 7 is the sweet spot for 4-7 min videos. < 7 = peaks too long, viewer drift. > 12 = too much visual change, feels frantic.
