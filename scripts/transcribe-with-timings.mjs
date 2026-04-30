/**
 * Transcribe an audio file via ElevenLabs Scribe and emit word-level timings.
 * Output: JSON array of { word, start, end } for sync-auditing video peaks.
 *
 * Usage:
 *   node scripts/transcribe-with-timings.mjs <audio-path> [output.json]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = path.join(__dirname, "..", ".env");
let env = {};
try {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
} catch {}
env = { ...env, ...process.env };

const API_KEY = env.ELEVENLABS_API_KEY;
if (!API_KEY) {
  console.error("ELEVENLABS_API_KEY missing");
  process.exit(1);
}

const audioPath = process.argv[2];
if (!audioPath || !fs.existsSync(audioPath)) {
  console.error("Usage: transcribe-with-timings.mjs <audio-path> [output.json]");
  process.exit(1);
}
const outPath = process.argv[3] ?? audioPath.replace(/\.mp3$/, ".timings.json");

const buf = fs.readFileSync(audioPath);
const fd = new FormData();
fd.append("model_id", "scribe_v1");
fd.append("file", new Blob([buf], { type: "audio/mpeg" }), path.basename(audioPath));
fd.append("timestamps_granularity", "word");

console.log(`Transcribing ${audioPath} (${(buf.length / 1024 / 1024).toFixed(2)} MB)...`);

const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
  method: "POST",
  headers: { "xi-api-key": API_KEY },
  body: fd,
});

if (!res.ok) {
  console.error(`ElevenLabs STT failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();

// Scribe returns: { language_code, language_probability, text, words: [{ text, start, end, type, ... }, ...] }
const words = (data.words ?? [])
  .filter((w) => w.type === "word")
  .map((w) => ({ word: w.text, start: w.start, end: w.end }));

fs.writeFileSync(outPath, JSON.stringify(words, null, 2));
console.log(`Wrote ${words.length} word timings → ${outPath}`);
console.log(`First word: ${JSON.stringify(words[0])}`);
console.log(`Last word: ${JSON.stringify(words[words.length - 1])}`);
