/**
 * The pure half of the directory engine: what a city file looks like, how a
 * reply from Claude is read, how an entry is checked, and how a fresh reading
 * is merged with what the archive already holds. No network and no
 * filesystem here, so the guards can hold every rule to a fixture
 * (src/lib/__tests__/directory-engine.test.ts).
 *
 * The archive is data/directory/<city>.json, one file a city, rewritten by
 * scripts/directory-engine.mjs on a daily cycle. Entries are keyed by the
 * organisation's domain, so a theatre that renames itself keeps its history
 * and a theatre that is not found three runs running is dropped — not on the
 * first miss, because a search is not a census.
 */

export const KINDS = ["shows", "classes", "jams"];

/**
 * @typedef {{
 *   id: string, name: string, url: string, kind: string[], area: string,
 *   summary: string, schedule: string, signals: string[], score: number,
 *   reasons: string, sources: string[], firstSeen?: string, lastSeen?: string,
 *   missingRuns?: number, status?: string, rank?: number
 * }} Entry
 * @typedef {{ run: string, added: number, updated: number, dropped: number, unverified: number, kept: number }} RunLog
 * @typedef {{ slug: string, city: string, state: string, stateCode: string, metro?: string[] }} CityMeta
 * @typedef {CityMeta & { updated: string | null, engine: object | null, entries: Entry[], log: RunLog[] }} CityFile
 */

/**
 * Sites that are never an organisation's own: listings, tickets, socials. An
 * entry whose website is one of these is dropped; the engine is told so and
 * rarely sends one, and this holds the rule when it does.
 */
export const AGGREGATOR_HOSTS = [
  "yelp.com",
  "eventbrite.com",
  "meetup.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "tripadvisor.com",
  "google.com",
  "yellowpages.com",
  "classpass.com",
  "groupon.com",
  "linktr.ee",
  "wikipedia.org",
  "reddit.com",
  "youtube.com",
  "ticketmaster.com",
  "goldstar.com",
];

/** How many runs an entry survives unseen before it is dropped. */
export const MISSING_RUNS_TO_DROP = 3;

/** A domain without its scheme, path or leading www, lower-cased: the entry's identity. */
export function normalizeDomain(url) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isAggregator(url) {
  const domain = normalizeDomain(url);
  if (!domain) return true;
  return AGGREGATOR_HOSTS.some((h) => domain === h || domain.endsWith(`.${h}`));
}

/**
 * The JSON object in a reply: the last fenced ```json block, or the outermost
 * braces when the model forgot the fence. Returns null rather than throwing on
 * prose, so a bad turn is logged and skipped instead of ending the run.
 */
export function parseEngineReply(text) {
  if (typeof text !== "string") return null;
  const fences = [...text.matchAll(/```(?:json)?\s*\n([\s\S]*?)```/g)];
  const candidates = fences.length ? fences.map((m) => m[1]) : [];
  if (!candidates.length) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));
  }
  for (const raw of candidates.reverse()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.entries)) return parsed;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

const clip = (s, n) => (typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, n) : "");

/**
 * One raw entry from the model into the archive's shape, or null with the
 * reason. Strict on the things a reader clicks (the website) and lenient on
 * prose (clipped, never rejected).
 *
 * @param {unknown} raw
 * @returns {{ entry: Entry | null, reason: string | null }}
 */
