#!/usr/bin/env node
/**
 * Audit the pages as they are actually served.
 *
 * `seo:audit` reads frontmatter, which is why it reported 97/100 and zero
 * critical issues throughout a run of work that turned up nine real defects —
 * every one of them found by parsing the built HTML instead. Descriptions
 * opening with a stray asterisk, 133 titles that never said "improv", anchor
 * text carrying a whole description, 131 episodes naming the wrong podcast,
 * 184 pages telling Google nothing had changed since April. None of it is
 * visible from frontmatter.
 *
 * This reads .next/server/app and checks what a crawler would see. Each check
 * exists because it caught something real.
 *
 * Run: npm run build && npm run seo:rendered
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BUILD_DIR = path.join(process.cwd(), ".next", "server", "app");
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 158;
const ANCHOR_MAX = 120;

if (!fs.existsSync(BUILD_DIR)) {
  console.error("No build found. Run `npm run build` first.");
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCodePoint(Number(c)))
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCodePoint(parseInt(c, 16)));

const strip = (s) =>
  decode(s.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const files = walk(BUILD_DIR);
const pages = new Map();

for (const file of files) {
  const rel = "/" + path.relative(BUILD_DIR, file).split(path.sep).join("/").slice(0, -5);
  const url = rel === "/index" ? "/" : rel;
  if (url.startsWith("/_")) continue;
  const html = fs.readFileSync(file, "utf-8");
  pages.set(url, html);
}

const issues = [];
const add = (severity, url, msg) => issues.push({ severity, url, msg });

const titles = new Map();

for (const [url, html] of pages) {
  const noindex = /name="robots" content="[^"]*noindex/.test(html);

  const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(html);
  const descMatch = /name="description" content="([\s\S]*?)"/.exec(html);
  const title = titleMatch ? decode(titleMatch[1]) : null;
  const desc = descMatch ? decode(descMatch[1]) : null;

  if (!noindex) {
    if (!title) add("critical", url, "no title");
    else {
      if (title.length > TITLE_MAX) add("warning", url, `title ${title.length} chars`);
      const seen = titles.get(title);
      if (seen) add("critical", url, `title duplicates ${seen}`);
      else titles.set(title, url);
    }

    if (!desc) add("critical", url, "no description");
    else {
      // Every one of these caught a live defect.
      if (/^[*_#>|]/.test(desc.trim()))
        add("critical", url, `description opens with markdown: ${desc.slice(0, 40)}`);
      if (/\*\*|\]\(|\|/.test(desc)) add("critical", url, "markdown syntax inside description");
      if (/\n/.test(desc)) add("critical", url, "raw newline inside description");
      // Stripping a "**Trains:**" label off a sentence that the label was the
      // subject of leaves the rest of that sentence as the whole snippet, so
      // the search result opened mid-thought in lowercase. Six pages shipped
      // one, and the extractor gives no sign it happened.
      if (/^\p{Ll}/u.test(desc.trim()))
        add("critical", url, `description starts mid-sentence: ${desc.slice(0, 45)}`);
      if (/\.\.\.$/.test(desc.trim()))
        add("warning", url, "description ends in three dots, not an ellipsis");
      if (desc.length > DESC_MAX) add("warning", url, `description ${desc.length} chars`);
      if (desc.length < DESC_MIN) add("warning", url, `description ${desc.length} chars`);
    }
  }

  // Anchor text. A link whose text is a title plus a whole description buries
  // the term the target page is about.
  const body = html
    .replace(/<footer[\s\S]*?<\/footer>/g, "")
    .replace(/<header[\s\S]*?<\/header>/g, "");
  let overlong = 0;
  for (const m of body.matchAll(/<a\b[^>]*href="\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) {
    if (strip(m[1]).length > ANCHOR_MAX) overlong += 1;
  }
  if (overlong > 2) add("warning", url, `${overlong} anchors over ${ANCHOR_MAX} chars`);

  // JSON-LD has to parse and name a type, or search engines drop it silently.
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const node = JSON.parse(m[1]);
      const types = (Array.isArray(node) ? node : [node]).map((n) => n["@type"] ?? n["@graph"]);
      if (types.some((t) => !t)) add("warning", url, "JSON-LD node with no @type");
    } catch {
      add("critical", url, "JSON-LD does not parse");
    }
  }
}

// A stretched link makes a whole card clickable by absolutely positioning the
// anchor's ::after. That lands on the nearest *positioned* ancestor — not the
// immediate parent — so a card whose `relative` was dropped silently loses its
// click target while still looking clickable. Two earlier hand-rolled checks
// got this wrong in opposite directions by testing the parent instead.
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);
const POSITIONED = /\b(relative|absolute|fixed|sticky)\b/;
const TAG = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
const STRETCHED = /<a\b[^>]*after:absolute after:inset-0[^>]*>/g;

function nearestPositioned(html, index) {
  const stack = [];
  for (const m of html.slice(0, index).matchAll(TAG)) {
    const closing = m[1];
    const tag = m[2].toLowerCase();
    const attrs = m[3];
    if (VOID.has(tag) || attrs.trimEnd().endsWith("/")) continue;
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
    } else {
      stack.push({ tag, attrs });
    }
  }
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const hit = POSITIONED.exec(stack[i].attrs);
    if (hit) return hit[1];
  }
  return null;
}

let stretched = 0;
for (const [url, html] of pages) {
  let broken = 0;
  for (const m of html.matchAll(STRETCHED)) {
    stretched += 1;
    if (nearestPositioned(html, m.index) !== "relative") broken += 1;
  }
  if (broken) add("critical", url, `${broken} stretched links with no positioned card`);
}

// One @id, one definition. Nodes sharing an @id are merged by consumers, so a
// page that defines the same entity twice with different properties leaves the
// choice between them arbitrary. The about page defined Organization a second
// time, with a shorter description than the one the root layout emits on every
// page — including that one. A bare {"@id": ...} reference is not a definition
// and is the correct way to point at an entity defined elsewhere.
let jsonLdNodes = 0;
for (const [url, html] of pages) {
  const defined = new Map();
  for (const m of html.matchAll(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    let parsed;
    try {
      parsed = JSON.parse(m[1]);
    } catch {
      add("critical", url, "JSON-LD does not parse");
      continue;
    }
    for (const node of parsed["@graph"] ?? [parsed]) {
      if (!node || typeof node !== "object" || !node["@id"]) continue;
      const keys = Object.keys(node).filter((k) => k !== "@context");
      if (keys.length < 2) continue; // a reference, not a definition
      jsonLdNodes += 1;
      const shape = JSON.stringify(node, Object.keys(node).sort());
      const prior = defined.get(node["@id"]);
      if (prior === undefined) defined.set(node["@id"], shape);
      else if (prior !== shape)
        add("critical", url, `defines ${node["@id"]} twice with different content`);
    }
  }
}

// Podcast episodes must name a series whose feed actually carries them.
const feedCounts = new Map();
for (const [url, html] of pages) {
  const m = /^\/listen\/([a-z0-9-]+)$/.exec(url);
  if (!m) continue;
  const feed = path.join(BUILD_DIR, "listen", m[1], "feed.xml.body");
  if (fs.existsSync(feed)) {
    feedCounts.set(m[1], (fs.readFileSync(feed, "utf-8").match(/<item>/g) ?? []).length);
  }
  void html;
}
const claimed = new Map();
for (const [, html] of pages) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let node;
    try {
      node = JSON.parse(m[1]);
    } catch {
      continue;
    }
    if (node["@type"] !== "PodcastEpisode") continue;
    const id = String(node.partOfSeries?.url ?? "").split("/listen/")[1];
    if (id) claimed.set(id, (claimed.get(id) ?? 0) + 1);
  }
}
for (const [id, n] of claimed) {
  const inFeed = feedCounts.get(id);
  if (inFeed !== undefined && inFeed !== n) {
    add("critical", `/listen/${id}`, `${n} pages claim this series, feed carries ${inFeed}`);
  }
}

/**
 * lastmod that has stopped moving is why recrawl stops — but the old check
 * here compared every value against the date of the last commit, and warned
 * when more than 80% were older. That fires the first time you commit on a new
 * day without editing all 328 pages, which is every day. A warning that is
 * always on is worse than no warning, because it teaches you to skip the
 * audit.
 *
 * lastmod is supposed to be older than the last commit for anything that did
 * not change. The faults actually worth catching are a date in the future, and
 * every page sharing one value — the signature of a build timestamp being
 * emitted instead of per-page content dates.
 */
