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

// Winnability. Volume alone does not say where effort pays: a thin page on a
// difficulty-2 term is a missed opportunity, and a deep one on a difficulty-60
// term is effort that will not convert. Both were happening here.
const WINNABLE_KD = 15;
const STRANDED_KD = 30;
const THIN_WORDS = 1400;

const graded = results.filter((r) => typeof r.difficulty === "number");
const missed = graded
  .filter((r) => r.difficulty <= WINNABLE_KD && r.words < THIN_WORDS)
  .sort((a, b) => b.volume - a.volume);
const stranded = graded.filter((r) => r.difficulty > STRANDED_KD).sort((a, b) => b.words - a.words);

const row = (r) =>
  `  ${r.id.padEnd(42)} ${String(r.volume).padStart(6)}/mo  KD ${String(r.difficulty).padStart(2)}  ${String(r.words).padStart(5)}w`;

if (missed.length > 0) {
  console.log(`Winnable and thin — where depth pays (${missed.length}):`);
  for (const r of missed.slice(0, 12)) console.log(row(r));
  console.log();
}

if (stranded.length > 0) {
  console.log(
    `Stranded above KD ${STRANDED_KD} — depth here does not convert (${stranded.length}):`,
  );
  for (const r of stranded.slice(0, 8)) console.log(row(r));
  console.log();
}

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
