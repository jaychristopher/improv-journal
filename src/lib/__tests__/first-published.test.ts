import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { firstAdditions, firstCommitDate } from "../content-history.mjs";
import {
  contentPath,
  FIRST_COMMIT_DATE,
  firstPublished,
  firstPublishedDate,
  recordedPaths,
} from "../first-published";

/**
 * A concept page's `datePublished` reads the first commit that added the
 * file, not the `created` stamp.
 *
 * `created` on the 205 atoms takes nine values — 70 on the initial commit's
 * day, 79 earlier than the repository exists — and it fed the JSON-LD
 * `datePublished` and the rank's age divisor as if it were a date of writing
 * (novel-insights 321). The source is git now, through a record the sync
 * script writes (`scripts/sync-first-published.mjs`), with `created` kept
 * where the initial commit imported the file and git knows only the import.
 *
 * The readings of 2026-09-22, which these hold:
 *
 * - git agrees with `created` on all 126 atoms it saw added, so the rule
 *   moves no atom's date and the distinct count stays nine (9 → 9). The
 *   entry expected the August atoms to differ by a day; they do not — the
 *   files were committed the day they were stamped. The guides are where
 *   the two disagree: 13 of 78 (ten stamped 22 April and committed on the
 *   23rd, three stamped 25 August and committed on the 24th).
 * - 79 atoms, not the 27 the entry counted, predate the repository: the
 *   16 of 3 April and 36 of 4 April are before the 5th as much as the 27 of
 *   29 March are. All keep `created`.
 *
 * The record-versus-git check runs only where git and a whole history are;
 * a deploy's shallow clone has neither, which is why the record exists.
 */

const DIRS = ["atoms", "bridges", "threads", "paths"] as const;
type Dir = (typeof DIRS)[number];
const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** Git, and a history that reaches the root: a shallow clone dates everything to its boundary. */
function historyAvailable(): boolean {
  try {
    return (
      git(["rev-parse", "--is-inside-work-tree"]).trim() === "true" &&
      git(["rev-parse", "--is-shallow-repository"]).trim() === "false"
    );
  } catch {
    return false;
  }
}

type Dated = { slug: string; created: string; updated?: string };

async function layers(): Promise<Record<Dir, Dated[]>> {
  const [atoms, bridges, threads, paths] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);
  const dated = (xs: { slug: string; frontmatter: { created: string; updated?: string } }[]) =>
    xs.map((x) => ({
      slug: x.slug,
      created: x.frontmatter.created,
      updated: x.frontmatter.updated,
    }));
  return {
    atoms: dated(atoms),
    bridges: dated(bridges),
    threads: dated(threads),
    paths: dated(paths),
  };
}

