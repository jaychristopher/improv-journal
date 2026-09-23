import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { GET } from "../../app/listen/[show]/feed.xml/route";
import { getEpisodesForShow, loadShows } from "../content";

/**
 * A podcast feed carries two orders and clients disagree about which to use:
 * `itunes:episode` is the number, `pubDate` is what most apps sort on. The
 * Improv Lab numbered its 173 episodes in teaching order and dated them by
 * the atom's `created`, which was the day the file was written — four April
 * batches, 62 episodes on one day, none later than 24 August although every
 * MP3 landed on 6 September. 55 of 172 adjacent pairs had the later number on
 * the earlier date, so an app sorting by date opened on be-present, be-honest
 * and be-thankful before be-changeable (tracker entry 236, 2026-09-21).
 *
 * `published` is now derived from the episode's position: the show's
 * `created` plus a fixed step per episode. These are the properties that
 * derivation exists to give, checked on the data every feed and show page
 * reads rather than on a build.
 */
describe("podcast episode dates", () => {
  it("increase strictly with episode number within every show", async () => {
    const shows = await loadShows();
    expect(shows.length).toBeGreaterThanOrEqual(3);

    for (const show of shows) {
      const episodes = (await getEpisodesForShow(show.frontmatter.id)).flatMap((s) => s.episodes);
      // Guard the guard: a show with no audio would pass vacuously.
      expect(episodes.length, show.frontmatter.id).toBeGreaterThan(10);

      const inverted: string[] = [];
      for (let i = 1; i < episodes.length; i++) {
        const prev = new Date(episodes[i - 1].published!).getTime();
        const next = new Date(episodes[i].published!).getTime();
        if (!(next > prev)) {
          inverted.push(
            `${show.frontmatter.id} #${i} "${episodes[i - 1].title}" → #${i + 1} "${episodes[i].title}"`,
          );
        }
      }
      expect(inverted).toEqual([]);
    }
  });

  it("dates no episode before its show, and none in the future", async () => {
    const now = Date.now();
    for (const show of await loadShows()) {
      const created = new Date(show.frontmatter.created).getTime();
      const episodes = (await getEpisodesForShow(show.frontmatter.id)).flatMap((s) => s.episodes);
      const outside = episodes
        .filter((ep) => {
          const t = new Date(ep.published!).getTime();
          return t < created || t > now;
        })
        .map((ep) => `${show.frontmatter.id}: ${ep.title} (${ep.published})`);
      // A show that outgrows its runway — episodes × spacing past today —
      // fails here, which is the moment to widen the anchor or the spacing
      // rather than let a client hide the tail as unreleased.
      expect(outside).toEqual([]);
    }
  });

  // The opener was be-present while the Principles season came first. Since
  // 2026-09-22 the seasons play dependency-first (tracker entry 303): The Laws
  // open the show, and the first law is the one the rest of the season rests
  // on. season-order.test.ts holds the season order; this holds the date.
  it("opens the Improv Lab on its first law, dated at the show's anchor", async () => {
    const show = (await loadShows()).find((s) => s.frontmatter.id === "improv-lab");
    expect(show).toBeDefined();
    const [first] = (await getEpisodesForShow("improv-lab")).flatMap((s) => s.episodes);
    expect(first.href).toBe("/how-it-works/meaning-is-relational");
    expect(new Date(first.published!).getTime()).toBe(
      new Date(show!.frontmatter.created).getTime(),
    );
  });
});

describe("podcast feed route", () => {
  const render = (show: string) =>
    GET(new Request(`http://localhost/listen/${show}/feed.xml`), {
      params: Promise.resolve({ show }),
    }).then((r) => r.text());

  it("carries itunes:season on every item, numbered by season order", async () => {
    const xml = await render("improv-lab");
    const items = xml.split("<item>").slice(1);
    expect(items.length).toBeGreaterThan(100);

    const seasons = items.map((item) => Number(item.match(/<itunes:season>(\d+)</)?.[1]));
    expect(seasons.some((n) => Number.isNaN(n))).toBe(false);
    // The Improv Lab has seven seasons and plays them in order, so the
    // season number never decreases down the feed and reaches the last one.
    for (let i = 1; i < seasons.length; i++) {
      expect(seasons[i]).toBeGreaterThanOrEqual(seasons[i - 1]);
    }
    expect(seasons[0]).toBe(1);
    expect(Math.max(...seasons)).toBeGreaterThanOrEqual(5);
  });

  it("renders pubDates in the same order as the episode numbers", async () => {
    const xml = await render("improv-lab");
    const items = xml.split("<item>").slice(1);
    const dates = items.map((item) => new Date(item.match(/<pubDate>([^<]+)</)![1]).getTime());
    const numbers = items.map((item) => Number(item.match(/<itunes:episode>(\d+)</)![1]));
    for (let i = 1; i < items.length; i++) {
      expect(numbers[i]).toBe(numbers[i - 1] + 1);
      expect(dates[i]).toBeGreaterThan(dates[i - 1]);
    }
  });
});

