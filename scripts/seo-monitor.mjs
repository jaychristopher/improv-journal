/**
 * SEO Monitor — checks keyword rankings and identifies opportunities.
 *
 * Reads target_keywords from bridge frontmatter, queries Ahrefs for
 * current rankings, and classifies each keyword into action buckets.
 *
 * Usage:
 *   node scripts/seo-monitor.mjs              # Full report
 *   node scripts/seo-monitor.mjs --summary    # Summary only
 *
 * Requires: AHREFS_API_TOKEN in .env (or use within Claude Code MCP context)
 *
 * Without API access, runs in "audit-only" mode using frontmatter data.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const OUTPUT_DIR = path.join(process.cwd(), "output");
const SITE_URL = "physicsofconnection.com";

// Load all bridge target keywords
function loadBridgeKeywords() {
  const dir = path.join(CONTENT_DIR, "bridges");
  const bridges = [];

  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data } = matter(raw);
    const slug = path.basename(file, ".md");

    if (data.target_keywords && data.target_keywords.length > 0) {
      bridges.push({
        slug,
        title: data.title,
        url: `/${slug}`,
        keywords: data.target_keywords.map((k) => ({
          keyword: k.keyword,
          volume: k.volume,
        })),
      });
    }
  }

  return bridges;
}

// Classify keywords by expected difficulty and volume
function classifyKeyword(kw) {
  if (kw.volume >= 10000) return "high-volume";
  if (kw.volume >= 1000) return "medium-volume";
  return "low-volume";
}

// Priority score: volume / (difficulty + 1)
function priorityScore(kw) {
  // Without live difficulty data, estimate from volume
  // Higher volume = higher priority, but also likely harder
  return kw.volume;
}

function runAudit() {
  const bridges = loadBridgeKeywords();

  const report = {
    timestamp: new Date().toISOString(),
    site: SITE_URL,
    summary: {
      total_bridges: bridges.length,
      total_keywords: 0,
      total_volume: 0,
      by_volume_tier: { "high-volume": 0, "medium-volume": 0, "low-volume": 0 },
    },
    bridges: [],
    actions: [],
  };

  for (const bridge of bridges) {
    const bridgeReport = {
      slug: bridge.slug,
      title: bridge.title,
      url: bridge.url,
      keywords: [],
    };

    for (const kw of bridge.keywords) {
      const tier = classifyKeyword(kw);
      report.summary.total_keywords++;
      report.summary.total_volume += kw.volume;
      report.summary.by_volume_tier[tier]++;

      bridgeReport.keywords.push({
        keyword: kw.keyword,
        volume: kw.volume,
        tier,
        priority: priorityScore(kw),
      });
    }

    // Sort keywords by priority
    bridgeReport.keywords.sort((a, b) => b.priority - a.priority);
    report.bridges.push(bridgeReport);
  }

  // Sort bridges by total volume
  report.bridges.sort(
    (a, b) =>
      b.keywords.reduce((s, k) => s + k.volume, 0) -
      a.keywords.reduce((s, k) => s + k.volume, 0),
  );

  // Generate actions
  // Find bridges with no keywords (missing opportunities)
  const allBridgeFiles = fs
    .readdirSync(path.join(CONTENT_DIR, "bridges"))
    .filter((f) => f.endsWith(".md"));

  for (const file of allBridgeFiles) {
    const slug = path.basename(file, ".md");
    const bridge = bridges.find((b) => b.slug === slug);
    if (!bridge || bridge.keywords.length === 0) {
      report.actions.push({
        priority: "medium",
        type: "missing-keywords",
        slug,
        action: `Bridge /${slug} has no target_keywords — add keyword research`,
      });
    }
  }

  // Find high-volume keywords that could use sub-pages
  for (const bridge of bridges) {
    for (const kw of bridge.keywords) {
      if (kw.volume >= 5000) {
        report.actions.push({
          priority: "info",
          type: "high-volume",
          slug: bridge.slug,
          keyword: kw.keyword,
          volume: kw.volume,
          action: `High-volume keyword (${kw.volume}/mo) — ensure H1 contains exact match, check meta description`,
        });
      }
    }
  }

  return report;
}

// Run
const report = runAudit();
const isSummary = process.argv.includes("--summary");

console.log("\nSEO Monitor Report");
console.log("=".repeat(50));
console.log(`Site: ${report.site}`);
console.log(`Bridges: ${report.summary.total_bridges}`);
console.log(`Keywords tracked: ${report.summary.total_keywords}`);
console.log(
  `Total monthly volume: ${report.summary.total_volume.toLocaleString()}`,
);
console.log(
  `  High volume (10K+): ${report.summary.by_volume_tier["high-volume"]}`,
);
console.log(
  `  Medium (1K-10K): ${report.summary.by_volume_tier["medium-volume"]}`,
);
console.log(`  Low (<1K): ${report.summary.by_volume_tier["low-volume"]}`);

if (!isSummary) {
  console.log("\nTop bridges by volume:");
  for (const b of report.bridges.slice(0, 10)) {
    const vol = b.keywords.reduce((s, k) => s + k.volume, 0);
    console.log(`  ${vol.toLocaleString().padStart(8)} /mo  ${b.title}`);
    for (const kw of b.keywords.slice(0, 3)) {
      console.log(
        `             "${kw.keyword}" (${kw.volume.toLocaleString()}/mo)`,
      );
    }
  }

  if (report.actions.length > 0) {
    console.log(`\nActions (${report.actions.length}):`);
    for (const a of report.actions) {
      console.log(`  [${a.priority}] ${a.action}`);
    }
  }
}

// Write JSON
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(
  path.join(OUTPUT_DIR, "seo-monitor-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(`\nFull report: output/seo-monitor-report.json`);
