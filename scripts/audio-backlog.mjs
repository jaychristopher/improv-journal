/**
 * Audio backlog — prioritized list of content needing TTS scripts and audio.
 *
 * Usage:
 *   node scripts/audio-backlog.mjs              # Show full backlog with status
 *   node scripts/audio-backlog.mjs --next       # Print the next item to generate
 *   node scripts/audio-backlog.mjs --next-json  # Print next item as JSON (for automation)
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const SCRIPTS_DIR = path.join(CONTENT_DIR, "scripts");
const AUDIO_DIR = path.join(process.cwd(), "public", "audio");

/** Priority order for atom types (lower = higher priority, null = skip) */
const TYPE_PRIORITY = {
  law: 1,
  antipattern: 2,
  technique: 3,
  definition: null,   // skip for now
  pattern: null,       // skip for now
  format: null,        // skip for now
  insight: 7,
  pedagogy: null,      // skip for now
  framework: 9,
  reference: null,     // skip for now
};

function getBacklog() {
  const items = [];

  // Atoms
  const atomsDir = path.join(CONTENT_DIR, "atoms");
  if (fs.existsSync(atomsDir)) {
    for (const file of fs.readdirSync(atomsDir).filter((f) => f.endsWith(".md"))) {
      const slug = path.basename(file, ".md");
      const raw = fs.readFileSync(path.join(atomsDir, file), "utf-8");
      const { data } = matter(raw);
      const type = data.type || "unknown";
      const hasScript = fs.existsSync(path.join(SCRIPTS_DIR, "atoms", `${slug}-tts.txt`));
      const hasAudio = fs.existsSync(path.join(AUDIO_DIR, "atoms", `${slug}.mp3`));
      const priority = TYPE_PRIORITY[type];

      if (!hasAudio && priority != null) {
        items.push({
          layer: "atom",
          type,
          slug,
          title: data.title || slug,
          hasScript,
          hasAudio,
          priority,
          scriptPath: `content/scripts/atoms/${slug}-tts.txt`,
          audioPath: `public/audio/atoms/${slug}.mp3`,
          contentPath: `content/atoms/${slug}.md`,
        });
      }
    }
  }

  // Threads
  const threadsDir = path.join(CONTENT_DIR, "threads");
  if (fs.existsSync(threadsDir)) {
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
          hasAudio,
          priority: 0, // Threads are high priority (close to done)
          scriptPath: `content/scripts/threads/${slug}-tts.txt`,
          audioPath: `public/audio/threads/${slug}.mp3`,
          contentPath: `content/threads/${slug}.md`,
        });
      }
    }
  }

  // Sort: priority asc, then alphabetical within priority
  items.sort((a, b) => a.priority - b.priority || a.slug.localeCompare(b.slug));
  return items;
}

function printBacklog(items) {
  let currentType = null;
  let typeCount = 0;

  console.log(`\nAudio Backlog: ${items.length} items remaining\n`);

  for (const item of items) {
    const typeLabel = item.layer === "thread" ? "thread" : item.type;
    if (typeLabel !== currentType) {
      if (currentType !== null) console.log(`  (${typeCount} items)\n`);
      currentType = typeLabel;
      typeCount = 0;
      console.log(`  ${typeLabel.toUpperCase()} [priority ${item.priority}]`);
    }
    typeCount++;
    const status = item.hasScript ? "📝→🔊" : "  →📝";
    console.log(`    ${status} ${item.slug}`);
  }
  if (currentType !== null) console.log(`  (${typeCount} items)\n`);

  // Summary
  const needScript = items.filter((i) => !i.hasScript).length;
  const needAudio = items.filter((i) => i.hasScript && !i.hasAudio).length;
  console.log(`Summary:`);
  console.log(`  Need script: ${needScript}`);
  console.log(`  Need audio (script ready): ${needAudio}`);
  console.log(`  Total remaining: ${items.length}`);
}

const args = process.argv.slice(2);
const backlog = getBacklog();

if (args.includes("--next-json")) {
  const next = backlog[0];
  if (next) {
    console.log(JSON.stringify(next));
  } else {
    console.log("null");
  }
} else if (args.includes("--next")) {
  const next = backlog[0];
  if (next) {
    console.log(`Next: ${next.slug} (${next.type})`);
    console.log(`  Content: ${next.contentPath}`);
    console.log(`  Script:  ${next.scriptPath} ${next.hasScript ? "✓" : "— needs writing"}`);
    console.log(`  Audio:   ${next.audioPath}`);
  } else {
    console.log("Backlog complete!");
  }
} else {
  printBacklog(backlog);
}
