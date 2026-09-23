import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { ROUTE_KEYWORDS } from "../route-keywords";

/**
 * `content/outlines/all-paths.md` is the only April document that designed a
 * page per keyword *and* named the atoms that page would teach, and nothing
 * checked it afterwards. Five months on its atom half is intact and its page
 * half was superseded by the 78 guides the site actually built (tracker entry
 * 342), which is only knowable because somebody parsed it by hand. These
 * guards parse it on every run, so the next plan cannot rot silently — the
 * same treatment the backlog gets.
 *
 * The readings below are dated. Raising a floor to make a failure go away
 * would defeat the point: re-date the reading instead.
 */

const OUTLINE = path.join(process.cwd(), "content", "outlines", "all-paths.md");

interface PlanSection {
  /** The `### ` heading — a page the plan intended to exist. */
  title: string;
  /** The `## N. Name` heading above it, with its number and aside removed. */
  pathHeading: string;
  /** The whole `**Target:**` line, kept so an unparsed one is visible. */
  target: string | null;
  /** The first quoted keyword on that line: the page's primary term. */
  primary: string | null;
  /** The `` - `atom-id` `` bullets, in the order the plan lists them. */
  atoms: string[];
}

/**
 * The plan as data: `## N. Path`, `### Section`, `**Target:** "kw" (n)` and
 * `` - `atom-id` `` bullets.
 *
 * Parsed rather than imported because the outline is authoring input with no
 * frontmatter — `sitemap-coverage` lists `outlines` among the directories that
 * are not pages. A volume is read only where the plan records one; no number
 * is derived here, because every figure in that file came from Ahrefs and
 * inventing one would be worse than having none.
 */
function parsePlan(markdown: string): PlanSection[] {
  const sections: PlanSection[] = [];
  let pathHeading = "";
  let current: PlanSection | null = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(?!#)(.+)$/.exec(line);
    if (heading) {
      const raw = heading[1].trim();
      // Only the numbered H2s are paths; "Volume Summary by Path" is a table.
      pathHeading = /^\d+\.\s/.test(raw)
        ? raw
            .replace(/^\d+\.\s*/, "")
            .replace(/\s*\([^)]*\)\s*$/, "")
            .trim()
        : "";
      continue;
    }

    const section = /^###\s+(.+)$/.exec(line);
    if (section) {
      current = {
        title: section[1].trim(),
        pathHeading,
        target: null,
        primary: null,
        atoms: [],
      };
      sections.push(current);
      continue;
    }

    if (!current) continue;

    const target = /^\*\*Target:\*\*\s*(.+)$/.exec(line);
    if (target) {
      current.target = target[1].trim();
      current.primary = /"([^"]+)"/.exec(current.target)?.[1] ?? null;
      continue;
    }

    const atom = /^-\s+`([a-z0-9-]+)`/.exec(line);
    if (atom) current.atoms.push(atom[1]);
  }

  return sections;
}

/** A heading as an id: the rule by which all 9 outline paths meet a real path. */
function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function plan(): PlanSection[] {
  return parsePlan(fs.readFileSync(OUTLINE, "utf-8"));
}

