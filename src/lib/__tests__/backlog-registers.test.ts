import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The two registers of work, and the join between them.
 *
 * The repository plans in `docs/backlog` (Jira-shaped markdown: epics own stories,
 * stories own tasks, each task carrying Run / Verify / Acceptance criteria) and it
 * records what it learned in `docs/novel-insights.md` (numbered entries, each with
 * a `**Status:**` line). Until 2026-09-22 they referenced each other zero times in
 * both directions, and the cost was concrete: tracker entries kept changing the
 * files that backlog cards declare, so EC-1.1 went on advertising "68 concept
 * pages" that its own Run command no longer produced. Nothing failed, because
 * nothing was watching.
 *
 * `scripts/backlog.mjs` now joins them on the one thing they share — the file path
 * — and these are the guards for that. Every count here is a population guard as
 * much as an assertion: the script reads markdown with regexes, and a regex that
 * stops matching returns an empty list and passes every test that only checks
 * shape. So the sizes are asserted first, and the join is asserted to find
 * something rather than to find nothing.
 */

const ROOT = process.cwd();
const BACKLOG = path.join(ROOT, "docs", "backlog");
const TRACKER = path.join(ROOT, "docs", "novel-insights.md");
const SCRIPT = path.join(ROOT, "scripts", "backlog.mjs");

interface Note {
  name: string;
  fm: string;
  body: string;
}

/** The same shape `scripts/backlog.mjs` loads: every note, frontmatter kept as text. */
function loadNotes(dir: string): Note[] {
  const out: Note[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...loadNotes(p));
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    const raw = fs.readFileSync(p, "utf-8");
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    out.push({ name: path.basename(entry.name, ".md"), fm: m ? m[1] : "", body: m ? m[2] : raw });
  }
  return out;
}

const field = (fm: string, key: string) =>
  (new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

/** Wikilinks under one frontmatter key, inline or as an indented list beneath it. */
function linksFor(fm: string, key: string): string[] {
  const m = new RegExp(`^${key}:([^\\n]*)((?:\\n[ \\t]+-[^\\n]*)*)`, "m").exec(fm);
  if (!m) return [];
  return [...(m[1] + m[2]).matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1]);
}

