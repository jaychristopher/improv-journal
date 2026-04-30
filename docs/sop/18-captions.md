# SOP 18 · Captions

## Purpose

Provide accurate English captions for the video. YouTube auto-captions miss proper nouns, dropped articles, and non-standard spellings ~5-10% of the time. We already have word-level timings from Scribe (SOP 10) — converting those to .srt is fast and accurate.

## Inputs

- Word timings JSON from SOP 10 at `docs/youtube-week-N/<slug>-timings.json`
- Final v2 script from SOP 07 (for proper-noun spellings)

## Outputs

`docs/youtube-week-N/<slug>.srt` — standard SubRip format. Uploaded to YouTube as the "Subtitles → English" track.

## Tools

`scripts/timings-to-srt.mjs` — wraps the timings JSON into .srt with sensible line breaks (≤ 42 chars/line, 2 lines max per cue).

## Command

```bash
node scripts/timings-to-srt.mjs \
  docs/youtube-week-N/<slug>-timings.json \
  docs/youtube-week-N/<slug>.srt
```

## Steps

1. **Confirm timings JSON exists** (SOP 10 ran).
2. **Run the conversion.** Outputs .srt with cues of ~3-7 seconds each.
3. **Spot-check the .srt:**
   - Open in a text editor
   - Confirm first cue starts at the audio's first word
   - Confirm last cue ends within 0.5s of audio length
   - Scan 10 random cues for proper-noun mis-spellings (Halpern, Del Close, etc.). Fix manually if Scribe heard them wrong; cross-reference v2 script.
4. **Upload to YouTube Studio.** Studio → Content → click video → Subtitles → Add → English → Upload file → choose .srt → "With timing." Studio parses and shows preview.
5. **Spot-check the preview** at 0:00, midpoint, and last 30s. Captions should appear in sync.
6. **Publish.** Click "Publish" on the subtitles track.

## Quality bar

- .srt file present at canonical path
- No cue exceeds 42 chars/line or 2 lines
- Proper nouns spelled per v2 script (not Scribe's guess)
- First cue ≥ 0:00.0; last cue ends within 0.5s of video length
- Studio preview shows captions in sync at 3 spot-checks

## Common pitfalls

- **Trusting Scribe on proper nouns.** Always verify against v2 script — "Del Close" → "del clothes" type errors slip through.
- **Skipping line-length check.** YouTube's caption renderer wraps long lines awkwardly on mobile. 42 char limit is the safe ceiling.
- **Uploading before the video is published.** Studio allows it but the subtitles track sometimes detaches if uploaded to a still-processing video. Wait for Processed status.
- **Forgetting to uncheck "Auto-generate."** Studio still keeps the auto-track enabled by default. After uploading the .srt, set the auto track to draft/hidden.

## Estimated time

10-15 minutes per video (mostly Studio UI navigation).

## Lessons from prior production

- L1: Scribe transcribed "Halpern" as "Halper" once. Manual fix added; auto-captions would have shipped with the wrong spelling.
- L23: "team-building" came through as one token in Scribe but YouTube's search indexes "team building" as two — kept the hyphen in captions but used "team building" in title/description for SEO.
- The script-to-srt converter chunks by punctuation in the timings JSON; a script with run-on sentences produces fewer, longer cues. If you see cues > 8s, check the v2 script for missing periods.
- Caption quality affects accessibility AND SEO — YouTube indexes captions for search ranking. Auto-captions with errors hurt both.
