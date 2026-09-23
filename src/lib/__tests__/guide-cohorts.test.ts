import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { clusterMap, sharedEntryAtoms } from "../cluster-cohesion";
import { loadBridges } from "../content";
import { GUIDE_CATEGORIES } from "../guide-categories";
import {
  cohortLinkRatios,
  cohortReadings,
  handLinkedGuides,
  isAuthority,
  median,
  medianHandInboundByVerdict,
} from "../guide-cohorts";
import {
  CURATED_RELATED,
  getRelatedBridges,
  STRONG_SIBLING_ATOMS,
  STRONG_SIBLING_DRILLS,
} from "../related-bridges";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The guide layer is two cohorts wearing one template (tracker entry 305,
 * 2026-09-22). The 40 April guides hold 13 of the 18 authority verdicts and
 * target a median 1,300 monthly traffic potential; the 37 August guides hold
 * 4 and target a median 27,000. The hand links already follow the verdict —
 * the August cohort links itself 2.8 times a guide, the April one 1.2, and a
 * winnable guide receives a median 3 hand links against an authority guide's
 * 1 — and until tonight the derived blocks did not. These readings are
 * recorded so the next batch of guides is measured against both cohorts
 * rather than against "the guides", and so a change in the distribution is
 * noticed rather than absorbed.
 */
