import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { DIAGNOSIS_TYPES, loadDiagnosisAtoms } from "../diagnosis";

/**
 * The diagnosis hub is the only curated route to the framework, antipattern
 * and pattern layers. Its lists come from loadAtoms by type, which is right,
 * but the selection lived inline in the page where nothing checked it, and the
 * hub's own prose named two of the four frameworks — the blocking taxonomy and
 * the health indicators — while the two that do the diagnosing, the collapse
 * modes and the diagnostic procedure, went unmentioned on the page organised
 * around them. This reads the hub's data source and holds it to the corpus.
 */
describe("diagnosis hub coverage", () => {
  it("lists every framework, antipattern and pattern atom", async () => {
    const atoms = await loadAtoms();
    const expected = atoms.filter((a) =>
      (DIAGNOSIS_TYPES as readonly string[]).includes(a.frontmatter.type),
    );
    // Guard the guard: 4 frameworks, 10 antipatterns and 7 patterns on
    // 2026-09-21. A type filter that silently matched nothing must fail here.
    expect(expected.length).toBeGreaterThanOrEqual(20);

    const { frameworks, antipatterns, patterns } = await loadDiagnosisAtoms();
    const listed = new Set(
      [...frameworks, ...antipatterns, ...patterns].map((a) => a.frontmatter.id),
    );

    const missing = expected.map((a) => a.frontmatter.id).filter((id) => !listed.has(id));
    expect(missing).toEqual([]);
    expect(frameworks.length).toBeGreaterThanOrEqual(4);
    expect(antipatterns.length).toBeGreaterThanOrEqual(10);
    expect(patterns.length).toBeGreaterThanOrEqual(7);
  });

  it("files each atom under its own type", async () => {
    const { frameworks, antipatterns, patterns } = await loadDiagnosisAtoms();
    for (const a of frameworks) expect(a.frontmatter.type).toBe("framework");
    for (const a of antipatterns) expect(a.frontmatter.type).toBe("antipattern");
    for (const a of patterns) expect(a.frontmatter.type).toBe("pattern");
  });

  it("renders from that source and names every framework in its prose", async () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "how-it-works", "diagnosis", "page.tsx"),
      "utf-8",
    );
    // The page must read the shared selection, not re-filter by hand.
    expect(page).toContain("loadDiagnosisAtoms()");
    expect(page).not.toMatch(/type === "framework"/);

    // The hub's prose links the frameworks it explains. The list section
    // covers all four already; the prose used to reach two. The prose is
    // `Prose` strings since 2026-09-22 (tracker entry 278), so a link there
    // is markdown and closes with a bracket, not an attribute's quote.
    const { frameworks } = await loadDiagnosisAtoms();
    for (const framework of frameworks) {
      expect(page, framework.frontmatter.id).toMatch(
        new RegExp(`/how-it-works/diagnosis/${framework.frontmatter.id}[")]`),
      );
    }
  });
});

/**
 * The hub's FAQ names the failures it describes.
 *
 * Its lead answer, to "why did the scene die when nobody did anything
 * wrong?", described wimping — "both players being agreeable and adding
 * nothing" — without the word, on the page that lists wimping as an
 * antipattern forty lines below; the blocking answer did the same for
 * steering (tracker entry 72, 2026-09-21). The answers now link the atoms,
 * and the atoms have to be there to link.
 */
describe("diagnosis hub FAQ", () => {
  it("links the antipatterns its answers describe", async () => {
    const { antipatterns } = await loadDiagnosisAtoms();
    const ids = antipatterns.map((a) => a.frontmatter.id);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(ids).toContain("wimping");
    expect(ids).toContain("steering");

    const page = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "how-it-works", "diagnosis", "page.tsx"),
      "utf-8",
    );
    const faq = page.slice(
      page.indexOf("Questions People Ask About Scenes Going Wrong"),
      page.indexOf("{frameworks.length > 0"),
    );
    expect(faq.length).toBeGreaterThan(500);
    // The answers are `Prose` strings since 2026-09-22 (tracker entry 278),
    // so the link is written as markdown — `[wimping](/how-it-works/diagnosis/wimping)`
    // — and closes with a bracket rather than an attribute's quote.
    expect(faq).toMatch(/\]\(\/how-it-works\/diagnosis\/wimping\)/);
    expect(faq).toMatch(/\]\(\/how-it-works\/diagnosis\/steering\)/);
    // The mid-scene answer names the one question rather than only saying
    // there should be one.
    expect(faq).toMatch(/surprise my\s+partner/);
  });
});

/**
 * The hub names a drill for each failure.
 *
 * Its instruction is "name the failure"; the graph held 37 `contrasts` edges
 * from drills to the ten antipatterns and the hub mentioned no exercise at
 * all (tracker entry 286, 2026-09-22 — the entry's testable check was that
 * `grep -ci "drill\|exercise"` on this page is 0). The card now carries
 * "Counter it with:" and the first three drills, read from counter-drills.ts;
 * the built assertion is in counter-drills.test.ts.
 */
describe("diagnosis hub counter line", () => {
  it("reads the shared map and renders it under the antipattern cards", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "how-it-works", "diagnosis", "page.tsx"),
      "utf-8",
    );
    expect(page).toContain("counterDrills(");
    expect(page).toContain("COUNTER_DRILLS_CAP");
    const list = page.slice(
      page.indexOf('data-track="antipattern-list"'),
      page.indexOf('data-track="pattern-list"'),
    );
    expect(list).toContain("Counter it with:");
    // Above the card's stretched title link, or the drills are not clickable.
    expect(list).toMatch(/relative z-10[^>]*>\s*Counter it with:/);
  });
});
