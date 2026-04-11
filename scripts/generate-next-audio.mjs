#!/usr/bin/env node
/**
 * Generate the next audio episode from the backlog.
 *
 * This script is designed to be called by `/loop` — one invocation per cycle.
 * Each call:
 *   1. Reads the prioritized backlog
 *   2. Picks the next item that needs a TTS script OR audio
 *   3. If script missing: asks Claude to write it
 *   4. If script exists but audio missing: generates audio via TTS
 *
 * Usage:
 *   node scripts/generate-next-audio.mjs              # Generate next item
 *   node scripts/generate-next-audio.mjs --dry-run    # Preview without action
 *   node scripts/generate-next-audio.mjs --script-only # Only write the script, skip TTS
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const SCRIPTS_DIR = path.join(CONTENT_DIR, "scripts");
const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

const TYPE_PRIORITY = {
  law: 1,
  antipattern: 2,
  technique: 3,
  definition: null,
  pattern: null,
  format: null,
  insight: 7,
  pedagogy: null,
  framework: 9,
  reference: null,
};

function getNextItem() {
  const items = [];

  // Atoms
  const atomsDir = path.join(CONTENT_DIR, "atoms");
  for (const file of fs.readdirSync(atomsDir).filter((f) => f.endsWith(".md"))) {
    const slug = path.basename(file, ".md");
    const raw = fs.readFileSync(path.join(atomsDir, file), "utf-8");
    const { data } = matter(raw);
    const hasScript = fs.existsSync(path.join(SCRIPTS_DIR, "atoms", `${slug}-tts.txt`));
    const hasAudio = fs.existsSync(path.join(AUDIO_DIR, "atoms", `${slug}.mp3`));
    const priority = TYPE_PRIORITY[data.type];
    if (!hasAudio && priority != null) {
      items.push({
        layer: "atom",
        type: data.type || "unknown",
        slug,
        title: data.title || slug,
        hasScript,
        priority,
        scriptDir: "atoms",
        audioDir: "atoms",
      });
    }
  }

  // Threads
  const threadsDir = path.join(CONTENT_DIR, "threads");
  for (const file of fs.readdirSync(threadsDir).filter((f) => f.endsWith(".md"))) {
    const slug = path.basename(file, ".md");
    const raw = fs.readFileSync(path.join(threadsDir, file), "utf-8");
    const { data } = matter(raw);
    const hasScript = fs.existsSync(path.join(SCRIPTS_DIR, "threads", `${slug}-tts.txt`));
    const hasAudio = fs.existsSync(path.join(AUDIO_DIR, "threads", `${slug}.mp3`));
    if (!hasAudio) {
      items.push({
        layer: "thread",
        type: "thread",
        slug,
        title: data.title || slug,
        hasScript,
        priority: 0,
        scriptDir: "threads",
        audioDir: "threads",
      });
    }
  }

  items.sort((a, b) => a.priority - b.priority || a.slug.localeCompare(b.slug));
  return items[0] || null;
}

/**
 * Find next item that has an existing script needing rewrite.
 * Returns items with audio (i.e., script + audio exist, need refresh).
 */
function getNextRewrite() {
  const items = [];

  // Atoms with existing scripts
  const atomsDir = path.join(CONTENT_DIR, "atoms");
  for (const file of fs.readdirSync(atomsDir).filter((f) => f.endsWith(".md"))) {
    const slug = path.basename(file, ".md");
    const raw = fs.readFileSync(path.join(atomsDir, file), "utf-8");
    const { data } = matter(raw);
    const priority = TYPE_PRIORITY[data.type];
    const scriptFile = path.join(SCRIPTS_DIR, "atoms", `${slug}-tts.txt`);
    const hasScript = fs.existsSync(scriptFile);
    const hasAudio = fs.existsSync(path.join(AUDIO_DIR, "atoms", `${slug}.mp3`));
    // Rewrite items that already have both script and audio
    if (hasScript && hasAudio && priority != null) {
      // Check if script has been rewritten (marker comment at end)
      const script = fs.readFileSync(scriptFile, "utf-8");
      if (!script.includes("[rewritten]")) {
        items.push({
          layer: "atom", type: data.type || "unknown", slug,
          title: data.title || slug, hasScript: true,
          priority, scriptDir: "atoms", audioDir: "atoms",
        });
      }
    }
  }

  // Threads with existing scripts
  const threadsDir = path.join(CONTENT_DIR, "threads");
  for (const file of fs.readdirSync(threadsDir).filter((f) => f.endsWith(".md"))) {
    const slug = path.basename(file, ".md");
    const raw = fs.readFileSync(path.join(threadsDir, file), "utf-8");
    const { data } = matter(raw);
    const scriptFile = path.join(SCRIPTS_DIR, "threads", `${slug}-tts.txt`);
    const hasScript = fs.existsSync(scriptFile);
    const hasAudio = fs.existsSync(path.join(AUDIO_DIR, "threads", `${slug}.mp3`));
    if (hasScript && hasAudio) {
      const script = fs.readFileSync(scriptFile, "utf-8");
      if (!script.includes("[rewritten]")) {
        items.push({
          layer: "thread", type: "thread", slug,
          title: data.title || slug, hasScript: true,
          priority: 0, scriptDir: "threads", audioDir: "threads",
        });
      }
    }
  }

  items.sort((a, b) => a.priority - b.priority || a.slug.localeCompare(b.slug));
  return items[0] || null;
}

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || args.includes("-n");
const scriptOnly = args.includes("--script-only");
const rewriteMode = args.includes("--rewrite");

