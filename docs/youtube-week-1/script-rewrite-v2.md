# Script Rewrite v2 — Engagement-Optimized

**Files (originals preserved alongside; v2 is the new master):**
- `content/scripts/youtube/01-how-to-stop-overthinking-tts-v2.txt`
- `content/scripts/youtube/02-team-building-activities-tts-v2.txt`
- `content/scripts/youtube/03-rules-of-improv-tts-v2.txt`

The originals stay (they generated the existing audio at `public/audio/youtube/*.mp3`). When you re-record from v2, regenerate the audio files via ElevenLabs.

## Cross-cutting changes (all 3 scripts)

| Engagement rule | Before | After |
|---|---|---|
| **#1 Hook in 3 seconds** | Slow narrative open ("you know that thing where...") | Specific claim or stake first sentence |
| **#2 Show payoff before earning it** | Insight delivered around 30s | Mechanism stated in first 15s |
| **#5 Stakes in 15s** | Implicit | Explicit ("by Monday, your team is exactly as disconnected") |
| **#14 Open loops** | None | Each script promises a payoff up front, resolves later |
| **#17 CTA after value** | URL bar at line 7 (~30s in) | URL only after exercises/insights delivered |
| **#18 Specificity** | "decades ago", "many" | "sixty years ago", "five named types", "thirty-five to forty minutes" |
| **#19 End on callback** | Generic outro | Callback to opening claim |
| **#29 One question** | Multiple sub-theses | Each script answers one question explicitly |

## Script-by-script changes

### L1 · How to Stop Overthinking

**Hook before:** "You know that thing where someone asks you a simple question, and instead of answering, your brain launches a full simulation?"

**Hook after:** "You can stop overthinking in less than half a second. I'll show you the exact mechanism."

- **Open loop added:** "improv performers solved it sixty years ago"
- **Mid-point reveal preserved:** "your first idea is almost always better than your third"
- **CTA moved:** URL bar was at line 7 (after "But let me walk you through..."). Now at line 32 (after all 3 exercises delivered).
- **Specificity added:** "sixty years", "0.4 seconds" implicit ("less than half a second"), "seven-step protocol", "four more exercises"
- **Callback added:** Opens with "stop overthinking in less than half a second" → ends with "next conversation will tell you if it worked"
- **SEO:** "stop overthinking" appears 3x, "how to stop overthinking" 1x in CTA — natural density
- **Length:** ~570 words, ~3:40 audio (matches original)

### L23 · Team Bonding Activities

**Hook before:** "Here's what usually happens. Someone decides the team needs bonding."

**Hook after:** "Most team building activities don't change anything. Your team has a fine afternoon, comes back Monday, and is exactly as disconnected as before. Here are the four exercises that actually work — and why every other one fails."

- **Stakes upfront:** "exactly as disconnected as before"
- **Open loop added:** "four exercises that actually work — and why every other one fails"
- **Pattern interrupts** at each of the 4 exercise transitions (natural rhythm preserved)
- **Two integration rules added before close** (debrief + return) — was buried; now explicit
- **CTA moved:** URL was at line 7 (~40s in). Now at end after all 4 exercises + integration rules.
- **Specificity added:** "Most team building activities don't change anything" (claim), "thirty-five to forty minutes total", "ten-minute exercise"
- **Callback added:** Opens with "Most team building activities don't change anything" → ends with "Try Mirroring at your next meeting. Five minutes. Watch what changes."
- **SEO:** "team building activities" 2x, "team bonding" 1x — keyword density target hit
- **Length:** ~890 words, ~6:35 audio (slightly tighter than original 7:00 — better pacing)

### L31 · The Rules of Improv

**Hook before:** "Search 'rules of improv' and you'll find the same list everywhere."

**Hook after:** "You searched 'rules of improv.' You got the same five rules everywhere. [...] About half of these are misleading. Some are flat-out wrong. And every single one is trying to point at the same thing — which I'll show you in seven minutes."

- **Stakes upfront:** "half of these are misleading. Some are flat-out wrong."
- **Open loop added:** "every single one is trying to point at the same thing — which I'll show you in seven minutes"
- **Reveal preserved at end:** "Get out of your head and into the scene."
- **Specificity added:** "five named types" of blocking (was unnumbered list), all 5 traditions named, time-promise "seven minutes"
- **Quote attribution explicit:** "Keith Johnstone — quote — 'be changed by what happens'", "Del Close put it precisely — quote — 'fall, then figure out what to do on the way down.'"
- **CTA moved:** URL was at line 9 (~50s in). Now at line 89 (after the final reveal).
- **Callback added:** Opens with "five rules everywhere" → ends with "Five rules. One principle. Get out of your head. The rest is practice."
- **SEO:** "rules of improv" appears 3x — natural
- **Length:** ~960 words, ~7:25 audio (matches original)

## What did NOT change

- All exercise instructions are intact (mechanics preserved word-for-word where possible)
- TTS emote tags preserved ([emphatic], [contemplative], [warm], [teaching], [short pause], [curious])
- Source attributions preserved (Johnstone, Close, Napier, Cal Newport, Amy Edmondson, Spolin, UCB, Annoyance)
- Substantive content — bandwidth theory, vulnerability theory, blocking taxonomy — all preserved
- Voice (single-voice TTS) preserved

## Re-recording plan

When you're ready to re-cut audio:

1. ElevenLabs v3 with the same voice profile used for the originals
2. Settings same as before (default model, default voice settings) — emote tags drive the variation
3. Output: `public/audio/youtube/01-how-to-stop-overthinking.mp3` (overwrite)
4. Repeat for 02, 03
5. Update Remotion `videos/public/audio/` copies if you regenerate

## Thumbnail re-design hooks

Now that the scripts have stronger hooks, the thumbnails should match. Suggested thumbnail concepts to chase:

- **L1:** "0.4 sec" timer or stopwatch + "STOP OVERTHINKING" — clickable specificity
- **L23:** "Why Most Team Building Fails" with red X over generic activity icons — provocative
- **L31:** "Half of these are wrong" with the 5 rules + strikethroughs — counterintuitive

Ready when you are to do the thumbnail spec round across all 3.
