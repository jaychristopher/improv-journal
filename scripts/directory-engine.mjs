#!/usr/bin/env node
/**
 * The directory engine.
 *
 * The archive at /improv-near-you keeps itself: a scheduled Claude session
 * reads the live web for a city's improv theatres, schools and recurring
 * shows, and this script does everything around that — which cities are due,
 * what to ask about each, then checking every entry, fetching every website,
 * merging with what the city file already holds, ranking, and writing.
 *
 *   node scripts/directory-engine.mjs --plan 10 --out <dir>
 *       the cities due now, with one prompt file each, written to <dir>
 *   node scripts/directory-engine.mjs --prompt chicago
 *       the prompt for one city, on stdout
 *   node scripts/directory-engine.mjs --seed <dir>
 *       import the replies in <dir> (one <slug>.json a city) and advance the
 *       cycle past them
 *   node scripts/directory-engine.mjs --check
 *       fetch every listed website and take the dead ones off the pages
 *   node scripts/directory-engine.mjs --dry --cities chicago
 *       no network: the fixture reply through the same checks and merge
 *
 * There is no API key and no API call. The reading is done by whatever Claude
 * session is running the script — in a terminal, or the cloud schedules
 * described in docs/directory-engine-run.md, which is the runbook they
 * follow. That is the owner's choice (2026-10-01): the work is a research
 * task Claude already does, and an unattended key is a cost and a secret to
 * look after for no gain.
 *
 * Two schedules, because the two things that go wrong go wrong at different
 * speeds. Ten cities twice a month re-reads every city quarterly, which is
 * about as often as a theatre opens, closes or moves. The link check runs
 * weekly, costs nothing but a fetch an entry, and is what keeps a dead link
 * off a page between readings.
 *
 * The rules that need no network — reading a reply, checking an entry,
 * merging a reading, ranking — live in scripts/lib/directory.mjs and are
 * held by src/lib/__tests__/directory-engine.test.ts.
 */
import fs from "node:fs";
import path from "node:path";

import {
  buildPrompt,
  emptyCity,
  fixtureReply,
  mergeCity,
  validateEntry,
} from "./lib/directory.mjs";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "directory");
const CITIES_FILE = path.join(DIR, "cities.json");
const STATE_FILE = path.join(DIR, "engine-state.json");
const VERIFY_TIMEOUT_MS = 12_000;
const VERIFY_CONCURRENCY = 5;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const DRY = flag("dry");

const today = new Date().toISOString().slice(0, 10);
const readJson = (file, fallback) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");

const cities = readJson(CITIES_FILE, { cities: [] }).cities;
if (!cities.length) {
  console.error("data/directory/cities.json has no cities");
  process.exit(1);
}
const state = readJson(STATE_FILE, { cursor: 0, runs: [] });
const indexOfSlug = new Map(cities.map((c, i) => [c.slug, i]));

/** Which cities a run covers: the next few on the cycle, named ones, or all. */
function pickCities() {
  if (flag("all")) return cities;
  const named = value("cities");
  if (named) {
    const want = new Set(
      named
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const missing = [...want].filter((s) => !indexOfSlug.has(s));
    if (missing.length) console.error(`unknown cities: ${missing.join(", ")}`);
    return cities.filter((c) => want.has(c.slug));
  }
  const n = Math.max(1, Number(value("plan") || value("next") || 10));
  const start = state.cursor % cities.length;
  const chosen = [];
  for (let i = 0; i < Math.min(n, cities.length); i++)
    chosen.push(cities[(start + i) % cities.length]);
  return chosen;
}

/**
 * Whether a website answers at all. Any HTTP status counts: a 403 is a site
 * refusing bots and a 503 is a site having a bad minute, and both are sites;
 * what does not count is a dead domain, which fails to connect. A failure is
 * tried three times a few seconds apart, because the first reading dropped
 * a real theatre on one slow response and nothing said so.
 */
async function reachable(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VERIFY_TIMEOUT_MS);
    try {
      await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent":
            "Mozilla/5.0 (compatible; physicsofconnection-directory/1.0; +https://www.physicsofconnection.com/improv-near-you)",
        },
      });
      return true;
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2500 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  return false;
}

