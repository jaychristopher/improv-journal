import { describe, expect, it } from "vitest";

import {
  inboundGroupsFor,
  mergeSymmetricInbound,
  outboundGroupsFor,
  pairedWith,
} from "../../components/AtomDetail";
import {
  getAtomUrl,
  getBridgesForAtom,
  getInboundLinks,
  getParentPath,
  getThreadsForAtom,
  loadAtoms,
} from "../content";
import { requiredByView, requiresGraph } from "../direct-requires";
import { loadImprovGames } from "../games";
import { allFurniture, elementsIn, sliceRender } from "../page-furniture";
import { pathsLeaningOn } from "../path-prerequisites";
import { principleFailures } from "../principle-failures";
import { chooseOpenGroups, inboundKey, outboundKey, sidebarBudgetGroups } from "../sidebar-budget";
import { buildTrainsIndex } from "../trains";

/**
 * What a reader gets past on the way into the page's words, and on the way
 * out, counted per layer and dated.
 *
 * The register in docs/backlog/context-mistakes.md has judged exactly this
 * since 2026-08-30 — "sixteen links between the title and the first
 * sentence", "the first thing inside main was up to 190 characters of
 * internal titles", "fourteen groups in the same column" — and every one of
 * those readings was taken by a person looking at a page. On 2026-09-22 nine
 * rendered elements landed on the concept page in one evening and nobody
 * looked; the checks that ran were tests, and no test counted this. The
 * captions tests are the nearest instrument and cannot see it:
 * derived-provenance.test.ts counts one caption per region, so 3 blocks
 * folded into 1 region are 1 caption and 3 things to get past, and
 * derived-density.test.ts divides that caption count by authored words.
 *
 * Source, not the built html: the build standing on disk predates the blocks
 * this measures — it carries no `data-derived-region="context"` — and a
 * ceiling read off a stale build is a ceiling on last week's page. The source
 * is also where a new block arrives, so the reading moves in the commit that
 * causes it. page-furniture.ts holds the counting rule and the exclusions.
 *
 * Ceilings, dated, that may only fall. They sit at the reading rather than
 * one above it: these are integers, and a ceiling of "today plus one" admits
 * exactly the block the test exists to catch. A layer that gains a block
 * fails here, and the fix is to record it in the table with its date and say
 * what it displaced — not to raise the number, which is the move this
 * register's own process notes warn against.
 */
