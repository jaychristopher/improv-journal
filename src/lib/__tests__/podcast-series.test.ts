import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getAtomUrl, getAudioUrl, getEpisodesForShow, loadAtoms, loadShows } from "../content";
import { SITE_URL } from "../seo";
import { getSeriesForPage } from "../shows-for-content";

const BUILD = path.join(process.cwd(), ".next", "server", "app");
/**
 * A build directory is not the same as a finished build.
 *
 * This suite reads rendered output, and the check was `existsSync` on the
 * directory. During a rebuild the directory exists while the files inside it
 * are still being written, so the guard passed and the read threw ENOENT —
 * failing on a race rather than on anything true. It presented as a timeout,
 * which sent me to vitest.config first; it was not.
 *
 * Naming a page the build always produces makes the guard mean what it says,
 * so this skips cleanly instead of erroring. content-feed already checked a
 * specific file this way, which is why it never broke.
 */
const built = fs.existsSync(BUILD) && fs.existsSync(path.join(BUILD, "index.html"));

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

/**
 * Every atom page with a player is an episode of something, and says so.
 *
 * Membership of a show is decided in one place, the show files' season
 * filters, and read back through getSeriesForPage. When Deep Cuts gained a
 * Library season (tracker entry 176) the 32 reference readings became
 * episodes in its feed, and the library route — the one atom route that does
 * not render through AtomDetail — still called AudioPlayer alone: no "An
 * episode of" line, no PodcastEpisode markup, no link back to the show
 * (entry 242, 2026-09-21). The feed pointed at pages that did not point back.
 *
 * The first test is build-independent and reads the index: a reference (or
 * any other atom) with audio that no show claims is the case that fails
 * here before it reaches a feed. The second reads the library page's source,
 * because the fault was a route with the lookup missing, not a lookup that
 * returned the wrong answer.
 */
describe("episode provenance", () => {
  it("resolves a series for every atom with audio, references included", async () => {
    const atoms = await loadAtoms();
    const withAudio = atoms.filter((a) => getAudioUrl("atoms", a.frontmatter.id));
    // Guard the guard: 205 today, 32 of them references.
    expect(withAudio.length).toBeGreaterThanOrEqual(200);
    expect(
      withAudio.filter((a) => a.frontmatter.type === "reference").length,
    ).toBeGreaterThanOrEqual(30);

    const orphans: string[] = [];
    for (const atom of withAudio) {
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      if (!(await getSeriesForPage(url))) orphans.push(`${atom.frontmatter.type}: ${url}`);
    }
    expect(orphans).toEqual([]);
  });

  it("looks the series up on the library route as well as the atom one", () => {
    const library = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "library", "[slug]", "page.tsx"),
      "utf-8",
    );
    expect(library).toContain("getSeriesForPage(");
    expect(library).toContain("<PodcastJsonLd");
    expect(library).toContain("An episode of");
  });

  it.runIf(built)("names the show and emits episode markup on every reference page", async () => {
    const atoms = await loadAtoms();
    const references = atoms.filter(
      (a) => a.frontmatter.type === "reference" && getAudioUrl("atoms", a.frontmatter.id),
    );
    expect(references.length).toBeGreaterThanOrEqual(30);

    for (const atom of references) {
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      const series = await getSeriesForPage(url);
      expect(series, url).toBeTruthy();
      const html = page(`${url.slice(1)}.html`);
      expect(html, url).toContain(`href="/listen/${series!.id}"`);
      const episode = jsonLd(html).find((b) => b["@type"] === "PodcastEpisode");
      expect(episode, url).toBeTruthy();
      expect(episode.partOfSeries["@id"]).toBe(`${SITE_URL}/listen/${series!.id}#series`);
    }
  });
});
