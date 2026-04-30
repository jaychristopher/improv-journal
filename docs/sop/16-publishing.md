# SOP 16 · Publishing & Scheduling

## Purpose

Get the rendered MP4 into YouTube Studio with all settings (privacy, scheduling, end screens, cards, monetization, audience) configured per channel standard.

## Inputs

- Rendered MP4 from SOP 13 at `videos/out/<VideoId>.mp4`
- Thumbnail PNG from SOP 14
- Upload metadata block from SOP 15 (title, description, chapters, tags, end-card config, pinned comment)
- The PRIOR video on the channel (for end-card linking)

## Outputs

- Video uploaded to YouTube, scheduled or published
- One-line note in `docs/youtube-week-N/published.md` with: video URL, publish timestamp, scheduled-or-live status

## Tools

YouTube Studio (browser), no CLI. Studio's draft-saved-on-upload behavior means partial uploads aren't lost.

## Steps

1. **Upload the MP4.** Studio → Create → Upload Videos → drag `videos/out/<VideoId>.mp4`. Wait for it to enter the "Details" stepper.
2. **Title.** Paste from upload-metadata.md. Confirm ≤ 70 chars.
3. **Description.** Paste from upload-metadata.md. Confirm chapter timestamps render as clickable (Studio shows a green "Chapters detected" banner if they parsed).
4. **Tags.** Open "Show more" → paste 12-15 tags separated by commas.
5. **Thumbnail.** Upload custom thumbnail PNG. Confirm preview looks readable in the small preview.
6. **Playlists.** Add to channel default playlist + topic-specific playlist if one exists.
7. **Audience.** "No, it's not made for kids." (Most adult-improv content; revisit if a video is genuinely family-oriented.)
8. **Tags + language.** Set video language to English. Set captions language to English.
9. **End screens.** "Add end screen" → use template "Subscribe + 1 video":
   - Subscribe element (top-right)
   - Video element: link to the channel's previous video (drives session time)
   - Last 20s of timeline
10. **Cards.** Add 1 card around the midpoint linking to the bridge URL. Use "Link" card type with the bridge slug.
11. **Visibility.**
   - **Schedule** for next Tuesday 10am local (channel default cadence) for week-N rollouts
   - **Publish now** for one-off catch-up uploads
12. **Confirm and publish/schedule.** Click "Schedule" or "Publish". Studio gives you the URL.
13. **Pinned comment.** After publish (not scheduled — wait until live), add the pinned comment from upload-metadata.md to the video and pin it.
14. **Log it.** Append to `docs/youtube-week-N/published.md`:
   ```
   - L31 https://youtube.com/watch?v=... · scheduled 2026-MM-DD 10:00 ET
   ```

## Quality bar

- Video uploaded, Studio shows "Processed" status
- Title, description, tags, thumbnail, chapters, end screens, cards, playlist, audience, language all set
- Scheduled time matches channel cadence (Tuesdays 10am local) OR explicitly publish-now if a one-off
- `published.md` updated
- Pinned comment posted (after publish, not before)

## Common pitfalls

- **Forgetting end screens.** Studio doesn't warn you. The end screen is the highest-leverage place to drive session time — never skip it.
- **Setting "made for kids" by accident.** This disables comments, end screens, and personalization. Easy to misclick; double-check.
- **Scheduling before reviewing the auto-detected chapters.** If the description's timestamps are slightly malformed, chapters won't appear. Confirm the green banner.
- **Pinned comment posted while video is scheduled.** Studio allows it but viewers won't see it until live. Wait until publish time, then pin.
- **Not adding the bridge link card.** The card is the in-video CTA; description CTA only catches a fraction.

## Estimated time

15-25 minutes per video.

## Lessons from prior production

- Channel cadence settled on Tuesdays 10am ET — pulled from the upload-metadata SOP's note that mid-week morning publishes outperformed weekend publishes for the first 4 videos.
- Custom thumbnails always took 5-10 min to propagate after upload; if Studio shows the auto-thumbnail in preview, refresh after a few minutes before re-uploading.
- The "Link" card type requires the URL to be in the channel's "Associated website" allowlist. Set physicsofconnection.com once in channel settings; cards work everywhere after.
- One time a scheduled video published 3 hours late because the timezone in Studio defaulted to UTC, not ET. Verify the timezone every schedule.
