import { describe, expect, it } from "vitest";

import { getAudioManifestEntry, loadAudioManifest } from "../audio-manifest";
import { getEpisodesForShow, loadShows } from "../content";

/**
 * Every podcast enclosure must declare a real byte length.
 *
 * RSS <enclosure> carries three attributes and one of them is the size of the
 * file. All three feeds were emitting length="0" on every episode, because
 * getAudioFileSize reads the size out of public/audio/durations.json and the
 * generator that writes that file never recorded one — it already called
 * statSync to estimate duration and threw the size away. The fallback then
 * stat'd public/<key>, which cannot work for audio served from R2.
 *
 * It matters more than a cosmetic attribute. Podcast validators treat a zero
 * length as an error, Apple uses it to size the download before fetching, and
 * clients use it for progress and resume. These feeds exist to be submitted to
 * directories, and a directory listing is one of the few sources of off-site
 * reach this site has.
 *
 * The local files are the files on R2 — spot-checked byte for byte against
 * Content-Length — so recording the local size at generation time is accurate
 * and needs no network.
 */
describe("podcast enclosures", () => {
  it("declare a non-zero byte length for every episode", async () => {
    const shows = await loadShows();
    expect(shows.length).toBeGreaterThan(0);

    const zero: string[] = [];
    let checked = 0;

    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const episode of seasons.flatMap((s) => s.episodes)) {
        if (!episode.audioUrl) continue;
        checked++;
        // Deliberately the manifest, not getAudioFileSize. That helper falls back
        // to stat-ing public/<key>, and public/audio/**/*.mp3 is gitignored — the
        // files are upload staging that exists on one machine. So the fallback
        // succeeds locally and is absent on Vercel, which is precisely why the
        // live feeds said length="0" while a naive test passed. Production reads
        // the manifest and nothing else, so the manifest is what this asserts.
        const size = getAudioManifestEntry(episode.audioUrl)?.size ?? 0;
        if (size <= 0) {
          zero.push(`${show.frontmatter.id}: ${episode.audioUrl}`);
        }
      }
    }

    // A renamed field or an empty show list would make this pass on nothing.
    expect(checked).toBeGreaterThan(20);
    expect(zero).toEqual([]);
  });

  it("has a size recorded for every entry in the audio manifest", () => {
    const manifest = loadAudioManifest();
    const keys = Object.keys(manifest);
    expect(keys.length).toBeGreaterThan(100);

    const missing = keys.filter((k) => !(manifest[k].size! > 0));
    expect(missing).toEqual([]);
  });
});
