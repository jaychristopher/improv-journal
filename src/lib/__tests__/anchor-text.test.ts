import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * An internal link should say what it points at.
 *
 * Anchor text is one of the few relevance signals a site controls completely,
 * and it was being spent on nothing. There were no "click here" anchors — the
 * obvious failure had been avoided — but four separate guides linked to
 * icebreaker-questions-for-work with the anchor "its own page", so a page with
 * 17,000 traffic potential had four editorial links and no anchor signal from
 * any of them. Others read "164 pairs here", "300 pairs", "182 of them": a
 * count and a pronoun, pointing at three different question sets.
 *
 * The rule is that the anchor shares at least one real word with the slug it
 * points at. That is deliberately weak — it permits almost anything written
 * naturally and catches only text that could be pointing anywhere.
 */

/** Short words carry no signal, and slugs are full of them. */
const MIN_WORD = 4;

/**
 * Anchors that are correct English and correctly fail the rule above.
 * Keep this small; the fix for a new entry is usually the anchor, not the list.
 */
const ALLOWED = new Set([
  // "yes and" is the name of the thing; "improv" in the slug disambiguates
  // the URL rather than the phrase.
  "yes and|/yes-and-improv",
]);

function significantWords(slug: string): string[] {
  return slug
    .split("#")[0]
    .split("/")
    .pop()!
    .split("-")
    .filter((w) => w.length >= MIN_WORD);
}

describe("internal anchor text", () => {
  it("says what it points at", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);
    const docs = [...bridges, ...atoms, ...threads, ...paths];

    const offenders: string[] = [];
    let checked = 0;

    for (const doc of docs) {
      for (const match of doc.content.matchAll(/\[([^\]]+)\]\((\/[^)]*)\)/g)) {
        const text = match[1].trim();
        const href = match[2];
        const slugWords = significantWords(href);
        if (slugWords.length === 0) continue; // e.g. "/" or "/a"
        checked++;
        if (ALLOWED.has(`${text.toLowerCase()}|${href}`)) continue;
        const words = new Set(
          text
            .toLowerCase()
            .replace(/[^a-z0-9 ]/g, " ")
            .split(/\s+/)
            .filter(Boolean),
        );
        if (!slugWords.some((w) => words.has(w))) {
          offenders.push(`${doc.slug}: "${text}" -> ${href}`);
        }
      }
    }

    // A changed link syntax or loader would make this pass on nothing.
    expect(checked).toBeGreaterThan(150);
    expect(offenders).toEqual([]);
  });
});
