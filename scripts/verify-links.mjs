#!/usr/bin/env node
/**
 * Check every external link in content/ still resolves.
 *
 * Companion to verify-isbns.mjs, and it exists for the same reason: an
 * identifier can be perfectly well formed and point at nothing. The Apple
 * Podcasts link on ref-carrane-improv-nerd carried show id 587855360 for
 * months. The show is 547986680. Nothing internal could have known.
 *
 * Three things this gets right that a naive checker does not, each learned by
 * getting it wrong first:
 *
 *   1. URLs are not terminated by ")". Wikipedia article titles contain
 *      parentheses — Harold_(improvisation) — and a regex that stops at the
 *      first bracket reports a live link as a 404.
 *   2. Send a browser User-Agent. Spotify returns 404 to anything that does
 *      not look like a browser and 200 to one that does.
 *   3. 403 is not proof of breakage. Academic publishers — SAGE, Wiley,
 *      Taylor & Francis, AIP — and some wikis block automated requests
 *      wholesale. Those are reported separately as unverifiable rather than
 *      counted as failures, because treating them as broken would train
 *      whoever runs this to ignore the output.
 *
 *   node scripts/verify-links.mjs
 *
 * Exits non-zero only on links that genuinely did not resolve.
 */
import fs from "node:fs";
import path from "node:path";

const CONTENT = path.join(process.cwd(), "content");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

/** Hosts known to refuse automated requests. A 403 from these proves nothing. */
const BLOCKS_BOTS = [
  "journals.sagepub.com",
  "onlinelibrary.wiley.com",
  "tandfonline.com",
  "pubs.aip.org",
  "sciencedirect.com",
  "improvencyclopedia.org",
  "wiki.improvresourcecenter.com",
];

function markdownFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(full, acc);
    else if (entry.name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

// Permits "(" and ")" inside the path, then balances them below.
const URL_RE = /https?:\/\/[^\s"'<>\]]+/g;

/**
 * A markdown link is [text](url), so a naive match swallows the closing
 * bracket — but Wikipedia titles legitimately contain one, as in
 * Harold_(improvisation). Strip trailing ")" only while it is unmatched.
 */
function trimUrl(raw) {
  let url = raw.replace(/[.,;:]+$/, "");
  while (url.endsWith(")") && (url.match(/\(/g) ?? []).length < (url.match(/\)/g) ?? []).length) {
    url = url.slice(0, -1);
  }
  return url;
}

const found = new Map();
for (const file of markdownFiles(CONTENT)) {
  const slug = path.basename(file, ".md");
  for (const match of fs.readFileSync(file, "utf-8").matchAll(URL_RE)) {
    const url = trimUrl(match[0]);
    if (!found.has(url)) found.set(url, new Set());
    found.get(url).add(slug);
  }
}

const broken = [];
const unverifiable = [];

for (const [url, pages] of found) {
  let status;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    status = res.status;
  } catch (err) {
    status = err.message;
  }
  if (status === 200) continue;

  const host = new URL(url).hostname.replace(/^www\./, "");
  const where = [...pages].sort().join(", ");
  if (status === 403 && BLOCKS_BOTS.some((h) => host.endsWith(h))) {
    unverifiable.push(`  ?  ${status}  ${url}  [${where}]`);
  } else {
    broken.push(`  !! ${status}  ${url}  [${where}]`);
  }
}

if (unverifiable.length) {
  console.log(`\n  ${unverifiable.length} could not be checked (host blocks automated requests):`);
  for (const line of unverifiable) console.log(line);
}
if (broken.length) {
  console.log(`\n  ${broken.length} did not resolve:`);
  for (const line of broken) console.log(line);
}

console.log(`\n  ${found.size} external links checked, ${broken.length} broken.`);
process.exit(broken.length === 0 ? 0 : 1);
