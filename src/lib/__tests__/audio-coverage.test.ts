import { describe, expect, it } from "vitest";

import { getAudioUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * Every content page offers an audio version.
 *
 * getAudioUrl is the predicate the pages themselves use — it reads the
 * durations manifest, which is the only audio evidence a production build has,
 * since the MP3s are gitignored and served from R2. So a page passing here is
 * a page that will actually render a player once deployed, not one that merely
 * has a file on the machine that generated it.
 *
 * Hub, tool and index routes are deliberately out of scope: they list content
 * rather than being it, and have nothing to narrate.
 */
describe("audio coverage", () => {
  it("every atom page has audio", async () => {
    const missing = (await loadAtoms())
      .filter((a) => !getAudioUrl("atoms", a.frontmatter.id))
      .map((a) => `${a.frontmatter.type}/${a.frontmatter.id}`);
    expect(missing, `atoms without audio: ${missing.join(", ")}`).toEqual([]);
  });

  it("every bridge page has audio", async () => {
    const missing = (await loadBridges())
      .filter((b) => !getAudioUrl("bridges", b.slug))
      .map((b) => b.slug);
    expect(missing, `bridges without audio: ${missing.join(", ")}`).toEqual([]);
  });

  it("every thread page has audio", async () => {
    const missing = (await loadThreads())
      .filter((t) => !getAudioUrl("threads", t.frontmatter.id))
      .map((t) => t.frontmatter.id);
    expect(missing, `threads without audio: ${missing.join(", ")}`).toEqual([]);
  });

  it("every path page has audio", async () => {
    const missing = (await loadPaths())
      .filter((p) => !getAudioUrl("paths", p.frontmatter.id))
      .map((p) => p.frontmatter.id);
    expect(missing, `paths without audio: ${missing.join(", ")}`).toEqual([]);
  });

  it("reference atoms are covered too, and the library route can show them", async () => {
    // The one atom type whose route is not AtomDetail. It rendered no player
    // at all until the audio existed to put in one, so the coverage above
    // would have been satisfied by 32 files no page ever surfaced.
    const references = (await loadAtoms()).filter((a) => a.frontmatter.type === "reference");
    expect(references.length).toBeGreaterThan(0);
    for (const ref of references) {
      expect(
        getAudioUrl("atoms", ref.frontmatter.id),
        `${ref.frontmatter.id} missing`,
      ).toBeTruthy();
    }
  });
});
