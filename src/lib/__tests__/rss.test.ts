import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadShows } from "../content";

describe("RSS feed data", () => {
  it("every show has episodes for feed generation", async () => {
    const shows = await loadShows();
    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      const totalEps = seasons.reduce((sum, s) => sum + s.episodes.length, 0);
      expect(totalEps, `${show.frontmatter.id} has no episodes`).toBeGreaterThan(0);
    }
  });

  it("every episode has an audioUrl for enclosure", async () => {
    const shows = await loadShows();
    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const season of seasons) {
        for (const ep of season.episodes) {
          expect(ep.audioUrl, `${ep.title} missing audioUrl`).toMatch(
            /^(\/audio\/|https?:\/\/.+\/audio\/)/,
          );
        }
      }
    }
  });

  it("every episode has a title and href", async () => {
    const shows = await loadShows();
    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const season of seasons) {
        for (const ep of season.episodes) {
          expect(ep.title.length).toBeGreaterThan(0);
          expect(ep.href).toMatch(/^\//);
        }
      }
    }
  });
});
