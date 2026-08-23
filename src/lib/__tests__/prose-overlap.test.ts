import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "../content";

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

  /**
   * A guide must not restate the atom it is built on.
   *
   * The check above only ever compared guides with each other, so a guide that
   * duplicated an atom passed silently. The viewpoints guide was written the
   * day after the viewpoints atom and reproduced fifteen of its passages,
   * including a twenty-three word sentence — caught by hand, not by this file.
   * Two pages on one site arguing the same thing in the same words is the
   * cannibalisation these guides are supposed to avoid.
   *
   * Same thresholds as the guide-to-guide check. Some overlap is unavoidable:
   * both pages name the same technique and quote the same terms, which puts
   * ordinary pairs around 4%. Three pairs predate this check and exceed it —
   * they are listed rather than tolerated by a raised threshold, so that a new
   * offender still fails. They are real duplication and still need rewriting.
   */
  /**
   * Below this, a percentage is noise. The shortest reference stubs hold about
   * fifty runs, so quoting one sentence from a book citation scores 10% — the
   * denominator is small, not the borrowing large. Real duplication clears this
   * comfortably: the viewpoints guide shared eighty-eight runs with its atom.
   */
  const MIN_RUNS_FOR_SHARE = 12;

  /**
   * Empty, and it took admitting the reasoning was wrong to get here.
   *
   * Three pairs sat in this list for most of a week, each deferred on the
   * grounds that the guide involved is authority-gated and cannot rank, so
   * rewriting it buys no position. True, and the wrong unit of account: every
   * one of them was restating an atom, and the atoms live in the vocabulary and
   * how-it-works families, which are among the few parts of this site Search
   * Console shows getting surfaced at all. The cost was landing on the pages
   * that can win, not the ones that cannot.
   *
   *   framing-effect ~ framing-as-angle-of-approach   66 runs -> 20   (9.4% -> 2.9%)
   *   how-to-read-body-language ~ status              27 runs ->  0  (10.3% -> 0%)
   *   stage-fright ~ failing-forward                  24 runs ->  4   (8.8% -> 1.5%)
   *
   * None was fixed by paraphrase. In each case the atom kept the reference
   * material — the canonical status markers, Close and Messing on failure, the
   * Lakoff and Kahneman mechanism — and the guide was rewritten to do the job
   * only it can: reading a pair rather than defining status, being frightened
   * before speaking rather than the general principle of failing forward.
   *
   * A slug added here is a claim that two pages should argue the same thing in
   * the same words. That has not been true yet.
   */
  const KNOWN_UNFIXED = new Set<string>([]);

  it("does not restate the atoms it is built on", async () => {
    const bridges = (await loadBridges()).map((b) => ({
      slug: b.slug,
      set: shingles(b.content),
    }));
    const atoms = (await loadAtoms()).map((a) => ({
      slug: a.slug,
      set: shingles(a.content),
    }));

    // A broken extractor would produce empty sets and pass silently.
    expect(bridges.filter((b) => b.set.size > 100).length).toBeGreaterThan(40);
    expect(atoms.filter((a) => a.set.size > 20).length).toBeGreaterThan(40);

    const offenders: string[] = [];
    for (const bridge of bridges) {
      for (const atom of atoms) {
        if (bridge.set.size === 0 || atom.set.size === 0) continue;
        const [small, large] =
          bridge.set.size <= atom.set.size ? [bridge.set, atom.set] : [atom.set, bridge.set];
        let shared = 0;
        for (const run of small) if (large.has(run)) shared += 1;
        const share = shared / small.size;
        const overShare = share > MAX_SHARE && shared >= MIN_RUNS_FOR_SHARE;
        if (!overShare && shared <= MAX_RUNS) continue;
        const pair = `${bridge.slug} ~ ${atom.slug}`;
        if (KNOWN_UNFIXED.has(pair)) continue;
        offenders.push(`${pair} share ${shared} runs (${(share * 100).toFixed(1)}%)`);
      }
    }

    expect(offenders).toEqual([]);
  });
});

