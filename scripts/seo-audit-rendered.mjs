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

// lastmod that has stopped moving is why recrawl stops.
try {
  const sitemap = fs.readFileSync(path.join(BUILD_DIR, "sitemap.xml.body"), "utf-8");
  const mods = [...sitemap.matchAll(/<lastmod>(.*?)<\/lastmod>/g)].map((m) => m[1]);
  const head = execFileSync("git", ["log", "-1", "--format=%ad", "--date=short"], {
    encoding: "utf-8",
  }).trim();
  const stale = mods.filter((d) => d < head).length;
  if (mods.length && stale / mods.length > 0.8) {
    add(
      "warning",
      "/sitemap.xml",
      `${stale} of ${mods.length} lastmod values predate the last commit`,
    );
  }
} catch {
  /* no git, or no sitemap: skip rather than fail */
}

const bySeverity = { critical: [], warning: [] };
for (const i of issues) bySeverity[i.severity]?.push(i);

console.log("\nRendered SEO Audit");
console.log("=".repeat(50));
console.log(`Pages checked: ${pages.size}   stretched links: ${stretched}`);
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
