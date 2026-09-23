import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges } from "../content";
import {
  bodyLinkedSlugs,
  CURATED_RELATED,
  FAIR_SHARE_SLOTS_PER_RAIL,
  getRelatedBridges,
  RELATED_GUIDE_LIMIT_WIDE,
  SHARED_DRILLS_SHOWN,
  STRONG_SIBLING_ATOMS,
  STRONG_SIBLING_DRILLS,
} from "../related-bridges";

type Bridge = Awaited<ReturnType<typeof loadBridges>>[number];

/**
 * Guide slug → the atom ids its rendered body links, and the exercise ids
 * among them. Read here from `bridge.html` independently of the module, the
 * way tracker entry 325's check reads it, so a module that stopped reading
 * the body would disagree with the page rather than with itself.
 */
async function renderedLinks(bridges: Bridge[]) {
  const atoms = await loadAtoms();
  const byUrl = new Map(
    atoms.map((a) => [getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }), a]),
  );
  const concepts = new Map<string, Set<string>>();
  const drills = new Map<string, Set<string>>();
  for (const bridge of bridges) {
    const ids = new Set<string>();
    const exercises = new Set<string>();
    for (const match of bridge.html.matchAll(/href="(\/[^"?#]*)"/g)) {
      const url = match[1].length > 1 ? match[1].replace(/\/$/, "") : match[1];
      const atom = byUrl.get(url);
      if (!atom) continue;
      ids.add(atom.frontmatter.id);
      if (atom.frontmatter.type === "exercise") exercises.add(atom.frontmatter.id);
    }
    concepts.set(bridge.slug, ids);
    drills.set(bridge.slug, exercises);
  }
  return { concepts, drills };
}

function shared(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const id of a) if (b.has(id)) count += 1;
  return count;
}

