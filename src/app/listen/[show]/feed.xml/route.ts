import { NextResponse } from "next/server";
import { getShowBySlug, getEpisodesForShow } from "@/lib/content";
import fs from "fs";
import path from "path";

// Base URL — override via NEXT_PUBLIC_SITE_URL env var
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://improv.jaychristopher.com";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function loadDurations(): Record<string, { seconds: number; formatted: string }> {
  const durPath = path.join(process.cwd(), "public", "audio", "durations.json");
  if (!fs.existsSync(durPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(durPath, "utf-8"));
  } catch {
    return {};
  }
}

function getFileSize(audioUrl: string): number {
  const filePath = path.join(process.cwd(), "public", audioUrl);
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

export async function generateStaticParams() {
  // Import here to avoid circular dependency issues
  const { loadShows } = await import("@/lib/content");
  const shows = await loadShows();
  return shows.map((s) => ({ show: s.frontmatter.id }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ show: string }> }
) {
  const { show: showSlug } = await params;
  const show = await getShowBySlug(showSlug);

  if (!show) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fm = show.frontmatter;
  const seasons = await getEpisodesForShow(fm.id);
  const durations = loadDurations();

  // Flatten episodes across seasons
  const allEpisodes = seasons.flatMap((s) => s.episodes);

  const pubDate = new Date().toUTCString();

  const items = allEpisodes
    .map((ep, i) => {
      const dur = durations[ep.audioUrl];
      const fileSize = getFileSize(ep.audioUrl);
      const durationSecs = dur?.seconds ?? 0;
      const hours = Math.floor(durationSecs / 3600);
      const mins = Math.floor((durationSecs % 3600) / 60);
      const secs = durationSecs % 60;
      const itunesDuration = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      return `    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${SITE_URL}${ep.href}</link>
      <guid isPermaLink="false">${showSlug}-${i}</guid>
      <description>${escapeXml(ep.description ?? ep.title)}</description>
      <enclosure url="${SITE_URL}${ep.audioUrl}" length="${fileSize}" type="audio/mpeg" />
      <itunes:duration>${itunesDuration}</itunes:duration>
      <itunes:episode>${i + 1}</itunes:episode>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(fm.title)}</title>
    <link>${SITE_URL}/listen/${showSlug}</link>
    <atom:link href="${SITE_URL}/listen/${showSlug}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(fm.description)}</description>
    <language>en-us</language>
    <pubDate>${pubDate}</pubDate>
    <itunes:author>The Physics of Connection</itunes:author>
    <itunes:summary>${escapeXml(fm.description)}</itunes:summary>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Education">
      <itunes:category text="Self-Improvement" />
    </itunes:category>
${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
