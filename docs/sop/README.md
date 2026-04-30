# Video Production SOPs — Index

End-to-end pipeline for producing one YouTube video. Each artifact has its own SOP, and each round produces all artifacts before turning in for critique.

## Pipeline

```
┌─ 01 Persona + JTBD          [pre-production]
├─ 02 SEO research            [pre-production]
├─ 03 Bridge content audit    [pre-production]
│
├─ 04 Script v1               [script stage]
├─ 05 Retention critique (R1) [script stage]
├─ 06 Craft critique (R2)     [script stage]
├─ 07 Script v2 (final)       [script stage]
│
├─ 08 Audio generation        [audio stage]
├─ 09 Dead-air compression    [audio stage]
├─ 10 Word-level transcription[audio stage]
├─ 11 Peak-sync audit         [audio stage]
│
├─ 12 Remotion composition    [visual stage]
├─ 13 Render MP4              [visual stage]
├─ 14 Thumbnail               [visual stage]
│
└─ 15 Upload metadata         [ship stage]
```

## When to use this

Every new video. Run the pipeline top to bottom. Each artifact is reviewable before moving to the next.

## Cycle critique (this is the meta-process)

1. **Produce** — Run the full pipeline for one video, emitting every artifact per its SOP.
2. **Turn in** — Stop. Don't start the next video.
3. **Critique** — Review each artifact AND each SOP. What's missing, off, or causing rework downstream?
4. **Refine SOPs** — Update the relevant SOPs with what we learned.
5. **Next cycle** — Use the refined SOPs for the next video.

The point isn't perfect SOPs on day one. It's that the SOPs improve with every video.

## File layout

```
docs/sop/
  README.md                                  ← this file
  01-persona-jtbd.md
  02-seo-research.md
  03-bridge-content-audit.md
  04-script-v1.md
  05-critique-retention.md
  06-critique-craft.md
  07-script-v2.md
  08-audio-generation.md
  09-audio-compression.md
  10-transcription.md
  11-peak-sync-audit.md
  12-remotion-composition.md
  13-render-mp4.md
  14-thumbnail.md
  15-upload-metadata.md
```

## SOP contract — every SOP must have

- **Purpose** — what this artifact is and why it exists
- **Inputs** — what must be in place before starting
- **Outputs** — concrete files / artifacts produced (with paths)
- **Tools** — commands, scripts, MCP servers, env vars
- **Steps** — numbered procedure
- **Quality bar** — acceptance criteria for "done"
- **Common pitfalls** — gotchas surfaced from real production
- **Estimated time** — wall-clock from clean start

## Glossary

- **Bridge** — The site article at `/<slug>` that the video supports. Always exists at `content/bridges/<slug>.md`.
- **Atom** — Validated primitive at `content/atoms/<slug>.md`. Bridges reference atoms.
- **Path** — Curated journey at `content/paths/<slug>.md`. References threads.
- **Peak** — A discrete visual moment in the video, ~30-80s long, anchored to a script anchor phrase.
- **Sub-beat** — A within-peak visual change anchored to a specific spoken word/phrase. Cadence target: ≤8s.
- **Anchor phrase** — A unique 2-4 word phrase from the script used to find an exact timestamp in the Scribe transcription.
- **TTS** — Text-to-speech. We use ElevenLabs Pro `eleven_v3` model with [emote] tags.
- **Scribe** — ElevenLabs speech-to-text API used for word-level timestamp extraction.

## Cross-cutting principles

These show up in multiple SOPs. Stating once here:

- **Single voice, single visual style** — channel is "The Physics of Connection". Playfair Display Black headlines, Inter body, slate gradient background, accent palette (red `#ef4444`, orange `#f97316`, green `#22c55e`).
- **Citations beat opinions** — every claim that can be cited should be (named teacher, year, study). This drives both YouTube authority and AI-citation pickup.
- **Beat-driven over hold-static** — for any peak >30s, internal animations must be anchored to actual word timings, not estimated frame offsets.
- **One question per video** — title states it, video resolves it. No multi-thesis bundles.
- **No filler in the script** — every line earns the next. Cut throat-clearing.
