/**
 * Audit peak boundaries against actual word timings.
 * Each peak has an "anchor phrase" that uniquely identifies where its visual
 * should start in the audio. We find that phrase in the transcription and use
 * its start timestamp as the peak's true start.
 *
 * Output: corrected peak durations in seconds + frames-at-30fps, plus a diff
 * report against the current Remotion durations.
 *
 * Usage:
 *   node scripts/audit-peak-sync.mjs L1
 *   node scripts/audit-peak-sync.mjs L23
 *   node scripts/audit-peak-sync.mjs L31
 *   node scripts/audit-peak-sync.mjs all
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Anchor phrases per video — first 2-4 words of each peak's spoken content.
// Lowercase, punctuation-stripped match against word stream.
const ANCHORS = {
  L1: {
    timingsPath: "docs/youtube-week-1/L1-timings.json",
    currentPeaks: [9, 16, 8, 50, 32, 32, 30, 28, 28, 50],
    peaks: [
      { num: 1, label: "Hook", anchor: ["you", "can", "stop"] },
      { num: 2, label: "Simulation", anchor: ["someone", "asks", "you"] },
      { num: 3, label: "Safe/Dead", anchor: ["deliver", "something", "safe"] },
      { num: 4, label: "Bandwidth (anchor)", anchor: ["that's", "not", "a", "willpower"] },
      { num: 5, label: "Internal computation", anchor: ["internal", "computation"] },
      { num: 6, label: "Forget yourself + Johnstone", anchor: ["improv", "performers", "discover"] },
      { num: 7, label: "Mirroring (Exercise 1)", anchor: ["three", "exercises"] },
      { num: 8, label: "First Line Drill (Exercise 2)", anchor: ["exercise", "two"] },
      { num: 9, label: "Last Word Response (Exercise 3)", anchor: ["exercise", "three"] },
      { num: 10, label: "Closing / Redirect", anchor: ["these", "three", "exercises"] },
    ],
  },
  L23: {
    timingsPath: "docs/youtube-week-1/L23-timings.json",
    currentPeaks: [14, 14, 30, 60, 18, 50, 50, 40, 28, 35, 30, 65],
    peaks: [
      { num: 1, label: "Most team bonding fails", anchor: ["most"] },
      { num: 2, label: "Fun ≠ Trust", anchor: ["the", "problem", "isn't"] },
      { num: 3, label: "Trust = the art form", anchor: ["improv", "ensembles"] },
      { num: 4, label: "Mirroring", anchor: ["exercise", "one"] },
      { num: 5, label: "No leader", anchor: ["why", "it", "works"] },
      { num: 6, label: "Gift Giving", anchor: ["exercise", "two"] },
      { num: 7, label: "Yes And Chain", anchor: ["exercise", "three"] },
      { num: 8, label: "One-Word Scene", anchor: ["exercise", "four"] },
      { num: 9, label: "Sequence (1→2→3→4)", anchor: ["don't", "just"] },
      { num: 10, label: "Debrief", anchor: ["two", "more", "rules"] },
      { num: 11, label: "Return weekly", anchor: ["rule", "two"] },
      { num: 12, label: "Closing / Teamwork", anchor: ["60", "years"] },
    ],
  },
  L31: {
    timingsPath: "docs/youtube-week-1/L31-timings.json",
    currentPeaks: [18, 35, 80, 60, 60, 70, 50, 18, 18, 22, 32.2],
    peaks: [
      { num: 1, label: "Search bar", anchor: ["you", "searched"] },
      { num: 2, label: "Standard list (strikes)", anchor: ["about", "half"] },
      { num: 3, label: "Yes And · 3 traditions", anchor: ["rule", "one"] },
      { num: 4, label: "Empty vs Loaded", anchor: ["rule", "two"] },
      { num: 5, label: "5 traditions agree", anchor: ["rule", "three"] },
      { num: 6, label: "Blocking taxonomy", anchor: ["rule", "four"] },
      { num: 7, label: "Del Close quote", anchor: ["rule", "five"] },
      { num: 8, label: "Strip away", anchor: ["now", "strip"] },
      { num: 9, label: "Get out of your head", anchor: ["get", "out"] },
      { num: 10, label: "Training wheels", anchor: ["training", "wheels"] },
      { num: 11, label: "Closing / books", anchor: ["if", "you", "want"] },
    ],
  },
};

function normalize(s) {
  return s.toLowerCase().replace(/[^a-z']/g, "");
}

function findAnchorStart(words, anchorTokens) {
  const target = anchorTokens.map(normalize);
  for (let i = 0; i <= words.length - target.length; i++) {
    let match = true;
    for (let j = 0; j < target.length; j++) {
      if (normalize(words[i + j].word) !== target[j]) {
        match = false;
        break;
      }
    }
    if (match) return { wordIndex: i, start: words[i].start };
  }
  return null;
}

function audit(videoKey) {
  const cfg = ANCHORS[videoKey];
  const timingsPath = path.join(ROOT, cfg.timingsPath);
  if (!fs.existsSync(timingsPath)) {
    console.log(`⚠ ${videoKey}: timings file not found at ${cfg.timingsPath} — run transcribe-with-timings.mjs first`);
    return null;
  }
  const words = JSON.parse(fs.readFileSync(timingsPath, "utf-8"));
  const audioEnd = words[words.length - 1].end;

  console.log(`\n=== ${videoKey} === (audio: ${audioEnd.toFixed(2)}s)`);

  const found = [];
  for (const p of cfg.peaks) {
    const hit = findAnchorStart(words, p.anchor);
    found.push({ peak: p, hit });
    if (!hit) {
      console.log(`  ⚠ Peak ${p.num} (${p.label}) — anchor not found: [${p.anchor.join(" ")}]`);
    }
  }

  // Compute corrected durations from start-of-next-peak minus start-of-this-peak
  const peakStarts = found.map((f) => f.hit?.start ?? null);
  const corrected = [];
  for (let i = 0; i < found.length; i++) {
    const start = peakStarts[i];
    const nextStart = i + 1 < found.length ? peakStarts[i + 1] : audioEnd;
    if (start === null || nextStart === null) {
      corrected.push(null);
    } else {
      corrected.push(nextStart - start);
    }
  }

  // Print diff report
  const headers = ["#", "Label", "AnchorAt", "Current", "Correct", "Δ", "Frames@30"];
  const widths = [3, 32, 10, 9, 9, 9, 12];
  console.log(headers.map((h, i) => h.padEnd(widths[i])).join(" "));
  console.log(widths.map((w) => "-".repeat(w)).join(" "));
  for (let i = 0; i < found.length; i++) {
    const f = found[i];
    const cur = cfg.currentPeaks[i] ?? null;
    const cor = corrected[i];
    const delta = cor != null && cur != null ? cor - cur : null;
    const frames = cor != null ? Math.round(cor * 30) : null;
    const row = [
      String(f.peak.num),
      f.peak.label.slice(0, 30),
      f.hit ? f.hit.start.toFixed(2) + "s" : "—",
      cur != null ? cur.toFixed(1) + "s" : "—",
      cor != null ? cor.toFixed(2) + "s" : "—",
      delta != null ? (delta >= 0 ? "+" : "") + delta.toFixed(2) + "s" : "—",
      frames != null ? String(frames) : "—",
    ];
    console.log(row.map((c, i) => c.padEnd(widths[i])).join(" "));
  }

  // Total drift
  const totalCurrent = cfg.currentPeaks.reduce((s, x) => s + x, 0);
  const totalCorrect = corrected.reduce((s, x) => s + (x ?? 0), 0);
  console.log(`\nTotal: current=${totalCurrent.toFixed(1)}s  corrected=${totalCorrect.toFixed(2)}s  audio=${audioEnd.toFixed(2)}s`);

  return { videoKey, peaks: found.map((f, i) => ({ ...f.peak, start: peakStarts[i], duration: corrected[i] })), audioEnd };
}

const arg = process.argv[2] ?? "all";
const targets = arg === "all" ? ["L1", "L23", "L31"] : [arg];
const results = {};
for (const t of targets) {
  const r = audit(t);
  if (r) results[t] = r;
}

// Save the corrected map to disk for use by the next step
const outPath = path.join(ROOT, "docs/youtube-week-1/peak-sync-audit.json");
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nFull audit saved → docs/youtube-week-1/peak-sync-audit.json`);
