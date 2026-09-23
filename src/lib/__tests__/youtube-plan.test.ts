import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { routeKeywordOwners } from "../route-keywords";

/**
 * `docs/youtube-channel-plan.md` and the guides' frontmatter are two Ahrefs
 * readings of the same keywords, taken 4 months apart, and they disagree on
 * most of them (tracker entry 349). The plan's matrix is dated 2026-04-25; the
 * guides carry `serp_checked: 2026-08-22`. Neither is wrong — a term re-read
 * in August is a different number from the same term read in April.
 *
 * So these guards do NOT assert the 2 registers agree. They assert the plan
 * says which reading it used, and that wherever the numbers differ the guide's
 * check is the later one — which is what makes the difference recency rather
 * than error. A pair where the *guide* is the older or undated side is the
 * real defect, because then nothing explains the gap, and the list of known
 * such pairs is pinned below so a new one fails.
 *
 * The plan is also the production order: its priority table is scored on the
 * April volumes and its own note says "resume scoring on next refresh of
 * Ahrefs data". Re-scoring needs a fresh pull, which is the owner's job. What
 * a session can do is record the divergence with its date, which is what the
 * head note in section 5 and the readings here are for.
 *
 * Counts here are dated readings taken 2026-09-22. Raising one to make a
 * failure go away defeats the point: re-date the reading instead.
 */

const PLAN = path.join(process.cwd(), "docs", "youtube-channel-plan.md");

/** The Ahrefs pull every volume in the plan came from. */
const PLAN_SERP_DATE = "2026-04-25";

interface PlannedVideo {
  /** The `L…` id in the first cell, e.g. `L12`. */
  id: string;
  title: string;
  /** The plan's target keyword, as typed. */
  keyword: string;
  /** The plan's April volume. Never derived — only read. */
  volume: number;
  /** The whole Bridge cell, so a missing link is visible as absence. */
  bridgeCell: string;
}

/**
 * The plan's long-form inventory as data: rows whose first cell is `L` + digits.
 *
 * Parsed rather than imported because the plan is a production document with no
 * frontmatter and no loader. Columns are id, title, keyword, volume, difficulty,
 * bridge, status. A row whose volume does not parse is kept with NaN so the
 * population guard below catches it instead of it vanishing from the counts.
 */
function parsePlannedVideos(markdown: string): PlannedVideo[] {
  const videos: PlannedVideo[] = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!/^\|\s*L\d+\s*\|/.test(line)) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    videos.push({
      id: cells[1],
      title: cells[2],
      keyword: cells[3],
      volume: Number(cells[4].replace(/,/g, "")),
      bridgeCell: cells[6] ?? "",
    });
  }
  return videos;
}

/** Every keyword a guide declares, lowercased, mapped to the guide holding it. */
async function guideKeywordOwners() {
  const owners = new Map<string, { slug: string; volume: number; serpChecked: string | null }>();
  for (const bridge of await loadBridges()) {
    for (const { keyword, volume } of bridge.frontmatter.target_keywords ?? []) {
      owners.set(keyword.trim().toLowerCase(), {
        slug: bridge.slug,
        volume,
        serpChecked: bridge.frontmatter.serp_checked
          ? String(bridge.frontmatter.serp_checked)
          : null,
      });
    }
  }
  return owners;
}

const markdown = () => readFileSync(PLAN, "utf-8");

