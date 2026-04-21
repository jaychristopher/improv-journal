import { NextResponse } from "next/server";

import { toAbsoluteSiteUrl } from "@/lib/audio";
import { getAudioFileSize, getAudioManifestEntry } from "@/lib/audio-manifest";
import { getEpisodesForShow, getShowBySlug } from "@/lib/content";
import { SITE_URL } from "@/lib/seo";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateStaticParams() {
  const { loadShows } = await import("@/lib/content");
  const shows = await loadShows();
  return shows.map((s) => ({ show: s.frontmatter.id }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ show: string }> }) {
  const { show: showSlug } = await params;
  const show = await getShowBySlug(showSlug);

  if (!show) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fm = show.frontmatter;
  const seasons = await getEpisodesForShow(fm.id);
  const allEpisodes = seasons.flatMap((s) => s.episodes);
  const pubDate = new Date().toUTCString();

  const items = allEpisodes
    .map((ep, i) => {
      const entry = getAudioManifestEntry(ep.audioUrl);
      const durationSecs = entry?.seconds ?? 0;
      const hours = Math.floor(durationSecs / 3600);
      const mins = Math.floor((durationSecs % 3600) / 60);
      const secs = durationSecs % 60;
      const itunesDuration = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

      return `    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${toAbsoluteSiteUrl(ep.href, SITE_URL)}</link>
      <guid isPermaLink="false">${showSlug}-${i}</guid>
      <description>${escapeXml(ep.description ?? ep.title)}</description>
      <enclosure url="${toAbsoluteSiteUrl(ep.audioUrl, SITE_URL)}" length="${getAudioFileSize(ep.audioUrl)}" type="audio/mpeg" />
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
    <link>${toAbsoluteSiteUrl(`/listen/${showSlug}`, SITE_URL)}</link>
    <atom:link href="${toAbsoluteSiteUrl(`/listen/${showSlug}/feed.xml`, SITE_URL)}" rel="self" type="application/rss+xml" />
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
