import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { getAtomBySlug, loadBridges } from "../content";
import {
  conceptMarks,
  getGuideHeadedConcepts,
  headableTitle,
  headedConcepts,
  headedIds,
  headedShare,
  sectionPhrase,
  WALKED_DRILLS_MIN,
  walkedDrills,
} from "../headed-concepts";
import { contentsFor } from "../headings";
import { conceptRank, HEADING_WEIGHT, mentionCount } from "../named-concepts";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

/**
 * A guide page carries 2 maps of itself — the contents list and the
 * concept block — and they barely overlap (tracker entry 324, 2026-09-22):
 * 1,268 section headings on 78 guides, 455 declared concepts, and only 23
 * of the 455 head a section; 58 guides have no heading naming a declared
 * concept, while 34 headings name a concept the guide does not declare, 29
 * of them exercises on the exercise guides, which are organised by drill
 * and declared by principle. The tracker's hand-run script read 30 / 31 /
 * 20 / 61 / 11 for the same measures; the code's numbers are held here.
 *
 * Three surfaces now read the measure: the concept block's rank puts a
 * headed concept first (`conceptRank`), the exercise guides get a derived
 * "drills walked through" row (`walkedDrills`), and the contents list marks
 * a headed section with a link to the concept (`conceptMarks`, rendered
 * with `data-toc-concept`).
 */
describe("sectionPhrase and headableTitle", () => {
  it("reads a heading as a concept title would have to be said", () => {
    expect(sectionPhrase("2. Mirroring")).toBe("Mirroring");
    expect(sectionPhrase("10. The Machine")).toBe("The Machine");
    expect(sectionPhrase("3) Gift Giving")).toBe("Gift Giving");
    expect(sectionPhrase("Beats (First / Second / Third)")).toBe("Beats");
    // Only a leading ordinal goes; a number that is part of the name stays.
    expect(sectionPhrase("The 9 Viewpoints")).toBe("The 9 Viewpoints");
    expect(sectionPhrase("  Side-Coaching:   Adjust  ")).toBe("Side-Coaching: Adjust");
  });

  it("applies the autolink rule: generic one-word titles and short ones never head a section", () => {
    // 2 words always qualify.
    expect(headableTitle("Active Listening", "technique")).toBe(true);
    expect(headableTitle("Yes, And", "definition")).toBe(true);
    // A generic one-word title links nowhere in prose and heads nothing here.
    expect(headableTitle("Status", "definition")).toBe(false);
    expect(headableTitle("Trust", "principle")).toBe(false);
    // One word: 12 characters for a definition, 9 for the rest.
    expect(headableTitle("Heightening", "technique")).toBe(true);
    expect(headableTitle("Heightening", "definition")).toBe(false);
    expect(headableTitle("Mirroring", "exercise")).toBe(true);
    expect(headableTitle("Offers", "definition")).toBe(false);
    expect(headableTitle("Offers", "technique")).toBe(false);
    // Under 6 characters nothing qualifies, whatever the type.
    expect(headableTitle("Run", "technique")).toBe(false);
  });
});

describe("headedConcepts", () => {
  const atoms = [
    { id: "mirroring", title: "Mirroring", type: "exercise" as const },
    { id: "group-mind", title: "Group Mind", type: "definition" as const },
    { id: "group-mind-cultivation", title: "Group Mind Cultivation", type: "exercise" as const },
    { id: "side-coaching", title: "Side-Coaching", type: "pedagogy" as const },
    { id: "status", title: "Status", type: "definition" as const },
    { id: "offers", title: "Offers", type: "definition" as const },
  ];
  const headings = [
    { id: "1-mirroring", text: "1. Mirroring", level: 2 as const },
    { id: "2-group-mind-cultivation", text: "2. Group Mind Cultivation", level: 2 as const },
    { id: "side-coaching-adjust", text: "Side-Coaching: Adjust Without Stopping", level: 2 },
    { id: "status-awareness", text: "Status Awareness", level: 3 as const },
    { id: "why-offers-matter", text: "Why Offers Matter", level: 2 as const },
    { id: "the-mirror", text: "The mirror in the room", level: 3 as const },
  ] satisfies Parameters<typeof headedConcepts>[0];

  it("splits headed sections by declaration and keeps the anchor", () => {
    const headed = headedConcepts(headings, atoms, ["side-coaching", "status", "offers"]);
    expect(headed.declared.map((h) => [h.id, h.headingId])).toEqual([
      ["side-coaching", "side-coaching-adjust"],
    ]);
    expect(headed.undeclared.map((h) => [h.id, h.headingId, h.headingText])).toEqual([
      ["mirroring", "1-mirroring", "1. Mirroring"],
      ["group-mind-cultivation", "2-group-mind-cultivation", "2. Group Mind Cultivation"],
    ]);
    expect(headed.declared[0].url).toBe("/practice/techniques/side-coaching");
    expect(headed.undeclared[0].url).toBe("/practice/exercises/mirroring");
    expect([...headedIds(headed)].sort()).toEqual([
      "group-mind-cultivation",
      "mirroring",
      "side-coaching",
    ]);
  });

  it("gives a heading to the longest title it names, and a word to no title", () => {
    const headed = headedConcepts(headings, atoms, []);
    // "Group Mind Cultivation" names the exercise and, inside it, the
    // definition "Group Mind"; the heading is about the longer one.
    expect(headed.undeclared.filter((h) => h.id === "group-mind")).toEqual([]);
    // "mirror" is not "Mirroring": whole phrase only.
    expect(headed.undeclared.filter((h) => h.headingId === "the-mirror")).toEqual([]);
  });
});

