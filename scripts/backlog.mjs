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
 * Usage:
 *   node scripts/backlog.mjs              what is ready, per epic
 *   node scripts/backlog.mjs --all        every item, including done
 *   node scripts/backlog.mjs --validate   check the links; non-zero if broken
 */

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

const typed = (t) => notes.filter((n) => field(n.fm, "type") === t);
const isDone = (n) => field(n.fm, "status").toLowerCase() === "done";
const blockers = (n) => linksFor(n.fm, "blocked_by").map((b) => byName.get(b)).filter(Boolean);
const ready = (n) => !isDone(n) && blockers(n).every(isDone);

// ─── validate ────────────────────────────────────────────────────────────────
const broken = [];
for (const n of notes)
  for (const key of ["epic", "parent", "stories", "tasks", "blocked_by", "blocks", "epics"])
    for (const target of linksFor(n.fm, key))
      if (!byName.has(target)) broken.push(`${n.name} -> ${key}: [[${target}]]`);

if (VALIDATE) {
  console.log(`notes: ${notes.length}   broken wikilinks: ${broken.length}`);
  broken.forEach((b) => console.log("  " + b));
  process.exit(broken.length ? 1 : 0);
}

// ─── report ──────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
/** Summaries run long; a column that overflows is harder to read than one that clips. */
const clip = (s, n) => (String(s).length > n ? String(s).slice(0, n - 1) + "…" : String(s)).padEnd(n);
console.log("");

for (const epic of typed("epic")) {
  const stories = linksFor(epic.fm, "stories").map((s) => byName.get(s)).filter(Boolean);
  const tasks = stories.flatMap((s) => linksFor(s.fm, "tasks").map((t) => byName.get(t)).filter(Boolean));
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
        ? `  <- ${blockers(t).filter((b) => !isDone(b)).map((b) => field(b.fm, "key")).join(", ")}`
        : "";
      const kind = field(t.fm, "executable");
      const est = field(t.fm, "estimate");
      console.log(
        `    ${pad(field(t.fm, "key"), 8)}${clip(field(t.fm, "summary"), 56)}${pad(kind, 7)}${pad(est, 6)}${why}`,
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
console.log("Task files carry Run / Verify / Acceptance criteria / Outcome.");
console.log("Read one before starting it; the commands in it are literal.\n");
