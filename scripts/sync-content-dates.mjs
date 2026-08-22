#!/usr/bin/env node
/**
 * Bring each content file's `updated` date in line with when it actually changed.
 *
 * The sitemap sets `lastmod` from `updated ?? created`, and Google uses
 * `lastmod` to decide what is worth recrawling. 184 of 276 content files were
 * claiming nothing had changed since March or April — including all 144 atoms
 * that were rewritten with real heading structure, anchor ids, contents lists
 * and DefinedTerm markup. The pages had changed substantially and were telling
 * every crawler they had not, so there was no reason to come back and look.
 *
 * The date comes from git rather than from anyone remembering to bump it,
 * which is what drifted in the first place.
 *
 * Safe to re-run. It ignores commits that only touched the `updated:` line —
 * without that, running it after its own commit would mark every file as
 * changed today, forever.
 *
 * Run: npm run content:dates -- [--dry-run]
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const dryRun = process.argv.includes("--dry-run");

function git(args) {
  return execFileSync("git", args, { encoding: "utf-8", maxBuffer: 32 * 1024 * 1024 });
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

/** Files with uncommitted edits have no settled date yet. */
const dirty = new Set(
  git(["status", "--porcelain", "--", "content"])
    .split("\n")
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .filter(Boolean)
    .map((p) => path.resolve(p)),
);

/**
 * The last commit that changed something other than the `updated:` line.
 */
function lastRealChange(file) {
  const rel = path.relative(process.cwd(), file).split(path.sep).join("/");
  const log = git(["log", "--format=%H %ad", "--date=short", "--", rel]).trim();
  if (!log) return null;

  for (const line of log.split("\n")) {
    const [sha, date] = line.split(" ");
    const diff = git(["show", "--unified=0", "--format=", sha, "--", rel]);
    const changed = diff
      .split("\n")
      .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l))
      .map((l) => l.slice(1).trim());
    if (changed.some((l) => !/^updated:/.test(l))) return date;
  }
  return null;
}

const files = walk(CONTENT_DIR).sort();
let changed = 0;
let skipped = 0;

for (const file of files) {
  if (dirty.has(path.resolve(file))) {
    skipped += 1;
    continue;
  }

  const date = lastRealChange(file);
  if (!date) continue;

  const raw = fs.readFileSync(file, "utf-8");
  const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (!fm) continue;

  const current = /^updated:\s*"?([0-9-]+)"?/m.exec(fm[1])?.[1];
  // Never move a date backwards: an author who set a later one meant it.
  if (current && current >= date) continue;

  let next;
  if (current) {
    next = raw.replace(/^updated:\s*"?[0-9-]+"?/m, `updated: "${date}"`);
  } else if (/^created:/m.test(fm[1])) {
    next = raw.replace(/^(created:\s*"?[0-9-]+"?)/m, `$1\nupdated: "${date}"`);
  } else {
    continue;
  }

  console.log(`  ${current ?? "(none)"} -> ${date}  ${path.relative(process.cwd(), file)}`);
  if (!dryRun) fs.writeFileSync(file, next, "utf-8");
  changed += 1;
}

console.log(
  `\n${dryRun ? "would update" : "updated"} ${changed} of ${files.length} files` +
    (skipped ? `, skipped ${skipped} with uncommitted edits` : ""),
);
