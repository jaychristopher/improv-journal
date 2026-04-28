# Physics of Connection — Mock Videos (Remotion)

Remotion project for the three Week 1 YouTube videos. Each composition mirrors the FINAL Figma keyframes and syncs to the existing TTS audio.

## Setup

```bash
cd videos
npm install

# Copy TTS audio (gitignored — same source as the main repo's public/audio/youtube/)
mkdir -p public/audio
cp ../public/audio/youtube/*.mp3 public/audio/
```

## Develop / preview

```bash
npm run dev
```

Opens Remotion Studio at http://localhost:3000. Pick a composition from the sidebar:

- `L1Overthinking` — How to Stop Overthinking (10 peaks, ~5 min)
- `L23TeamBonding` — Team Bonding Activities (12 peaks, ~7 min)
- `L31RulesOfImprov` — The Rules of Improv (11 peaks, ~8 min)

## Render to MP4

```bash
npm run build:l1     # → out/L1.mp4
npm run build:l23    # → out/L23.mp4
npm run build:l31    # → out/L31.mp4
```

Or render any composition directly:
```bash
npx remotion render <CompositionId> out/<filename>.mp4
```

## Project structure

```
videos/
├── src/
│   ├── index.ts                 # registerRoot
│   ├── Root.tsx                 # composition registry
│   ├── lib/
│   │   ├── design.ts            # color tokens, FRAME constants
│   │   ├── fonts.ts             # @remotion/google-fonts loaders
│   │   └── primitives.tsx       # BaseFrame, Watermark, FadeIn, Title, Kicker, Caps, Center
│   └── compositions/
│       ├── L1.tsx               # 10 peak components + composition
│       ├── L23.tsx              # 12 peak components + composition
│       └── L31.tsx              # 11 peak components + composition
├── public/
│   └── audio/
│       ├── 01-how-to-stop-overthinking.mp3
│       ├── 02-team-building-activities.mp3
│       └── 03-rules-of-improv.mp3
├── package.json
├── tsconfig.json
└── remotion.config.ts
```

## Editing peaks

Each peak is a small React component inside `src/compositions/L*.tsx`. To adjust:

1. **Timing** — change `durationInFrames` in the `L*_PEAKS` array at the top of the file. Frames at 30fps: `seconds * 30`.
2. **Visual** — edit the peak component directly. All shared design tokens are in `src/lib/design.ts`.
3. **Animation** — `FadeIn` wraps elements. Pass `startFrame` (relative to the peak's own start) and `duration` to control entrance.

## Design system (matches Figma FINAL pages)

- **Headlines:** Playfair Display Black 900 (`Title` primitive)
- **Italic kickers:** Playfair Display Italic 400 (`Kicker` primitive)
- **Body / labels:** Inter Bold/Semi Bold (`Caps` primitive for letterspaced caps)
- **Background:** vertical slate gradient (`#0f172a` → `#1e293b` → `#334155`)
- **Accents:** red `#ef4444` (problems, focal), orange `#f97316` (warmth, callouts), green `#22c55e` (positive)

## Critique workflow

1. Run `npm run dev` and open Remotion Studio.
2. For each video, scrub through the timeline.
3. Check audio sync: when does the visual lag/lead the spoken anchor?
4. Note timing adjustments needed in `L*_PEAKS`.
5. Re-edit components for visual refinements.
6. Re-render and review.
