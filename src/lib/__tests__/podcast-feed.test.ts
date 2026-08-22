import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadShows } from "../content";

describe("podcast feed data", () => {
  it("gives every episode a publication date", async () => {
    for (const show of await loadShows()) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const season of seasons) {
        for (const ep of season.episodes) {
          expect(ep.published, `${show.frontmatter.id}: ${ep.title}`).toBeTruthy();
        }
      }
    }
  });

  it("uses parseable dates, so feed ordering is stable", async () => {
    for (const show of await loadShows()) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const season of seasons) {
        for (const ep of season.episodes) {
          expect(Number.isNaN(new Date(ep.published!).getTime()), ep.title).toBe(false);
        }
      }
    }
  });

  it("does not collapse every episode onto a single date", async () => {
    for (const show of await loadShows()) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      const episodes = seasons.flatMap((s) => s.episodes);
      if (episodes.length < 3) continue;
      const distinct = new Set(episodes.map((e) => e.published));
      expect(
        distinct.size,
        `${show.frontmatter.id} has one pubDate for every episode`,
      ).toBeGreaterThan(1);
    }
  });

  it("every show has a created date to fall back on", async () => {
    for (const show of await loadShows()) {
      expect(Number.isNaN(new Date(show.frontmatter.created).getTime())).toBe(false);
    }
  });
});
