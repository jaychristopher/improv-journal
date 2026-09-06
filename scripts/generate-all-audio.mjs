/**
 * Generate audio for every content page that does not have it yet.
 *
 * generate-next-audio.mjs does one item per invocation and only reaches atoms
 * of a few types plus threads — by design, since it was built to be driven by
 * /loop. This drives the same pipeline across the entire backlog, every layer
 * and every atom type, with a worker pool, so "every page has an audio
 * version" is one command rather than 179 of them.
 *
 * Per item: write the TTS script (Claude) → synthesise (ElevenLabs, via
 * generate-podcast.mjs) → upload to R2. Durations are rebuilt once at the end,
 * because the manifest is what the production build reads and rewriting it per
 * item would just churn the same file 179 times.
 *
 * The run is resumable: an item with a script keeps it, an item with an MP3 is
 * skipped entirely, so re-running after an interruption costs nothing extra.
 *
 * Usage:
 *   node scripts/generate-all-audio.mjs --dry-run       # Plan + quota check
 *   node scripts/generate-all-audio.mjs                 # Generate everything
 *   node scripts/generate-all-audio.mjs --limit 5       # First 5 only
 *   node scripts/generate-all-audio.mjs --layer bridges # One layer only
 *   node scripts/generate-all-audio.mjs --script-only   # Stop before TTS
 *   node scripts/generate-all-audio.mjs --concurrency 4
 */

