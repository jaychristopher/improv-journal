# SOP 13 · Render MP4

## Purpose

Render the Remotion composition (SOP 12) to an MP4 file ready for YouTube upload. This is the slowest step in the pipeline (10-25 min/video) so plan accordingly.

## Inputs

- Working composition in `videos/src/compositions/<VideoId>.tsx` registered in Root.tsx
- Synced audio at `videos/public/audio/<NN>-<slug>.mp3`

## Outputs

`videos/out/<VideoId>.mp4` — H.264 MP4, 1920×1080 @ 30fps, ~20-30 MB for 4-5 min.

## Tools

- `npx remotion render` (uses Chromium under the hood)

## Command

```bash
cd videos && npx remotion render <VideoId> out/<VideoId>.mp4
```

The `<VideoId>` is the composition `id` registered in Root.tsx (e.g., `L31`, `L2HowToBeFunny`).

## Steps

1. **Verify the composition plays cleanly in Remotion Studio first.** Don't render until scrubbing in-Studio looks right. Render is the slow, expensive step; catch issues at the dev-server stage.
2. **Free disk + RAM.** Remotion spins up Chromium and writes frames to disk. Close other heavy apps. Need ~5GB free disk (frame cache).
3. **Run the render command** above. Output looks like:
   ```
   Bundled 1.5s
   ⠋ Rendering frames | 1240/13158 (9%) | ETA: 18m
   ```
4. **Wait.** 4-5 min videos at 1920×1080@30fps take 10-25 min depending on hardware. Don't interrupt mid-render — the frames are written incrementally but the MP4 mux happens at the end.
5. **Verify the output:**
   ```bash
   ffprobe -v quiet -show_entries format=duration,size -of csv videos/out/<VideoId>.mp4
   ```
   Duration should match the audio (within 0.1s). Size should be 15-40 MB.
6. **Spot-check the rendered MP4.** Open in a media player. Watch the first 30s and the last 30s. Confirm:
   - Audio plays
   - First peak appears within ~0.5s
   - Last peak fades out cleanly
   - No black frames mid-render

## Quality bar

- File at `videos/out/<VideoId>.mp4` exists
- Duration matches audio length (Δ < 0.1s)
- File size 15-40 MB (4-5 min @ 1920×1080)
- Plays cleanly in VLC / QuickTime
- No frames dropped (Remotion would have errored, but verify)

## Common pitfalls

- **Rendering before audio is synced.** If `videos/public/audio/<file>.mp3` doesn't exist, the render produces a silent MP4 — won't error, just silent. Verify the audio file is in BOTH `public/audio/youtube/` AND `videos/public/audio/`.
- **Wrong durationInFrames in Root.tsx.** If shorter than audio, the MP4 cuts off the closing. If longer, you get black frames at the end.
- **OS sleep mid-render.** Disable sleep / screensaver before kicking off a render. Sleep can corrupt the frame cache and waste 20 min.
- **Running multiple renders in parallel.** Remotion will try, but Chromium fights for resources. One at a time is faster overall.
- **Forgetting to sync audio to videos/public/ after SOP 09.** This is the #1 root cause of silent MP4s.

## Estimated time

10-25 minutes wall-clock per video. Mostly hands-off (kick off and walk away).

## Lessons from prior production

| Video | Audio (s) | Frames | Render time | MP4 size |
|-------|-----------|--------|-------------|----------|
| L1    | 257.95   | 7738   | ~12 min     | 19 MB    |
| L2    | 346.80   | 10404  | ~17 min     | 24 MB    |
| L23   | 406.46   | 12194  | ~20 min     | 27 MB    |
| L31   | 438.60   | 13158  | ~22 min     | 28 MB    |

- Total render time for the Week 1 batch (4 videos) was ~70 min wall-clock. Run them sequentially in the background while doing other work.
- Renders never failed once the SOP 09 audio was correctly synced. Failures all traced to either audio path or `durationInFrames` mismatch.
- File sizes are well under YouTube's 256 GB limit. Consider rendering at higher bitrate if visual fidelity matters more than upload time (default is fine).
- Don't bother with --image-format=jpeg "for speed." PNG is the default and the marginal speedup isn't worth the quality loss on the gradient backgrounds.
