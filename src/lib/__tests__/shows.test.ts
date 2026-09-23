import { describe, expect, it } from "vitest";

import { getAtomUrl, getEpisodesForShow, loadAtoms, loadShows } from "../content";

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
    // All episodes should link to root-level bridge URLs. Digits belong in the
    // pattern: a fair number of bridges lead with a number the search query
    // does — 5-minute-team-building, 21-questions-game — and they only started
    // failing this when they gained audio and so became episodes.
    for (const ep of seasons[0].episodes) {
      expect(ep.href).toMatch(/^\/[a-z0-9-]+$/);
      expect(ep.audioUrl).toContain("/audio/bridges/");
    }
  });

  /**
   * Every atom has audio (2026-09-06) but the shows selected only principles
   * and exercises, so 169 atom episodes were reachable from their page and no
   * feed. The seasons now cover every atom type between the two shows.
   */
  it("improv-lab has a season for every non-reference atom type", async () => {
    const seasons = await getEpisodesForShow("improv-lab");
    expect(seasons.length).toBe(7);
    // Since 2026-09-22 the seasons run dependency-first (tracker entry 303):
    // Laws, Principles, Vocabulary, Techniques, Diagnosis, Exercises, Formats.
    expect(seasons[0].label).toBe("The Laws");
    expect(seasons[1].label).toBe("The Principles");
    for (const season of seasons) {
      expect(season.episodes.length, season.label).toBeGreaterThan(0);
    }
  });

  it("every atom with audio belongs to a show", async () => {
    const shows = await loadShows();
    const inShows = new Set<string>();
    for (const show of shows) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      for (const ep of seasons.flatMap((s) => s.episodes)) inShows.add(ep.href);
    }
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const missing = atoms
      .map((a) => getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }))
      .filter((href) => !inShows.has(href));
    expect(missing).toEqual([]);
  });

  it("deep-cuts has lesson episodes, a library season and a paths season", async () => {
    const seasons = await getEpisodesForShow("deep-cuts");
    // The eleven path readings belonged to no show until 2026-09-21 (entry 242).
    expect(seasons.length).toBe(3);
    expect(seasons[2].label).toBe("The Paths");
    expect(seasons[2].episodes.length).toBe(11);
    expect(seasons[0].episodes.length).toBeGreaterThan(0);
    for (const ep of seasons[0].episodes) {
      expect(ep.href).toMatch(/^\/threads\//);
    }
    expect(seasons[1].label).toBe("The Library");
    expect(seasons[1].episodes.length).toBeGreaterThanOrEqual(30);
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