describe("first published", () => {
  it("applies the rule: git, unless the initial commit imported a file written earlier", () => {
    const first = FIRST_COMMIT_DATE;
    expect(first).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // The rule needs a recorded path; use one every reading depends on.
    const commitment = contentPath("atoms", "commitment");
    expect(firstPublished(commitment, "2026-03-29")).toEqual({
      date: "2026-03-29",
      source: "created",
    });
    // Stamped on the commit day: git and the stamp agree, and git is the source.
    expect(firstPublished(commitment, first)).toEqual({ date: first, source: "git" });
    // A stamp later than the commit is a stamp; the commit is the date.
    expect(firstPublished(commitment, "2026-05-01")).toEqual({ date: first, source: "git" });
    // Nothing recorded: the file's own date, whatever it is.
    expect(firstPublished("content/atoms/not-yet-committed.md", "2026-09-22")).toEqual({
      date: "2026-09-22",
      source: "unrecorded",
    });
    expect(firstPublishedDate("content/atoms/not-yet-committed.md", undefined)).toBeUndefined();
  });

  it("dates every atom, 79 of them from `created` because they predate the repository", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(
      recordedPaths().filter((p) => p.startsWith("content/atoms/")).length,
    ).toBeGreaterThanOrEqual(200);

    const sources = { git: 0, created: 0, unrecorded: 0 };
    let movedFromCreated = 0;
    const distinct = new Set<string>();
    for (const a of atoms) {
      const fp = firstPublished(contentPath("atoms", a.slug), a.frontmatter.created);
      expect(fp.date, a.slug).toBeDefined();
      // The loader carries the same answer the helper gives, which is what
      // AtomDetail hands to the Article markup.
      expect(a.firstPublished, a.slug).toBe(fp.date);
      sources[fp.source] += 1;
      if (fp.date !== a.frontmatter.created) movedFromCreated += 1;
      distinct.add(fp.date!);
    }

    // The initial commit's imports are a closed set: nothing can join it,
    // and one leaves only by deletion. 79 on 2026-09-22 — 27 stamped
    // 29 March, 16 stamped 3 April, 36 stamped 4 April.
    expect(sources.created).toBe(79);
    // Every other atom has a commit that added it. An `unrecorded` atom is
    // a file added since the record was written: run
    // `node scripts/sync-first-published.mjs`, unless it is uncommitted.
    expect(sources.git).toBeGreaterThanOrEqual(126);
    // The reading: git dates agree with `created` on every atom, so the
    // rule moved none. A rise here is an atom whose `created` is a stamp
    // and whose commit is the date — the case the rule exists for; record
    // the atom and the reason when moving this.
    expect(movedFromCreated).toBe(0);
    // Nine distinct dates before the rule and nine after. A tenth is a
    // new atom on a new day, which is what a date should do.
    expect(new Set(atoms.map((a) => a.frontmatter.created)).size).toBe(9);
    expect(distinct.size).toBeGreaterThanOrEqual(9);
  });

  it("moves 13 guide dates, and none of the lessons' or paths'", async () => {
    const { bridges, threads, paths } = await layers();
    const moved = (dir: Dir, xs: Dated[]) =>
      xs.filter((x) => firstPublishedDate(contentPath(dir, x.slug), x.created) !== x.created);
    expect(bridges.length).toBeGreaterThanOrEqual(78);
    // Ten of 22 April committed on the 23rd, three of 25 August on the
    // 24th; the guide pages do not read the helper yet, so this is the
    // size of the change waiting for them. A floor: new guides may add.
    expect(moved("bridges", bridges).length).toBeGreaterThanOrEqual(13);
    expect(moved("threads", threads)).toEqual([]);
    expect(moved("paths", paths)).toEqual([]);
  });

  it("never dates a page's first publication after its last update", async () => {
    const all = await layers();
    const late: string[] = [];
    let checked = 0;
    for (const dir of DIRS) {
      for (const x of all[dir]) {
        const date = firstPublishedDate(contentPath(dir, x.slug), x.created);
        if (!date || !x.updated) continue;
        checked += 1;
        if (date > x.updated) {
          late.push(`${dir}/${x.slug}: first published ${date}, updated ${x.updated}`);
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(300);
    expect(late).toEqual([]);
  });

  it.skipIf(!historyAvailable())("keeps the record in step with git", () => {
    // The root commit's date is the fallback's test; a rebase would move it.
    expect(FIRST_COMMIT_DATE).toBe(firstCommitDate());

    const added = firstAdditions({ dirs: DIRS.map((d) => `content/${d}`) });
    const recorded = new Set(recordedPaths());
    const untracked = new Set(
      git(["status", "--porcelain", "--untracked-files=all", "--", "content"])
        .split("\n")
        .filter((l) => l.startsWith("??"))
        .map((l) => l.slice(3).trim().replace(/^"|"$/g, "")),
    );
    const stale: string[] = [];
    let checked = 0;
    for (const dir of DIRS) {
      for (const name of fs.readdirSync(path.join(process.cwd(), "content", dir))) {
        if (!name.endsWith(".md")) continue;
        const rel = `content/${dir}/${name}`;
        // A file git has not seen has no first commit yet; the helper
        // answers `created` for it, which is right until it is committed.
        if (untracked.has(rel)) continue;
        checked += 1;
        const fromGit = added.get(rel)?.date;
        const fromRecord = firstPublished(rel, undefined);
        if (!recorded.has(rel)) stale.push(`${rel}: added ${fromGit}, not in the record`);
        else if (fromRecord.date !== fromGit) {
          stale.push(`${rel}: record says ${fromRecord.date}, git says ${fromGit}`);
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(300);
    expect(
      stale,
      "src/lib/first-published.json disagrees with git — run `node scripts/sync-first-published.mjs`",
    ).toEqual([]);
  });

  it.runIf(built)("is what the concept page's Article declares as datePublished", async () => {
    const atoms = await loadAtoms();
    const wrong: string[] = [];
    let checked = 0;
    for (const a of atoms) {
      const route = getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type });
      const file = path.join(APP, ...route.split("/").filter(Boolean)) + ".html";
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      const expected = firstPublishedDate(contentPath("atoms", a.slug), a.frontmatter.created);
      let found: string | undefined;
      for (const block of html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      )) {
        let parsed: { "@type"?: unknown; datePublished?: unknown };
        try {
          parsed = JSON.parse(block[1]);
        } catch {
          continue;
        }
        if (parsed["@type"] === "Article" && typeof parsed.datePublished === "string") {
          found = parsed.datePublished;
        }
      }
      checked += 1;
      if (found !== expected) wrong.push(`${route}: page says ${found}, helper says ${expected}`);
    }
    // An unbuilt route set, or a moved output directory, would check nothing.
    expect(checked).toBeGreaterThanOrEqual(200);
    expect(wrong).toEqual([]);
  });
});