// In rewrite mode, pick an existing script to refresh; otherwise pick from backlog
const item = rewriteMode ? getNextRewrite() : getNextItem();

if (!item) {
  console.log(rewriteMode
    ? "✓ All existing scripts have been rewritten!"
    : "✓ Backlog complete! All items have audio.");
  process.exit(0);
}

const contentPath = path.join(
  CONTENT_DIR,
  item.layer === "thread" ? "threads" : "atoms",
  `${item.slug}.md`,
);
const scriptPath = path.join(SCRIPTS_DIR, item.scriptDir, `${item.slug}-tts.txt`);
const audioPath = path.join(AUDIO_DIR, item.audioDir, `${item.slug}.mp3`);

console.log(`\n=== Next: ${item.title} ===`);
console.log(`  Type: ${item.type} (priority ${item.priority})`);
console.log(`  Content: ${contentPath}`);
console.log(`  Script: ${scriptPath} ${item.hasScript ? "✓" : "— needs writing"}`);
console.log(`  Audio: ${audioPath}`);
console.log("");

if (isDryRun) {
  console.log("[dry-run] Would generate script and/or audio for this item.");
  process.exit(0);
}

// Step 1: Write TTS script (if missing, or if rewriting)
if (!item.hasScript || rewriteMode) {
  console.log("Step 1: Writing TTS script...");

  // Ensure script directory exists
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });

  // Read the source content and script guide
  const sourceContent = fs.readFileSync(contentPath, "utf-8");
  const { content: markdown } = matter(sourceContent);
  const scriptGuide = fs.readFileSync(
    path.join(SCRIPTS_DIR, "SCRIPT_GUIDE.md"), "utf-8"
  );

  // Check if this is organizational content
  const ORG_ATOMS = ["curriculum-design", "giving-notes", "safety-in-the-room", "side-coaching"];
  const isOrg = ORG_ATOMS.includes(item.slug);
  const audienceNote = isOrg
    ? "AUDIENCE: This is ORGANIZATIONAL content. Frame for someone applying improv principles in a team or classroom — not a performer on stage."
    : "AUDIENCE: Frame for an improv performer. Tie into life off stage where it fits naturally.";

  const wordTarget = item.layer === "thread" ? "1500-2500 words (6-10 min)" : "800-1200 words (3-5 min)";

  // Build prompt
  const prompt = `${scriptGuide}

---

${audienceNote}

TARGET LENGTH: ${wordTarget}

SOURCE CONTENT TO ADAPT (type: ${item.type}):
${markdown}

Write ONLY the TTS script following the guide above. No preamble, no markdown fences.`;

  // Write prompt to temp file and call Claude
  const promptPath = path.join(process.cwd(), ".tmp-tts-prompt.txt");
  fs.writeFileSync(promptPath, prompt);

  try {
    const result = execSync(`claude -p "$(cat ${JSON.stringify(promptPath)})" --no-input`, {
      encoding: "utf-8",
      maxBuffer: 1024 * 1024,
      timeout: 120000,
    });

    // Clean the result — remove any markdown fences Claude might add
    let script = result.trim();
    script = script
      .replace(/^```[a-z]*\n?/gm, "")
      .replace(/```$/gm, "")
      .trim();

    // Add rewritten marker so we don't reprocess
    const finalScript = script + "\n\n[rewritten]";
    fs.writeFileSync(scriptPath, finalScript);
    console.log(`  ✓ Script written: ${scriptPath} (${script.length} chars)`);
  } catch (e) {
    console.error(`  ✗ Failed to write script: ${e.message}`);
    process.exit(1);
  } finally {
    if (fs.existsSync(promptPath)) fs.unlinkSync(promptPath);
  }
}

if (scriptOnly) {
  console.log("\n[script-only] Stopping before audio generation.");
  process.exit(0);
}

// Step 2: Generate audio
console.log("Step 2: Generating audio...");
try {
  execSync(`node scripts/generate-episode.mjs "${scriptPath}" "${audioPath}" --public`, {
    stdio: "inherit",
    timeout: 600000,
  });
  console.log(`  ✓ Audio generated: ${audioPath}`);
} catch (e) {
  console.error(`  ✗ Audio generation failed: ${e.message}`);
  process.exit(1);
}

// Step 3: Update durations
console.log("Step 3: Updating durations...");
try {
  execSync("node scripts/generate-durations.mjs", { stdio: "inherit", timeout: 30000 });
} catch (e) {
  console.log("  (duration update skipped)");
}

// Show remaining count
const remaining = (() => {
  let count = 0;
  for (const dir of ["atoms", "threads"]) {
    const contentDir = path.join(CONTENT_DIR, dir);
    if (!fs.existsSync(contentDir)) continue;
    for (const f of fs.readdirSync(contentDir).filter((f) => f.endsWith(".md"))) {
      const slug = path.basename(f, ".md");
      if (!fs.existsSync(path.join(AUDIO_DIR, dir, `${slug}.mp3`))) count++;
    }
  }
  return count;
})();

console.log(`\n✓ Done! ${remaining} items remaining in backlog.`);
