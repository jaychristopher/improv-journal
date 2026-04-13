/**
 * Generate a two-host podcast episode using ElevenLabs v3
 *
 * Splits a script into Host A and Host B segments, generates audio for each
 * with distinct voices, then stitches them together with ffmpeg.
 *
 * Script format: plain text with ElevenLabs v3 audio tags.
 * Host segments are separated by [long pause] markers.
 * Odd segments = Host A, Even segments = Host B (alternating).
 *
 * The script should NOT contain **A:** / **B:** markers — those belong in the
 * markdown source script. The TTS-ready .txt file uses only audio tags and
 * natural alternation via [long pause] segment breaks.
 *
 * For this podcast, segments alternate within each [long pause] block by
 * paragraph — each paragraph is a new speaker turn.
 *
 * Usage:
 *   node scripts/generate-podcast.mjs <script-file> <output-path> [options]
 *
 * Options:
 *   --dry-run/-n    Preview chunk plan without generating audio
 *
 * Examples:
 *   node scripts/generate-podcast.mjs content/scripts/physics-of-connection-tts.txt output/physics-of-connection.mp3
 *   node scripts/generate-podcast.mjs content/scripts/physics-of-connection-tts.txt output/physics-of-connection.mp3 --dry-run
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Load .env ──────────────────────────────────────────────────────────────

const envPath = path.join(__dirname, '..', '.env');
let env = {};
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  }
} catch (e) { /* .env may not exist */ }
env = { ...env, ...process.env };

// ─── Config ─────────────────────────────────────────────────────────────────

const ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;
const MODEL_ID = 'eleven_v3';
const MAX_CHARS = 4500; // API limit is 5000, leave buffer

// Two contrasting voices for the podcast hosts
const VOICES = {
  A: {
    id: env.ELEVENLABS_VOICE_A || 'sNKKDngZymUvjZVKvNU1',
    name: 'Host A',
    settings: { stability: 0.45, similarity_boost: 0.75 },
  },
  B: {
    id: env.ELEVENLABS_VOICE_B || 'kdnRe2koJdOK4Ovxn2DI',
    name: 'Host B',
    settings: { stability: 0.45, similarity_boost: 0.75 },
  },
};

// ─── CLI ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-n');
const positionalArgs = args.filter(a => !a.startsWith('-'));

if (positionalArgs.length < 2) {
  console.log('Usage: node scripts/generate-podcast.mjs <script-file> <output-path> [--dry-run]');
  console.log('');
  console.log('Voices:');
  console.log(`  Host A: ${VOICES.A.name} (${VOICES.A.id})`);
  console.log(`  Host B: ${VOICES.B.name} (${VOICES.B.id})`);
  console.log('');
  console.log('Override voices via .env:');
  console.log('  ELEVENLABS_VOICE_A=<voice_id>');
  console.log('  ELEVENLABS_VOICE_B=<voice_id>');
  process.exit(1);
}

// ─── Script parsing ─────────────────────────────────────────────────────────

/**
 * Parse the TTS script into alternating speaker segments.
 * Each paragraph (double newline separated) is a new speaker turn.
 * Returns array of { speaker: 'A'|'B', text: string }
 */
function parseScript(raw) {
  // Remove YAML frontmatter
  let text = raw.replace(/^---[\s\S]*?---\n*/m, '');
  // Remove markdown headers
  text = text.replace(/^#{1,6}\s+.*$/gm, '');
  // Clean up triple+ newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

  const segments = [];
  let speaker = 'A';

  for (const para of paragraphs) {
    // Check if paragraph has actual spoken text after removing tags
    const spokenText = para.replace(/\[[^\]]+\]/g, '').trim();
    if (!spokenText) {
      // Pure tag paragraph (e.g. just [pause]) — skip, don't alternate speaker
      continue;
    }
    segments.push({ speaker, text: para });
    speaker = speaker === 'A' ? 'B' : 'A';
  }

  return segments;
}

/**
 * Group consecutive same-speaker segments and chunk for API limits.
 * Returns array of { speaker, text, index }
 */
function buildChunks(segments) {
  const chunks = [];
  let currentSpeaker = segments[0]?.speaker;
  let currentText = '';
  let idx = 0;

  for (const seg of segments) {
    const addition = (currentText ? '\n\n' : '') + seg.text;

    if (seg.speaker !== currentSpeaker || (currentText + addition).length > MAX_CHARS) {
      if (currentText) {
        chunks.push({ speaker: currentSpeaker, text: currentText, index: idx++ });
      }
      currentSpeaker = seg.speaker;
      currentText = seg.text;
    } else {
      currentText += addition;
    }
  }
  if (currentText) {
    chunks.push({ speaker: currentSpeaker, text: currentText, index: idx++ });
  }

  return chunks;
}

