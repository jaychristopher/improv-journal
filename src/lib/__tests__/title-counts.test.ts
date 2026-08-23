import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/** Bulleted, numbered, and the bold-numbered form the games pages use. */
function countItems(content: string): number {
  let items = 0;
  for (const line of content.split("\n")) {
    if (/^- /.test(line) || /^\d+\.\s/.test(line) || /^\*\*\d+\.\s/.test(line)) items++;
  }
  return items;
}

/**
 * A number in a title is a promise, and it goes stale silently.
 *
 * These titles claim a count — 192 starters, 300 pairs, 40 games — and the
 * count drifts every time a question is added, removed, or replaced because a
 * duplicate turned up. I have corrected it by hand on six pages this session
 * and found the seventh, fun-questions-to-ask-friends, only while looking for
 * something else: it promised 116 and carried 102.
 *
 * The check is deliberately one-sided. A title cannot claim more items than
 * the page has; claiming fewer is fine, because "10 Public Speaking Tips" on a
 * page with fifteen numbered points is a shortlist rather than a lie, and
 * "21 Questions" is the name of a game rather than a tally. Overstating is the
 * only version that misleads a reader, and it is the one that keeps happening.
 *
 * Every number in the title is checked, not just the first — "21 Questions
 * Game: How to Play, and 181 to Ask" makes two claims and both can drift.
 */
describe("title counts", () => {
  it("never promises more items than the page carries", async () => {
    const bridges = await loadBridges();
    const overstated: string[] = [];
    let checked = 0;

    for (const bridge of bridges) {
      const numbers = [...bridge.frontmatter.title.matchAll(/(?:^|\s)(\d{2,4})(?=\s|$)/g)].map(
        (m) => Number(m[1]),
      );
      if (numbers.length === 0) continue;

      const items = countItems(bridge.content);
      for (const claimed of numbers) {
        checked++;
        if (claimed > items) {
          overstated.push(`${bridge.slug}: title claims ${claimed}, page carries ${items} items`);
        }
      }
    }

    // Guards against the extraction silently matching nothing.
    expect(checked).toBeGreaterThan(10);
    expect(overstated).toEqual([]);
  });
});
