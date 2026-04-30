# SOP 15 · Upload Metadata

## Purpose

Write the title, description, tags, chapter timestamps, and end-card config that go into YouTube Studio at upload time. This is what makes the video discoverable AND what drives sessions to the website.

## Inputs

- Final v2 script (SOP 07)
- Word timings JSON (SOP 10) — for chapter timestamps
- Bridge URL on physicsofconnection.com that the video maps to
- Channel description (boilerplate footer)

## Outputs

Per-video block in `docs/youtube-week-N/upload-metadata.md` containing:

- **Title** (≤ 70 chars)
- **Description** (~150-300 words, structured)
- **Chapter timestamps** (4-7 chapters)
- **Tags** (12-15)
- **End card** (linked video / playlist / subscribe button placement)
- **Pinned comment** (1-2 sentences with bridge URL)

## Steps

1. **Title.** Two formats work:
   - **Question:** "How to Stop Overthinking (in 60 Seconds)"
   - **How-to:** "Rules of Improv: The Truth Most Teachers Skip"
   
   Constraint: ≤ 70 chars (mobile truncation). Keyword in the first 50 chars. NO clickbait — promise must be deliverable.
2. **Description structure** (uses the same skeleton every video):
   ```
   <One-line hook (often the script's opening line)>
   
   <2-3 sentences expanding on what's in the video>
   
   📺 Chapters:
   0:00 Intro
   M:SS [chapter name]
   M:SS [chapter name]
   ...
   
   🔗 Read the full breakdown: <bridge URL>
   📚 Free improv exercise picker: physicsofconnection.com/practice/picker
   
   ─────────
   
   The Physics of Connection helps people apply improv principles to real-life
   communication, leadership, and connection. New videos every Tuesday.
   
   Subscribe: <channel URL>
   Site: physicsofconnection.com
   ```
3. **Chapter timestamps.** Each video gets 4-7 chapters. Use the peak boundaries from SOP 11 as rough starting points, then round to the nearest 5s. Format: `M:SS Chapter Name`. Always start with `0:00 Intro`. YouTube auto-detects chapters when at least 3 timestamps appear and first is `0:00`.
4. **Tags.** 12-15 mix:
   - 1-2 primary keywords (high volume, e.g. "how to stop overthinking")
   - 3-4 long-tail variants ("stop overthinking everything," "overthinking anxiety")
   - 3-4 related broader terms ("improv techniques," "communication skills")
   - 2-3 channel-cohesion tags ("physics of connection," "improv for life")
   Maxes out around 500 chars total.
5. **End card.** Last 20s of every video should have:
   - Subscribe button (top-right)
   - Linked video: the previous "best" video on the channel (drives session time)
   - Linked playlist: the relevant bridge category playlist
6. **Pinned comment.** First comment after upload, pinned. Format:
   ```
   📝 Full breakdown of [topic] with linked exercises:
   <bridge URL>
   
   What's the [thing]? Tell me below — I read every comment.
   ```
7. **Save the metadata block** to `docs/youtube-week-N/upload-metadata.md` (one file for the week, one section per video).

## Quality bar

- Title ≤ 70 chars, keyword in first 50
- Description has hook + chapters + bridge URL + channel boilerplate
- Chapter timestamps in M:SS format, first is `0:00`, total 4-7
- Tags 12-15, mixing primary/long-tail/related/cohesion
- End card config specified
- Pinned comment text ready to paste
- All cross-links (bridge URL, picker URL) are real and live (404-check before upload)

## Common pitfalls

- **Title clickbait that the video doesn't deliver.** "I found the SECRET to..." kills trust. Title should describe what the video actually is.
- **Description with no link to the site.** The video is a top-of-funnel asset; if the description doesn't have the bridge URL, traffic doesn't convert.
- **Chapter named "Hook" or "Intro" generically.** "0:00 The 3 questions you ask yourself" is much better than "0:00 Intro" beyond the first chapter.
- **Tags stuffed with irrelevant high-volume terms.** YouTube penalizes mismatch. Tag what the video is about, not what you wish it was about.
- **Forgetting to verify bridge URL.** If the bridge page returns 404, half the value of the video is lost. Always click the link in a fresh browser tab.
- **End-card pointing to a video that doesn't exist yet.** First video in the channel can only point to subscribe + playlist, not to a previous video.

## Estimated time

30-60 minutes per video including chapter timing extraction.

## Lessons from prior production

- L1 title iteration: "How to Stop Overthinking" → "How to Stop Overthinking (in 60 Seconds)" — adding the time promise lifted predicted CTR in title-tester.
- L23 title pivoted from "Team Building Exercises That Work" to "Team Building Activities That Actually Work" — "actually" implies the channel is calling out the bad ones, which differentiates.
- L31 description originally had no chapter timestamps; adding 5 chapters bumped predicted session time +18% (per the Studio analytics preview).
- Tags that worked across the batch: "improv games," "improv for adults," "communication skills," "team building exercises." These are channel-cohesion tags that stay constant.
- The pinned-comment with bridge URL drove ~12-15% of clicks-to-site in early YouTube data. Don't skip it.
- Bridge URL is the highest-leverage line in the description. Put it ABOVE the channel boilerplate, not below.
- Keep titles consistent in voice across the channel. All Week 1 titles are noun-phrases or imperatives, no questions. Mixing tones makes the channel feel inconsistent.

## Channel-level reference

Boilerplate footer (paste into every description):

```
─────────

The Physics of Connection helps people apply improv principles to real-life
communication, leadership, and connection. New videos every Tuesday.

🔔 Subscribe: https://youtube.com/@physicsofconnection
🌐 Site: https://physicsofconnection.com
📚 Free exercise picker: https://physicsofconnection.com/practice/picker
```

Channel keywords (set in YouTube Studio → Settings → Channel → Basic Info):
`improv, improvisation, communication skills, connection, leadership, social skills, team building, public speaking, active listening, vulnerability, presence, physics of connection`
