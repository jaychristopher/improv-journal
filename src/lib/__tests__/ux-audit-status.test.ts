import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";

/**
 * The April UX audit (`docs/ux-audit-matrix.md`, 2026-04-22) marked 21
 * persona × page rows "Tweak". Most were built the same morning in four
 * commits that never cited it, the level hatches among them were rebuilt from
 * the graph in September (tracker entries 247, 250, 281) by people who had not
 * read it, and for five months nothing in the backlog, the tests or the
 * tracker referred to the document at all (tracker entry 293, 2026-09-22).
 * Two findings — a team-leader signal on the homepage and a paths hub grouped
 * by focus — were never built until backlog EC-4.1 and EC-4.2.
 *
 * The audit now carries a Status cell per row: Built / Open / Superseded, with
 * what did it. This test reads those cells so a fourth April plan cannot sit
 * unresolved and unmarked — a Tweak row without a status fails, an Open row
 * without a backlog task naming the audit fails — and, build-gated, that the
 * two things the audit asked for and never got are on the built pages.
 */
const ROOT = process.cwd();
const AUDIT = path.join(ROOT, "docs", "ux-audit-matrix.md");
const BACKLOG = path.join(ROOT, "docs", "backlog");
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

interface TweakRow {
  line: number;
  persona: string;
  action: string;
  status: string;
}

/** Every table row whose Action cell says Tweak, with its Status cell. */
function tweakRows(): TweakRow[] {
  const lines = fs.readFileSync(AUDIT, "utf-8").split("\n");
  const rows: TweakRow[] = [];
  lines.forEach((line, i) => {
    if (!line.startsWith("|")) return;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    // Header and separator rows carry no persona.
    if (cells.length < 8 || cells[0] === "Persona" || /^-+$/.test(cells[0])) return;
    const status = cells[cells.length - 1];
    const action = cells[cells.length - 2];
    if (/\bTweak\b/.test(action)) rows.push({ line: i + 1, persona: cells[0], action, status });
  });
  return rows;
}

function backlogFiles(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".md")) {
        out.push({ name: entry.name, text: fs.readFileSync(full, "utf-8") });
      }
    }
  };
  walk(BACKLOG);
  return out;
}

const decode = (html: string): string =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