describe("guide cohorts", () => {
  it("reads the two cohorts out of the created month", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(78);
    const readings = cohortReadings(bridges);
    const april = readings.find((r) => r.cohort === "2026-04");
    const august = readings.find((r) => r.cohort === "2026-08");
    expect(april?.guides).toBeGreaterThanOrEqual(35);
    expect(august?.guides).toBeGreaterThanOrEqual(30);
    // Every guide lands in some cohort, and the cohorts sum to the layer.
    expect(readings.reduce((n, r) => n + r.guides, 0)).toBe(bridges.length);
    for (const r of readings) expect(r.winnable + r.authority + r.unchecked).toBe(r.guides);
  });

  /**
   * A dated reading, not a rule. The verdicts come from Ahrefs and change
   * when somebody reads a results page; this records where they sat on
   * 2026-09-22 so the next reading is a comparison. The 16,000 the tracker
   * gave for August counted its six unchecked guides as 0; the module takes
   * the median over guides that declare a number, which is 27,000 over 31,
   * because an absent Ahrefs figure is an absence and not a zero.
   */
  it("records the verdicts and demand by cohort (2026-09-22: 13 and 4 authority)", async () => {
    const readings = cohortReadings(await loadBridges());
    const april = readings.find((r) => r.cohort === "2026-04")!;
    const august = readings.find((r) => r.cohort === "2026-08")!;
    expect({ guides: april.guides, authority: april.authority, winnable: april.winnable }).toEqual({
      guides: 40,
      authority: 13,
      winnable: 26,
    });
    expect({
      guides: august.guides,
      authority: august.authority,
      winnable: august.winnable,
    }).toEqual({ guides: 37, authority: 4, winnable: 27 });
    expect(april.medianTrafficPotential).toBe(1300);
    expect(april.withTrafficPotential).toBe(39);
    expect(august.medianTrafficPotential).toBe(27000);
    expect(august.withTrafficPotential).toBe(31);
    // The whole site's 18, however the cohorts move.
    expect(readings.reduce((n, r) => n + r.authority, 0)).toBe(18);
  });

  /**
   * Guard the guard: the verdict is the field, not a derivation. The schema
   * is explicit that difficulty and domain rating are evidence for the
   * verdict and not the criterion (two guides at min_dr 36 hold opposite
   * verdicts), so a helper that inferred `authority` from a number would be
   * the mistake the schema was written to prevent. `isAuthority` reads
   * `serp_verdict` and nothing else.
   */
  it("reads the verdict field and derives nothing from the numbers", async () => {
    expect(isAuthority({ serp_verdict: "authority" })).toBe(true);
    expect(isAuthority({ serp_verdict: "winnable" })).toBe(false);
    expect(isAuthority({})).toBe(false);
    // A gated-looking keyword with no verdict is unchecked, not authority.
    expect(
      isAuthority({
        serp_verdict: undefined,
        target_keywords: [{ keyword: "x", difficulty: 90, volume: 100000 }],
      } as Parameters<typeof isAuthority>[0]),
    ).toBe(false);
    // And the corpus agrees with a raw read of the frontmatter.
    const bridges = await loadBridges();
    const raw = bridges.filter((b) =>
      /^serp_verdict: authority$/m.test(
        fs.readFileSync(path.join("content", "bridges", `${b.slug}.md`), "utf-8"),
      ),
    );
    expect(raw.length).toBe(18);
    expect(bridges.filter((b) => isAuthority(b.frontmatter)).map((b) => b.slug)).toEqual(
      raw.map((b) => b.slug),
    );
  });

  /**
   * Hand links per source guide, cohort to cohort, as the tracker read them:
   * April → April 1.2, April → August 1.0, August → August 2.8, August →
   * April 1.5. Reproduced to two decimals as 1.18 / 1.02 / 2.81 / 1.49 over
   * distinct linked guides; counting a sibling linked twice as two reads
   * 1.25 / 1.07 / 3.11 / 1.65, which is not what the tracker had. Floors and
   * ceilings rather than exact values, because a hand link is the thing
   * most likely to be added tomorrow; the shape — August links itself more
   * than twice as often as April does — is the reading.
   */
  it("records the cohort link ratios (2026-09-22: 1.2 / 1.0 / 2.8 / 1.5)", async () => {
    const bridges = await loadBridges();
    const ratios = cohortLinkRatios(bridges);
    const at = (from: string, to: string) => ratios.find((r) => r.from === from && r.to === to)!;
    const aa = at("2026-04", "2026-04");
    const ab = at("2026-04", "2026-08");
    const bb = at("2026-08", "2026-08");
    const ba = at("2026-08", "2026-04");
    expect(aa.sources).toBe(40);
    expect(bb.sources).toBe(37);
    // Read 47 / 41 / 104 / 55 distinct links on 2026-09-22.
    expect(aa.links).toBeGreaterThanOrEqual(45);
    expect(ab.links).toBeGreaterThanOrEqual(39);
    expect(bb.links).toBeGreaterThanOrEqual(100);
    expect(ba.links).toBeGreaterThanOrEqual(53);
    expect(aa.perSource).toBeGreaterThanOrEqual(1.1);
    expect(aa.perSource).toBeLessThan(1.5);
    expect(bb.perSource).toBeGreaterThanOrEqual(2.7);
    expect(bb.perSource).toBeLessThan(3.2);
    expect(bb.perSource).toBeGreaterThan(2 * aa.perSource);
    // Inbound by verdict: winnable 3, authority 1 (the tracker's 4 counted
    // repeats). The gap is the reading.
    const inbound = medianHandInboundByVerdict(bridges);
    expect(inbound.winnable).toBe(3);
    expect(inbound.authority).toBe(1);
  });

  it("reads hand links the way related-bridges does, each guide once", () => {
    const slugs = new Set(["a-guide", "b-guide", "self"]);
    const bridge = {
      slug: "self",
      content: [
        "See [a](/a-guide) and [a again](/a-guide#part), then [b](/b-guide).",
        "Not [me](/self), not a [path](/paths/x), not [external](https://x.com/a-guide).",
      ].join("\n"),
      frontmatter: { created: "2026-04-01", target_keywords: [] },
    };
    expect(handLinkedGuides(bridge, slugs).sort()).toEqual(["a-guide", "b-guide"]);
  });

  it("takes a median", () => {
    expect(median([])).toBeUndefined();
    expect(median([5])).toBe(5);
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

/**
 * The related rail on an authority guide hands the reader on to a sibling
 * that can rank. Within each of the rail's tiers the winnable candidates come
 * before the gated ones; the tiers, the score, the body-link exclusion and
 * the curated map are as they were, so the curated slots are exempt here, as
 * they are in the module, for the reason recorded there. A winnable page is
 * not touched.
 *
 * Re-read on 2026-09-22 after the fair-share pass (tracker entry 336), which
 * gives a guide with no inbound rail link the last computed slot on its best
 * scorer: every reading below is unchanged, because all 5 slots it moved are
 * on winnable pages (active-listening-exercises, how-to-be-funny,
 * how-to-be-more-articulate, party-games, questions-to-ask-a-girl), where the
 * verdict does not order the rail. The pass does not read the host's verdict,
 * so a future starved guide landing on an authority page could put a gated
 * guide last in a tier that opened winnable; the fix then is to exempt the
 * fair-share slot here, not to drop the rule. related-bridges.test.ts holds
 * which slots moved.
 */
describe("the rail on an authority guide leads with winnable siblings", () => {
  /**
   * The first computed slot on every authority page is not a gated guide.
   * Before the sort changed, one of the 18 opened its computed slots on a
   * gated guide (networking-tips → how-to-be-a-good-friend); none does now.
   * Unchecked candidates sort with the winnable ones, because absent means
   * nobody has looked, so the count splits 17 winnable and 1 unchecked
   * (networking-tips → improv-team-building) on 2026-09-22.
   */
  it("opens the computed slots on a guide that is not gated, on all 18", async () => {
    const bridges = await loadBridges();
    const verdictOf = new Map(bridges.map((b) => [b.slug, b.frontmatter.serp_verdict]));
    const authorityPages = bridges.filter((b) => isAuthority(b.frontmatter));
    expect(authorityPages.length).toBe(18);
    const gatedFirst: string[] = [];
    let winnableFirst = 0;
    let uncheckedFirst = 0;
    for (const page of authorityPages) {
      const curated = new Set(CURATED_RELATED[page.slug] ?? []);
      const computed = (await getRelatedBridges(page.slug)).filter((g) => !curated.has(g.slug));
      expect(computed.length, page.slug).toBeGreaterThan(0);
      const verdict = verdictOf.get(computed[0].slug);
      if (verdict === "authority") gatedFirst.push(`${page.slug} -> ${computed[0].slug}`);
      else if (verdict === "winnable") winnableFirst += 1;
      else uncheckedFirst += 1;
    }
    expect(gatedFirst).toEqual([]);
    // 17 winnable and 1 unchecked when this landed; 15 and 3 since
    // 2026-09-22, when the rail began scoring shared drills (tracker entry
    // 325): stage-fright and team-building-activities open on
    // improv-warm-up-games, an unchecked verdict sharing 4 and 8 drills.
    // The rule holds — no gated first — and the split is a reading.
    expect(winnableFirst + uncheckedFirst).toBe(authorityPages.length);
    expect(winnableFirst).toBeGreaterThanOrEqual(14);
  });

  /**
   * Within a tier, no gated guide precedes a winnable one, on any authority
   * page, in any slot. This is the rule the first-slot count follows from,
   * asserted over every visible slot so a tier that opens winnable and then
   * interleaves does not pass on its first item.
   */
  it("never puts a gated guide ahead of a winnable one in the same tier", async () => {
    const bridges = await loadBridges();
    const bySlug = new Map(bridges.map((b) => [b.slug, b]));
    const placed = clusterMap(GUIDE_CATEGORIES);
    const out: string[] = [];
    let mixedTiers = 0;
    for (const page of bridges.filter((b) => isAuthority(b.frontmatter))) {
      const curated = new Set(CURATED_RELATED[page.slug] ?? []);
      const rail = (await getRelatedBridges(page.slug)).filter((g) => !curated.has(g.slug));
      const computed = rail.map((g) => g.slug);
      const drillsShared = new Map(rail.map((g) => [g.slug, g.sharedDrills ?? 0]));
      const own = placed.get(page.slug);
      // The strong-sibling door has two keys since 2026-09-22: declared
      // atoms or shared drills (tracker entry 325).
      const tierOf = (s: string) => {
        if (sharedEntryAtoms(page, bySlug.get(s)!) >= STRONG_SIBLING_ATOMS) return 0;
        if ((drillsShared.get(s) ?? 0) >= STRONG_SIBLING_DRILLS) return 0;
        return placed.get(s) === own ? 1 : 2;
      };
      for (let i = 1; i < computed.length; i++) {
        const prev = computed[i - 1];
        const next = computed[i];
        if (tierOf(prev) !== tierOf(next)) continue;
        const prevGated = isAuthority(bySlug.get(prev)!.frontmatter);
        const nextGated = isAuthority(bySlug.get(next)!.frontmatter);
        if (prevGated !== nextGated) mixedTiers += 1;
        if (prevGated && !nextGated) out.push(`${page.slug}: ${prev} before ${next}`);
      }
    }
    expect(out).toEqual([]);
    // Guard the guard: some tier actually holds both verdicts, or the order
    // is vacuous. Eight pages had a slot move when this landed; 4 mixed
    // tiers since the drill door (entry 325, 2026-09-22) moved 150 slots.
    expect(mixedTiers).toBeGreaterThanOrEqual(3);
  });

  /**
   * A winnable page's rail is a set of neighbours, not a hand-off, and a
   * gated neighbour can still be the closest one — yes-and-improv opens on
   * how-to-deal-with-conflict, which is gated, and should. The first two
   * slots of ten named winnable guides as they stood on 2026-09-22, before
   * the sort learned the page's verdict; 0 of the 60 non-authority pages
   * changed in any slot when it did.
   */
  it("leaves a winnable page's rail exactly as it was", async () => {
    const bridges = await loadBridges();
    const verdictOf = new Map(bridges.map((b) => [b.slug, b.frontmatter.serp_verdict]));
    const fixture: Record<string, [string, string]> = {
      // Second slots re-read 2026-09-22 after the rail began scoring shared
      // drills (tracker entry 325): small-talk's is how-to-be-less-awkward
      // and difficult-conversations' is how-to-keep-a-conversation-going.
      "how-to-make-small-talk": ["how-to-keep-a-conversation-going", "how-to-be-less-awkward"],
      "rules-of-improv": [
        "how-to-have-difficult-conversations",
        "how-to-keep-a-conversation-going",
      ],
      "yes-and-improv": ["how-to-deal-with-conflict", "fun-questions-to-ask-friends"],
      "how-to-have-difficult-conversations": [
        "how-to-stop-people-pleasing",
        "how-to-keep-a-conversation-going",
      ],
      "how-to-be-a-good-listener": [
        "how-to-stop-overthinking-in-a-relationship",
        "how-to-be-less-awkward",
      ],
      "team-building-questions": ["team-building-activities", "emotional-safety"],
      "fear-of-public-speaking": ["how-to-deal-with-rejection", "how-to-overcome-fear-of-failure"],
      "how-to-stop-people-pleasing": [
        "how-to-have-difficult-conversations",
        "would-you-rather-questions",
      ],
      "icebreaker-questions-for-work": ["deep-questions-to-ask", "emotional-safety"],
      "emotional-safety": ["team-building-questions", "team-dynamics"],
    };
    for (const [slug, expected] of Object.entries(fixture)) {
      expect(verdictOf.get(slug), slug).toBe("winnable");
      const related = (await getRelatedBridges(slug)).map((g) => g.slug);
      expect(related.slice(0, 2), slug).toEqual(expected);
    }
    // The fixture includes a gated first item, or it proves nothing.
    expect(verdictOf.get(fixture["yes-and-improv"][0])).toBe("authority");
  });

  /**
   * The page says the hand-off in words. /stage-fright is gated and its rail
   * opens on confidence-building-exercises, a curated winnable pairing; the
   * heading over it reads as a page that sends the reader on, under the same
   * data-track as every other guide's rail.
   */
  it.runIf(built)(
    "renders the hand-off heading and a winnable first item on /stage-fright",
    async () => {
      const bridges = await loadBridges();
      const page = bridges.find((b) => b.slug === "stage-fright")!;
      expect(isAuthority(page.frontmatter)).toBe(true);
      const file = path.join(APP, "stage-fright.html");
      expect(fs.existsSync(file)).toBe(true);
      const html = fs.readFileSync(file, "utf-8");
      const rail = html.match(/<nav[^>]*data-track="related-guides"[^>]*>([\s\S]*?)<\/nav>/);
      expect(rail).not.toBeNull();
      expect(rail![1]).toContain("Where to go from here");
      expect(rail![1]).not.toContain("Related guides");
      const firstHref = rail![1].match(/href="\/([a-z0-9-]+)"/)?.[1];
      const first = (await getRelatedBridges("stage-fright"))[0];
      expect(firstHref).toBe(first.slug);
      expect(bridges.find((b) => b.slug === firstHref)?.frontmatter.serp_verdict).toBe("winnable");
      // And a winnable page keeps the plain heading.
      const winnable = fs.readFileSync(path.join(APP, "how-to-make-small-talk.html"), "utf-8");
      expect(winnable).toContain("Related guides");
      expect(winnable).not.toContain("Where to go from here");
    },
  );
});
