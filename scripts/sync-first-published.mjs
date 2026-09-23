#!/usr/bin/env node
/**
 * Write down, for every content file, the date of the first commit that
 * added it — the record `src/lib/first-published.ts` reads at build time.
 *
 * `created` is a batch stamp: on the 205 atoms it takes nine values, 70 of
 * them the day of the initial commit and 79 earlier than the repository
 * exists, and it fed the concept pages' `datePublished` and the rank's age
 * divisor as if it were a date of writing (novel-insights 321). Git holds the
 * date the site first had each page, for every file added after the initial
 * commit; for the 79 atoms, 8 lessons and 2 paths the initial commit imported,
 * git knows only the import, and `created` stays the witness — the rule is in
 * `first-published.ts`, which reads this file and applies it.
 *
 * A file rather than a `git log` in the build because a deploy's clone is not
 * the repository: Vercel clones shallow, and on a shallow clone every file
 * looks added by the boundary commit. So the walk runs here, where the
 * history is whole, and `first-published.test.ts` fails when what is written
 * down disagrees with git — the same arrangement as `updated` and
 * `sync-content-dates.mjs`. A file missing from the record (added since the
 * last run) falls back to its `created`, which for a hand-written new file is
 * the right answer and for anything else is what this script corrects.
 *
 * Safe to re-run; a no-op when nothing has been added or renamed.
 *
 * Run: node scripts/sync-first-published.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";

import { firstAdditions, firstCommitDate } from "../src/lib/content-history.mjs";

const OUT = path.join(process.cwd(), "src", "lib", "first-published.json");
const DIRS = ["atoms", "bridges", "threads", "paths"].map((d) => `content/${d}`);
const dryRun = process.argv.includes("--dry-run");

const added = firstAdditions({ dirs: DIRS });
const files = Object.fromEntries(
  [...added]
    // Files the tree still has: git also remembers the ones since deleted.
    .filter(([file]) => file.endsWith(".md") && fs.existsSync(path.join(process.cwd(), file)))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([file, { date }]) => [file, date]),
);
const next = JSON.stringify({ firstCommit: firstCommitDate(), files }, null, 2) + "\n";

const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf-8") : "";
if (current === next) {
  console.log(`first-published.json is current (${Object.keys(files).length} files)`);
} else {
  if (!dryRun) fs.writeFileSync(OUT, next, "utf-8");
  console.log(
    `${dryRun ? "would write" : "wrote"} first-published.json: ${Object.keys(files).length} files, ` +
      `first commit ${firstCommitDate()}`,
  );
}
