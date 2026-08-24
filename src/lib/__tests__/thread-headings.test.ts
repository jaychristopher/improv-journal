import { describe, expect, it } from "vitest";

import { loadThreads } from "../content";

/**
 * A long thread has an outline.
 *
 * Every one of the 25 threads shipped with zero headings in its body — the
 * template contributes one, for the concepts list, and the essay itself was a
 * single undifferentiated block. Three ran past a thousand words that way.
 * concept-headings polices exactly this for atoms and nothing covered the
 * layer above them.
 *
 * That costs more than tidiness. The heading outline is what a search engine
 * reads to work out what a page contains, what a featured snippet is extracted
 * against, and what a reader scans before deciding to stay.
 *
 * The threshold is deliberate rather than aspirational. Every thread of 600
 * words or more now has headings; the longest without one is 547. Short
 * threads are genuinely single-idea pieces and forcing headings onto them
 * would produce furniture rather than structure — so this asserts the rule
 * that is true and useful, not the maximal one.
 */

const NEEDS_HEADINGS_FROM = 600;

describe("thread structure", () => {
  it("gives every long thread a heading outline", async () => {
    const threads = await loadThreads();
    expect(threads.length).toBeGreaterThan(20);

    const offenders = threads
      .filter((t) => t.content.split(/\s+/).filter(Boolean).length >= NEEDS_HEADINGS_FROM)
      .filter((t) => !/^## /m.test(t.content))
      .map((t) => `${t.slug}: ${t.content.split(/\s+/).filter(Boolean).length} words`);

    expect(offenders).toEqual([]);
  });
});
