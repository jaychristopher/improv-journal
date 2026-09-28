import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const BUILD = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(path.join(BUILD, "index.html"));

/** Body links of a built page: everything after the site header, before the footer. */
function bodyLinks(rel: string): string[] {
  const html = fs.readFileSync(path.join(BUILD, rel), "utf8");
  const body = html.split("</header>").pop()!.split("<footer")[0];
  return [...body.matchAll(/href="(\/[^"?#]*)"/g)].map((m) => m[1]);
}

/**
 * A hub links the guides that answer its term's rooms.
 *
 * Measured 2026-09-28 across the built site: /practice/exercises, the hub
 * that registers "improv exercises" (250 a month, and the parent the beginner
 * picker's three terms and "improv practice" sit under), linked no guide at
 * all. A reader who arrived wanting warm-ups, a first class, a work team or a
 * pair was handed the index and nothing else. /practice and
 * /practice/techniques linked none either; the games hub linked six, and the
 * improv team building guide was reached from no hub but the beginner learn
 * page. The results page for "improv exercises" is lists for a class or a
 * team (ROUTE_SERP), and every one of those rooms has a guide here.
 *
 * These are the routes out of each hub, with the guide's own term as the
 * anchor. A guide leaving one of these lists should be a decision made here,
 * not a rail that stopped rendering.
 */
const SPOKES: Record<string, string[]> = {
  "practice/exercises.html": [
    "/improv-warm-up-games",
    "/tools/exercise-picker/beginner",
    "/improv-prompts",
    "/improv-games-for-kids",
    "/improv-team-building",
    "/5-minute-team-building",
    "/2-person-improv-games",
    "/trust-building-exercises",
    "/confidence-building-exercises",
    "/active-listening-exercises",
    "/how-to-get-better-at-improv",
  ],
  "improv-games.html": [
    "/improv-games-for-kids",
    "/improv-warm-up-games",
    "/2-person-improv-games",
    "/improv-prompts",
    "/5-minute-team-building",
    "/improv-team-building",
    "/theatre-games",
  ],
};

describe("hub spokes", () => {
  it.runIf(built)("each hub links the guides that answer its rooms", () => {
    for (const [page, spokes] of Object.entries(SPOKES)) {
      const links = [...new Set(bodyLinks(page))];
      // Guard the guard: a hub's body carries its own list, never nothing.
      expect(links.length, page).toBeGreaterThan(20);
      for (const spoke of spokes) expect(links, `${page} -> ${spoke}`).toContain(spoke);
    }
  });
});
