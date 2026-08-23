import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * Six months. Long enough that ordinary churn does not trip it, short enough
 * that a verdict cannot quietly outlive the results it describes.
 */
const STALE_AFTER_DAYS = 180;

/**
 * A SERP verdict is a claim about a day, and days pass.
 *
 * Every prioritisation on this site rests on these: which pages are worth
 * depth, which are written off, and the open-versus-gated split that decides
 * where effort goes. They were recorded by looking at real results on a real
 * date, and results move — sites gain and lose authority, pages get published,
 * intents shift.
 *
 * Nothing else notices. A verdict of "authority" that has gone stale keeps a
 * page permanently written off; one of "winnable" keeps effort pointed at a
 * wall. Both fail silently and neither shows up in a build, which is the same
 * shape as the promotion thresholds that went stale twice this session.
 *
 * So this fails once a verdict is older than the results it claims to
 * describe can be trusted to be. The fix when it fires is not to raise the
 * number — it is to re-check the SERP and write down what is there now.
 */
describe("verdict freshness", () => {
  it("has no SERP verdict older than the results it describes", async () => {
    const bridges = await loadBridges();

    const today = Date.parse(new Date().toISOString().slice(0, 10));
    const stale: string[] = [];
    let checked = 0;

    for (const bridge of bridges) {
      const date = bridge.frontmatter.serp_checked;
      if (!date) continue;
      checked++;
      const days = Math.round((today - Date.parse(date.slice(0, 10))) / 86_400_000);
      if (days > STALE_AFTER_DAYS) {
        stale.push(`${bridge.slug}: checked ${date.slice(0, 10)}, ${days} days ago`);
      }
    }

    // A verdict recorded on every checked page is the point; if this collapses
    // the check above passes on nothing.
    expect(checked).toBeGreaterThan(40);
    expect(stale).toEqual([]);
  });

  /**
   * The check above skips a page with no verdict at all — `if (!date) continue`
   * — so it polices staleness and is blind to absence. Eighteen of seventy-one
   * guides had never been checked, and the five largest were the site's biggest
   * terms: people skills at 6,900 a month, framing effect at 3,500, what is
   * improv at 2,600.
   *
   * That is the same fault the freshness check exists to prevent, one step
   * earlier. A stale verdict misdirects effort; a missing one means the page was
   * written on a difficulty score alone, and this loop has repeatedly found
   * those wrong in both directions. Checking those five turned up two walls —
   * people skills and framing effect have no top-ten result below DR 82 — and
   * what is improv winnable at DR 12 with its traffic potential recorded as 50
   * when Ahrefs says 250.
   *
   * This started at a volume floor of 2,000, which was all that was
   * satisfiable when the eighteen were found. The remaining backlog has since
   * been worked through, so the floor is gone and every guide needs a verdict.
   *
   * Clearing it was worth doing for what it found rather than for tidiness.
   * Difficulty scores had these badly wrong in both directions: how to be
   * witty and how to overcome fear of failure have results pages with a DR 0
   * and a DR 1 site on them, while collaboration skills and how to give
   * feedback have nothing below DR 67 and are walls. Neither group is
   * distinguishable from the numbers a tool supplies.
   */
  const NO_VERDICT_NEEDED = new Set([
    // Ten searches a month. A SERP check costs more than the page can return.
    "improv-theory",
  ]);

  it("has checked the SERP for every guide", async () => {
    const bridges = await loadBridges();

    const unchecked: string[] = [];
    let inScope = 0;

    for (const bridge of bridges) {
      const primary = (bridge.frontmatter.target_keywords ?? [])[0];
      if (!primary) continue;
      if (NO_VERDICT_NEEDED.has(bridge.slug)) continue;
      inScope++;
      if (!bridge.frontmatter.serp_checked) {
        unchecked.push(`${bridge.slug}: "${primary.keyword}" at ${primary.volume}/mo`);
      }
    }

    // If the loader changed shape nothing is in scope and this passes on an
    // empty set.
    expect(inScope).toBeGreaterThan(60);
    expect(unchecked).toEqual([]);
  });
});
