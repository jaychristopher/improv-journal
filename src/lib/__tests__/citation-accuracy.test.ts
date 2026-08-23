import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Claims this site has been caught stating in their popular-but-wrong form.
 *
 * The failure mode is not ignorance — it is drift. The entry below was debunked
 * correctly on two pages while being repeated as fact on a third, which no
 * per-page review catches because each page reads fine alone. A rule lands here
 * once a real contradiction has been found, so the list is a record of actual
 * mistakes rather than a list of things that sounded risky.
 *
 * The working-memory capacity figure has its own rule in capacity-attribution.
 */
const RULES = [
  {
    name: "Mehrabian's 7/38/55 split",
    // Any paragraph invoking the numbers or the man...
    mentions: /Mehrabian|7\s*\/\s*38\s*\/\s*55|7-38-55/i,
    // ...must also mark them as conditional on conflicting signals. The split
    // came from judging attitude when words and delivery disagreed; it is not
    // a breakdown of ordinary communication, and Mehrabian has said so.
    qualifier: /misread|misquot|misinterpret|myth|contradict|conflict|not communication generally/i,
    why: "must qualify the 7/38/55 numbers as conflict-trial findings, not a general split",
  },
];

/** The trailing bibliography every guide with research citations carries. */
const SOURCES_BLOCK = /^\*\*Sources cited:\*\*/;

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

function paragraphs(file: string): string[] {
  const body = fs.readFileSync(file, "utf-8").replace(/^---[\s\S]*?\n---\n/, "");
  return body.split(/\n\s*\n/);
}

describe("citation accuracy", () => {
  for (const rule of RULES) {
    it(`${rule.name}: every paragraph that invokes it also qualifies it`, () => {
      const offenders: string[] = [];

      for (const file of contentFiles()) {
        // Paragraph-scoped, not page-scoped. A page-wide search is satisfied by
        // any stray "conflict" elsewhere in the prose, which is how the first
        // version of this guard let the unqualified myth straight through.
        for (const para of paragraphs(file)) {
          // A bibliography line names the work; it does not restate the claim,
          // so it has nothing to qualify.
          if (SOURCES_BLOCK.test(para)) continue;
          if (!rule.mentions.test(para)) continue;
          if (rule.qualifier.test(para)) continue;
          offenders.push(`${path.basename(file, ".md")} ${rule.why}`);
        }
      }

      expect(offenders).toEqual([]);
    });

    it(`${rule.name}: is still invoked somewhere, so the rule guards something`, () => {
      const invoking = contentFiles().filter((file) =>
        paragraphs(file).some((para) => rule.mentions.test(para)),
      );

      expect(invoking.length).toBeGreaterThan(0);
    });
  }
});
