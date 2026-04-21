const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export type AudioContentType = "bridges" | "paths" | "threads" | "atoms";

const AUDIO_PREFIX = "/audio/";

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export const AUDIO_CDN = trimTrailingSlash(process.env.NEXT_PUBLIC_AUDIO_CDN || "");

export function isAbsoluteUrl(value: string): boolean {
  return ABSOLUTE_URL_PATTERN.test(value);
}

export function getRelativeAudioPath(type: AudioContentType, slug: string): string {
  return `${AUDIO_PREFIX}${type}/${slug}.mp3`;
}

export function getAudioAssetUrl(audioPath: string): string {
  if (!audioPath) return audioPath;
  if (isAbsoluteUrl(audioPath) || !AUDIO_CDN) return audioPath;
  return `${AUDIO_CDN}${audioPath.startsWith("/") ? audioPath : `/${audioPath}`}`;
}

export function getAudioManifestKey(audioUrl: string): string | null {
  if (!audioUrl) return null;
  if (audioUrl.startsWith(AUDIO_PREFIX)) return audioUrl;
  if (audioUrl.startsWith("audio/")) return `/${audioUrl}`;

  if (isAbsoluteUrl(audioUrl)) {
    try {
      const pathname = new URL(audioUrl).pathname;
      const markerIndex = pathname.indexOf(AUDIO_PREFIX);
      return markerIndex === -1 ? null : pathname.slice(markerIndex);
    } catch {
      return null;
    }
  }

  const markerIndex = audioUrl.indexOf(AUDIO_PREFIX);
  return markerIndex === -1 ? null : audioUrl.slice(markerIndex);
}

export function toAbsoluteSiteUrl(value: string, siteUrl: string): string {
  if (isAbsoluteUrl(value)) return value;
  const normalizedSiteUrl = trimTrailingSlash(siteUrl);
  const normalizedValue = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedSiteUrl}${normalizedValue}`;
}
