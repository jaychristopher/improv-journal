# Video Production SOPs — Index

End-to-end pipeline for producing one YouTube video. Each artifact has its own SOP, and each round produces all artifacts before turning in for critique.

## Pipeline

```
┌─ 00 Preflight               [setup gate]
│
├─ 01 Persona + JTBD          [pre-production]
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
├─ 15 Upload metadata         [ship stage]
├─ 16 Publishing & scheduling [ship stage]
├─ 17 Post-publish measurement[ship stage]
│
└─ 18 Captions                [accessibility]
```

## When to use this

Every new video. Run the pipeline top to bottom. Each artifact is reviewable before moving to the next.

## Cycle critique (this is the meta-process)

1. **Produce** — Run the full pipeline for one video, emitting every artifact per its SOP.
2. **Turn in** — Stop. Don't start the next video.
3. **Critique** — Use [`CRITIQUE-TEMPLATE.md`](./CRITIQUE-TEMPLATE.md). Copy to `docs/youtube-week-N/critique.md` and fill it in. Every section.
4. **Refine SOPs** — Apply the SOP updates from the critique's section 3. Commit them as a single "Cycle N → cycle N+1 refinements" commit BEFORE starting the next cycle.
5. **Next cycle** — Use the refined SOPs for the next batch.

The point isn't perfect SOPs on day one. It's that the SOPs improve with every video.

## File layout

```
docs/sop/
  README.md                                  ← this file
  00-preflight.md
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
  16-publishing.md
  17-post-publish-measurement.md
  18-captions.md
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

## Granularity rule — when to add, split, or merge

The invariant is **one SOP per artifact**, where an "artifact" is something with all three of:

1. Its own concrete output file/object (a script, an mp3, an mp4, a metadata block)
2. Its own QC bar (you can decide "is this done well" without doing the next step)
3. Its own tooling (different command, script, MCP server, or skill)

Use this when deciding to add or restructure SOPs:

- **Add a new SOP** when you find yourself doing the same un-documented work in 2+ cycles. If a step has its own quality bar AND tooling AND output, it's already a hidden SOP — surface it.
- **Don't split** when sub-steps share output, tools, AND QC. Splitting one artifact (e.g., script v1 into hook/body/CTA) creates fake dependencies — the script is one file with one rubric.
- **Merge** when two SOPs have overlapping QC bars and the order between them is fungible. A clean lens-split (algorithm-facing vs audience-facing, machine-facing vs human-facing) is fine; a fuzzy split is technical debt.
- **Stage chunking** in the pipeline diagram is the cognitive-load tool — 15 SOPs in 4 stages is easier to hold than 15 flat. Keep stages to 3-5 SOPs each.

## Quality-bar evolution policy

Every quality bar in this set was derived from n=4 (L1, L2, L23, L31). Treat them as **v1 baselines**, not laws.

- **Disclaimer applies to all numeric thresholds** in any SOP (word counts, peak counts, audio shrink %, render times, file sizes). They are calibrated for ~4-5 minute "principle + exercises" videos and may not generalize.
- **Revisit at n=10.** After 10 published videos, audit each Quality bar against the actual production data. Tighten where ranges are wider than reality; loosen where reality drifts.
- **Per-format calibration.** When introducing a new video format (long-form > 8 min, shorts < 60s, multi-voice), add a per-format bar block to the relevant SOP rather than overwriting the existing one.
- **One number changes at a time.** When a bar moves, update the SOP, log the change in the SOP's Lessons section with the video that triggered the update, and note before/after.
- **Don't game the bar.** If a bar fails, the bar may be wrong, OR the artifact may be wrong. Investigate before "adjusting" — moving a bar to fit a bad artifact poisons the next 10 cycles.

## Path conventions

All cycle artifacts live under `docs/youtube-week-N/` where `N` is the **batch number** (sequential, starting from 1). A batch is one publishing cohort — typically 1-4 videos shipped in the same calendar week. Batches are not calendar-locked; if a cycle slips, the batch number stays the same and the publish dates shift.

Inside a batch folder, files split into per-video and per-batch:

```
docs/youtube-week-1/
  L1-timings.json           ← per-video (Scribe output)
  L23-timings.json          ← per-video
  L31-timings.json          ← per-video
  l1.srt                    ← per-video (captions)
  measurement-L1.md         ← per-video (24h/7d/30d)
  peak-sync-audit.json      ← per-batch (audit script writes one file)
  upload-metadata.md        ← per-batch (one section per video)
  published.md              ← per-batch (publish log)
  thumbnails/               ← per-batch
    01-how-to-stop-overthinking.png
    02-team-building-activities.png
