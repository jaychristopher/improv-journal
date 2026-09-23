import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { FOCUSES, LEVELS } from "@/app/tools/exercise-picker/picker-config";

import { drillsWithoutTrainsTarget } from "../../../scripts/seeds.mjs";
import sitemap from "../../app/sitemap";
import { loadAtoms } from "../content";
import { getPickerExercises, loadPickerExercises } from "../exercise-picker";
import {
  buildPrincipleFacets,
  focusPrinciplesLine,
  focusPrinciplesNote,
  indexablePrincipleFacets,
  isIndexablePrincipleFacet,
  principleFacetPath,
  principleFacets,
  principlesTrainedBy,
} from "../picker-principles";
import { buildTrainsIndex } from "../trains";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The picker's derived facet family, checked against the line it derives from.
 *
 * The picker filed its 27 drills under 6 focus tags the author wrote, and the
 * drills say in their own `**Trains:**` line what they are for. The two
 * taxonomies do not map: "Courage & Commitment" holds drills training Be
 * Supportive, Be Thankful, Be Present and Be Brave, "Physicality & Space"
 * trains no principle at all, and 4 of the 9 principles had no facet — so a
 * reader who came off the principles hub with a principle to work on could
 * not ask the tool built to answer "which drill" for it (tracker entry 335,
 * 2026-09-22). The tags stay and the derived family sits beside them.
 *
 * These read the live content, so a drill that gains or loses a Trains line
 * moves the numbers here rather than silently emptying a facet.
 */
describe("picker principle facets", () => {
  it("puts every Trains-backed drill under the principle its line names", async () => {
    const atoms = await loadAtoms();
    const index = buildTrainsIndex(atoms);
    const facets = await principleFacets();

    // Guard the guard: the population the facets are cut from. 27 drills and
    // 9 principles on 2026-09-22; a filter that returned nothing would make
    // every assertion below vacuous.
    const exercises = await loadPickerExercises();
    expect(exercises.length).toBeGreaterThanOrEqual(25);
    expect(atoms.filter((a) => a.frontmatter.type === "principle").length).toBe(9);

    // The 8 drills whose Trains line names a principle, on 2026-09-22. Named
    // rather than counted, because the point of the family is that this
    // particular drill answers for this particular principle.
    const expected: Record<string, string[]> = {
      "be-present": ["last-word-response", "zip-zap-zop"],
      "be-brave": ["first-line-drill"],
      "be-changeable": ["emotion-switch"],
      "be-honest": ["emotional-honesty-scene"],
      "be-positive": ["yes-and-chain"],
      "be-supportive": ["blind-offer"],
      "be-thankful": ["gift-giving"],
    };
    const drillsBy = Object.fromEntries(
      facets.map((f) => [f.id, f.drills.map((d) => d.id).sort()]),
    );
    for (const [principle, drills] of Object.entries(expected)) {
      expect(drillsBy[principle], principle).toEqual([...drills].sort());
    }
    expect(Object.values(expected).flat().length).toBe(8);

    // And the facets are exactly what the index says, so the page cannot
    // drift from the line it claims to read.
    for (const facet of facets) {
      expect(facet.drills.map((d) => d.id).sort(), facet.id).toEqual(
        [...(index.trainedBy.get(facet.id) ?? [])].sort(),
      );
    }
  });

  it("publishes a facet for each of the 7 principles a drill names, and none for the rest", async () => {
    const atoms = await loadAtoms();
    const principles = atoms.filter((a) => a.frontmatter.type === "principle");
    const facets = await principleFacets();

    // 7 of the 9 on 2026-09-22. Be Simple and Framing have no drill whose
    // Trains line names them, and get no page rather than an empty one — the
    // soft-404 shape the level/focus router was fixed for.
    expect(facets.length).toBe(7);
    const empty = principles
      .map((p) => p.frontmatter.id)
      .filter((id) => !facets.some((f) => f.id === id));
    expect(empty.sort()).toEqual(["be-simple", "framing-as-angle-of-approach"]);

    for (const facet of facets) {
      expect(facet.drills.length, facet.id).toBeGreaterThan(0);
      expect(facet.href).toBe(principleFacetPath(facet.id));
      expect(facet.principleHref.startsWith("/how-it-works/principles/"), facet.id).toBe(true);
    }
  });

  it("drops a principle from the family when nothing trains it", async () => {
    // The rule, not the reading: a fixture with one drill naming one
    // principle publishes one facet, whatever the live content does.
    const atoms = [
      { frontmatter: { id: "be-present", title: "Be Present", type: "principle" } },
      { frontmatter: { id: "be-simple", title: "Be Simple", type: "principle" } },
      {
        frontmatter: { id: "zip-zap-zop", title: "Zip Zap Zop", type: "exercise" },
        content: "**Trains:** Be Present — attention as a muscle.",
      },
    ] as unknown as Parameters<typeof buildPrincipleFacets>[0];
    const exercises = [
      {
        id: "zip-zap-zop",
        title: "Zip Zap Zop",
        tags: [],
        focuses: [],
        href: "/practice/exercises/zip-zap-zop",
        description: "A circle game.",
      },
    ];
    const facets = buildPrincipleFacets(atoms, exercises);
    expect(facets.map((f) => f.id)).toEqual(["be-present"]);
    expect(facets[0].drills.map((d) => d.id)).toEqual(["zip-zap-zop"]);
  });

  /**
   * Thin facets are served and not indexed, which is the treatment the
   * level/focus facets already get (MIN_INDEXABLE_EXERCISES, entry 241). No
   * principle clears the gate on 2026-09-22 — Be Present holds 2 drills and
   * the other 6 hold 1 — so the sitemap gains nothing, and this records that
   * as a consequence of the rule rather than as an absence nobody noticed.
   */
  it("indexes no facet under the count gate, and asks the sitemap for none", async () => {
    const facets = await principleFacets();
    expect(facets.every((f) => f.drills.length < 3)).toBe(true);
    expect(facets.some(isIndexablePrincipleFacet)).toBe(false);
    expect(await indexablePrincipleFacets()).toEqual([]);

    const listed = (await sitemap())
      .map((entry) => new URL(entry.url).pathname.replace(/\/+$/, ""))
      .filter((p) => p.startsWith("/tools/exercise-picker/principle"));
    expect(listed).toEqual([]);

    // Guard the guard: the sitemap still holds the picker's other facets, so
    // an empty sitemap cannot agree with an empty expectation.
    const facetUrls = (await sitemap())
      .map((entry) => new URL(entry.url).pathname.replace(/\/+$/, ""))
      .filter((p) => /^\/tools\/exercise-picker\/[^/]+\/[^/]+$/.test(p));
    expect(facetUrls.length).toBeGreaterThanOrEqual(6);
  });
});

