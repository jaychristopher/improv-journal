# Reference · Channel Voice

The voice of "The Physics of Connection" — extracted from L1, L2, L23, L31 scripts and what consistently scored well in retention critiques. This is the canonical voice reference for SOPs 04, 06, 07, 15.

## Stance

**A practitioner translating physics-of-connection for working adults.** Not a guru, not a professor, not a hype-coach. Smart friend who's done the reps and read the literature, sharing what's actually load-bearing.

## Five voice attributes

### 1. Conversational warmth

- **Yes:** "Here's what I do." "You've felt this." "Try it tonight."
- **No:** "One must consider..." "It is recommended..."
- Use second-person "you" by default. First-person "I" sparingly, for confessional moments.
- Contractions always. "It's" not "it is", "you'll" not "you will."

### 2. Specificity over generality

- **Yes:** "Keith Johnstone, *Impro* (1979), p. 32." "Six-week study at Northwestern, 47 participants."
- **No:** "Many improv teachers say..." "Studies show..."
- Citations carry their year. The year is what makes it sound rigorous instead of vague.
- Numbers when you have them. "60 seconds" beats "a moment."

### 3. No hype, no filler

- **Forbidden words:** amazing, incredible, you won't believe, secret, shocking, mind-blowing, game-changer, hack, ultimate
- **Forbidden openings:** "If you've ever..." "Have you ever..." "Let me tell you..." "In this video..."
- If a claim is weak, don't decorate it — make it more specific or cut it.

### 4. Confessional softening

- Authority alone reads cold. Pair confident claims with quiet self-disclosure.
- **Yes:** "I used to chase laughs in workshops. Took me years to notice nothing was actually landing."
- **No:** "Many beginners make the mistake of chasing laughs." (impersonal lecture mode)
- Vulnerability is structural — usually one beat per video, in the first third.

### 5. Earned sentiment

- Emotion lands when it follows a concrete observation, not when it's announced.
- **Yes:** "She didn't move. The scene held. That's when I understood." (sentiment lives inside the moment)
- **No:** "It was beautiful." (announced sentiment, no specifics)

## Sentence rhythm

- Short. Then medium. Then long. Then short again.
- Hook = ≤8 spoken words. Payoff line = ≤12. Mid-paragraph = up to 18.
- Read aloud. If you breathe between two clauses naturally, that's a sentence break.
- One-word sentences are powerful but rationed — max 3-5 per video.

## Vocabulary

- **Use:** notice, hold, offer, accept, fail, return, scene, partner, audience, stage, breath, beat
- **Avoid:** synergize, pivot, leverage (verb form), unlock, optimize, leverage, deep dive
- Improv-native vocabulary (above) sounds expert; corporate vocabulary sounds outsourced.

## [Emote] tag patterns

For TTS scripts (SOPs 04, 07), [emote] tags shape audio cadence. The canonical tag set used in production (L1, L2, L23, L31) — these are what ElevenLabs `eleven_v3` interprets reliably:

| Tag | Use for |
|-----|---------|
| `[curious]` | Setup, asking a question, intriguing |
| `[contemplative]` | Reframes, "here's the thing" moments, isolated quotes |
| `[emphatic]` | Punch lines, claims, definitive statements |
| `[teaching]` | Exercise / step / how-to |
| `[warm]` | CTA, closing, reassurance |
| `[short pause]` | Section breaks (~0.4-0.6s of silence post-compression) |

Do NOT invent new tags (e.g. `[direct]`, `[soft]`, `[thoughtful pause]`) — ElevenLabs falls back to neutral on unknowns, defeating the purpose. Stick to the table above.

Don't stack `[emote]` tags. One per ~2-3 sentences max — too many makes the TTS overact.

Production frequencies (L2 v2 reference, n=1 well-tuned script):
- `[emphatic]` 13× · `[short pause]` 12× · `[teaching]` 10× · `[contemplative]` 7× · `[curious]` 4× · `[warm]` 3×

## Length and density

- 4-5 minutes spoken. ~600-720 words.
- One thesis. One question. One reveal at the midpoint.
- 3-5 cited sources, not 8+. Density of citation, not breadth.

## Lessons from prior production

- L2's voice originally drifted into self-help register ("you can finally be funny"). v2 cut all "finally" / "truly" / "really" — net 18 words, voice tightened materially.
- L23 had a confessional moment ("I ran a workshop where I forgot the rules and it went better") that tested as the most-quoted line in early comments. Confessional softening earns its keep.
- L31's hook "rules of improv aren't actually rules" works because it's a counter-claim, not a tease. A teasing version ("you won't believe what improv teachers don't tell you") would have dragged the channel toward clickbait.
- Across all 4 videos, NOT using a single hype word matched the academic source material's dignity. The bridge content protects against drift.