describe("related bridges", () => {
  it("gives every bridge page outbound links to sibling guides", async () => {
    const bridges = await loadBridges();
    const thin: string[] = [];

    for (const bridge of bridges) {
      const related = await getRelatedBridges(bridge.slug);
      if (related.length < 3) thin.push(`${bridge.slug} (${related.length})`);
    }

    expect(thin).toEqual([]);
  });

  it("never links a guide to itself and never repeats a link", async () => {
    const bridges = await loadBridges();

    for (const bridge of bridges) {
      const slugs = (await getRelatedBridges(bridge.slug)).map((g) => g.slug);
      expect(slugs).not.toContain(bridge.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
      expect(slugs.length).toBeLessThanOrEqual(RELATED_GUIDE_LIMIT_WIDE); // six where siblings are strong (entry 244)
    }
  });

  it("resolves to real bridge slugs with titles and descriptions", async () => {
    const bridges = await loadBridges();
    const known = new Set(bridges.map((b) => b.slug));

    const related = await getRelatedBridges("how-to-stop-overthinking");
    expect(related.length).toBeGreaterThan(0);
    for (const guide of related) {
      expect(known.has(guide.slug)).toBe(true);
      expect(guide.title.length).toBeGreaterThan(0);
      expect(guide.description.length).toBeGreaterThan(0);
    }
  });

  it("puts curated pairings first, for every guide that has them", async () => {
    // Asserts the behaviour rather than a snapshot of the editorial choices,
    // which change as pages are added and retargeted.
    for (const [slug, curated] of Object.entries(CURATED_RELATED)) {
      const related = (await getRelatedBridges(slug)).map((g) => g.slug);
      const expected = curated.filter((c) => related.includes(c));
      expect(related.slice(0, expected.length), slug).toEqual(expected);
    }
  });

  it("does not lead a guide toward pages that cannot rank", async () => {
    // Relevance stays primary, so a curated stranded pairing is allowed; what
    // is not is a related list made mostly of unreachable terms.
    const bridges = await loadBridges();
    const kd = new Map(
      bridges.map((b) => [b.slug, (b.frontmatter.target_keywords ?? [])[0]?.difficulty]),
    );

    for (const bridge of bridges) {
      const related = await getRelatedBridges(bridge.slug);
      const stranded = related.filter((g) => (kd.get(g.slug) ?? 0) > 30);
      expect(stranded.length, `${bridge.slug} leads with too many stranded guides`).toBeLessThan(
        Math.max(2, related.length),
      );
    }
  });

  /**
   * The widget adds pages; it does not repeat the body.
   *
   * Guides relate to guides three ways — hand links in prose, this widget,
   * and the curated map — and none read the others. Measured on 2026-09-21,
   * 34% of the widget's 312 slots pointed at a guide the body had already
   * linked, and on four guides every slot did. The reader reaches the foot
   * of the page and is offered what they just passed.
   *
   * Asserted on every guide with a hand link, and the population is checked
   * so a link pattern that stopped matching would fail rather than pass on
   * an empty set.
   */
  it("never offers a guide the body already links", async () => {
    const bridges = await loadBridges();
    const known = new Set(bridges.map((b) => b.slug));
    const repeated: string[] = [];
    let guidesWithBodyLinks = 0;
    let slots = 0;

    for (const bridge of bridges) {
      const inBody = new Set([...bodyLinkedSlugs(bridge.content)].filter((s) => known.has(s)));
      if (inBody.size > 0) guidesWithBodyLinks += 1;
      for (const guide of await getRelatedBridges(bridge.slug)) {
        slots += 1;
        if (inBody.has(guide.slug)) repeated.push(`${bridge.slug} -> ${guide.slug}`);
      }
    }

    // 71 guides carried a hand link to another guide when this was written.
    expect(guidesWithBodyLinks).toBeGreaterThanOrEqual(60);
    expect(slots).toBeGreaterThanOrEqual(250);
    expect(repeated).toEqual([]);
  });

  it("reads root-relative links out of markdown, and only those", () => {
    const md = [
      "See [small talk](/how-to-make-small-talk) and [the same](/how-to-make-small-talk#why).",
      "A [path](/paths/a-path), a [drill](/practice/exercises/x), and [external](https://x.com/y).",
      'A [titled](/networking-tips "Networking") link and a [query](/deep-questions-to-ask?ref=1).',
    ].join("\n");
    expect([...bodyLinkedSlugs(md)].sort()).toEqual([
      "deep-questions-to-ask",
      "how-to-make-small-talk",
      "networking-tips",
      "paths",
      "practice",
    ]);
  });

  it("returns nothing for an unknown slug", async () => {
    expect(await getRelatedBridges("not-a-real-guide")).toEqual([]);
  });
});

describe("wide widget for strong siblings", () => {
  /**
   * Guides sharing three or more entry atoms are hand-linked a quarter of the
   * time, so the widget is the only connection for most such pairs (tracker
   * entry 244, 2026-09-21). A guide with more than four strong siblings shows
   * six related guides instead of four.
   */
  it("shows six related guides where more than four siblings share three atoms", async () => {
    const { loadBridges } = await import("../content");
    const { getRelatedBridges, RELATED_GUIDE_LIMIT, RELATED_GUIDE_LIMIT_WIDE } =
      await import("../related-bridges");
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    let wide = 0;
    let narrow = 0;
    for (const b of bridges) {
      const self = new Set(b.frontmatter.entry_atoms ?? []);
      const strong = bridges.filter(
        (o) =>
          o.slug !== b.slug &&
          (o.frontmatter.entry_atoms ?? []).filter((a) => self.has(a)).length >= 3,
      ).length;
      const related = await getRelatedBridges(b.slug);
      if (strong > RELATED_GUIDE_LIMIT) {
        wide += 1;
        expect(related.length, b.slug).toBeGreaterThan(RELATED_GUIDE_LIMIT);
        expect(related.length).toBeLessThanOrEqual(RELATED_GUIDE_LIMIT_WIDE);
      } else {
        narrow += 1;
        expect(related.length, b.slug).toBeLessThanOrEqual(RELATED_GUIDE_LIMIT);
      }
    }
    // Both branches exist in the corpus.
    expect(wide).toBeGreaterThanOrEqual(10);
    expect(narrow).toBeGreaterThanOrEqual(20);
  });
});

describe("cluster before score", () => {
  /**
   * Guides whose first rail item sits in their own cluster. 54 of 78 when the
   * tiers landed (floor 50); 49 on 2026-09-22 after the drill door (tracker
   * entry 325), the 5 being active-listening-exercises, confidence-building-
   * exercises, improv-games-for-kids and theatre-games, which now open on the
   * guide that walks through their drills and is filed elsewhere, and
   * how-to-be-witty, whose 3-atom sibling how-to-get-better-at-improv gained
   * 6 points from 3 shared drills. Set just under the achieved number: a
   * cluster sort that stopped working would fall well below it.
   */
  const FIRST_IN_CLUSTER = 48;

  /**
   * The hub's cluster rail and this widget were two answers to "what is this
   * next to": the rail lists the guide's cluster, the widget ranked by shared
   * atoms alone, and the clusters only half follow the atoms — Improv Skills'
   * guides share 0.72 atoms inside against 0.65 outside (tracker entry 290,
   * 2026-09-22), so on its pages the first neighbour was usually outside the
   * cluster. Now the computed slots run strong siblings (three or more shared
   * atoms, wherever filed), then the rest of the same cluster, then everyone
   * else, each tier in score order with the cluster breaking ties; curated
   * pairings keep precedence and the body-link exclusion still applies.
   * Strong siblings are their own tier because putting the cluster above
   * them disconnected 73 of the 277 strong pairs, and putting it above the
   * score inside the tier evicted the five-atom pairs (see the module
   * comment). When this landed the first item changed on 7 of 78 guides, and
   * 54 guides' first item sits in their own cluster against 49 before; the
   * rest open on a curated pairing or a strong sibling filed elsewhere.
   */
  it("lists same-cluster guides before the rest, below the strong siblings", async () => {
    const { clusterMap, sharedEntryAtoms } = await import("../cluster-cohesion");
    const { GUIDE_CATEGORIES } = await import("../guide-categories");
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const bySlug = new Map(bridges.map((b) => [b.slug, b]));
    // Since 2026-09-22 (tracker entry 325) a pair sharing STRONG_SIBLING_DRILLS
    // rendered drill links is a strong sibling too, wherever filed; the tier
    // read here has to say so or theatre-games, filed elsewhere and sharing 8
    // drills with 2-person-improv-games, reads as a tier-2 guide leading.
    const { drills } = await renderedLinks(bridges);
    const placed = clusterMap(GUIDE_CATEGORIES);
    let firstInCluster = 0;
    let computedSlots = 0;
    let tiersSeen = 0;
    for (const bridge of bridges) {
      const own = placed.get(bridge.slug);
      expect(own, bridge.slug).toBeDefined();
      const related = (await getRelatedBridges(bridge.slug)).map((g) => g.slug);
      if (placed.get(related[0]) === own) firstInCluster += 1;
      const curated = new Set(CURATED_RELATED[bridge.slug] ?? []);
      const computed = related.filter((s) => !curated.has(s));
      computedSlots += computed.length;
      // Tier 0: strong sibling; 1: same cluster; 2: elsewhere. Never rises.
      const tiers = computed.map((s) => {
        if (sharedEntryAtoms(bridge, bySlug.get(s)!) >= STRONG_SIBLING_ATOMS) return 0;
        if (shared(drills.get(bridge.slug)!, drills.get(s)!) >= STRONG_SIBLING_DRILLS) return 0;
        return placed.get(s) === own ? 1 : 2;
      });
      tiersSeen += new Set(tiers).size;
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i], `${bridge.slug}: ${computed}`).toBeGreaterThanOrEqual(tiers[i - 1]);
      }
    }
    expect(computedSlots).toBeGreaterThanOrEqual(200);
    // Guard the guard: the lists actually mix tiers, or the order is vacuous.
    expect(tiersSeen).toBeGreaterThan(bridges.length);
    // 54 of 78 on 2026-09-22, 49 before the tiers; the remainder open with a
    // curated pairing or a strong sibling filed elsewhere, which since the
    // drill door includes the guide sharing a page's drills (FIRST_IN_CLUSTER).
    expect(firstInCluster).toBeGreaterThanOrEqual(FIRST_IN_CLUSTER);
  });

  it("keeps the strongest split pairs on the page", async () => {
    // how-to-have-difficult-conversations shares five atoms with
    // how-to-stop-people-pleasing and with rules-of-improv, both across a
    // cluster line, and has fourteen strong siblings for six slots. Both
    // 5-atom pairs stay on the page and 1 of them leads; a version that
    // ranked the cluster inside the strong tier dropped both behind six
    // same-cluster fours. Until 2026-09-22 the 5-atom pairs were slots 1 and
    // 2; the drill term (tracker entry 325) puts how-to-keep-a-conversation-
    // going, 4 atoms and the path and 2 shared drills at 18 points, above
    // rules-of-improv, 5 atoms and nothing else at 15, so rules-of-improv
    // now sits in slot 6.
    const related = (await getRelatedBridges("how-to-have-difficult-conversations")).map(
      (g) => g.slug,
    );
    expect(["how-to-stop-people-pleasing", "rules-of-improv"]).toContain(related[0]);
    expect(related).toContain("how-to-stop-people-pleasing");
    expect(related).toContain("rules-of-improv");
  });
});