/**
 * What a focus page says about the principles behind its drills.
 *
 * The sentence is built from the same index the facets are, so the two
 * surfaces cannot disagree about which principle a drill trains.
 */
describe("focus pages name their principles", () => {
  it("matches the index for every populated focus", async () => {
    const atoms = await loadAtoms();
    const index = buildTrainsIndex(atoms);
    let checked = 0;
    let withNote = 0;

    for (const level of LEVELS) {
      for (const focus of FOCUSES) {
        const drills = await getPickerExercises(level.slug, focus.tag, focus.extraTags);
        if (drills.length === 0) continue;
        checked += 1;
        const note = await focusPrinciplesNote(drills);
        const principles = principlesTrainedBy(
          drills.map((d) => d.id),
          atoms,
          index,
        );
        if (principles.length === 0) {
          // The sentence is absent rather than a heading with nothing after
          // it: every Physicality & Space facet trains no principle at all,
          // and the advanced facets hold none of the drills that name one.
          expect(note, `${level.slug}/${focus.slug}`).toBeNull();
          continue;
        }
        withNote += 1;
        expect(note, `${level.slug}/${focus.slug}`).toBe(
          focusPrinciplesLine(
            drills.length,
            principles.map((p) => p.title),
          ),
        );
        for (const principle of principles) {
          expect(note, `${level.slug}/${focus.slug}`).toContain(principle.title);
        }
      }
    }

    // Guard the guard: 15 populated combinations on 2026-09-22 and 8 of them
    // carry the sentence. The 7 that do not are the 3 physicality facets,
    // beginner/recovery and the 4 advanced facets, whose drills name no
    // principle. Floors, so a rule that emptied the loop fails here.
    expect(checked).toBeGreaterThanOrEqual(14);
    expect(withNote).toBeGreaterThanOrEqual(8);
  });

  it("says nothing for a focus whose drills name no principle", async () => {
    const atoms = await loadAtoms();
    for (const level of LEVELS) {
      const drills = await getPickerExercises(level.slug, "physicality", []);
      if (drills.length === 0) continue;
      expect(
        principlesTrainedBy(
          drills.map((d) => d.id),
          atoms,
        ),
      ).toEqual([]);
      expect(await focusPrinciplesNote(drills)).toBeNull();
    }
    expect(focusPrinciplesLine(5, [])).toBeNull();
  });

  it("writes the list without the serial comma the site does not use", () => {
    expect(
      focusPrinciplesLine(12, ["Be Brave", "Be Present", "Be Supportive", "Be Thankful"]),
    ).toBe("These 12 drills train Be Brave, Be Present, Be Supportive and Be Thankful.");
    expect(focusPrinciplesLine(2, ["Be Changeable", "Be Honest"])).toBe(
      "These 2 drills train Be Changeable and Be Honest.",
    );
    expect(focusPrinciplesLine(4, ["Be Changeable"])).toBe("These 4 drills train Be Changeable.");
  });
});

