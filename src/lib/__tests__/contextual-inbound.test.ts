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

/** Slugs that had no editorial inbound link when this check was written. */
const KNOWN_UNLINKED = new Set([
  "networking-tips",
  "questions-to-ask-a-girl",
  "questions-to-ask-in-an-interview",
  "funny-questions-to-ask",
  "how-to-be-more-creative",
  "how-to-deal-with-rejection",
  "people-skills",
]);

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
