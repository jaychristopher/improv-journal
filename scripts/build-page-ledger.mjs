#!/usr/bin/env node
/**
 * Builds docs/page-ledger.json (source of truth) and docs/page-ledger.md (human index)
 * by enumerating every rendered page on the site.
 *
 * Idempotent: when re-run, preserves existing per-URL research/recommendations/decisions
 * fields and only refreshes the page list, titles, descriptions, and current keywords.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { glob } from "glob";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const CONTENT_DIR = path.join(ROOT, "content");
const LEDGER_JSON = path.join(ROOT, "docs", "page-ledger.json");
const LEDGER_MD = path.join(ROOT, "docs", "page-ledger.md");

const ATOM_URL_BY_TYPE = {
  law: (id) => `/how-it-works/${id}`,
  insight: (id) => `/how-it-works/${id}`,
  principle: (id) => `/how-it-works/principles/${id}`,
  antipattern: (id) => `/how-it-works/diagnosis/${id}`,
  pattern: (id) => `/how-it-works/diagnosis/${id}`,
  framework: (id) => `/how-it-works/diagnosis/${id}`,
  exercise: (id) => `/practice/exercises/${id}`,
  technique: (id) => `/practice/techniques/${id}`,
  pedagogy: (id) => `/practice/techniques/${id}`,
  format: (id) => `/practice/formats/${id}`,
  definition: (id) => `/practice/vocabulary/${id}`,
  reference: (id) => `/library/${id}`,
};

const ATOM_CATEGORY_BY_TYPE = {
  law: "atom-law",
  insight: "atom-insight",
  principle: "atom-principle",
  antipattern: "atom-diagnosis",
  pattern: "atom-diagnosis",
  framework: "atom-diagnosis",
  exercise: "atom-exercise",
  technique: "atom-technique",
  pedagogy: "atom-technique",
  format: "atom-format",
  definition: "atom-vocabulary",
  reference: "atom-reference",
};

const PICKER_LEVELS = ["beginner", "intermediate", "advanced"];
const PICKER_FOCUSES = ["presence", "ensemble", "emotion", "courage", "physicality", "recovery"];
const TRADITIONS = ["johnstone", "spolin", "close", "ucb", "annoyance"];
const AUDIENCES = ["beginner", "intermediate", "teacher", "performer", "advanced"];

function relativePath(absolute) {
  return path.relative(ROOT, absolute).split(path.sep).join("/");
}

async function loadFrontmatterFiles(subdir) {
  const files = await glob(`${subdir}/*.md`, { cwd: CONTENT_DIR, absolute: true });
  return files.map((file) => {
    const raw = fs.readFileSync(file, "utf8");
    const { data, content } = matter(raw);
    return { file, data, content };
  });
}

function summarize(content, max = 200) {
  const stripped = content
    .replace(/^---[\s\S]*?---/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= max) return stripped;
  return stripped.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function emptyEntryShape() {
  return {
    status: "pending",
    research: {
      completed_at: null,
      primary_intent: null,
      user_questions: [],
      top_queries: [],
      search_volume_data: null,
      competitor_titles: [],
      gap_analysis: null,
      alignment_score: null,
      sources: [],
      notes: null,
    },
    recommendations: {
      title_changes: null,
      structural_changes: null,
      content_additions: null,
      content_removals: null,
      priority: null,
    },
    decisions: {
      approved: null,
      decided_at: null,
      notes: null,
    },
  };
}

function indexPage(url, title, description) {
  return {
    url,
    title,
    description: description ?? null,
    category: "index",
    content_path: null,
    current_target_keywords: [],
  };
}

async function buildPages() {
  const pages = [];

  // --- Static index / landing pages ---
  const staticIndexes = [
    ["/", "Home", "Landing page"],
    ["/paths", "Paths Index", "All learning paths"],
    ["/search", "Search", "Site search"],
    ["/how-it-works", "How It Works", "Laws, principles, and diagnosis hub"],
    ["/how-it-works/principles", "Principles Index", "The 8 principles overview"],
    ["/how-it-works/diagnosis", "Diagnosis Index", "Patterns, antipatterns, frameworks"],
    ["/library", "Library", "Reference texts cited across the graph"],
    ["/listen", "Listen", "Podcasts hub"],
    ["/practice", "Practice", "Practice hub"],
    ["/practice/exercises", "Exercises Index", "All exercises"],
    ["/practice/formats", "Formats Index", "All longform formats"],
    ["/practice/techniques", "Techniques Index", "All techniques and pedagogy"],
    ["/practice/vocabulary", "Vocabulary Index", "All definitions"],
    ["/traditions", "Traditions Index", "Five major improv traditions"],
    ["/guides", "Guides", "All bridge guides"],
    ["/improv-games", "Improv Games", "Games landing"],
    ["/resources", "Resources", "External resources"],
    ["/tools/exercise-picker", "Exercise Picker", "Pick exercises by level and focus"],
  ];
  for (const [url, title, desc] of staticIndexes) {
    pages.push(indexPage(url, title, desc));
  }

  // --- Tools: exercise-picker matrix ---
  for (const level of PICKER_LEVELS) {
    pages.push({
      url: `/tools/exercise-picker/${level}`,
      title: `Exercise Picker — ${level}`,
      description: `Exercises filtered by level: ${level}`,
      category: "tool-picker",
      content_path: null,
      current_target_keywords: [],
    });
    for (const focus of PICKER_FOCUSES) {
      pages.push({
        url: `/tools/exercise-picker/${level}/${focus}`,
        title: `Exercise Picker — ${level} / ${focus}`,
        description: `Exercises filtered by level: ${level}, focus: ${focus}`,
        category: "tool-picker",
        content_path: null,
        current_target_keywords: [],
      });
    }
  }

  // --- Traditions ---
  for (const tradition of TRADITIONS) {
    pages.push({
      url: `/traditions/${tradition}`,
      title: `Tradition — ${tradition}`,
      description: `Tradition page: ${tradition}`,
      category: "tradition",
      content_path: null,
      current_target_keywords: [],
    });
  }

  // --- Learn / audience ---
  for (const audience of AUDIENCES) {
    pages.push({
      url: `/learn/${audience}`,
      title: `Learn — ${audience}`,
      description: `Audience landing: ${audience}`,
      category: "audience",
      content_path: null,
      current_target_keywords: [],
    });
  }

  // --- Bridges (top-level slugs) ---
  const bridges = await loadFrontmatterFiles("bridges");
  for (const { file, data, content } of bridges) {
    const slug = data.id ?? path.basename(file, ".md");
    const keywords =
      Array.isArray(data.target_keywords)
        ? data.target_keywords
            .map((k) => (typeof k === "string" ? k : k?.keyword))
            .filter(Boolean)
        : [];
    pages.push({
      url: `/${slug}`,
      title: data.title ?? slug,
      description: data.description ?? summarize(content),
      category: "bridge",
      content_path: relativePath(file),
      current_target_keywords: keywords,
    });
  }

  // --- Threads ---
  const threads = await loadFrontmatterFiles("threads");
  for (const { file, data, content } of threads) {
    const slug = data.id ?? path.basename(file, ".md");
    pages.push({
      url: `/threads/${slug}`,
      title: data.title ?? slug,
      description: data.description ?? summarize(content),
      category: "thread",
      content_path: relativePath(file),
      current_target_keywords: [],
    });
  }

  // --- Paths ---
  const paths = await loadFrontmatterFiles("paths");
  for (const { file, data, content } of paths) {
    const slug = data.id ?? path.basename(file, ".md");
    pages.push({
      url: `/paths/${slug}`,
      title: data.title ?? slug,
      description: data.description ?? summarize(content),
      category: "path",
      content_path: relativePath(file),
      current_target_keywords: [],
    });
  }

  // --- Atoms (routed by type) ---
  const atoms = await loadFrontmatterFiles("atoms");
  for (const { file, data, content } of atoms) {
    const slug = data.id ?? path.basename(file, ".md");
    const type = data.type;
    const urlFn = ATOM_URL_BY_TYPE[type];
    if (!urlFn) continue;
    pages.push({
      url: urlFn(slug),
      title: data.title ?? slug,
      description: summarize(content),
      category: ATOM_CATEGORY_BY_TYPE[type] ?? `atom-${type}`,
      content_path: relativePath(file),
      current_target_keywords: [],
    });
  }

  // --- Sources ---
  const sources = await loadFrontmatterFiles("sources");
  for (const { file, data, content } of sources) {
    const slug = data.id ?? path.basename(file, ".md");
    pages.push({
      url: `/sources/${slug}`,
      title: data.title ?? slug,
      description: summarize(content),
      category: "source",
      content_path: relativePath(file),
      current_target_keywords: [],
    });
  }

  // --- Shows (listen) ---
  const shows = await loadFrontmatterFiles("shows");
  for (const { file, data, content } of shows) {
    const slug = data.id ?? path.basename(file, ".md");
    pages.push({
      url: `/listen/${slug}`,
      title: data.title ?? slug,
      description: data.description ?? summarize(content),
      category: "show",
      content_path: relativePath(file),
      current_target_keywords: [],
    });
  }

  return pages;
}

function loadExistingLedger() {
  if (!fs.existsSync(LEDGER_JSON)) return null;
  try {
    return JSON.parse(fs.readFileSync(LEDGER_JSON, "utf8"));
  } catch {
    return null;
  }
}

function mergeWithExisting(pages, existing) {
  const byUrl = new Map();
  if (existing?.pages) {
    for (const entry of existing.pages) {
      byUrl.set(entry.url, entry);
    }
  }

  return pages.map((page) => {
    const prior = byUrl.get(page.url);
    const carry = prior
      ? {
          status: prior.status ?? "pending",
          research: { ...emptyEntryShape().research, ...(prior.research ?? {}) },
          recommendations: {
            ...emptyEntryShape().recommendations,
            ...(prior.recommendations ?? {}),
          },
          decisions: { ...emptyEntryShape().decisions, ...(prior.decisions ?? {}) },
        }
      : emptyEntryShape();
    return { ...page, ...carry };
  });
}

function statusCounts(entries) {
  const counts = { pending: 0, researching: 0, researched: 0, rewritten: 0, skipped: 0 };
  for (const e of entries) {
    counts[e.status] = (counts[e.status] ?? 0) + 1;
  }
  return counts;
}

function categoryCounts(entries) {
  const counts = new Map();
  for (const e of entries) {
    counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function writeMarkdownIndex(ledger) {
  const lines = [];
  lines.push("# Page Research Ledger");
  lines.push("");
  lines.push(`> Generated: ${ledger.generated_at}`);
  lines.push(`> Total pages: ${ledger.pages.length}`);
  lines.push("");
  lines.push("Source of truth: `docs/page-ledger.json`. Regenerate with `node scripts/build-page-ledger.mjs`.");
  lines.push("");
  lines.push("## Status overview");
  lines.push("");
  const statuses = statusCounts(ledger.pages);
  for (const [status, count] of Object.entries(statuses)) {
    lines.push(`- **${status}**: ${count}`);
  }
  lines.push("");
  lines.push("## By category");
  lines.push("");
  for (const [category, count] of categoryCounts(ledger.pages)) {
    lines.push(`- ${category}: ${count}`);
  }
  lines.push("");

  const grouped = new Map();
  for (const p of ledger.pages) {
    if (!grouped.has(p.category)) grouped.set(p.category, []);
    grouped.get(p.category).push(p);
  }

  const orderedCategories = [
    "bridge",
    "thread",
    "path",
    "audience",
    "atom-principle",
    "atom-law",
    "atom-insight",
    "atom-diagnosis",
    "atom-exercise",
    "atom-technique",
    "atom-format",
    "atom-vocabulary",
    "atom-reference",
    "tradition",
    "source",
    "show",
    "tool-picker",
    "index",
  ];
  const seen = new Set();
  const categoryOrder = [
    ...orderedCategories.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !orderedCategories.includes(c)),
  ];

  for (const category of categoryOrder) {
    if (seen.has(category)) continue;
    seen.add(category);
    const entries = grouped.get(category);
    if (!entries) continue;
    lines.push(`## ${category} (${entries.length})`);
    lines.push("");
    lines.push("| Status | URL | Title | Priority |");
    lines.push("| --- | --- | --- | --- |");
    for (const e of entries.sort((a, b) => a.url.localeCompare(b.url))) {
      const priority = e.recommendations?.priority ?? "—";
      lines.push(
        `| ${e.status} | \`${e.url}\` | ${e.title.replace(/\|/g, "\\|")} | ${priority} |`,
      );
    }
    lines.push("");
  }

  fs.writeFileSync(LEDGER_MD, lines.join("\n"), "utf8");
}

async function main() {
  const pages = await buildPages();
  pages.sort((a, b) => a.url.localeCompare(b.url));

  const existing = loadExistingLedger();
  const merged = mergeWithExisting(pages, existing);

  const ledger = {
    generated_at: new Date().toISOString().slice(0, 10),
    schema_version: 1,
    legend: {
      status: ["pending", "researching", "researched", "rewritten", "skipped"],
      priority: ["high", "medium", "low"],
      alignment_score: "1 (off-target) — 5 (perfectly aligned with current search intent)",
    },
    pages: merged,
  };

  fs.mkdirSync(path.dirname(LEDGER_JSON), { recursive: true });
  fs.writeFileSync(LEDGER_JSON, JSON.stringify(ledger, null, 2) + "\n", "utf8");
  writeMarkdownIndex(ledger);

  const counts = statusCounts(ledger.pages);
  console.log(`Wrote ${ledger.pages.length} pages to ${relativePath(LEDGER_JSON)}`);
  console.log(`Wrote markdown index to ${relativePath(LEDGER_MD)}`);
  console.log("Status:", counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