/**
 * The rail scored on what 2 guides declare and the bodies agreed on
 * something else. Per guide, the concept links its rendered body carries
 * (median 10; `entry_atoms` median 6) ranked the other guides differently
 * from the rail: on 34 of 78 the guide sharing the most linked concepts was
 * off the rail, on 23 of those every slot shared fewer, and the concepts
 * those pairs shared were drills, 83 of 148, because a guide never declares
 * the exercises it walks through (tracker entry 325, 2026-09-22). The rail
 * now reads the drills from the body. These are the entry's own checks.
 */
describe("shared drills on the rail", () => {
  /**
   * Guides whose top link-sharing guide (guides the body links excluded) is
   * not on the rail: 34 before the drill term, 23 after (2026-09-22). The
   * remainder are pairs that share definitions and techniques, not drills —
   * people-skills and active-listening share 6 concepts and 0 exercises —
   * and are for another entry. May only fall.
   */
  const LINK_SHARER_MISSES_CEILING = 23;
  /** Of those, the guides where every rail slot shares fewer: 23 before, 14 after. */
  const EVERY_SLOT_WORSE_CEILING = 14;

  it("puts the guide sharing the most linked concepts on the rail, or nearly", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const { concepts } = await renderedLinks(bridges);
    let slots = 0;
    let misses = 0;
    let everySlotWorse = 0;
    for (const bridge of bridges) {
      const rail = (await getRelatedBridges(bridge.slug)).map((g) => g.slug);
      slots += rail.length;
      const inBody = bodyLinkedSlugs(bridge.content);
      const own = concepts.get(bridge.slug)!;
      const ranked = bridges
        .filter((b) => b.slug !== bridge.slug && !inBody.has(b.slug))
        .map((b) => ({ slug: b.slug, shared: shared(own, concepts.get(b.slug)!) }))
        .sort((a, b) => b.shared - a.shared || a.slug.localeCompare(b.slug));
      const top = ranked[0];
      if (!top || top.shared === 0 || rail.includes(top.slug)) continue;
      misses += 1;
      const railBest = Math.max(
        0,
        ...ranked.filter((r) => rail.includes(r.slug)).map((r) => r.shared),
      );
      if (railBest < top.shared) everySlotWorse += 1;
    }
    expect(slots).toBeGreaterThanOrEqual(400);
    expect(misses).toBeLessThanOrEqual(LINK_SHARER_MISSES_CEILING);
    expect(everySlotWorse).toBeLessThanOrEqual(EVERY_SLOT_WORSE_CEILING);
  });

  /**
   * On a guide organised by drill, the guide that walks through the most of
   * the same drills is on the rail or already linked in the body. Entry 324
   * counted 11 guides with 2 or more sections headed by an exercise; the rule
   * here is a body that links 6 or more exercises, which finds 9 (2-person-
   * improv-games, 5-minute-team-building, active-listening-exercises,
   * confidence-building-exercises, improv-games-for-kids, improv-warm-up-
   * games, team-building-activities, theatre-games, trust-building-
   * exercises). At 5 it would find 11 and 1 would fail: how-to-get-better-
   * at-improv shares 5 drills with 2-person-improv-games and 0 atoms, and its
   * 6 slots go to guides sharing 3 and 4 declared atoms, which is the declared
   * signal leading as intended (2026-09-22).
   */
  const DRILL_GUIDE_MIN_LINKED = 6;

  it("offers a drill-organised guide the guide sharing the most drills", async () => {
    const bridges = await loadBridges();
    const { drills } = await renderedLinks(bridges);
    const failures: string[] = [];
    let drillGuides = 0;
    for (const bridge of bridges) {
      const own = drills.get(bridge.slug)!;
      if (own.size < DRILL_GUIDE_MIN_LINKED) continue;
      drillGuides += 1;
      const rail = (await getRelatedBridges(bridge.slug)).map((g) => g.slug);
      const inBody = bodyLinkedSlugs(bridge.content);
      const best = bridges
        .filter((b) => b.slug !== bridge.slug)
        .map((b) => ({ slug: b.slug, shared: shared(own, drills.get(b.slug)!) }))
        .sort((a, b) => b.shared - a.shared || a.slug.localeCompare(b.slug))[0];
      if (!best || best.shared === 0) continue;
      if (!rail.includes(best.slug) && !inBody.has(best.slug)) {
        failures.push(`${bridge.slug} -> ${best.slug} (${best.shared} drills)`);
      }
    }
    // 9 on 2026-09-22; a rule that found fewer would pass on the wrong set.
    expect(drillGuides).toBeGreaterThanOrEqual(8);
    expect(failures).toEqual([]);
  });

  /**
   * The rail item's count is the page's count, and the "shares N drills"
   * line it drives is a marker, not furniture (tracker entry 323): 46 of 418
   * slots carried it at SHARED_DRILLS_SHOWN on 2026-09-22, on 20 guides.
   * Presence is asserted so a reader that stopped counting fails, and the
   * ceiling so a threshold that let it onto most slots fails too.
   */
  it("counts the drills both pages link and says so on a minority of slots", async () => {
    const bridges = await loadBridges();
    const { drills } = await renderedLinks(bridges);
    let slots = 0;
    let withReason = 0;
    for (const bridge of bridges) {
      const own = drills.get(bridge.slug)!;
      for (const guide of await getRelatedBridges(bridge.slug)) {
        slots += 1;
        expect(guide.sharedDrills, `${bridge.slug} -> ${guide.slug}`).toBe(
          shared(own, drills.get(guide.slug)!),
        );
        if ((guide.sharedDrills ?? 0) >= SHARED_DRILLS_SHOWN) withReason += 1;
      }
    }
    expect(slots).toBeGreaterThanOrEqual(400);
    expect(withReason).toBeGreaterThanOrEqual(30);
    expect(withReason).toBeLessThanOrEqual(Math.floor(slots / 4));
  });
});

