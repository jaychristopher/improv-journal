import fs from "node:fs";
import path from "node:path";

/**
 * The improv directory: theatres, schools and recurring shows in sixty US
 * cities, read at build time from data/directory/*.json.
 *
 * The files are written by scripts/directory-engine.mjs, which runs daily in
 * GitHub Actions (.github/workflows/directory-engine.yml): Claude searches the
 * live web for a city, the script verifies every website answers, merges the
 * reading with what the file already holds, ranks by the archive's rubric and
 * commits. Nothing here writes; this module reads what the engine left and
 * shapes it for /improv-near-you and /improv-near-you/[city].
 *
 * A city with no file yet, or an empty one, is still a page — "not read yet"
 * — so the archive's shape does not depend on which cities the engine has
 * reached, and the sitemap is stable from the first deploy.
 */

export type DirectoryKind = "shows" | "classes" | "jams";

export interface DirectoryCityMeta {
  slug: string;
  city: string;
  state: string;
  stateCode: string;
  /** Towns of the metro area whose organisations belong on this city's page. */
  metro: string[];
}

export interface DirectoryEntry {
  /** The organisation's domain, without www: its identity across runs. */
  id: string;
  name: string;
  url: string;
  kind: DirectoryKind[];
  area: string;
  summary: string;
  schedule: string;
  signals: string[];
  /** 0–100 by the rubric in scripts/lib/directory.mjs. */
  score: number;
  reasons: string;
  sources: string[];
  firstSeen: string;
  lastSeen: string;
  missingRuns: number;
  /** live: seen and its site answered this run; unverified: seen, site did not answer; unseen: not returned this run. */
  status: "live" | "unverified" | "unseen";
  rank: number;
}

export interface DirectoryRunLog {
  run: string;
  added: number;
  updated: number;
  dropped: number;
  unverified: number;
  kept: number;
}

export interface DirectoryCity extends DirectoryCityMeta {
  /** The date of the last engine run that touched this city, or null before the first. */
  updated: string | null;
  engine: {
    model: string;
    run: string;
    searches: number;
    notes: string;
    /** Entries the checks refused, and sites that did not answer, as the run saw them. */
    rejected?: string[];
    unreachable?: string[];
  } | null;
  entries: DirectoryEntry[];
  log: DirectoryRunLog[];
}

const DIR = path.join(process.cwd(), "data", "directory");

let citiesCache: DirectoryCityMeta[] | null = null;
const cityCache = new Map<string, DirectoryCity>();

/** Every city the archive covers, in the order the engine cycles through them. */
export function loadDirectoryCities(): DirectoryCityMeta[] {
  if (citiesCache) return citiesCache;
  const raw = JSON.parse(fs.readFileSync(path.join(DIR, "cities.json"), "utf8")) as {
    cities: DirectoryCityMeta[];
  };
  citiesCache = raw.cities.map((c) => ({ ...c, metro: c.metro ?? [] }));
  return citiesCache;
}

export function directoryCityMeta(slug: string): DirectoryCityMeta | null {
  return loadDirectoryCities().find((c) => c.slug === slug) ?? null;
}

/** One city, with whatever the engine has read; an empty shell before the first run. */
export function loadDirectoryCity(slug: string): DirectoryCity | null {
  const meta = directoryCityMeta(slug);
  if (!meta) return null;
  const cached = cityCache.get(slug);
  if (cached) return cached;
  const file = path.join(DIR, `${slug}.json`);
  let data: Partial<DirectoryCity> = {};
  if (fs.existsSync(file)) {
    data = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<DirectoryCity>;
  }
  const city: DirectoryCity = {
    ...meta,
    updated: data.updated ?? null,
    engine: data.engine ?? null,
    entries: [...(data.entries ?? [])].sort((a, b) => a.rank - b.rank),
    log: data.log ?? [],
  };
  cityCache.set(slug, city);
  return city;
}

export function loadDirectory(): DirectoryCity[] {
  return loadDirectoryCities()
    .map((c) => loadDirectoryCity(c.slug))
    .filter((c): c is DirectoryCity => c !== null);
}

/** What the hub says at the top: how much the archive holds and how fresh it is. */
export function directorySummary(cities: DirectoryCity[] = loadDirectory()) {
  const read = cities.filter((c) => c.updated !== null);
  const entries = cities.reduce((n, c) => n + c.entries.length, 0);
  const latest =
    read
      .map((c) => c.updated as string)
      .sort()
      .at(-1) ?? null;
  return { cities: cities.length, read: read.length, entries, latest };
}

/** The entries of a city offering a kind, in rank order. */
export function entriesOffering(city: DirectoryCity, kind: DirectoryKind): DirectoryEntry[] {
  return city.entries.filter((e) => e.kind.includes(kind));
}

export const DIRECTORY_PATH = "/improv-near-you";

export function directoryCityPath(slug: string): string {
  return `${DIRECTORY_PATH}/${slug}`;
}

/**
 * A city page is indexed once it lists this many places that answered on the
 * last pass. Below it the page is served and linked but kept out of the
 * index and the sitemap, as the picker's thin facets are, so a thin page
 * never stands for a whole scene.
 */
export const INDEXABLE_MIN_ENTRIES = 3;

/** The entries whose site answered on the last pass that saw them. */
export function liveEntries(city: DirectoryCity): DirectoryEntry[] {
  return city.entries.filter((e) => e.status !== "unseen");
}

export function isIndexableDirectoryCity(city: DirectoryCity): boolean {
  return liveEntries(city).length >= INDEXABLE_MIN_ENTRIES;
}

/** "30 September 2026", the way the guides say their dates. */
export function formatDirectoryDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/* The titles and descriptions, defined once: the pages, the sitemap and the
   llms.txt listing all read them here, so none can drift from another. The
   h1 is the opening of the title (hub-headings.test.ts) and every
   description sits under the snippet limit without trimming. */

export const DIRECTORY_HUB_H1 = "Improv Near You";

export function directoryHubTitle(): string {
  return `${DIRECTORY_HUB_H1}: Classes and Shows in ${loadDirectoryCities().length} US Cities`;
}

export function directoryHubDescription(): string {
  const { cities, entries } = directorySummary();
  return entries > 0
    ? `${entries} improv theaters, schools and regular shows across ${cities} US cities, each with a link to its own site.`
    : `Improv theaters, schools and regular shows across ${cities} US cities, each with a link to its own site.`;
}

export function directoryCityH1(meta: DirectoryCityMeta): string {
  return `Improv in ${meta.city}`;
}

export function directoryCityTitle(meta: DirectoryCityMeta): string {
  return `${directoryCityH1(meta)}: Theaters, Classes and Shows`;
}

export function directoryCityDescription(city: DirectoryCity): string {
  const n = liveEntries(city).length;
  return n > 0
    ? `${n} places for improv in ${city.city}, ${city.state}: theaters, schools and regular shows, each with a link to its own site.`
    : `Improv theaters, classes and regular shows in ${city.city}, ${city.state}, each with a link to its own site.`;
}

/** The other cities of the archive in the same state, for the page's nearby block. */
export function directoryNeighbours(meta: DirectoryCityMeta): DirectoryCityMeta[] {
  return loadDirectoryCities().filter(
    (c) => c.stateCode === meta.stateCode && c.slug !== meta.slug,
  );
}