async function verifyAll(entries) {
  const verified = new Set();
  const queue = [...entries];
  const workers = Array.from({ length: VERIFY_CONCURRENCY }, async () => {
    while (queue.length) {
      const entry = queue.shift();
      if (await reachable(entry.url)) verified.add(entry.id);
    }
  });
  await Promise.all(workers);
  return verified;
}

/**
 * One city through the engine: every entry checked, every site fetched,
 * merged with what the file holds, ranked, written. `reply` is the reading
 * the session made, or the fixture under --dry.
 */
async function runCity(meta, reply) {
  const file = path.join(DIR, `${meta.slug}.json`);
  const existing = readJson(file, emptyCity(meta));
  const fresh = [];
  const rejected = [];
  for (const raw of reply.entries) {
    const { entry, reason } = validateEntry(raw);
    if (entry) fresh.push(entry);
    else rejected.push(reason);
  }
  const verified = DRY ? new Set(fresh.map((e) => e.id)) : await verifyAll(fresh);
  // Named, not just counted: a theatre that did not answer is the thing a
  // person reading the log wants to look at.
  const unreachable = fresh.filter((e) => !verified.has(e.id)).map((e) => e.url);
  const { city, log } = mergeCity(existing, fresh, {
    today,
    verified,
    closed: Array.isArray(reply.closed) ? reply.closed : [],
  });
  city.engine = {
    model: DRY ? "fixture" : "seed:claude-code",
    run: new Date().toISOString(),
    searches: 0,
    notes: typeof reply.notes === "string" ? reply.notes.slice(0, 400) : "",
    rejected: rejected.slice(0, 10),
    unreachable: unreachable.slice(0, 10),
  };
  writeJson(file, city);
  console.log(
    `${meta.slug}: ${city.entries.length} entries (+${log.added} ~${log.updated} -${log.dropped}, ${log.unverified} unverified, ${unreachable.length} unreachable, ${rejected.length} rejected)`,
  );
  return { slug: meta.slug, entries: city.entries.length, ...log };
}

/**
 * --plan N: the cities due now and what to ask about each.
 *
 * The cycle is a cursor into cities.json, so ten cities twice a month
 * re-reads all sixty quarterly. Planning moves nothing: the cursor advances
 * only when a reading is imported, so a run that never finishes leaves the
 * same cities due next time.
 */
function printPlan() {
  const chosen = pickCities();
  const outDir = value("out");
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    for (const meta of chosen) {
      const existing = readJson(path.join(DIR, `${meta.slug}.json`), emptyCity(meta));
      fs.writeFileSync(path.join(outDir, `${meta.slug}.prompt.txt`), buildPrompt(meta, existing));
    }
  }
  console.log(
    JSON.stringify(
      {
        cursor: state.cursor,
        cities: chosen.map((c) => ({
          slug: c.slug,
          city: c.city,
          state: c.state,
          listed: readJson(path.join(DIR, `${c.slug}.json`), { entries: [] }).entries.length,
          prompt: outDir ? path.join(outDir, `${c.slug}.prompt.txt`) : undefined,
        })),
      },
      null,
      2,
    ),
  );
}

/** --prompt <slug>: what to ask about one city, on stdout. */
function printPrompt(slug) {
  const meta = cities.find((c) => c.slug === slug);
  if (!meta) {
    console.error(`${slug} is not a city in cities.json`);
    process.exit(1);
  }
  const existing = readJson(path.join(DIR, `${meta.slug}.json`), emptyCity(meta));
  console.log(buildPrompt(meta, existing));
}

/**
 * --seed <dir>: a folder of `<slug>.json` replies, one a city, imported
 * through the checks, the fetches and the merge. This is how every reading
 * arrives — the first pass over all sixty cities on 2026-10-01, and every
 * scheduled run since.
 *
 * The cycle advances past the last city imported, so the next plan is the
 * next ten. `--no-advance` leaves it alone, for a one-off re-read of named
 * cities that should not cost the cycle its place.
 */