import { exec, execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { promisify } from "util";
import matter from "gray-matter";

import { inventory } from "./audio-coverage.mjs";

/*
 * Every step below shells out with the async exec rather than execSync.
 *
 * That is the difference between a worker pool and a queue: execSync blocks
 * the single Node thread, so five "concurrent" workers each waiting on a
 * several-minute Claude call would have run strictly one at a time, and the
 * pool would have been decoration on a serial loop.
 */
const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SCRIPTS_DIR = path.join(ROOT, "content", "scripts");
const LOG_PATH = path.join(ROOT, "output", "audio-run.jsonl");

// ─── .env ───────────────────────────────────────────────────────────────────

const env = {};
try {
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
} catch {
  /* .env may not exist */
}
Object.assign(env, process.env);

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const isDryRun = args.includes("--dry-run") || args.includes("-n");
const scriptOnly = args.includes("--script-only");
const noUpload = args.includes("--no-upload");
const limit = Number(flag("limit", Infinity));
const concurrency = Number(flag("concurrency", 3));
const onlyLayer = flag("layer", null);

// ─── Ordering ───────────────────────────────────────────────────────────────

/**
 * What gets generated first.
 *
 * Bridges lead because they are the pages the sitemap gives priority 0.9 and
 * the ones search traffic actually lands on; references trail because a
 * reading-list entry is the page a listener is least likely to want read
 * aloud. If a long run is interrupted, this is the order that leaves the most
 * valuable half done.
 */
const LAYER_RANK = { bridges: 0, paths: 1, threads: 2, atoms: 3 };
const TYPE_RANK = {
  law: 0,
  principle: 1,
  insight: 2,
  antipattern: 3,
  technique: 4,
  exercise: 5,
  format: 6,
  pattern: 7,
  framework: 8,
  pedagogy: 9,
  definition: 10,
  reference: 11,
};

// ─── Framing ────────────────────────────────────────────────────────────────

/** Content the script guide marks as team/classroom rather than stage. */
const ORG_SLUGS = new Set([
  "curriculum-design",
  "giving-notes",
  "safety-in-the-room",
  "side-coaching",
  "team-building-activities",
  "psychological-safety",
  "how-to-give-feedback",
  "how-to-deal-with-conflict",
]);

function audienceNote(item) {
  if (ORG_SLUGS.has(item.slug)) {
    return "AUDIENCE: This is ORGANIZATIONAL content. Frame for someone applying improv principles in a team or classroom — not a performer on stage.";
  }
  if (item.type === "reference") {
    return [
      "AUDIENCE: Frame for an improv player deciding whether to read this work.",
      "This entry is ABOUT A BOOK OR PAPER, so the usual rule against citations does not apply — the work is the subject.",
      "Cover what is actually in it, what has aged and what has not, and who it rewards. Do not read the bibliography aloud, and do not recite ISBNs, publishers or edition details.",
    ].join(" ");
  }
  if (item.type === "format") {
    return "AUDIENCE: Frame for an improv player who might run or perform this format. Say what it is, what it is actually for, and where it goes wrong — not a rules recitation.";
  }
  if (item.type === "definition") {
    return "AUDIENCE: Frame for an improv player who has heard this term and wants it named precisely. Short, sharp, one good example. Do not pad it to length.";
  }
  return "AUDIENCE: Frame for an improv performer. Tie into life off stage where it fits naturally.";
}

function wordTarget(item) {
  if (item.layer === "threads") return "1500-2500 words (6-10 min)";
  if (item.type === "definition") return "600-900 words (2.5-4 min)";
  return "800-1200 words (3-5 min)";
}

// ─── Pipeline steps ─────────────────────────────────────────────────────────

const scriptGuide = fs.readFileSync(path.join(SCRIPTS_DIR, "SCRIPT_GUIDE.md"), "utf-8");

function log(entry) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

async function writeScript(item) {
  const sourcePath = path.join(ROOT, "content", item.layer, `${item.slug}.md`);
  const { content: markdown } = matter(fs.readFileSync(sourcePath, "utf-8"));

  const prompt = `${scriptGuide}

---

${audienceNote(item)}

TARGET LENGTH: ${wordTarget(item)}

SOURCE CONTENT TO ADAPT (type: ${item.type}):
${markdown}

Write ONLY the TTS script following the guide above. No preamble, no markdown fences.`;

  // One temp file per item — the pool runs several of these at once, and the
  // single shared .tmp-tts-prompt.txt the one-at-a-time script uses would have
  // workers reading each other's prompts.
  const promptPath = path.join(ROOT, `.tmp-tts-${item.layer}-${item.slug}.txt`);
  fs.writeFileSync(promptPath, prompt);

  try {
    const { stdout } = await execAsync(`cat "${promptPath.replace(/\\/g, "/")}" | claude -p`, {
      encoding: "utf-8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 900000,
      shell: "bash",
      cwd: ROOT,
    });

    const script = stdout
      .trim()
      .replace(/^```[a-z]*\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    if (script.length < 1500) {
      throw new Error(`script suspiciously short (${script.length} chars)`);
    }

    fs.mkdirSync(path.dirname(item.scriptPath), { recursive: true });
    fs.writeFileSync(item.scriptPath, script + "\n\n[rewritten]");
    return script.length;
  } finally {
    if (fs.existsSync(promptPath)) fs.unlinkSync(promptPath);
  }
}

async function generateAudio(item) {
  await execAsync(`node scripts/generate-podcast.mjs "${item.scriptPath}" "${item.audioPath}"`, {
    timeout: 1800000,
    maxBuffer: 4 * 1024 * 1024,
    cwd: ROOT,
  });
}

async function uploadToR2(item) {
  const account = env.CLOUDFLARE_ACCOUNT_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!account || !token) return "skipped (no Cloudflare credentials)";

  const key = `audio/${item.layer}/${item.slug}.mp3`;
  const { stdout } = await execAsync(
    `curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/physics-audio/objects/${key}" ` +
      `-H "Authorization: Bearer ${token}" -H "Content-Type: audio/mpeg" ` +
      `--data-binary @"${item.audioPath.replace(/\\/g, "/")}"`,
    { encoding: "utf-8", timeout: 600000, maxBuffer: 4 * 1024 * 1024, shell: "bash", cwd: ROOT },
  );
  // R2's PUT answers with JSON on failure and an empty body on success.
  if (stdout.trim() && !stdout.includes('"success":true')) {
    throw new Error(`R2 upload rejected: ${stdout.trim().slice(0, 200)}`);
  }
  return "uploaded";
}

// ─── Quota ──────────────────────────────────────────────────────────────────

async function checkQuota() {
  const resp = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": env.ELEVENLABS_API_KEY },
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error(`ElevenLabs billing check failed: ${resp.status}`);
  const b = await resp.json();
  return {
    used: b.character_count,
    limit: b.character_limit,
    remaining: b.character_limit - b.character_count,
    resets: new Date(b.next_character_count_reset_unix * 1000).toISOString().slice(0, 10),
  };
}

/** Mean size of the scripts already written, as the per-item cost estimate. */
function averageScriptChars() {
  const sizes = [];
  for (const layer of ["atoms", "bridges", "threads", "paths"]) {
    const dir = path.join(SCRIPTS_DIR, layer);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".txt"))) {
      sizes.push(fs.statSync(path.join(dir, f)).size);
    }
  }
  return sizes.length ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 6200;
}

