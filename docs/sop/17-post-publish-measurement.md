# SOP 17 · Post-Publish Measurement

## Purpose

Capture performance data at 24h / 7d / 30d so the next cycle's SOPs can be calibrated against reality, not assumed best practice.

## Inputs

- Published video URL (from SOP 16)
- YouTube Studio access
- The bridge page on physicsofconnection.com (for site-side traffic correlation)

## Outputs

`docs/youtube-week-N/measurement-<VideoId>.md` with three sections (24h, 7d, 30d), populated as the windows hit.

## Tools

- YouTube Studio Analytics
- Google Search Console (for site-side organic to bridge URL)
- Vercel/PostHog analytics (if available)

## Steps

### At 24 hours

1. Open YouTube Studio → Content → click video → Analytics → "Reach" tab.
2. Capture:
   - **Impressions** (raw count)
   - **CTR** (click-through rate) — channel benchmark is 4-8%; below 4 = thumbnail/title issue
   - **Views** (just the number)
   - **AVD** (average view duration) — channel benchmark is 50-65% of video length
   - **Subscribers gained**
3. **Retention curve.** Click "Retention" tab. Note any cliff-drops (>10% drop in any 5-second window). Log the timestamp(s) of cliffs.
4. **Top traffic sources.** Most likely: Browse / Search / External. Note the split.
5. Write the 24h section in `measurement-<VideoId>.md`.

### At 7 days

1. Re-open Analytics for same video.
2. Capture:
   - Impressions, CTR, Views, AVD, Subscribers (new totals)
   - **Search terms** (Studio → Analytics → Reach → "How viewers find this video" → Search). Note the top 5 queries — these are SEO confirmation.
   - **External traffic destinations** — clicks from description / cards / pinned comment. Compare to bridge URL's GSC impressions for same window.
3. Write the 7d section.

### At 30 days

1. Capture:
   - Final-ish numbers (impressions, CTR, Views, AVD, Subscribers)
   - **YouTube Search rank** for the primary keyword. Open YouTube in incognito, search the keyword, note the position.
   - **GSC organic** for the bridge URL — has it started ranking? If yes, what queries?
   - **Comments + sentiment** (count + read top 5)
2. Write the 30d section.

### After 30d

3. **Feed back into SOPs.** Read what the data says vs. what the SOPs predicted:
   - If CTR was below benchmark, the thumbnail SOP needs a lessons update
   - If retention dropped at a specific peak, the Remotion composition SOP gets a lesson about that pattern
   - If Search terms didn't include the target primary keyword, the SEO research SOP missed something
   - Update the relevant SOP's Lessons section with one bullet citing this video

## Quality bar

- All three windows (24h, 7d, 30d) captured before the cycle is "closed"
- At least one Lessons-update written into a downstream SOP
- The cycle critique (`docs/sop/IMPROVEMENT-CYCLE.md`-style file) references these numbers

## Common pitfalls

- **Skipping the 30d snapshot because the video stopped feeling new.** That window has the most reliable data — don't skip it.
- **Not screenshotting the retention curve.** The graph isn't downloadable; if you don't screenshot at 24h, you'll lose the early-watcher pattern when later watchers smooth it out.
- **Confusing watch-time with AVD.** Watch-time grows monotonically; AVD is the % of video the average viewer watched. AVD is the retention signal.
- **Reading absolute numbers without channel context.** 1000 views is great for video #2, mediocre for video #20. Always log alongside channel-state at publish time.

## Estimated time

10 min at 24h · 15 min at 7d · 20 min at 30d (including SOP feedback). Total ≈ 45 min spread over a month.

## Lessons from prior production

- L1 24h: 187 impressions, 6.4% CTR, 78 views, 3:12 AVD (74% of 4:18). Strong AVD but low impressions — channel was new (no algorithm priors). Retention had a cliff at 0:18 (peak transition). Updated SOP 12 lesson: Peak 1→2 transition needs an audio-anchored hold.
- L23 7d: 9 of top 10 search terms were variants of "team building activities" — primary keyword ranked. Bridge URL got 14 GSC impressions in same window. Confirms the SEO loop is working when the video and bridge are well-aligned.
- L31 30d: ranked #4 in YouTube Search for "rules of improv." Comments (n=23) clustered around "I've never heard the training-wheels framing before" — confirms the unique-angle hypothesis.
- The 24h CTR is more diagnostic than the 7d. Algorithm gives you a small impression boost early and watches CTR; if it's <3% at 24h, expect impressions to flatten.
