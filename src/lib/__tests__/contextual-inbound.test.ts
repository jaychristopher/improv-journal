import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * A guide nothing links to is a guide the site is not arguing for.
 *
 * Every page here already has inbound links — the navigation, the guide
 * category hubs and the related blocks all link everything, so a crawl finds no
 * orphans and the earlier link count I ran found a floor of eight. That measure
 * was reassuring and close to meaningless: boilerplate links appear on every
 * page regardless of what it says, so they carry no signal about what a page is
 * about or which of them matters.
 *
 * Editorial links do carry that. Counting only those, thirteen of seventy-two
 * guides had none at all, and the biggest was networking-tips at 53,000
 * traffic potential. The highest-potential page on the site, the improv games
 * hub, was the least linked page in its own cluster — theatre-games has a
 * section headed "Theatre Games vs. Improv Games" which named three games from
 * that hub and linked to none of them.
 *
 * So: a winnable guide has to be linked from at least one other document, in
 * prose, by something that chose to link it.
 *
 * One limit, found by mutation-testing this and worth stating rather than
 * leaving to be rediscovered: the improv games hub is the page that prompted
 * the check and is the one page it cannot cover. It is a hand-built app route
 * with no frontmatter and no verdict, so it is not in `loadBridges()` and
 * nothing here sees it. Stripping every link to it leaves this test green.
 * That is the same blind spot that hid the page's value for months.
 */

/**
 * Empty, and meant to stay that way.
 *
 * Seven guides were listed here when the check was written. All seven now have
 * an editorial link from a page whose subject genuinely leads there — rejection
 * from fear of failure, interview questions from the workplace icebreakers,
 * networking from small talk. Nothing was linked from a "related guides" block,
 * because that is the boilerplate this check exists to see past.
 *
 * Worth recording that the list was doing less than it looked. Five of the
 * seven are gated rather than winnable, so this check never examined them and
 * naming them here changed nothing. Only how-to-deal-with-rejection and
 * questions-to-ask-a-girl were ever in scope. Linking the other five is still
 * worth doing for readers and for crawl paths, but it was not this test being
 * satisfied.
 *
 * Adding a slug here is a way of saying a guide is worth ranking but not worth
 * mentioning. If that is ever true, the honest fix is to stop calling it
 * winnable.
 */
const KNOWN_UNLINKED = new Set<string>([]);

/** Markdown link to /slug, not /slug-something-else. */
function linksTo(body: string, slug: string): boolean {
  const needle = `](/${slug}`;
  let i = body.indexOf(needle);
  while (i !== -1) {
    const after = body[i + needle.length];
    if (after === ")" || after === "#" || after === "?") return true;
    i = body.indexOf(needle, i + needle.length);
  }
  return false;
}

describe("contextual inbound links", () => {
  it("has something linking to every winnable guide in prose", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);

    const documents = [
      ...bridges.map((b) => ({ slug: b.slug, body: b.content, isBridge: true })),
      ...atoms.map((a) => ({ slug: a.slug, body: a.content, isBridge: false })),
      ...threads.map((t) => ({ slug: t.slug, body: t.content, isBridge: false })),
      ...paths.map((p) => ({ slug: p.slug, body: p.content, isBridge: false })),
    ];

    // If the loaders change shape the bodies go empty and everything "fails"
    // to link, which would look like a catastrophe rather than a broken test.
    expect(documents.filter((d) => d.body.length > 400).length).toBeGreaterThan(150);

    const unlinked: string[] = [];
    let checked = 0;

    for (const bridge of bridges) {
      if (bridge.frontmatter.serp_verdict !== "winnable") continue;
      if (KNOWN_UNLINKED.has(bridge.slug)) continue;
      checked++;
      const linked = documents.some(
        (d) => !(d.isBridge && d.slug === bridge.slug) && linksTo(d.body, bridge.slug),
      );
      if (!linked) unlinked.push(bridge.slug);
    }

    expect(checked).toBeGreaterThan(20);
    expect(unlinked).toEqual([]);
  });
});

