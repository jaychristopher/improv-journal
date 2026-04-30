# SOP 04 · Script v1 (Draft)

## Purpose

Produce a complete, TTS-ready first draft of the video script with a 3-act structure, citation magnets, and SEO weave. v1 is a draft — it WILL get critiqued and rewritten. The point is to land all the substance so v2 can be a tightening pass, not an invention pass.

## Inputs

- Persona + JTBD (SOP 01)
- White-space angle + 3 anchor insights (SOP 01)
- SEO targets (SOP 02)
- Bridge content + citation list (SOP 03)

## Outputs

`content/scripts/youtube/<NN>-<slug>-tts-v1.txt`

NN is the channel-order number (01 = L1, 02 = L23, 03 = L31, 04 = L2, 05 = L4, etc).

## Tools

- Write tool only. No external API.

## Format

TTS-ready with `[emote]` tags interpreted by ElevenLabs `eleven_v3`:

| Tag | Use for |
|-----|---------|
| `[curious]` | Setup, asking a question, intriguing |
| `[contemplative]` | Reframes, "here's the thing" moments |
| `[emphatic]` | Punch lines, claims, definitive statements |
| `[teaching]` | Exercise / step / how-to |
| `[warm]` | CTA, closing, reassurance |
| `[short pause]` | Section breaks (~1s of silence) |

## Steps

1. **Outline 3 acts.**
   - **Act 1 (~25-45s):** Hook in 3 seconds + stakes in 15s + open loop teasing payoff
   - **Act 2 (~3 min):** Mechanism / theory + 2-4 specific moves with worked examples + midpoint reveal (the most quotable insight)
   - **Act 3 (~45-60s):** Antipattern (optional) + recap + CTA + callback to opening
2. **Write the hook in 3 seconds.** First sentence states the counterintuitive payoff. Cut filler ("If you want to be funny..." → "Stop trying.").
3. **Add explicit stakes within 15 seconds.** Name what's lost if the viewer keeps doing the wrong thing.
4. **Set up the open loop.** Promise specific thing(s) by minute X ("3 moves and 1 anti-move in 4 minutes"). Specific time frame increases retention.
5. **Build the mechanism / theory beat.** This is where named-teacher citations land — same playbook every time:
   - "In <year>, <named teacher> at <institution> showed that..."
   - or "<Named teacher> documented this paradox: '<quote>.'"
6. **Build 2-4 moves.** Each is a "<verb> over <antipattern>" framing (Honesty over jokes / Specificity over exaggeration / etc.). Each needs a concrete worked example.
7. **Place the midpoint reveal.** The most quotable line lands at ~50% of the audio. Surround it with `[short pause]` tags so the audio gives it weight.
8. **Land the antipattern.** If the script has space, name what KILLS the practice — the meta-mistake. Provides a foil.
9. **CTA after value, not before.** Bridge URL only AFTER all the substance is delivered. Pre-rolling the URL kills retention.
10. **Callback at end.** Last sentence echoes the opening hook (e.g. L2: "Stop trying. Start noticing.").
11. **SEO weave.** Use the primary keyword 2-4× in the script (naturally — usually in CTA or recap, not in opening line).
12. **Specificity check.** Run through and replace vague words with specific ones:
    - "many people" → "85%"
    - "decades ago" → "60 years ago"
    - "some scientist" → "Charles Limb in 2008"
    - "a study" → "an fMRI study"
13. **Word count target:** 600-720 spoken words for 4-5 min audio. Strip [emote] tags when counting.

## Quality bar

- Hook in 3 seconds (≤ 8 spoken words)
- Stakes explicit by 15s
- Open loop set in first 30s
- Midpoint reveal isolated with [short pause] flanking
- 3+ named teachers / scientists with years
- 2+ direct quotes (use serif italic in visual stage)
- 3+ concrete worked examples (specific, not abstract)
- 1 callback to opening at end
- CTA only at end
- Primary keyword 2-4× naturally
- 600-720 spoken words

## Common pitfalls

- **Throat-clearing first sentence.** "If you want to be funny, stop trying to be funny" is 9 words. "Stop trying to be funny" is 5 and the same hook.
- **Running CTA early.** Tempting to drop the URL after the diagnosis ("here's the bridge for the deep dive"). Don't. Stack value first. Move it to the end.
- **Generic midpoint.** Midpoint should be the most quotable, citation-magnet line. If you can't tell which line is the midpoint, it's not punchy enough.
- **Forgetting the antipattern.** Without naming what kills the practice, the video feels like a list of dos. The anti-move makes the principles memorable.

## Estimated time

45-90 minutes. Most of the work is on the hook and midpoint — the rest writes itself once those are right.

## Lessons from prior production

- L2 v1 was 720 words / ~5:08 audio. Hook ("If you want to be funny, stop trying to be funny") was 9 words. v2 trimmed to 5 words. Hook strength up.
- L1 had the bandwidth diagram metaphor land in the first 30s — the rest of the script could reference it. Lock the central metaphor early.
- L31 used quote-isolation aggressively for Johnstone and Del Close — both became citation magnets in the SERP after upload (theoretical — actual upload pending).