/**
 * The drills the Trains line cannot route, which is the author's list.
 *
 * docs/seeds.md computes it with its own copy of the regex — a .mjs script
 * cannot import the TypeScript module — so this holds the two readings
 * against each other. 11 of the 27 on 2026-09-22: 3 with no line at all and 8
 * whose line names no concept the graph holds.
 */
describe("drills with no Trains line", () => {
  it("agrees with the trains index", async () => {
    const atoms = await loadAtoms();
    const index = buildTrainsIndex(atoms);
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const fromIndex = exercises
      .map((a) => a.frontmatter.id)
      .filter((id) => (index.trains.get(id) ?? []).length === 0)
      .sort();
    const fromScript = drillsWithoutTrainsTarget(
      atoms.map((a) => ({ id: a.frontmatter.id, fm: a.frontmatter, body: a.content ?? "" })),
    )
      .map((d: { id: string }) => d.id)
      .sort();

    expect(fromScript).toEqual(fromIndex);
    expect(fromIndex.length).toBe(11);
    expect(exercises.length - fromIndex.length).toBe(16);
  });

  it("is listed in docs/seeds.md with its own count", () => {
    const page = fs.readFileSync(path.join(process.cwd(), "docs", "seeds.md"), "utf8");
    const heading = /^## Drills with no Trains line \((\d+)\)$/m.exec(page);
    expect(heading, "run `node scripts/seeds.mjs`").not.toBeNull();
    expect(Number(heading![1])).toBe(11);
    // The three with no line at all are the ones an author can fix fastest.
    for (const id of ["bippity-bippity-bop", "sound-ball", "yes-lets"]) {
      expect(page).toContain(`\`${id}\``);
    }
  });
});

/**
 * The built pages. `it.runIf(built)` because these read .next; they pass
 * after the next production build and skip before it.
 */
describe("the built facet pages", () => {
  const page = (route: string) => fs.readFileSync(path.join(APP, `${route}.html`), "utf8");

  it.runIf(built)("publishes a page per populated principle, and links the principle", async () => {
    const facets = await principleFacets();
    expect(facets.length).toBe(7);

    for (const facet of facets) {
      const file = path.join(APP, `tools/exercise-picker/principle/${facet.id}.html`);
      expect(fs.existsSync(file), facet.id).toBe(true);
      const html = fs.readFileSync(file, "utf8");
      // The principle's own page, the count line and every drill it lists.
      expect(html, facet.id).toContain(`href="${facet.principleHref}"`);
      expect(html, facet.id).toContain("whose Trains line names this principle");
      for (const drill of facet.drills) expect(html, drill.id).toContain(`href="${drill.href}"`);
      // Thin, so served and not indexed.
      expect(html, facet.id).toMatch(/<meta name="robots" content="[^"]*noindex/);
    }
  });

  it.runIf(built)("publishes no page for a principle nothing trains", () => {
    for (const id of ["be-simple", "framing-as-angle-of-approach"]) {
      expect(fs.existsSync(path.join(APP, `tools/exercise-picker/principle/${id}.html`)), id).toBe(
        false,
      );
    }
  });

  it.runIf(built)("carries the principles sentence on the focus pages", async () => {
    let seen = 0;
    for (const level of LEVELS) {
      for (const focus of FOCUSES) {
        const file = path.join(APP, `tools/exercise-picker/${level.slug}/${focus.slug}.html`);
        if (!fs.existsSync(file)) continue;
        const html = fs.readFileSync(file, "utf8");
        const drills = await getPickerExercises(level.slug, focus.tag, focus.extraTags);
        const note = await focusPrinciplesNote(drills);
        if (note === null) {
          // Physicality & Space: no sentence, and no empty element either.
          expect(html, `${level.slug}/${focus.slug}`).not.toContain("data-facet-principles");
          continue;
        }
        seen += 1;
        expect(html, `${level.slug}/${focus.slug}`).toContain("data-facet-principles");
        expect(html, `${level.slug}/${focus.slug}`).toContain("drills train");
      }
    }
    // 8 of the 15 populated facets carry it on 2026-09-22.
    expect(seen).toBeGreaterThanOrEqual(8);
  });

  it.runIf(built)("sends a principle page to its facet from the drills group", async () => {
    const facets = await principleFacets();
    for (const facet of facets) {
      const html = page(`how-it-works/principles/${facet.id}`);
      expect(html, facet.id).toContain("data-drills-facet");
      expect(html, facet.id).toContain(`href="${facet.href}"`);
      expect(html, facet.id).toContain(`all drills for ${facet.title}`);
    }
    // A principle with no facet has no line to show.
    for (const id of ["be-simple", "framing-as-angle-of-approach"]) {
      expect(page(`how-it-works/principles/${id}`), id).not.toContain("data-drills-facet");
    }
  });

  it.runIf(built)("reaches every facet from the picker", async () => {
    const html = page("tools/exercise-picker");
    for (const facet of await principleFacets()) {
      expect(html, facet.id).toContain(`href="${facet.href}"`);
    }
  });
});
