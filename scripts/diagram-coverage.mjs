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

import { readPages, readDeclines } from "./lib/diagram-pages.mjs";

const declined = readDeclines();
const pages = readPages();

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
