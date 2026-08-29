/**
 * Diagram coverage — which pages carry a content diagram and which are still open.
 *
 * Usage:
 *   node scripts/diagram-coverage.mjs              # Coverage by group
 *   node scripts/diagram-coverage.mjs --undrawn    # Keys of pages with no diagram
 *   node scripts/diagram-coverage.mjs --undrawn atoms   # ...limited to one group
 *   node scripts/diagram-coverage.mjs --json       # Every page, machine-readable
 *
 * Everything is derived from the repo on each run rather than read from a
 * ledger: a hand-maintained list of 371 pages drifts the moment a page is
 * added, and that drift is invisible. Declines are the one thing that cannot
 * be inferred — "no diagram yet" and "no diagram, deliberately" look identical
 * from outside — so they are read back from the Declined section of
 * docs/image-program.md.
 */

import fs from "fs";
import path from "path";

const CONTENT_DIR = path.join(process.cwd(), "content");
const APP_DIR = path.join(process.cwd(), "src", "app");
const PROGRAM_DOC = path.join(process.cwd(), "docs", "image-program.md");

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
}

const toPosix = (file) => path.relative(process.cwd(), file).split(path.sep).join("/");

/** Markdown diagram references plus <Diagram> elements on JSX routes. */
function countDiagrams(body) {
  const markdown = body.match(/!\[[^\]]*\]\(\/images\/[^)\s]+\.svg\)/g) ?? [];
  const jsx = body.match(/<Diagram\b/g) ?? [];
  return markdown.length + jsx.length;
}

/** `- \`group/slug\` — reason` lines under the doc's Declined heading. */
function readDeclines() {
  if (!fs.existsSync(PROGRAM_DOC)) return new Map();
  const after = fs.readFileSync(PROGRAM_DOC, "utf8").split(/^#+ .*[Dd]eclined.*$/m)[1];
  if (!after) return new Map();
  const end = after.search(/^#+ /m);
  const section = end === -1 ? after : after.slice(0, end);
  return new Map(
    [...section.matchAll(/^[-*] `([^`]+)`\s*[—-]\s*(.+)$/gm)].map(([, key, why]) => [key, why.trim()]),
  );
}

const declined = readDeclines();

const pages = [
  ...walk(CONTENT_DIR, ".md"),
  ...walk(APP_DIR, ".tsx").filter((file) => path.basename(file) === "page.tsx"),
].map((file) => {
  const rel = toPosix(file);
  const isContent = rel.startsWith("content/");
  const key = isContent
    ? rel.slice("content/".length).replace(/\.md$/, "")
    : rel.replace(/^src\/app\//, "/").replace(/\/?page\.tsx$/, "") || "/";
  return {
    file: rel,
    key,
    group: isContent ? rel.split("/")[1] : "route",
    diagrams: countDiagrams(fs.readFileSync(file, "utf8")),
  };
});

const args = process.argv.slice(2);

if (args.includes("--json")) {
  const rows = pages.map((page) => ({ ...page, declined: declined.get(page.key) ?? null }));
  console.log(JSON.stringify(rows, null, 2));
} else if (args.includes("--undrawn")) {
  const group = args[args.indexOf("--undrawn") + 1];
  for (const page of pages) {
    if (page.diagrams > 0 || declined.has(page.key)) continue;
    if (group && !group.startsWith("--") && page.group !== group) continue;
    console.log(page.key);
  }
} else {
  const groups = [...new Set(pages.map((page) => page.group))].sort();
  const row = (name, total, drawn, dec, assets) =>
    name.padEnd(14) +
    String(total).padStart(6) +
    String(drawn).padStart(7) +
    String(dec).padStart(10) +
    String(assets).padStart(8) +
    (((drawn + dec) / total) * 100).toFixed(0).padStart(9) +
    "%";

  console.log("group          pages  drawn  declined  assets  coverage");
  for (const group of groups) {
    const rows = pages.filter((page) => page.group === group);
    console.log(
      row(
        group,
        rows.length,
        rows.filter((page) => page.diagrams > 0).length,
        rows.filter((page) => page.diagrams === 0 && declined.has(page.key)).length,
        rows.reduce((total, page) => total + page.diagrams, 0),
      ),
    );
  }

  const drawn = pages.filter((page) => page.diagrams > 0).length;
  const dec = pages.filter((page) => page.diagrams === 0 && declined.has(page.key)).length;
  console.log("-".repeat(56));
  console.log(
    row("total", pages.length, drawn, dec, pages.reduce((total, page) => total + page.diagrams, 0)),
  );

  const open = pages.length - drawn - dec;
  console.log(`\n${open} pages still open. At 1-3 each that is ${open}-${open * 3} assets.`);
}