describe("page furniture", () => {
  it("reads the blocks either side of the article, and the column apart from both", () => {
    // A comment naming a tag is not a tag; a component that renders nothing
    // is not a block; the sidebar is cut out of what comes after, because it
    // is beside the article on a desktop and below it on a phone.
    const source = [
      "return (",
      "  <main>{/* the first thing in <main> was <Breadcrumb> */}",
      "    <ArticleJsonLd />",
      "    <Breadcrumb />",
      "    <ConceptVisit />",
      '    <article data-track="body" dangerouslySetInnerHTML={{ __html: html }} />',
      "    <WhatsNext />",
      '    <aside data-track="concept-sidebar"><SidebarLinkGroup /></aside>',
      '    <div data-track="exercise-picker-link"><Link href="/x">x</Link></div>',
      "  </main>",
      ");",
    ].join("\n");
    const slices = sliceRender(source, 'data-track="body"', 'data-track="concept-sidebar"');
    expect(elementsIn(slices.above)).toEqual(["Breadcrumb"]);
    expect(elementsIn(slices.after)).toEqual(["WhatsNext", "@exercise-picker-link"]);
    expect(elementsIn(slices.sidebar)).toEqual(["@concept-sidebar", "SidebarLinkGroup"]);
  });

  /**
   * Elements above the article, by layer, read from the render source on
   * 2026-09-22:
   *
   *   concepts  7  Breadcrumb, ContextBanner, LineageLine, UpdatedOn,
   *                AudioPlayer, @series, TableOfContents
   *   guides    9  Breadcrumb, @guide-problem, UpdatedOn, @guide-school,
   *                @guide-lineage, AudioPlayer, @series, TableOfContents,
   *                PromptGenerator
   *   lessons   8  Breadcrumb, JourneyProgressBar, UpdatedOn,
   *                LessonCrosslink, AudioPlayer, @series, @lesson-overview,
   *                @listen
   *   paths     8  Breadcrumb, UpdatedOn, @path-level, PathReadCount,
   *                @path-overlap, @path-start, SyllabusProgress,
   *                @path-leans-on
   *
   * A mount count: the number of distinct blocks the layer can put between a
   * reader and the first sentence. What one page shows is at or under it —
   * on the concept layer, read the same day: all 205 pages carry audio, so
   * the player and the series line render on every one; the context banner
   * renders on 137, the lineage line on 133, the table of contents on 197.
   * Median 7, max 7, min 4. The two layers whose mount count is higher are
   * higher for blocks that reach few pages — the guides' hero renders on 1.
   *
   * The page's own identity lines are outside the count — eyebrow, h1, lead
   * line, the guide's description — because they are what the reader came
   * for. The byline is inside it: it is provenance, and the register's
   * 2026-08-30 entry is about a cold arrival meeting it before orientation.
   */
  it("holds each layer's elements above the article at its 2026-09-22 reading", () => {
    const furniture = allFurniture();
    // Guard the guard: 4 layers, each render file found, read and split. A
    // scan that matched nothing would pass every ceiling below.
    expect(furniture.map((f) => f.layer)).toEqual(["concepts", "guides", "lessons", "paths"]);

    const CEILINGS: Record<string, number> = {
      concepts: 7,
      guides: 9,
      lessons: 8,
      paths: 8,
    };
    // The blocks the count is of must still be there. The breadcrumb and the
    // byline stand above the article on all 4 layers; the rest are named so
    // that a block removed shows up here as a removal and not as a lower
    // number nobody reads. LineageLine and PromptGenerator arrived above the
    // article on 2026-09-22 (tracker entries 331 and 332).
    const REQUIRED: Record<string, string[]> = {
      concepts: ["Breadcrumb", "UpdatedOn", "LineageLine", "ContextBanner", "TableOfContents"],
      guides: ["Breadcrumb", "UpdatedOn", "@guide-lineage", "PromptGenerator"],
      lessons: ["Breadcrumb", "UpdatedOn", "LessonCrosslink", "@lesson-overview"],
      paths: ["Breadcrumb", "UpdatedOn", "@path-start"],
    };
    for (const layer of furniture) {
      for (const name of REQUIRED[layer.layer]) {
        expect(layer.above, `${layer.layer}: above the article`).toContain(name);
      }
      expect(
        layer.above.length,
        `${layer.layer}: above the article — ${layer.above.join(", ")}`,
      ).toBeLessThanOrEqual(CEILINGS[layer.layer]);
    }
  });

  /**
   * Elements after the article, by layer, read from the render source on
   * 2026-09-22:
   *
   *   concepts  5  DrillPracticed, @attribution, Transcript, WhatsNext,
   *                @exercise-picker-link
   *   guides    6  Transcript, WhatsNext, @guide-next-step, GuideConcepts,
   *                GuideSources, RelatedGuides
   *   lessons   6  @lesson-reps, LessonCheckpoint, Transcript, LessonPanel,
   *                @lesson-prev-next, WhatsNext
   *   paths     7  @path-forward-needs, @path-program-map, AudioPlayer,
   *                Transcript, @path-listen, WhatsNext, NextPathReadNote
   *
   * A mount count again. On the concept layer 3 of the 5 are typed or
   * authored — DrillPracticed and the picker link render on the 27
   * exercises, the attribution note on the 11 atoms that carry one — so the
   * page most readers meet ends with the transcript fold and the router.
   *
   * The concept column is not in these numbers. It is a column, not a
   * postscript, and it has its own instruments: sidebar-load.test.ts counts
   * its links, sidebar-open-share.test.ts what opens without a click, and
   * the reading below counts its groups, which is what the register's
   * 2026-09-21 entry was counting when it found 14 in one column.
   */
  it("holds each layer's elements after the article at its 2026-09-22 reading", () => {
    const furniture = allFurniture();
    expect(furniture).toHaveLength(4);

    const CEILINGS: Record<string, number> = {
      concepts: 5,
      guides: 6,
      lessons: 6,
      paths: 7,
    };
    // The hand-off is the point of this region on every layer, so each one
    // must still route the reader onward and still offer the episode it was
    // made from. DrillPracticed is the control that landed here on
    // 2026-09-22 (tracker entry 333).
    const REQUIRED: Record<string, string[]> = {
      concepts: ["WhatsNext", "Transcript", "DrillPracticed"],
      guides: ["WhatsNext", "Transcript", "RelatedGuides"],
      lessons: ["WhatsNext", "Transcript", "LessonPanel"],
      paths: ["WhatsNext", "Transcript", "@path-program-map"],
    };
    for (const layer of furniture) {
      for (const name of REQUIRED[layer.layer]) {
        expect(layer.after, `${layer.layer}: after the article`).toContain(name);
      }
      expect(
        layer.after.length,
        `${layer.layer}: after the article — ${layer.after.join(", ")}`,
      ).toBeLessThanOrEqual(CEILINGS[layer.layer]);
    }
  });

  /**
   * Groups in the concept column, per page, open and folded.
   *
   * Reconstructed with the component's own exported functions, as
   * sidebar-open-share.test.ts does, so this reads the rule the page applies
   * and not a copy of it. A group is a labelled list a reader has to place:
   * each relation group of Connections and Referenced by, each subgroup of
   * Part of, and Source, which states the absence rather than vanishing
   * where there is none (entry 284).
   *
   * Read 2026-09-22: median 9 a page, max 16 on `offers` — 4 open, 7 folded
   * and 5 below the budget — with be-brave and be-changeable also at 16, and
   * 53 of the 205 pages at 12 or more. A page opens a median 5 groups and
   * folds a median 0; the most any page opens is 9, on overcomplication.
   *
   * This is the number the 2026-09-21 entry moved: 14 groups and 55 visible
   * links on `commitment`, fixed the same evening by folding, and the fold
   * is why 16 groups is not 16 walls. Folding is not free — a folded group
   * is still a line the reader reads and decides about — so the ceiling
   * counts both, and what opens is held separately below it.
   */
  it("holds the concept column's groups per page at its 2026-09-22 reading", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const failures = principleFailures(atoms);
    const { trainedBy } = buildTrainsIndex(atoms);
    const games = new Set((await loadImprovGames()).map((g) => g.id));

    const rows: { id: string; open: number; folded: number; groups: number }[] = [];
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      const resolved = (fm.links ?? []).map((l) => {
        const target = byId.get(l.id);
        return {
          id: l.id,
          relation: l.relation,
          title: target?.title ?? l.id,
          url: target ? getAtomUrl({ id: l.id, type: target.type }) : `/how-it-works/${l.id}`,
          type: target?.type,
        };
      });
      const inbound = await getInboundLinks(fm.id);
      const connections = mergeSymmetricInbound(resolved, inbound, fm.type);
      const outbound = outboundGroupsFor(fm.type, connections, pairedWith(fm, failures));
      const inboundGroups = inboundGroupsFor(
        inbound,
        resolved,
        new Set(trainedBy.get(fm.id) ?? []),
        fm.type,
        requiredByView(graph, fm.id, "direct"),
      ).filter((g) => g.key !== "contrasts");
      const opened = chooseOpenGroups(
        sidebarBudgetGroups(
          outbound.map((g) => ({ relation: g.key, size: g.links.length })),
          inboundGroups,
        ),
      );
      let open = 0;
      let folded = 0;
      for (const g of outbound) {
        if (opened.has(outboundKey(g.key))) open++;
        else folded++;
      }
      for (const g of inboundGroups) {
        if (opened.has(inboundKey(g.key))) open++;
        else folded++;
      }

      // The groups under the two relation blocks, which no budget reaches.
      const [threads, bridges, leaning] = await Promise.all([
        getThreadsForAtom(atom.slug),
        getBridgesForAtom(atom.slug),
        pathsLeaningOn(fm.id),
      ]);
      const parents = await Promise.all(threads.map((t) => getParentPath(t.frontmatter.id)));
      let below = 1; // Source: on every page, the works or the line saying there are none
      if (parents.some(Boolean)) below++; // Paths, reached through the lessons that compose this
      if (leaning.length) below++; // Paths that lean on this (entry 220)
      if (threads.length) below++; // Threads
      if (games.has(fm.id)) below++; // Collections
      if (bridges.length) below++; // Guides
      rows.push({ id: fm.id, open, folded, groups: open + folded + below });
    }

    // Guard the guard: the corpus must be there and the reconstruction must
    // produce groups, or a median over nothing passes every ceiling. 205
    // atoms on 2026-09-22, every one carrying at least its Source group.
    expect(rows.length).toBeGreaterThanOrEqual(200);
    expect(rows.filter((r) => r.groups > 0).length).toBeGreaterThanOrEqual(200);
    expect(rows.reduce((sum, r) => sum + r.open, 0)).toBeGreaterThanOrEqual(900);

    const byGroups = [...rows].sort((a, b) => a.groups - b.groups);
    const median = byGroups[Math.floor(byGroups.length / 2)];
    const worst = byGroups[byGroups.length - 1];
    const mostOpen = [...rows].sort((a, b) => b.open - a.open)[0];
    expect(median.groups, "concept column: median groups a page").toBeLessThanOrEqual(9);
    expect(
      worst.groups,
      `concept column: most groups on one page — ${worst.id} (${worst.open} open, ${worst.folded} folded)`,
    ).toBeLessThanOrEqual(16);
    // What a reader meets without a click, held apart from the total: a
    // change that opened more without adding a group would not move the
    // ceiling above, and this is the half that lands on the reader.
    expect(
      mostOpen.open,
      `concept column: most open groups on one page — ${mostOpen.id}`,
    ).toBeLessThanOrEqual(9);
  });
});
