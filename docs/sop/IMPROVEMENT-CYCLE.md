# SOP Improvement Cycle 1

Loop tracking for the 15 concerns flagged after the initial SOP set was committed. Each iteration: pick next `pending` concern, research, propose improvement, apply it, mark `completed`.

| # | Concern | Status | Improvement applied |
|---|---------|--------|---------------------|
| 1 | 15 SOPs may be wrong granularity (over/under-split) | completed | Added "Granularity rule" section to README defining the 1-artifact-per-SOP invariant + add/split/merge guidance |
| 2 | Quality bars are n=4 guesses | completed | Added "Quality-bar evolution policy" to README: v1 baselines, revisit at n=10, per-format calibration, one-bar-at-a-time changes |
| 3 | Missing SOPs (preflight, publishing/scheduling, post-publish, captions) | completed | Added SOP 00 (preflight), 16 (publishing), 17 (post-publish measurement), 18 (captions). Updated README pipeline + file layout |
| 4 | Path conventions inconsistent (`week-N` vs `week-1`) | completed | Added "Path conventions" section to README defining batch numbering, per-video vs per-batch files, and the placeholder→concrete rule |
| 5 | Cycle-critique meta-process is informal (no template) | completed | Created CRITIQUE-TEMPLATE.md (6 sections incl. pass/fail per SOP, concrete lessons, SOP updates, "should we still ship this"). README §3 now references it |
| 6 | SOP 05 ↔ 06 overlap (hook strength, pacing) | completed | Added explicit "Lens" + "This SOP is NOT" callouts at top of both 05 (algorithm-facing checklist) and 06 (audience-facing craft) to prevent drift |
| 7 | No tool-dependency preflight | completed | Resolved by concern #3 — SOP 00 (Preflight) checks API keys, quota, ffmpeg, Remotion deps, Figma MCP, gh CLI identity, disk space |
| 8 | Thumbnail A/B testing not addressed | completed | Added "A/B variants" section to SOP 14 with 4 variant axes (promise/cost, number/word, image/type-only, emotional valence). Updated outputs list to include B+C variants |
| 9 | Time estimates assume single-operator serial | completed | Added "Parallelization map" to README: hard-order chain, hands-off slots (08, 13), cross-video parallelism, sample 3-video flow, realistic batch budget (3-4 days vs 7 serial) |
| 10 | Backup/recovery story missing (rewind from QC failure) | completed | Added "Failure-recovery decision tree" to README: 19-row table mapping failure→rewind point + 4 heuristics (audio→source, visual→timing-decision, measurement→next cycle, don't-pull-published) |
| 11 | Bridge existence assumed (no "create if missing") | completed | Added "Pre-condition (hard gate)" section to SOP 03 making bridge-must-exist explicit. Two paths: write bridge first or pick different topic |
| 12 | 30 engagement rules reference is implicit | completed | Created REFERENCE-engagement-rules.md as canonical home (cross-references which SOPs use which rules). SOP 05 now links to it; in-line list deduped |
| 13 | Channel voice/tone not centralized | completed | Created REFERENCE-channel-voice.md: stance, 5 voice attributes (warmth, specificity, no-hype, confessional softening, earned sentiment), sentence rhythm, vocabulary do/don't, [emote] patterns |
| 14 | SOP-version policy missing (in-flight vs frozen) | completed | Added "SOP versioning" to README: default frozen-at-intake (pinned by git SHA in critique doc), backport escape hatch for critical fixes only, cycle-end commit pattern |
| 15 | Lessons sections will rot as n grows | completed | Added "Lessons curation policy" to README: 5-max in-SOP cap, archive overflow to lessons-archive/<SOP-id>.md, distill meta-patterns at n=10, what earns/doesn't earn a lesson |
