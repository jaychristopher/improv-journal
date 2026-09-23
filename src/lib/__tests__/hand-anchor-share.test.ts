import { describe, expect, it } from "vitest";

import { normaliseText } from "../anchor-text";
import { loadBridges } from "../content";

/**
 * How the guides link each other by hand, as a dated ceiling that may only
 * fall.
 *
 * Tracker entry 287 (2026-09-22): of 270 hand-written markdown links from one
 * guide's body to another guide, the anchor is the target's primary Ahrefs
 * keyword, verbatim, 218 times (0.81). One target has a median of one distinct
 * anchor across every page that links it by hand. The footer repeats the same
 * keyword on every page of the site (entry 108), so the 27 promoted guides
 * received 0.96 of all their inbound anchors as the one phrase they are
 * trying to rank for — the profile of a page nobody links to naturally.
 *
 * The footer's half of that is fixed in code (`footerLabelsByTitle`, and
 * `anchor-diversity.test.ts` reads the result off the build). This half is a
 * habit, and it is corrected one sentence at a time: the guide SOP's rule is
 * now "link with the phrase the sentence needs, not the keyword". The share
 * below is the tripwire for that rule. It records where the habit stood and
 * fails the moment a new link pushes it back up; it is not a target, and it
 * changes no content.
 *
 * Measured 2026-09-22, case-insensitively with hyphens as spaces (the same
 * reading `anchor-text.ts` applies to page text), so "improv warm-up games"
 * counts as the keyword "improv warm up games" and "Del Close" as "del
 * close". The entry's scratch count was 215 keyword-exact and 1 title of the
 * same 270; this reading finds 218 and 0 — the three are the hyphen and case
 * variants above — and the ceiling is set on this reading.
 */
const KEYWORD_SHARE_CEILING = 0.81;
const MEASURED_LINKS = 270;

type AnchorClass = "keyword" | "contains" | "title" | "short" | "fragment";

interface HandLink {
  from: string;
  to: string;
  anchor: string;
  cls: AnchorClass;
}

/** Hand-written markdown links whose target is a root-level guide route. */
const MARKDOWN_LINK = /\[([^\]]+)\]\(\/([a-z0-9-]+)(?:#[^)]*)?\)/g;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(phrase)}(?=$|[^a-z0-9])`).test(text);
}

async function handLinks(): Promise<HandLink[]> {
  const bridges = await loadBridges();
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const links: HandLink[] = [];
  for (const bridge of bridges) {
    for (const match of bridge.content.matchAll(MARKDOWN_LINK)) {
      const [, anchor, slug] = match;
      if (slug === bridge.slug) continue;
      const target = bySlug.get(slug);
      if (!target) continue;
      const primary = target.frontmatter.target_keywords?.[0]?.keyword;
      const text = normaliseText(anchor).trim();
      const keyword = primary ? normaliseText(primary).trim() : undefined;
      let cls: AnchorClass;
      if (keyword && text === keyword) cls = "keyword";
      else if (text === normaliseText(target.frontmatter.title).trim()) cls = "title";
      else if (keyword && containsPhrase(text, keyword)) cls = "contains";
      else if (text.split(" ").length <= 3) cls = "short";
      else cls = "fragment";
      links.push({ from: bridge.slug, to: slug, anchor, cls });
    }
  }
  return links;
}

describe("hand-written guide-to-guide anchors", () => {
  it("classifies every hand link by what its anchor is", async () => {
    const links = await handLinks();
    // Guard the guard: a regex that stopped matching, or a content layer that
    // moved, would otherwise report a share of nothing.
    expect(links.length).toBeGreaterThanOrEqual(250);

    const counts = { keyword: 0, contains: 0, title: 0, short: 0, fragment: 0 };
    for (const link of links) counts[link.cls] += 1;
    const total = links.length;
    const share = counts.keyword / total;

    const reading = `${counts.keyword} keyword-exact, ${counts.contains} containing it, ${counts.title} title, ${counts.short} short, ${counts.fragment} fragment, of ${total}`;
    expect(share, `keyword-exact share of hand links — ${reading}`).toBeLessThanOrEqual(
      KEYWORD_SHARE_CEILING,
    );
    // The measured population, so a rise in the share is read against the
    // count it came from and not against a shrinking denominator.
    expect(total).toBeGreaterThanOrEqual(MEASURED_LINKS - 20);
  });

  it("records the distinct anchors each hand-linked guide receives", async () => {
    const links = await handLinks();
    const anchorsByTarget = new Map<string, Set<string>>();
    for (const link of links) {
      const set = anchorsByTarget.get(link.to) ?? new Set<string>();
      set.add(normaliseText(link.anchor).trim());
      anchorsByTarget.set(link.to, set);
    }
    expect(anchorsByTarget.size).toBeGreaterThanOrEqual(70);

    const distinct = [...anchorsByTarget.values()].map((s) => s.size).sort((a, b) => a - b);
    const median = distinct[Math.floor(distinct.length / 2)];
    // 77 targets, median 1 distinct anchor, maximum 4, on 2026-09-22. A floor
    // on the median rather than a ceiling: this number should rise as the SOP
    // takes, and a fall below what was measured would mean links were lost.
    expect(median).toBeGreaterThanOrEqual(1);
  });
});
