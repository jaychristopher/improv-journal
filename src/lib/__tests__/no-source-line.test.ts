import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms } from "../content";
import {
  claimsSynthesis,
  hasSpecificSources,
  hasWorkEdge,
  NO_SOURCE_LINE,
  noSourceRecorded,
  unsourcedConceptIds,
} from "../no-source";

const APP = path.join(process.cwd(), ".next", "server", "app");
const DETAIL = path.join(process.cwd(), "src", "components", "AtomDetail.tsx");
/**
 * A build directory is not a finished build — see podcast-series for the
 * account — and a finished build is not necessarily this source (see
 * principle-failures): the built checks wait for a build at least as new as
 * the component that renders the line.
 */
const built =
  fs.existsSync(APP) &&
  fs.existsSync(path.join(APP, "index.html")) &&
  fs.statSync(path.join(APP, "index.html")).mtimeMs >= fs.statSync(DETAIL).mtimeMs;

/**
 * The concepts with no source say so.
 *
 * 28 of the 173 concepts have no edge to any library work in either
 * direction, and they are the practice and diagnosis layers almost
 * entirely — ten formats, ten exercises, the three recovery patterns, the
 * site's own collapse-mode and scene-failure frameworks — while every
 * definition, principle, antipattern, insight and pedagogy atom has a work
 * behind it (tracker entry 284, 2026-09-22). The page omitted the Source
 * group on all of them, so a reader could not tell "no source" from "not
 * shown". It now renders "No source recorded" where the group would be,
 * unless the atom has said something about provenance by another route: a
 * `sources:` entry, a "Specific sources" section, or an attribution note
 * that calls the idea a synthesis.
 *
 * The count is a ceiling, not a floor, because the fix is content authoring
 * — a reference edge to the manual the game came from, or a note claiming
 * the idea — and each one should lower it. The 17 carrying the line on
 * 2026-09-22 are the debt, listed so a new unsourced atom fails here by
 * name. The entry counted 22 without a Specific sources section; the five
 * that do not get the line are decay-recovery, diagnosing-scene-failure and
 * systemic-collapse-modes, whose notes call the idea a synthesis, and
 * emotional-honesty-scene and last-word-response, which carry a `sources:`
 * entry the Source group already lists.
 */
const DEBT = [
  "alphabet-game",
  "big-booty",
  "bippity-bippity-bop",
  "blind-line",
  "bus-stop",
  "first-line-drill",
  "fracture-repair-drill",
  "latency-recovery",
  "one-word-story",
  "party-quirks",
  "sound-ball",
  "story-story-die",
  "superheroes",
  "two-headed-expert",
  "what-are-you-doing",
  "worlds-worst",
  "yes-lets",
];

describe("no source recorded", () => {
  it("marks the concepts with no work, no sources entry, no sources section and no synthesis claim, and no others", async () => {
    const atoms = await loadAtoms();
    const concepts = atoms.filter((a) => a.frontmatter.type !== "reference");
    // Guard the guard: 205 atoms, 173 concepts, 32 works on 2026-09-22.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(concepts.length).toBeGreaterThanOrEqual(170);
    expect(atoms.length - concepts.length).toBeGreaterThanOrEqual(30);

    const ids = unsourcedConceptIds(atoms);
    // The ceiling: 17 on 2026-09-22, and every one of them named. A new
    // unsourced atom fails the subset check; a paid debt only shrinks it.
    expect(ids.length).toBeLessThanOrEqual(DEBT.length);
    const unexpected = ids.filter((id) => !DEBT.includes(id));
    expect(unexpected).toEqual([]);
    // And the debt is real today, so the module is not passing on nothing.
    expect(ids.length).toBeGreaterThanOrEqual(10);
    expect(ids).toContain("big-booty");

    // No page with a source by any route carries the line.
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      const recorded =
        fm.type === "reference" ||
        (fm.sources ?? []).length > 0 ||
        hasWorkEdge(fm, atoms) ||
        hasSpecificSources(atom.content) ||
        claimsSynthesis(atom.content);
      if (recorded) expect(noSourceRecorded(atom, atoms), fm.id).toBe(false);
      else expect(noSourceRecorded(atom, atoms), fm.id).toBe(true);
    }
    // The entry's own examples, by route: yes-and cites works; la-ronde has
    // a Specific sources section and no work; decay-recovery claims the
    // synthesis; big-booty has nothing.
    const by = (id: string) => atoms.find((a) => a.frontmatter.id === id)!;
    expect(hasWorkEdge(by("yes-and").frontmatter, atoms)).toBe(true);
    expect(hasWorkEdge(by("la-ronde").frontmatter, atoms)).toBe(false);
    expect(hasSpecificSources(by("la-ronde").content)).toBe(true);
    expect(claimsSynthesis(by("decay-recovery").content)).toBe(true);
    expect(noSourceRecorded(by("yes-and"), atoms)).toBe(false);
    expect(noSourceRecorded(by("big-booty"), atoms)).toBe(true);
  });

  it("reads the heading and the word, not their neighbours", () => {
    expect(hasSpecificSources("## Specific sources\n\n- Spolin")).toBe(true);
    expect(hasSpecificSources("### Specific sources")).toBe(true);
    expect(hasSpecificSources("The specific sources are unclear.")).toBe(false);
    expect(hasSpecificSources("## Sources")).toBe(false);
    expect(claimsSynthesis("This is original synthesis — no published source")).toBe(true);
    expect(claimsSynthesis("Drawn from Johnstone.")).toBe(false);
    expect(NO_SOURCE_LINE).toBe("No source recorded");
  });

  it.runIf(built)(
    "prints the line on big-booty's page, in the tracked Source group, and not on yes-and's",
    async () => {
      const atoms = await loadAtoms();
      const read = (id: string) => {
        const fm = atoms.find((a) => a.frontmatter.id === id)!.frontmatter;
        const file = path.join(APP, `${getAtomUrl(fm).slice(1)}.html`);
        expect(fs.existsSync(file), file).toBe(true);
        return fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
      };
      const bigBooty = read("big-booty");
      const at = bigBooty.indexOf(NO_SOURCE_LINE);
      expect(at).toBeGreaterThan(0);
      // Inside the Source group's wrapper, so a click nearby reports the block.
      const wrapper = bigBooty.lastIndexOf('data-track="sources"', at);
      expect(wrapper).toBeGreaterThan(0);
      expect(bigBooty.slice(wrapper, at)).not.toContain("</aside>");
      expect(read("yes-and")).not.toContain(NO_SOURCE_LINE);

      // Every page carrying the line is one the module names, and every one
      // the module names carries it.
      const ids = unsourcedConceptIds(atoms);
      const carrying: string[] = [];
      for (const atom of atoms) {
        if (atom.frontmatter.type === "reference") continue;
        const file = path.join(APP, `${getAtomUrl(atom.frontmatter).slice(1)}.html`);
        if (!fs.existsSync(file)) continue;
        const html = fs.readFileSync(file, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
        if (html.includes(NO_SOURCE_LINE)) carrying.push(atom.frontmatter.id);
      }
      expect(carrying.sort()).toEqual(ids);
      expect(carrying.length).toBeLessThanOrEqual(DEBT.length);
    },
  );
});
