/**
 * Diagram priority — the work queue, ordered by how much traffic a page gets.
 *
 * Usage:
 *   node scripts/diagram-priority.mjs analytics.csv            # Ranked queue
 *   node scripts/diagram-priority.mjs analytics.csv --open     # Undrawn only
 *   node scripts/diagram-priority.mjs analytics.csv --limit 30
 *   node scripts/diagram-priority.mjs analytics.csv --json
 *
 * The rankings file is whatever Vercel Web Analytics exports: CSV, TSV or
 * JSON. Column names vary between exports, so the path and count columns are
 * matched by keyword rather than by position.
 *
 * Analytics reports URLs and the repo stores files, so the two are joined on
 * the final path segment. That join is reported, not assumed: anything that
 * fails to match, and any slug that matches more than one file, is listed at
 * the end rather than dropped, because a silently unmatched top page is
 * exactly the page this ordering exists to find.
 */

import fs from "fs";
import { readPages, readDeclines } from "./lib/diagram-pages.mjs";

const args = process.argv.slice(2);
const file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error("usage: node scripts/diagram-priority.mjs <rankings-file> [--open] [--limit N] [--json]");
  process.exit(1);
}

const flag = (name) => args.includes(`--${name}`);
const limit = Number(args[args.indexOf("--limit") + 1]) || Infinity;

/** Vercel exports CSV/TSV/JSON with inconsistent headers; match by keyword. */
function readRankings(source) {
  const raw = fs.readFileSync(source, "utf8").trim();
  if (raw.startsWith("[") || raw.startsWith("{")) {
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : (parsed.data ?? parsed.rows ?? []);
    return rows.map((row) => ({
      path: row.path ?? row.page ?? row.url ?? row.key,
      views: Number(row.views ?? row.pageviews ?? row.count ?? row.total ?? row.visitors ?? 0),
    }));
  }

  const lines = raw.split(/\r?\n/).filter(Boolean);
  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const cells = (line) => line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
  const header = cells(lines[0]).map((cell) => cell.toLowerCase());
  const pathCol = header.findIndex((cell) => /path|page|url|route/.test(cell));
  const viewCol = header.findIndex((cell) => /view|visit|count|total|hits/.test(cell));
  if (pathCol === -1 || viewCol === -1) {
    console.error(`could not find a path column and a count column in: ${header.join(", ")}`);
    process.exit(1);
  }
  return lines.slice(1).map((line) => {
    const row = cells(line);
    return { path: row[pathCol], views: Number(String(row[viewCol]).replace(/[^0-9.]/g, "")) || 0 };
  });
}

const pages = readPages();
const declined = readDeclines();

const byKey = new Map(pages.map((page) => [page.key, page]));
const bySlug = new Map();
for (const page of pages) {
  if (!bySlug.has(page.slug)) bySlug.set(page.slug, []);
  bySlug.get(page.slug).push(page);
}

const normalise = (value) =>
  String(value ?? "")
    .replace(/^https?:\/\/[^/]+/, "")
    .split(/[?#]/)[0]
    .replace(/\/+$/, "") || "/";

const rows = [];
const unmatched = [];
const ambiguous = [];

for (const entry of readRankings(file)) {
  const path = normalise(entry.path);
  const slug = path.split("/").pop() || "/";
  const candidates = byKey.has(path) ? [byKey.get(path)] : (bySlug.get(slug) ?? []);

  if (candidates.length === 0) {
    unmatched.push({ path, views: entry.views });
    continue;
  }
  if (candidates.length > 1) ambiguous.push({ path, keys: candidates.map((page) => page.key) });

  const page = candidates[0];
  rows.push({
    views: entry.views,
    path,
    key: page.key,
    file: page.file,
    diagrams: page.diagrams,
    declined: declined.get(page.key) ?? null,
  });
}

rows.sort((a, b) => b.views - a.views);
const shown = rows.filter((row) => !flag("open") || (row.diagrams === 0 && !row.declined)).slice(0, limit);

if (flag("json")) {
  console.log(JSON.stringify({ rows: shown, unmatched, ambiguous }, null, 2));
} else {
  console.log("views    diagrams  page");
  for (const row of shown) {
    const mark = row.declined ? "declined" : String(row.diagrams);
    console.log(String(row.views).padStart(7) + mark.padStart(10) + "  " + row.key);
  }

  const ranked = rows.length;
  const drawn = rows.filter((row) => row.diagrams > 0).length;
  const covered = rows.filter((row) => row.diagrams > 0 || row.declined).length;
  console.log(
    `\n${ranked} ranked pages matched a file. ${drawn} drawn, ${covered} covered ` +
      `(${((covered / ranked) * 100).toFixed(0)}%).`,
  );
  const top = rows.slice(0, 25);
  console.log(
    `Top 25 by traffic: ${top.filter((row) => row.diagrams > 0).length} drawn, ` +
      `${top.reduce((total, row) => total + row.diagrams, 0)} assets between them.`,
  );

  if (unmatched.length) {
    console.log(`\n${unmatched.length} ranked paths matched no file (highest first):`);
    for (const row of unmatched.sort((a, b) => b.views - a.views).slice(0, 15)) {
      console.log(String(row.views).padStart(7) + "  " + row.path);
    }
  }
  if (ambiguous.length) {
    console.log(`\n${ambiguous.length} ranked paths matched more than one file:`);
    for (const row of ambiguous.slice(0, 10)) console.log(`  ${row.path} -> ${row.keys.join(", ")}`);
  }
}
