import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  inboundGroupsFor,
  mergeSymmetricInbound,
  outboundGroupsFor,
  type OutgoingLink,
} from "../../components/AtomDetail";
import { ageNormalisedRank, byRank, newestCohort } from "../atom-rank";
import { getAtomUrl, getInboundLinks, loadAtoms } from "../content";
import {
  COUNTER_DRILLS_CAP,
  counterDrills,
  type CounterPurpose,
  drillsCountering,
} from "../counter-drills";
import { principleFailures } from "../principle-failures";
import { COUNTERS_LABEL, COUNTERS_OUTBOUND_LABEL, RELATION_LABELS } from "../relation-labels";
import { buildTrainsIndex } from "../trains";

/** The purpose tiers as the module ranks them, re-derived here so the order is checked and not trusted. */
const TIER: Record<CounterPurpose, number> = { pair: 2, line: 1, none: 0 };

const APP = path.join(process.cwd(), ".next", "server", "app");
const HUB = path.join(APP, "how-it-works", "diagnosis.html");
const HUB_PAGE = path.join(process.cwd(), "src", "app", "how-it-works", "diagnosis", "page.tsx");
/**
 * A build directory is not a finished build — see podcast-series for the
 * account — and a finished build is not necessarily this source (see
 * principle-failures): the built checks wait for a hub at least as new as
 * the page that renders it.
 */
const DETAIL = path.join(process.cwd(), "src", "components", "AtomDetail.tsx");
const built =
  fs.existsSync(APP) &&
  fs.existsSync(path.join(APP, "index.html")) &&
  fs.existsSync(HUB) &&
  fs.statSync(HUB).mtimeMs >= Math.max(fs.statSync(HUB_PAGE).mtimeMs, fs.statSync(DETAIL).mtimeMs);

/**
 * The remedy map, drawn.
 *
 * 37 `contrasts` edges run from exercises to antipatterns — every one of the
 * 10 failures has at least one (hesitation 12, internal-computation 5,
 * performing-cleverness 5, steering 4, negation 3, blocking 2,
 * overcomplication 2, wimping 2, bulldozing 1, judgment 1) — and until
 * 2026-09-22 every one rendered as "Compare", the symmetric word, merged on
 * the failure's page with the principles and definitions it merely differs
 * from, while the diagnosis hub told the reader to name the failure and
 * named nothing to do about it (tracker entry 286). The edges are now the
 * counter case: "Drills that counter this" on the failure's page, first;
 * "Counters" on the drill's page, ahead of "Compare"; "Counter it with" on
 * the hub, capped at 3. These hold the split to the corpus — the edges
 * that land in the new group are real, the group is exactly the
 * exercise-to-antipattern edges and no concept-to-concept contrast — and
 * the surfaces to the split.
 */
