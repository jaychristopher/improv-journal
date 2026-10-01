#!/usr/bin/env node
/**
 * The directory engine.
 *
 * Claude reads the live web for a city's improv theatres, schools and
 * recurring shows, the script verifies every website answers, merges the
 * reading with what data/directory/<city>.json already holds, ranks the
 * entries by the archive's rubric, and writes the file. A GitHub Actions
 * workflow (.github/workflows/directory-engine.yml) runs it every day on the
 * next few cities of the cycle and commits whatever changed, so the archive
 * keeps itself without anybody opening it.
 *
 *   node scripts/directory-engine.mjs --next 10            the daily run: the next ten cities on the cycle
 *   node scripts/directory-engine.mjs --cities chicago,austin
 *   node scripts/directory-engine.mjs --all                 every city (the first seed)
 *   node scripts/directory-engine.mjs --dry --cities chicago   no API, no network: the fixture reply through the same merge
 *
 * Env: ANTHROPIC_API_KEY (required unless --dry); DIRECTORY_MODEL (default
 * claude-sonnet-5); DIRECTORY_MAX_SEARCHES per city (default 12). The web
 * search tool is billed per search on top of tokens, so --next keeps a run
 * to a few cities and the cycle re-reads every city in about a week.
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
  parseEngineReply,
  validateEntry,
} from "./lib/directory.mjs";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "data", "directory");
const CITIES_FILE = path.join(DIR, "cities.json");
const STATE_FILE = path.join(DIR, "engine-state.json");
const MODEL = process.env.DIRECTORY_MODEL || "claude-sonnet-5";
const MAX_SEARCHES = Number(process.env.DIRECTORY_MAX_SEARCHES || 12);
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

/** Which cities this run reads, and where the cursor lands afterwards. */
function pickCities() {
  if (flag("all")) return { chosen: cities, cursor: 0 };
  const named = value("cities");
  if (named) {
    const want = new Set(
      named
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
    const chosen = cities.filter((c) => want.has(c.slug));
    const missing = [...want].filter((s) => !cities.some((c) => c.slug === s));
    if (missing.length) console.error(`unknown cities: ${missing.join(", ")}`);
    return { chosen, cursor: state.cursor };
  }
  const n = Math.max(1, Number(value("next") || 10));
  const start = state.cursor % cities.length;
  const chosen = [];
  for (let i = 0; i < Math.min(n, cities.length); i++)
    chosen.push(cities[(start + i) % cities.length]);
  return { chosen, cursor: (start + chosen.length) % cities.length };
}

/** Ask Claude, continuing through pause_turn, and return the text it wrote. */
async function askClaude(client, meta, existing) {
  const tools = [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: MAX_SEARCHES,
      user_location: { type: "approximate", city: meta.city, region: meta.state, country: "US" },
    },
  ];
  const system =
    "You are the research engine for an archive of improv theatres, schools and recurring improv shows in United States cities. You search the live web and return only organisations that exist now, with their own websites. Precision over recall. Output JSON only, in a single ```json fence.";
  const messages = [{ role: "user", content: buildPrompt(meta, existing) }];
  let searches = 0;
  for (let turn = 0; turn < 6; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system,
      tools,
      messages,
    });
    searches += response.usage?.server_tool_use?.web_search_requests ?? 0;
    if (response.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
    return { text, searches };
  }
  throw new Error("the search turn never finished");
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
 * One city through the engine. `seeded` is a reply already in hand — the
 * first reading, made by Claude in a session rather than through the API
 * (--seed) — which skips the search and takes the same road from there:
 * every entry checked, every site fetched, merged and ranked.
 */
async function runCity(client, meta, seeded = null) {
  const file = path.join(DIR, `${meta.slug}.json`);
  const existing = readJson(file, emptyCity(meta));
  let reply;
  let searches = 0;
  if (seeded) {
    reply = seeded;
  } else if (DRY) {
    reply = fixtureReply(meta);
  } else {
    const asked = await askClaude(client, meta, existing);
    searches = asked.searches;
    reply = parseEngineReply(asked.text);
    if (!reply) throw new Error("no JSON in the reply");
  }
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
    model: seeded ? "seed:claude-code" : DRY ? "fixture" : MODEL,
    run: new Date().toISOString(),
    searches,
    notes: typeof reply.notes === "string" ? reply.notes.slice(0, 400) : "",
    rejected: rejected.slice(0, 10),
    unreachable: unreachable.slice(0, 10),
  };
  writeJson(file, city);
  console.log(
    `${meta.slug}: ${city.entries.length} entries (+${log.added} ~${log.updated} -${log.dropped}, ${log.unverified} unverified, ${unreachable.length} unreachable, ${rejected.length} rejected), ${searches} searches`,
  );
  return { slug: meta.slug, searches, entries: city.entries.length, ...log };
}

/**
 * --seed <dir>: a folder of <slug>.json replies made by Claude in a session,
 * one a city, imported through the same checks, fetches and merge as an API
 * reading. The first pass over all sixty cities was made this way on
 * 2026-10-01, before the Actions secret existed.
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
      await runCity(null, meta, reply);
      done++;
    } catch (err) {
      console.error(`${slug}: failed — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  state.runs = [
    {
      date: today,
      model: "seed:claude-code",
      cities: files.map((f) => f.replace(/\.json$/, "")),
      searches: 0,
      failures: files.length - done,
    },
    ...(state.runs ?? []),
  ].slice(0, 60);
  writeJson(STATE_FILE, state);
  console.log(`seeded ${done} of ${files.length} cities`);
  if (done === 0) process.exit(1);
}

async function main() {
  const seedDir = value("seed");
  if (seedDir) return seedFrom(seedDir);
  const { chosen, cursor } = pickCities();
  if (!chosen.length) {
    console.error("no cities chosen");
    process.exit(1);
  }
  let client = null;
  if (!DRY) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY is not set (use --dry to run without the API)");
      process.exit(1);
    }
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    client = new Anthropic();
  }
  fs.mkdirSync(DIR, { recursive: true });
  const results = [];
  let failures = 0;
  for (const meta of chosen) {
    try {
      results.push(await runCity(client, meta));
    } catch (err) {
      failures++;
      console.error(`${meta.slug}: failed — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (!flag("cities")) state.cursor = cursor;
  state.runs = [
    {
      date: today,
      model: DRY ? "fixture" : MODEL,
      cities: chosen.map((c) => c.slug),
      searches: results.reduce((n, r) => n + r.searches, 0),
      failures,
    },
    ...(state.runs ?? []),
  ].slice(0, 60);
  writeJson(STATE_FILE, state);
  console.log(`done: ${results.length} of ${chosen.length} cities, cursor at ${state.cursor}`);
  if (results.length === 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
