import { NextResponse } from "next/server";

import { loadBridges, loadThreads } from "@/lib/content";
import {
  AUTHOR_NAME,
  AUTHOR_PATH,
  leadParagraph,
  SITE_NAME,
  SITE_URL,
  stripLeadLabel,
} from "@/lib/seo";

/**
 * Atom feed for the site's writing.
 *
 * The podcasts have had feeds all along; the writing never did. 237 dated
 * pieces of content and no way to follow them, and no autodiscovery link on
 * any page, so feed readers and the aggregators that crawl them had nothing to
 * find. For a site whose measured problem is discovery rather than ranking,
 * that is a channel left switched off.
 *
 * Atom rather than RSS: entry ids and updated timestamps are required by the
 * spec, so readers can tell an edit from a new piece.
 */

/** Prerender at build: the feed changes only when content does. */
export const dynamic = "force-static";

/** Most recent entries to carry. A feed is a window, not an archive. */
const MAX_ENTRIES = 50;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Frontmatter dates are plain YYYY-MM-DD; Atom needs RFC 3339. */
function toRfc3339(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? new Date(0).toISOString() : parsed.toISOString();
}

export async function GET() {
  const [bridges, threads] = await Promise.all([loadBridges(), loadThreads()]);

  const entries = [
    ...bridges.map((b) => ({
      title: b.frontmatter.title,
      path: `/${b.slug}`,
      summary: b.frontmatter.description,
      published: b.frontmatter.created,
      updated: b.frontmatter.updated ?? b.frontmatter.created,
      category: "Guide",
    })),
    ...threads.map((t) => ({
      title: t.frontmatter.title,
      path: `/threads/${t.frontmatter.id}`,
      summary: leadParagraph(stripLeadLabel(t.content), 300),
      published: t.frontmatter.created,
      updated: t.frontmatter.updated ?? t.frontmatter.created,
      category: "Lesson",
    })),
  ]
    .filter((e) => e.title && e.path)
    .sort((a, b) => toRfc3339(b.updated).localeCompare(toRfc3339(a.updated)))
    .slice(0, MAX_ENTRIES);

  const feedUpdated = entries[0] ? toRfc3339(entries[0].updated) : new Date(0).toISOString();

  const items = entries
    .map(
      (e) => `  <entry>
    <title>${escapeXml(e.title)}</title>
    <link href="${SITE_URL}${e.path}" />
    <id>${SITE_URL}${e.path}</id>
    <published>${toRfc3339(e.published)}</published>
    <updated>${toRfc3339(e.updated)}</updated>
    <category term="${escapeXml(e.category)}" />
    <summary type="text">${escapeXml(e.summary ?? e.title)}</summary>
  </entry>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(SITE_NAME)}</title>
  <subtitle>Improv skills for everyday life — guides and lessons.</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" type="application/atom+xml" />
  <link href="${SITE_URL}/" rel="alternate" type="text/html" />
  <id>${SITE_URL}/</id>
  <updated>${feedUpdated}</updated>
  <author>
    <name>${escapeXml(AUTHOR_NAME)}</name>
    <uri>${SITE_URL}${AUTHOR_PATH}</uri>
  </author>
${items}
</feed>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
