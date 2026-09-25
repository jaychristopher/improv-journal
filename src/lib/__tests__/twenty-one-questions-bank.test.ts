import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CATEGORY_HEADINGS,
  CATEGORY_TIERS,
  LAST_QUESTION,
  PASSES_EACH,
  poolForRoom,
  tierFor,
  TOTAL,
  TWENTY_ONE_BANK,
  TWENTY_ONE_ROOMS,
  TWENTY_ONE_SEQUENCE,
  type TwentyOneCategory,
} from "../twenty-one-questions-bank";
import { deal } from "../twenty-one-questions-game";

/**
 * The hero deals from a bank; the page publishes a list. If the two drift, the
 * tool starts asking questions the page does not contain — the failure the
 * prompt bank's and the would-you-rather bank's agreement tests exist to stop,
 * and this is the same arrangement for /21-questions-game (2026-09-25).
 *
 * The article is the source of truth in both directions: every bullet under
 * one of the eight question headings is a row here and every row is a bullet
 * there, and the numbered list under "The 21, In Order" is the sequence. 160
 * rows and 21 in sequence on the day this was written, which together are the
 * 181 in the page's title.
 */
const ARTICLE = path.join(process.cwd(), "content", "bridges", "21-questions-game.md");

/** The article's question bullets by heading, and its numbered sequence. */
function article(): { bullets: Map<string, string[]>; sequence: string[] } {
  const body = fs.readFileSync(ARTICLE, "utf8").split("\n---\n")[1];
  const bullets = new Map<string, string[]>();
  const sequence: string[] = [];
  let heading: string | null = null;
  for (const line of body.split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      heading = h[1];
      continue;
    }
    const bullet = /^-\s+(.+\?)\s*$/.exec(line);
    if (bullet && heading) {
      bullets.set(heading, [...(bullets.get(heading) ?? []), bullet[1].trim()]);
    }
    const numbered = /^\d+\.\s+(.+\?)\s*$/.exec(line);
    if (numbered && heading === "The 21, In Order") sequence.push(numbered[1].trim());
  }
  return { bullets, sequence };
}

describe("the 21 questions bank", () => {
  it("holds every question the article lists, and no others", () => {
    const { bullets } = article();
    // Guard the guard: a broken parse would agree with an empty bank.
    expect(TWENTY_ONE_BANK.length).toBeGreaterThanOrEqual(150);
    expect(bullets.size).toBeGreaterThanOrEqual(8);

    for (const [category, heading] of Object.entries(CATEGORY_HEADINGS)) {
      const fromArticle = bullets.get(heading);
      expect(fromArticle, `${heading} is a heading in the article`).toBeDefined();
      const rows = TWENTY_ONE_BANK.filter((q) => q.category === category);
      expect(rows.length, category).toBe(fromArticle!.length);
      const printed = new Set(fromArticle!);
      for (const row of rows) {
        expect(printed.has(row.text), `${row.id}: "${row.text}" is not a bullet`).toBe(true);
      }
    }

    const total = [...bullets.values()].reduce((n, list) => n + list.length, 0);
    expect(TWENTY_ONE_BANK.length).toBe(total);
  });

  it("carries the article's own sequence, in its order, and ends on its last question", () => {
    const { sequence } = article();
    expect(sequence).toHaveLength(TOTAL);
    expect([...TWENTY_ONE_SEQUENCE]).toEqual(sequence);
    // "Number 21 is deliberate. It hands the last turn to them."
    expect(LAST_QUESTION).toBe(sequence[TOTAL - 1]);
    expect(LAST_QUESTION).toMatch(/not asked/);
  });

  it("adds up to the number in the title", () => {
    const title = fs.readFileSync(ARTICLE, "utf8").match(/^title:\s*"(.+)"/m)?.[1] ?? "";
    const claimed = Number(/(\d+) to Ask/.exec(title)?.[1]);
    expect(claimed).toBeGreaterThan(0);
    expect(TWENTY_ONE_BANK.length + TOTAL).toBe(claimed);
  });

  it("gives every question a unique id and non-empty text", () => {
    const ids = new Set(TWENTY_ONE_BANK.map((q) => q.id));
    expect(ids.size).toBe(TWENTY_ONE_BANK.length);
    expect(TWENTY_ONE_BANK.filter((q) => !q.text.trim()).map((q) => q.id)).toEqual([]);
  });
});