```

Rules:
- **Per-video files** are named `<VideoId>-<artifact>.<ext>` or `<NN>-<slug>.<ext>` (matching the audio-file convention).
- **Per-batch files** have a fixed name across batches (`peak-sync-audit.json`, `upload-metadata.md`).
- **Placeholder convention in SOPs:** instructions use `docs/youtube-week-N/`. Lessons sections use concrete refs (`docs/youtube-week-1/L31-timings.json`) when describing real prior production.
- **Migration trigger:** when batches pass ~10, revisit. May flatten to `docs/youtube/<NN>-<slug>/` per-video folders if batch grouping stops being useful.

## Glossary

- **Bridge** — The site article at `/<slug>` that the video supports. Always exists at `content/bridges/<slug>.md`.
- **Atom** — Validated primitive at `content/atoms/<slug>.md`. Bridges reference atoms.
- **Path** — Curated journey at `content/paths/<slug>.md`. References threads.
- **Peak** — A discrete visual moment in the video, ~30-80s long, anchored to a script anchor phrase.
- **Sub-beat** — A within-peak visual change anchored to a specific spoken word/phrase. Cadence target: ≤8s.
- **Anchor phrase** — A unique 2-4 word phrase from the script used to find an exact timestamp in the Scribe transcription.
- **TTS** — Text-to-speech. We use ElevenLabs Pro `eleven_v3` model with [emote] tags.
- **Scribe** — ElevenLabs speech-to-text API used for word-level timestamp extraction.

## Parallelization map

Per-SOP time estimates assume serial single-operator. In practice many SOPs run in parallel — within a video AND across videos in the same batch.

**Hard order within a video** (must be sequential):

```
00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 16 → 17
                                                                     └→ 18 (after 13)
```

**Hands-off slots** (kick off, do something else):

- **08 Audio generation** (~5 min API time after dry-run)
- **13 Render MP4** (10-25 min)

**Cross-video parallelism within a batch** (can run on different videos simultaneously):

- 14 Thumbnail for video B can run during 13 Render of video A
- 15 Upload metadata for video B can be drafted during 09 Audio compression of video A
- 17 Post-publish measurement is naturally batched at 24h/7d/30d windows across all videos

**Sample 3-video batch flow** (sequential within video, overlapping across):

```
Video A:  04→05→06→07 →[08]→09→10→11→12→[13]→14→15→16→17→18
Video B:           04→05→06→07 →[08]→09→10→11→12→[13]→14→15→16→17→18
Video C:                    04→05→06→07 →[08]→09→10→11→12→[13]→14→15→16→17→18
```

The brackets `[ ]` mark hands-off slots — the operator hops to the next video's hands-on work during them.

**Realistic batch budget:** 3 videos in 3-4 working days using overlap, vs. ~7 days fully serial.

## Failure-recovery decision tree

When a Quality bar fails, rewind to the SOP that produced the bad input — not always the SOP where the failure was caught. Common patterns:

| Failure caught at | Symptom | Rewind to | Why |
|-------------------|---------|-----------|-----|
| 08 dry-run | Quota error | 00 Preflight | Should have caught at preflight |
| 08 audio | Wrong tone / [emote] not interpreted | 07 Script v2 | TTS reflects script; check emote tag placement |
| 09 compressed audio | Audio still has long silences | 09 (re-tune ffmpeg params) | Threshold/duration tuning; don't re-render TTS |
| 09 compressed audio | RMS volume drops < -30 dB anywhere | 09 (lower stop_threshold) | Same — params, not source |
| 10 transcription | Wrong word count / cut-off audio | 09 (audio not actually compressed) | Verify file replaced before re-transcribing |
| 11 peak audit | "Anchor not found" | 11 (fix anchor) | Script vs transcription diff; pick different phrase |
| 11 peak audit | Total peak duration ≠ audio length | 11 (re-derive peaks) | Peak boundaries wrong; audit math, not audio |
| 12 Remotion preview | Audio plays but no visuals | 12 (composition not registered or wrong duration) | Root.tsx fix |
| 12 Remotion preview | Visuals out of sync with audio (>1s drift) | 12 (re-anchor sub-beats to timings JSON) | Always anchor to Scribe, never guess |
| 12 Remotion preview | Silent | sync audio into `videos/public/audio/` | File path issue, not source |
| 13 render | Silent MP4 | 12 / videos/public/audio sync | Same as above |
| 13 render | Black frames at end | Root.tsx (durationInFrames longer than audio) | Trim duration to match audio length |
| 13 render | Cuts off before end | Root.tsx (durationInFrames shorter than audio) | Extend duration |
| 14 thumbnail | Unreadable at 25% Figma zoom | 14 (resize headline) | Don't ship; mobile-readability is hard requirement |
| 15 metadata | Title > 70 chars | 15 (rewrite) | No upstream issue |
| 16 publish | Chapters not auto-detected | 15 (timestamp format) | Description must use M:SS format with first at 0:00 |
| 17 measurement | CTR < 3% at 24h | 14 thumbnail (next cycle) | Don't pull live video; update SOP 14 lessons |
| 17 measurement | Retention cliff at specific peak | 12 composition (next cycle) | Update SOP 12 lessons; consider re-render if cliff is severe |
| 18 captions | Cues > 8s | 18 (chunk by punctuation) | Script-side issue; long sentences cause long cues |

**Heuristics:**

- **Audio failures rewind to the source.** Script wrong → 07. TTS interpretation wrong → 07. Compression wrong → 09 params.
- **Visual failures rewind to where the timing was decided.** Sync drift → 12 (anchor to timings). Duration mismatch → Root.tsx.
- **Measurement failures don't rewind the video.** Update the relevant SOP's Lessons; apply next cycle.
- **Don't pull a published video** unless it's factually wrong, not "could be better." Pulling kills algorithmic momentum.

## Lessons curation policy

Each SOP has a "Lessons from prior production" section. Without curation, this becomes unreadable noise as the channel grows.

**In-SOP cap: 5 lessons max.** Keep only the most load-bearing observations — ones that have shaped the SOP itself or surfaced ≥2 times across videos.

**Archive overflow.** When adding a 6th lesson, demote the least-useful existing one to `docs/sop/lessons-archive/<SOP-id>.md`:

```
docs/sop/lessons-archive/
  09-audio-compression.md     ← all retired lessons for SOP 09
  12-remotion-composition.md  ← all retired lessons for SOP 12
