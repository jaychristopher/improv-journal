import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadThreads } from "../content";

/**
 * A heading is not the first half of the sentence under it.
 *
 * Fifteen sections read as "## Retroactive justification" followed by "is the
 * canonical form." — grammatical only if you read the heading as the subject.
 * The pattern comes from promoting bold labels to real headings, which the site
 * did deliberately and correctly; what it left behind was the sentence still
 * leaning on the label it used to sit beside.
 *
 * It matters beyond tidiness. Headings are lifted out of the page — into the
 * outline a crawler builds, into a snippet, into a screen reader announcing
 * them separately — and in every one of those the orphaned sentence arrives
 * without its subject.
 */
const OPENS_LOWERCASE = /^[a-z]/;
/** Lists, quotes, code and tables legitimately continue a heading. */
const STRUCTURAL = /^[-*>`|]/;

describe("heading fragments", () => {
  it("never leaves a section starting mid-sentence", async () => {
    const [atoms, bridges, threads] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
    ]);
    const docs = [...atoms, ...bridges, ...threads];
    expect(docs.length).toBeGreaterThan(200);

    const offenders: string[] = [];
    for (const doc of docs) {
      const lines = doc.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!/^#{2,3} /.test(lines[i])) continue;

        let j = i + 1;
        while (j < lines.length && !lines[j].trim()) j++;
        const next = (lines[j] ?? "").trim();
        if (!next || STRUCTURAL.test(next) || !OPENS_LOWERCASE.test(next)) continue;

        offenders.push(`${doc.slug}: "${lines[i].slice(0, 40)}" -> "${next.slice(0, 40)}"`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
