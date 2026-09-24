import { describe, expect, it } from "vitest";

import { loadAtoms, loadThreads } from "@/lib/content";
import { LESSON_SOURCES_CAP, lessonSources } from "@/lib/lesson-sources";

import { librarySlug } from "../library-slug";

/**
 * Every lesson shows the library works it rests on.
 *
 * Entry 129 in docs/novel-insights.md found the lesson layer with one link
 * to /library/ across 25 pages, while each lesson's composed atoms reach
 * between four and seventeen catalogued works through their `links`. The
 * block is computed, not written, so the thing to guard is that the walk
 * still finds the edges: an atom loader that dropped `links`, or a reference
 * atom renamed off the `ref-` prefix, would make this return nothing on
 * every lesson and the page would simply omit the block.
 *
 * Measured 2026-09-21: 25 of 25 lessons yield at least one work, from four
 * (clear-signal-simple-signal) to seventeen (the-inner-game-expanded), median
 * eight. Entry 129 expected the-practice-lab to yield none — nine exercise
 * atoms, no edges — and it yields seven; the exercises had gained citations
 * since the entry was measured. The floor of 20 leaves room for the content
 * to move without turning a content edit into a red build.
 */
describe("lesson sources", () => {
  it("finds library works for at least 20 of the 25 lessons", async () => {
    const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
    expect(threads.length).toBeGreaterThanOrEqual(25);

    const withSources = threads.filter(
      (t) => lessonSources(t.frontmatter.atoms ?? [], atoms).length >= 1,
    );
    expect(withSources.length).toBeGreaterThanOrEqual(20);
  });

  it("orders by citing-atom count and points every entry at the library", async () => {
    const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
    const referenceIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "reference").map((a) => a.frontmatter.id),
    );

    for (const thread of threads) {
      const sources = lessonSources(thread.frontmatter.atoms ?? [], atoms);
      const ids = sources.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (let i = 1; i < sources.length; i += 1) {
        expect(sources[i - 1].citedBy).toBeGreaterThanOrEqual(sources[i].citedBy);
      }
      for (const source of sources) {
        expect(referenceIds.has(source.id)).toBe(true);
        expect(source.url).toBe(`/library/${librarySlug(source.id)}`);
        expect(source.title.length).toBeGreaterThan(0);
      }
    }
  });

  it("copes with the lesson entry 129 expected to yield nothing", async () => {
    // Exercise atoms are the sparsest-linked type; whatever they yield, the
    // walk must not throw on a lesson made only of them.
    const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
    const lab = threads.find((t) => t.frontmatter.id === "the-practice-lab");
    expect(lab).toBeDefined();
    expect(() => lessonSources(lab!.frontmatter.atoms ?? [], atoms)).not.toThrow();
  });

  it("has at least one lesson deep enough to need the cap", async () => {
    // The "and N more" branch only exists if some lesson exceeds the cap;
    // the-inner-game-expanded reached seventeen works when measured.
    const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
    const deepest = Math.max(
      ...threads.map((t) => lessonSources(t.frontmatter.atoms ?? [], atoms).length),
    );
    expect(deepest).toBeGreaterThan(LESSON_SOURCES_CAP);
  });
});
