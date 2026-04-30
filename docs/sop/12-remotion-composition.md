# SOP 12 · Remotion Composition

## Purpose

Build the Remotion composition that plays compressed audio with visual peaks and beat-driven sub-beats anchored to Scribe word timings. This is what gets rendered to MP4 in SOP 13.

## Inputs

- Compressed audio at `videos/public/audio/<NN>-<slug>.mp3` (synced from `public/audio/youtube/`)
- Word timings JSON at `docs/youtube-week-N/<slug>-timings.json`
- Peak boundaries from `scripts/audit-peak-sync.mjs` (SOP 11)

## Outputs

- New file at `videos/src/compositions/<VideoId>.tsx` (e.g., `L31.tsx`)
- Registration in `videos/src/Root.tsx`

## Tools

- Remotion 4.0.451 (already installed in `videos/`)
- Shared primitives in `videos/src/lib/primitives.tsx`
- Design tokens in `videos/src/lib/design.ts`

## Composition skeleton

```tsx
import { AbsoluteFill, Audio, Series, staticFile, useCurrentFrame, interpolate } from "remotion";
import { BaseFrame, FadeIn, FadeInOut, Title, Kicker, Caps, Watermark, PeakBadge } from "../lib/primitives";
import { COLORS, FRAME } from "../lib/design";

const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS); // seconds → frames helper

export const L31: React.FC = () => {
  return (
    <AbsoluteFill>
      <Audio src={staticFile("audio/03-rules-of-improv.mp3")} />
      <Series>
        <Series.Sequence durationInFrames={s(11.4)}>
          <Peak1Hook />
        </Series.Sequence>
        <Series.Sequence durationInFrames={s(45.2)}>
          <Peak2YesAnd />
        </Series.Sequence>
        {/* ...remaining peaks... */}
      </Series>
      <Watermark />
    </AbsoluteFill>
  );
};
```

## Steps

1. **Copy a previous video as a template.** L31 or L23 are the most polished. Don't start from blank — peaks, fades, and color palette should match existing channel style.
2. **Set the duration** in Root.tsx based on audio length: `durationInFrames={Math.ceil(audioSeconds * 30)}`. ffprobe gives the audio seconds.
3. **Drop in peaks as Series.Sequence.** Each peak's `durationInFrames` comes from the SOP 11 audit output (frames-at-30fps column).
4. **Inside each peak component, add sub-beats.** Every ~3-6 seconds something visual should change. Patterns:
   - `<FadeIn startFrame={N}>` for things that appear and stay
   - `<FadeInOut startFrame={A} endFrame={B}>` for things that come and go (recap chips, callbacks)
   - Color shifts on numbers (`COLORS.red` for cost, `COLORS.green` for outcome)
5. **Anchor every sub-beat to a real word timestamp.** Open the timings JSON for the video. Find the word that should trigger the visual. Use its `start` value × 30 = startFrame. NEVER guess timing — it WILL be off by 1-3s.
6. **Run `npm run dev` in videos/.** Open `http://localhost:3000/<VideoId>` in Remotion Studio. Scrub through. Confirm:
   - Audio and visual line up
   - No 6+ second stretches with zero visual change
   - Peak transitions don't have visible cuts (FadeIn at frame 0 of next sequence smooths it)
7. **Iterate until the playthrough feels alive.** Watching 4 minutes with no visual change kills retention. Watching too many changes feels frantic. Aim for ~1 visual change every 4-5s on average.
8. **Register in Root.tsx:**
   ```tsx
   <Composition id="L31" component={L31} durationInFrames={13158} fps={30} width={1920} height={1080} />
   ```

## Quality bar

- Audio plays cleanly start-to-finish in Remotion Studio
- Every peak has at least 2-3 visual sub-beats
- No stretch >6s without a visual change
- Peak count and durations match SOP 11 audit
- Composition registered in Root.tsx with correct `durationInFrames`
- Hook (Peak 1) lands within 8 spoken words and shows the value prop visually

## Common pitfalls

- **Guessing sub-beat timings.** Always anchor to `timings.json`. The Scribe-anchored startFrame is the only way to keep things in sync.
- **One peak doing too much.** If you find yourself fading 10 elements in a single peak, you should split it into 2 peaks.
- **FadeIn left, never out.** Stacking FadeIns means everything stays on screen forever — it gets cluttered. Use FadeInOut for ephemera (tease chips, intermediate beats).
- **Forgetting to sync compressed audio into videos/public/.** The Remotion `Audio` component reads from `videos/public/audio/`, NOT `public/audio/`. After SOP 09, copy the compressed file into both locations.
- **Using `useCurrentFrame()` directly for fades** instead of the FadeIn/FadeInOut primitives. The primitives handle interpolate cleanly; raw frame math gets ugly fast.
- **Hardcoding colors.** Use `COLORS.red` / `COLORS.orange` / `COLORS.green` from design.ts so the channel palette stays consistent.

## Estimated time

2-4 hours for a fresh composition; 30-60 min for re-anchoring an existing one to new audio.

## Lessons from prior production

- L1 had 10 peaks but Peak 2 originally had 3 questions fading in at frames 20/44/68 — audio didn't speak them until 167/223/271. Visual was 5+ seconds ahead of audio. Fix: re-anchor every FadeIn to the first word of its phrase from the timings JSON.
- L2 Peak 7 (Closing/Recap) had recap chips overlapping with the final callback "Stop trying. Start noticing." Wrapping the recap in `FadeInOut` with `endFrame={1410}` (callback start) cleared the overlap.
- L31 originally had 9 peaks but Peak 4 (the longest, ~85s) was visually dead in the middle 40s. Splitting into Peak 4a/4b doubled the visual change rate without adding content.
- The PeakBadge in the bottom-right ("PEAK 6 / 11") helps debug-mode but should be hidden in production (`<PeakBadge n={6} of={11} debug={false} />`).
- Color choices that worked: red for problems/cost, orange for tension/transition, green for outcome/win. Keep this consistent across all videos.
- A blank `BaseFrame` (gradient bg + watermark, no content) for 1-2 seconds at peak transitions actually feels intentional — gives the viewer a beat. Don't fight to fill every frame.