try {
  const sitemap = fs.readFileSync(path.join(BUILD_DIR, "sitemap.xml.body"), "utf-8");
  const mods = [...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((m) => m[1]);
  const today = execFileSync("git", ["log", "-1", "--format=%ad", "--date=short"], {
    encoding: "utf-8",
  }).trim();

  const ahead = mods.filter((d) => d.slice(0, 10) > today);
  if (ahead.length) {
    add("critical", "/sitemap.xml", `${ahead.length} lastmod values are in the future`);
  }

  const distinct = new Set(mods.map((d) => d.slice(0, 10)));
  if (mods.length > 20 && distinct.size === 1) {
    add(
      "warning",
      "/sitemap.xml",
      `every lastmod is ${[...distinct][0]} — looks like a build timestamp, not content dates`,
    );
  }
} catch {
  /* no git, or no sitemap: skip rather than fail */
}

// ─── Internal links spent on guides that cannot rank ────────────────────────
//
// Every guide records a serp_verdict. `authority` means the results for its
// term are gated behind domains this site will not outrank, so the page is
// worth keeping for readers and is not a ranking candidate. `winnable` means it
// is.
//
// Internal links are the one ranking input entirely within the site's control,
// and it is possible to spend most of them on the pages that cannot use them
// without anything ever saying so. This surfaced the hard way: the single
// best-performing page in Search Console was also among the least-linked
// winnable guides, sitting below gated pages carrying twice its links.
//
// The threshold is the median gated guide rather than a fixed number, so it
// re-calibrates as the site grows and only ever reports a genuine inversion —
// a page that can rank receiving less than the typical page that cannot.
try {
  const verdicts = new Map();
  const bridgeDir = path.join(process.cwd(), "content", "bridges");
  for (const file of fs.readdirSync(bridgeDir).filter((f) => f.endsWith(".md"))) {
    const fm = fs.readFileSync(path.join(bridgeDir, file), "utf-8").split(/^---$/m)[1] ?? "";
    const verdict = /^serp_verdict:\s*(\w+)/m.exec(fm)?.[1];
    if (verdict) verdicts.set("/" + file.replace(/\.md$/, ""), verdict);
  }

  const inbound = new Map();
  for (const [url, html] of pages) {
    const body = html.split("</header>").pop().split("<footer")[0] ?? "";
    const seen = new Set();
    for (const m of body.matchAll(/href="(\/[^"?#]*)"/g)) {
      let target = m[1];
      if (target.length > 1 && target.endsWith("/")) target = target.slice(0, -1);
      if (target === url || seen.has(target)) continue;
      seen.add(target);
      inbound.set(target, (inbound.get(target) ?? 0) + 1);
    }
  }

  const gated = [...verdicts]
    .filter(([, v]) => v === "authority")
    .map(([u]) => inbound.get(u) ?? 0)
    .sort((a, b) => a - b);

  if (gated.length >= 5) {
    const median = gated[Math.floor(gated.length / 2)];
    for (const [url, verdict] of verdicts) {
      if (verdict !== "winnable") continue;
      const links = inbound.get(url) ?? 0;
      if (links < median) {
        add(
          "warning",
          url,
          `winnable guide has ${links} inbound internal links, below the median gated guide (${median}) — link equity is going to pages that cannot rank`,
        );
      }
    }
  }
} catch {
  /* no content dir: skip rather than fail */
}

const bySeverity = { critical: [], warning: [] };
for (const i of issues) bySeverity[i.severity]?.push(i);

console.log("\nRendered SEO Audit");
console.log("=".repeat(50));
console.log(
  `Pages checked: ${pages.size}   stretched links: ${stretched}   json-ld nodes: ${jsonLdNodes}`,
);
console.log(`Critical: ${bySeverity.critical.length}   Warnings: ${bySeverity.warning.length}\n`);

for (const severity of ["critical", "warning"]) {
  const list = bySeverity[severity];
  if (!list.length) continue;
  console.log(`${severity.toUpperCase()} (${list.length})`);
  for (const i of list.slice(0, 25)) console.log(`  ${i.url}  —  ${i.msg}`);
  if (list.length > 25) console.log(`  ... and ${list.length - 25} more`);
  console.log("");
}

if (!issues.length) console.log("Nothing to report.\n");

process.exit(bySeverity.critical.length ? 1 : 0);
