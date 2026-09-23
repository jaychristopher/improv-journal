import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { GET } from "../../app/listen/[show]/feed.xml/route";
import {
  getAtomUrl,
  getEpisodesForShow,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadShows,
  loadThreads,
} from "../content";
import {
  type EpisodeNotes,
  getEpisodeNotes,
  IDEAS_LABEL,
  NOTES_LINE_CAP,
  notesLinkCount,
  renderNotesHtml,
  renderNotesText,
  SOURCES_LABEL,
} from "../episode-notes";
import { RELATION_LABELS } from "../relation-labels";
import { SITE_URL } from "../seo";

/**
 * The feed carries each episode's edges as show notes.
 *
 * The 205 concept scripts name another concept by title 213 times in
 * 165,000 words; 78 name none; of the 358 `requires` targets with a title
 * the ear could catch, the hosts say 39 (11%). The page shows its sidebar,
 * the audio shows nothing, so a listener hears every node and almost no
 * edge (tracker entry 263, 2026-09-21). Until the scripts are re-cut the
 * feed carries the sidebar as text: one line per relation group, every name
 * a link to its page.
 *
 * Asserts presence. A notes builder that returned no lines would leave the
 * feed valid, playable and exactly as disconnected as before — the symptom
 * is an absence, so the population and the links are what is counted.
 */

type ConceptEpisode = { show: string; href: string; title: string };

async function conceptEpisodes(): Promise<ConceptEpisode[]> {
  const atoms = await loadAtoms();
  const atomHrefs = new Set<string>();
  for (const a of atoms) {
    atomHrefs.add(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }));
  }
  const out: ConceptEpisode[] = [];
  for (const show of await loadShows()) {
    for (const season of await getEpisodesForShow(show.frontmatter.id)) {
      for (const ep of season.episodes) {
        if (atomHrefs.has(ep.href)) {
          out.push({ show: show.frontmatter.id, href: ep.href, title: ep.title });
        }
      }
    }
  }
  return out;
}

/** Every site-relative path the content layer publishes, for resolving links. */
async function publishedPaths(): Promise<Set<string>> {
  const [atoms, bridges, threads, paths] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);
  const set = new Set<string>();
  for (const a of atoms) set.add(getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }));
  for (const b of bridges) set.add(`/${b.slug}`);
  for (const t of threads) set.add(`/threads/${t.frontmatter.id}`);
  for (const p of paths) set.add(`/paths/${p.frontmatter.id}`);
  return set;
}

