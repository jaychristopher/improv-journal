# SOP 09 · Audio Dead-Air Compression

## Purpose

ElevenLabs `eleven_v3` over-interprets `[short pause]` tags AND question-mark punctuation, inserting 1-2 second silences. To a viewer scrubbing in Remotion Studio (and on YouTube), these feel like the audio dropped. Compress them down to natural breath pauses.

## Inputs

- Raw mp3 from SOP 08 at `public/audio/youtube/<NN>-<slug>.mp3`
- ffmpeg installed and on PATH

## Outputs

- Compressed mp3 at the same path (overwrites raw)
- Original preserved at `public/audio/youtube/<NN>-<slug>.original.mp3`

## Tools

- ffmpeg with `silenceremove` filter

## The canonical command

```bash
cp public/audio/youtube/<NN>-<slug>.mp3 \
   public/audio/youtube/<NN>-<slug>.original.mp3 && \
ffmpeg -y \
  -i public/audio/youtube/<NN>-<slug>.original.mp3 \
  -af "silenceremove=start_periods=0:stop_periods=-1:stop_duration=0.4:stop_threshold=-38dB:stop_silence=0.25" \
  public/audio/youtube/<NN>-<slug>.mp3
```

Parameters explained:

- `start_periods=0` — don't trim leading silence (we want intro breath)
- `stop_periods=-1` — process every silence period in the file
- `stop_duration=0.4` — only silences ≥ 0.4s get touched (preserves natural breaths)
- `stop_threshold=-38dB` — anything quieter than -38 dB counts as silence
- `stop_silence=0.25` — keep 0.25s of silence after each removed period (so it sounds intentional, not jarring)

## Steps

1. **Backup the raw audio** by copying to `*.original.mp3`. This is the safety net in case parameters need tuning.
2. **Run the silenceremove command** above. Should complete in 2-5 seconds.
3. **Capture before/after duration.**
   ```bash
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 *.original.mp3
   ffprobe -v quiet -show_entries format=duration -of csv=p=0 *.mp3
   ```
4. **Spot-amplitude check** at the previously-noisy region (often 15-25s into the audio):
   ```bash
   for sec in 15 16 17 18 19 20 21 22 23 24 25; do
     ffmpeg -ss $sec -t 1 -i <mp3> -af volumedetect -f null /dev/null 2>&1 | grep mean_volume
   done
   ```
   Every second should show -15 to -25 dB. If any second shows -40 dB or quieter, dead air slipped through; tune the threshold.

## Quality bar

- Compressed audio 5-15% shorter than raw (≥ 5% expected; >20% may be over-aggressive)
- All 1-second windows in 0-30s range show ≥ -30 dB mean volume
- Original mp3 backed up at *.original.mp3
- Subjective: spot-listen to a place where the original had an awkward pause; the compressed version should feel natural, not rushed

## Common pitfalls

- **Skipping the backup.** silenceremove is destructive when it overwrites in-place. Without `.original.mp3`, parameter tuning means full regen.
- **Using stop_threshold too high (e.g., -50dB).** Doesn't catch the actual dead air ElevenLabs produces (which is ~-40 dB).
- **Using stop_silence=0.** Cuts ALL silence including natural breaths; sounds rushed and unnatural.
- **Running this BEFORE listening to the raw.** If raw is fine, don't compress. Some scripts have lighter punctuation and don't need it.
- **Forgetting to copy to videos/public/audio/.** SOP 12 needs the compressed audio synced into the Remotion project's public dir.

## Estimated time

5 minutes including verification.

## Lessons from prior production

| Video | Raw | Compressed | Saved |
|-------|-----|-----------|-------|
| L1 | 283.04s | 257.95s | -25.1s |
| L2 | 362.27s | 346.80s | -15.5s |
| L23 | 433.70s | 406.46s | -27.2s |
| L31 | 462.88s | 438.60s | -24.3s |

- Question-mark punctuation is the worst offender. Scripts with many question hooks (L1: "What's right? Will it land? What if I'm wrong?") will see longer dead air.
- One time the compressed version was 20% shorter — investigation showed `[short pause]` tag was being interpreted as ~3-4 seconds. Tweaked the script to remove some `[short pause]`s.
- Across 4 videos, RMS volume in the post-compression file was always -15 to -25 dB. If your compressed file shows -30+ dB anywhere in the body, the threshold needs lowering.
