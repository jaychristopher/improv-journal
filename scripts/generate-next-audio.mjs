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
  definition: 4,
  pattern: 5,
  format: 6,
  insight: 7,
  pedagogy: 8,
  framework: 9,
  reference: 10,
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
    if (!hasAudio) {
      items.push({
        layer: "atom",
        type: data.type || "unknown",
        slug,
        title: data.title || slug,
        hasScript,
        priority: TYPE_PRIORITY[data.type] ?? 99,
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

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run") || args.includes("-n");
const scriptOnly = args.includes("--script-only");

const item = getNextItem();

if (!item) {
  console.log("✓ Backlog complete! All items have audio.");
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

// Step 1: Write TTS script if missing
if (!item.hasScript) {
  console.log("Step 1: Writing TTS script...");

  // Ensure script directory exists
  fs.mkdirSync(path.dirname(scriptPath), { recursive: true });

  // Read the source content
  const sourceContent = fs.readFileSync(contentPath, "utf-8");
  const { content: markdown } = matter(sourceContent);

  // Read a reference script for style
  const refDir = path.join(SCRIPTS_DIR, item.scriptDir);
  const refFiles = fs.existsSync(refDir)
    ? fs.readdirSync(refDir).filter((f) => f.endsWith("-tts.txt"))
    : [];
  const refScript =
    refFiles.length > 0
      ? fs.readFileSync(path.join(refDir, refFiles[0]), "utf-8").slice(0, 2000)
      : "";

  // Build prompt for Claude to write the script
  const prompt = `Write a TTS podcast script for this ${item.type} content. The script should be a two-voice dialogue between curious and knowledgeable hosts exploring this topic conversationally.

FORMAT RULES:
- Each paragraph is a new speaker turn (they alternate)
- Start each paragraph with an [emote] tag: [curious], [teaching], [conversational], [warm], [emphatic], [contemplative], [serious], [matter-of-fact], [confident]
- Use [short pause], [pause], [long pause] for pacing
- No markdown, no headers, no bold — plain text only
- No speaker labels (A:/B:) — just emote tags and text
- Aim for 800-1500 words (3-6 minutes of audio)
- Cover the key ideas faithfully but make it feel like a real conversation
- End naturally, don't summarize

REFERENCE STYLE (from an existing script):
${refScript}

SOURCE CONTENT TO ADAPT:
${markdown}

Write ONLY the TTS script, nothing else.`;

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

    fs.writeFileSync(scriptPath, script);
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
  execSync(`node scripts/generate-episode.mjs "${scriptPath}" "${audioPath}"`, {
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
