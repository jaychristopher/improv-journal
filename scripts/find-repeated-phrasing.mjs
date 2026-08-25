#!/usr/bin/env node
/**
 * Reports formulations that appear verbatim on three or more pages.
 *
 * This complements prose-overlap rather than duplicating it. That guard
 * measures one pair of pages at a time against an 8% share of the smaller,
 * which catches a block of advice that migrated between two guides. It cannot
 * see a single distinctive sentence spread thinly across five or ten pages,
 * because no individual pair ever crosses the threshold.
 *
 * What it does not catch, and the reason it exists as a script rather than a
 * test: paraphrase. The site briefly stated one diagnostic — would your next
 * line have been different if the offer had never been made — on three of its
 * most-cited pages in three different wordings, and nothing automated found
 * it. Reading the neighbouring pages is still the only defence against that.
 *
 * Run: node scripts/find-repeated-phrasing.mjs [minPages]
 *
 * Most of what it reports is legitimate, which is why this is a report and not
 * an assertion. Four categories are expected and filtered out below; a fifth
 * is expected and deliberately left in.
 */
import fs from "node:fs";

const N = 6;
const MIN_PAGES = Number(process.argv[2] ?? 3);

/**
 * Repetition the site intends.
 *
 * - The closing footer appears on every guide by design.
 * - Sources lines repeat citation strings because the same works are cited.
 * - The path and framework pointers are navigation, not prose.
 *
 * Not filtered, though it shows up: guides describe the same exercises in
 * full. That is deliberate — the improv-skills category is written so a
 * reader can run something without following a link — so those hits are
 * reported and should be ignored unless a page is restating an exercise it
 * has no reason to cover.
 */
const EXPECTED =
  /knowledge graph|physics of connection|explore the|full framework|full system|draws on the|this page is about the book/;

const files = [];
for (const dir of ["content/atoms", "content/bridges", "content/threads"]) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) files.push(`${dir}/${f}`);
}

const where = new Map();
for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const body = raw
    .split(/^---$/m)
    .slice(2)
    .join("---")
    .split(/## Specific sources?/)[0] // citation strings are meant to repeat
    .replace(/`[^`]+`/g, " ") // concept refs are meant to repeat
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed.length < 50) continue;
    const words = trimmed
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (let i = 0; i + N <= words.length; i++) {
      const key = words.slice(i, i + N).join(" ");
      if (!where.has(key)) where.set(key, new Set());
      where.get(key).add(file.split("/").pop().replace(".md", ""));
    }
  }
}

const hits = [...where.entries()]
  .filter(([phrase, pages]) => pages.size >= MIN_PAGES && !EXPECTED.test(phrase))
  .sort((a, b) => b[1].size - a[1].size);

if (hits.length === 0) {
  console.log(`No ${N}-word run appears on ${MIN_PAGES}+ pages outside the expected set.`);
  process.exit(0);
}

console.log(`${N}-word runs on ${MIN_PAGES}+ pages (expected repetition filtered):\n`);
for (const [phrase, pages] of hits) {
  console.log(`  ${pages.size}x  "${phrase}"`);
  console.log(`        ${[...pages].sort().join(", ")}`);
}
console.log(
  `\n${hits.length} reported. Judge each one: a shared exercise description or a` +
    ` quoted line is fine, the same claim argued from scratch on several pages is not.`,
);
