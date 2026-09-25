/**
 * SEO Audit Script
 *
 * Scores every page on a checklist and outputs a report.
 * Run: node scripts/seo-audit.mjs
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

import { classifyKeywordParents } from "../src/lib/keyword-parents.mjs";

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
    // The keywords whole, because the parent section below needs the `parent`
    // and `traffic_potential` on every one of them, not just the primary.
    targetKeywords: data.target_keywords || [],
    serpVerdict: data.serp_verdict,
    serpMinDr: data.serp_min_dr,
    serpChecked: data.serp_checked,
    serpTop10: Array.isArray(data.serp_top10_dr) ? data.serp_top10_dr : null,
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

/**
 * Parent topics — the heads above the terms the site has chosen.
 *
 * Every other section here reads the keywords the guides target. `parent` is
 * the only field that names a topic *above* a page, and nothing read it: the
 * collision test asks whether 2 guides share one and stops there, which on
 * this data cannot fail (tracker entries 99 and 352).
 *
 * The bucket to look at is the last one — a head term no page on the site
 * claims. Unclaimed is a decision and not a defect: it is usually the term
 * the page deliberately did not chase, which is why the child was chosen. So
 * the verdict printed beside each row is what makes the row readable. An
 * `authority` verdict is somebody having looked at those results and left
 * them; no verdict at all is nobody having looked, and those are the rows
 * worth a person's time.
 *
 * Nothing here is a new figure. The traffic potential is the child keyword's
 * own, copied, and everything else is a count of rows.
 */
const parents = classifyKeywordParents(
  results
    .filter((r) => r.type === "bridge")
    .map((r) => ({ id: r.id, keywords: r.targetKeywords, verdict: r.serpVerdict ?? null })),
);
console.log(
  `Parent topics — ${parents.withParent} of ${parents.keywords} declared keywords name one, ` +
    `${parents.distinct} distinct:`,
);
console.log(`  the keyword itself:                ${String(parents.self.length).padStart(3)}`);
console.log(`  another keyword on this guide:     ${String(parents.sameGuide.length).padStart(3)}`);
console.log(
  `  a keyword on a different guide:    ${String(parents.otherGuide.length).padStart(3)}`,
);
console.log(`  no page on the site claims it:     ${String(parents.unclaimed.length).padStart(3)}`);
for (const e of parents.crossGuideEdges) {
  console.log(`    ${e.from} sits under ${e.to} — "${e.via}" has parent "${e.parent}"`);
}
console.log();

