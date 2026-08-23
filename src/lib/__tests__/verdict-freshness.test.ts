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
});