describe("episode notes", () => {
  it("gives every concept episode with an edge a notes block with at least one link", async () => {
    const episodes = await conceptEpisodes();
    // Guard the guard: 205 concept episodes across the shows on 2026-09-22.
    expect(episodes.length).toBeGreaterThanOrEqual(200);

    const atoms = await loadAtoms();
    const byHref = new Map<string, number>();
    for (const a of atoms) {
      byHref.set(
        getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
        a.frontmatter.links?.length ?? 0,
      );
    }

    const missing: string[] = [];
    let withNotes = 0;
    let links = 0;
    for (const ep of episodes) {
      const notes = await getEpisodeNotes(ep.href);
      if (!notes) {
        missing.push(`${ep.show}: ${ep.href} has no notes entry`);
        continue;
      }
      if ((byHref.get(ep.href) ?? 0) === 0) continue;
      const n = notesLinkCount(notes);
      if (n === 0) missing.push(`${ep.show}: ${ep.href} declares edges but its notes link nothing`);
      withNotes += 1;
      links += n;
    }
    expect(missing).toEqual([]);
    // Every concept declares at least one edge today, so every episode gains a
    // block; the link count is the sidebar made audible in text.
    expect(withNotes).toBeGreaterThanOrEqual(200);
    expect(links).toBeGreaterThanOrEqual(1500);
  });

  it("links only to pages the site publishes, as absolute urls on the feed's base", async () => {
    const published = await publishedPaths();
    expect(published.size).toBeGreaterThan(300);
    const base = SITE_URL.replace(/\/$/, "");
    const bad: string[] = [];
    let checked = 0;
    for (const ep of await conceptEpisodes()) {
      const notes = (await getEpisodeNotes(ep.href))!;
      for (const line of notes.lines) {
        for (const name of line.names) {
          checked += 1;
          if (!name.url.startsWith(`${base}/`)) bad.push(`${ep.href}: ${name.url} is not absolute`);
          else if (!published.has(name.url.slice(base.length))) {
            bad.push(`${ep.href}: ${name.url} is not a page`);
          }
        }
      }
      if (!notes.pageUrl.startsWith(`${base}/`)) bad.push(`${ep.href}: pageUrl is not absolute`);
    }
    expect(checked).toBeGreaterThan(1000);
    expect(bad).toEqual([]);
  });

  it("labels each line with the sidebar's own words, and caps it", async () => {
    const allowed = new Set([
      ...Object.values(RELATION_LABELS).map((l) => l.outbound),
      SOURCES_LABEL,
      IDEAS_LABEL,
    ]);
    const labels = new Set<string>();
    let capped = 0;
    for (const ep of await conceptEpisodes()) {
      const notes = (await getEpisodeNotes(ep.href))!;
      for (const line of notes.lines) {
        labels.add(line.label);
        expect(allowed.has(line.label), `${ep.href}: "${line.label}"`).toBe(true);
        expect(line.names.length).toBeLessThanOrEqual(NOTES_LINE_CAP);
        expect(line.names.length + line.more).toBeGreaterThan(0);
        if (line.more > 0) capped += 1;
      }
    }
    // The relation labels all appear somewhere, and the reference edges
    // become the sources line rather than five different verbs for a book.
    expect(labels.has(RELATION_LABELS.requires.outbound)).toBe(true);
    expect(labels.has(RELATION_LABELS.contrasts.outbound)).toBe(true);
    expect(labels.has(SOURCES_LABEL)).toBe(true);
    // Some lines say "+N more": 53 ran past the cap on 2026-09-22
    // (`commitment` requires more than six); since entry 302 the "Builds
    // on:" line also counts what the direct view folds, 159 lines — see
    // requires-views.test.ts for the line itself.
    expect(capped).toBeGreaterThan(0);
  });

  it("gives guides, lessons and paths one line of what they declare", async () => {
    const [bridges, threads, paths] = await Promise.all([
      loadBridges(),
      loadThreads(),
      loadPaths(),
    ]);
    expect(bridges.length).toBeGreaterThan(50);
    expect(threads.length).toBeGreaterThan(20);
    expect(paths.length).toBeGreaterThan(5);
    const hrefs = [
      ...bridges.map((b) => `/${b.slug}`),
      ...threads.map((t) => `/threads/${t.frontmatter.id}`),
      ...paths.map((p) => `/paths/${p.frontmatter.id}`),
    ];
    let lined = 0;
    for (const href of hrefs) {
      const notes = await getEpisodeNotes(href);
      expect(notes, href).not.toBeNull();
      expect(notes!.lines.length).toBeLessThanOrEqual(1);
      if (notes!.lines.length) {
        expect(notes!.lines[0].label).toBe(IDEAS_LABEL);
        lined += 1;
      }
    }
    expect(lined).toBeGreaterThan(hrefs.length * 0.9);
  });

  it("renders the block as linked paragraphs and the line as plain text", () => {
    const notes: EpisodeNotes = {
      pageUrl: "https://example.test/p",
      lines: [
        {
          label: "Builds on",
          names: [
            { title: "A & B", url: "https://example.test/a" },
            { title: "C", url: "https://example.test/c" },
          ],
          more: 2,
        },
        { label: "Compare", names: [{ title: "D", url: "https://example.test/d" }], more: 0 },
      ],
    };
    const esc = (s: string) => s.replace(/&/g, "&amp;");
    const html = renderNotesHtml(notes, esc);
    expect(html).toBe(
      '<p>Builds on: <a href="https://example.test/a">A &amp; B</a>, <a href="https://example.test/c">C</a>, <a href="https://example.test/p">+2 more</a></p>' +
        '<p>Compare: <a href="https://example.test/d">D</a></p>',
    );
    expect(renderNotesText(notes)).toBe("Builds on: A & B, C, +2 more · Compare: D");
    expect(renderNotesHtml({ pageUrl: "x", lines: [] }, esc)).toBe("");
    expect(renderNotesText({ pageUrl: "x", lines: [] })).toBe("");
  });

  it("reads its labels from relation-labels rather than spelling them", () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "episode-notes.ts"),
      "utf-8",
    );
    expect(src).toMatch(/from "\.\/relation-labels"/);
    expect(src).toMatch(/outboundLabel\(/);
    for (const { outbound, inbound } of Object.values(RELATION_LABELS)) {
      expect(src, `"${outbound}" is spelled in the module`).not.toContain(`"${outbound}"`);
      expect(src, `"${inbound}" is spelled in the module`).not.toContain(`"${inbound}"`);
    }
  });
});

/**
 * A well-formedness check on the rendered feed.
 *
 * Text outside CDATA may carry no raw `<` and no `&` that is not an entity,
 * every open tag must be closed by the same name in nesting order, and a
 * CDATA section must terminate. That is the whole of what a podcast client's
 * parser rejects a feed for, and it is what an unescaped title or an
 * unterminated `]]>` split in the notes would break. Returns the first
 * problem found, or null.
 */