/**
 * `itunes:type` is the one word that tells a client whether order matters.
 * All three feeds said "episodic" — episodes stand alone, newest first —
 * while numbering, dating and grouping their items in teaching order, which
 * is the serial contract; a client that honoured the declaration showed the
 * Improv Lab with episode 173 on top (tracker entry 246, 2026-09-21). The
 * type is now a show field, and the feed's item order follows it: a serial
 * feed lists oldest first, an episodic one newest first, and the numbers
 * and dates rise with teaching order either way.
 */
describe("podcast show type", () => {
  const render = (show: string) =>
    GET(new Request(`http://localhost/listen/${show}/feed.xml`), {
      params: Promise.resolve({ show }),
    }).then((r) => r.text());

  const itemOrder = (xml: string) =>
    xml
      .split("<item>")
      .slice(1)
      .map((item) => ({
        number: Number(item.match(/<itunes:episode>(\d+)</)![1]),
        date: new Date(item.match(/<pubDate>([^<]+)</)![1]).getTime(),
      }));

  it("is declared on every show, and the feed emits the show's own type", async () => {
    const shows = await loadShows();
    expect(shows.length).toBeGreaterThanOrEqual(3);
    const types = new Set<string>();
    for (const show of shows) {
      const type = show.frontmatter.show_type;
      expect(["serial", "episodic"], show.frontmatter.id).toContain(type);
      types.add(type);
      const xml = await render(show.frontmatter.id);
      expect(xml.match(/<itunes:type>([^<]+)</)?.[1], show.frontmatter.id).toBe(type);
    }
    // Guard the guard: the point is that the answer is per show, so both
    // kinds have to be present or the route could still hard-code one.
    expect([...types].sort()).toEqual(["episodic", "serial"]);
  });

  it("lists a serial feed oldest first: numbers and dates both rise down the feed", async () => {
    const serial = (await loadShows()).filter((s) => s.frontmatter.show_type === "serial");
    expect(serial.map((s) => s.frontmatter.id).sort()).toEqual(["deep-cuts", "improv-lab"]);
    for (const show of serial) {
      const items = itemOrder(await render(show.frontmatter.id));
      expect(items.length, show.frontmatter.id).toBeGreaterThan(10);
      expect(items[0].number).toBe(1);
      for (let i = 1; i < items.length; i++) {
        expect(items[i].number, show.frontmatter.id).toBe(items[i - 1].number + 1);
        expect(items[i].date, show.frontmatter.id).toBeGreaterThan(items[i - 1].date);
      }
    }
  });

  it("lists an episodic feed newest first: numbers and dates both fall down the feed", async () => {
    const episodic = (await loadShows()).filter((s) => s.frontmatter.show_type === "episodic");
    expect(episodic.map((s) => s.frontmatter.id)).toEqual(["physics-of-connection"]);
    for (const show of episodic) {
      const items = itemOrder(await render(show.frontmatter.id));
      expect(items.length, show.frontmatter.id).toBeGreaterThan(10);
      // The number stays with the episode: the top item is the last one
      // taught, and the bottom is episode 1.
      expect(items[0].number).toBe(items.length);
      expect(items[items.length - 1].number).toBe(1);
      for (let i = 1; i < items.length; i++) {
        expect(items[i].number, show.frontmatter.id).toBe(items[i - 1].number - 1);
        expect(items[i].date, show.frontmatter.id).toBeLessThan(items[i - 1].date);
      }
    }
  });

  it("says which kind each show is on the listen hub", async () => {
    // A source check: WHICH_SHOW is a module constant of a page component,
    // so the blurb is read from the file rather than rendered.
    const source = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "listen", "page.tsx"),
      "utf-8",
    );
    const blurbs = [...source.matchAll(/id: "([^"]+)",[\s\S]*?body: "([^"]+)"/g)];
    expect(blurbs.length).toBeGreaterThanOrEqual(3);
    for (const show of await loadShows()) {
      const blurb = blurbs.find(([, id]) => id === show.frontmatter.id)?.[2];
      expect(blurb, show.frontmatter.id).toBeDefined();
      const clause =
        show.frontmatter.show_type === "serial" ? "play in order" : "any episode stands alone";
      const other =
        show.frontmatter.show_type === "serial" ? "any episode stands alone" : "play in order";
      expect(blurb, show.frontmatter.id).toContain(clause);
      expect(blurb, show.frontmatter.id).not.toContain(other);
    }
  });
});
