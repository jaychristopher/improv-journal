/**
 * Generate a single episode using TTS
 *
 * Mode Selection:
 *   Default:      Local Qwen3-TTS (FREE, preserves emotes for quality)
 *   --fast:       Local Qwen3-TTS (FREE, strips emotes for speed)
 *   --public:     ElevenLabs (PAID, preserves emotes, highest quality)
 *
 * Options:
 *   --dry-run/-n: Show what would happen without generating audio
 *
 * The same script source is used for all modes. Emote handling differs:
 *   - ElevenLabs: Emotes like [thoughtful] are interpreted by the model
 *   - Local Quality: Emotes are converted to style instructions
 *   - Local Fast: Emotes are stripped for faster generation
 *
 * Usage:
 *   node scripts/generate-episode.mjs <script-file> <output-path> [options]
 *
 * Examples:
 *   node scripts/generate-episode.mjs script.txt out.mp3              # Local (quality)
 *   node scripts/generate-episode.mjs script.txt out.mp3 --fast       # Local (fast)
 *   node scripts/generate-episode.mjs script.txt out.mp3 --public     # ElevenLabs
 *   node scripts/generate-episode.mjs script.txt out.mp3 --dry-run    # Preview only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (no external dependencies)
const envPath = path.join(__dirname, '..', '.env');
let env = {};
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
} catch (e) {
  // .env may not exist, use environment variables
}

// Merge with process.env (process.env takes precedence)
env = { ...env, ...process.env };

// Parse command line flags
const args = process.argv.slice(2);
const isPublic = args.includes('--public') || args.includes('-p');
const isFast = args.includes('--fast') || args.includes('-f');
const isDryRun = args.includes('--dry-run') || args.includes('-n');

// Determine mode
let TTS_MODE;
if (isPublic) {
  TTS_MODE = 'elevenlabs';  // PAID, highest quality, emotes preserved
} else if (isFast) {
  TTS_MODE = 'local-fast';  // FREE, fastest, emotes stripped
} else {
  TTS_MODE = 'local-quality';  // FREE, quality mode, emotes converted to instructions
}

// ElevenLabs config
const ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;
const VOICE_ID = env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';
const MODEL_ID = 'eleven_v3';

// Local TTS config - will be auto-detected
let TTS_SERVICE_URL = env.TTS_SERVICE_URL || null;

/**
 * Preprocess script - common cleanup for all modes
 * Does NOT strip emotes - that's mode-specific
 */
