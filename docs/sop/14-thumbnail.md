# SOP 14 · Thumbnail

## Purpose

Build a 1280×720 thumbnail in Figma matching the channel design system. Thumbnail CTR is the #1 driver of video views; this is not the place to skimp.

## Inputs

- Final video title (from SOP 15 metadata)
- Channel design system (Figma file with shared styles)
- 2-3 word "thumbnail hook" — usually a noun phrase that pairs with the title to complete a thought

## Outputs

`docs/youtube-week-N/thumbnails/<NN>-<slug>.png` — 1280×720 PNG, sRGB, < 2 MB (YouTube's hard cap).

## Tools

- Figma (via the Figma MCP server in this session — see `figma.com/mcp`)
- Channel design Figma file (shared)

## Channel design system

- **Background:** slate gradient `#0f172a → #1e293b → #334155` (top-left to bottom-right)
- **Headline font:** Playfair Display Black, 96-140px, white #ffffff
- **Kicker font:** Inter Black, 32-44px, accent color (red/orange/green)
- **Watermark:** "PHYSICS OF CONNECTION" in Inter Bold 24px, bottom-left, white 70% opacity
- **Accent palette:** red `#ef4444` (problem), orange `#f97316` (tension), green `#22c55e` (resolution)
- **Layout:** headline takes 60% width, anchored top-left; supporting visual (illustration, number, contrast) on the right 40%

## Steps

1. **Decide the thumbnail hook.** Look at the title; the thumbnail should NOT repeat the title verbatim. It should add something. Examples:
   - Title: "How to Stop Overthinking" → Thumbnail: "60 SECONDS"
   - Title: "Rules of Improv" → Thumbnail: "TRAINING WHEELS"
   - Title: "Team Building Activities That Actually Work" → Thumbnail: "STOP WASTING $500/HR"
2. **Open the channel Figma file.** Use the most recent thumbnail as a template — duplicate the frame.
3. **Update headline copy.** Keep headline to ≤ 4 words, ≤ 22 chars. Mobile-first: thumbnail is often viewed at 320×180 px.
4. **Pick accent color** based on emotional arc of the video. Problem-frame videos use red; outcome-frame videos use green; transition/method videos use orange.
5. **Add the supporting visual.** Numbers ("60s", "$500/hr"), simple icons (a brain with arrows, two figures), or a contrast pair (left vs. right). NEVER use stock photos.
6. **Verify mobile readability.** Zoom Figma to 25%. If the headline is unreadable, make it bigger.
7. **Export at 1280×720 PNG.** File size should be < 2 MB. If over, reduce gradient stops or simplify the supporting visual.
8. **Save to `docs/youtube-week-N/thumbnails/<NN>-<slug>.png`** and commit.

## Quality bar

- 1280×720 PNG, < 2 MB
- Headline ≤ 4 words, readable at 320×180 (mobile)
- Channel typography (Playfair + Inter)
- Channel palette (slate gradient + 1 accent)
- Watermark in bottom-left
- Thumbnail copy ≠ video title (adds info, doesn't repeat)
- Supporting visual is a number, contrast pair, or simple custom illustration — NOT stock photo

## Common pitfalls

- **Thumbnail repeats the title.** Wasted real estate. Use thumbnail to tease the *cost* or *promise* the title doesn't say.
- **Too many words.** Five words is the absolute max. Three is better. Mobile thumbnails are tiny.
- **Stock photo of generic businesspeople.** Channel hasn't used these once and shouldn't start.
- **Low contrast headline.** White on slate gradient works because the gradient is dark. Don't put light gray on light gray.
- **Forgetting to update the date / video number.** No big deal for thumbnails (they don't show date), but the file naming convention `<NN>-<slug>.png` matters for the upload-metadata cross-reference.

## Estimated time

20-40 minutes per thumbnail.

## Lessons from prior production

- L1 thumbnail: "60 SECONDS" with a stopwatch icon, red accent. CTR-tested well in Studio preview.
- L23 thumbnail: "$500/HR WASTED" red accent — the problem-frame.
- L31 thumbnail: "TRAINING WHEELS" with a bicycle silhouette, orange accent. Connects to the script's framing of rules as removable scaffolding.
- L2 thumbnail: "STOP TRYING" green accent — paradoxical promise that pairs with title "How to Be Funny."
- The Playfair Display Black serif at 120px+ is the channel's visual signature. Don't switch to sans-serif headlines — it dilutes recognizability.
- Watermark visibility matters less than you'd think; viewers don't need it to recognize the channel by thumbnail #4. But it's free and consistent so keep it.
- The 25% Figma zoom test is the single best mobile-readability check. If you can't read the headline at 25%, you can't read it on a phone.
