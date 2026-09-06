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

/**
 * Wrap html show notes so a podcast client gets markup rather than escaped
 * angle brackets. The only sequence CDATA cannot carry is its own terminator,
 * which is split across two sections rather than dropped.
 */
function cdata(html: string): string {
  return `<![CDATA[${html.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
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

/**
 * The Podcasting 2.0 identity of each show — what lets a directory recognise
 * this as the same podcast after its feed URL changes. Podcast Index keys on it.
 *
 * These are not random. Each is a UUIDv5 over the feed URL with the protocol
 * and any trailing slash stripped, under the namespace the spec fixes at
 * ead4c236-bf58-58c6-a2c6-a6b28d128cb6:
 *
 *   uuidv5("www.physicsofconnection.com/listen/<show>/feed.xml", NAMESPACE)
 *
 * **Never regenerate these.** A guid is a promise that survives the feed moving,
 * so a changed one reads to a directory as a different show and orphans every
 * listing and subscriber pointing at the old one. That is also why a made-up
 * UUID would be worse than none: it is stable and wrong.
 */
const SHOW_GUIDS: Record<string, string> = {
  "physics-of-connection": "d6e8bde2-4958-5eed-aab7-fd2f45af13d6",
  "improv-lab": "ddbade68-9b75-5951-9769-276464d7eec5",
  "deep-cuts": "f676962b-b553-5ea2-9fef-c9eefed045af",
};

/**
 * Episode show notes, as html.
 *
 * Every episode is the spoken version of a page that already exists, and the
 * feed knew the url all along — it was in `<link>`, which most clients do not
 * render. `<description>` is what apps actually show, and it carried no way
 * back to the site at all.
 *
 * This is also the one distribution channel here that produces links rather
 * than consuming them. Aggregators — Podcast Index, Listen Notes, Podchaser,
 * player.fm — republish show notes as html pages, so what goes in this field
 * is what gets syndicated. The `content` namespace was already declared on the
 * channel and never used.
 *
 * Two links, both to the thing the episode is actually about. Show notes are a
 * legitimate place for them and a bad place to push it.
 */
function showNotes(ep: { title: string; description?: string; href: string }): string {
  const url = toAbsoluteSiteUrl(ep.href, SITE_URL);
  const summary = ep.description ?? ep.title;
  return [
    `<p>${escapeXml(summary)}</p>`,
    `<p>Read the written version: <a href="${url}">${escapeXml(ep.title)}</a></p>`,
    `<p>From <a href="${SITE_URL}">The Physics of Connection</a>, a knowledge graph of what improv has worked out about how people build a shared reality.</p>`,
  ].join("");
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

      /*
       * The guid is the episode's identity and a client's only way to know it
       * has seen this before. It was the array index — `physics-of-connection-0`
       * — which is a position, and positions move. This feed grew from 11
       * episodes to 78 in one afternoon; every one of those additions would
       * have shifted the index of everything after it, and a subscriber would
       * have been re-delivered the entire back catalogue as new episodes.
       *
       * The page url is the one thing about an episode that does not change
       * when its neighbours do. isPermaLink stays false because this is being
       * used as an opaque identifier rather than as something to fetch.
       *
       * Changing guids is a one-time cost paid by existing subscribers, which
       * is why it happens now, before the shows are submitted anywhere, rather
       * than after a directory has been keying on them.
       */
      return `    <item>
      <title>${escapeXml(ep.title)}</title>
      <link>${toAbsoluteSiteUrl(ep.href, SITE_URL)}</link>
      <guid isPermaLink="false">${toAbsoluteSiteUrl(ep.href, SITE_URL)}</guid>
      <description>${escapeXml(ep.description ?? ep.title)}</description>
      <itunes:summary>${escapeXml(ep.description ?? ep.title)}</itunes:summary>
      <content:encoded>${cdata(showNotes(ep))}</content:encoded>
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
  xmlns:podcast="https://podcastindex.org/namespace/1.0"
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
    <itunes:image href="${escapeXml(artworkUrl)}" />
    <podcast:guid>${SHOW_GUIDS[showSlug]}</podcast:guid>${ownerBlock}
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
