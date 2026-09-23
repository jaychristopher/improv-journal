import fs from "fs";
import path from "path";

import type { AudioContentType } from "./audio";
import { loadAtoms } from "./content";
import type { AtomType } from "./schema";

/**
 * The delivery register of the TTS scripts, as a reading rather than a script.
 *
 * `content/scripts/SCRIPT_GUIDE.md` is a specification: 9 emote tags, 3 pacing
 * tags, no markdown, no speaker labels, 800-1200 words. The 319 scripts under
 * `content/scripts/{atoms,bridges,paths,threads}` apply it 12,800 times, and
 * until 2026-09-22 nothing checked any of it (tracker entry 348) — the guide's
 * only reader was the person writing the next script. This module is the
 * parser both guards use: `script-format.test.ts` for conformance, and the
 * profile below for what the tags say that the pages do not.
 *
 * `transcripts.ts` is the other reader, and its one job with a direction is to
 * delete it (`STAGE_DIRECTION = /\[[^\]]*\]/g`, module-private): a reader never
 * sees a tag. So the judgement encoded in them — which atom type is voiced
 * warmly and which assertively — reaches the voice model and nothing else.
 *
 * The profile, measured 2026-09-22 against the atoms only (the 114 guide, path
 * and lesson scripts have no atom type to group by) and over emote tags only
 * (pauses are pacing, not register), counting a tag per type only at 8 uses or
 * more. Ratio is the type's share of the tag against the atom corpus's share:
 *
 *   type         tags  over-represented                         under
 *   principle     259  conversational 1.78, warm 1.40           matter-of-fact 0.57
 *   technique    1311  conversational 1.60, confident 1.56,     matter-of-fact 0.42
 *                      warm 1.50
 *   insight       147  warm 1.77                                emphatic 0.84
 *   law           208  warm 1.63, contemplative 1.19            matter-of-fact 0.48
 *   antipattern   327  warm 1.31, contemplative 1.21            matter-of-fact 0.68
 *   exercise      893  conversational 1.23, warm 1.17           confident 0.40
 *   pattern       269  confident 1.46, serious 1.24             warm 0.63
 *   reference    1147  matter-of-fact 1.52, confident 1.13      warm 0.52
 *   format        835  matter-of-fact 1.36, emphatic 1.25       warm 0.69
 *   definition    966  matter-of-fact 1.37, emphatic 1.13       warm 0.69
 *   pedagogy      140  matter-of-fact 1.42, contemplative 1.13  warm 0.89
 *   framework     163  curious 1.08, teaching 1.06              warm 0.76
 *
 * The corpus decided, across 205 atoms, that a failure is discussed gently and
 * a pattern assertively — `antipattern` warm and contemplative against
 * `pattern` confident and serious — which no page surface says. Nothing
 * renders this and nothing should: a per-type tone line on a hub would be a
 * claim about the writing, not about improv. It lives here so the measurement
 * is code, and in `docs/seeds.md` where the author reads it.
 */

const SCRIPTS_DIR = path.join(process.cwd(), "content", "scripts");
const GUIDE = path.join(SCRIPTS_DIR, "SCRIPT_GUIDE.md");

/** The 4 layers with an `<id>-tts.txt` per published page; `youtube/` is cut takes, not the graph. */
const LAYERS: readonly AudioContentType[] = ["atoms", "bridges", "paths", "threads"];

/** Every bracketed direction, the way `transcripts.ts` strips them. */
const DIRECTION = /\[([^\]]*)\]/g;

/**
 * Not a delivery tag: a provenance marker the rewrite pass left on the last
 * line of 310 of the 319 scripts, alone on its own line. It is outside the
 * guide's vocabulary and always will be, so it is named rather than counted
 * as a stray — the guide documents delivery, not which files were re-cut.
 */
export const PROVENANCE_MARKERS: ReadonlySet<string> = new Set(["rewritten"]);

/** A tag must reach this many uses in a type before its ratio means anything. */
export const MIN_TAG_USES_FOR_RATIO = 8;

