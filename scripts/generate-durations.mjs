/**
 * Update the audio duration cache from local MP3 files.
 *
 * Uses ffprobe if available, falls back to file-size estimation (128kbps).
 * Records byte size too, which the podcast <enclosure length> attribute needs.
 * Output: public/audio/durations.json
 *
 * The manifest is merged, not rebuilt. It used to be written from scratch out
 * of whatever MP3s happened to be on the machine, and the MP3s are gitignored —
 * they live on R2 and only some of them are ever local. So the file that
 * decides whether a page offers audio at all was derived from a directory that
 * is not the source of truth for what is published, and running this on a
 * machine missing 179 of them would have silently un-published 179 pages.
 *
 * An entry whose file is present is recomputed; an entry whose file is absent
 * is kept, because absence here means "not on this machine", not "not
 * published". Removing an episode is therefore deliberate rather than a side
 * effect of housekeeping — see --prune.
 *
 * Usage:
 *   node scripts/generate-durations.mjs           # merge local files into the manifest
 *   node scripts/generate-durations.mjs --prune   # also drop entries with no local file
 *   node scripts/generate-durations.mjs --dry-run # report, write nothing
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { pathToFileURL } from "url";
import { glob } from "glob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(__dirname, "..", "public", "audio");
const outputPath = path.join(audioDir, "durations.json");

function getDurationFfprobe(filePath) {
  try {
    const result = execSync(
      `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: "utf-8", timeout: 5000 }
    );
    return parseFloat(result.trim());
  } catch {
    return null;
  }
}

function getDurationEstimate(filePath) {
  const stats = fs.statSync(filePath);
  // ElevenLabs outputs 128kbps MP3: bytes / (128000 / 8)
  return stats.size / 16000;
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * The manifest as it should be written, given what is already published and
 * what is measurable here.
 *
 * Exported so the merge rule is testable without a directory of MP3s, since
 * the rule — not the measurement — is the part that can un-publish a page.
 */
export function mergeDurations(existing, measured, { prune = false } = {}) {
  const merged = prune ? {} : { ...existing };
  return Object.assign(merged, measured);
}

/** Which keys survive only because they were already in the manifest. */
export function preservedKeys(existing, measured) {
  return Object.keys(existing).filter((key) => !(key in measured));
}

async function main() {
  const args = process.argv.slice(2);
  const prune = args.includes("--prune");
  const dryRun = args.includes("--dry-run") || args.includes("-n");

  let existing = {};
  try {
    existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
  } catch {
    // First run, or a manifest that is not readable json. Either way the local
    // files are all there is to go on.
  }

  const files = await glob("**/*.mp3", { cwd: audioDir });
  const measured = {};

  let useFfprobe = true;
  // Test if ffprobe is available
  try {
    execSync("ffprobe -version", { stdio: "pipe", timeout: 3000 });
  } catch {
    useFfprobe = false;
    console.log("ffprobe not found, using file-size estimation (128kbps)");
  }

  for (const file of files) {
    const fullPath = path.join(audioDir, file);
    const key = `/audio/${file.replace(/\\/g, "/")}`;

    const seconds = useFfprobe
      ? getDurationFfprobe(fullPath) ?? getDurationEstimate(fullPath)
      : getDurationEstimate(fullPath);

    measured[key] = {
      seconds: Math.round(seconds),
      formatted: formatDuration(seconds),
      // Byte size, for the <enclosure length> the podcast feeds emit. Apple
      // reads it to size the download before fetching, and a feed that says
      // length="0" for every episode is the shape podcast validators reject.
      // The bytes here are the bytes on R2 - these are the files uploaded.
      size: fs.statSync(fullPath).size,
    };
  }

  const preserved = preservedKeys(existing, measured);
  const merged = mergeDurations(existing, measured, { prune });

  console.log(`  measured locally: ${Object.keys(measured).length}`);
  console.log(
    prune
      ? `  dropped (no local file): ${preserved.length}`
      : `  kept from manifest (not on this machine): ${preserved.length}`
  );

  if (prune && preserved.length > 0) {
    for (const key of preserved) console.log(`    - ${key}`);
  }

  if (dryRun) {
    console.log(`[dry-run] would write ${Object.keys(merged).length} entries → ${outputPath}`);
    return;
  }

  fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2));
  console.log(`Durations for ${Object.keys(merged).length} files → ${outputPath}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(console.error);
}