/**
 * The rail read as a graph, not as a page.
 *
 * Every other check here asks whether 1 guide's rail is right. Inverted, the
 * layer answered a different question: on 2026-09-22 the 78 guides and 418
 * rail edges were 7 strongly connected components — 1 of 72 and 6 singletons —
 * and 5 guides received no rail link at all: funny-questions-to-ask (traffic
 * potential 17,000), framing-effect, del-close, how-to-read-the-room and
 * improv-theory (tracker entry 336). They were not chosen by the score but by
 * the cap: each offers 4 neighbours, and every guide that scores them already
 * has 4 better sharers. The fair-share pass gives each of them 1 slot on its
 * best scorer.
 *
 * These are graph readings, taken with the whole map in hand, and they are
 * asserted as much to notice a future scoring change as to hold this one: a
 * change that starves a page again, or that closes the clusters further, fails
 * here rather than passing quietly on 78 individually plausible rails.
 */
describe("the rail as a graph", () => {
  /**
   * Rail edges whose 2 guides are filed in the same topic cluster: 244 of 418
   * before the fair-share pass and 243 after, 58% either way (2026-09-22).
   * This is how the blob keeps its shape — a rail that mostly points inside
   * the cluster carries neither reader nor crawler across one — so the number
   * is a ceiling that may only fall. Do not raise it to pass a scoring change.
   */
  const SAME_CLUSTER_CEILING = 243;

  /**
   * The largest strongly connected component. 72 of 78 before the pass, 78
   * after: every guide is now reachable from every other by rails alone. Set
   * just under the achieved number, so the 4 guides whose only inbound link is
   * a fair-share slot cannot all fall out unnoticed.
   */
  const LARGEST_COMPONENT_FLOOR = 74;

  /**
   * The 5 slots the fair-share pass moved on 2026-09-22, host → the guide that
   * took the host's last computed slot. Each host is that guide's highest
   * scorer; each host is distinct, because no rail gives up more than
   * FAIR_SHARE_SLOTS_PER_RAIL; and all 5 hosts are winnable pages, which is
   * why the authority-page orderings in guide-cohorts.test.ts did not move.
   * Recorded as tracker entry 336 asked, so the next scoring change has to say
   * which slots it costs.
   */
  const FAIR_SHARE_SLOTS: Record<string, string> = {
    "active-listening-exercises": "how-to-read-the-room",
    "how-to-be-funny": "del-close",
    "how-to-be-more-articulate": "funny-questions-to-ask",
    "party-games": "improv-theory",
    "questions-to-ask-a-girl": "framing-effect",
  };

  /** What each host's last slot held before the pass; all still linked elsewhere. */
  const FAIR_SHARE_DISPLACED: Record<string, string> = {
    "active-listening-exercises": "questions-to-ask-friends",
    "how-to-be-funny": "how-to-stop-people-pleasing",
    "how-to-be-more-articulate": "how-to-stop-caring-what-people-think",
    "party-games": "questions-to-get-to-know-someone",
    "questions-to-ask-a-girl": "active-listening-exercises",
  };

  /** slug → its rail, for the whole layer, with the inverted map beside it. */
  async function railGraph(bridges: Bridge[]) {
    const out = new Map<string, string[]>();
    for (const bridge of bridges) {
      out.set(
        bridge.slug,
        (await getRelatedBridges(bridge.slug)).map((g) => g.slug),
      );
    }
    const inbound = new Map<string, string[]>(bridges.map((b) => [b.slug, []]));
    for (const [from, tos] of out) for (const to of tos) inbound.get(to)!.push(from);
    return { out, inbound };
  }

  /**
   * Kosaraju, iteratively: 1 pass for finishing order on the rail graph, a
   * second over the reverse graph in that order. Written here rather than
   * imported because the entry's check is the point — a module that computed
   * its own components could agree with itself and not with the pages.
   */
  function components(nodes: string[], out: Map<string, string[]>): string[][] {
    const reverse = new Map<string, string[]>(nodes.map((n) => [n, []]));
    for (const [from, tos] of out) for (const to of tos) reverse.get(to)!.push(from);
    const seen = new Set<string>();
    const finished: string[] = [];
    for (const start of nodes) {
      if (seen.has(start)) continue;
      seen.add(start);
      const stack: [string, number][] = [[start, 0]];
      while (stack.length > 0) {
        const frame = stack[stack.length - 1];
        const next = (out.get(frame[0]) ?? [])[frame[1]++];
        if (next === undefined) {
          finished.push(frame[0]);
          stack.pop();
        } else if (!seen.has(next)) {
          seen.add(next);
          stack.push([next, 0]);
        }
      }
    }
    const assigned = new Set<string>();
    const found: string[][] = [];
    for (let i = finished.length - 1; i >= 0; i--) {
      if (assigned.has(finished[i])) continue;
      const component: string[] = [];
      const stack = [finished[i]];
      assigned.add(finished[i]);
      while (stack.length > 0) {
        const node = stack.pop()!;
        component.push(node);
        for (const from of reverse.get(node) ?? []) {
          if (assigned.has(from)) continue;
          assigned.add(from);
          stack.push(from);
        }
      }
      found.push(component);
    }
    return found.sort((a, b) => b.length - a.length);
  }

  it("leaves no guide with an empty inbound rail list", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const { out, inbound } = await railGraph(bridges);
    const edges = [...out.values()].reduce((n, rail) => n + rail.length, 0);
    // Guard the guard: this is the whole layer, or an empty graph would have
    // no starved guide either. 418 edges on 2026-09-22.
    expect(edges).toBeGreaterThanOrEqual(400);
    // 5 before the fair-share pass: funny-questions-to-ask, framing-effect,
    // del-close, how-to-read-the-room, improv-theory (tracker entry 336).
    expect([...inbound].filter(([, from]) => from.length === 0).map(([slug]) => slug)).toEqual([]);
  });

  it("holds the whole layer in 1 strongly connected component", async () => {
    const bridges = await loadBridges();
    const { out } = await railGraph(bridges);
    const found = components(
      bridges.map((b) => b.slug),
      out,
    );
    // 7 components before the pass — 1 of 72 and 6 singletons, 5 of them the
    // starved guides and how-to-read-body-language, which received links and
    // led back to nobody. 1 of 78 after (2026-09-22).
    expect(found[0].length).toBeGreaterThanOrEqual(LARGEST_COMPONENT_FLOOR);
    expect(found.length).toBeLessThanOrEqual(bridges.length - LARGEST_COMPONENT_FLOOR + 1);
  });

  /**
   * Inbound links per guide: median 5, max 16 (active-listening-exercises and
   * how-to-be-less-awkward), both before and after the pass on 2026-09-22 — 5
   * moved slots cannot shift a median over 78 guides, which is the point: the
   * fair-share pass is cheap. Readings, not rules, so they are asserted with
   * room either side and re-read rather than defended.
   */
  it("spreads inbound rail links about as widely as it did", async () => {
    const bridges = await loadBridges();
    const { inbound } = await railGraph(bridges);
    const counts = [...inbound.values()].map((from) => from.length).sort((a, b) => a - b);
    expect(counts.length).toBe(bridges.length);
    const median = counts[Math.floor(counts.length / 2)];
    expect(median).toBeGreaterThanOrEqual(4);
    expect(median).toBeLessThanOrEqual(6);
    // 1 guide collecting the layer would be the footer's failure again
    // (tracker entry 108): 27 guides took 376 identical links each.
    expect(counts[counts.length - 1]).toBeLessThanOrEqual(20);
    expect(counts[0]).toBeGreaterThan(0);
  });

  it("keeps most rail edges from staying inside 1 topic cluster", async () => {
    const { clusterMap } = await import("../cluster-cohesion");
    const { GUIDE_CATEGORIES } = await import("../guide-categories");
    const bridges = await loadBridges();
    const placed = clusterMap(GUIDE_CATEGORIES);
    const { out } = await railGraph(bridges);
    let edges = 0;
    let sameCluster = 0;
    for (const [from, rail] of out) {
      for (const to of rail) {
        edges += 1;
        if (placed.get(from) === placed.get(to)) sameCluster += 1;
      }
    }
    expect(edges).toBeGreaterThanOrEqual(400);
    // 244 of 418 before the fair-share pass, 243 after (SAME_CLUSTER_CEILING).
    expect(sameCluster).toBeLessThanOrEqual(SAME_CLUSTER_CEILING);
    // Guard the guard: the clusters are read, not all undefined.
    expect(sameCluster).toBeGreaterThan(edges / 4);
  });

  it("gives each starved guide the last slot on its best scorer, and no more", async () => {
    const bridges = await loadBridges();
    const { out, inbound } = await railGraph(bridges);
    expect(FAIR_SHARE_SLOTS_PER_RAIL).toBe(1);
    const taken = new Set(Object.values(FAIR_SHARE_SLOTS));
    for (const [host, guide] of Object.entries(FAIR_SHARE_SLOTS)) {
      const rail = out.get(host);
      expect(rail, host).toBeDefined();
      // The slot is the rail's last, so the pass spends its worst-scoring one.
      expect(rail![rail!.length - 1], host).toBe(guide);
      // And it spends 1: the rest of the rail is what the score chose.
      expect(rail!.filter((s) => taken.has(s)).length, host).toBe(FAIR_SHARE_SLOTS_PER_RAIL);
      // Never a curated entry — those keep their precedence (entry 244).
      expect(CURATED_RELATED[host] ?? [], host).not.toContain(guide);
    }
    // A host per starved guide, each distinct: no rail gives up 2 slots.
    expect(new Set(Object.keys(FAIR_SHARE_SLOTS)).size).toBe(taken.size);
    for (const [host, displaced] of Object.entries(FAIR_SHARE_DISPLACED)) {
      expect(out.get(host), host).not.toContain(displaced);
      // The pass may not create the starvation it removes.
      expect(inbound.get(displaced)!.length, displaced).toBeGreaterThan(0);
    }
  });
});
