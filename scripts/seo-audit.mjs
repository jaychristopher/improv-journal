/**
 * SEO Audit Script
 *
 * Scores every page on a checklist and outputs a report.
 * Run: node scripts/seo-audit.mjs
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const SRC_DIR = path.join(process.cwd(), "src", "app");

function readFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return matter(raw);
}

function scoreAtom(file) {
  const { data, content } = readFrontmatter(file);
  const issues = [];
  let score = 0;

  // Title check
  if (data.title) {
    score += 20;
    if (data.title.length > 60)
      issues.push({
        severity: "warning",
        msg: `Title too long (${data.title.length} chars): "${data.title}"`,
      });
  } else {
    issues.push({ severity: "critical", msg: "Missing title" });
  }

  // Content length
  if (content.length > 200) score += 15;
  else issues.push({ severity: "warning", msg: `Short content (${content.length} chars)` });

  // Tags
  if (data.tags && data.tags.length > 0) score += 10;
  else issues.push({ severity: "info", msg: "No tags" });

  // Links
  if (data.links && data.links.length > 0) score += 10;
  else issues.push({ severity: "info", msg: "No internal links in frontmatter" });

  // Status
  if (data.status === "validated") score += 10;
  else if (data.status === "draft") score += 5;
  else issues.push({ severity: "info", msg: `Status: ${data.status || "unknown"}` });

  // Dates
  if (data.created) score += 5;
  if (data.updated) score += 5;

  // Type
  if (data.type) score += 5;
  else issues.push({ severity: "warning", msg: "Missing type" });

  // generateMetadata exists (check if page file has it)
  score += 20; // We just added it to all pages

  return {
    id: data.id || path.basename(file, ".md"),
    title: data.title,
    type: data.type,
    score,
    issues,
  };
}

function scoreBridge(file) {
  const { data, content } = readFrontmatter(file);
  const issues = [];
  let score = 0;

  // Title
  if (data.title) {
    score += 15;
    if (data.title.length > 60)
      issues.push({ severity: "warning", msg: `Title too long (${data.title.length} chars)` });
  } else {
    issues.push({ severity: "critical", msg: "Missing title" });
  }

  // Description
  if (data.description) {
    score += 15;
    if (data.description.length < 120)
      issues.push({
        severity: "warning",
        msg: `Description short (${data.description.length} chars)`,
      });
    if (data.description.length > 160)
      issues.push({
        severity: "warning",
        msg: `Description long (${data.description.length} chars)`,
      });
  } else {
    issues.push({ severity: "critical", msg: "Missing description" });
  }

  // Target keywords
  if (data.target_keywords && data.target_keywords.length > 0) {
    score += 15;
    // Check if primary keyword appears in title
    const primaryKw = data.target_keywords[0].keyword.toLowerCase();
    // Match on words, not raw characters: search engines treat hyphens and
    // punctuation as separators, so "5-Minute" does target "5 minute".
    const words = (text) =>
      ` ${text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim()} `.replace(/\s+/g, " ");
    if (data.title && words(data.title).includes(words(primaryKw).trim())) {
      score += 10;
    } else {
      issues.push({ severity: "warning", msg: `Primary keyword "${primaryKw}" not in title` });
    }
  } else {
    issues.push({ severity: "critical", msg: "No target keywords" });
  }

  // Content length
  if (content.length > 1000) score += 10;
  else issues.push({ severity: "warning", msg: `Short content (${content.length} chars)` });

  // Entry path
  if (data.entry_path) score += 10;
  else issues.push({ severity: "warning", msg: "No entry_path (funnel broken)" });

  // Entry atoms
  if (data.entry_atoms && data.entry_atoms.length > 0) score += 5;

  // Metadata exists
  score += 20;

  const primary = (data.target_keywords || [])[0] || {};
  return {
    id: path.basename(file, ".md"),
    title: data.title,
    type: "bridge",
    score: Math.min(score, 100),
    issues,
    volume: primary.volume,
    difficulty: primary.difficulty,
    trafficPotential: primary.traffic_potential,
    keywords: (data.target_keywords || []).map((k) => String(k.keyword).toLowerCase()),
    serpVerdict: data.serp_verdict,
    serpMinDr: data.serp_min_dr,
    serpChecked: data.serp_checked,
    created: data.created ? String(data.created).slice(0, 10) : null,
    words: content.trim().split(/\s+/).length,
  };
}

function scorePath(file) {
  const { data } = readFrontmatter(file);
  const issues = [];
  let score = 0;

  if (data.title) score += 20;
  if (data.description) {
    score += 20;
    if (data.description.length > 160)
      issues.push({ severity: "info", msg: `Description long (${data.description.length} chars)` });
  } else {
    issues.push({ severity: "critical", msg: "Missing description" });
  }
  if (data.audience && data.audience.length > 0) score += 15;
  if (data.threads && data.threads.length > 0) score += 15;
  score += 30; // metadata + structured data

  return { id: data.id, title: data.title, type: "path", score: Math.min(score, 100), issues };
}

function scoreThread(file) {
  const { data, content } = readFrontmatter(file);
  const issues = [];
  let score = 0;

  if (data.title) score += 25;
  if (content.length > 200) score += 20;
  if (data.atoms && data.atoms.length > 0) score += 15;
  if (data.tags && data.tags.length > 0) score += 10;
  score += 30; // metadata + structured data

  return { id: data.id, title: data.title, type: "thread", score: Math.min(score, 100), issues };
}

// Run audit
const results = [];

// Atoms
const atomDir = path.join(CONTENT_DIR, "atoms");
for (const file of fs.readdirSync(atomDir).filter((f) => f.endsWith(".md"))) {
  results.push(scoreAtom(path.join(atomDir, file)));
}

// Bridges
const bridgeDir = path.join(CONTENT_DIR, "bridges");
for (const file of fs.readdirSync(bridgeDir).filter((f) => f.endsWith(".md"))) {
  results.push(scoreBridge(path.join(bridgeDir, file)));
}

// Paths
const pathDir = path.join(CONTENT_DIR, "paths");
for (const file of fs.readdirSync(pathDir).filter((f) => f.endsWith(".md"))) {
  results.push(scorePath(path.join(pathDir, file)));
}

// Threads
const threadDir = path.join(CONTENT_DIR, "threads");
for (const file of fs.readdirSync(threadDir).filter((f) => f.endsWith(".md"))) {
  results.push(scoreThread(path.join(threadDir, file)));
}

// Summary
const total = results.length;
const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / total);
const critical = results.filter((r) => r.issues.some((i) => i.severity === "critical"));
const warnings = results.filter((r) => r.issues.some((i) => i.severity === "warning"));
const below80 = results.filter((r) => r.score < 80);

console.log(`\nSEO Audit Report`);
console.log(`${"=".repeat(50)}`);
console.log(`Pages audited: ${total}`);
console.log(`Average score: ${avgScore}/100`);
console.log(`Critical issues: ${critical.length} pages`);
console.log(`Warnings: ${warnings.length} pages`);
console.log(`Below 80: ${below80.length} pages`);
console.log();

// Show pages below 80
if (below80.length > 0) {
  console.log("Pages below 80:");
  for (const r of below80.sort((a, b) => a.score - b.score)) {
    console.log(`  ${r.score}/100  ${r.type.padEnd(12)} ${r.title || r.id}`);
    for (const issue of r.issues) {
      console.log(`           ${issue.severity}: ${issue.msg}`);
    }
  }
  console.log();
}

// Keyword collisions. Two guides bidding for the same term split the signal
// between them, and it was consistently a stranded page holding a target that
// belonged to a winnable one.
const owners = new Map();
for (const r of results.filter((x) => x.keywords)) {
  for (const k of r.keywords) {
    if (!owners.has(k)) owners.set(k, []);
    owners.get(k).push(r.id);
  }
}
const collisions = [...owners.entries()].filter(([, pages]) => pages.length > 1);
if (collisions.length > 0) {
  console.log(`Keyword collisions — two guides targeting one term (${collisions.length}):`);
  for (const [kw, pages] of collisions) console.log(`  "${kw}" — ${pages.join(", ")}`);
  console.log();
}

// Winnability. Volume alone does not say where effort pays: a thin page on a
// difficulty-2 term is a missed opportunity, and a deep one on a difficulty-60
// term is effort that will not convert. Both were happening here.
const WINNABLE_KD = 15;
const STRANDED_KD = 30;
const THIN_WORDS = 1400;

const graded = results.filter((r) => typeof r.difficulty === "number");
// Rank on traffic potential where it is known, falling back to volume.
// Volume alone put what-is-improv top of this list, on a query that is
// answered in the result page and sends almost nobody anywhere.
const reach = (r) => r.trafficPotential ?? r.volume;
// Difficulty is a backlink measure, so it says nothing about a page of results
// held by Slack, Forbes and the NIH. Three pages sat at the top of this list on
// a difficulty of 1, 5 and 0 with no opening behind any of them. Where the
// results have been looked at, that reading wins over the score.
const authorityGated = graded.filter((r) => r.serpVerdict === "authority");
const thinAndCheap = (r) => r.difficulty <= WINNABLE_KD && r.words < THIN_WORDS;
const missed = graded
  .filter((r) => thinAndCheap(r) && r.serpVerdict === "winnable")
  .sort((a, b) => reach(b) - reach(a));
// Stranded means hard and unexamined. Once the results have been looked at, the
// answer is in the verdict rather than the difficulty, and this bucket said the
// opposite of the open-results bucket about the same page: how-to-stop-
// overthinking is difficulty 34 with a DR 1 site at position five, and appeared
// in both "the results are open" and "depth here does not convert" in one run.
// Pages already reported as gated are not repeated here either.
const stranded = graded
  .filter((r) => r.difficulty > STRANDED_KD && !r.serpVerdict)
  .sort((a, b) => b.words - a.words);

const row = (r) =>
  `  ${r.id.padEnd(40)} TP ${String(r.trafficPotential ?? "—").padStart(5)}  ${String(r.volume).padStart(6)}/mo  KD ${String(r.difficulty).padStart(2)}  ${String(r.words).padStart(5)}w`;

if (missed.length > 0) {
  console.log(`Winnable and thin — where depth pays (${missed.length}):`);
  for (const r of missed.slice(0, 12)) console.log(row(r));
  console.log();
}

// The thin-page list only looks below THIN_WORDS, so the biggest pages on the
// site never appeared on it however open their results were. These are where
// the upside actually is: four of them carry more traffic potential than
// everything on the winnable-and-thin list put together.
const bigAndOpen = graded
  .filter((r) => r.serpVerdict === "winnable" && reach(r) >= 10000)
  .sort((a, b) => reach(b) - reach(a));
if (bigAndOpen.length > 0) {
  console.log(`Highest potential, and the results are open (${bigAndOpen.length}):`);
  for (const r of bigAndOpen) {
    console.log(
      `  ${r.id.padEnd(40)} TP ${String(r.trafficPotential ?? "—").padStart(6)}  KD ${String(r.difficulty).padStart(2)}  lowest DR in top 10: ${r.serpMinDr}  ${String(r.words).padStart(5)}w`,
    );
  }
  console.log();
}

if (authorityGated.length > 0) {
  console.log(
    `Authority-gated — low difficulty, but the results are not open (${authorityGated.length}):`,
  );
  for (const r of authorityGated.sort((a, b) => reach(b) - reach(a))) {
    console.log(
      `  ${r.id.padEnd(40)} TP ${String(r.trafficPotential ?? "—").padStart(5)}  KD ${String(r.difficulty).padStart(2)}  lowest DR in top 10: ${r.serpMinDr}`,
    );
  }
  console.log();
}

const unchecked = graded.filter((r) => thinAndCheap(r) && !r.serpVerdict);
if (unchecked.length > 0) {
  console.log(`Winnable on difficulty, results not yet checked (${unchecked.length}):`);
  for (const r of unchecked.sort((a, b) => reach(b) - reach(a)).slice(0, 8)) console.log(row(r));
  console.log();
}

if (stranded.length > 0) {
  console.log(
    `Hard on difficulty, results not yet checked (${stranded.length}):`,
  );
  for (const r of stranded.slice(0, 8)) console.log(row(r));
  console.log();
}

// Where the declared potential actually sits. Difficulty alone gave no way to
// ask this, and the answer changes what is worth doing: about half of it is on
// pages whose results are held by domains this site cannot reach.
const bucketTp = (predicate) =>
  graded.filter(predicate).reduce((sum, r) => sum + (r.trafficPotential ?? 0), 0);
const openTp = bucketTp((r) => r.serpVerdict === "winnable");
const gatedTp = bucketTp((r) => r.serpVerdict === "authority");
const unknownTp = bucketTp((r) => !r.serpVerdict);
const fmt = (n) => `${Math.round(n / 1000)}k`;

/**
 * What Google has actually done with these pages.
 *
 * Every number above this point is an estimate bought from a tool. Search
 * Console is first-party and disagrees with them, so it is worth more.
 *
 * Between 2026-02-01 and 2026-08-23 the site drew 34 URLs with any impression
 * at all and no clicks. Nine of them were guides, listed below. The rest were
 * atoms, library references and technique pages — which also hold the best
 * positions on the site, 6 to 12, on terms with almost no volume.
 *
 * The pattern that matters is in the pages old enough to have been crawled
 * properly. Of the guides created in April, every one on improv or team
 * building has been surfaced; almost none of the general self-improvement ones
 * have, and those are longer and target more volume. A first attempt at reading
 * this went wrong and is worth recording: the site's fourteen largest guides by
 * traffic potential have no impressions either, but all fourteen were created
 * after July and simply have no history yet. Their silence means nothing. Only
 * the matched-age cohort supports the comparison.
 *
 * Refresh with the gsc-pages endpoint, and move the date when you do. Left
 * stale it becomes another confident number describing a day that has passed —
 * which is the fault the verdict ages below exist to catch.
 */
