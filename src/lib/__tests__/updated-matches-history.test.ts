import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { isProseLine, lastProseChanges } from "../content-history.mjs";

/**
 * `updated` must agree with the last commit that changed the file's prose.
 *
 * The field is the site's only freshness signal: the sitemap emits it as
 * lastmod, ArticleJsonLd as dateModified, and every article shows it as
 * "Updated 24 August 2026". Nothing bumps it — an author edits the body and
 * the frontmatter above it stays put — so it has drifted three times. First,
 * 184 rewritten atoms still said March or April (fixed by
 * `scripts/sync-content-dates.mjs`, 22 August). Second, the diagram programme
 * of 29–30 August (194 commits, each adding a figure and a caption to one
 * atom) and the 6 September principle rewrite changed 225 files and moved
 * zero dates, so 251 of 319 pages told search engines they were unchanged
 * since the week before their figure existed (entry 188). Third, re-running
 * the sync under "any body line counts" set 220 dates to the day the figure
 * arrived, five or six days after the last change to the words (entry 239).
 *
 * The rule, held in `content-history.mjs` and shared with the sync script:
 * a changed line is prose unless it is the `updated:` line itself, a markdown
 * image line, a standalone italic line (a caption or an italic footer), or
 * blank. `content-dates` guards the impossible case (a future date); this
 * guards the two common ones — too old, from prose committed after the date
 * was set; and too new, from a figure or a hand-set date on a file whose
 * words are older. The second check is confined to files with no uncommitted
 * edits, since a file being worked on has no settled date yet.
 *
 * Runs only where git and a repository are available — a source tarball or a
 * shallow deploy has no history to compare against, and a skip says so
 * rather than passing on nothing.
 *
 * Fix a failure with `npm run content:dates`.
 */

const CONTENT = path.join(process.cwd(), "content");
const DIRS = ["atoms", "bridges", "threads", "paths"];

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function gitAvailable(): boolean {
  try {
    return git(["rev-parse", "--is-inside-work-tree"]).trim() === "true";
  } catch {
    return false;
  }
}

/** Files under content/ with uncommitted edits, relative to the repo root. */
function dirtyFiles(): Set<string> {
  return new Set(
    git(["status", "--porcelain", "--", "content"])
      .split("\n")
      .map((l) => l.slice(3).trim().replace(/^"|"$/g, ""))
      .filter(Boolean),
  );
}

describe("updated matches history", () => {
  /**
   * The rule itself, pinned: a figure and its caption are not prose, and the
   * line after the caption is. If this changes, the sync script and the walk
   * below change with it.
   */
  it("counts prose, and not figures, captions, blank lines or the date line", () => {
    expect(isProseLine("The surviving response is the failing one.")).toBe(true);
    expect(isProseLine("  - { id: internal-computation, relation: contrasts }")).toBe(true);
    expect(isProseLine("**Bold opening** and the rest of a sentence.")).toBe(true);
    expect(isProseLine("*The caption sentence.* Then prose after it.")).toBe(true);
    expect(isProseLine('sameAs: ["https://en.wikipedia.org/wiki/Active_listening"]')).toBe(true);

    expect(isProseLine('updated: "2026-08-30"')).toBe(false);
    expect(isProseLine("![A two-by-two test.](/images/remove-the-line-before-it.svg)")).toBe(false);
    expect(isProseLine("*The surviving response is the failing one.*")).toBe(false);
    expect(isProseLine("*This article draws on [the graph](/).*")).toBe(false);
    expect(isProseLine("")).toBe(false);
    expect(isProseLine("   ")).toBe(false);
  });

  it.skipIf(!gitAvailable())("agrees with the last commit that changed the prose", () => {
    const history = lastProseChanges({ dirs: DIRS.map((d) => `content/${d}`) });
    const dirty = dirtyFiles();
    const tooOld: string[] = [];
    const tooNew: string[] = [];
    let checked = 0;
    let withHistory = 0;
    let clean = 0;

    for (const dir of DIRS) {
      for (const name of fs.readdirSync(path.join(CONTENT, dir))) {
        if (!name.endsWith(".md")) continue;
        const rel = `content/${dir}/${name}`;
        const raw = fs.readFileSync(path.join(CONTENT, dir, name), "utf-8");
        const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
        const updated = fm && /^updated:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(fm[1])?.[1];
        const created = fm && /^created:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(fm[1])?.[1];
        if (!updated) {
          tooOld.push(`${rel}: no updated date`);
          continue;
        }
        checked++;

        // A file with no committed history (just created, not yet added) has
        // nothing to be compared against.
        const last = history.get(rel);
        if (!last) continue;
        withHistory++;
        // The sync script never dates an update before creation.
        const expected = created && last.date < created ? created : last.date;
        if (updated < expected) {
          tooOld.push(`${rel}: updated ${updated}, prose changed ${last.date} (${last.sha})`);
        }
        if (dirty.has(rel)) continue;
        clean++;
        if (updated > expected) {
          tooNew.push(`${rel}: updated ${updated}, prose last changed ${last.date} (${last.sha})`);
        }
      }
    }

    // Guards against an empty directory or a broken log parse passing this
    // on nothing — the same failure mode content-dates guards against. The
    // clean floor is well under the ~170 clean files of a normal tree because
    // a session mid-edit dirties many; it has to prove the too-new check
    // looked at a real population, not that the tree is tidy.
    expect(checked).toBeGreaterThanOrEqual(300);
    expect(withHistory).toBeGreaterThanOrEqual(300);
    expect(clean).toBeGreaterThanOrEqual(50);
    expect(
      tooOld,
      "`updated` is older than the last commit that changed the file's prose " +
        "(any line but `updated:`, an image line, a standalone italic line or a blank) — " +
        "run `npm run content:dates`",
    ).toEqual([]);
    expect(
      tooNew,
      "`updated` is newer than the last commit that changed the file's prose — " +
        "a figure, a caption or a hand-set date moved it (novel-insights 239); " +
        "run `npm run content:dates`",
    ).toEqual([]);
  });
});
