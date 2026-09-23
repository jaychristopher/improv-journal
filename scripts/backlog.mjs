/**
 * Backlog — what is actionable in docs/backlog right now.
 *
 * The backlog is markdown with Jira-shaped frontmatter: epics own stories, stories
 * own tasks, and `blocked_by` / `blocks` carry the ordering. This reads that graph
 * and answers the only question worth asking at the start of a session — what can
 * be picked up, and by whom.
 *
 * `executable` is the field doing the work. A task marked `human` needs an account
 * login or a form, and an agent that tries it fails slowly rather than reporting.
 *
 * No dependencies on purpose. It parses the frontmatter itself so it runs from a
 * bare checkout with no install, which is the situation a fresh session is in.
 *
 * The repository keeps a second register of work — `docs/novel-insights.md`, an
 * append-only tracker whose applied entries change the same files these cards
 * declare — and the two have never referenced each other. That is how EC-1.1
 * kept advertising a page count another register had already moved. So the
 * report also prints, under each open task, the applied tracker entries that
 * name a file the task lists in `files:`. The join is computed from the path,
 * never typed: a card and an entry share no id, and the only thing they do
 * share is the file.
 *
 * Usage:
 *   node scripts/backlog.mjs              what is ready, per epic
 *   node scripts/backlog.mjs --all        every item, including done
 *   node scripts/backlog.mjs --validate   check the links, the declared files and
 *                                         the stated counts; non-zero if links broken
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "docs", "backlog");
const ALL = process.argv.includes("--all");
const VALIDATE = process.argv.includes("--validate");

if (!fs.existsSync(ROOT)) {
  console.log("No docs/backlog directory — nothing planned.");
  process.exit(0);
}

/** Every note, with its raw frontmatter block kept as text. */
function load(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...load(p));
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    const raw = fs.readFileSync(p, "utf-8");
    const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
    out.push({ name: path.basename(entry.name, ".md"), fm: m ? m[1] : "", body: m ? m[2] : raw });
  }
  return out;
}

const notes = load(ROOT);
const byName = new Map(notes.map((n) => [n.name, n]));