describe("youtube channel plan against the guides", () => {
  /**
   * Guard the guard. Every count below is a share of this population, so a
   * changed table shape has to fail here rather than quietly reduce the
   * denominator and let a share pass vacuously. 35 long-form videos on
   * 2026-09-22.
   */
  it("parses every planned long-form video out of the inventory tables", () => {
    const videos = parsePlannedVideos(markdown());

    expect(videos.length).toBeGreaterThanOrEqual(35);
    for (const video of videos) {
      expect(video.keyword, `${video.id} has no target keyword`).not.toBe("");
      expect(Number.isFinite(video.volume), `${video.id} volume did not parse`).toBe(true);
      expect(video.title, `${video.id} has no title`).not.toBe("");
    }
    expect(new Set(videos.map((v) => v.id)).size).toBe(videos.length);
  });

  /**
   * The point of the whole file. A volume in the plan that differs from the
   * guide's is fine — it is April's answer beside August's — but only if the
   * document says so where someone reads it. Without the source line and its
   * date, a reader has 2 numbers and no way to tell which is current.
   */
  it("states the reading its volumes came from, at the head of the matrix", () => {
    const text = markdown();
    const matrix = text.slice(text.indexOf("## 5. Keyword Opportunity Matrix"));

    expect(matrix).toContain("Ahrefs Keywords Explorer");
    expect(matrix).toContain(PLAN_SERP_DATE);
    // The head note naming the later reading, so the difference is explained
    // before the tables rather than after somebody acts on them.
    expect(matrix.slice(0, 2000)).toContain("2026-08-22");
  });

  /**
   * A dated census of the overlap. 34 of 35 keywords are declared by a guide
   * and 26 of those 34 volumes differ, read 2026-09-22. These are floors and
   * ceilings around the reading, not targets: if the next Ahrefs pull lands on
   * the plan, the differing count drops and this test gets re-dated.
   */
  it("records how far the two readings have drifted", async () => {
    const videos = parsePlannedVideos(markdown());
    const owners = await guideKeywordOwners();

    const matched = videos.filter((v) => owners.has(v.keyword.toLowerCase()));
    const differing = matched.filter(
      (v) => owners.get(v.keyword.toLowerCase())!.volume !== v.volume,
    );

    // Guard the guard: the guide corpus has to be loaded for any of this to mean
    // anything. 78 guides on 2026-09-22.
    expect(owners.size).toBeGreaterThanOrEqual(70);
    expect(matched.length).toBeGreaterThanOrEqual(34);
    expect(differing.length).toBeGreaterThanOrEqual(20);
    expect(differing.length).toBeLessThanOrEqual(matched.length);
  });

  /**
   * The real defect this file exists to catch.
   *
   * A differing pair is explained when the guide's `serp_checked` is later
   * than the plan's pull — then the guide is simply the newer read. A pair
   * where the guide is undated, or dated before 2026-04-25, has no such
   * explanation: 2 numbers, no way to prefer one, and the plan is scoring
   * production on its own.
   *
   * 1 such pair exists on 2026-09-22 and is pinned below. `improv-theory` has
   * no `serp_checked` at all (it is `status: draft` and has never been through
   * a SERP check), and the plan's L35 row says 50 for "improv theory" while
   * the plan's own Avoid Tier table says 10 for the same term — which is also
   * what the guide says. The 50 belongs to "history of improv", the row above
   * it in that tier. Correcting it means re-reading Ahrefs, not editing a
   * number in place, so it stays recorded rather than fixed.
   */
  it("explains every differing volume by the guide being the later read", async () => {
    const videos = parsePlannedVideos(markdown());
    const owners = await guideKeywordOwners();

    const KNOWN_UNEXPLAINED = ["improv theory"];

    const unexplained: string[] = [];
    for (const video of videos) {
      const guide = owners.get(video.keyword.toLowerCase());
      if (!guide || guide.volume === video.volume) continue;
      if (guide.serpChecked && guide.serpChecked > PLAN_SERP_DATE) continue;
      unexplained.push(
        `${video.id} "${video.keyword}" plan ${video.volume} (${PLAN_SERP_DATE}) against ` +
          `${guide.slug} ${guide.volume} (serp_checked ${guide.serpChecked ?? "absent"})`,
      );
    }

    expect(unexplained.map((line) => line.split('"')[1])).toEqual(KNOWN_UNEXPLAINED);
  });

  /**
   * One target the plan carries is claimed by no guide and no hub: "active
   * listening" at 41,000, the largest volume in the document and the keyword
   * behind L20. `/active-listening` exists and declares "active listening
   * skills" instead, with "active listening" only as that keyword's `parent`
   * — a parent is the collision test's field, not a claim, so nothing on the
   * site targets the term itself.
   *
   * Pinned by name rather than by count so that a *different* keyword falling
   * out of the guides fails here instead of silently taking the slot.
   */
  it("names the targets no guide and no hub claims", async () => {
    const videos = parsePlannedVideos(markdown());
    const guides = await guideKeywordOwners();
    const routes = routeKeywordOwners();

    // Guard the guard: hub keywords have to load or every term reads unclaimed.
    expect(routes.size).toBeGreaterThanOrEqual(5);

    const unclaimed = videos
      .filter((v) => !guides.has(v.keyword.toLowerCase()) && !routes.has(v.keyword.toLowerCase()))
      .map((v) => v.keyword);

    expect(unclaimed).toEqual(["active listening"]);
  });

  /**
   * The plan named its guides in plain text and linked none of them, so the
   * production pipeline had no path from a planned video to the page that
   * already ranks for its keyword. The link target is computed from the
   * keyword match, not from the slug somebody typed — 4 of those typed slugs
   * named files that do not exist (`group-dynamics`, `team-bonding-activities`,
   * `interpersonal-communication-skills`, `how-to-be-a-better-conversationalist`),
   * which is exactly the failure a computed link prevents.
   *
   * Presence, not markup: this asserts the matched guide is reachable from its
   * row, and that the row for the unclaimed target has no link to invent.
   */
  it("links each planned video to the guide sharing its keyword", async () => {
    const videos = parsePlannedVideos(markdown());
    const owners = await guideKeywordOwners();

    let linked = 0;
    for (const video of videos) {
      const guide = owners.get(video.keyword.toLowerCase());
      if (!guide) {
        expect(video.bridgeCell, `${video.id} has no guide to link`).not.toContain("](");
        continue;
      }
      expect(video.bridgeCell, `${video.id} does not link ${guide.slug}`).toContain(
        `(../content/bridges/${guide.slug}.md)`,
      );
      linked += 1;
    }

    expect(linked).toBeGreaterThanOrEqual(34);
  });
});