// ─── ElevenLabs API ─────────────────────────────────────────────────────────

async function checkBilling() {
  const resp = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
    headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    signal: AbortSignal.timeout(5000),
  });
  if (!resp.ok) throw new Error(`Billing check failed: ${resp.status}`);
  return resp.json();
}

async function synthesize(text, voiceId, voiceSettings) {
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: voiceSettings,
    }),
  });

  if (!resp.ok) {
    const error = await resp.text();
    throw new Error(`ElevenLabs error: ${resp.status} — ${error}`);
  }

  return Buffer.from(await resp.arrayBuffer());
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const [scriptFile, outputPath] = positionalArgs.map(p => path.resolve(p));

  if (!fs.existsSync(scriptFile)) {
    console.error(`Script not found: ${scriptFile}`);
    process.exit(1);
  }
  if (!ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY not set in .env');
    process.exit(1);
  }

  const raw = fs.readFileSync(scriptFile, 'utf-8');
  const segments = parseScript(raw);
  const chunks = buildChunks(segments);

  const totalChars = chunks.reduce((sum, c) => sum + c.text.length, 0);
  const aChunks = chunks.filter(c => c.speaker === 'A');
  const bChunks = chunks.filter(c => c.speaker === 'B');

  console.log('=== Podcast Generator ===');
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Host A: ${VOICES.A.name} (${VOICES.A.id})`);
  console.log(`Host B: ${VOICES.B.name} (${VOICES.B.id})`);
  console.log(`Script: ${scriptFile}`);
  console.log(`Output: ${outputPath}`);
  console.log('');
  console.log(`Segments: ${segments.length} speaker turns`);
  console.log(`Chunks:   ${chunks.length} API calls (${aChunks.length} A + ${bChunks.length} B)`);
  console.log(`Chars:    ${totalChars} total`);
  console.log('');

  // Check billing
  const billing = await checkBilling();
  const remaining = billing.character_limit - billing.character_count;
  console.log(`Billing:  ${billing.character_count}/${billing.character_limit} used (${remaining} remaining)`);

  if (totalChars > remaining) {
    console.error(`ERROR: Need ${totalChars} chars, only ${remaining} remaining.`);
    process.exit(1);
  }
  console.log(`Cost:     ~${totalChars} chars (${(totalChars / billing.character_limit * 100).toFixed(1)}% of quota)`);
  console.log('');

  if (isDryRun) {
    console.log('=== DRY RUN — Chunk Plan ===');
    for (const chunk of chunks) {
      const voice = VOICES[chunk.speaker];
      const preview = chunk.text.substring(0, 80).replace(/\n/g, ' ');
      console.log(`  [${chunk.index}] ${chunk.speaker} (${voice.name}) ${chunk.text.length} chars: "${preview}..."`);
    }
    console.log('');
    console.log('Run without --dry-run to generate.');
    process.exit(0);
  }

  // Generate audio for each chunk (unique temp dir per output to allow parallel runs)
  const outputBase = path.basename(outputPath, '.mp3');
  const tempDir = path.join(path.dirname(outputPath), `.podcast-temp-${outputBase}`);
  fs.mkdirSync(tempDir, { recursive: true });
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const chunkPaths = [];

  for (const chunk of chunks) {
    const voice = VOICES[chunk.speaker];
    const chunkPath = path.join(tempDir, `chunk_${String(chunk.index).padStart(3, '0')}.mp3`);

    console.log(`  [${chunk.index}/${chunks.length - 1}] ${chunk.speaker} (${voice.name}) — ${chunk.text.length} chars...`);

    const audio = await synthesize(chunk.text, voice.id, voice.settings);
    fs.writeFileSync(chunkPath, audio);
    chunkPaths.push(chunkPath);
  }

  console.log('');
  console.log('Stitching chunks with ffmpeg...');

  // Build ffmpeg concat file
  const listPath = path.join(tempDir, 'concat.txt');
  const listContent = chunkPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  try {
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, {
      stdio: 'pipe',
    });
  } catch (e) {
    // Fallback: binary concat
    console.log('  ffmpeg concat failed, using binary concat...');
    const concatenated = Buffer.concat(chunkPaths.map(p => fs.readFileSync(p)));
    fs.writeFileSync(outputPath, concatenated);
  }

  // Cleanup temp
  for (const p of chunkPaths) fs.unlinkSync(p);
  fs.unlinkSync(listPath);
  fs.rmdirSync(tempDir);

  const stats = fs.statSync(outputPath);
  console.log(`\nDone: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch(err => {
  console.error(`\nFatal: ${err.message}`);
  process.exit(1);
});
