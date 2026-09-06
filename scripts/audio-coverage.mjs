/**
 * Audio coverage — which content pages have an audio version, and which don't.
 *
 * A "page" here is a content page that renders an AudioPlayer: every atom
 * (whatever its type, whatever route it lands on), every bridge, every thread,
 * every path. Hub, tool and index routes are excluded — they list content
 * rather than being content, and have nothing to narrate.
 *
 * A page counts as covered when the durations manifest has an entry for it,
 * because that manifest — not the gitignored MP3 — is what the production
 * build reads to decide whether to render the player.
 *
 * Usage:
 *   node scripts/audio-coverage.mjs           # Human-readable report
 *   node scripts/audio-coverage.mjs --json    # Machine-readable
 *   node scripts/audio-coverage.mjs --missing # Just the missing slugs
 *   node scripts/audio-coverage.mjs --strict  # Exit 1 if anything is missing
 */

import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import matter from "gray-matter";

const ROOT = process.cwd();
const CONTENT_DIR = path.join(ROOT, "content");
const SCRIPTS_DIR = path.join(CONTENT_DIR, "scripts");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

/** Content directory → audio/script directory. Both use the same name. */
export const LAYERS = ["atoms", "bridges", "threads", "paths"];

let manifest = null;
function loadManifest() {
  if (manifest) return manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(AUDIO_DIR, "durations.json"), "utf-8"));
  } catch {
    manifest = {};
  }
  return manifest;
}

/**
 * Every content page, with its audio status.
 *
 * hasAudio is manifest-or-file: the manifest is what production reads, but a
 * freshly generated MP3 that predates the next `generate-durations` run is
 * still audio on disk, and reporting it as missing would send the generator
 * round again to pay ElevenLabs twice for the same episode.
 */
export function inventory() {
  const durations = loadManifest();
  const items = [];

  for (const layer of LAYERS) {
    const dir = path.join(CONTENT_DIR, layer);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
      const slug = path.basename(file, ".md");
      const { data } = matter(fs.readFileSync(path.join(dir, file), "utf-8"));
      const audioPath = path.join(AUDIO_DIR, layer, `${slug}.mp3`);
      const manifestKey = `/audio/${layer}/${slug}.mp3`;

      items.push({
        layer,
        slug,
        type: data.type || layer.replace(/s$/, ""),
        title: data.title || slug,
        scriptPath: path.join(SCRIPTS_DIR, layer, `${slug}-tts.txt`),
        audioPath,
        manifestKey,
        hasScript: fs.existsSync(path.join(SCRIPTS_DIR, layer, `${slug}-tts.txt`)),
        hasAudioFile: fs.existsSync(audioPath),
        inManifest: Boolean(durations[manifestKey]),
        hasAudio: Boolean(durations[manifestKey]) || fs.existsSync(audioPath),
      });
    }
  }

  return items;
}

function main() {
  const args = process.argv.slice(2);
  const items = inventory();
  const missing = items.filter((i) => !i.hasAudio);

  if (args.includes("--json")) {
    console.log(JSON.stringify({ total: items.length, missing }, null, 2));
  } else if (args.includes("--missing")) {
    for (const i of missing) console.log(`${i.layer}/${i.slug}`);
  } else {
    const byLayer = new Map();
    for (const i of items) {
      const key = i.layer === "atoms" ? `atoms · ${i.type}` : i.layer;
      const row = byLayer.get(key) || { total: 0, audio: 0, script: 0 };
      row.total++;
      if (i.hasAudio) row.audio++;
      if (i.hasScript) row.script++;
      byLayer.set(key, row);
    }

    console.log(`\nAudio coverage: ${items.length - missing.length}/${items.length} pages\n`);
    for (const [key, row] of [...byLayer].sort((a, b) => a[0].localeCompare(b[0]))) {
      const gap = row.total - row.audio;
      const bar = gap === 0 ? "✓" : `${gap} missing`;
      console.log(
        `  ${key.padEnd(22)} ${String(row.audio).padStart(3)}/${String(row.total).padEnd(3)}  ${bar}`,
      );
    }
    console.log(`\n  Scripts written:  ${items.filter((i) => i.hasScript).length}/${items.length}`);
    console.log(`  Audio generated:  ${items.length - missing.length}/${items.length}`);
    if (missing.length) console.log(`  Remaining:        ${missing.length}\n`);
    else console.log(`\n  Every content page has an audio version.\n`);
  }

  if (args.includes("--strict") && missing.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