function xmlProblem(xml: string): string | null {
  const stack: string[] = [];
  let i = 0;
  const text = (chunk: string, at: number) => {
    if (chunk.includes("<")) return `raw "<" in text at ${at}`;
    if (/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/.test(chunk)) {
      return `unescaped "&" in text at ${at}`;
    }
    return null;
  };
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) {
      return text(xml.slice(i), i) ?? (stack.length ? `unclosed <${stack.at(-1)}>` : null);
    }
    const problem = text(xml.slice(i, lt), i);
    if (problem) return problem;
    if (xml.startsWith("<![CDATA[", lt)) {
      const end = xml.indexOf("]]>", lt);
      if (end === -1) return `unterminated CDATA at ${lt}`;
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt);
      if (end === -1) return `unterminated comment at ${lt}`;
      i = end + 3;
      continue;
    }
    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt);
      if (end === -1) return `unterminated processing instruction at ${lt}`;
      i = end + 2;
      continue;
    }
    // A tag: name, then attributes whose values are quoted, then `>` or `/>`.
    const tag = /^<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[\w.:-]+="[^"]*")*)\s*(\/?)>/.exec(xml.slice(lt));
    if (!tag) return `malformed tag at ${lt}: ${xml.slice(lt, lt + 40)}`;
    const [whole, closing, name, , selfClosing] = tag;
    if (closing) {
      const open = stack.pop();
      if (open !== name) return `</${name}> closes <${open ?? "nothing"}> at ${lt}`;
    } else if (!selfClosing) {
      stack.push(name);
    }
    i = lt + whole.length;
  }
  return stack.length ? `unclosed <${stack.at(-1)}>` : null;
}

/** The text of the first `<tag>` inside an item, entities and CDATA unwrapped. */
function field(item: string, tag: string): string {
  const raw = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(item)?.[1] ?? "";
  const unwrapped = raw.startsWith("<![CDATA[")
    ? raw.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")
    : raw;
  return unwrapped
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

describe("podcast feed with episode notes", () => {
  const render = (show: string) =>
    GET(new Request(`http://localhost/listen/${show}/feed.xml`), {
      params: Promise.resolve({ show }),
    }).then((r) => r.text());

  it("rejects what a client would reject", () => {
    expect(
      xmlProblem('<?xml version="1.0"?><a><b x="1">t &amp; <![CDATA[<p>x]]></b><c/></a>'),
    ).toBe(null);
    expect(xmlProblem("<a><b></a>")).not.toBe(null);
    expect(xmlProblem("<a>1 < 2</a>")).not.toBe(null);
    expect(xmlProblem("<a>Tom & Jerry</a>")).not.toBe(null);
    expect(xmlProblem("<a><![CDATA[open</a>")).not.toBe(null);
  });

  it("stays well-formed xml on every show, and the notes reach content:encoded", async () => {
    const shows = await loadShows();
    expect(shows.length).toBeGreaterThanOrEqual(3);
    for (const show of shows) {
      const xml = await render(show.frontmatter.id);
      expect(xmlProblem(xml), `${show.frontmatter.id} feed is not well-formed`).toBe(null);
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      expect(items.length, show.frontmatter.id).toBeGreaterThan(10);
      let withEdges = 0;
      for (const item of items) {
        const encoded = field(item, "content:encoded");
        const link = field(item, "link");
        expect(link).toMatch(/^https:\/\//);
        expect(encoded).toContain(`href="${link}"`);
        // The block sits after the page link and before the site footer.
        const pageLinkAt = encoded.indexOf(`href="${link}"`);
        const footerAt = encoded.lastIndexOf(`<a href="${SITE_URL}">`);
        expect(footerAt).toBeGreaterThan(pageLinkAt);
        const notesHtml = encoded.slice(pageLinkAt, footerAt);
        if (/<p>[^<]+: <a href=/.test(notesHtml)) withEdges += 1;
      }
      expect(withEdges, `${show.frontmatter.id} has items with edge lines`).toBeGreaterThan(
        items.length * 0.9,
      );
    }
  });

  it("keeps description and itunes:summary under Apple's 4,000 characters, edges included", async () => {
    const xml = await render("improv-lab");
    expect(xmlProblem(xml)).toBe(null);
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    expect(items.length).toBeGreaterThan(100);
    let withEdges = 0;
    for (const item of items) {
      const description = field(item, "description");
      const summary = field(item, "itunes:summary");
      expect(description.length).toBeGreaterThan(0);
      expect(description.length).toBeLessThan(4000);
      expect(summary).toBe(description);
      if (description.includes(`${RELATION_LABELS.requires.outbound}: `)) withEdges += 1;
    }
    // A concept's plain description was its bare title; the edge line is
    // now most of what a client shows for it.
    expect(withEdges).toBeGreaterThan(items.length * 0.8);
  });
});