describe("walkedDrills and conceptMarks", () => {
  const drill = (id: string, n: number) => ({
    id,
    title: id,
    type: "exercise" as const,
    url: `/practice/exercises/${id}`,
    headingId: `${n}-${id}`,
    headingText: `${n}. ${id}`,
  });

  it("lists the undeclared exercises once each, only from the threshold up", () => {
    const one = { declared: [], undeclared: [drill("mirroring", 1)] };
    expect(walkedDrills(one)).toEqual([]);
    const enough = {
      declared: [drill("declared-drill", 0)],
      undeclared: [
        drill("mirroring", 1),
        drill("blind-offer", 2),
        drill("mirroring", 3),
        { ...drill("side-coaching", 4), type: "pedagogy" as const },
      ],
    };
    expect(WALKED_DRILLS_MIN).toBe(2);
    expect(walkedDrills(enough).map((d) => d.id)).toEqual(["mirroring", "blind-offer"]);
  });

  it("gives the contents list 1 mark per headed section, declared or not", () => {
    const headed = { declared: [drill("a", 1)], undeclared: [drill("b", 2)] };
    expect(conceptMarks(headed)).toEqual([
      { headingId: "1-a", href: "/practice/exercises/a", title: "a" },
      { headingId: "2-b", href: "/practice/exercises/b", title: "b" },
    ]);
  });
});

describe("conceptRank", () => {
  it("puts any headed concept before any unheaded one, then ranks by mentions", () => {
    expect(conceptRank(0, true)).toBeGreaterThan(conceptRank(43, false));
    expect(conceptRank(3, true)).toBeGreaterThan(conceptRank(1, true));
    expect(conceptRank(3, false)).toBeGreaterThan(conceptRank(1, false));
    // Zero exactly when the page neither heads nor names the concept, so
    // the block's "named" flag and its order still read 1 measure.
    expect(conceptRank(0, false)).toBe(0);
  });

  it("the heading weight clears every mention count in the corpus (max 43 on 2026-09-22)", async () => {
    let max = 0;
    let seen = 0;
    for (const bridge of await loadBridges()) {
      for (const id of bridge.frontmatter.entry_atoms ?? []) {
        const atom = await getAtomBySlug(id);
        if (!atom) continue;
        seen += 1;
        max = Math.max(max, mentionCount(bridge.content, atom.frontmatter.title, id));
      }
    }
    // Guard the guard: the loop has to have seen the declarations.
    expect(seen).toBeGreaterThanOrEqual(400);
    expect(max).toBeGreaterThan(0);
    expect(max).toBeLessThan(HEADING_WEIGHT);
  });
});

