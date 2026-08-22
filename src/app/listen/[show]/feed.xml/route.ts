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

/** Shown as the podcast author in directories. */
const PODCAST_AUTHOR = "The Physics of Connection";

/**
 * Apple Podcasts requires an owner email to verify a submission. It is read
 * from the environment rather than committed, so a personal address is never
 * baked into a public feed; without it the feed is still valid, but cannot be
 * submitted to Apple until the variable is set.
 */
const OWNER_EMAIL = process.env.PODCAST_OWNER_EMAIL;

export async function GET(_request: Request, { params }: { params: Promise<{ show: string }> }) {
  const { show: showSlug } = await params;
  const show = await getShowBySlug(showSlug);

  if (!show) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fm = show.frontmatter;
  const seasons = await getEpisodesForShow(fm.id);
  const allEpisodes = seasons.flatMap((s) => s.episodes);

  // Every item previously carried `new Date()`, so all episodes shared one
  // timestamp that changed on each request. Clients order by pubDate and use it
  // to detect new episodes, so identical churning dates broke both. Fall back to
  // the show's own created date rather than to "now".
  const showDate = new Date(fm.created);
  const episodeDate = (ep: (typeof allEpisodes)[number]) => {
    const parsed = ep.published ? new Date(ep.published) : showDate;
    return Number.isNaN(parsed.getTime()) ? showDate : parsed;
  };
  const channelDate = allEpisodes.reduce(
    (latest, ep) => (episodeDate(ep) > latest ? episodeDate(ep) : latest),
    showDate,
  );
  const artworkUrl = `${SITE_URL}/og/podcast?title=${encodeURIComponent(fm.title)}`;

  const ownerBlock = OWNER_EMAIL
    ? `
    <itunes:owner>
      <itunes:name>${escapeXml(PODCAST_AUTHOR)}</itunes:name>
      <itunes:email>${escapeXml(OWNER_EMAIL)}</itunes:email>
    </itunes:owner>`
    : "";

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
      <itunes:episodeType>full</itunes:episodeType>
      <itunes:explicit>false</itunes:explicit>
      <itunes:image href="${escapeXml(artworkUrl)}" />
      <pubDate>${episodeDate(ep).toUTCString()}</pubDate>
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
    <pubDate>${channelDate.toUTCString()}</pubDate>
    <lastBuildDate>${channelDate.toUTCString()}</lastBuildDate>
    <itunes:author>${escapeXml(PODCAST_AUTHOR)}</itunes:author>
    <itunes:summary>${escapeXml(fm.description)}</itunes:summary>
    <itunes:explicit>false</itunes:explicit>
    <itunes:type>episodic</itunes:type>
    <itunes:image href="${escapeXml(artworkUrl)}" />${ownerBlock}
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