```

Archive entries keep their original wording + a one-line "retired at cycle N because <reason>" footer.

**Distill at n=10.** After 10 cycles, audit each SOP's Lessons section against the archive. Look for meta-patterns: "we keep relearning X" suggests a step or quality bar should change, not just a new lesson. Promote meta-patterns into Steps or Quality bars; demote individual incidents to archive.

**What earns a lesson:**

- **Citable data point** — "L23: 850 words, 406s, WPM 125" (gives future estimates a reference)
- **Surprise gotcha** — "L31 Peak 6 anchor failed because audio inserted 4 words" (saves future debugging)
- **Confirmed pattern across ≥2 videos** — "Question-mark punctuation = ElevenLabs inserts 1-2s silence"

**What does NOT earn a lesson:**

- One-off mistakes already addressed in Steps
- Generic advice that isn't grounded in a specific video
- Restating what's in the Quality bar

## SOP versioning

**Default: frozen at intake.** When a cycle starts (SOP 01 begins), the version of `docs/sop/` at that moment is the version the cycle uses. SOP changes committed mid-cycle do NOT apply to in-flight videos.

Why: cycles are 3-7 days. SOP changes during a cycle introduce mid-flight surprises ("the script SOP I followed yesterday now scores my v1 differently"). Frozen-at-intake gives the operator a stable contract for the cycle.

**Pin the cycle's SOP version.** At the start of the critique file (`docs/youtube-week-N/critique.md`), record the git SHA of `main` at the time SOP 01 began:

```
SOP version pinned at: <SHA>
```

If a cycle re-runs an early SOP (e.g., reopens script v1 because of bridge update), use the original pinned SHA, not latest.

**Backport escape hatch.** If a critical fix lands in an SOP mid-cycle (audio-corrupting bug, security issue, broken tooling), it can be applied to the in-flight cycle. Required:

1. Justify the backport in the critique doc (one sentence)
2. Note which step is being re-run with the new SOP version
3. Treat as a normal SOP step from there forward

Stylistic improvements, additional pitfalls, lesson updates are NOT backports — those wait for the next cycle.

**Cycle-end commit pattern:** at the end of a cycle, commit refinements as a single `Cycle N → cycle N+1 refinements` commit. This becomes the next cycle's intake SHA.

## Cross-cutting principles

These show up in multiple SOPs. Stating once here:

- **Single voice, single visual style** — channel is "The Physics of Connection". Playfair Display Black headlines, Inter body, slate gradient background, accent palette (red `#ef4444`, orange `#f97316`, green `#22c55e`).
- **Citations beat opinions** — every claim that can be cited should be (named teacher, year, study). This drives both YouTube authority and AI-citation pickup.
- **Beat-driven over hold-static** — for any peak >30s, internal animations must be anchored to actual word timings, not estimated frame offsets.
- **One question per video** — title states it, video resolves it. No multi-thesis bundles.
- **No filler in the script** — every line earns the next. Cut throat-clearing.