async function seedFrom(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (!files.length) {
    console.error(`no .json replies in ${dir}`);
    process.exit(1);
  }
  fs.mkdirSync(DIR, { recursive: true });
  let done = 0;
  const seeded = [];
  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    const meta = cities.find((c) => c.slug === slug);
    if (!meta) {
      console.error(`${slug}: not a city in cities.json, skipped`);
      continue;
    }
    try {
      const reply = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      if (!Array.isArray(reply.entries)) throw new Error("no entries array");
      await runCity(meta, reply);
      seeded.push(slug);
      done++;
    } catch (err) {
      console.error(`${slug}: failed — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (seeded.length > 0 && !flag("no-advance")) {
    const last = Math.max(...seeded.map((slug) => indexOfSlug.get(slug)));
    state.cursor = (last + 1) % cities.length;
  }
  state.runs = [
    {
      date: today,
      model: "seed:claude-code",
      cities: seeded,
      searches: 0,
      failures: files.length - done,
    },
    ...(state.runs ?? []),
  ].slice(0, 60);
  writeJson(STATE_FILE, state);
  console.log(`seeded ${done} of ${files.length} cities, cursor at ${state.cursor}`);
  if (done === 0) process.exit(1);
}

/**
 * --check: fetch every listed website and take the dead ones off the pages.
 *
 * The reading is quarterly because improv theatres change at about that pace
 * (the owner, 2026-10-01). A website does not: it goes when the venue goes,
 * and a link that 404s is the worst thing a directory can show somebody who
 * is deciding where to turn up. This needs no research and no searches — it
 * is one fetch an entry — so it runs weekly and the slow reading stays safe.
 *
 * Two failed checks, not one: `reachable` already counts any HTTP answer and
 * retries three times, so one failure is a dead domain rather than a bad
 * minute, but a fortnight of them is the evidence worth acting on. An entry
 * that goes quiet is marked `unseen`, which keeps it in the file and takes it
 * off the page; if its site answers again it comes straight back.
 */
async function checkLinks() {
  let checked = 0;
  let hidden = 0;
  let restored = 0;
  let still = 0;
  for (const meta of cities) {
    const file = path.join(DIR, `${meta.slug}.json`);
    if (!fs.existsSync(file)) continue;
    const city = readJson(file, null);
    if (!city?.entries?.length) continue;
    const queue = [...city.entries];
    const workers = Array.from({ length: VERIFY_CONCURRENCY }, async () => {
      while (queue.length) {
        const entry = queue.shift();
        const ok = await reachable(entry.url);
        checked += 1;
        if (ok) {
          if (entry.status === "unseen") restored += 1;
          entry.status = "live";
          delete entry.deadChecks;
        } else {
          entry.deadChecks = (entry.deadChecks ?? 0) + 1;
          if (entry.deadChecks >= 2) {
            if (entry.status !== "unseen") hidden += 1;
            entry.status = "unseen";
          } else {
            entry.status = "unverified";
            still += 1;
          }
        }
      }
    });
    await Promise.all(workers);
    writeJson(file, city);
  }
  console.log(
    `checked ${checked} websites: ${hidden} taken off the pages, ${still} failing once, ${restored} back`,
  );
}

/** --dry: the fixture reply through the same checks and merge. No network. */
async function dryRun() {
  const chosen = pickCities();
  if (!chosen.length) {
    console.error("no cities chosen");
    process.exit(1);
  }
  for (const meta of chosen) await runCity(meta, fixtureReply(meta));
  console.log(`dry: ${chosen.length} cities, cursor untouched at ${state.cursor}`);
}

const USAGE = `The directory engine reads the web through the Claude session running it.

  --plan <n> [--out <dir>]   the cities due now, with a prompt file each
  --prompt <slug>            the prompt for one city
  --seed <dir>               import <slug>.json replies and advance the cycle
  --check                    fetch every listed website; hide the dead ones
  --dry --cities <slug>      the fixture through the same merge, no network

The runs are cloud schedules; docs/directory-engine-run.md is what they
follow.`;

async function main() {
  const seedDir = value("seed");
  if (seedDir) return seedFrom(seedDir);
  const promptSlug = value("prompt");
  if (promptSlug) return printPrompt(promptSlug);
  if (flag("plan") || flag("next")) return printPlan();
  if (flag("check")) return checkLinks();
  if (DRY) return dryRun();
  console.error(USAGE);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