describe("the April UX audit's status column", () => {
  it("gives every Tweak row a status of Built, Open or Superseded", () => {
    const rows = tweakRows();
    // 21 on 2026-09-22. The audit is a finished document; a row cannot be
    // added without the count moving, so the floor guards the selector.
    expect(rows.length).toBeGreaterThanOrEqual(15);

    const unclassified = rows.filter((r) => !/^(Built|Open|Superseded)\b/.test(r.status));
    expect(
      unclassified.map((r) => `line ${r.line} (${r.persona}): ${r.status.slice(0, 40)}`),
    ).toEqual([]);

    // The three states are all in use; a column that read "Built" on every
    // row would be a summary, not a status.
    const tally = { Built: 0, Open: 0, Superseded: 0 };
    for (const r of rows) tally[r.status.split(/\W/)[0] as keyof typeof tally]++;
    expect(tally.Built).toBeGreaterThanOrEqual(8);
    expect(tally.Superseded).toBeGreaterThanOrEqual(5);
    expect(tally.Open).toBeGreaterThanOrEqual(2);
  });

  it("names a status that cites what did it — a commit, a tracker entry or a backlog task", () => {
    for (const r of tweakRows()) {
      // Cross-references to another row ("as 2a D", "as 6B") inherit its cite.
      const cites =
        /\b[0-9a-f]{7}\b/.test(r.status) ||
        /\bentr(y|ies) \d+/.test(r.status) ||
        /\bEC-\d+\.\d+\b/.test(r.status) ||
        /\bas \d[a-f]? ?[A-G]\b/.test(r.status) ||
        /\b20\d\d-\d\d-\d\d\b/.test(r.status);
      expect(cites, `line ${r.line} (${r.persona}) cites nothing: ${r.status}`).toBe(true);
    }
  });

  it("has a backlog task naming the audit behind every Open row", () => {
    const open = tweakRows().filter((r) => r.status.startsWith("Open"));
    expect(open.length).toBeGreaterThanOrEqual(2);
    const backlog = backlogFiles();
    for (const r of open) {
      const key = /\b(EC-\d+\.\d+)\b/.exec(r.status)?.[1];
      expect(key, `line ${r.line} (${r.persona}) names no task`).toBeDefined();
      const task = backlog.find((f) => f.name.startsWith(`${key} `));
      expect(task, `${key} has no task file`).toBeDefined();
      expect(task!.text, `${key} does not name the audit`).toContain("ux-audit-matrix.md");
      expect(task!.text).toMatch(/^status: Done$/m);
      expect(task!.text).toMatch(/## Outcome\n\n(?!_Not started)/);
    }
  });

  it("is cited by the backlog and by this test, which the tracker's check found nowhere", () => {
    // Tracker entry 293's testable check: grep -rn "ux-audit" docs/backlog src
    // was 0 on 2026-09-22 before this change.
    const citing = backlogFiles().filter((f) => f.text.includes("ux-audit-matrix"));
    expect(citing.length).toBeGreaterThanOrEqual(3);
  });
});

describe("the audit's two unbuilt findings, on the built pages", () => {
  it("has a team-leader line under the homepage quiz", () => {
    const src = fs.readFileSync(path.join(ROOT, "src", "app", "page.tsx"), "utf-8");
    const quiz = src.indexOf("<HomepageQuiz");
    const teams = src.indexOf('data-track="home-teams"');
    const applies = src.indexOf("Where this applies");
    expect(quiz).toBeGreaterThan(-1);
    expect(teams).toBeGreaterThan(quiz);
    expect(applies).toBeGreaterThan(teams);
  });

  it.runIf(built)("renders that line with both team links, after the quiz", () => {
    const html = fs.readFileSync(path.join(APP, "index.html"), "utf-8");
    const start = html.indexOf('data-track="home-teams"');
    expect(start, "no home-teams block").toBeGreaterThan(-1);
    const block = html.slice(start, html.indexOf("</p>", start));
    expect(block).toContain('href="/topics/teams"');
    expect(block).toContain('href="/paths/improv-for-teams"');
    expect(decode(block)).toMatch(/team/i);
    // After the quiz's heading, before the guide clusters.
    expect(html.indexOf("What keeps breaking right now?")).toBeLessThan(start);
    expect(html.indexOf("Where this applies")).toBeGreaterThan(start);
  });

  it.runIf(built)(
    "groups the paths hub under three focus headings and links all eleven paths",
    async () => {
      const paths = await loadPaths();
      expect(paths.length).toBe(11);
      const html = fs.readFileSync(path.join(APP, "paths.html"), "utf-8");
      const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

      const headings = (main.match(/<h2[^>]*>[\s\S]*?<\/h2>/g) ?? []).map(decode);
      for (const group of ["Improv craft", "Everyday life", "Teams and teaching"]) {
        expect(headings, `no "${group}" heading`).toContain(group);
      }

      for (const p of paths) {
        expect(main, `/paths/${p.frontmatter.id} not linked`).toContain(
          `href="/paths/${p.frontmatter.id}"`,
        );
      }

      // The ladder and the non-improviser line survive the grouping.
      expect(main).toContain('data-track="level-ladder"');
      expect(main).toContain('data-track="alternate-tracks"');

      // Inside a group the order is the audience ladder's: beginner before teacher.
      const teams = main.slice(main.indexOf('data-track="focus-teams"'));
      expect(teams.indexOf("/paths/improv-for-teams")).toBeLessThan(
        teams.indexOf("/paths/teaching-improv"),
      );
      // And the two focus groups come after the craft ladder, which is the
      // recommended route and reads first.
      expect(main.indexOf('data-track="focus-craft"')).toBeLessThan(
        main.indexOf('data-track="focus-life"'),
      );
      expect(main.indexOf('data-track="focus-life"')).toBeLessThan(
        main.indexOf('data-track="focus-teams"'),
      );
    },
  );
});