/**
 * The hand-built pages are prose too, and nothing was reading them.
 *
 * Both checks above load markdown. The app routes are TSX, so a hub page can
 * restate a guide word for word and the suite stays green. That is not
 * hypothetical: the formats hub was given a "What Is Long Form Improv?" section
 * that reproduced six passages from what-is-improv, including sixteen
 * consecutive words, because it was written from memory of a page written days
 * earlier. Every earlier instance of this was caught by the checks above. This
 * one was caught by hand, and only because I went looking.
 *
 * Three of the largest findings in this project have come from these routes —
 * the games hub nobody had audited, the exercises index competing with it on
 * title, and this. They are the blind spot, so they are in scope now.
 *
 * Counted as absolute shared runs rather than as a share, which is the one
 * difference from the checks above and was not a preference. A TSX file's
 * shingles include its metadata strings and filter labels, so the denominator
 * is padded with things nobody reads: the duplicated section scored 22 shared
 * runs and only 6% of the file, which slipped under the 8% used elsewhere. The
 * first version of this test passed on the very duplication it was written for.
 *
 * Calibrated instead against the clean tree, where the worst legitimate pair is
 * improv-games against team-building-activities at 7 runs. Fourteen sits well
 * above that and well below the 22 that prompted this.
 */
const MAX_SHARED_WITH_ROUTE = 14;

/**
 * Two extractors, because the two file kinds hide prose differently, and both
 * ways of getting it wrong produce an empty string rather than an error.
 *
 * Backticks come out first in both cases: shingles() deletes whatever sits
 * inside them, since in markdown a backtick marks an atom reference. Leave them
 * and every template literal in the file vanishes before comparison.
 *
 * The JSX strips then apply only to .tsx. In a plain .ts data file every object
 * in the exported array is itself a brace block, so removing `{...}` deletes the
 * whole dataset and leaves the doc comments — which is exactly what the first
 * two attempts at this did, each passing a mutation that pasted an entire guide
 * into the category prose.
 */
function fileProse(source: string, isJsx: boolean): string {
  const text = source.replace(/`/g, " ").replace(/^import[\s\S]*?;$/gm, " ");
  if (!isJsx) return text.replace(/\s+/g, " ");

  const attrs = text.replace(/className="[^"]*"/g, " ").replace(/href="[^"]*"/g, " ");

  /*
   * Long string literals are lifted out before the brace strip below, because
   * that strip removes innermost {...} blocks and a data object inside a route
   * file is exactly one of those. AUDIENCE_META in learn/[audience]/page.tsx
   * holds five sets of orienting paragraphs in object literals with no nested
   * braces, so the entire record was deleted and the file was compared as its
   * own doc comments. Confirmed by pasting 76 words of how-to-stop-overthinking
   * into it — the check passed.
   *
   * The .ts case the comment above describes is the same bug, and was fixed by
   * routing those files around the strip entirely. This is the .tsx half, which
   * that fix did not reach: a route file can hold prose in data too.
   */
  const literals = (attrs.match(/"(?:[^"\\]|\\.){40,}"/g) ?? []).join(" ");

  const jsx = attrs.replace(/\{[^{}]*\}/g, " ").replace(/<[^>]+>/g, " ");
  return `${jsx} ${literals}`.replace(/\s+/g, " ");
}

/**
 * Prose is not only in page.tsx. The topic hubs render their orienting
 * paragraphs from `guide-categories.ts`, so writing them there would have put
 * them outside this check on the day it was extended to cover TSX — the same
 * blind spot as app routes, one directory over. Any file that holds sentences
 * belongs here, wherever it happens to live.
 */
const PROSE_OUTSIDE_ROUTES = [path.join("src", "lib", "guide-categories.ts")];

function appRouteFiles(dir: string, found: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) appRouteFiles(full, found);
    else if (entry.name === "page.tsx") found.push(full);
  }
  return found;
}

describe("hand-built page prose", () => {
  it("does not restate the guides", async () => {
    const bridges = (await loadBridges()).map((b) => ({
      slug: b.slug,
      set: shingles(b.content),
    }));

    const routes = [
      ...appRouteFiles(path.join(process.cwd(), "src", "app")),
      ...PROSE_OUTSIDE_ROUTES.map((f) => path.join(process.cwd(), f)),
    ]
      .map((file) => ({
        route: path.relative(path.join(process.cwd(), "src", "app"), path.dirname(file)),
        set: shingles(fileProse(fs.readFileSync(file, "utf8"), file.endsWith(".tsx"))),
      }))
      .filter((r) => r.set.size > 0);

    // If the extractor breaks, every set is empty and this passes on nothing.
    expect(routes.filter((r) => r.set.size > 20).length).toBeGreaterThan(3);

    const offenders: string[] = [];
    for (const route of routes) {
      for (const bridge of bridges) {
        let shared = 0;
        const [small, large] =
          route.set.size <= bridge.set.size ? [route.set, bridge.set] : [bridge.set, route.set];
        for (const run of small) if (large.has(run)) shared += 1;
        if (shared > MAX_SHARED_WITH_ROUTE) {
          offenders.push(`${route.route} restates ${bridge.slug}: ${shared} runs`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
