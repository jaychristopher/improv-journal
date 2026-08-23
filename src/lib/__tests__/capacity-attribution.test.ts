import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The working-memory capacity figure belongs to Cowan (2001), not Sweller.
 *
 * Sweller (1988) founded cognitive load theory and reasons from the fact that
 * short-term memory is limited, but supplies no number. This site credited the
 * "about four" figure to him on five pages before August 2026, while stating it
 * correctly on a sixth — the kind of drift that is invisible per-page and only
 * shows up when the claims are read together. A site whose premise is that every
 * claim is traceable cannot afford to trace one to the wrong paper.
 */
const CAPACITY = /\b(three|four|five|seven|[34578])\b[^.]{0,40}\b(slots?|items?|chunks?)\b/i;
const CREDITS_SWELLER =
  /\(\s*Sweller|per Sweller|Sweller'?s? Cognitive Load Theory|Sweller,\s*(?:Cognitive Load Theory,\s*)?\d{4}/i;

/** The two library entries that exist to explain the distinction. */
const EXPLAINERS = new Set(["ref-sweller-cognitive-load", "ref-cowan-magical-number-four"]);

function contentFiles(): string[] {
  const roots = ["content/atoms", "content/bridges", "content/threads", "content/paths"];
  const out: string[] = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const f of fs.readdirSync(root)) {
      if (f.endsWith(".md")) out.push(path.join(root, f));
    }
  }
  return out;
}

describe("working-memory capacity attribution", () => {
  it("never credits a capacity figure to Sweller", () => {
    const offenders: string[] = [];

    for (const file of contentFiles()) {
      const id = path.basename(file, ".md");
      if (EXPLAINERS.has(id)) continue;

      const body = fs.readFileSync(file, "utf-8").replace(/^---[\s\S]*?\n---\n/, "");
      for (const sentence of body.split(/(?<=[.!?])\s+/)) {
        if (CAPACITY.test(sentence) && CREDITS_SWELLER.test(sentence)) {
          offenders.push(`${id}: ${sentence.trim().slice(0, 90)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("still finds the capacity claims it is meant to police", () => {
    const claims = contentFiles().filter((file) =>
      CAPACITY.test(fs.readFileSync(file, "utf-8").replace(/^---[\s\S]*?\n---\n/, "")),
    );

    // If this drops to zero the first test is guarding nothing.
    expect(claims.length).toBeGreaterThan(3);
  });
});