describe("headed share across the guides", () => {
  it("1,268 headings, 455 declared, 23 headed on 2026-09-22; floor 20, rises only", async () => {
    const share = await headedShare();
    // Guard the guard: the measure has to have seen the corpus.
    expect(share.pages.length).toBeGreaterThanOrEqual(70);
    expect(share.headings).toBeGreaterThanOrEqual(1200);
    expect(share.declared).toBeGreaterThanOrEqual(400);
    // 23 of 455 declared concepts head a section (the tracker's script
    // read 20). The fix is a heading that says the concept's name, or a
    // declaration that matches the sections; either raises it.
    expect(share.headed).toBeGreaterThanOrEqual(20);
    expect(share.declaredHeadings).toBeGreaterThanOrEqual(share.headed);
  });

  it("34 headings name an undeclared concept on 12 guides, 29 of them exercises (readings, 2026-09-22)", async () => {
    const share = await headedShare();
    // Readings, not floors: a guide that declares the drill it walks
    // through, or renames a section, moves these either way. What must
    // hold is the shape the row is built on — the undeclared headings are
    // mostly drills, on the exercise guides.
    expect(share.undeclaredHeadings).toBeGreaterThanOrEqual(25);
    const withUndeclared = share.pages.filter((p) => p.undeclaredHeadings > 0);
    expect(withUndeclared.length).toBeGreaterThanOrEqual(8);
    let exercises = 0;
    for (const page of withUndeclared) {
      const headed = await getGuideHeadedConcepts(page.slug);
      exercises += headed.undeclared.filter((h) => h.type === "exercise").length;
    }
    expect(exercises).toBeGreaterThanOrEqual(20);
    expect(exercises / share.undeclaredHeadings).toBeGreaterThan(0.7);
  });

  it("the drills row appears on 6 guides (5 exercise guides and how-to-be-more-creative), never on 1 headed drill", async () => {
    const share = await headedShare();
    const walked = share.pages.filter((p) => p.walked.length > 0);
    // The tracker's "11 guides today" counted guides with any undeclared
    // heading; at WALKED_DRILLS_MIN the row is a discriminating marker
    // (entry 323) on 6.
    expect(walked.length).toBeGreaterThanOrEqual(5);
    expect(walked.length).toBeLessThan(share.pages.length / 4);
    for (const page of walked) expect(page.walked.length).toBeGreaterThanOrEqual(WALKED_DRILLS_MIN);
    expect(walked.map((p) => p.slug)).toEqual(
      expect.arrayContaining([
        "active-listening-exercises",
        "confidence-building-exercises",
        "trust-building-exercises",
      ]),
    );
  });

  it("the heading rank reorders 13 of 78 concept blocks on 2026-09-22, never more than the 23 headed allow", async () => {
    let changed = 0;
    let blocks = 0;
    for (const bridge of await loadBridges()) {
      const ids = bridge.frontmatter.entry_atoms ?? [];
      if (ids.length < 2) continue;
      const headed = headedIds(await getGuideHeadedConcepts(bridge.slug));
      const ranked = [];
      for (const id of ids) {
        const atom = await getAtomBySlug(id);
        if (!atom) continue;
        const mentions = mentionCount(bridge.content, atom.frontmatter.title, id);
        ranked.push({ id, mentions, rank: conceptRank(mentions, headed.has(id)) });
      }
      blocks += 1;
      const byMentions = [...ranked].sort((a, b) => b.mentions - a.mentions).map((c) => c.id);
      const byRank = [...ranked].sort((a, b) => b.rank - a.rank).map((c) => c.id);
      if (byMentions.join() !== byRank.join()) changed += 1;
    }
    expect(blocks).toBeGreaterThanOrEqual(70);
    // A block can only change where a declared concept heads a section and
    // was not already first; the tracker bounded it at 17 guides.
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThanOrEqual(23);
  });
});

describe("active-listening-exercises, the worked example", () => {
  it("heads 9 numbered sections with drills it does not declare, and none with a concept it does", async () => {
    const headed = await getGuideHeadedConcepts("active-listening-exercises");
    expect(headed.declared).toEqual([]);
    const byId = new Map(headed.undeclared.map((h) => [h.id, h]));
    expect(byId.get("mirroring")?.headingText).toBe("2. Mirroring");
    expect(byId.get("blind-offer")?.headingText).toBe("5. Blind Offer");
    expect(byId.get("the-machine")?.headingText).toBe("10. The Machine");
    for (const h of headed.undeclared) expect(h.type, h.id).toBe("exercise");
    expect(headed.undeclared.length).toBeGreaterThanOrEqual(8);
    expect(walkedDrills(headed).map((d) => d.id)).toEqual(
      expect.arrayContaining(["mirroring", "blind-offer", "the-machine"]),
    );
  });

  it("marks anchors the contents list actually shows", async () => {
    const bridges = await loadBridges();
    const bridge = bridges.find((b) => b.slug === "active-listening-exercises");
    expect(bridge).toBeDefined();
    const ids = new Set(contentsFor(bridge!.html).map((h) => h.id));
    const marks = conceptMarks(await getGuideHeadedConcepts("active-listening-exercises"));
    expect(marks.length).toBeGreaterThanOrEqual(8);
    for (const mark of marks) {
      expect(ids.has(mark.headingId), mark.headingId).toBe(true);
      expect(mark.href.startsWith("/practice/exercises/"), mark.href).toBe(true);
    }
    expect(marks.find((m) => m.title === "Mirroring")?.headingId).toBe("2-mirroring");
  });
});

/**
 * Reads the build, so it skips without one — and fails against a build
 * that predates the contents mark until the next `npm run build`.
 */
describe.runIf(built)("the built contents list carries the concept marks", () => {
  it("/active-listening-exercises links 2. Mirroring to the drill", () => {
    const html = fs.readFileSync(path.join(APP, "active-listening-exercises.html"), "utf-8");
    const marks = html.match(/<a[^>]*data-toc-concept[^>]*>/g) ?? [];
    expect(marks.length).toBeGreaterThanOrEqual(8);
    expect(marks.some((a) => a.includes('href="/practice/exercises/mirroring"'))).toBe(true);
    // The mark sits inside the contents nav, after the section's own anchor.
    const nav = html.slice(html.indexOf('aria-label="On this page"'));
    expect(nav.indexOf('href="#2-mirroring"')).toBeGreaterThan(-1);
    expect(nav.indexOf('href="/practice/exercises/mirroring"')).toBeGreaterThan(
      nav.indexOf('href="#2-mirroring"'),
    );
  });
});