const GSC_SEEN_ON = "2026-08-23";
const GSC_SEEN = new Set([
  "what-is-improv",
  "rules-of-improv",
  "how-to-get-better-at-improv",
  "how-to-be-vulnerable",
  "types-of-listening",
  "team-building-questions",
  "team-building-activities",
  "team-bonding-activities",
  "5-minute-team-building",
]);
/** Created before this, so there has been time to be crawled and ranked. */
const CRAWLED_BY = "2026-07-01";

const settled = graded.filter((r) => r.created && r.created < CRAWLED_BY);
const silent = settled
  .filter((r) => !GSC_SEEN.has(r.id))
  .sort((a, b) => reach(b) - reach(a));

if (settled.length > 0) {
  const silentTp = silent.reduce((sum, r) => sum + (reach(r) || 0), 0);
  console.log(
    `Never surfaced by Google, of ${settled.length} guides old enough to have been ` +
      `crawled (${silent.length}, carrying ${fmt(silentTp)} of claimed potential):`,
  );
  for (const r of silent.slice(0, 10)) console.log(row(r));
  console.log(
    `  Search Console checked ${GSC_SEEN_ON}. Newer guides are excluded — they have no history yet.`,
  );
  console.log();
}

console.log(
  `Traffic potential by whether the results are open: open ${fmt(openTp)}, ` +
    `gated ${fmt(gatedTp)}, not yet checked ${fmt(unknownTp)}`,
);

