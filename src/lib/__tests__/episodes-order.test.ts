import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  getEpisodesForShow,
  getParentPath,
  getPathProgressionRank,
  loadPaths,
  loadThreads,
} from "../content";

/**
 * Deep Cuts is a serial the hub tells listeners to play in order, and until
 * 2026-09-22 its Lessons and Paths seasons played in filename order:
 * "The Lessons" opened on *The Anatomy of a Scene* (a lesson on no path) and
 * reached the beginner's *Building on Offers* third, "The Paths" opened on
 * *Advanced Game and Character* (rank 4 on the ladder) with *Foundations*
 * second, and 11 of the 28 consecutive path steps played in reverse — while
 * the site had a lesson order (`getThreadOrderKey`) and a path order
 * (`getPathProgressionRank`) that every page surface used and the feed
 * builder read neither (tracker entry 304).
 *
 * `getEpisodesForShow` now sorts the lessons by that key and the paths by
 * that rank. These guard what "play in order" promises for a season of
 * lessons that eleven paths share: a lesson plays once, at its home path,
 * so a path's own lessons play in the path's order and every lesson a path
 * borrows from an earlier path has already played.
 */
describe("Deep Cuts plays the curriculum in its own order", () => {
  it("opens the Lessons season on Building on Offers, then Presence and Commitment", async () => {
    const seasons = await getEpisodesForShow("deep-cuts");
    const lessons = seasons.find((s) => s.label === "The Lessons");
    expect(lessons).toBeDefined();
    // Guard the guard: 25 lessons with audio on 2026-09-22.
    expect(lessons!.episodes.length).toBeGreaterThanOrEqual(25);
    const hrefs = lessons!.episodes.map((ep) => ep.href);
    expect(hrefs[0]).toBe("/threads/building-on-offers");
    expect(hrefs[1]).toBe("/threads/presence-and-commitment");
    // The lesson on no path plays last of all, not first.
    const homeless: string[] = [];
    for (const t of await loadThreads()) {
      if (!(await getParentPath(t.frontmatter.id))) homeless.push(`/threads/${t.frontmatter.id}`);
    }
    expect(homeless).toContain("/threads/anatomy-of-a-scene");
    for (const href of homeless) {
      expect(hrefs.indexOf(href)).toBeGreaterThan(hrefs.length - homeless.length - 1);
    }
  });

  it("plays every path's own lessons in the path's order, and borrowed ones earlier", async () => {
    const seasons = await getEpisodesForShow("deep-cuts");
    const lessons = seasons.find((s) => s.label === "The Lessons")!;
    const position = new Map(lessons.episodes.map((ep, i) => [ep.href.split("/").pop()!, i]));
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(11);

    let steps = 0;
    const reversedOwn: string[] = [];
    const revisits: string[] = [];
    for (const p of paths) {
      const rank = getPathProgressionRank(p.frontmatter.id);
      const sequence = (p.frontmatter.threads ?? []).filter((t) => position.has(t));
      for (let i = 1; i < sequence.length; i++) {
        steps += 1;
        const [prev, next] = [sequence[i - 1], sequence[i]];
        if (position.get(next)! > position.get(prev)!) continue;
        const home = await getParentPath(next);
        const label = `${p.frontmatter.id}: ${prev} → ${next} (home ${home?.frontmatter.id})`;
        // A step that runs backwards is allowed only when the later lesson
        // belongs to a path earlier on the ladder — the listener has heard
        // it — never when the path is playing its own lessons out of order.
        if (
          home &&
          home.frontmatter.id !== p.frontmatter.id &&
          getPathProgressionRank(home.frontmatter.id) < rank
        ) {
          revisits.push(label);
        } else {
          reversedOwn.push(label);
        }
      }
    }
    // Guard the guard: 28 consecutive steps on 2026-09-22.
    expect(steps).toBeGreaterThanOrEqual(28);
    expect(reversedOwn).toEqual([]);
    // 11 of the 28 steps were reversed in filename order; 10 remain and every
    // one is a revisit of a lesson homed on an earlier path (Teaching Improv
    // lists Building on Offers after The Teacher's Toolkit). A ceiling, not
    // a target: it falls if a path stops re-listing foundations.
    expect(revisits.length).toBeLessThanOrEqual(10);
  });

  it("opens the Paths season on Foundations and climbs the ladder", async () => {
    const seasons = await getEpisodesForShow("deep-cuts");
    const paths = seasons.find((s) => s.label === "The Paths");
    expect(paths).toBeDefined();
    expect(paths!.episodes.length).toBe(11);
    const ids = paths!.episodes.map((ep) => ep.href.split("/").pop()!);
    expect(ids[0]).toBe("beginner-foundations");
    const ranks = ids.map(getPathProgressionRank);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i], ids[i]).toBeGreaterThanOrEqual(ranks[i - 1]);
    }
    // The two ends of the chain both rank last; the teacher's shelf before
    // the performer's ensemble.
    expect(ids.indexOf("reference-guide")).toBeLessThan(ids.indexOf("the-art-of-ensemble"));
    expect(ids.indexOf("advanced-game-and-character")).toBeGreaterThan(3);
  });
});

/**
 * The built feeds carry the same openers. The route is rendered by
 * podcast-dates.test.ts; this reads what `next build` wrote, since the feed
 * a client fetches is that file.
 */
describe("built feeds", () => {
  const BUILD = path.join(process.cwd(), ".next", "server", "app");
  const built = fs.existsSync(BUILD) && fs.existsSync(path.join(BUILD, "index.html"));

  const itemTitles = (show: string) => {
    const xml = fs.readFileSync(path.join(BUILD, "listen", show, "feed.xml.body"), "utf-8");
    return xml
      .split("<item>")
      .slice(1)
      .map((item) => item.match(/<title>([^<]*)<\/title>/)![1]);
  };

  it.runIf(built)("open on the episodes the season order puts first", async () => {
    for (const show of ["improv-lab", "deep-cuts"]) {
      const expected = (await getEpisodesForShow(show)).flatMap((s) => s.episodes);
      const titles = itemTitles(show);
      expect(titles.length, show).toBe(expected.length);
      expect(titles.slice(0, 3), show).toEqual(
        expected.slice(0, 3).map((ep) => ep.title.replace(/&/g, "&amp;").replace(/'/g, "&apos;")),
      );
    }
    expect(itemTitles("deep-cuts")[0]).toMatch(/^Building on Offers/);
    expect(itemTitles("improv-lab")[0]).toBe("Meaning Is Relational");
  });
});
