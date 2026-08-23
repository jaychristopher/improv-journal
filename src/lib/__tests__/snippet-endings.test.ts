import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { DESCRIPTION_MAX } from "../seo";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The snippet a page actually ships must not stop mid-phrase.
 *
 * seo-snippets already asserted this — "ends on a complete sentence rather than
 * a mid-word ellipsis" — and could not detect it. It looked for three full
 * stops where metaDescription emits a single U+2026, and it ran on one
 * hand-written fixture whose sentences fit the budget. Both together meant a
 * check that read as a guarantee and tested nothing.
 *
 * What it was missing: 50 pages whose descriptions ended "...while the scene
 * contin…", "...rather than retreating i…", "...votes to eliminate one player
 * each round until…". A snippet is the only thing a searcher reads before
 * deciding, and one that stops mid-clause spends its whole budget saying
 * something incomplete.
 *
 * So this reads the built HTML instead of a fixture. Seven pages still trim,
 * and they are the ones whose opening sentence carries no comma, semicolon,
 * colon or dash anywhere inside the budget — there is genuinely nowhere better
 * to cut. The cap is set just above that so the number cannot quietly grow.
 */

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/g, "/")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function descriptions(): { page: string; text: string }[] {
  const out: { page: string; text: string }[] = [];
  for (const file of walk(APP)) {
    const html = fs.readFileSync(file, "utf-8");
    const match = /<meta name="description" content="([^"]*)"/.exec(html);
    if (!match) continue;
    const posix = file.split(path.sep).join("/");
    const page = ((posix.split("server/app")[1] ?? posix).replace(/\.html$/, "") || "/") as string;
    out.push({ page, text: decode(match[1]) });
  }
  return out;
}

/** Seven trim today. Set just above so a regression has to be visible. */
const TRIM_BUDGET = 8;

describe("shipped snippets", () => {
  it.runIf(built)("rarely have to trim, and never run past the limit", () => {
    const all = descriptions();
    // An unbuilt tree would make this pass on nothing.
    expect(all.length).toBeGreaterThan(300);

    const trimmed = all.filter((d) => d.text.endsWith("…") || d.text.endsWith("..."));
    const over = all.filter((d) => d.text.length > DESCRIPTION_MAX).map((d) => d.page);

    expect(over).toEqual([]);
    expect(trimmed.length, trimmed.map((d) => d.page).join(", ")).toBeLessThanOrEqual(TRIM_BUDGET);
  });

  it.runIf(built)("never run a type label into the sentence before it", () => {
    const offenders: string[] = [];

    for (const { page, text } of descriptions()) {
      // The appended label always closes the description: "X is an improv Y."
      const start = text.search(/\s[A-Z][^.]*\bis an improv\b[^.]*\.$/);
      if (start === -1) continue;
      const before = text.slice(0, start).trimEnd();
      if (!/[.!?]$/.test(before)) {
        offenders.push(`${page}: …${text.slice(Math.max(0, start - 40))}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
