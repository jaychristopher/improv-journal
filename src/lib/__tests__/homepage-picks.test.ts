import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { getHomepagePicks, reachOf } from "../homepage-picks";
import { getTopGuides } from "../top-guides";

const APP = path.join(process.cwd(), ".next", "server", "app");
const HOME = path.join(APP, "index.html");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(HOME);

/** Body only: the footer links the promoted set, which is the thing being excluded. */
function homepageBody(): string {
  const html = fs.readFileSync(HOME, "utf-8");
  return html.split("</header>").pop()!.split("<footer")[0];
}

/**
 * The homepage's guide list is not the footer's.
 *
 * "Where most people start" rendered `getTopGuides()` — the footer's 27
 * promoted guides, on the one page where the footer already appears — so
 * the strongest page on the site added no entrance the chrome lacked, and
 * every winnable guide under the promotion floor (virtual-team-building-
 * activities at 5,800 of traffic potential down) was linked from neither
 * (tracker entry 117, 2026-09-21). The picks are the same sort minus the
 * footer's set, and these guards hold the two apart.
 */
describe("homepage picks", () => {
  it("has a list, and the footer has one to exclude", async () => {
    const [picks, footer] = await Promise.all([getHomepagePicks(), getTopGuides()]);

    // 26 winnable guides sat outside the footer's 27 on 2026-09-21; the
    // floor is under both so a verdict change or a new guide does not
    // fail this, while an empty list — the failure that matters — does.
    expect(footer.length).toBeGreaterThanOrEqual(20);
    expect(picks.length).toBeGreaterThanOrEqual(20);
    // Kept to the footer's size, so the section stays the length it was.
    expect(picks.length).toBeLessThanOrEqual(footer.length);
  });

  it("is disjoint from the footer's promoted set", async () => {
    const [picks, footer] = await Promise.all([getHomepagePicks(), getTopGuides()]);
    const promoted = new Set(footer.map((guide) => guide.slug));

    expect(picks.map((guide) => guide.slug).filter((slug) => promoted.has(slug))).toEqual([]);
  });

  it("together with the footer covers more guides than either alone", async () => {
    const [picks, footer] = await Promise.all([getHomepagePicks(), getTopGuides()]);
    const union = new Set([...picks, ...footer].map((guide) => guide.slug));

    expect(union.size).toBeGreaterThanOrEqual(footer.length + picks.length);
    expect(union.size).toBeGreaterThan(footer.length);
  });

  it("only picks guides whose results were read and found open", async () => {
    const bySlug = new Map((await loadBridges()).map((b) => [b.slug, b]));
    const picks = await getHomepagePicks();

    const notWinnable = picks
      .filter((guide) => bySlug.get(guide.slug)?.frontmatter.serp_verdict !== "winnable")
      .map((guide) => `${guide.slug}: ${bySlug.get(guide.slug)?.frontmatter.serp_verdict}`);
    expect(notWinnable).toEqual([]);
  });

  it("ranks by reach, descending, like the footer", async () => {
    const reach = (await getHomepagePicks()).map((guide) => guide.reach);
    expect(reach).toEqual([...reach].sort((a, b) => b - a));
  });

  /**
   * `reachOf` is a copy of a private function in top-guides. The footer's
   * own reach figures are the reference: if the two readings ever disagree
   * on a promoted guide, one of them has changed.
   */
  it("reads reach the way top-guides does", async () => {
    const bySlug = new Map((await loadBridges()).map((b) => [b.slug, b]));
    const footer = await getTopGuides();
    expect(footer.length).toBeGreaterThanOrEqual(20);

    for (const guide of footer) {
      const keywords = bySlug.get(guide.slug)!.frontmatter.target_keywords ?? [];
      expect(reachOf(keywords), guide.slug).toBe(guide.reach);
    }
  });

  it("resolves every pick to a real bridge with a label", async () => {
    const slugs = new Set((await loadBridges()).map((b) => b.slug));

    for (const guide of await getHomepagePicks()) {
      expect(slugs.has(guide.slug), guide.slug).toBe(true);
      expect(guide.label.length, guide.slug).toBeGreaterThan(0);
    }
  });

  /**
   * Asserts hrefs in the body, not slugs anywhere in the document: the slugs
   * also sit in the flight payload, which is exactly how a list that pointed
   * nowhere would still pass a looser check.
   */
  it.runIf(built)("links every pick from the built homepage body", async () => {
    const picks = await getHomepagePicks();
    const body = homepageBody();

    expect(picks.length).toBeGreaterThanOrEqual(20);
    const missing = picks
      .map((guide) => guide.slug)
      .filter((slug) => !body.includes(`href="/${slug}"`));
    expect(missing).toEqual([]);
  });

  it.runIf(built)("marks the two homepage link blocks for click tracking", () => {
    const body = homepageBody();
    expect(body).toContain('data-track="home-start"');
    expect(body).toContain('data-track="home-craft"');
  });
});
