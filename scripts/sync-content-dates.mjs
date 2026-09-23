#!/usr/bin/env node
/**
 * Bring each content file's `updated` date in line with when its prose last
 * changed.
 *
 * The sitemap sets `lastmod` from `updated ?? created`, ArticleJsonLd emits it
 * as dateModified, and every article shows it as "Updated 24 August 2026".
 * Nothing bumps it by hand, so it drifts: 184 of 276 content files once
 * claimed nothing had changed since March or April after every atom had been
 * rewritten (novel-insights 188). The date comes from git rather than from
 * anyone remembering, which is what drifted in the first place.
 *
 * The rule: `updated` is the date of the newest commit that changed a prose
 * line of the file. A changed line is prose unless it is the `updated:` line
 * itself, a markdown image line (`![alt](src)`), a standalone italic line
 * (`*...*` — a figure caption or an italic footer), or blank. The first
 * exclusion stops this script's own commit from counting as a change and
 * re-dating every file to the sync date, forever. The other three stop a
 * figure from re-dating the words: the diagram programme of 29–30 August added
 * an image and a caption to 194 atoms whose prose was finished on the 24th,
 * and under "any body line" 220 of 308 pages dated the illustration rather
 * than the argument (novel-insights 239). The rule lives in
 * `src/lib/content-history.mjs`, and `updated-matches-history.test.ts` walks
 * the same history with it.
 *
 * The date moves in both directions. An earlier version refused to move one
 * backwards, on the theory that an author who set a later date meant it; the
 * 220 later dates of entry 239 are what that produced, and none of them was
 * set by an author. The field is derived, and git is what it is derived from.
 * It is never set before `created`, since content-dates forbids that.
 *
 * Files with uncommitted edits are skipped by default: their settled date is
 * the commit's, which has not happened. `--include-dirty` processes the ones
 * whose uncommitted edits are not prose under the rule — a working tree full
 * of re-dated `updated:` lines, say — still touching only the `updated:`
 * line. A file with uncommitted prose changes is skipped either way and
 * counted, since the date it will settle on is the commit's; re-run after
 * committing, and the test will say so if that is forgotten.
 *
 * Safe to re-run.
 *
 * Run: npm run content:dates -- [--dry-run] [--include-dirty]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { lastProseChanges, uncommittedProseChanges } from "../src/lib/content-history.mjs";

const CONTENT_DIR = path.join(process.cwd(), "content");
const dryRun = process.argv.includes("--dry-run");
const includeDirty = process.argv.includes("--include-dirty");

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

const toRel = (file) => path.relative(process.cwd(), file).split(path.sep).join("/");

/** Files with uncommitted edits have no settled date yet. */
const dirty = new Set(
  execFileSync("git", ["status", "--porcelain", "--", "content"], { encoding: "utf-8" })
    .split("\n")
    .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
    .filter(Boolean),
);

const history = lastProseChanges({ dirs: ["content"] });
const pendingProse = includeDirty ? uncommittedProseChanges({ dirs: ["content"] }) : new Set();

const files = walk(CONTENT_DIR).sort();
let changed = 0;
let earlier = 0;
let later = 0;
let skipped = 0;
let pending = 0;

for (const file of files) {
  const rel = toRel(file);
  if (dirty.has(rel)) {
    if (!includeDirty) {
      skipped += 1;
      continue;
    }
    if (pendingProse.has(rel)) {
      pending += 1;
      continue;
    }
  }

  const last = history.get(rel);
  if (!last) continue;

  const raw = fs.readFileSync(file, "utf-8");
  const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (!fm) continue;

  const created = /^created:\s*"?([0-9-]+)"?/m.exec(fm[1])?.[1];
  const current = /^updated:\s*"?([0-9-]+)"?/m.exec(fm[1])?.[1];
  const date = created && last.date < created ? created : last.date;
  if (current === date) continue;

  let next;
  if (current) {
    next = raw.replace(/^updated:\s*"?[0-9-]+"?/m, `updated: "${date}"`);
  } else if (created) {
    next = raw.replace(/^(created:\s*"?[0-9-]+"?)/m, `$1\nupdated: "${date}"`);
  } else {
    continue;
  }

  console.log(`  ${current ?? "(none)"} -> ${date}  ${rel}`);
  if (!dryRun) fs.writeFileSync(file, next, "utf-8");
  changed += 1;
  if (current && date < current) earlier += 1;
  else later += 1;
}

console.log(
  `\n${dryRun ? "would update" : "updated"} ${changed} of ${files.length} files` +
    ` (${earlier} earlier, ${later} later)` +
    (skipped ? `, skipped ${skipped} with uncommitted edits` : "") +
    (pending
      ? `, skipped ${pending} with uncommitted prose changes (re-run after committing)`
      : ""),
);
