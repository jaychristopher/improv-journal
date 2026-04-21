import fs from "fs";
import path from "path";

import { getAudioManifestKey } from "./audio";

export interface AudioManifestEntry {
  seconds: number;
  formatted: string;
  size?: number;
}

let manifestCache: Record<string, AudioManifestEntry> | null = null;

export function loadAudioManifest(): Record<string, AudioManifestEntry> {
  if (manifestCache) return manifestCache;

  try {
    const manifestPath = path.join(process.cwd(), "public", "audio", "durations.json");
    manifestCache = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<
      string,
      AudioManifestEntry
    >;
  } catch {
    manifestCache = {};
  }

  return manifestCache;
}

export function getAudioManifestEntry(audioUrl: string): AudioManifestEntry | undefined {
  const manifestKey = getAudioManifestKey(audioUrl);
  if (!manifestKey) return undefined;
  return loadAudioManifest()[manifestKey];
}

export function getAudioDuration(audioUrl: string): string | undefined {
  return getAudioManifestEntry(audioUrl)?.formatted;
}

export function getAudioFileSize(audioUrl: string): number {
  const entry = getAudioManifestEntry(audioUrl);
  if (entry?.size !== undefined) return entry.size;

  const manifestKey = getAudioManifestKey(audioUrl);
  if (!manifestKey) return 0;

  try {
    return fs.statSync(path.join(process.cwd(), "public", manifestKey.slice(1))).size;
  } catch {
    return 0;
  }
}