if (parents.unclaimed.length > 0) {
  const unjudged = parents.unclaimed.filter((p) => p.unjudged);
  console.log(
    `Head terms no page claims (${parents.unclaimed.length}), by the best traffic potential among their children:`,
  );
  for (const p of parents.unclaimed) {
    const verdicts = p.verdicts.map((v) => v ?? "no verdict").join(", ");
    console.log(
      `  ${p.parent.padEnd(44)} TP ${String(p.bestTrafficPotential ?? "—").padStart(6)}  ` +
        `${String(p.children.length).padStart(2)} on ${p.guides.join(", ").padEnd(42)} ${verdicts}`,
    );
  }
  console.log(
    `  Unclaimed is a decision, not a defect — an "authority" verdict is a page that looked at ` +
      `the head and left it.`,
  );
  console.log(
    unjudged.length > 0
      ? `  ${unjudged.length} of these ${parents.unclaimed.length} carry no verdict at all, which is the list worth a person's time: ` +
          unjudged.map((p) => p.parent).join(", ")
      : `  Every one of these ${parents.unclaimed.length} carries a verdict on the guide that declares the child, so none is unjudged.`,
  );
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

/**
 * How much of a results page is actually reachable.
 *
 * The lowest DR in a top ten is one observation and it hides the shape. Both
 * of these are recorded as winnable and they are not remotely the same bet:
 *
 *   how-to-overcome-fear-of-failure  min DR  1   [95 62 86 99 70 92 83 1]
 *   viewpoints                       min DR  6   [85 97 45 80 96 86  6 40]
 *
 * The first has one reachable result, a lone outlier at position ten, with
 * everything above it sixty-plus. The second has three. Ranked by minimum they
 * look equivalent; ranked by how many results a low-authority site could
 * plausibly displace, they are a page apart.
 *
 * Across the twenty-three pages with a profile the split is total: every
 * authority page has zero results under DR 50, every winnable page has at
 * least one. So this is not a second opinion on the verdict — it is the
 * ordering *within* winnable, which the verdict alone cannot give.
 */
const REACHABLE_UNDER = 50;
const reachableCount = (r) =>
  r.serpTop10 ? r.serpTop10.filter((dr) => dr < REACHABLE_UNDER).length : null;

const profiled = graded
  .filter((r) => r.serpVerdict === "winnable" && r.serpTop10)
  .map((r) => ({ ...r, open: reachableCount(r) }))
  .sort((a, b) => b.open - a.open || reach(b) - reach(a));

if (profiled.length > 0) {
  console.log(`Winnable, ranked by how much of the page is reachable (${profiled.length}):`);
  for (const r of profiled) {
    console.log(
      `  ${r.id.padEnd(42)} ${r.open} of ${String(r.serpTop10.length).padStart(2)} under DR ${REACHABLE_UNDER}` +
        `   TP ${String(reach(r)).padStart(6)}   min DR ${String(r.serpMinDr).padStart(2)}`,
    );
  }
  const thin = profiled.filter((r) => r.open <= 1);
  if (thin.length > 0) {
    console.log(
      `  ${thin.length} of these rest on a single reachable result — treat the minimum with care: ` +
        thin.map((r) => r.id).join(", "),
    );
  }
  console.log(
    `  ${graded.filter((r) => r.serpVerdict && !r.serpTop10).length} verdicts predate the profile and cannot be ranked this way.`,
  );
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
 * at all. Nine of them were guides, listed below. The rest were atoms, library
 * references and technique pages — which also hold the best positions on the
 * site, 6 to 12, on terms with almost no volume.
 *
 * That list is a sample, not the total, and the difference is two orders of
 * magnitude. Read 2026-09-25 from `gsc-performance-history`, the site has taken
 * 7,755 impressions and 36 clicks since April. The per-page and per-query
 * tables those 34 URLs come from expose 159 impressions — about 2% — because
 * Search Console withholds queries below a privacy threshold. An earlier draft
 * of this block said "and no clicks", which was wrong: the site converts, and
 * August was its best month at 19 clicks and 1.53% CTR.
 *
 * Neither instrument can recover the withheld part. `gsc-anonymous-queries`
 * exists for exactly that and returns empty here, because it resolves queries
 * against Ahrefs' keyword index and this site's vocabulary sits below that
 * index's floor — the same reason seven of ten queries it does rank for have no
 * traffic_potential, difficulty or parent_topic at all.
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
 * Refresh with `gsc-pages` **and** `gsc-performance-history`, and move the date
 * when you do. Left stale it becomes another confident number describing a day
 * that has passed — which is the fault the verdict ages below exist to catch.
 * Refreshing only the page list repeats the mistake above: it re-reads the 2%
 * and says nothing about whether the site is growing.
 *
 * Read the aggregate as clicks and CTR, not as average position. Monthly since
 * April: clicks 0, 3, 2, 12, 19 and CTR 0.04% to 1.53%, while average position
 * moved from 5.5 to 21.8. Position degrading while clicks climb is what breadth
 * looks like — more pages surfacing on more terms, most of them further down —
 * and it is the expected shape for a long-tail corpus as it indexes. A metric
 * that moves the wrong way when things go right will eventually be acted on, so
 * it is not the headline here.
 *
 * One thing to know before trying to refresh it, because it cost an hour to
 * work out and looks alarming on the way. The connector only answers reliably
 * for a wide date range. Ask it for July alone and it returns "No GSC data
 * available"; ask it for March alone and it returns the same thing, even though
 * February to April plainly has data in it. Narrow windows erroring is a
 * property of the connector's bucketing, not a statement that impressions were
 * zero, and reading it as a statement leads directly to concluding the site has
 * been deindexed since June. It has not been.
 *
 * The practical consequence is that this list cannot be date-scoped. It says
 * which pages have ever been surfaced across the whole period, and it cannot
 * say whether any of that happened recently or whether anything published this
 * month has been seen at all. Do not read recency into it.
 */
const GSC_SEEN_ON = "2026-08-23";
/**
 * The aggregate, so the sample below is never mistaken for the whole again.
 *
 * `gsc-performance-history`, monthly, read 2026-09-25. These are site totals;
 * `GSC_SEEN` beneath is the per-page table, which shows only queries above
 * Search Console's privacy threshold. Printing the two together is the point —
 * apart, the small one reads as the site's entire search presence, which is how
 * six backlog cards came to be scored against a number wrong by 200×.
 */
const GSC_TOTALS = {
  read: "2026-09-25",
  from: "2026-04-01",
  impressions: 7755,
  clicks: 36,
  /** Impressions visible in the per-page table over the same period. */
  sampleImpressions: 159,
  /** Best month so far, for the trend line. */
  best: { month: "2026-08", clicks: 19, ctr: "1.53%" },
};
/**
 * Read the page and query tables from here, always.
 *
 * Seventeen firings of the audit loop read them from 2026-06-01 and saw twelve
 * pages. From 2026-02-01 the same endpoint returned 34 — nearly three times
 * the evidence, from the same tool, for the sake of a start date. One reading
 * built on the narrow window called atoms "the layer that is working"; on the
 * full window they are the worst-returning layer on the site (SA-16.1).
 */
const GSC_WINDOW_FROM = "2026-02-01";

/*
 * What Ahrefs knows about the queries this site actually ranks for: mostly
 * nothing (SA-10.1, 2026-09-25).
 *
 * Ten of the 83 queries in the table were put back to keywords-explorer-
 * overview. Seven returned no traffic_potential, no difficulty and no
 * parent_topic; three came back at volume 0. The whole vocabulary this site
 * ranks on sits below the keyword index's floor, so every number in this file
 * that reads a blank as small is reading it wrong — a blank is unmeasured. The
 * full table, with the page each query surfaced on, is
 * docs/seo/rank-tracker-keywords.txt, and gsc-anonymous-queries returns empty
 * for the same reason, so the withheld part cannot be recovered from Ahrefs.
 *
 * One populated figure is a trap and is named so nobody uses it: "space work"
 * returns 7,500 traffic potential under parent_topic "spaces" — office and
 * workspace searches. The site ranks 29th on it for improv space work.
 */

/**
 * Which layer earns, against how much of the site it is.
 *
 * `gsc-pages` from GSC_WINDOW_FROM to 2026-09-25: 34 pages surfaced, 159
 * impressions, 83 distinct queries. Split by layer and set against the layer's
 * share of the 386 built pages, the lift is the number this audit had never
 * printed and most needed to: the library returns 3.9× its size — CLAUDE.md
 * has said "they punch above their weight in search" since the architecture
 * section was written, unquantified — and atoms return 0.4× theirs. The best
 * single page by query diversity, ref-viewpoints-bogart-landau, carried 15
 * queries and 22% of every impression the site had, and had not been named in
 * any reading before this one.
 *
 * Refresh with the page-level reading above, from GSC_WINDOW_FROM, and move
 * the date. `pages` is the layer's size in the build; `surfaced` is how many
 * of them the table named.
 */
const GSC_LAYERS_READ = "2026-09-25";
const GSC_LAYERS = [
  { layer: "bridges", pages: 78, surfaced: 9, impressions: 60, keywords: 24 },
  { layer: "library", pages: 32, surfaced: 7, impressions: 52, keywords: 29 },
  { layer: "atoms", pages: 173, surfaced: 12, impressions: 32, keywords: 17 },
  { layer: "hubs", pages: 22, surfaced: 2, impressions: 7, keywords: 6 },
  { layer: "tools", pages: 12, surfaced: 2, impressions: 5, keywords: 5 },
  { layer: "traditions", pages: 5, surfaced: 1, impressions: 2, keywords: 1 },
  { layer: "paths", pages: 11, surfaced: 1, impressions: 1, keywords: 1 },
];
const BUILT_PAGES = 386;

/**
 * What the Ahrefs Rank Tracker holds for this project.
 *
 * `management-project-keywords` returned an empty list on the date below, and
 * the API is read-only for it — loading keywords is a dashboard job. The list
 * to load is `docs/seo/rank-tracker-keywords.txt`: every query GSC has ever
 * surfaced the site for (83) plus the two declared Viewpoints terms not yet
 * among them, and nothing else, because the tracker charges per keyword and a
 * term the site has never ranked for measures nothing (SA-18.1).
 */
const RANK_TRACKER = { read: "2026-09-25", keywords: 0, toLoad: 85 };

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
  const share = (GSC_TOTALS.sampleImpressions / GSC_TOTALS.impressions) * 100;
  console.log(
    `  Site totals since ${GSC_TOTALS.from} (read ${GSC_TOTALS.read}): ` +
      `${GSC_TOTALS.impressions.toLocaleString()} impressions, ${GSC_TOTALS.clicks} clicks. ` +
      `Best month ${GSC_TOTALS.best.month}: ${GSC_TOTALS.best.clicks} clicks at ${GSC_TOTALS.best.ctr}.`,
  );
  console.log(
    `  The per-page list above is ${GSC_TOTALS.sampleImpressions} of those impressions — ` +
      `${share.toFixed(1)}%. It is a sample, not the total; judge progress on clicks and CTR.`,
  );
  console.log();

  // Which layer earns, against its share of the site. Lift is the layer's
  // share of impressions over its share of built pages: 1.0 means it returns
  // exactly what its size predicts.
  const totalImpr = GSC_LAYERS.reduce((n, l) => n + l.impressions, 0);
  console.log(
    `Surfaced by layer, ${GSC_WINDOW_FROM} → ${GSC_LAYERS_READ} (read from ${GSC_WINDOW_FROM}; ` +
      `a narrower start hides two thirds of the pages):`,
  );
  console.log(
    `  ${"layer".padEnd(11)}${"pages".padStart(6)}${"surfaced".padStart(10)}` +
      `${"impr".padStart(6)}${"queries".padStart(9)}${"impr%".padStart(7)}${"site%".padStart(7)}${"lift".padStart(7)}`,
  );
  for (const l of [...GSC_LAYERS].sort((a, b) => b.impressions - a.impressions)) {
    const imprShare = l.impressions / totalImpr;
    const siteShare = l.pages / BUILT_PAGES;
    console.log(
      `  ${l.layer.padEnd(11)}${String(l.pages).padStart(6)}${String(l.surfaced).padStart(10)}` +
        `${String(l.impressions).padStart(6)}${String(l.keywords).padStart(9)}` +
        `${(imprShare * 100).toFixed(0).padStart(6)}%${(siteShare * 100).toFixed(0).padStart(6)}%` +
        `${(imprShare / siteShare).toFixed(1).padStart(6)}x`,
    );
  }
  console.log(
    "  The library returns four times its size; atoms return under half of theirs. Back the layer that earns.",
  );
  console.log();

  // Positions on the site's own vocabulary need the rank tracker: Ahrefs'
  // keyword index returns nothing for most of it and the GSC tables are a 2%
  // sample. The tracker is the one instrument neither problem touches, and on
  // this date it held nothing. Loading it is dashboard work; the list is in
  // the repo. Move the date and the count when it changes.
  console.log(
    `Rank tracker: ${RANK_TRACKER.keywords} keywords on ${RANK_TRACKER.read}. ` +
      `${RANK_TRACKER.keywords === 0 ? `Load docs/seo/rank-tracker-keywords.txt (${RANK_TRACKER.toLoad} rows, SA-18.1) — until then no card here can verify its own outcome.` : "Read positions from it, not from the GSC tables."}`,
  );
  console.log();
}

/**
 * Which guides get surfaced at all, split by whether the term is ours.
 *
 * Of the guides old enough to have been crawled, the ones Search Console has
 * ever shown are overwhelmingly the ones whose primary keyword sits inside this
 * site's actual subject — improv, theatre, ensembles, team building. The ones it
 * has never shown are almost entirely generic self-help head terms.
 *
 * What makes it worth printing is that the usual explanations do not hold. The
 * two groups have the same median keyword difficulty — 5 against 5 — with
 * similar length and similar volume. serp_min_dr differs, but only from about
 * 23 to about 32, which is nowhere near enough to carry a gap this size. The
 * variable that separates them is topical fit, and nothing else in this report
 * ranks by it.
 *
 * Read it as a strong hint and not a proof: the surfaced group is eight pages.
 * But when a page is being picked for work on traffic potential alone, this is
 * the number that should temper the choice.
 */
const OURS = /improv|theatre|theater|harold|scene|ensemble|team.?build|icebreaker|warm.?up/i;
/*
 * Built from every guide old enough to have been crawled, not from `settled`.
 * `settled` descends from `graded`, which keeps only guides whose primary
 * keyword carries a numeric difficulty — and improv-theory records volume
 * alone. Reading this off `settled` therefore dropped the one in-subject guide
 * that has never been surfaced and reported 6 of 6 instead of 6 of 7. A rate
 * that rounds to 100% because the exception was filtered out is worse than no
 * rate at all.
 */
const withTerm = results
  .filter((r) => r.type === "bridge" && r.created && r.created < CRAWLED_BY)
  .map((r) => ({
    ours: OURS.test(r.keywords?.[0] ?? ""),
    seen: GSC_SEEN.has(r.id),
  }));
const rate = (list) => {
  if (list.length === 0) return "n/a";
  const hit = list.filter((x) => x.seen).length;
  return `${hit} of ${list.length} (${Math.round((hit / list.length) * 100)}%)`;
};
if (withTerm.length > 0) {
  console.log("Ever surfaced, by whether the primary term is in our subject:");
  console.log(`  our subject:  ${rate(withTerm.filter((x) => x.ours))}`);
  console.log(`  generic:      ${rate(withTerm.filter((x) => !x.ours))}`);
  console.log(
    "  Median difficulty is the same in both groups, so this is not one set of " +
      "results being easier.",
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