describe("counter drills", () => {
  it("pairs every antipattern with the drills that contrast it, from either end", async () => {
    const atoms = await loadAtoms();
    const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
    const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
    // Guard the guard: 10 antipatterns and 27 exercises on 2026-09-22.
    expect(antipatterns.length).toBeGreaterThanOrEqual(10);
    expect(exercises.length).toBeGreaterThanOrEqual(25);

    const map = counterDrills(atoms);
    const rank = ageNormalisedRank(atoms);
    const newest = newestCohort(atoms);
    const { trains, withLine: lined } = buildTrainsIndex(atoms);
    const withLine = new Set(lined);
    // failure → the principles it is paired with (entry 155's map, read
    // from the failure's side), for the purpose check below.
    const pairedPrinciples = new Map<string, Set<string>>();
    for (const [principleId, failures] of principleFailures(atoms)) {
      for (const f of failures) {
        pairedPrinciples.set(f.id, (pairedPrinciples.get(f.id) ?? new Set()).add(principleId));
      }
    }
    const principlesOf = (id: string) => pairedPrinciples.get(id) ?? new Set<string>();
    // Every antipattern has an entry, so the hub can look each up without
    // a fallback, and every one has at least one drill.
    for (const a of antipatterns) {
      expect(map.has(a.frontmatter.id), a.frontmatter.id).toBe(true);
      expect(map.get(a.frontmatter.id)!.length, a.frontmatter.id).toBeGreaterThanOrEqual(1);
    }
    // 38 pairs on 2026-09-22: the 37 the drills declare and the one an
    // antipattern declares itself (blocking → one-word-scene). Floor one
    // under the drills' count; the ceiling is the pairs the graph can hold.
    const pairs = [...map.values()].reduce((n, d) => n + d.length, 0);
    expect(pairs).toBeGreaterThanOrEqual(35);
    expect(pairs).toBeLessThanOrEqual(antipatterns.length * exercises.length);

    // Every pair is a real edge, in one direction or the other, and every
    // drill is an exercise with the url its page is published at.
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    for (const [antipatternId, drills] of map) {
      for (const d of drills) {
        const drill = byId.get(d.id);
        expect(drill?.type, d.id).toBe("exercise");
        const declared =
          (drill!.links ?? []).some((l) => l.id === antipatternId && l.relation === "contrasts") ||
          (byId.get(antipatternId)!.links ?? []).some(
            (l) => l.id === d.id && l.relation === "contrasts",
          );
        expect(declared, `${d.id} ↔ ${antipatternId}`).toBe(true);
        expect(d.url).toBe(getAtomUrl({ id: d.id, type: "exercise" }));
      }
      // Ordered by purpose first — a drill whose Trains line names the
      // failure or one of its principles, then any drill with a Trains
      // line, then the rest — and within a tier by how much the graph
      // leans on the drill for its age (in-degree per month since it was
      // first published) descending, then title. Raw in-degree until
      // 2026-09-22 (entry 307), the rank alone until that evening (entry
      // 322); the one exception to the order is the slot the cap reserves
      // for the newest cohort, which may seat a lower-ranked drill 3rd.
      // Nothing past the cap moves.
      for (let i = 1; i < drills.length; i += 1) {
        const prev = drills[i - 1];
        const cur = drills[i];
        const inOrder =
          TIER[prev.purpose] > TIER[cur.purpose] ||
          (TIER[prev.purpose] === TIER[cur.purpose] &&
            (prev.rank > cur.rank ||
              (prev.rank === cur.rank && prev.title.localeCompare(cur.title) <= 0)));
        // The reserved seat: the one it displaced sits just after it, and
        // that is the only pair the order may invert.
        const seated = i === COUNTER_DRILLS_CAP;
        expect(inOrder || seated, `${antipatternId}: ${prev.id} before ${cur.id}`).toBe(true);
        expect(prev.rank).toBe(rank.get(prev.id) ?? 0);
      }
      // The purpose is the drill's own line, read against this failure: a
      // `pair` names the failure or one of its principles, a `line` has a
      // Trains line naming neither, `none` has no line at all.
      for (const d of drills) {
        const named = trains.get(d.id) ?? [];
        const forThis = named.some(
          (id) => id === antipatternId || principlesOf(antipatternId).has(id),
        );
        const expected = !withLine.has(d.id) ? "none" : forThis ? "pair" : "line";
        expect(d.purpose, `${antipatternId}: ${d.id}`).toBe(expected);
      }
    }
    // The reservation is a no-op today: an August drill sits in the first
    // 3 of every line that has one, by purpose or by rank, so no line's
    // first 3 differ from a plain sort. Recorded as a reading, not a floor
    // — the day a batch lands whose drills say nothing a failure's
    // principles name, this count rises and the slot is what keeps the
    // newest cohort on the hub.
    let reservedMoves = 0;
    for (const [, drills] of map) {
      const plain = [...drills]
        .sort((a, b) => TIER[b.purpose] - TIER[a.purpose] || byRank(rank)(a, b))
        .slice(0, COUNTER_DRILLS_CAP);
      if (
        plain.map((d) => d.id).join() !==
        drills
          .slice(0, COUNTER_DRILLS_CAP)
          .map((d) => d.id)
          .join()
      ) {
        reservedMoves += 1;
      }
    }
    expect(reservedMoves).toBe(0);
    // The entry's headline case, and the one the hub's cap bites on.
    const hesitation = drillsCountering("hesitation", atoms);
    expect(hesitation.length).toBeGreaterThanOrEqual(10);
    expect(hesitation.map((d) => d.id)).toContain("first-line-drill");
    expect(hesitation.slice(0, COUNTER_DRILLS_CAP).length).toBe(COUNTER_DRILLS_CAP);
    expect(COUNTER_DRILLS_CAP).toBe(3);
    expect(drillsCountering("not-an-atom", atoms)).toEqual([]);
    // Hesitation's 3 on 2026-09-22, purpose first: zip-zap-zop ("Be
    // Present — attention that can be redirected"), first-line-drill ("Be
    // Brave — the threshold moment of starting"), last-word-response ("Be
    // Present — forcing attention onto the immediate moment"). Under the
    // rank alone that morning they were pass-the-clap ("shared timing"),
    // zip-zap-zop and bippity-bippity-bop (no line); under raw in-degree
    // first-line-drill, blind-offer, one-word-scene. The first 3 are all
    // written for the failure, and one is August: the rank still lifts
    // the newest cohort where its drills say what they are for.
    const hesitationTop = hesitation.slice(0, COUNTER_DRILLS_CAP);
    expect(hesitationTop.map((d) => d.id)).toEqual([
      "zip-zap-zop",
      "first-line-drill",
      "last-word-response",
    ]);
    for (const d of hesitationTop) expect(d.purpose, d.id).toBe("pair");
    expect(hesitationTop.filter((d) => newest.has(d.id)).length).toBeGreaterThanOrEqual(1);
    expect(hesitation.find((d) => d.id === "bippity-bippity-bop")?.purpose).toBe("none");
  });

  /**
   * Entry 322's test: the first counter on every line is a drill that
   * says what it is for, wherever the line has one to name. On 2026-09-22
   * every one of the 10 lines has a candidate with a Trains line and 6
   * have a candidate whose line names the failure or one of its principles
   * (a `pair`; blocking, overcomplication, steering and wimping have
   * none). Under the rank alone, that morning, 1 line opened with a drill
   * that had no line (wimping: yes-lets), 3 opened with a `pair`
   * (bulldozing, internal-computation, judgment) and 6 with a line naming
   * neither the failure nor a principle of it. Purpose first, all 10 open
   * with a drill that has a line and all 6 that have a `pair` open with
   * one.
   *
   * The first counter changed on 6 of the 10 lines between the morning's
   * rank-only order and this one: 4 by purpose (hesitation pass-the-clap →
   * zip-zap-zop; negation blind-offer → yes-and-chain;
   * performing-cleverness one-word-story → emotional-honesty-scene;
   * wimping yes-lets → yes-and-chain) and 2 more by the rank's 3-month age
   * floor within a tier (blocking questions-only → one-word-scene;
   * overcomplication what-are-you-doing → one-word-scene). The 4 that
   * kept their first — bulldozing, internal-computation, judgment,
   * steering — already opened with the best-purposed drill.
   */
  it("opens every line with a drill that says what it is for, where one exists", async () => {
    const atoms = await loadAtoms();
    const map = counterDrills(atoms);
    const { withLine } = buildTrainsIndex(atoms);
    const hasLine = new Set(withLine);
    let linesWithCandidate = 0;
    let openedByPair = 0;
    let linesWithPair = 0;
    for (const [antipatternId, drills] of map) {
      const first = drills[0];
      if (drills.some((d) => hasLine.has(d.id))) {
        linesWithCandidate += 1;
        expect(hasLine.has(first.id), `${antipatternId} opens with ${first.id}`).toBe(true);
        expect(first.purpose, antipatternId).not.toBe("none");
      }
      if (drills.some((d) => d.purpose === "pair")) {
        linesWithPair += 1;
        expect(first.purpose, `${antipatternId} opens with ${first.id}`).toBe("pair");
        openedByPair += 1;
      }
    }
    // Guard the guard: 10 lines with a candidate and 6 with a `pair` on
    // 2026-09-22; the floors are 1 under.
    expect(linesWithCandidate).toBeGreaterThanOrEqual(9);
    expect(linesWithPair).toBeGreaterThanOrEqual(5);
    expect(openedByPair).toBe(linesWithPair);
    // The morning's rank-only first drills, 2026-09-22, and how many the
    // purpose-first order changed: 6 of 10. A reading, so the next batch's
    // drills can move it; the population is the floor.
    const rankOnly: Record<string, string> = {
      blocking: "questions-only",
      bulldozing: "blind-offer",
      hesitation: "pass-the-clap",
      "internal-computation": "zip-zap-zop",
      judgment: "gift-giving",
      negation: "blind-offer",
      overcomplication: "what-are-you-doing",
      "performing-cleverness": "one-word-story",
      steering: "one-word-story",
      wimping: "yes-lets",
    };
    let changed = 0;
    for (const [antipatternId, first] of Object.entries(rankOnly)) {
      const now = map.get(antipatternId)?.[0]?.id;
      expect(now, antipatternId).toBeDefined();
      if (now !== first) changed += 1;
    }
    expect(Object.keys(rankOnly).length).toBe(10);
    expect(changed).toBeGreaterThanOrEqual(4);
    expect(map.get("negation")![0].id).toBe("yes-and-chain");
    expect(map.get("performing-cleverness")![0].id).toBe("emotional-honesty-scene");
  });

  it("puts the exercise-to-antipattern edges in their own group on antipattern pages, first, and nothing else in it", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const resolved = (id: string): OutgoingLink[] =>
      (byId.get(id)!.links ?? []).map((l) => {
        const t = byId.get(l.id);
        return {
          id: l.id,
          relation: l.relation,
          title: t?.title ?? l.id,
          url: t ? getAtomUrl({ id: l.id, type: t.type }) : `/how-it-works/${l.id}`,
          type: t?.type,
        };
      });

    let landed = 0;
    const withGroup: string[] = [];
    for (const a of atoms) {
      const fm = a.frontmatter;
      const inbound = await getInboundLinks(fm.id);
      const groups = inboundGroupsFor(inbound, resolved(fm.id), new Set(), fm.type);
      const counters = groups.find((g) => g.key === "counters");
      if (fm.type !== "antipattern") {
        // The counter case is decided by both types: an exercise's contrasts
        // onto a principle or a definition stays "Compare".
        expect(counters, fm.id).toBeUndefined();
        expect(
          groups.some((g) => g.label === COUNTERS_LABEL),
          fm.id,
        ).toBe(false);
        continue;
      }
      expect(counters, fm.id).toBeDefined();
      expect(groups[0].key, fm.id).toBe("counters");
      expect(counters!.label).toBe(COUNTERS_LABEL);
      withGroup.push(fm.id);
      // Every member is an exercise, and the inbound ones are the drills'
      // own edges; no concept-to-concept contrast lands here.
      for (const l of counters!.links) expect(byId.get(l.id)?.type, l.id).toBe("exercise");
      const fromDrills = inbound.filter((l) => l.relation === "contrasts" && l.type === "exercise");
      for (const l of fromDrills) {
        expect(
          counters!.links.map((m) => m.id),
          `${l.id} → ${fm.id}`,
        ).toContain(l.id);
      }
      landed += fromDrills.length;
      // And the merged Compare group no longer holds them.
      const compare = mergeSymmetricInbound(resolved(fm.id), inbound, fm.type).filter(
        (l) => l.relation === "contrasts",
      );
      for (const l of compare) {
        expect(byId.get(l.id)?.type, `${fm.id}: ${l.id}`).not.toBe("exercise");
      }
      // The remaining inbound contrasts group, if any, holds no drill either.
      const rest = groups.find((g) => g.key === "contrasts");
      for (const l of rest?.links ?? []) expect(byId.get(l.id)?.type).not.toBe("exercise");
    }
    // 10 of 10 antipatterns, 37 edges, on 2026-09-22. Floors one under.
    expect(withGroup.length).toBeGreaterThanOrEqual(10);
    expect(landed).toBeGreaterThanOrEqual(35);
    // Without the page type nothing splits: the old rule, which the
    // sidebar-open-share reconstruction still reads.
    const bare = inboundGroupsFor(await getInboundLinks("hesitation"), resolved("hesitation"));
    expect(bare.find((g) => g.key === "counters")).toBeUndefined();
  });

  it("labels a drill's contrasts toward a failure Counters, ahead of Compare, on the drill's page only", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const drill = byId.get("first-line-drill")!;
    const links: OutgoingLink[] = (drill.links ?? []).map((l) => {
      const t = byId.get(l.id)!;
      return {
        id: l.id,
        relation: l.relation,
        title: t.title,
        url: getAtomUrl({ id: l.id, type: t.type }),
        type: t.type,
      };
    });
    const groups = outboundGroupsFor("exercise", links);
    const counters = groups.find((g) => g.key === "counters");
    expect(counters).toBeDefined();
    expect(counters!.label).toBe(COUNTERS_OUTBOUND_LABEL);
    expect(counters!.links.map((l) => l.key)).toContain("hesitation");
    for (const l of counters!.links) expect(byId.get(l.key)?.type).toBe("antipattern");
    const compare = groups.find((g) => g.key === "contrasts");
    if (compare) {
      expect(groups.indexOf(counters!)).toBeLessThan(groups.indexOf(compare));
      for (const l of compare.links) expect(byId.get(l.key)?.type).not.toBe("antipattern");
    }
    // The same links on any other page type are one Compare group.
    const asConcept = outboundGroupsFor("technique", links);
    expect(asConcept.find((g) => g.key === "counters")).toBeUndefined();
    expect(asConcept.find((g) => g.key === "contrasts")?.label).toBe(
      RELATION_LABELS.contrasts.outbound,
    );
  });

  it.runIf(built)("renders the group on hesitation's page and the line on the hub", async () => {
    const page = path.join(APP, "how-it-works", "diagnosis", "hesitation.html");
    expect(fs.existsSync(page)).toBe(true);
    const html = fs.readFileSync(page, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const start = html.indexOf('data-track="concept-sidebar"');
    expect(start).toBeGreaterThan(0);
    const sidebar = html.slice(start, html.indexOf("</aside>", start));
    const at = sidebar.indexOf(COUNTERS_LABEL);
    expect(at).toBeGreaterThan(0);
    // The group's links: from its term to the end of its definition, which
    // includes SidebarLinkGroup's own "N more" fold — the links past the
    // fifth are in the DOM, folded, and count.
    const rest = sidebar.slice(at);
    const end = rest.indexOf("</dd>");
    expect(end).toBeGreaterThan(0);
    const group = rest.slice(0, end);
    const links = [...group.matchAll(/href="(\/practice\/exercises\/[^"?#]+)"/g)].map((m) => m[1]);
    // 12 drills counter hesitation on 2026-09-22, the group's cap exactly.
    expect(new Set(links).size).toBeGreaterThanOrEqual(10);
    // First in the block: before Compare.
    expect(at).toBeLessThan(sidebar.indexOf(`>${RELATION_LABELS.contrasts.outbound}<`));

    const hub = fs.readFileSync(HUB, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
    const lines = hub.match(/Counter it with:/g) ?? [];
    // One per antipattern: 10 on 2026-09-22.
    expect(lines.length).toBeGreaterThanOrEqual(10);
    const atoms = await loadAtoms();
    expect(lines.length).toBeLessThanOrEqual(
      atoms.filter((a) => a.frontmatter.type === "antipattern").length,
    );
    // The lines link the drills, capped: hesitation's names 3, not
    // 12. The card's title link comes first in the card and the line is
    // the next one after it inside the antipattern list.
    const list = hub.indexOf('data-track="antipattern-list"');
    const cardAt = hub.indexOf('href="/how-it-works/diagnosis/hesitation"', list);
    expect(cardAt).toBeGreaterThan(list);
    const lineAt = hub.indexOf("Counter it with:", cardAt);
    const line = hub.slice(lineAt, hub.indexOf("</p>", lineAt));
    const named = [...line.matchAll(/href="\/practice\/exercises\/[^"]+"/g)];
    expect(named.length).toBe(COUNTER_DRILLS_CAP);
  });
});
