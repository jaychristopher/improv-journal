import crypto from "crypto";
import fs from "fs";
import path from "path";

import type { AudioContentType } from "./audio";
import { autolinkTranscript } from "./content";
import { readingMinutes } from "./reading-time";

/**
 * The audio scripts as page content.
 *
 * `content/scripts/<layer>/<id>-tts.txt` is what the MP3 under each player
 * was read from: a two-voice dialogue, one spoken line per paragraph, each
 * line opening with a delivery note in square brackets (`[curious]`,
 * `[short pause]`) for the voice model. It is 331,676 words against 376,060
 * of page prose, and until 2026-09-21 no page showed it, no search read it
 * and no test opened it (tracker entry 257). This module is the one reader
 * the pages share: the directions are stripped, the spoken lines kept, and
 * the result linked like a body so the corpus has edges of its own.
 */

const SCRIPTS_DIR = path.join(process.cwd(), "content", "scripts");

/** Delivery notes and pauses for the voice model; never spoken. */
const STAGE_DIRECTION = /\[[^\]]*\]/g;

interface Transcript {
  paragraphs: string[];
  words: number;
  /** Whole minutes at silent-reading pace, never zero. */
  minutes: number;
}

const transcriptCache = new Map<string, Transcript | null>();
const htmlCache = new Map<string, Promise<string[]>>();

function getTranscriptPath(layer: AudioContentType, id: string): string {
  return path.join(SCRIPTS_DIR, layer, `${id}-tts.txt`);
}

/**
 * The spoken lines of one script, in order, with every bracketed direction
 * removed and blank lines collapsed. `null` when no script exists, so a page
 * whose audio has no source renders no fold rather than an empty one.
 */
export function getTranscript(layer: AudioContentType, id: string): Transcript | null {
  const key = `${layer}/${id}`;
  const cached = transcriptCache.get(key);
  if (cached !== undefined) return cached;

  const file = getTranscriptPath(layer, id);
  let transcript: Transcript | null = null;
  if (fs.existsSync(file)) {
    const paragraphs = fs
      .readFileSync(file, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.replace(STAGE_DIRECTION, "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const text = paragraphs.join(" ");
    transcript = {
      paragraphs,
      words: text ? text.split(" ").length : 0,
      minutes: readingMinutes(text),
    };
  }
  transcriptCache.set(key, transcript);
  return transcript;
}

/**
 * The internal hrefs a rendered body links: the page's link ledger, in the
 * shape the transcript linker seeds from. Fragments and queries are dropped
 * so a hand-written `/foo#section` counts as the target `/foo` the linker
 * would otherwise add.
 */
export function linkedHrefs(bodyHtml: string): ReadonlySet<string> {
  const hrefs = new Set<string>();
  for (const match of bodyHtml.matchAll(/href="(\/[^"#?]*)/g)) hrefs.add(match[1]);
  return hrefs;
}

/**
 * Each paragraph as trusted inner HTML, autolinked through the body pipeline
 * with `currentUrl` excluded so a transcript never links its own page, and
 * with every target the page's body already links left as plain text, so
 * the fold adds only what the prose did not reach (tracker entry 267). Cached
 * per page: the same transcript renders once however many times the page is
 * generated in a build. The body's ledger is part of the key — the same
 * script under two bodies, or under one body whose links changed, is two
 * different folds — as a digest of the sorted set rather than the set
 * itself, since a body links a few dozen targets and the key already
 * carries a thousand words.
 */
export function renderTranscriptHtml(
  paragraphs: string[],
  currentUrl: string | null,
  bodyHtml?: string,
): Promise<string[]> {
  const ledger = bodyHtml ? linkedHrefs(bodyHtml) : new Set<string>();
  const ledgerKey = crypto
    .createHash("sha1")
    .update([...ledger].sort().join("\n"))
    .digest("hex");
  const key = `${currentUrl ?? ""}\n${ledgerKey}\n${paragraphs.join("\n")}`;
  let pending = htmlCache.get(key);
  if (!pending) {
    pending = autolinkTranscript(paragraphs, currentUrl, ledger);
    htmlCache.set(key, pending);
  }
  return pending;
}
