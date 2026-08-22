#!/usr/bin/env node
/**
 * Submit the site's URLs to IndexNow.
 *
 * Search Console shows that over ninety days only 31 of 295 pages drew a
 * single impression: the site is not being discovered, not merely outranked.
 * A sitemap is a passive invitation, and Google retired its sitemap ping in
 * 2023, so there was no way to actively tell anyone a page exists.
 *
 * IndexNow is that push. It reaches Bing, Yandex, Seznam and Naver from one
 * call — and Bing's index is what backs Copilot and ChatGPT search, so this is
 * also how the site becomes answerable there. Google does not participate.
 *
 * Run: npm run seo:indexnow -- [--dry-run] [--limit N]
 */
import fs from "node:fs";
import path from "node:path";

const HOST = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.physicsofconnection.com")
  .hostname;
const ENDPOINT = "https://api.indexnow.org/IndexNow";
const PUBLIC_DIR = path.join(process.cwd(), "public");

function findKey() {
  const fromEnv = process.env.INDEXNOW_KEY;
  if (fromEnv) return fromEnv;
  const keyFile = fs.readdirSync(PUBLIC_DIR).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (!keyFile) {
    throw new Error(
      "No IndexNow key found. Expected a 32-hex-character .txt file in public/, or INDEXNOW_KEY set.",
    );
  }
  const key = path.basename(keyFile, ".txt");
  const contents = fs.readFileSync(path.join(PUBLIC_DIR, keyFile), "utf-8").trim();
  if (contents !== key) {
    throw new Error(`${keyFile} must contain exactly its own key; found "${contents}".`);
  }
  return key;
}

async function sitemapUrls() {
  const res = await fetch(`https://${HOST}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : Infinity;

const key = findKey();
let urls = await sitemapUrls();
if (Number.isFinite(limit)) urls = urls.slice(0, limit);

console.log(`host      ${HOST}`);
console.log(`key       ${key.slice(0, 8)}… (public/${key}.txt)`);
console.log(`urls      ${urls.length}`);

if (dryRun) {
  // Deliberately not process.exit(): exiting while the sitemap fetch handle is
  // still closing trips a libuv assertion on Windows.
  console.log("\n--dry-run: nothing submitted. First 5 URLs:");
  for (const u of urls.slice(0, 5)) console.log("  " + u);
} else {
  // IndexNow accepts up to 10,000 URLs per request.
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key,
      keyLocation: `https://${HOST}/${key}.txt`,
      urlList: urls,
    }),
  });

  console.log(`\nresponse  ${res.status} ${res.statusText}`);
  if (res.status === 200 || res.status === 202) {
    console.log(`Submitted ${urls.length} URLs.`);
  } else {
    console.log(await res.text());
    process.exitCode = 1;
  }
}
