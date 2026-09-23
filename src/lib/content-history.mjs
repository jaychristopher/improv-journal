/**
 * When did the words of a content file last change, according to git?
 *
 * One rule, read by two callers: `scripts/sync-content-dates.mjs` writes the
 * answer into each file's `updated:` line, and `updated-matches-history.test.ts`
 * checks that the line agrees with the history. They used to hold separate
 * copies of the walk and drifted once already, which is the kind of agreement
 * between machines the tracker keeps finding (novel-insights 239). Plain
 * JavaScript because the script runs under node with no TypeScript loader.
 *
 * The rule. A changed line counts as a change to the prose unless it is
 *
 * - the `updated:` line itself — otherwise the sync commit would count as a
 *   change and every file would be expected to say the sync date, forever;
 * - a markdown image line, `![alt](src)` alone on the line;
 * - a standalone italic line, `*...*` alone on the line — the one-sentence
 *   figure captions the diagram programme wrote under each image, and the
 *   italic "This article draws on..." footers, which are furniture in the same
 *   way;
 * - blank.
 *
 * Why the middle two. The diagram programme of 29–30 August (194 commits)
 * inserted an image, a caption and two blank lines into pages whose prose was
 * finished on the 23rd–25th, and "any body line" as the rule set 220 of 308
 * dates to the day the figure arrived (novel-insights 239). "Updated" is read
 * as a claim about the words — the visible line, the sitemap's lastmod and the
 * article's dateModified all say so — and a figure is not the words. Anything
 * else in the file, frontmatter included, still counts: a new `links` entry or
 * `sameAs` changes what the page says.
 *
 * Merge commits carry no patch under `git log -p` and are skipped; the two
 * merges in this history changed nothing their parents had not.
 */

import { execFileSync } from "node:child_process";

/** Whether a line of a content file is prose, under the rule above. */
export function isProseLine(line) {
  const text = line.trim();
  if (text === "") return false;
  if (/^updated:/.test(text)) return false;
  if (/^!\[[^\]]*\]\([^)]*\)$/.test(text)) return false;
  if (/^\*(?!\*)[\s\S]+(?<!\*)\*$/.test(text)) return false;
  return true;
}

/**
 * Whether one file's unified diff adds or removes a prose line.
 *
 * `diff` is the text from `diff --git` to the next file, or a working-tree
 * diff for one path. The `---`/`+++` file headers are not changes.
 */
function diffChangesProse(diff) {
  return diff.split("\n").some((line) => {
    if (!/^[+-]/.test(line)) return false;
    if (/^(\+\+\+|---) (a\/|b\/|"a\/|"b\/|\/dev\/null)/.test(line)) return false;
    return isProseLine(line.slice(1));
  });
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf-8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

/** Split a multi-file patch into `[path, diffText]` pairs. */
function* fileDiffs(patch) {
  for (const fileDiff of patch.split(/^diff --git /m).slice(1)) {
    const header = /^"?a\/(.+?)"? "?b\//.exec(fileDiff);
    if (header) yield [header[1], fileDiff];
  }
}

/**
 * Newest commit per file whose patch changed a prose line, as
 * `path -> { date, sha }` with paths relative to the repo root using `/`.
 *
 * One `git log -p` over the directories rather than a `git log` and a
 * `git show` per file: the per-file walk costs ~17s on Windows, the single
 * pass ~2s.
 */
export function lastProseChanges({ cwd = process.cwd(), dirs = ["content"] } = {}) {
  const out = new Map();
  const log = git(
    ["log", "--format=%x00%H %ad", "--date=short", "--no-renames", "-p", "--", ...dirs],
    cwd,
  );

  // Newest first, so the first prose-changing commit seen for a file wins.
  for (const chunk of log.split("\0").slice(1)) {
    const newline = chunk.indexOf("\n");
    const [sha, date] = chunk.slice(0, newline).trim().split(" ");
    for (const [file, fileDiff] of fileDiffs(chunk.slice(newline + 1))) {
      if (out.has(file)) continue;
      if (diffChangesProse(fileDiff)) out.set(file, { date, sha: sha.slice(0, 7) });
    }
  }
  return out;
}

/**
 * Files under `dirs` whose uncommitted edits change a prose line, relative to
 * the repo root using `/`. Their settled date is the commit's, not anything
 * in the history yet.
 */
export function uncommittedProseChanges({ cwd = process.cwd(), dirs = ["content"] } = {}) {
  const out = new Set();
  const patch = git(["diff", "HEAD", "--unified=0", "--no-renames", "--", ...dirs], cwd);
  for (const [file, fileDiff] of fileDiffs(patch)) {
    if (diffChangesProse(fileDiff)) out.add(file);
  }
  return out;
}

/**
 * The date of the repository's root commit, `YYYY-MM-DD`: 2026-04-05 here,
 * "Initial commit: improv knowledge graph with full content pipeline". A
 * content file whose `created` is earlier than this predates git, and git
 * can say nothing about when it was written — only when it was imported.
 * Read from git rather than written down, so a rebase that changes it moves
 * every reading with it. The earliest root, if the history ever has more
 * than one.
 */
export function firstCommitDate({ cwd = process.cwd() } = {}) {
  const dates = git(["log", "--max-parents=0", "--format=%ad", "--date=short"], cwd)
    .split("\n")
    .map((d) => d.trim())
    .filter(Boolean)
    .sort();
  return dates[0];
}

/**
 * Oldest commit that added each file, as `path -> { date, sha }` with paths
 * relative to the repo root using `/`.
 *
 * Renames are followed, unlike `lastProseChanges`: a guide retitled from
 * `how-to-be-a-better-conversationalist` to `how-to-keep-a-conversation-going`
 * in August is the same page the site has carried since April, and "first
 * published" is a claim about the page, not the filename. (The prose walk
 * ignores renames for the opposite reason — the words did not change when the
 * name did, and `--no-renames` would date them to the rename.) A file deleted
 * and added again keeps its first date. One `git log --name-status` over the
 * directories, oldest first, so the first sight of a path settles it.
 */
export function firstAdditions({ cwd = process.cwd(), dirs = ["content"] } = {}) {
  const out = new Map();
  const log = git(
    [
      "log",
      "--reverse",
      "--format=%x00%H %ad",
      "--date=short",
      "--find-renames",
      "--diff-filter=AR",
      "--name-status",
      "--",
      ...dirs,
    ],
    cwd,
  );
  for (const chunk of log.split("\0").slice(1)) {
    const lines = chunk.split("\n");
    const [sha, date] = lines[0].trim().split(" ");
    const commit = { date, sha: sha.slice(0, 7) };
    for (const line of lines.slice(1)) {
      const [status, from, to] = line.split("\t").map((s) => s.trim().replace(/^"|"$/g, ""));
      if (!status || !from) continue;
      if (status === "A") {
        if (!out.has(from)) out.set(from, commit);
      } else if (status.startsWith("R") && to) {
        // The page under its old name, if git saw that name added; a rename
        // in from outside `dirs` is a first sight.
        if (!out.has(to)) out.set(to, out.get(from) ?? commit);
      }
    }
  }
  return out;
}
