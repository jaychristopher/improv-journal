import { describe, expect, it } from "vitest";

import { getPathTotalDuration, getThreadBySlug, loadPaths } from "../content";
import { readingMinutes } from "../reading-time";

/**
 * Every path states a time in prose ("about 90-120 minutes of reading") that
 * runs 3–10× the measured reading time of its lessons, while the same page
 * emits the audio total as the Course workload (tracker entry 211,
 * 2026-09-21). The header now shows the measured figures. This records the
 * gap so the authored sentences are rewritten toward what is measured, and
 * fails if a new path states a reading time the lessons cannot support.
 */
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

function statedMinutes(text: string): number | null {
  const hours = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*hours?/i);
  if (hours) return Number(hours[1]) * 60;
  const word = text.match(/\b(one|two|three|four|five)\s+hours?/i);
  if (word) return WORDS[word[1].toLowerCase()] * 60;
  const mins = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*minutes?/i);
  if (mins) return Number(mins[1]);
  return null;
}

describe("path time claims", () => {
  it("state no reading time below what the lessons measure, and record the practice gap", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(10);
    let claims = 0;
    let overstated = 0;
    for (const p of paths) {
      const ids = p.frontmatter.threads;
      let read = 0;
      for (const id of ids) {
        const t = await getThreadBySlug(id);
        if (t) read += readingMinutes(t.html);
      }
      expect(read, p.frontmatter.id).toBeGreaterThan(0);
      const audio = getPathTotalDuration(ids);
      expect(audio, p.frontmatter.id).not.toBeNull();
      const stated = statedMinutes(p.frontmatter.estimated_time ?? "");
      if (stated === null) continue;
      claims += 1;
      // A stated figure below the reading time would be a lie in the other
      // direction; none is today, and none may become one.
      expect(
        stated,
        `${p.frontmatter.id}: says ${stated} min, reads in ${read}`,
      ).toBeGreaterThanOrEqual(read);
      // Says "reading" but is 3× or more the reading time: the authored sentence
      // describes practice. Ten of ten today; the number may only fall.
      if (stated >= 3 * read) overstated += 1;
    }
    expect(claims).toBeGreaterThanOrEqual(9);
    expect(overstated).toBeLessThanOrEqual(10);
  });
});
