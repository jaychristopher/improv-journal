import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadShows } from "../content";

describe("shows", () => {
  it("loads 3 shows", async () => {
    const shows = await loadShows();
    expect(shows.length).toBe(3);
    const ids = shows.map((s) => s.frontmatter.id).sort();
    expect(ids).toEqual(["deep-cuts", "improv-lab", "physics-of-connection"]);
  });

  it("each show has at least one season", async () => {
    const shows = await loadShows();
    for (const show of shows) {
      expect(show.frontmatter.seasons.length).toBeGreaterThan(0);
    }
  });

  it("physics-of-connection has bridge episodes", async () => {
    const seasons = await getEpisodesForShow("physics-of-connection");
    expect(seasons.length).toBe(1);
    expect(seasons[0].episodes.length).toBeGreaterThan(0);
    // All episodes should link to root-level bridge URLs
    for (const ep of seasons[0].episodes) {
      expect(ep.href).toMatch(/^\/[a-z-]+$/);
      expect(ep.audioUrl).toContain("/audio/bridges/");
    }
  });

  it("improv-lab has principle and exercise episodes", async () => {
    const seasons = await getEpisodesForShow("improv-lab");
    expect(seasons.length).toBe(2);
    expect(seasons[0].label).toBe("The 8 Principles");
    expect(seasons[1].label).toBe("The Exercises");
    expect(seasons[0].episodes.length).toBeGreaterThan(0);
    expect(seasons[1].episodes.length).toBeGreaterThan(0);
  });

  it("deep-cuts has thread episodes", async () => {
    const seasons = await getEpisodesForShow("deep-cuts");
    expect(seasons.length).toBe(1);
    expect(seasons[0].episodes.length).toBeGreaterThan(0);
    for (const ep of seasons[0].episodes) {
      expect(ep.href).toMatch(/^\/threads\//);
    }
  });

  it("no episode appears in two shows", async () => {
    const allUrls = new Set<string>();
    const shows = await loadShows();
    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const season of seasons) {
        for (const ep of season.episodes) {
          expect(allUrls.has(ep.audioUrl), `${ep.audioUrl} appears in multiple shows`).toBe(false);
          allUrls.add(ep.audioUrl);
        }
      }
    }
  });
});