describe("the April path outlines, against the site", () => {
  /**
   * The guard on the guard. Every reading below is a count over these
   * sections, so a changed heading level or a reworded `**Target:**` line
   * would otherwise let the whole file pass on an empty parse.
   *
   * 37 sections, 37 of them carrying a target line and 205 atom bullets
   * between them, on 2026-09-22.
   */
  it("parses the plan it is measuring", () => {
    const sections = plan();
    expect(sections.length).toBeGreaterThanOrEqual(37);
    expect(sections.filter((s) => s.target !== null).length).toBe(sections.length);
    expect(sections.filter((s) => s.primary !== null).length).toBe(sections.length);

    const refs = sections.flatMap((s) => s.atoms);
    expect(refs.length).toBeGreaterThanOrEqual(205);
    expect(new Set(refs).size).toBeGreaterThanOrEqual(122);
  });

  /**
   * The half of the plan that survived. 205 of 205 references resolve on
   * 2026-09-22 — no other April document manages that — so this is a floor
   * that may rise as ids are added and must never fall: a rename that leaves
   * the plan naming a concept the graph no longer holds fails here.
   */
  it("still names only real atoms", async () => {
    const atoms = await loadAtoms();
    // The population, so a broken loader fails instead of resolving nothing.
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const ids = new Set(atoms.map((a) => a.frontmatter.id));
    const sections = plan();
    const refs = sections.flatMap((s) => s.atoms);
    const missing = [...new Set(refs)].filter((id) => !ids.has(id));

    expect(missing).toEqual([]);
    expect(refs.filter((id) => ids.has(id)).length).toBeGreaterThanOrEqual(205);
  });

  /**
   * The half that did not. The site built 78 guides with their own titles and
   * none of them is a section of this plan: 0 of 37 on 2026-09-22. Not
   * asserted at 0 — a guide adopting a planned title is a good thing — but a
   * guide that adopts one has to claim the term the plan wrote it for, or the
   * plan's own page and the new one argue for the same intent under one name.
   */
  it("keeps an adopted plan title and its planned term on the same guide", async () => {
    const bridges = await loadBridges();
    // The population: 78 guides, so an empty load cannot read as 0 matches.
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const byTitle = new Map(bridges.map((b) => [b.frontmatter.title.trim().toLowerCase(), b]));
    const sections = plan();
    expect(sections.every((s) => s.title.length > 0)).toBe(true);

    const adopted = sections.filter((s) => byTitle.has(s.title.toLowerCase()));
    const silent = adopted.filter((s) => {
      const guide = byTitle.get(s.title.toLowerCase());
      const keywords = (guide?.frontmatter.target_keywords ?? []).map((k) =>
        k.keyword.trim().toLowerCase(),
      );
      return !keywords.includes((s.primary ?? "").toLowerCase());
    });

    expect(silent.map((s) => s.title)).toEqual([]);
  });

  /**
   * Who claims each planned primary term today.
   *
   * Counting guides alone reports 19 of the 37 as undeclared, which reads as a
   * list of holes and is not one: 5 of those terms are held by hub routes that
   * live in `src/app` and have no frontmatter to declare them in, which is why
   * `ROUTE_KEYWORDS` exists at all (tracker entries 197 and 226). "improv
   * games" at 3,100 a month is /improv-games, not a gap. Read against both
   * registers on 2026-09-22: 18 claimed by a guide, 5 by a hub, 14 by neither
   * — 12 distinct terms, "yes and" and "improv tips" each being the primary of
   * 2 sections.
   *
   * The 14 is a ceiling that may only fall. A new guide on one of those terms
   * lowers it; a rise means a page stopped declaring something the plan had
   * already argued for.
   */
  it("records the planned primaries that neither a guide nor a hub claims", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const claimed = new Set<string>();
    for (const bridge of bridges) {
      for (const k of bridge.frontmatter.target_keywords ?? []) {
        claimed.add(k.keyword.trim().toLowerCase());
      }
    }
    // The population on both sides: a guide register that lost its keywords,
    // or a hub registry read as empty, would report every term unclaimed.
    expect(claimed.size).toBeGreaterThanOrEqual(150);

    const hubs = new Set<string>();
    for (const keywords of Object.values(ROUTE_KEYWORDS)) {
      for (const k of keywords) hubs.add(k.keyword.trim().toLowerCase());
    }
    expect(hubs.size).toBeGreaterThanOrEqual(9);

    const sections = plan();
    const primaries = sections.map((s) => (s.primary ?? "").toLowerCase());
    expect(primaries.filter((k) => k.length > 0).length).toBe(sections.length);

    const byGuide = primaries.filter((k) => claimed.has(k));
    const byHub = primaries.filter((k) => !claimed.has(k) && hubs.has(k));
    const byNeither = primaries.filter((k) => !claimed.has(k) && !hubs.has(k));

    // Every section is accounted for exactly once.
    expect(byGuide.length + byHub.length + byNeither.length).toBe(sections.length);

    // The hubs really are answering some of them: 5 on 2026-09-22.
    expect(byHub.length).toBeGreaterThanOrEqual(1);

    // 14 sections, 12 distinct terms, on 2026-09-22. Debt: the plan argued for
    // these pages and nothing on the site answers them yet.
    expect(byNeither.length).toBeLessThanOrEqual(14);
    expect(new Set(byNeither).size).toBeLessThanOrEqual(12);
  });

  /**
   * The curriculum half, which was never checked against the paths that exist.
   *
   * Each section sits under a path heading, and every one of the 9 resolves to
   * a real path by slug ("Beginner Foundations" → `beginner-foundations`,
   * whose title is "Foundations: Your First Steps in Improv" — the ids match
   * where the titles do not). So all 37 sections are mappable, and the
   * question the plan asked can be answered for every one: of the atoms this
   * page was to teach, how many does its path's lessons actually compose?
   *
   * 108 of 205 slots on 2026-09-22, and 11 of the 37 sections fully. Floors
   * just under, with the debt written down: 97 slots the plan assigned to a
   * path that the path does not teach, and 5 sections whose atoms it teaches
   * none of (listed in docs/seeds.md, because the fix is a lesson).
   *
   * Entry 342 read this as 96 of 159 over 29 mappable sections, having treated
   * `beginner-foundations` and `reference-guide` as unmappable; mapping all 9
   * adds their 8 sections and 46 slots, of which 12 are taught.
   */
  it("records how much of the plan's curriculum its path teaches", async () => {
    const paths = await loadPaths();
    const threads = await loadThreads();
    // The populations, so an empty load cannot read as nothing taught.
    expect(paths.length).toBeGreaterThanOrEqual(11);
    expect(threads.length).toBeGreaterThanOrEqual(25);

    const byId = new Map(paths.map((p) => [p.frontmatter.id, p]));
    const lessonAtoms = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.atoms ?? []]));

    const sections = plan();
    const headings = new Set(sections.map((s) => s.pathHeading));
    expect(headings.size).toBeGreaterThanOrEqual(9);
    // Every path heading meets a real path; none is silently skipped.
    expect([...headings].filter((h) => !byId.has(slugify(h)))).toEqual([]);

    let slots = 0;
    let taught = 0;
    let fully = 0;
    const untaught: string[] = [];

    for (const section of sections) {
      const home = byId.get(slugify(section.pathHeading));
      if (!home) continue;
      const teaches = new Set(
        (home.frontmatter.threads ?? []).flatMap((id) => lessonAtoms.get(id) ?? []),
      );
      const hit = section.atoms.filter((id) => teaches.has(id));
      slots += section.atoms.length;
      taught += hit.length;
      if (section.atoms.length > 0 && hit.length === section.atoms.length) fully += 1;
      if (section.atoms.length > 0 && hit.length === 0) untaught.push(section.title);
    }

    // 205 slots over 37 mappable sections on 2026-09-22.
    expect(slots).toBeGreaterThanOrEqual(205);

    // 108 taught; the floor sits just under. Debt: 97 untaught slots.
    expect(taught).toBeGreaterThanOrEqual(105);

    // 11 sections fully taught; the floor sits just under. Debt: 26 partial.
    expect(fully).toBeGreaterThanOrEqual(10);

    // 5 sections whose path teaches none of their atoms — a ceiling that may
    // only fall, and the list docs/seeds.md carries for the author.
    expect(untaught.length).toBeLessThanOrEqual(5);
  });
});