export function validateEntry(raw) {
  if (!raw || typeof raw !== "object") return { entry: null, reason: "not an object" };
  const name = clip(raw.name, 80);
  if (name.length < 2) return { entry: null, reason: "no name" };
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { entry: null, reason: `bad url for ${name}` };
  }
  if (!/^https?:$/.test(parsed.protocol)) return { entry: null, reason: `not http(s): ${name}` };
  if (isAggregator(url)) return { entry: null, reason: `aggregator site for ${name}` };
  const kind = Array.isArray(raw.kind)
    ? [...new Set(raw.kind.map((k) => String(k).toLowerCase()).filter((k) => KINDS.includes(k)))]
    : [];
  if (!kind.length) return { entry: null, reason: `no kind for ${name}` };
  const score = Number(raw.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { entry: null, reason: `score out of range for ${name}` };
  }
  const summary = clip(raw.summary, 240);
  if (summary.length < 20) return { entry: null, reason: `no summary for ${name}` };
  const sources = Array.isArray(raw.sources)
    ? raw.sources
        .filter((s) => typeof s === "string" && /^https?:\/\//.test(s))
        .map((s) => s.trim())
        .slice(0, 5)
    : [];
  const signals = Array.isArray(raw.signals)
    ? raw.signals
        .map((s) => clip(s, 120))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  return {
    entry: {
      id: normalizeDomain(url),
      name,
      url: parsed.toString(),
      kind: KINDS.filter((k) => kind.includes(k)),
      area: clip(raw.area, 60),
      summary,
      schedule: clip(raw.schedule, 120),
      signals,
      score: Math.round(score),
      reasons: clip(raw.reasons, 240),
      sources,
    },
    reason: null,
  };
}

/**
 * Best first, then by name, with `rank` written on each.
 * @param {Entry[]} entries
 * @returns {Entry[]}
 */
export function rankEntries(entries) {
  const sorted = [...entries].sort(
    (a, b) => b.score - a.score || a.name.localeCompare(b.name, "en"),
  );
  return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
}

/**
 * A fresh reading merged into a city file.
 *
 * `verified` says which fresh entries' websites answered. A fresh entry that
 * answered is written or updated; one that did not is kept as it was if the
 * archive already had it (marked `unverified`) and dropped if it is new — a
 * reader is never sent to a site nobody could reach. An entry the model did
 * not return this time keeps its place and counts a missing run; after
 * MISSING_RUNS_TO_DROP it goes. An entry the model reports closed goes at
 * once, and the log says so.
 *
 * @param {CityFile} existing
 * @param {Entry[]} fresh
 * @param {{ today: string, verified: Set<string>, closed?: Array<{ name?: string, url?: string, evidence?: string }> }} options
 * @returns {{ city: CityFile, log: RunLog }}
 */
export function mergeCity(existing, fresh, { today, verified, closed = [] }) {
  const before = new Map((existing.entries ?? []).map((e) => [e.id, e]));
  const seen = new Set();
  const next = new Map();
  const log = { run: today, added: 0, updated: 0, dropped: 0, unverified: 0, kept: 0 };
  const closedIds = new Set(closed.map((c) => normalizeDomain(c.url)).filter(Boolean));

  for (const entry of fresh) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    if (closedIds.has(entry.id)) continue;
    const old = before.get(entry.id);
    if (verified.has(entry.id)) {
      next.set(entry.id, {
        ...entry,
        firstSeen: old?.firstSeen ?? today,
        lastSeen: today,
        missingRuns: 0,
        status: "live",
      });
      if (old) log.updated++;
      else log.added++;
    } else if (old) {
      next.set(entry.id, { ...old, status: "unverified", missingRuns: 0 });
      log.unverified++;
    }
  }
  for (const [id, old] of before) {
    if (next.has(id)) continue;
    if (closedIds.has(id)) {
      log.dropped++;
      continue;
    }
    const missingRuns = (old.missingRuns ?? 0) + 1;
    if (missingRuns >= MISSING_RUNS_TO_DROP) {
      log.dropped++;
      continue;
    }
    next.set(id, { ...old, missingRuns, status: "unseen" });
    log.kept++;
  }
  const entries = rankEntries([...next.values()]);
  return {
    city: {
      ...existing,
      updated: today,
      entries,
      log: [log, ...(existing.log ?? [])].slice(0, 30),
    },
    log,
  };
}

/**
 * An empty city file, before the engine has read the city.
 * @param {CityMeta} meta
 * @returns {CityFile}
 */
export function emptyCity(meta) {
  return {
    slug: meta.slug,
    city: meta.city,
    state: meta.state,
    stateCode: meta.stateCode,
    updated: null,
    engine: null,
    entries: [],
    log: [],
  };
}

/**
 * What the engine asks. The rubric is the archive's: longevity and a
 * permanent home first, then a real class programme, then regular shows,
 * then standing, then whether the site is kept up — because the reader is
 * choosing where to spend a Tuesday night or eight weeks of evenings.
 */
