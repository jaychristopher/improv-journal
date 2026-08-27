/**
 * Crawler access — what production actually serves to each crawler.
 *
 * Every other check in this repo reads the local build. That cannot see the
 * edge, and the edge is where this went wrong: Cloudflare sits in front of
 * Vercel, injects its own managed block at the top of robots.txt, and returns
 * 403 to AI crawlers before the request reaches the app. The repo's own
 * robots.txt is served underneath rules it never declared.
 *
 * The reason it matters here specifically: `prebuild` regenerates llms.txt on
 * every deploy — 79KB of it — and llms.txt exists for exactly one audience.
 * Shipping it while returning 403 to every client that would read it is not a
 * trade-off anybody chose. It is two settings that have never been looked at
 * together.
 *
 * Blocking AI crawlers is a legitimate decision, so this does not fail on it.
 * It fails only when a search engine is blocked, which would be an outage
 * nothing else would notice. Everything else it reports and leaves to a human.
 *
 * Usage: node scripts/check-crawler-access.mjs [--base https://example.com]
 */

const argBase = process.argv.indexOf("--base");
const BASE =
  argBase !== -1 ? process.argv[argBase + 1] : "https://www.physicsofconnection.com";

/**
 * `kind` is what a block would actually cost.
 *   search  — classic organic results. A block here is an emergency.
 *   answer  — the crawler that builds an answer engine's index. A block means
 *             the site cannot be cited in that product at all.
 *   live    — fetched when a person asks about a page, or pastes its link.
 *             A block here breaks a real user's request, not a robot's.
 */
const CRAWLERS = [
  { ua: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)", name: "Googlebot", kind: "search" },
  { ua: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", name: "bingbot", kind: "search" },
  { ua: "Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)", name: "Applebot", kind: "search" },
  { ua: "OAI-SearchBot/1.0; +https://openai.com/searchbot", name: "OAI-SearchBot", kind: "answer" },
  { ua: "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)", name: "PerplexityBot", kind: "answer" },
  { ua: "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)", name: "ClaudeBot", kind: "answer" },
  { ua: "GPTBot/1.2; +https://openai.com/gptbot", name: "GPTBot", kind: "answer" },
  { ua: "Google-Extended", name: "Google-Extended", kind: "answer" },
  { ua: "ChatGPT-User/1.0; +https://openai.com/bot", name: "ChatGPT-User", kind: "live" },
  { ua: "Claude-User/1.0; +Claude-User@anthropic.com", name: "Claude-User", kind: "live" },
  { ua: "Perplexity-User/1.0; +https://perplexity.ai/perplexity-user", name: "Perplexity-User", kind: "live" },
];

/** llms.txt is included deliberately: it is the file the answer engines want. */
const PATHS = ["/", "/llms.txt"];

async function status(url, ua) {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": ua, accept: "*/*" },
      redirect: "follow",
    });
    return res.status;
  } catch (err) {
    return `ERR ${err.cause?.code ?? err.message}`;
  }
}

const rows = [];
for (const crawler of CRAWLERS) {
  const codes = {};
  for (const p of PATHS) codes[p] = await status(BASE + p, crawler.ua);
  const blocked = Object.values(codes).some((c) => c === 403 || c === 401 || c === 429);
  rows.push({ ...crawler, codes, blocked });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`\nCrawler access — ${BASE}\n${"=".repeat(58)}`);
console.log(`${pad("crawler", 18)}${pad("kind", 9)}${pad("/", 7)}llms.txt`);
for (const r of rows) {
  console.log(`${pad(r.name, 18)}${pad(r.kind, 9)}${pad(r.codes["/"], 7)}${r.codes["/llms.txt"]}`);
}

const blockedSearch = rows.filter((r) => r.kind === "search" && r.blocked);
const blockedAnswer = rows.filter((r) => r.kind === "answer" && r.blocked);
const blockedLive = rows.filter((r) => r.kind === "live" && r.blocked);

console.log("");
if (blockedSearch.length) {
  console.log(`CRITICAL: a search engine is being refused — ${blockedSearch.map((r) => r.name).join(", ")}`);
}
if (blockedAnswer.length) {
  console.log(
    `Answer engines refused (${blockedAnswer.length}): ${blockedAnswer.map((r) => r.name).join(", ")}\n` +
      `  These cannot index or cite the site. llms.txt is built on every deploy for\n` +
      `  this audience and is served to none of them. Cloudflare's AI crawler block\n` +
      `  is the usual cause and is a dashboard setting, not anything in this repo.`,
  );
}
if (blockedLive.length) {
  console.log(
    `\nUser-initiated agents refused (${blockedLive.length}): ${blockedLive.map((r) => r.name).join(", ")}\n` +
      `  These fire when a person asks about a page or pastes its link. A 403 here\n` +
      `  fails a request somebody actually made.`,
  );
}
if (!blockedSearch.length && !blockedAnswer.length && !blockedLive.length) {
  console.log("Every crawler checked can reach the site.");
}
console.log("");

process.exit(blockedSearch.length ? 1 : 0);
