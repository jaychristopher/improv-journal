import { describe, expect, it } from "vitest";

import {
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
    const overthinkingBridge = await getBridgeBySlug("how-to-stop-overthinking");

    expect(bridge?.html).toContain('href="/practice/vocabulary/ensemble"');
    expect(bridge?.html).toContain('href="/practice/techniques/yes-and"');
    expect(bridge?.html).not.toContain('href="/atoms/');
    expect(overthinkingBridge?.html).toContain('href="/paths/physics-of-connection"');
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
