# SOP 10 · Word-Level Transcription

## Purpose

Get word-level timestamps for the compressed audio. These are the source of truth for every visual-sync decision downstream — peak boundaries (SOP 11), Remotion sub-beats (SOP 12), and chapter timestamps in the upload description (SOP 15) all derive from this.

## Inputs

- Compressed audio from SOP 09 at `public/audio/youtube/<NN>-<slug>.mp3`
- `ELEVENLABS_API_KEY` in `.env`
- Internet connection

## Outputs

`docs/youtube-week-N/<slug>-timings.json` — JSON array of `{ word, start, end }` objects.

## Tools

- `node scripts/transcribe-with-timings.mjs` — wraps ElevenLabs Scribe STT API

## Command

```bash
node scripts/transcribe-with-timings.mjs \
  public/audio/youtube/<NN>-<slug>.mp3 \
  docs/youtube-week-N/<slug>-timings.json
```

## Steps

1. **Make sure compression has happened first** (SOP 09). Transcribing the raw audio gives wrong timestamps because dead-air gets removed later, shifting everything.
2. **Run the transcribe script.** Takes ~30-60 seconds for 4-5 min of audio.
3. **Verify the output:**
   - File exists
   - First word starts near 0.1-0.3s (TTS leads with a short breath)
   - Last word ends within 0.5s of `ffprobe` duration
   - Word count is plausible (~140-160 words/minute)
4. **Spot-check a phrase.** Pick a memorable phrase from the script ("60 years ago" or "the obvious choice") and confirm it's in the JSON with a sensible timestamp.

## Quality bar

- File present at canonical path
- First/last word timestamps bracket the audio cleanly
- A test phrase from the script can be found in the JSON

## Common pitfalls

- **Transcribing the raw audio (pre-compression).** Timings will be invalid; you'll re-transcribe after compression anyway.
- **Path mismatch.** The buildup doc should reference the timings JSON; double-check the path is consistent (`docs/youtube-week-1/L31-timings.json` not `docs/youtube-week-N/...`).
- **Trusting punctuation in transcription.** Scribe sometimes hears "canceling" / "cancelling" differently from the script. The audit script (SOP 11) handles this with multiple anchor variants.

## Estimated time

2-3 minutes.

## Lessons from prior production

- L1: 538 words / 257.95s · L2: 668 words / 346.80s · L23: 850 words / 406.46s · L31: 912 words / 438.60s.
- WPM range: ~125-145 words/minute (TTS is paced slightly slower than typical reading). Useful for word-count → length estimates.
- Scribe is accurate on common words but mishears proper nouns occasionally ("Halpern" → "Halper" once). Doesn't matter for timing, only for caption display.
- Hyphenated compounds get joined: "team-building" comes through as "team-building" (one word). Anchor phrase searches need to handle this — the audit script in SOP 11 normalizes by stripping non-alphabetic characters.