// ─── Worker pool ────────────────────────────────────────────────────────────

async function runPool(items, worker) {
  let cursor = 0;
  const results = [];
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return results;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  if (!env.ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY not set in .env");
    process.exit(1);
  }

  let queue = inventory()
    .filter((i) => !i.hasAudio)
    .filter((i) => !onlyLayer || i.layer === onlyLayer)
    .sort(
      (a, b) =>
        LAYER_RANK[a.layer] - LAYER_RANK[b.layer] ||
        (TYPE_RANK[a.type] ?? 99) - (TYPE_RANK[b.type] ?? 99) ||
        a.slug.localeCompare(b.slug),
    );

  if (Number.isFinite(limit)) queue = queue.slice(0, limit);

  if (queue.length === 0) {
    console.log("Every content page already has an audio version.");
    return;
  }

  const perItem = averageScriptChars();
  const projected = queue.length * perItem;
  const quota = await checkQuota();

  console.log(`\n=== Audio backfill: ${queue.length} pages ===`);
  console.log(`  Concurrency:  ${concurrency}`);
  console.log(`  Est. cost:    ~${projected.toLocaleString()} chars (~${perItem}/item)`);
  console.log(
    `  Quota:        ${quota.used.toLocaleString()}/${quota.limit.toLocaleString()} used, ` +
      `${quota.remaining.toLocaleString()} remaining (resets ${quota.resets})`,
  );

  if (!scriptOnly && projected > quota.remaining) {
    console.error(
      `\nERROR: projected ${projected.toLocaleString()} chars exceeds the ` +
        `${quota.remaining.toLocaleString()} remaining. Run with --limit to do part of it.`,
    );
    process.exit(1);
  }

  if (isDryRun) {
    console.log("\n=== Plan ===");
    for (const [i, item] of queue.entries()) {
      console.log(
        `  ${String(i + 1).padStart(3)}. ${item.layer}/${item.slug} (${item.type})` +
          `${item.hasScript ? " — script ready" : ""}`,
      );
    }
    console.log("\nRun without --dry-run to generate.\n");
    return;
  }

  const started = Date.now();
  let done = 0;
  let failed = 0;

  await runPool(queue, async (item) => {
    const label = `${item.layer}/${item.slug}`;
    try {
      if (!item.hasScript) {
        const chars = await writeScript(item);
        console.log(`  [script] ${label} — ${chars} chars`);
      }

      if (!scriptOnly) {
        await generateAudio(item);
        const size = (fs.statSync(item.audioPath).size / 1024 / 1024).toFixed(2);
        console.log(`  [audio]  ${label} — ${size} MB`);
        if (!noUpload) {
          const upload = await uploadToR2(item);
          if (upload !== "uploaded") console.log(`  [r2]     ${label} — ${upload}`);
        }
      }

      done++;
      log({ slug: label, status: "ok", at: new Date().toISOString() });
      console.log(`  ✓ ${label} (${done + failed}/${queue.length})`);
    } catch (e) {
      failed++;
      log({ slug: label, status: "failed", error: e.message, at: new Date().toISOString() });
      console.error(`  ✗ ${label}: ${e.message.split("\n")[0]}`);
    }
  });

  console.log("\nRebuilding duration manifest...");
  execSync("node scripts/generate-durations.mjs", { stdio: "inherit", cwd: ROOT });

  const mins = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`\nDone in ${mins} min — ${done} generated, ${failed} failed.`);
  execSync("node scripts/audio-coverage.mjs", { stdio: "inherit", cwd: ROOT });

  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
