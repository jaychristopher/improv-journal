import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATEGORY_HEADINGS,
  GROUP_SIZES,
  poolForRoom,
  SESSION_LONG_AT,
  SESSION_NUDGE_AT,
  variantFor,
  WOULD_YOU_RATHER_BANK,
  WOULD_YOU_RATHER_ROOMS,
  WOULD_YOU_RATHER_VARIANTS,
  type WouldYouRatherCategory,
} from "../would-you-rather-bank";
import { deal, OPENING_PAIRS } from "../would-you-rather-game";

/**
 * The hero deals from a bank; the page publishes a list. If the two drift, the
 * tool starts offering pairs the page does not contain — which is the failure
 * the prompt bank's own agreement test exists to stop, and this is the same
 * arrangement for /would-you-rather-questions (2026-09-23).
 *
 * The article is the source of truth in both directions: every bullet under
 * one of the 8 question headings is a row here, and every row is a bullet
 * there. 164 on the day this was written, which is also the number in the
 * page's title.
 */
const ARTICLE = path.join(process.cwd(), "content", "bridges", "would-you-rather-questions.md");

/** The article's question bullets, by heading. */
function articlePairs(): Map<string, string[]> {
  const body = fs.readFileSync(ARTICLE, "utf8").split("---")[2];
  const found = new Map<string, string[]>();
  let heading: string | null = null;
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+)$/.exec(line);
    if (h) {
      heading = h[1].trim();
      continue;
    }
    const bullet = /^-\s+(.+\?)\s*$/.exec(line);
    if (!bullet || !heading) continue;
    found.set(heading, [...(found.get(heading) ?? []), bullet[1].trim()]);
  }
  return found;
}

describe("the would-you-rather bank", () => {
  it("holds every question the article lists, and no others", () => {
    const article = articlePairs();
    // Guard the guard: a broken parse would agree with an empty bank.
    expect(WOULD_YOU_RATHER_BANK.length).toBeGreaterThanOrEqual(160);
    expect(article.size).toBeGreaterThanOrEqual(8);

    for (const [category, heading] of Object.entries(CATEGORY_HEADINGS)) {
      const fromArticle = article.get(heading);
      expect(fromArticle, `${heading} is a heading in the article`).toBeDefined();
      const rows = WOULD_YOU_RATHER_BANK.filter((p) => p.category === category);
      expect(rows.length, category).toBe(fromArticle!.length);

      // Each row must reassemble into a bullet the article actually carries.
      // The article separates the options with ", or ", except one pair that
      // has no comma, so both spellings are accepted here.
      const bullets = new Set(fromArticle!);
      for (const row of rows) {
        const comma = `${row.left}, or ${row.right}?`;
        const plain = `${row.left} or ${row.right}?`;
        expect(
          bullets.has(comma) || bullets.has(plain),
          `${row.id}: "${comma}" is not a bullet in the article`,
        ).toBe(true);
      }
    }

    const total = [...article.values()].reduce((n, list) => n + list.length, 0);
    expect(WOULD_YOU_RATHER_BANK.length).toBe(total);
  });

  it("gives every pair a unique id and two non-empty sides", () => {
    const ids = new Set(WOULD_YOU_RATHER_BANK.map((p) => p.id));
    expect(ids.size).toBe(WOULD_YOU_RATHER_BANK.length);
    const empty = WOULD_YOU_RATHER_BANK.filter((p) => !p.left.trim() || !p.right.trim());
    expect(empty.map((p) => p.id)).toEqual([]);
  });
});

describe("who the room deals to", () => {
  /**
   * The kids room is the one that has to be right rather than merely
   * reasonable. It draws from the 3 sets whose own intros describe small
   * concrete stakes, light momentum and absurd-but-reasonable premises, and
   * from none of the 4 whose subject is work, money, sex or regret.
   */
  it("never deals an adult set into the kids room", () => {
    const forbidden: WouldYouRatherCategory[] = ["adults", "hard", "deep", "couples"];
    const pool = poolForRoom("kids");
    expect(pool.length).toBeGreaterThanOrEqual(60);
    const leaked = pool.filter((p) => forbidden.includes(p.category)).map((p) => p.id);
    expect(leaked).toEqual([]);
  });

  it("gives every room more pairs than a session can use", () => {
    for (const room of WOULD_YOU_RATHER_ROOMS) {
      // A session is 10 to 15 pairs; a room that runs dry inside one would
      // repeat itself in front of the people it was dealt to.
      expect(poolForRoom(room.id).length, room.id).toBeGreaterThan(SESSION_LONG_AT * 2);
    }
  });

  it("draws only from sets the article publishes", () => {
    const known = new Set(Object.keys(CATEGORY_HEADINGS));
    for (const room of WOULD_YOU_RATHER_ROOMS) {
      for (const category of room.categories) {
        expect(known.has(category), `${room.id} draws ${category}`).toBe(true);
      }
    }
  });
});

describe("the variant for a group", () => {
  /**
   * The article names sizes for 3 of the 4 variants — two-player, the round
   * at "six to ten", split-the-room at "twenty or more" — and calls the vote
   * one "much better for a large group" without a number. These assertions
   * are the named sizes; the bands between them are `variantFor`'s reading
   * and are asserted as continuity rather than as the article's own words.
   */
  it("matches the sizes the article names", () => {
    expect(variantFor(2).id).toBe("two-player");
    expect(variantFor(6).id).toBe("round");
    expect(variantFor(10).id).toBe("round");
    expect(variantFor(20).id).toBe("split");
    expect(variantFor(60).id).toBe("split");
  });

  it("answers every group size, with no gap between the bands", () => {
    for (let people = 2; people <= 40; people++) {
      expect(variantFor(people), `${people} people`).toBeDefined();
    }
    const offered = GROUP_SIZES.map((size) => variantFor(size.people).id);
    expect(new Set(offered).size, "one button per variant").toBe(WOULD_YOU_RATHER_VARIANTS.length);
  });
});

describe("dealing", () => {
  it("opens with the light set where the room has one", () => {
    // The fun set's own introduction: "These are the ones for the first ten
    // minutes, before anybody is willing to defend a position."
    for (let dealt = 0; dealt < OPENING_PAIRS; dealt++) {
      const { pair } = deal("friends", new Set(), dealt, () => 0.5);
      expect(pair?.category, `pair ${dealt + 1}`).toBe("fun");
    }
    const later = deal("friends", new Set(), OPENING_PAIRS, () => 0.5);
    expect(later.pair).toBeTruthy();
  });

  it("never repeats until the room's pool is exhausted", () => {
    const seen = new Set<string>();
    const pool = poolForRoom("adults");
    for (let i = 0; i < pool.length; i++) {
      const { pair, wrapped } = deal("adults", seen, i, () => Math.random());
      expect(wrapped, `wrapped early at ${i}`).toBe(false);
      expect(pair, `ran out at ${i}`).toBeTruthy();
      expect(seen.has(pair!.id)).toBe(false);
      seen.add(pair!.id);
    }
    // One past the end: the caller is told to forget rather than shown nothing.
    const after = deal("adults", seen, pool.length, () => Math.random());
    expect(after.wrapped).toBe(true);
    expect(after.pair).toBeTruthy();
  });

  it("nudges before it stops nagging", () => {
    expect(SESSION_NUDGE_AT).toBeLessThan(SESSION_LONG_AT);
  });
});
