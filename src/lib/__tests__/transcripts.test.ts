import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getAtomUrl,
  getAudioUrl,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadThreads,
} from "../content";
import { getTranscript, linkedHrefs, renderTranscriptHtml } from "../transcripts";

/**
 * The audio scripts are a second corpus nearly the size of the site —
 * 331,676 words against 376,060 of page prose — and until 2026-09-21 they
 * were indexed by no search, linked by no page, read by no test and
 * autolinked by nothing (tracker entry 257). Every player now folds its
 * transcript beneath it; these are the first instruments over the corpus.
 * Presence, not markup: the failure modes are a reader that silently
 * returns nothing, a linker that stops linking, a page type that drops the
 * fold.
 */
const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

describe("transcripts", () => {
  it("reads a script as spoken paragraphs with every stage direction stripped", () => {
    const transcript = getTranscript("atoms", "accepting-the-offer");
    expect(transcript).not.toBeNull();
    const { paragraphs, words, minutes } = transcript!;
    expect(paragraphs.length).toBeGreaterThanOrEqual(20);
    for (const p of paragraphs) {
      expect(p, p).not.toMatch(/\[[^\]]*\]/);
      expect(p.trim()).toBe(p);
      expect(p.length).toBeGreaterThan(0);
    }
    // The raw file opens "[curious] So accepting the offer"; the direction
    // goes and the sentence stays.
    expect(paragraphs[0]).toMatch(/^So accepting the offer/);
    expect(words).toBeGreaterThan(500);
    expect(minutes).toBeGreaterThanOrEqual(2);
  });

  it("returns null rather than an empty transcript when no script exists", () => {
    expect(getTranscript("atoms", "no-such-atom-ever")).toBeNull();
  });

  it("every content page with audio has a transcript of at least 100 words", async () => {
    const [atoms, bridges, threads, paths] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
      loadPaths(),
    ]);
    const pages: { layer: "atoms" | "bridges" | "threads" | "paths"; id: string }[] = [
      ...atoms.map((a) => ({ layer: "atoms" as const, id: a.frontmatter.id })),
      ...bridges.map((b) => ({ layer: "bridges" as const, id: b.slug })),
      ...threads.map((t) => ({ layer: "threads" as const, id: t.frontmatter.id })),
      ...paths.map((p) => ({ layer: "paths" as const, id: p.frontmatter.id })),
    ].filter((page) => getAudioUrl(page.layer, page.id));
    expect(pages.length).toBeGreaterThanOrEqual(300);

    const thin: string[] = [];
    let words = 0;
    for (const page of pages) {
      const transcript = getTranscript(page.layer, page.id);
      if (!transcript || transcript.words < 100) thin.push(`${page.layer}/${page.id}`);
      else words += transcript.words;
    }
    expect(thin, `pages with audio and no usable transcript: ${thin.join(", ")}`).toEqual([]);
    // The corpus measured at 331,676 words on 2026-09-21; a reader that
    // dropped a layer would fall well under this.
    expect(words).toBeGreaterThan(300_000);
  });

  it("autolinks a transcript through the body pipeline", async () => {
    const atoms = await loadAtoms();
    const atom = atoms.find((a) => a.frontmatter.id === "accepting-the-offer")!;
    const currentUrl = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
    const transcript = getTranscript("atoms", "accepting-the-offer")!;
    const html = await renderTranscriptHtml(transcript.paragraphs, currentUrl);

    expect(html.length).toBe(transcript.paragraphs.length);
    const joined = html.join("\n");
    const hrefs = [...joined.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(hrefs.length).toBeGreaterThanOrEqual(1);
    // Never its own page.
    expect(hrefs).not.toContain(currentUrl);
    // Inner HTML, so the component chooses the block element.
    for (const p of html) expect(p).not.toMatch(/^<p>/);
    // The same page renders once however often it is asked for.
    expect(await renderTranscriptHtml(transcript.paragraphs, currentUrl)).toBe(html);
  });

  it("links only what the page's body did not, and keys the cache on the body's ledger", async () => {
    // The body linker links each target once per page and the fold ran its
    // own once-per-fold rule, so on the guides 244 targets and on the
    // concepts 366 were linked in both (tracker entry 267, 2026-09-22). With
    // the body's html the fold leaves those targets as plain text. Measured
    // on the unledgered fold first so the test cannot pass on a transcript
    // that links nothing.
    const atoms = await loadAtoms();
    const atom = atoms.find((a) => a.frontmatter.id === "accepting-the-offer")!;
    const currentUrl = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
    const transcript = getTranscript("atoms", "accepting-the-offer")!;
    const hrefsOf = (html: string[]) =>
      [...html.join("\n").matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);

    const unledgered = hrefsOf(await renderTranscriptHtml(transcript.paragraphs, currentUrl));
    const body = linkedHrefs(atom.html);
    expect(body.size).toBeGreaterThanOrEqual(5);
    const shared = unledgered.filter((href) => body.has(href));
    // The population: without a ledger this fold repeats body links. If the
    // concept's script or body changes so that nothing overlaps, pick another
    // page rather than weakening the assertion.
    expect(shared.length, "unledgered fold shares no target with the body").toBeGreaterThan(0);

    const ledgered = await renderTranscriptHtml(transcript.paragraphs, currentUrl, atom.html);
    expect(ledgered.length).toBe(transcript.paragraphs.length);
    const hrefs = hrefsOf(ledgered);
    expect(hrefs.filter((href) => body.has(href))).toEqual([]);
    expect(hrefs).not.toContain(currentUrl);
    // On this page every fold link was a body repeat, so the ledgered fold
    // may hold none at all; that is the point, not a failure. The corpus
    // still links from its folds — link-repeats.test.ts holds the floor on
    // the build.
    expect(hrefs.length).toBeLessThan(unledgered.length);
    // The shared targets are still in the fold as words, not dropped.
    const text = ledgered.join(" ").replace(/<[^>]+>/g, "");
    const unledgeredText = (await renderTranscriptHtml(transcript.paragraphs, currentUrl))
      .join(" ")
      .replace(/<[^>]+>/g, "");
    expect(text).toBe(unledgeredText);

    // Two ledgers, two cache entries: a body that links nothing yields the
    // unledgered fold, not the ledgered one cached a moment ago.
    expect(
      await renderTranscriptHtml(transcript.paragraphs, currentUrl, "<p>no links</p>"),
    ).toEqual(await renderTranscriptHtml(transcript.paragraphs, currentUrl));
    expect(await renderTranscriptHtml(transcript.paragraphs, currentUrl, atom.html)).toBe(ledgered);
  });

  it("reads a body's ledger as internal hrefs without fragments or queries", () => {
    const ledger = linkedHrefs(
      '<p><a href="/practice/techniques/yes-and">Yes, and</a> <a href="/how-it-works/status#top">x</a>' +
        ' <a href="https://example.com/">out</a> <a href="#local">here</a></p>',
    );
    expect([...ledger].sort()).toEqual(["/how-it-works/status", "/practice/techniques/yes-and"]);
  });

  it("keeps a spoken line that opens like a markdown block as a paragraph", async () => {
    const html = await renderTranscriptHtml(
      ["- Not a list item, a spoken dash.", "1. Not the first of anything either."],
      null,
    );
    expect(html).toHaveLength(2);
    expect(html.join("")).not.toContain("<li>");
    expect(html[0]).toContain("Not a list item");
  });

  it("links an italicised book title to its library entry, as a body would", async () => {
    // The scripts cite works the way the bodies do, in italics; the
    // source-titles-linked guard reads the built transcripts too, and an
    // unlinked *Impro for Storytellers* under the narrative-longform player
    // was its first catch (2026-09-21).
    const transcript = getTranscript("atoms", "narrative-longform")!;
    const html = await renderTranscriptHtml(
      transcript.paragraphs,
      "/practice/formats/narrative-longform",
    );
    expect(html.join("\n")).toContain('href="/library/ref-impro-storytellers-johnstone"');
  });

  it.runIf(built)("every built page with a player folds a transcript under it", () => {
    // The listen hubs carry bare <audio> elements for episodes; the content
    // pages' player is AudioPlayer, and its label is what marks one.
    const withAudio = walk(APP).filter((file) => {
      const html = fs.readFileSync(file, "utf-8");
      return html.includes("<audio") && html.includes("Listen to this conversation");
    });
    expect(withAudio.length).toBeGreaterThanOrEqual(300);
    const missing = withAudio.filter((file) => {
      const html = fs.readFileSync(file, "utf-8");
      return !(html.includes("<details") && html.includes("Transcript ("));
    });
    expect(
      missing.map((f) => path.relative(APP, f)),
      "pages with a player and no transcript fold",
    ).toEqual([]);
  });
});

