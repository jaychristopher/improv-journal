# SOP 08 · Audio Generation

## Purpose

Convert the v2 TTS script into a high-quality MP3 via ElevenLabs Pro `eleven_v3` model.

## Inputs

- v2 script at `content/scripts/youtube/<NN>-<slug>-tts-v2.txt`
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in `.env`
- Active Pro plan with sufficient character quota

## Outputs

`public/audio/youtube/<NN>-<slug>.mp3`

Single voice, MP3 mono 44.1kHz, ~5-7 MB depending on length.

## Tools

- `node scripts/generate-episode.mjs` — wraps ElevenLabs API

## Pre-check

Always run dry-run first:

```bash
node scripts/generate-episode.mjs \
  content/scripts/youtube/<NN>-<slug>-tts-v2.txt \
  public/audio/youtube/<NN>-<slug>.mp3 \
  --public --dry-run
```

This confirms:
- File parses without [emote] tag errors
- Estimated audio length
- Available character quota (must exceed needed chars)

## Steps

1. **Run dry-run.** Confirm quota OK and estimated length is in 4-5 min range.
2. **If quota tight,** wait until next billing cycle or top up. Don't run hot.
3. **Run actual generation:**
   ```bash
   node scripts/generate-episode.mjs \
     content/scripts/youtube/<NN>-<slug>-tts-v2.txt \
     public/audio/youtube/<NN>-<slug>.mp3 \
     --public
   ```
4. **Wait for completion** (~1-3 minutes per chunk; 4-5 min audio is usually 1-2 chunks).
5. **Verify the mp3 exists** and has reasonable size (4-7 MB for 4-5 min).
6. **Spot-listen** to opening 10s and closing 10s to confirm voice profile and emote tag interpretation worked.

## Quality bar

- Audio file exists at the canonical path
- File size 4-8 MB (4-7 min mono mp3)
- Spot-listen confirms: voice consistent, [emote] tags interpreted, no hallucinations
- ffprobe duration matches estimate within 30s

## Common pitfalls

- **Running --public without checking quota.** Each gen costs ~5K characters; running into the wall mid-script wastes the chunk that already ran.
- **Forgetting --public flag.** Without it, the script falls back to local Qwen3 which is lower quality.
- **Editing v2 between dry-run and actual gen.** Dry-run uses the file at that moment; if you tweak after, the actual gen uses different content.
- **Treating raw audio as final.** Always run SOP 09 (compression) next — ElevenLabs adds long pauses on punctuation.

## Estimated time

5-10 minutes wall-clock (most of it API time, not user time).

## Lessons from prior production

- L1 raw: 283.04s · L2 raw: 362.27s · L23 raw: 433.70s · L31 raw: 462.88s. All compressed by ~5-10% in SOP 09.
- One time, the script had an unescaped curly apostrophe that the parser choked on — cleared by replacing with straight ASCII apostrophe.
- ElevenLabs Pro 1.5M char/month is plenty for ~150 4-min videos. Don't burn it on test renders.