export function buildPrompt(meta, existing) {
  const known = (existing.entries ?? []).map(
    (e) => `- ${e.name} — ${e.url} (${e.status ?? "live"})`,
  );
  const metro = meta.metro?.length
    ? ` The page covers the metro area too: ${meta.metro.join(", ")}.`
    : "";
  return [
    `Research improv in ${meta.city}, ${meta.state}, United States.${metro}`,
    "",
    "Find every organisation a person could go to for improv there: improv theatres, improv schools and training centres (including comedy clubs that run an improv class programme and community programmes with public enrolment), and recurring improv shows, jams or open mics that have their own website or a permanent page on a venue's site. Search the live web; do not rely on memory alone. Precision over recall: a real organisation with a working site beats a name you half remember. Never invent an organisation.",
    "",
    "Leave out: one-off events, festivals that have passed, closed venues (report those separately with evidence), stand-up-only clubs, listings sites, ticket sellers and social pages. The `url` must be the organisation's own website — never Yelp, Eventbrite, Meetup, Facebook, Instagram, Wikipedia or a ticket seller.",
    "",
    known.length
      ? `The archive already holds these; re-verify each (is it still running, is the site still live, has it moved), update it, and mark any that have closed:\n${known.join("\n")}`
      : "The archive holds nothing for this city yet.",
    "",
    "Score each entry 0–100 for someone choosing where to take a class or see a show: up to 35 for longevity and a permanent home (years running, a venue of its own), 25 for the class programme (levels, how often terms start, a path from beginner to performing), 20 for regular shows (weekly house shows, house teams, a calendar), 10 for standing (press, alumni, affiliations, size), 10 for the website being current (a schedule that shows this month). Say the reasons in one sentence.",
    "",
    "Return JSON only, in a ```json fence, exactly this shape:",
    "```json",
    JSON.stringify(
      {
        entries: [
          {
            name: "The organisation's name",
            url: "https://its-own-site.example/",
            kind: ["shows", "classes", "jams"],
            area: "Neighbourhood or town",
            summary: "One or two sentences on what it is and what it offers.",
            schedule: "When shows or classes run, if the site says (optional)",
            signals: ["Founded 2004", "Five class levels", "Shows Thursday to Saturday"],
            score: 87,
            reasons: "One sentence on the score.",
            sources: ["https://its-own-site.example/classes"],
          },
        ],
        closed: [
          {
            name: "A venue that has closed",
            url: "https://example.org/",
            evidence: "What said so",
          },
        ],
        notes: "Anything the archive should know about this city's scene in one or two sentences.",
      },
      null,
      2,
    ),
    "```",
    "",
    "Aim for everything you can verify, typically eight to twenty-five entries in a large city and three to ten in a small one; include the small independents, not only the famous names. `kind` lists what the organisation offers to the public: shows, classes, jams (drop-in jams or open mics).",
  ].join("\n");
}

/** A reply the engine can run on without the API, for --dry and the guards. */
export function fixtureReply(meta) {
  return {
    entries: [
      {
        name: `${meta.city} Improv Theatre`,
        url: `https://${meta.slug}-improv.example/`,
        kind: ["shows", "classes"],
        area: "Downtown",
        summary:
          "A fixture theatre with a class programme and weekend shows, used only when the engine runs dry.",
        schedule: "Shows Friday and Saturday",
        signals: ["Founded 2010", "Four class levels"],
        score: 80,
        reasons: "A fixture, scored for the merge to have something to rank.",
        sources: [`https://${meta.slug}-improv.example/classes`],
      },
      {
        name: `${meta.city} Jam`,
        url: `https://${meta.slug}-jam.example/`,
        kind: ["jams"],
        area: "Midtown",
        summary: "A fixture drop-in jam on Monday nights, used only when the engine runs dry.",
        signals: ["Weekly"],
        score: 55,
        reasons: "A fixture.",
        sources: [],
      },
    ],
    closed: [],
    notes: "Fixture data.",
  };
}
