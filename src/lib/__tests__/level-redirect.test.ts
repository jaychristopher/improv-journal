import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getLevelHints } from "../../components/LevelRedirect";
import { loadPaths } from "../content";
import { AUDIENCE_LADDER, audienceRank, describeDirection, getNextPath } from "../path-progression";
import { getRecommendedPath } from "../path-recommendations";
import type { Audience } from "../schema";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(path.join(APP, "index.html"));

/**
 * The audience hubs' up/down arrows used to be six literals, three of them
 * the Self-Coaching Toolkit, written without reading `audience:` at all
 * (tracker entry 247, 2026-09-21). They now derive from the chain and the
 * recommender. This re-derives the targets independently, from the paths'
 * own frontmatter, and checks the component's hrefs against them for every
 * rung of the ladder — so a change to either source moves the arrows, and a
 * literal creeping back in fails.
 */
describe("LevelRedirect", () => {
  it("points every audience's arrows where the ladder says", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBe(11);
    const primary = new Map(
      paths.map((p) => [p.frontmatter.id, p.frontmatter.audience[0] as Audience]),
    );

    // The first path above `level` on the chain from `start`, or null.
    const climbFrom = (start: string, level: Audience): string | null => {
      const seen = new Set([start]);
      for (let next = getNextPath(start); next && !seen.has(next.id); next = getNextPath(next.id)) {
        seen.add(next.id);
        if (audienceRank(primary.get(next.id)!) > audienceRank(level)) return next.id;
      }
      return null;
    };

    let ups = 0;
    let downs = 0;
    for (const level of AUDIENCE_LADDER) {
      const rank = audienceRank(level);
      const hints = getLevelHints(level);

      const below = AUDIENCE_LADDER[rank - 1];
      if (below) {
        expect(hints.down?.href, `${level} down`).toBe(`/paths/${getRecommendedPath(below).id}`);
        downs += 1;
      } else {
        expect(hints.down, `${level} down`).toBeUndefined();
      }

      const above = AUDIENCE_LADDER[rank + 1];
      if (above) {
        const target =
          climbFrom(getRecommendedPath(level).id, level) ?? getRecommendedPath(above).id;
        expect(hints.up?.href, `${level} up`).toBe(`/paths/${target}`);
        // "Up" has to actually be up.
        expect(audienceRank(primary.get(target)!), `${level} up`).toBeGreaterThan(rank);
        ups += 1;
      } else {
        expect(hints.up, `${level} up`).toBeUndefined();
      }
    }
    expect(ups).toBe(4);
    expect(downs).toBe(4);
  });

  it("keeps the arrows' voice: a question, then a verb, then the path", () => {
    expect(getLevelHints("beginner").up?.label).toBe(
      "Already comfortable with improv? Try the Self-Coaching Toolkit",
    );
    expect(getLevelHints("intermediate").down?.label).toBe("New to improv? Start with Foundations");
    for (const level of AUDIENCE_LADDER) {
      for (const hint of Object.values(getLevelHints(level))) {
        expect(hint.label).toMatch(/^[A-Z][^?]+\? (Try|Start with) \S/);
      }
    }
  });

  /**
   * "Up" from the intermediate hub is the performer track, outward to the
   * formats; "down" from the performer hub is the reference guide, back to
   * the core. Both arrows said only the path's name, so "up" and "down"
   * were the reader's only clue to the direction and both were wrong about
   * it (tracker entry 281, 2026-09-22). Each hint now carries the target's
   * direction, the same string path-progression gives its next-path card.
   */
  it("says which way through the graph each arrow points", () => {
    expect(getLevelHints("intermediate").up?.direction).toBe(
      "works outward into formats and show craft, the specific end of the graph",
    );
    expect(getLevelHints("performer").down?.direction).toBe(
      "returns to the core ideas in depth, not a continuation of the performer track",
    );
    expect(getLevelHints("beginner").up?.direction).toBe(
      "works inward on the ideas everything else depends on",
    );
    // The teacher's path claims no direction, so the advanced hub's down arrow says none.
    expect(getLevelHints("advanced").down?.href).toBe("/paths/teaching-improv");
    expect(getLevelHints("advanced").down?.direction).toBeUndefined();

    let directed = 0;
    for (const level of AUDIENCE_LADDER) {
      for (const hint of Object.values(getLevelHints(level))) {
        const target = hint.href.replace("/paths/", "");
        expect(hint.direction, `${level} → ${target}`).toBe(describeDirection(target));
        if (hint.direction) directed += 1;
      }
    }
    // Every arrow but the one at the teacher's path.
    expect(directed).toBe(7);
  });

  it("names no path the ladder does not: the toolkit is one audience's up, not three", () => {
    const toolkit = AUDIENCE_LADDER.flatMap((level) =>
      Object.values(getLevelHints(level)).filter((h) => h.href === "/paths/self-coaching-toolkit"),
    );
    // Beginner's up and teacher's down: the two rungs adjacent to intermediate.
    expect(toolkit.length).toBe(2);
  });

  /**
   * The arrows have to be mounted somewhere, or the three tests above pass
   * against a component no reader sees. That was the state from 2026-08-22,
   * when the path page's syllabus rewrite dropped `<LevelRedirect
   * context="path">`, to 2026-09-21, when entry 247 re-derived the arrows
   * and tested all five audiences against a component with no page (tracker
   * entry 250). The audience hubs are where the ladder is, so they mount it.
   */
  it("is mounted with the path context by the audience hubs", () => {
    const source = fs.readFileSync(
      path.join(ROOT, "src", "app", "learn", "[audience]", "page.tsx"),
      "utf-8",
    );
    expect(source).toMatch(/import \{ LevelRedirect \} from "@\/components\/LevelRedirect"/);
    const mounts = source.match(/<LevelRedirect\s+level=\{typedAudience\}\s+context="path"\s*\/>/g);
    // Once per branch of the beginner/other split; each hub renders one.
    expect(mounts?.length).toBeGreaterThanOrEqual(1);
  });

  it.runIf(built)("renders at least one hint link on every built audience hub", () => {
    expect(AUDIENCE_LADDER.length).toBe(5);
    for (const level of AUDIENCE_LADDER) {
      const html = fs.readFileSync(path.join(APP, "learn", `${level}.html`), "utf-8");
      const block = html.split(`data-level-redirect="${level}"`)[1]?.split("</div>")[0] ?? "";
      expect(block, `${level}: no level-redirect block`).not.toBe("");

      const links = block.match(/<a [^>]*href="\/paths\/[a-z0-9-]+"/g) ?? [];
      expect(links.length, `${level}: hint links`).toBeGreaterThanOrEqual(1);
      // Every rung but the ends has both a down and an up.
      const rank = audienceRank(level);
      const expected = (rank > 0 ? 1 : 0) + (rank < AUDIENCE_LADDER.length - 1 ? 1 : 0);
      expect(links.length, `${level}: arrows`).toBe(expected);

      // The voice the unit test asserts on, surviving the build.
      const text = block.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
      expect(text, level).toMatch(/\? (Try|Start with) /);
      // And the direction, for every arrow that has one.
      const directed = Object.values(getLevelHints(level)).filter((h) => h.direction).length;
      const said = (text.match(/ — it (works inward|works outward|returns to the core)/g) ?? [])
        .length;
      expect(said, `${level}: directions`).toBe(directed);
    }
  });
});