const field = (fm, key) =>
  (new RegExp(`^${key}:\\s*(.+)$`, "m").exec(fm)?.[1] ?? "").trim().replace(/^["']|["']$/g, "");

/** Wikilinks under one frontmatter key, inline or as an indented list beneath it. */
function linksFor(fm, key) {
  const m = new RegExp(`^${key}:([^\\n]*)((?:\\n[ \\t]+-[^\\n]*)*)`, "m").exec(fm);
  if (!m) return [];
  return [...(m[1] + m[2]).matchAll(/\[\[([^\]]+)\]\]/g)].map((x) => x[1]);
}

/**
 * Plain (non-wikilink) values under one frontmatter key, inline or as an indented
 * list beneath it. `files:` is written both ways across the cards, and an empty
 * `files: []` has to read as no files rather than as one file called "[]".
 */
function valuesFor(fm, key) {
  const m = new RegExp(`^${key}:([^\\n]*)((?:\\n[ \\t]+-[^\\n]*)*)`, "m").exec(fm);
  if (!m) return [];
  const out = [];
  const inline = m[1].trim();
  if (inline && inline !== "[]") out.push(inline);
  for (const line of m[2].split("\n")) {
    const v = line.trim();
    if (v.startsWith("-")) out.push(v.slice(1).trim());
  }
  return out.map((v) => v.replace(/^["']|["']$/g, "")).filter(Boolean);
}

const typed = (t) => notes.filter((n) => field(n.fm, "type") === t);
const isDone = (n) => field(n.fm, "status").toLowerCase() === "done";
const blockers = (n) =>
  linksFor(n.fm, "blocked_by")
    .map((b) => byName.get(b))
    .filter(Boolean);
const ready = (n) => !isDone(n) && blockers(n).every(isDone);

// ─── the other register ──────────────────────────────────────────────────────
const TRACKER = path.join(process.cwd(), "docs", "novel-insights.md");

/**
 * The tracker as entries: `## <n>. <claim>` up to the next such heading, with the
 * `**Status:**` line kept apart. Only an entry whose status opens with "applied"
 * changed any code — "logged, not applied" is a proposal and "checked" is a
 * re-reading, and neither moves a file. Nothing else in the tracker is
 * machine-readable, so the status line is the whole of its structure.
 */
function trackerEntries() {
  if (!fs.existsSync(TRACKER)) return [];
  const lines = fs.readFileSync(TRACKER, "utf-8").split(/\r?\n/);
  const heads = [];
  lines.forEach((line, i) => {
    const m = /^## (\d+)\./.exec(line);
    if (m) heads.push({ n: Number(m[1]), i });
  });
  return heads.map((h, k) => {
    const end = k + 1 < heads.length ? heads[k + 1].i : lines.length;
    const text = lines.slice(h.i, end).join("\n");
    return {
      n: h.n,
      text,
      applied: /^\*\*Status:\*\*\s*applied\b/m.test(text),
    };
  });
}

const entries = trackerEntries();
const appliedEntries = entries.filter((e) => e.applied);

/**
 * Filenames that say nothing about which file is meant. The App Router names every
 * route file `page.tsx` or `route.ts`, so 6 of the cards declare a path whose
 * basename is shared with 5 others; matching on it would give every one of them
 * the same list of entries and none of them a true one. These are matched by their
 * full path or not at all.
 */
const GENERIC_BASENAMES = new Set([
  "page",
  "route",
  "layout",
  "index",
  "default",
  "error",
  "loading",
  "template",
  "sitemap",
  "robots",
  "not-found",
]);

const allDeclaredFiles = notes.flatMap((n) => valuesFor(n.fm, "files"));
const stemOf = (file) => path.basename(file).replace(/\.[^.]+$/, "");
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The strings that count as an entry naming this file, widest first.
 *
 * The tracker writes about modules the way a person does — sometimes the full
 * path, more often the component or the filename. Each widening is a step down in
 * confidence, so the bare stem is allowed only where it is an identifier rather
 * than a word: under `src/`, not a route filename, and declared by no other card.
 * A content slug (`beginner-foundations`) is named in the tracker dozens of times
 * without anybody editing the file, which is why `content/` stops at its path.
 */
function needlesFor(file) {
  const stem = stemOf(file);
  const generic = GENERIC_BASENAMES.has(stem);
  const out = [file, file.replace(/\.[^.]+$/, "")];
  if (!generic) out.push(path.basename(file));
  const unique = allDeclaredFiles.filter((f) => stemOf(f) === stem);
  if (!generic && file.startsWith("src/") && new Set(unique).size === 1) out.push(stem);
  return [...new Set(out)];
}

/**
 * Applied tracker entries naming a file this task declares, newest first.
 *
 * Boundaries on both sides so `AtomDetail` does not match inside a longer
 * identifier. An entry that names two of the task's files is still one entry.
 */
function touchedBy(note) {
  const files = valuesFor(note.fm, "files");
  if (!files.length) return { entries: [], files: [] };
  const hit = new Map();
  const named = [];
  for (const file of files) {
    const re = new RegExp(
      `(?<![A-Za-z0-9_])(?:${needlesFor(file).map(escapeRe).join("|")})(?![A-Za-z0-9_])`,
    );
    let any = false;
    for (const e of appliedEntries) {
      if (!re.test(e.text)) continue;
      hit.set(e.n, e);
      any = true;
    }
    if (any) named.push(path.basename(file));
  }
  return { entries: [...hit.keys()].sort((a, b) => b - a), files: named };
}

// ─── validate ────────────────────────────────────────────────────────────────
const broken = [];
for (const n of notes) {
  for (const key of ["epic", "parent", "stories", "tasks", "blocked_by", "blocks", "epics"]) {
    for (const target of linksFor(n.fm, key)) {
      if (!byName.has(target)) broken.push(`${n.name} -> ${key}: [[${target}]]`);
    }
  }
}

/**
 * The Run block's fenced shell, if it is something this script may execute.
 *
 * Two rules, both conservative. `node -e <script>` only, run through execFile with
 * no shell, so nothing in the card can be a command; and the script itself may not
 * name an API that writes, spawns or reaches the network. Anything else is skipped
 * and said to be skipped — a wrong number printed with confidence is worse than a
 * missing one, and a card is a text file anybody can edit.
 *
 * `npm run build` is the one line allowed to appear and be ignored: several Run
 * blocks read the build rather than the source, and this script must never start
 * one. When it appears, the recompute reads whatever build is on disk and the
 * caller is told how old it is.
 */
const WRITES_OR_REACHES =
  /\b(?:writeFile|writeFileSync|appendFile|createWriteStream|unlink|rmSync|rmdir|mkdir|rename|copyFile|truncate|child_process|execSync|execFile|spawn|fork|fetch|https?:\/\/|net\.|dgram)\b/;

function runnableRecompute(body) {
  const fence = /```(?:bash|sh|shell)\n([\s\S]*?)```/.exec(body);
  if (!fence) return { kind: "none" };
  const lines = fence[1].split("\n");
  const needsBuild = lines.some((l) => /^\s*npm run build\s*$/.test(l));
  const rest = lines
    .filter((l) => !/^\s*npm run build\s*$/.test(l) && l.trim() !== "")
    .join("\n")
    .trim();
  const m = /^node\s+-e\s+(['"])([\s\S]+)\1$/.exec(rest);
  if (!m) return { kind: "unsafe", why: "not a single `node -e` command" };
  if (WRITES_OR_REACHES.test(m[2])) {
    return { kind: "unsafe", why: "the script writes, spawns or reaches the network" };
  }
  return { kind: "run", script: m[2], needsBuild };
}

/** The count a card states about itself: the first bare integer in its summary. */
const statedCount = (summary) => Number(/(?<![\w.])(\d+)(?![\w.])/.exec(summary)?.[1] ?? NaN);

const BUILD_DIR = path.join(process.cwd(), ".next", "server", "app");

if (VALIDATE) {
  console.log(`notes: ${notes.length}   broken wikilinks: ${broken.length}`);
  broken.forEach((b) => console.log("  " + b));

  const open = typed("task").filter((n) => !isDone(n));

  // A declared path that is not there is usually a rename nobody carried across —
  // but a task whose whole job is to create the file declares it too, so this
  // warns and does not fail.
  const missing = [];
  for (const t of open) {
    for (const f of valuesFor(t.fm, "files")) {
      if (!fs.existsSync(path.join(process.cwd(), f))) {
        missing.push(`${field(t.fm, "key")} -> files: ${f}`);
      }
    }
  }
  console.log(`open tasks: ${open.length}   declared files that do not exist: ${missing.length}`);
  missing.forEach((m) => console.log("  " + m + "  (a task that creates it would say this too)"));

  // The number a card states about itself against the number its own Run block
  // gives today. This is the failure entry 344 describes: the tracker moves the
  // count, the card keeps printing the old one, and nothing notices.
  console.log("stated counts:");
  let checked = 0;
  for (const t of open) {
    const key = field(t.fm, "key");
    const stated = statedCount(field(t.fm, "summary"));
    if (!Number.isFinite(stated)) continue;
    const r = runnableRecompute(t.body);
    if (r.kind === "none") {
      console.log(`  ${key} says ${stated} — no runnable Run block, not checked`);
      continue;
    }
    if (r.kind === "unsafe") {
      console.log(`  ${key} says ${stated} — Run block not executed: ${r.why}`);
      continue;
    }
    if (r.needsBuild && !fs.existsSync(BUILD_DIR)) {
      console.log(`  ${key} says ${stated} — Run block reads a build and there is none`);
      continue;
    }
    const asOf = r.needsBuild
      ? ` (against the build of ${fs.statSync(BUILD_DIR).mtime.toISOString().slice(0, 10)})`
      : "";
    let out = "";
    try {
      out = execFileSync(process.execPath, ["-e", r.script], {
        cwd: process.cwd(),
        encoding: "utf-8",
        timeout: 60_000,
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    } catch (err) {
      console.log(
        `  ${key} says ${stated} — Run block failed: ${String(err.message).split("\n")[0]}`,
      );
      continue;
    }
    checked++;
    const seen = [...out.matchAll(/(?<![\w.])(\d+)(?![\w.])/g)].map((m) => Number(m[1]));
    const line = out.split("\n").join(" / ");
    if (seen.includes(stated)) console.log(`  ${key} says ${stated} — Run agrees: ${line}${asOf}`);
    else {
      console.log(
        `⚠  ${key} says ${stated} — Run gives "${line}"${asOf}; ${stated} is not among those. The card has not been re-scoped.`,
      );
    }
  }
  if (!checked) console.log("  nothing was safe to recompute.");

  // Only the wikilinks fail the run: a missing file and a moved count are both
  // states the repository is legitimately in between a tracker entry and an edit.
  process.exit(broken.length ? 1 : 0);
}

// ─── report ──────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
/** Summaries run long; a column that overflows is harder to read than one that clips. */
const clip = (s, n) =>
  (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s)).padEnd(n);
/** The legend is only worth a line if a join actually printed. */
let trackerShown = false;
console.log("");

for (const epic of typed("epic")) {
  const stories = linksFor(epic.fm, "stories")
    .map((s) => byName.get(s))
    .filter(Boolean);
  const tasks = stories.flatMap((s) =>
    linksFor(s.fm, "tasks")
      .map((t) => byName.get(t))
      .filter(Boolean),
  );
  const done = tasks.filter(isDone).length;

  console.log(
    `${field(epic.fm, "key")}  ${epic.name}  [${field(epic.fm, "status")}]  ${done}/${tasks.length} tasks done`,
  );
  console.log("");

  const show = ALL ? tasks : tasks.filter((t) => !isDone(t));
  const readyAgent = show.filter((t) => ready(t) && field(t.fm, "executable") !== "human");
  const readyHuman = show.filter((t) => ready(t) && field(t.fm, "executable") === "human");
  const blocked = show.filter((t) => !ready(t) && !isDone(t));

  const list = (label, items, withBlockers = false) => {
    if (!items.length) return;
    console.log(`  ${label}`);
    for (const t of items) {
      const why = withBlockers
        ? `  <- ${blockers(t)
            .filter((b) => !isDone(b))
            .map((b) => field(b.fm, "key"))
            .join(", ")}`
        : "";
      const kind = field(t.fm, "executable");
      const est = field(t.fm, "estimate");
      console.log(
        `    ${pad(field(t.fm, "key"), 8)}${clip(field(t.fm, "summary"), 56)}${pad(kind, 7)}${pad(est, 6)}${why}`,
      );
      // The other register, under the card it bears on. Open tasks only: a done
      // card is a record, and what the tracker did to its files afterwards is
      // somebody else's question.
      if (isDone(t)) continue;
      const { entries: touched, files: named } = touchedBy(t);
      if (!touched.length) continue;
      const shown = touched.slice(0, 3);
      const more = touched.length - shown.length;
      const rest = more ? `, +${more} more` : "";
      trackerShown = true;
      console.log(
        `            ~ touched by entries ${shown.join(", ")}${rest} (${named.join(", ")})`,
      );
    }
    console.log("");
  };

  list("Ready — an agent can start these", readyAgent);
  list("Ready — needs a person", readyHuman);
  list("Blocked", blocked, true);

  if (ALL) list("Done", tasks.filter(isDone));
  if (!show.length) console.log("  Nothing outstanding.\n");
}

if (broken.length) {
  console.log(`⚠  ${broken.length} broken wikilink(s). Run with --validate for detail.\n`);
}
if (trackerShown) {
  console.log(
    `~ = applied docs/novel-insights.md entries naming a file the task declares (${appliedEntries.length} of ${entries.length} entries are applied); the card may not know they landed.`,
  );
}
console.log("Task files carry Run / Verify / Acceptance criteria / Outcome.");
console.log("Read one before starting it; the commands in it are literal.\n");
