import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadShows } from "../content";
import { SITE_URL } from "../seo";

const BUILD = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(BUILD);

function page(rel: string) {
  return fs.readFileSync(path.join(BUILD, rel), "utf-8");
}

function jsonLd(html: string) {
  // [\s\S] instead of the `s` flag, which this tsconfig target predates.
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
    JSON.parse(m[1]),
  );
}

describe("podcast series", () => {
  it.runIf(built)("declares PodcastSeries on every show page", async () => {
    for (const show of await loadShows()) {
      const blobs = jsonLd(page(`listen/${show.frontmatter.id}.html`));
      const series = blobs.find((b) => b["@type"] === "PodcastSeries");
      expect(series, show.frontmatter.id).toBeTruthy();
      expect(series.name).toBe(show.frontmatter.title);
      expect(series["@id"]).toBe(`${SITE_URL}/listen/${show.frontmatter.id}#series`);
    }
  });

  it.runIf(built)("points webFeed at the show's real feed", async () => {
    for (const show of await loadShows()) {
      const series = jsonLd(page(`listen/${show.frontmatter.id}.html`)).find(
        (b) => b["@type"] === "PodcastSeries",
      );
      const feed = `${SITE_URL}/listen/${show.frontmatter.id}/feed.xml`;
      expect(series.webFeed).toBe(feed);
      expect(fs.existsSync(path.join(BUILD, `listen/${show.frontmatter.id}/feed.xml.body`))).toBe(
        true,
      );
    }
  });

  it.runIf(built)("reports the episode count the feed actually carries", async () => {
    for (const show of await loadShows()) {
      const seasons = await getEpisodesForShow(show.frontmatter.id);
      const total = seasons.reduce((n, s) => n + s.episodes.length, 0);
      const series = jsonLd(page(`listen/${show.frontmatter.id}.html`)).find(
        (b) => b["@type"] === "PodcastSeries",
      );
      expect(series.numberOfEpisodes, show.frontmatter.id).toBe(total);
    }
  });

  it.runIf(built)("offers feed autodiscovery from each show and from the hub", async () => {
    const shows = await loadShows();

    for (const show of shows) {
      const html = page(`listen/${show.frontmatter.id}.html`);
      expect(html, show.frontmatter.id).toContain(`type="application/rss+xml"`);
      expect(html).toContain(`/listen/${show.frontmatter.id}/feed.xml`);
    }

    const hub = page("listen.html");
    for (const show of shows) {
      expect(hub, `hub missing ${show.frontmatter.id} feed`).toContain(
        `/listen/${show.frontmatter.id}/feed.xml`,
      );
    }
  });
});
