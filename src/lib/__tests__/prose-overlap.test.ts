import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * Two guides must not be substantially the same prose.
 *
 * Three of the site's highest-potential pages had grown a shared block of
 * advice about receiving an answer — how-to-be-a-good-friend, questions-to-ask-
 * friends and deep-questions-to-ask — with sentences appearing word for word on
 * two pages at once. "The tell is that they never get back to what they were
 * saying" was on three. The pages were competing on the same material instead
 * of each doing its own job and linking to the others.
 *
 * The measure is overlapping seven-word runs, as a share of the smaller page,
 * which is the same method used to check new writing against the corpus. Some
 * overlap is legitimate and expected: the guides quote the same atom glosses
 * and describe the same exercises. The threshold is set well above what that
 * produces and well below what the duplicated block did — it was 8.5% between
 * the worst pair, against a 4.8% maximum once they were separated.
 */
const SHINGLE = 7;
const MAX_SHARE = 0.08;
const MAX_RUNS = 60;

function shingles(markdown: string): Set<string> {
  const body = markdown.replace(/`[^`]+`/g, " ");
  const out = new Set<string>();
  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim().replace(/^[-*]\s*/, "");
    if (line.length < 45 || line.startsWith("#")) continue;
    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      const norm = sentence
        .toLowerCase()
        .replace(/[^a-z ]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
      if (norm.join(" ").length <= 45) continue;
      for (let i = 0; i + SHINGLE <= norm.length; i += 1) {
        out.add(norm.slice(i, i + SHINGLE).join(" "));
      }
    }
  }
  return out;
}

describe("guide prose", () => {
  it("is not substantially shared between two guides", async () => {
    const bridges = await loadBridges();
    const runs = bridges.map((b) => ({ slug: b.slug, set: shingles(b.content) }));

    // A broken extractor would produce empty sets and pass silently.
    expect(runs.filter((r) => r.set.size > 100).length).toBeGreaterThan(40);

    const offenders: string[] = [];
    for (let i = 0; i < runs.length; i += 1) {
      for (let j = i + 1; j < runs.length; j += 1) {
        const a = runs[i];
        const b = runs[j];
        if (a.set.size === 0 || b.set.size === 0) continue;
        let shared = 0;
        const [small, large] = a.set.size <= b.set.size ? [a.set, b.set] : [b.set, a.set];
        for (const run of small) if (large.has(run)) shared += 1;
        const share = shared / small.size;
        if (share > MAX_SHARE || shared > MAX_RUNS) {
          offenders.push(
            `${a.slug} and ${b.slug} share ${shared} runs (${(share * 100).toFixed(1)}% of the smaller)`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
