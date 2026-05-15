# Thumbnail Brief — Framing Effect (06)

**Output target:** `docs/youtube-week-4/thumbnails/06-framing-effect.png` (1280×720 PNG, <2 MB)
**Status:** Brief ready — actual Figma design pending operator step (cannot render PNG headlessly).

---

## Strategic context

**Title:** "The Framing Effect: 3 Moves Improv Has Trained for 60 Years"
**Pillar:** P2 Better Conversations
**SERP context:** Educational SERP (Wikipedia / Decision Lab / Simply Psychology dominate). Thumbnail competing for click against academic-flavored cards. Channel differentiator: improv-perspective skill framing, not bias-defense framing.
**Emotional arc:** transition / method (orange accent, NOT problem-red or resolution-green).

---

## Primary variant — "STOP ARGUING" (cost framing)

**Thumbnail hook:** `STOP ARGUING`
**Accent color:** red `#ef4444` (problem signal — cost of doing it wrong)
**Why this works:** Pairs with title's "framing better" via implicit contrast. The viewer reads the title's "3 Moves" and the thumbnail's "STOP ARGUING" as a complete promise: *stop doing X, here's the 3 moves for Y*.

**Layout spec:**
- **Background:** slate gradient `#0f172a → #1e293b → #334155`, top-left to bottom-right
- **Left 60% (headline):** "STOP" on line 1, "ARGUING" on line 2. Playfair Display Black, ~140px on line 1, ~140px on line 2. White `#ffffff`. Tight leading (0.95).
- **Right 40% (supporting visual):** large angled-bracket symbol `<` and `>` in red, suggesting two opposing frames. OR: stylized speech bubble with a "no entry" overlay. OR: simple text "FRAME ↻" with the arrow forming an angle pivot.
- **Kicker (bottom-left, above watermark):** "FRAME BETTER" in Inter Black 36px, orange `#f97316`. Reads as a continuation: *Stop Arguing → Frame Better*.
- **Watermark:** "PHYSICS OF CONNECTION" Inter Bold 24px, bottom-left, white 70% opacity.

---

## A/B variant B — "ANGLE > ARGUMENT" (counterintuitive)

**Thumbnail hook:** `ANGLE > ARGUMENT`
**Accent color:** orange `#f97316` (transition / method)
**Variant axis:** Promise vs. cost framing (B-side: this is what TO do, framed as inequality).

**Layout spec:**
- Same background gradient.
- **Centered headline:** Three lines — "ANGLE" (white 140px) / ">" (orange 200px, oversized math symbol) / "ARGUMENT" (white 92px, slate-300 color). The `>` is the visual focal point.
- **Right edge:** subtle "1981 · TVERSKY" in Inter Bold 22px, slate-400 — citation magnet.
- **Watermark:** same.

---

## A/B variant C — "3 MOVES" (number-led)

**Thumbnail hook:** `3 MOVES`
**Accent color:** green `#22c55e` (outcome — what you gain)
**Variant axis:** Number vs. word (C-side: lead with the count).

**Layout spec:**
- Same background.
- **Left 50%:** giant "3" in Playfair Display Black at ~340px, green. Stacked beneath: "MOVES" in Inter Black 76px, white. Stacked beneath: "60 YEARS" in Inter Bold 32px, slate-400.
- **Right 50%:** three small white circles in a vertical stack with kickers next to each:
  - "·  Frame first"
  - "·  Their words"
  - "·  Ask, don't assert"
  Inter Bold 28px, white. Small but legible at mobile 320×180.
- **Watermark:** same.

---

## Mobile readability test (per SOP 14 step 6)

Zoom Figma to 25% before exporting. Each variant should pass:

- Headline word(s) readable at 320×180 px
- Accent color visible against gradient (no contrast crush)
- Watermark recognizable (don't need to read every letter, just the channel shape)

**Highest-risk variant for readability:** C (3 MOVES) — the three small kickers on the right may compress to unreadable streaks. If so, drop them in C; lead with just "3 / MOVES / 60 YEARS" tall stack.

---

## Export checklist

For each variant:
1. Frame size: exactly 1280×720
2. Format: PNG (sRGB)
3. File size: < 2 MB (Figma export default usually meets this; if not, flatten the gradient)
4. Save to `docs/youtube-week-4/thumbnails/06-framing-effect.png` (primary), `-b.png`, `-c.png`
5. Verify zoom test at 25% before committing

---

## YouTube Studio test setup

After upload, in YouTube Studio → Video → Thumbnail Test:
- Primary: variant A ("STOP ARGUING")
- Test slot 1: variant B ("ANGLE > ARGUMENT")
- Test slot 2: variant C ("3 MOVES")

YouTube serves all three randomly and picks the winner by CTR after ~3-7 days. Don't manually swap based on early data — give it the full test window.

---

## Why three structurally-different variants

Per SOP 14 A/B guidance: cosmetically-different variants are noise (same hook with different colors learns nothing). The three above differ on **distinct axes**:

- A vs B: cost framing vs. counterintuitive framing
- A vs C: word-led vs. number-led
- B vs C: insight-led vs. value-led

Whichever wins tells the channel something durable about the audience's click psychology for P2 conversation-skills content — not just which color this thumbnail prefers.
