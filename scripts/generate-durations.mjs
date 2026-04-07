/**
 * Generate audio duration cache from MP3 files.
 * Uses ffprobe if available, falls back to file-size estimation (128kbps).
 * Output: public/audio/durations.json
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
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

async function main() {
  const files = await glob("**/*.mp3", { cwd: audioDir });
  const durations = {};

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

    durations[key] = {
      seconds: Math.round(seconds),
      formatted: formatDuration(seconds),
    };
  }

  fs.writeFileSync(outputPath, JSON.stringify(durations, null, 2));
  console.log(`Generated durations for ${Object.keys(durations).length} files → ${outputPath}`);
}

main().catch(console.error);