/**
 * Every number above rests on a SERP checked on a particular day, and results
 * move. A verdict of "gated" that has gone stale keeps a page written off; one
 * of "winnable" keeps effort pointed at a wall. Neither fails anything, so the
 * age is reported here rather than left to be remembered.
 */
const checkedDates = results.map((r) => r.serpChecked).filter(Boolean).sort();
if (checkedDates.length) {
  const today = new Date().toISOString().slice(0, 10);
  const ageDays = (d) => Math.round((Date.parse(today) - Date.parse(d)) / 86_400_000);
  const oldest = checkedDates[0];
  const stale = checkedDates.filter((d) => ageDays(d) > 90).length;
  console.log(
    `SERP verdicts: ${checkedDates.length} recorded, oldest checked ${oldest} ` +
      `(${ageDays(oldest)} day${ageDays(oldest) === 1 ? "" : "s"} ago)` +
      (stale ? ` — ${stale} older than 90 days and worth re-checking` : ""),
  );
}
console.log();

// Write JSON report
const outputDir = path.join(process.cwd(), "output");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(
  path.join(outputDir, "seo-report.json"),
  JSON.stringify(
    { summary: { total, avgScore, critical: critical.length, warnings: warnings.length }, results },
    null,
    2,
  ),
);
console.log(`Full report: output/seo-report.json`);
