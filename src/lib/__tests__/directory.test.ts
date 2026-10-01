import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { AGGREGATOR_HOSTS, KINDS, normalizeDomain } from "../../../scripts/lib/directory.mjs";
import {
  DIRECTORY_HUB_H1,
  DIRECTORY_PATH,
  directoryCityDescription,
  directoryCityH1,
  directoryCityPath,
  directoryCityTitle,
  directoryHubDescription,
  directoryHubTitle,
  directorySummary,
  INDEXABLE_MIN_ENTRIES,
  isIndexableDirectoryCity,
  loadDirectory,
  loadDirectoryCities,
} from "../directory";
import { DESCRIPTION_MAX } from "../seo";

/**
 * The improv directory: data/directory as the engine leaves it, and the
 * pages built from it.
 *
 * The engine (scripts/directory-engine.mjs) rewrites these files daily with
 * nobody watching, so the shape of a file is held here as a guard rather
 * than trusted: an entry a reader clicks must be a real site of the
 * organisation's own, the rank must be the order the page shows, and a city
 * too thin to stand for a scene must stay out of the index.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "improv-near-you.html"));

const ISO = /^\d{4}-\d{2}-\d{2}$/;

describe("the cities", () => {
  it("cover every major US city, each once, with a slug the route can serve", () => {
    const cities = loadDirectoryCities();
    // Sixty on 2026-10-01: the fifty most populous by the 2020 census and ten
    // more whose metros are large and whose scenes are known.
    expect(cities.length).toBeGreaterThanOrEqual(50);
    const slugs = new Set<string>();
    for (const c of cities) {
      expect(c.slug, c.city).toMatch(/^[a-z0-9-]+$/);
      expect(slugs.has(c.slug), c.slug).toBe(false);
      slugs.add(c.slug);
      expect(c.city.length).toBeGreaterThan(1);
      expect(c.state.length).toBeGreaterThan(1);
      expect(c.stateCode).toMatch(/^[A-Z]{2}$/);
      expect(Array.isArray(c.metro)).toBe(true);
    }
    for (const must of ["new-york", "los-angeles", "chicago", "austin", "seattle", "boston"]) {
      expect(slugs.has(must), must).toBe(true);
    }
  });
});

describe("what the engine left", () => {
  const cities = loadDirectory();

  it("has read most of the archive, and every file is a city the list knows", () => {
    const files = fs
      .readdirSync(path.join(ROOT, "data", "directory"))
      .filter((f) => f.endsWith(".json") && !["cities.json", "engine-state.json"].includes(f))
      .map((f) => f.replace(/\.json$/, ""));
    const known = new Set(cities.map((c) => c.slug));
    for (const slug of files) expect(known.has(slug), slug).toBe(true);
    // The first pass, 2026-10-01, read every city; the floor sits under it so
    // a run that wiped the archive fails here.
    const { read, entries } = directorySummary(cities);
    expect(read).toBeGreaterThanOrEqual(50);
    expect(entries).toBeGreaterThanOrEqual(200);
  });

  it("lists only organisations with a site of their own, keyed on the domain, ranked as shown", () => {
    const problems: string[] = [];
    for (const city of cities) {
      const ids = new Set<string>();
      city.entries.forEach((e, i) => {
        const tag = `${city.slug}: ${e.name}`;
        if (e.rank !== i + 1) problems.push(`${tag} rank ${e.rank} at position ${i + 1}`);
        if (i > 0 && city.entries[i - 1].score < e.score) {
          problems.push(`${tag} out of score order`);
        }
        if (!/^https?:\/\//.test(e.url)) problems.push(`${tag} url ${e.url}`);
        const domain = normalizeDomain(e.url);
        if (domain !== e.id) problems.push(`${tag} id ${e.id} is not its domain ${domain}`);
        if (ids.has(e.id)) problems.push(`${tag} listed twice`);
        ids.add(e.id);
        if (AGGREGATOR_HOSTS.some((h) => domain === h || domain?.endsWith(`.${h}`))) {
          problems.push(`${tag} is a listing site`);
        }
        if (!e.kind.length || e.kind.some((k) => !KINDS.includes(k))) problems.push(`${tag} kind`);
        if (!Number.isInteger(e.score) || e.score < 0 || e.score > 100) {
          problems.push(`${tag} score`);
        }
        if (e.summary.length < 20 || e.summary.length > 240) problems.push(`${tag} summary length`);
        if (e.name.length > 80) problems.push(`${tag} name length`);
        if (!ISO.test(e.firstSeen) || !ISO.test(e.lastSeen)) problems.push(`${tag} dates`);
        if (!["live", "unverified", "unseen"].includes(e.status)) problems.push(`${tag} status`);
      });
      if (city.updated !== null && !ISO.test(city.updated)) problems.push(`${city.slug} updated`);
    }
    expect(problems).toEqual([]);
  });
});

describe("the titles and descriptions", () => {
  it("open with their h1 and fit the snippet without trimming, on the hub and every city", () => {
    expect(directoryHubTitle().startsWith(DIRECTORY_HUB_H1)).toBe(true);
    expect(directoryHubDescription().length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    for (const city of loadDirectory()) {
      expect(directoryCityTitle(city).startsWith(directoryCityH1(city)), city.slug).toBe(true);
      expect(directoryCityDescription(city).length, city.slug).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(
        directoryCityDescription({ ...city, entries: [] }).length,
        city.slug,
      ).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
  });

  it("keeps a thin city out of the index until it lists three verified places", () => {
    const [city] = loadDirectory();
    const thin = { ...city, entries: city.entries.slice(0, INDEXABLE_MIN_ENTRIES - 1) };
    expect(isIndexableDirectoryCity(thin)).toBe(false);
    const unseen = {
      ...city,
      entries: city.entries.map((e) => ({ ...e, status: "unseen" as const })),
    };
    expect(isIndexableDirectoryCity(unseen)).toBe(false);
  });
});

describe("the built pages", () => {
  const read = (route: string) => fs.readFileSync(path.join(APP, `${route.slice(1)}.html`), "utf8");

  it.runIf(built)("link every city from the hub, inside a tracked, marked block", () => {
    const html = read(DIRECTORY_PATH);
    const cities = loadDirectoryCities();
    for (const c of cities) expect(html, c.slug).toContain(`href="${directoryCityPath(c.slug)}"`);
    expect(html).toContain('data-track="directory-cities" data-derived="true"');
    expect(html).toMatch(/<h1[^>]*>Improv Near You<\/h1>/);
  });

  it.runIf(built)(
    "serve every city with its h1, its outbound links marked, and the index gate honoured",
    () => {
      let indexed = 0;
      let noindexed = 0;
      for (const city of loadDirectory()) {
        const html = read(directoryCityPath(city.slug));
        expect(html, city.slug).toMatch(
          new RegExp(`<h1[^>]*>Improv in ${city.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h1>`),
        );
        const outbound =
          html.match(/<a href="https?:\/\/[^"]+" target="_blank" rel="noopener noreferrer"/g) ?? [];
        const live = city.entries.filter((e) => e.status !== "unseen").length;
        if (live > 0) expect(outbound.length, city.slug).toBeGreaterThanOrEqual(live);
        const noindex = /<meta name="robots" content="noindex/.test(html);
        if (isIndexableDirectoryCity(city)) {
          expect(noindex, `${city.slug} should be indexed`).toBe(false);
          indexed++;
        } else {
          expect(noindex, `${city.slug} should be noindexed`).toBe(true);
          noindexed++;
        }
      }
      // Guard the guard: both branches exist on 2026-10-01.
      expect(indexed).toBeGreaterThanOrEqual(30);
      expect(indexed + noindexed).toBe(loadDirectoryCities().length);
    },
  );
});