/** Plain values under one frontmatter key — `files:`, which carries no wikilinks. */
function valuesFor(fm: string, key: string): string[] {
  const m = new RegExp(`^${key}:([^\\n]*)((?:\\n[ \\t]+-[^\\n]*)*)`, "m").exec(fm);
  if (!m) return [];
  const out: string[] = [];
  const inline = m[1].trim();
  if (inline && inline !== "[]") out.push(inline);
  for (const line of m[2].split("\n")) {
    const v = line.trim();
    if (v.startsWith("-")) out.push(v.slice(1).trim());
  }
  return out.map((v) => v.replace(/^["']|["']$/g, "")).filter(Boolean);
}

const notes = loadNotes(BACKLOG);
const typed = (t: string) => notes.filter((n) => field(n.fm, "type") === t);
const isDone = (n: Note) => field(n.fm, "status").toLowerCase() === "done";
const tasks = typed("task");
const openTasks = tasks.filter((n) => !isDone(n));

const report = () => execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: "utf-8" });
const validate = () =>
  execFileSync(process.execPath, [SCRIPT, "--validate"], { cwd: ROOT, encoding: "utf-8" });

describe("the backlog register", () => {
  it("parses to the graph the report walks", () => {
    // Reading 2026-09-22: 2 epics, 9 stories, 18 tasks, 7 of them done. Exact on the
    // structure, because a card added or closed should be a deliberate edit and the
    // report's per-epic totals are read at the start of a session and trusted.
    //
    // 2026-09-25: 3 epics, 10 stories, 19 tasks. The Search alignment epic is a
    // standing queue for the recurring SEO audit, so this count will move on a
    // schedule rather than only when someone plans work — which is exactly why
    // it stays exact. A card arriving unexplained should still fail here.
    expect(typed("epic")).toHaveLength(3);
    expect(typed("story")).toHaveLength(10);
    expect(tasks).toHaveLength(19);
    expect(tasks.filter(isDone)).toHaveLength(7);
    expect(openTasks).toHaveLength(12);

    // Every task hangs off a story and every story off an epic, or the report's
    // walk from epic to story to task silently drops it and prints a shorter list.
    for (const t of tasks) expect(linksFor(t.fm, "parent")).toHaveLength(1);
    const walked = typed("epic")
      .flatMap((e) => linksFor(e.fm, "stories"))
      .flatMap((s) => linksFor(notes.find((n) => n.name === s)?.fm ?? "", "tasks"));
    expect(walked).toHaveLength(tasks.length);
  });

  /**
   * The resolver is the thing under test, not the links.
   *
   * `scripts/backlog.mjs` keys every note by its filename without `.md` and
   * resolves `[[...]]` against that map — so `[[EC-2.1 Rewrite the context line for
   * someone who just arrived]]` resolves by full title and `[[Entry-point context]]`
   * resolves by the epic file's own name. There is no key-based fallback: a link
   * that names only `EC-2.1` would be reported broken. Asserting the count of links
   * as well as the count of breaks keeps this from passing on an empty graph, which
   * is exactly what a changed frontmatter shape would produce.
   */
  it("resolves every wikilink by filename", () => {
    const byName = new Map(notes.map((n) => [n.name, n]));
    const keys = ["epic", "parent", "stories", "tasks", "blocked_by", "blocks", "epics"];
    const links = notes.flatMap((n) => keys.flatMap((k) => linksFor(n.fm, k)));
    // Reading 2026-09-22: 98 frontmatter wikilinks across 31 notes, none broken.
    // (Entry 344's 124 counts the body links too; the resolver only walks these 7
    // keys, so only these 7 keys can be broken by it.)
    expect(links.length).toBeGreaterThanOrEqual(90);
    expect(links.filter((l) => !byName.has(l))).toEqual([]);

    const out = validate();
    expect(out).toContain("broken wikilinks: 0");
  });

  /**
   * A path a card declares and the repository does not have is usually a rename
   * nobody carried across — but PF-2.4's whole job is to create
   * `docs/backlog/directory-listings.md`, and PF-5.2 then reads it, so two cards
   * legitimately point at a file that is not there yet. That exception is named
   * rather than tolerated in general: any other missing path is a stale card.
   */
  it("declares files that exist, except the one a task creates", () => {
    const CREATED_BY_A_TASK = new Set(["docs/backlog/directory-listings.md"]);
    const declared = openTasks.flatMap((t) => valuesFor(t.fm, "files"));
    // Reading 2026-09-22: 11 open tasks declaring 9 paths, 2 of them the file PF-2.4 creates.
    expect(declared.length).toBeGreaterThanOrEqual(8);
    const missing = declared.filter((f) => !fs.existsSync(path.join(ROOT, f)));
    expect(missing.filter((f) => !CREATED_BY_A_TASK.has(f))).toEqual([]);
    // And the guard itself: most declared paths are real, so a broken parser that
    // returns garbage paths fails here instead of passing the assertion above.
    expect(declared.filter((f) => fs.existsSync(path.join(ROOT, f))).length).toBeGreaterThanOrEqual(
      6,
    );
  });
});

describe("the tracker register", () => {
  it("parses to numbered entries with status lines", () => {
    const text = fs.readFileSync(TRACKER, "utf-8");
    const heads = [...text.matchAll(/^## (\d+)\./gm)].map((m) => Number(m[1]));
    // Reading 2026-09-22: 345 entries, 168 of them applied. Floors, not equalities:
    // the tracker is append-only and a session adds to it while this suite runs.
    expect(heads.length).toBeGreaterThanOrEqual(344);
    expect(heads).toEqual([...heads].sort((a, b) => a - b));
    const applied = [...text.matchAll(/^\*\*Status:\*\*\s*applied\b/gm)];
    expect(applied.length).toBeGreaterThanOrEqual(160);
  });
});

describe("the join between the registers", () => {
  /**
   * The pairing that motivated all of this.
   *
   * EC-1.1 declares `src/components/ContextBanner.tsx` and
   * `src/components/AtomDetail.tsx`. The tracker has been rewriting `AtomDetail`
   * all night — the lineage line, the try-it line, the principle-pair group — and
   * the card still says 68. The join has to find those entries from the path
   * alone, because the entries name no card and the card names no entry.
   */
  it("prints the applied entries that touched an open task's files", () => {
    const out = report();
    // Reading 2026-09-22: EC-1.1 pairs with entries 333, 327, 302 and 15 more;
    // EC-3.2 pairs with 2 entries naming content/paths/beginner-foundations.md.
    const lines = out.split("\n");
    const ec11 = lines.findIndex((l) => l.includes("EC-1.1"));
    expect(ec11).toBeGreaterThanOrEqual(0);
    const joined = lines[ec11 + 1];
    expect(joined).toContain("touched by entries");
    expect(joined).toContain("AtomDetail.tsx");
    // At least one entry number, and they are the tracker's own numbering.
    const numbers = [...joined.matchAll(/\b(\d{1,3})\b/g)].map((m) => Number(m[1]));
    expect(numbers.length).toBeGreaterThanOrEqual(1);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(200);

    // The report says what the marker means, or a reader meets a bare number.
    expect(out).toContain("novel-insights.md");
    // Readability is the reason for the cap; 3 entries plus a count, never a list of 18.
    for (const l of lines.filter((x) => x.includes("touched by entries"))) {
      expect(l.split(",").filter((p) => /^\s*\d+\s*$/.test(p)).length).toBeLessThanOrEqual(3);
    }
  });

  it("keeps every line the report already printed", () => {
    const out = report();
    // The join is an addition. These are the report's existing contract, and the
    // session that reads it at the start of the day reads these lines.
    for (const marker of [
      "Ready — an agent can start these",
      "Blocked",
      "tasks done",
      "Task files carry Run / Verify / Acceptance criteria / Outcome.",
    ]) {
      expect(out).toContain(marker);
    }
    expect(out).toContain("EC  Entry-point context");
    expect(out).toContain("PF  Podcast finalization");
  });

  /**
   * The other direction: a card's stated number against what its own Run block
   * gives today. EC-1.1's summary says 68; its Run block's marker is the pre-EC-2.1
   * copy, so it reports a different number and the card has not been re-scoped.
   * The check only executes a Run block that is a single read-only `node -e`, so
   * this asserts the check ran and reported, not that the number is any value.
   */
  it("reports the stated counts it could recompute", () => {
    const out = validate();
    expect(out).toContain("stated counts:");
    expect(out).toContain("EC-1.1 says 68");
    // Reading 2026-09-22: EC-1.1 is the only open card with both a number in its
    // summary and a Run block safe to execute, and it disagrees.
    expect(out).toMatch(/EC-1\.1 says 68 — Run (gives|agrees)/);
    expect(out).toContain("declared files that do not exist:");
  });
});
