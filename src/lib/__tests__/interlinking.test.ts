import { describe, expect, it } from "vitest";

import {
  getAtomBySlug,
  getBridgeBySlug,
  getPathBySlug,
  getThreadBySlug,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadShows,
  loadSources,
  loadThreads,
} from "../content";

describe("content interlinking", () => {
  it("rewrites legacy internal content links to canonical URLs", async () => {
    const bridge = await getBridgeBySlug("collaboration-skills");

    expect(bridge?.html).toContain('href="/practice/vocabulary/ensemble"');
    expect(bridge?.html).toContain('href="/practice/techniques/yes-and"');
    expect(bridge?.html).not.toContain('href="/atoms/');
    // collaboration-skills links the path by hand in its body; that link
    // survives as written.
    expect(bridge?.html).toContain('href="/paths/physics-of-connection"');
  });

  /**
   * The site's name is also the title of a path. A rewrite rule used to turn
   * the guide byline — "the improv knowledge graph at [The Physics of
   * Connection](/)", on forty guides, written to link the homepage — into a
   * link to /paths/physics-of-connection, and this test guarded it as the
   * canonical URL for the site's name; the homepage received no in-body link
   * from content at all. The autolinker did the same to plain prose that used
   * the phrase for the framework, because path titles register above atoms
   * (tracker entry 180, 2026-09-21). Both rules are gone: the byline links
   * what its author wrote, and a path or lesson whose title is the site's
   * name is not an autolink target.
   */
  it("leaves the site's name as the site's name", async () => {
    const overthinkingBridge = await getBridgeBySlug("how-to-stop-overthinking");
    expect(overthinkingBridge?.html).toContain('<a href="/">The Physics of Connection</a>');
    expect(overthinkingBridge?.html).not.toContain('href="/paths/physics-of-connection"');

    const law = await getAtomBySlug("beyond-the-stage");
    expect(law?.content).toMatch(/physics of connection/i);
    expect(law?.html).toMatch(/physics of connection/i);
    expect(law?.html).not.toContain('href="/paths/physics-of-connection"');
  });

  it("auto-links exercise mentions and plural variants inside path content", async () => {
    const path = await getPathBySlug("systems-of-improv");

    expect(path?.html).toContain('href="/practice/exercises/mirroring"');
    expect(path?.html).toContain('href="/practice/exercises/one-word-scene"');
    expect(path?.html).toContain('href="/practice/exercises/blind-offer"');
  });

  it("auto-links shortened thread titles when a document references them", async () => {
    const path = await getPathBySlug("reference-guide");

    expect(path?.html).toContain('href="/threads/the-system-underneath"');
  });

  it("auto-links thread mentions of core atom pages", async () => {
    const thread = await getThreadBySlug("first-rule-you-already-know");

    expect(thread?.html).toContain('href="/practice/techniques/yes-and"');
  });

  it("does not leave legacy /atoms, /guides, or /concepts links in rendered documents", async () => {
    const [atoms, bridges, paths, shows, sources, threads] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadPaths(),
      loadShows(),
      loadSources(),
      loadThreads(),
    ]);
    const documents = [...atoms, ...bridges, ...paths, ...shows, ...sources, ...threads];

    for (const document of documents) {
      expect(document.html, `${document.slug} still has legacy internal hrefs`).not.toMatch(
        /href="\/(?:atoms|guides|concepts)\//,
      );
    }
  });
});
