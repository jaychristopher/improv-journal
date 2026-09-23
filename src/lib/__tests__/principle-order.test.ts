import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getEpisodesForShow, loadAtoms } from "../content";
import { PRINCIPLE_DEPENDENCY_ORDER, principleSequence, sortPrinciples } from "../principle-order";

/**
 * The principles hub lists its cards in the order its own diagram draws.
 *
 * The page's diagram and prose both say be present is the precondition and
 * framing sits apart, and the caption called the listed order "the least
 * useful way to use them" — while the list was directory order, with the
 * precondition fifth (tracker entry 74, 2026-09-21). The order is now a
 * module the hub reads; this holds it to the corpus so a new principle is
 * placed rather than lost, and to the page so the hub keeps reading it.
 *
 * The same day the hub was fixed there were three orders for the nine atoms:
 * the hub's, a hand-written teaching order in the detail pager (be-positive
 * first), and the alphabet in the Improv Lab's "Principles" season, which
 * never sorted and so replayed whatever the loader yielded (entry 207). The
 * last block holds all three surfaces to this module, build-independently,
 * so a fourth order cannot appear.
 */
describe("principle order", () => {
  it("names every principle in the corpus, and nothing else", async () => {
    const atoms = await loadAtoms();
    const ids = atoms
      .filter((a) => a.frontmatter.type === "principle")
      .map((a) => a.frontmatter.id);
    // Guard the guard: nine principles on 2026-09-21.
    expect(ids.length).toBeGreaterThanOrEqual(9);
    for (const id of PRINCIPLE_DEPENDENCY_ORDER) expect(ids).toContain(id);
    // A tenth principle would still render (appended before framing), but
    // the order should say where it goes — fail here so someone decides.
    expect(ids.filter((id) => !PRINCIPLE_DEPENDENCY_ORDER.includes(id))).toEqual([]);
  });

  it("puts the precondition first and framing apart, whatever order the atoms load in", async () => {
    const atoms = await loadAtoms();
    const principles = atoms.filter((a) => a.frontmatter.type === "principle");
    const sorted = sortPrinciples(principles).map((a) => a.frontmatter.id);
    expect(sorted[0]).toBe("be-present");
    expect(sorted[sorted.length - 1]).toBe("framing-as-angle-of-approach");
    expect(sorted).toEqual([...PRINCIPLE_DEPENDENCY_ORDER]);

    // Directory order is what the hub used to render, and it is not this.
    expect(principles.map((a) => a.frontmatter.id)).not.toEqual(sorted);

    // An unlisted principle lands after the eight and before framing.
    const extra = sortPrinciples([...principles, { frontmatter: { id: "be-new" } }]).map(
      (a) => a.frontmatter.id,
    );
    expect(extra.indexOf("be-new")).toBe(extra.length - 2);
  });

  it("is what the hub, the pager and the podcast season all yield", async () => {
    const atoms = await loadAtoms();
    // Guard the guard: nine principles on 2026-09-21.
    expect(atoms.filter((a) => a.frontmatter.type === "principle").length).toBeGreaterThanOrEqual(
      9,
    );

    // The hub: sortPrinciples over the principle atoms.
    const hub = sortPrinciples(atoms.filter((a) => a.frontmatter.type === "principle")).map(
      (a) => a.frontmatter.id,
    );

    // The pager: walk `next` from the first, the way the detail page computes
    // nextSlug = order[(i + 1) % order.length], until it loops.
    const sequence = principleSequence(atoms);
    const walked: string[] = [];
    for (let slug = sequence[0]; !walked.includes(slug); ) {
      walked.push(slug);
      slug = sequence[(sequence.indexOf(slug) + 1) % sequence.length];
    }

    // The season: the Improv Lab's first season is the principles, and the
    // feed emits seasons in this order without re-sorting on pubDate.
    const seasons = await getEpisodesForShow("improv-lab");
    const season = seasons.find((s) => s.label === "The Principles");
    expect(season).toBeDefined();
    const played = season!.episodes.map((ep) => ep.href.split("/").pop());

    expect(hub).toEqual([...PRINCIPLE_DEPENDENCY_ORDER]);
    expect(walked).toEqual(hub);
    expect(played).toEqual(hub);
    // And none of them is the alphabet the loader yields.
    expect(played).not.toEqual([...played].sort((a, b) => a!.localeCompare(b!)));
  });

  it("is what the hub renders", () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "how-it-works", "principles", "page.tsx"),
      "utf-8",
    );
    expect(page).toContain("sortPrinciples(");
    // The caption used to disown the list it captioned.
    expect(page).not.toContain("rather than the order they are listed in");

    // The pager reads the same module and no longer carries a list of its own.
    const pager = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "how-it-works", "principles", "[slug]", "page.tsx"),
      "utf-8",
    );
    expect(pager).toContain("principleSequence(");
    expect(pager).not.toContain("CANONICAL_PRINCIPLE_ORDER");
    expect(pager).not.toMatch(/\[\s*"be-positive"/);
  });
});