describe("who the room deals to", () => {
  /**
   * The just-met room is the one that has to be right rather than merely
   * reasonable. Its set's own intro: "lower stakes throughout, because there
   * is no trust to draw on yet — every question here can be answered in a
   * sentence without cost." So it never draws from the sets whose intros
   * assume trust already exists.
   */
  it("never deals a trusted set to somebody you have just met", () => {
    const forbidden: TwentyOneCategory[] = ["deep", "couples", "family", "like"];
    const pool = poolForRoom("met");
    expect(pool.length).toBeGreaterThanOrEqual(40);
    expect(pool.filter((q) => forbidden.includes(q.category)).map((q) => q.id)).toEqual([]);
  });

  it("gives every pool room more than a round can use, twice", () => {
    for (const room of TWENTY_ONE_ROOMS) {
      if (room.id === "sequence") continue;
      // A round is twenty-one plus up to two passes; a room that ran dry
      // inside one would repeat itself in front of the two people it was
      // dealt to. Twice, so a second game on the same device has fresh ones.
      expect(poolForRoom(room.id).length, room.id).toBeGreaterThan((TOTAL + 2 * PASSES_EACH) * 2);
    }
  });

  it("draws only from sets the article publishes", () => {
    const known = new Set(Object.keys(CATEGORY_HEADINGS));
    for (const room of TWENTY_ONE_ROOMS) {
      for (const category of room.categories) {
        expect(known.has(category), `${room.id} draws ${category}`).toBe(true);
      }
    }
    expect(TWENTY_ONE_ROOMS.find((r) => r.id === "sequence")?.categories).toEqual([]);
  });
});

describe("the order of a round", () => {
  it("starts light and finishes deep, in the article's own words", () => {
    // "Fun … the right place to spend the first third of the round."
    expect(CATEGORY_TIERS.fun).toBe("light");
    // "Deep … save these for the back half."
    expect(CATEGORY_TIERS.deep).toBe("deep");
    // "How somebody thinks … good for the middle of a round."
    expect(CATEGORY_TIERS.thinks).toBe("middle");
    expect(tierFor(1)).toBe("light");
    expect(tierFor(7)).toBe("light");
    expect(tierFor(8)).toBe("middle");
    expect(tierFor(14)).toBe("middle");
    expect(tierFor(15)).toBe("deep");
    expect(tierFor(20)).toBe("deep");
  });

  it("deals the sequence room the article's list, exactly and in order", () => {
    for (let position = 1; position <= TOTAL; position++) {
      const { question } = deal("sequence", new Set(), position);
      expect(question?.text, `position ${position}`).toBe(TWENTY_ONE_SEQUENCE[position - 1]);
    }
  });

  it("ends every room on number twenty-one", () => {
    for (const room of TWENTY_ONE_ROOMS) {
      const { question } = deal(room.id, new Set(), TOTAL);
      expect(question?.text, room.id).toBe(LAST_QUESTION);
    }
  });

  it("opens light and closes deep where the room has both", () => {
    // The friend room draws from fun and deep, so the ends of its round
    // should come from them; a fixed random keeps it deterministic.
    for (let position = 1; position <= 7; position++) {
      const { question } = deal("friend", new Set(), position, new Set(), () => 0.5);
      expect(CATEGORY_TIERS[question!.category], `position ${position}`).toBe("light");
    }
    for (let position = 15; position < TOTAL; position++) {
      const { question } = deal("friend", new Set(), position, new Set(), () => 0.5);
      expect(CATEGORY_TIERS[question!.category], `position ${position}`).toBe("deep");
    }
  });

  it("still escalates in a room that has no deep set", () => {
    // Somebody you have just met gets no deep questions; the back half of
    // that round is the heaviest that room allows, not nothing.
    const { question } = deal("met", new Set(), 18, new Set(), () => 0.5);
    expect(question).toBeTruthy();
    expect(CATEGORY_TIERS[question!.category]).toBe("middle");
  });
});

describe("dealing", () => {
  it("never repeats inside a round, and a pass replaces without repeating", () => {
    const seen = new Set<string>();
    const shown = new Set<string>();
    for (let position = 1; position < TOTAL; position++) {
      const { question, wrapped } = deal("couple", seen, position);
      expect(wrapped, `wrapped at ${position}`).toBe(false);
      expect(shown.has(question!.id), `repeat at ${position}`).toBe(false);
      shown.add(question!.id);
      seen.add(question!.id);
    }
    // One pass: the replacement is neither the passed question nor a repeat.
    const passed = [...shown][3];
    const { question: replacement } = deal("couple", seen, 4, new Set([passed]));
    expect(replacement!.id).not.toBe(passed);
    expect(shown.has(replacement!.id)).toBe(false);
  });

  it("wraps rather than going empty when a room is exhausted", () => {
    const pool = poolForRoom("like");
    const seen = new Set(pool.map((q) => q.id));
    const { question, wrapped } = deal("like", seen, 5);
    expect(wrapped).toBe(true);
    expect(question).toBeTruthy();
  });
});