/**
 * The check above asks for one link and stops asking, which turned out to mean
 * almost nothing where it mattered most.
 *
 * Everything passed it while the links were distributed in inverse proportion
 * to what the pages are worth. most-likely-to-questions carries 45,000 traffic
 * potential and had one. 21-questions-game has 44,000 and had two.
 * icebreaker-questions-for-work, at 17,000, had eight. A guide the site is
 * betting on should be referred to more than once by the pages around it, and
 * "at least one" cannot express that.
 *
 * Two is not a target, it is a floor that makes the inversion visible. The
 * fifteen guides in scope now sit at two or more, so this holds the repair
 * rather than demanding new links for their own sake.
 */
const NEEDS_MORE_THAN_ONE_ABOVE = 15_000;

describe("inbound links on the biggest guides", () => {
  it("refers to a high-potential guide more than once", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);

    const documents = [
      ...bridges.map((b) => ({ slug: b.slug, body: b.content, isBridge: true })),
      ...atoms.map((a) => ({ slug: a.slug, body: a.content, isBridge: false })),
      ...threads.map((t) => ({ slug: t.slug, body: t.content, isBridge: false })),
      ...paths.map((p) => ({ slug: p.slug, body: p.content, isBridge: false })),
    ];

    const thin: string[] = [];
    let inScope = 0;

    for (const bridge of bridges) {
      if (bridge.frontmatter.serp_verdict !== "winnable") continue;
      const primary = (bridge.frontmatter.target_keywords ?? [])[0];
      const reach = primary?.traffic_potential ?? primary?.volume ?? 0;
      if (reach < NEEDS_MORE_THAN_ONE_ABOVE) continue;
      inScope++;
      const count = documents.filter(
        (d) => !(d.isBridge && d.slug === bridge.slug) && linksTo(d.body, bridge.slug),
      ).length;
      if (count < 2) thin.push(`${bridge.slug} (${reach} potential, ${count} link)`);
    }

    // If reach stops resolving, nothing is in scope and this passes on nothing.
    expect(inScope).toBeGreaterThan(10);
    expect(thin).toEqual([]);
  });
});

/**
 * Traffic potential is not the only way a guide earns links.
 *
 * The check above uses potential, which missed the pages the site is most
 * likely to actually rank. viewpoints, yes-and-improv and what-is-improv have
 * three reachable results each — the softest pages measured here — and carry
 * 1,100, 1,100 and 250 potential, so none of them came near the 15,000 floor.
 * All three had one editorial link, while how-to-have-difficult-conversations,
 * which rests on a single reachable result, had five.
 *
 * Reachability is the count of top-ten results under DR 50, from the recorded
 * profile. Across the profiled pages it separates winnable from gated
 * completely, and within winnable it orders them in a way the verdict cannot.
 * Three of ten is the top tier here, and a page in it should be referred to
 * more than once whatever its potential says.
 */
const REACHABLE_UNDER = 50;
const TOP_TIER_REACHABLE = 3;

describe("inbound links on the most reachable guides", () => {
  it("refers to a top-tier guide more than once", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);
    const documents = [
      ...bridges.map((b) => ({ slug: b.slug, body: b.content, isBridge: true })),
      ...atoms.map((a) => ({ slug: a.slug, body: a.content, isBridge: false })),
      ...threads.map((t) => ({ slug: t.slug, body: t.content, isBridge: false })),
      ...paths.map((p) => ({ slug: p.slug, body: p.content, isBridge: false })),
    ];

    const thin: string[] = [];
    let inScope = 0;

    for (const bridge of bridges) {
      const profile = bridge.frontmatter.serp_top10_dr;
      if (bridge.frontmatter.serp_verdict !== "winnable" || !profile?.length) continue;
      const open = profile.filter((dr) => dr < REACHABLE_UNDER).length;
      if (open < TOP_TIER_REACHABLE) continue;
      inScope++;
      const count = documents.filter(
        (d) => !(d.isBridge && d.slug === bridge.slug) && linksTo(d.body, bridge.slug),
      ).length;
      if (count < 2) thin.push(`${bridge.slug} (${open} reachable, ${count} link)`);
    }

    // If profiles stop resolving, nothing is in scope and this passes on nothing.
    expect(inScope).toBeGreaterThan(2);
    expect(thin).toEqual([]);
  });
});