export interface ScriptGuideFormat {
  /** The 9 tags the guide lists for the voice, in guide order. */
  emoteTags: readonly string[];
  /** The 3 pacing tags. */
  pauseTags: readonly string[];
  /** Both, which is the whole permitted vocabulary. */
  tags: readonly string[];
  /** The word target for an atom, guide or path script. */
  wordBand: { min: number; max: number };
  /** The guide's separate, longer target for a lesson script. */
  threadWordBand: { min: number; max: number };
}

let formatCache: ScriptGuideFormat | null = null;

/**
 * The vocabulary and the word band read out of the guide itself, so the guard
 * moves when the specification does instead of asserting a copy of it. Parsed
 * from the `## Format` section's 2 tag bullets and its `Target:` line; the
 * fenced example in that section is skipped, because its `[emote]` is a
 * placeholder rather than a tag. Throws when the section stops parsing, since
 * an empty vocabulary would let every stray through silently.
 */
export function getScriptGuideFormat(): ScriptGuideFormat {
  if (formatCache) return formatCache;

  const sections = fs.readFileSync(GUIDE, "utf-8").split(/^## /m);
  const format = sections.find((s) => s.startsWith("Format"));
  if (!format) throw new Error(`${GUIDE}: no "## Format" section`);

  const bullet = (label: RegExp): string[] => {
    const line = format.split("\n").find((l) => l.startsWith("-") && label.test(l));
    if (!line) throw new Error(`${GUIDE}: no Format bullet matching ${label}`);
    return [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  };

  const threads = sections.find((s) => s.startsWith("Thread scripts"));
  if (!threads) throw new Error(`${GUIDE}: no "## Thread scripts" section`);

  const emoteTags = bullet(/emote tag/i);
  const pauseTags = bullet(/pacing tags/i);

  formatCache = {
    emoteTags,
    pauseTags,
    tags: [...emoteTags, ...pauseTags],
    wordBand: readBand(format, "Format"),
    threadWordBand: readBand(threads, "Thread scripts"),
  };
  return formatCache;
}

/** `Target: 800–1200 words` or `Target 1500–2500 words`, either dash. */
function readBand(section: string, name: string): { min: number; max: number } {
  const band = section.match(/Target:?\s*([\d,]+)\s*[–-]\s*([\d,]+)\s*words/);
  if (!band) throw new Error(`${GUIDE}: no word target in the ${name} section`);
  return {
    min: Number(band[1].replace(/,/g, "")),
    max: Number(band[2].replace(/,/g, "")),
  };
}

export interface ScriptFile {
  layer: AudioContentType;
  /** The page id: the filename without `-tts.txt`. */
  id: string;
  /** Repo-relative, forward slashes, so a failure names the file to open. */
  file: string;
  /** Every bracketed direction in order, markers included. */
  directions: readonly string[];
  /**
   * Spoken words: directions removed first, the way the transcript a reader
   * sees is built. Counting the brackets as words instead adds 30 to 60 a
   * file and moves the band count, which is why this module counts what is
   * said rather than what is written.
   */
  words: number;
  /** Lines opening with `#`, which the guide forbids. */
  headingLines: readonly string[];
  /** Runs of `**`, which the guide forbids. */
  boldRuns: number;
  /** Lines opening `A:` or `B:`, the speaker labels the guide forbids. */
  speakerLabelLines: readonly string[];
}

let scriptsCache: readonly ScriptFile[] | null = null;

/**
 * Every published script, parsed once. Memoised because the format guard, the
 * register and the seeds page all walk the same 319 files.
 */
export function getScripts(): readonly ScriptFile[] {
  if (scriptsCache) return scriptsCache;

  const scripts: ScriptFile[] = [];
  for (const layer of LAYERS) {
    const dir = path.join(SCRIPTS_DIR, layer);
    for (const name of fs.readdirSync(dir).sort()) {
      if (!name.endsWith("-tts.txt")) continue;
      const raw = fs.readFileSync(path.join(dir, name), "utf-8");
      const lines = raw.split(/\r?\n/);
      const spoken = lines
        .map((line) => line.replace(DIRECTION, "").replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");
      scripts.push({
        layer,
        id: name.replace(/-tts\.txt$/, ""),
        file: `content/scripts/${layer}/${name}`,
        directions: [...raw.matchAll(DIRECTION)].map((m) => m[1]),
        words: spoken ? spoken.split(" ").length : 0,
        headingLines: lines.filter((l) => l.startsWith("#")),
        boldRuns: (raw.match(/\*\*/g) ?? []).length,
        speakerLabelLines: lines.filter((l) => /^[A-Z]:/.test(l)),
      });
    }
  }
  scriptsCache = scripts;
  return scriptsCache;
}

export interface TagRate {
  tag: string;
  count: number;
  /** The type's share of this tag divided by the atom corpus's share. */
  ratio: number;
}

export interface TypeRegister {
  type: AtomType;
  /** Atom scripts of this type. */
  scripts: number;
  /** Emote tags in them; pauses are excluded from every figure here. */
  tags: number;
  /** Tags at `MIN_TAG_USES_FOR_RATIO` or more, most over-represented first. */
  profile: readonly TagRate[];
}

export interface ScriptRegister {
  /** Emote tag counts across the atom scripts: the baseline every ratio divides by. */
  corpus: ReadonlyMap<string, number>;
  /** Emote tags in the atom scripts, the denominator of every share. */
  corpusTags: number;
  byType: readonly TypeRegister[];
}

let registerCache: Promise<ScriptRegister> | null = null;

/**
 * The per-type tag profile. Async because the atom types come from
 * `loadAtoms()` rather than a second frontmatter parser, and memoised on the
 * promise so concurrent callers share one walk.
 */
export function getScriptRegister(): Promise<ScriptRegister> {
  if (!registerCache) registerCache = buildRegister();
  return registerCache;
}

async function buildRegister(): Promise<ScriptRegister> {
  const { emoteTags } = getScriptGuideFormat();
  const emote = new Set(emoteTags);
  const atoms = await loadAtoms();
  const typeById = new Map<string, AtomType>(
    atoms.map((a) => [a.frontmatter.id, a.frontmatter.type]),
  );

  const corpus = new Map<string, number>();
  const counts = new Map<AtomType, Map<string, number>>();
  const scriptCount = new Map<AtomType, number>();

  for (const script of getScripts()) {
    if (script.layer !== "atoms") continue;
    const type = typeById.get(script.id);
    if (!type) continue; // a script whose atom was renamed or retired
    scriptCount.set(type, (scriptCount.get(type) ?? 0) + 1);
    const forType = counts.get(type) ?? new Map<string, number>();
    counts.set(type, forType);
    for (const tag of script.directions) {
      if (!emote.has(tag)) continue;
      corpus.set(tag, (corpus.get(tag) ?? 0) + 1);
      forType.set(tag, (forType.get(tag) ?? 0) + 1);
    }
  }

  const corpusTags = [...corpus.values()].reduce((sum, n) => sum + n, 0);
  const byType: TypeRegister[] = [];
  for (const [type, forType] of counts) {
    const tags = [...forType.values()].reduce((sum, n) => sum + n, 0);
    const profile = [...forType]
      .filter(([, n]) => n >= MIN_TAG_USES_FOR_RATIO)
      .map(([tag, count]) => ({
        tag,
        count,
        ratio: count / tags / ((corpus.get(tag) ?? 0) / corpusTags),
      }))
      .sort((a, b) => b.ratio - a.ratio);
    byType.push({ type, scripts: scriptCount.get(type) ?? 0, tags, profile });
  }
  byType.sort((a, b) => b.tags - a.tags);

  return { corpus, corpusTags, byType };
}

/** One type's row, or `undefined` when no atom of that type has a script. */
export function registerFor(register: ScriptRegister, type: AtomType): TypeRegister | undefined {
  return register.byType.find((r) => r.type === type);
}
