import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * A page that keeps a sources line keeps a complete one.
 *
 * Fifteen research citations were added across eleven guides in one working
 * session and not one of them reached a sources line. Nine of those pages had
 * no line at all; two had one that simply went unupdated, so
 * how-to-give-feedback cited Kluger and DeNisi as the evidence for its whole
 * argument and then listed five other works underneath without mentioning it.
 *
 * Nothing caught that. citation-year-consistency checks whether a work is
 * dated the same way twice and has no opinion about whether it is referenced
 * at all, and the reader who wants to check a claim is the person who pays.
 *
 * Scope is deliberately narrow: this only polices pages that already carry a
 * sources line. Whether a page should have one is an editorial choice, and at
 * least one page is better without — 36-questions-to-fall-in-love prints the
 * full APA reference for Aron et al. in the body, which is stronger than a
 * summary line and would be made worse by adding one.
 */

const CITATION =
  /\b([A-Z][A-Za-z'-]+(?:\s+(?:&|and|et)\s+[A-Za-z'-]+\.?)?)\s*\((1[89]\d\d|20\d\d)\)/g;
const SOURCES_LINE = /\*\*Sources cited:\*\*(.*)/;

describe("sources lines", () => {
  it("list every work the page cites above them", async () => {
    const offenders: string[] = [];
    let inScope = 0;

    for (const bridge of await loadBridges()) {
      const match = SOURCES_LINE.exec(bridge.content);
      if (!match) continue;
      inScope += 1;

      const prose = bridge.content.slice(0, match.index);
      const cited = new Set([...prose.matchAll(CITATION)].map((m) => m[1].split(/\s+/)[0]));
      const listed = new Set(match[1].match(/\b[A-Z][A-Za-z'-]{2,}/g) ?? []);

      const absent = [...cited].filter((surname) => !listed.has(surname)).sort();
      if (absent.length > 0) offenders.push(`${bridge.slug}: ${absent.join(", ")}`);
    }

    // A changed heading or loader would make this pass on nothing.
    expect(inScope).toBeGreaterThanOrEqual(25);
    expect(offenders).toEqual([]);
  });
});