function preprocessScriptBase(text) {
  let result = text;

  // Remove YAML frontmatter (--- ... ---)
  result = result.replace(/^---[\s\S]*?---\n*/m, '');

  // Remove markdown headers (# ## ### etc) - they get read as "hashtag"
  result = result.replace(/^#{1,6}\s+.*$/gm, '');

  // Convert SSML break tags to v3 pause tags (legacy support)
  result = result.replace(/<break\s+time="([0-9.]+)s"\s*\/>/gi, (match, seconds) => {
    const s = parseFloat(seconds);
    if (s <= 0.5) return '[short pause]';
    if (s <= 1.0) return '[pause]';
    return '[long pause]';
  });

  // Remove script notes section at the end
  result = result.replace(/---\s*\n\s*\*\*Word count\*\*:[\s\S]*$/m, '');

  // Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Strip emotes for fast mode
 * Removes all [tag] style markers except pauses
 */
function stripEmotes(text) {
  // Keep pause tags, strip everything else
  const pauseTags = ['short pause', 'pause', 'long pause', 'beat'];

  return text.replace(/\[([^\]]+)\]/g, (match, tag) => {
    const tagLower = tag.toLowerCase().trim();
    if (pauseTags.includes(tagLower)) {
      return match;  // Keep pause tags
    }
    return '';  // Strip emote tags
  });
}

/**
 * Preprocess for ElevenLabs (preserve emotes - model interprets them)
 */
function preprocessForElevenLabs(text) {
  return preprocessScriptBase(text);
}

/**
 * Preprocess for local quality mode (preserve emotes - converted to instructions by service)
 */
function preprocessForLocalQuality(text) {
  return preprocessScriptBase(text);
}

/**
 * Preprocess for local fast mode (strip emotes for speed)
 */
function preprocessForLocalFast(text) {
  let result = preprocessScriptBase(text);
  result = stripEmotes(result);
  // Clean up double spaces from removed tags
  result = result.replace(/  +/g, ' ');
  return result;
}

/**
 * Split text into chunks for ElevenLabs (max 5000 chars per request)
 */
function splitTextForElevenLabs(text, maxChars = 4500) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (para.length > maxChars) {
        const sentences = para.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > maxChars) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

/**
 * Check ElevenLabs billing status before generation
 */
async function checkElevenLabsBilling() {
  if (!ELEVENLABS_API_KEY) {
    return { status: 'no_key', message: 'ELEVENLABS_API_KEY not set in .env' };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      const error = await response.text();
      return { status: 'error', message: error };
    }

    const data = await response.json();
    return {
      status: data.status || 'unknown',
      chars_used: data.character_count || 0,
      chars_limit: data.character_limit || 0,
      tier: data.tier || 'unknown'
    };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

/**
 * Generate audio using ElevenLabs (PAID, preserves emotes)
 */
async function generateWithElevenLabs(text, outputPath) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY not set in .env (required for --public)');
  }

  // Check billing status before generating
  console.log('Checking ElevenLabs billing status...');
  const billing = await checkElevenLabsBilling();

  if (billing.status === 'no_key') {
    throw new Error(billing.message);
  }

  if (billing.status !== 'active' && billing.status !== 'trialing') {
    throw new Error(`ElevenLabs account issue: ${billing.status}. ${billing.message || 'Check your billing at elevenlabs.io'}`);
  }

  const charsNeeded = text.length;
  const charsRemaining = billing.chars_limit - billing.chars_used;

  if (charsNeeded > charsRemaining) {
    throw new Error(`Not enough ElevenLabs characters. Need ${charsNeeded}, have ${charsRemaining} remaining.`);
  }

  console.log(`  Status: ${billing.status} (${billing.tier})`);
  console.log(`  Characters: ${billing.chars_used}/${billing.chars_limit} used, need ${charsNeeded}`);
  console.log('');

  console.log(`Using ElevenLabs (PAID, quality mode)`);
  console.log(`  Model: ${MODEL_ID}`);
  console.log(`  Voice: ${VOICE_ID}`);
  console.log(`  Text: ${text.length} characters`);

  const chunks = text.length > 4500 ? splitTextForElevenLabs(text) : [text];
  console.log(`  Chunks: ${chunks.length}`);

  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`  Generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: chunk,
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
    }

    const buffer = await response.arrayBuffer();
    audioBuffers.push(Buffer.from(buffer));
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  if (audioBuffers.length === 1) {
    fs.writeFileSync(outputPath, audioBuffers[0]);
  } else {
    const concatenated = Buffer.concat(audioBuffers);
    fs.writeFileSync(outputPath, concatenated);
  }

  const stats = fs.statSync(outputPath);
  console.log(`Generated: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

/**
 * Auto-detect TTS service URL (localhost for Windows, tts:8000 for Docker)
 */
async function detectTtsUrl() {
  const candidates = ['http://localhost:8000', 'http://tts:8000'];

  for (const url of candidates) {
    try {
      const response = await fetch(`${url}/v1/tts/health`, {
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        return url;
      }
    } catch (e) {
      // Try next candidate
    }
  }
  return null;
}

/**
 * Split text into chunks for local TTS processing
 * Splits on paragraph boundaries to maintain context
 */
function splitTextForLocal(text, maxChars = 1500) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';

  for (const para of paragraphs) {
    if (currentChunk.length + para.length + 2 > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (para.length > maxChars) {
        // Split long paragraphs by sentences
        const sentences = para.split(/(?<=[.!?])\s+/);
        currentChunk = '';
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 > maxChars) {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
          }
        }
      } else {
        currentChunk = para;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

/**
 * Generate audio using local Qwen3-TTS (FREE)
 * Splits into chunks for faster processing, then stitches together
 */
async function generateWithLocal(text, outputPath, mode) {
  const isQualityMode = mode === 'local-quality';
  console.log(`Using Local Qwen3-TTS (FREE, ${isQualityMode ? 'quality' : 'fast'} mode)`);
  console.log(`  Service: ${TTS_SERVICE_URL}`);
  console.log(`  Emotes: ${isQualityMode ? 'preserved (style instructions)' : 'stripped (speed)'}`);
  console.log(`  Text: ${text.length} characters`);

  // Auto-detect TTS URL if not set
  if (!TTS_SERVICE_URL) {
    TTS_SERVICE_URL = await detectTtsUrl();
    if (!TTS_SERVICE_URL) {
      throw new Error('Local TTS service not found. Try: docker compose up tts');
    }
  }

  // Check if service is healthy
  let health;
  try {
    const healthCheck = await fetch(`${TTS_SERVICE_URL}/v1/tts/health`);
    if (!healthCheck.ok) {
      throw new Error('TTS service not healthy');
    }
    health = await healthCheck.json();
    console.log(`  URL: ${TTS_SERVICE_URL}`);
    console.log(`  Model: ${health.model_name}`);
    console.log(`  Speaker: ${health.speaker || 'default'}`);
    console.log(`  VRAM: ${health.vram_usage_mb?.toFixed(0) || 'N/A'} MB`);
  } catch (e) {
    throw new Error(`Local TTS service not available at ${TTS_SERVICE_URL}. Is it running?`);
  }

  // Split into chunks for faster processing
  const chunks = splitTextForLocal(text);
  console.log(`  Chunks: ${chunks.length}`);

  const audioBuffers = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`  Generating chunk ${i + 1}/${chunks.length} (${chunk.length} chars)...`);

    const response = await fetch(`${TTS_SERVICE_URL}/v1/tts/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: chunk,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Local TTS error on chunk ${i + 1}: ${response.status} - ${error}`);
    }

    const buffer = await response.arrayBuffer();
    audioBuffers.push(Buffer.from(buffer));
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  fs.mkdirSync(outputDir, { recursive: true });

  if (audioBuffers.length === 1) {
    fs.writeFileSync(outputPath, audioBuffers[0]);
  } else {
    // Use ffmpeg to properly concatenate MP3s with correct duration metadata
    const tempDir = path.join(outputDir, '.temp-chunks');
    fs.mkdirSync(tempDir, { recursive: true });

    // Write temp chunk files
    const chunkPaths = audioBuffers.map((buf, i) => {
      const chunkPath = path.join(tempDir, `chunk_${String(i).padStart(3, '0')}.mp3`);
      fs.writeFileSync(chunkPath, buf);
      return chunkPath;
    });

    // Create ffmpeg concat list file
    const listPath = path.join(tempDir, 'concat.txt');
    const listContent = chunkPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(listPath, listContent);

    // Use ffmpeg to concatenate with proper metadata
    const { execSync } = await import('child_process');
    try {
      execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, {
        stdio: 'pipe'
      });
    } catch (e) {
      // Fallback to binary concat if ffmpeg fails
      console.log('  ffmpeg concat failed, using binary concat (duration may be incorrect)');
      const concatenated = Buffer.concat(audioBuffers);
      fs.writeFileSync(outputPath, concatenated);
    }

    // Cleanup temp files
    for (const p of chunkPaths) {
      fs.unlinkSync(p);
    }
    fs.unlinkSync(listPath);
    fs.rmdirSync(tempDir);
  }

  const stats = fs.statSync(outputPath);
  console.log(`Generated: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  // Filter out flags from args
  const positionalArgs = args.filter(a => !a.startsWith('-'));

  if (positionalArgs.length < 2) {
    console.log('Usage: node scripts/generate-episode.mjs <script-file> <output-path> [options]');
    console.log('');
    console.log('Mode Selection:');
    console.log('  Default:        Local Qwen3-TTS (FREE, quality mode, emotes preserved)');
    console.log('  --fast/-f:      Local Qwen3-TTS (FREE, fast mode, emotes stripped)');
    console.log('  --public/-p:    ElevenLabs (PAID, highest quality, emotes preserved)');
    console.log('');
    console.log('Options:');
    console.log('  --dry-run/-n:   Preview what would happen without generating audio');
    console.log('');
    console.log('Emote Handling:');
    console.log('  ElevenLabs:     [thoughtful], [emphatic] etc interpreted by model');
    console.log('  Local Quality:  Emotes converted to style instructions');
    console.log('  Local Fast:     Emotes stripped for faster generation');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/generate-episode.mjs script.txt out.mp3              # Quality');
    console.log('  node scripts/generate-episode.mjs script.txt out.mp3 --fast       # Fast');
    console.log('  node scripts/generate-episode.mjs script.txt out.mp3 --public     # ElevenLabs');
    console.log('  node scripts/generate-episode.mjs script.txt out.mp3 --dry-run    # Preview');
    process.exit(1);
  }

  const [scriptFile, outputPath] = positionalArgs;

  // Resolve paths
  const resolvedScriptPath = path.resolve(scriptFile);
  const resolvedOutputPath = path.resolve(outputPath);

  if (!fs.existsSync(resolvedScriptPath)) {
    console.error(`Error: Script file not found: ${resolvedScriptPath}`);
    process.exit(1);
  }

  const modeLabel = {
    'elevenlabs': 'ELEVENLABS (PAID)',
    'local-quality': 'LOCAL-QUALITY (FREE)',
    'local-fast': 'LOCAL-FAST (FREE)',
  }[TTS_MODE];

  console.log('=== Episode Generator ===');
  console.log(`Mode: ${modeLabel}`);
  console.log(`Script: ${resolvedScriptPath}`);
  console.log(`Output: ${resolvedOutputPath}`);
  console.log('');

  const rawScript = fs.readFileSync(resolvedScriptPath, 'utf-8');
  console.log(`Raw script length: ${rawScript.length} characters`);

  // Apply mode-specific preprocessing
  let processedScript;
  switch (TTS_MODE) {
    case 'elevenlabs':
      processedScript = preprocessForElevenLabs(rawScript);
      break;
    case 'local-quality':
      processedScript = preprocessForLocalQuality(rawScript);
      break;
    case 'local-fast':
      processedScript = preprocessForLocalFast(rawScript);
      break;
  }
  console.log(`Processed script length: ${processedScript.length} characters`);
  console.log('');

  // Show preview
  console.log('--- Script Preview ---');
  console.log(processedScript.substring(0, 500) + '...');
  console.log('--- End Preview ---');
  console.log('');

  // Calculate chunks for estimation
  const chunks = TTS_MODE === 'elevenlabs'
    ? splitTextForElevenLabs(processedScript)
    : splitTextForLocal(processedScript);

  // Estimate generation time (rough: 1x realtime for local, faster for ElevenLabs)
  const wordsPerMinute = 150;
  const wordCount = processedScript.split(/\s+/).length;
  const audioDurationMins = wordCount / wordsPerMinute;
  const estimatedTimeSecs = TTS_MODE === 'elevenlabs'
    ? audioDurationMins * 60 * 0.3  // ElevenLabs is faster
    : audioDurationMins * 60 * 1.1; // Local is ~1x realtime

  // Dry run mode - show what would happen without generating
  if (isDryRun) {
    console.log('=== DRY RUN (no audio will be generated) ===');
    console.log('');
    console.log('Generation Plan:');
    console.log(`  Chunks: ${chunks.length}`);
    console.log(`  Words: ~${wordCount}`);
    console.log(`  Est. audio: ~${audioDurationMins.toFixed(1)} minutes`);
    console.log(`  Est. generation time: ~${(estimatedTimeSecs / 60).toFixed(1)} minutes`);
    console.log('');

    // Check service availability
    if (TTS_MODE === 'elevenlabs') {
      console.log('ElevenLabs Status:');
      const billing = await checkElevenLabsBilling();
      if (billing.status === 'no_key') {
        console.log('  Status: NO API KEY');
      } else if (billing.status === 'active' || billing.status === 'trialing') {
        console.log(`  Status: ${billing.status} (${billing.tier})`);
        console.log(`  Characters: ${billing.chars_used}/${billing.chars_limit} used`);
        console.log(`  Need: ${processedScript.length} chars`);
        const remaining = billing.chars_limit - billing.chars_used;
        console.log(`  Available: ${remaining} chars (${remaining >= processedScript.length ? 'OK' : 'INSUFFICIENT'})`);
      } else {
        console.log(`  Status: ${billing.status} - ${billing.message || 'Check billing'}`);
      }
    } else {
      console.log('Local TTS Status:');
      const detectedUrl = await detectTtsUrl();
      if (detectedUrl) {
        try {
          const health = await (await fetch(`${detectedUrl}/v1/tts/health`)).json();
          console.log(`  URL: ${detectedUrl}`);
          console.log(`  Status: ${health.status}`);
          console.log(`  Model: ${health.model_name}`);
          console.log(`  Speaker: ${health.speaker || 'default'}`);
        } catch (e) {
          console.log(`  URL: ${detectedUrl}`);
          console.log(`  Status: ERROR - ${e.message}`);
        }
      } else {
        console.log('  Status: NOT FOUND');
        console.log('  Action: Run `docker compose up tts` first');
      }
    }

    console.log('');
    console.log('To generate, run without --dry-run');
    process.exit(0);
  }

  console.log('Generating audio...');
  console.log(`  Estimated time: ~${(estimatedTimeSecs / 60).toFixed(1)} minutes`);
  const startTime = Date.now();

  try {
    if (TTS_MODE === 'elevenlabs') {
      await generateWithElevenLabs(processedScript, resolvedOutputPath);
    } else {
      await generateWithLocal(processedScript, resolvedOutputPath, TTS_MODE);
    }
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nComplete! Generated in ${elapsed}s`);
  } catch (error) {
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

main().catch(console.error);