/**
 * The path scripts are essays on the path's subject, not readings of its
 * syllabus: 5% shared text with the page, 9 of 39 lessons named, and no word
 * for "lesson" or "path" on the Physics of Connection one (tracker entry
 * 256). Beside "N lessons · X min to listen" the player read as the overview
 * of those lessons. It sits below the syllabus, labelled as an essay with
 * its own duration, and the header's totals are about the lessons only.
 */
describe("path page player", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "paths", "[slug]", "page.tsx"),
    "utf-8",
  );

  it("labels the path's reading as an essay and places it after the syllabus", () => {
    const syllabus = source.indexOf('id="program-map"');
    const player = source.indexOf('id="path-listen"');
    expect(syllabus).toBeGreaterThan(-1);
    expect(player).toBeGreaterThan(syllabus);
    const block = source.slice(player);
    expect(block).toContain("An essay on this path&apos;s subject");
    expect(block).toContain("<AudioPlayer");
    // Prettier splits the call across lines once it carries the body ledger.
    expect(block).toMatch(/<Transcript\s+layer="paths"/);
    expect(block).toContain("essayMinutes");
    expect(source.split("<AudioPlayer").length).toBe(2);
  });

  it("keeps the header's totals about the lessons only", () => {
    const header = source.slice(source.indexOf("<header"), source.indexOf("</header>"));
    expect(header).toContain("{threads.length} lessons");
    expect(header).not.toContain("<AudioPlayer");
    expect(header).not.toContain("Listen to the overview");
  });
});
