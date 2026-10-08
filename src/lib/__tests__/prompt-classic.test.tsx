// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { PromptGenerator } from "@/components/PromptGenerator";
import {
  CLASSIC_KIND,
  CLASSIC_PARTS,
  classicLine,
  DEFAULT_USE_CASE,
  PROMPT_BANK,
  PROMPT_CATEGORIES,
  PROMPT_KINDS,
  PROMPT_USE_CASES,
  type PromptCategory,
} from "@/lib/prompt-bank";
import { poolFor, SEEN_STORAGE_KEY } from "@/lib/prompt-generator";

/**
 * What the field had and this generator did not, on 2026-09-30
 * (docs/improv-prompts-competitors.md): a who-where-what draw, a lock on part
 * of it, keys for a host at a laptop, a clock, and
 * the cast and a coaching line on a card. Each landed without a control the
 * prompt step did not already have, and this holds each one to the rule it
 * was built under.
 */
function openTo(kindLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: kindLabel }));
  return screen.getByRole("dialog");
}

function lineText(dialog: HTMLElement, part: string): string {
  return dialog.querySelector(`[data-testid="classic-${part}"]`)?.textContent ?? "";
}

function generated(): number {
  return trackMock.mock.calls.filter((c) => c[0] === "prompt_generated").length;
}

/** Leave one prompt of a category unseen, so the next draw has to be it. */
function leaveOnly(category: PromptCategory, text: string) {
  const ids = PROMPT_BANK.filter((p) => p.category === category && p.text !== text).map(
    (p) => p.id,
  );
  window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(ids));
}

describe("the classic kind", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("is offered first, and draws one ranked line from each of three pools", () => {
    expect(PROMPT_KINDS[0].id).toBe("classic");
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(CLASSIC_KIND.label);
    for (const part of CLASSIC_PARTS) {
      const pool = poolFor(PROMPT_BANK, part, DEFAULT_USE_CASE, { combinable: true });
      expect(
        // classicLine, not text: the What renders its own phrasing and the
        // other two fall through to the prompt (2026-10-08).
        pool.map((p) => classicLine(p)),
        part,
      ).toContain(lineText(dialog, part));
    }
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ category: "classic" }),
    );
    // And the three lines and the controls are all it carries: the how-to
    // sentence came off the slide on 2026-10-08 and lives in the tool page's
    // own prose, which is where it was already being duplicated from.
    expect(dialog.textContent).not.toContain(CLASSIC_KIND.howToUse);
  });

  it("puts no cast in the What on the card itself", () => {
    // The data is held above; this is the surface, because the card could
    // render `prompt.text` and pass every assertion about `prompt.line`.
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(CLASSIC_KIND.label);
    const what = dialog.querySelector('[data-testid="classic-task"]')?.textContent ?? "";
    const lines = new Set(
      PROMPT_BANK.filter((p) => p.category === "task" && p.combinable).map((p) => classicLine(p)),
    );
    expect(what.length).toBeGreaterThan(5);
    expect(lines.has(what), what).toBe(true);
    expect(what).not.toMatch(/\b(someone|two people|a person|people)\b/i);
  });

  it("redraws only the line that was tapped", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(CLASSIC_KIND.label);
    const before = Object.fromEntries(CLASSIC_PARTS.map((p) => [p, lineText(dialog, p)]));
    fireEvent.click(dialog.querySelector('[data-part="location"]') as HTMLElement);
    expect(lineText(dialog, "location")).not.toBe(before.location);
    expect(lineText(dialog, "relationship")).toBe(before.relationship);
    expect(lineText(dialog, "task")).toBe(before.task);
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_line_redrawn",
      expect.objectContaining({ part: "location" }),
    );
  });

  it("copies all three lines, one per line", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(CLASSIC_KIND.label);
    fireEvent.click(within(dialog).getByRole("button", { name: /^copy$/i }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0][0] as string;
    expect(copied.split("\n")).toHaveLength(3);
    for (const part of CLASSIC_PARTS) expect(copied).toContain(lineText(dialog, part));
  });

  it("never draws a line the bank says does not combine", () => {
    for (const room of PROMPT_USE_CASES) {
      for (const part of CLASSIC_PARTS) {
        const pool = poolFor(PROMPT_BANK, part, room.id, { combinable: true });
        expect(pool.every((p) => p.combinable)).toBe(true);
        // A reader who picks the narrowest room still gets a session's worth per line.
        expect(pool.length, `${room.id}/${part}`).toBeGreaterThanOrEqual(20);
      }
    }
    // Nothing outside the three parts ever combines.
    const outside = PROMPT_BANK.filter(
      (p) => p.combinable && !CLASSIC_PARTS.includes(p.category as (typeof CLASSIC_PARTS)[number]),
    );
    expect(outside).toEqual([]);
  });
});

describe("the keys and the clock", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("draws another on Enter or Space and changes kind on K, from the page and not from a button", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[0].label);
    expect(generated()).toBe(1);
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(generated()).toBe(2);
    fireEvent.keyDown(document.body, { key: " " });
    expect(generated()).toBe(3);
    // A focused control keeps its own meaning for Space.
    const another = within(dialog).getByRole("button", { name: /next/i });
    fireEvent.keyDown(another, { key: " " });
    expect(generated()).toBe(3);
    fireEvent.keyDown(document.body, { key: "k" });
    expect(within(dialog).getByRole("button", { name: CLASSIC_KIND.label })).toBeTruthy();
  });

  it("shows no clock until the cog sets an interval", () => {
    // It used to count up on every slide, beside how many were left. Both came
    // off on 2026-10-08: a stopwatch nobody started is not a reason to take a
    // line. The countdown when an interval *is* set is still there, and is
    // covered in prompt-generator-component, because then the card moves on by
    // itself and the clock is that feature saying when.
    render(<PromptGenerator surface="tool-page" />);
    openTo(PROMPT_CATEGORIES[0].label);
    expect(screen.getByTestId("prompt-text")).toBeTruthy();
    expect(document.querySelector('[data-testid="prompt-clock"]')).toBeNull();
  });
});

describe("what a row can say", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("keeps every coaching line short, and there are enough of them to meet", () => {
    const coached = PROMPT_BANK.filter((p) => p.coach);
    // 19 on 2026-09-30, on the strongest prompts of each kind; 38 after the
    // school relationships and audience questions landed the same day (PG-1).
    expect(coached.length).toBeGreaterThanOrEqual(35);
    for (const p of coached) expect(p.coach!.length, p.text).toBeLessThanOrEqual(110);
  });

  it("keeps the coaching line off the slide, on the prompt that carries one", () => {
    // Printed under every coached prompt until 2026-10-08, when the slide was
    // cut back to the prompt and the controls. The rows still carry their
    // coaching — the test above holds that data and its length — and nothing
    // prints it. If it is given a home again it should be one a reader opts
    // into, rather than a line competing with the prompt.
    leaveOnly("first-line", "She has your eyes.");
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[1].label);
    expect(dialog.querySelector('[data-testid="prompt-text"]')?.textContent).toBe(
      "She has your eyes.",
    );
    const row = PROMPT_BANK.find((p) => p.text === "She has your eyes.");
    expect(row?.coach).toContain("Whoever hears it decides who she is");
    expect(dialog.querySelector('[data-testid="prompt-coach"]')).toBeNull();
  });

  it("says who a prompt needs when the row says so, and links the pair guide", () => {
    leaveOnly("task", "Two people folding a fitted sheet");
    render(<PromptGenerator surface="tool-page" />);
    const task = PROMPT_CATEGORIES.find((c) => c.id === "task")!;
    const dialog = openTo(task.label);
    const cast = dialog.querySelector('[data-testid="prompt-cast"]');
    expect(cast?.textContent).toContain("Works for two");
    expect(cast?.querySelector("a")?.getAttribute("href")).toBe("/2-person-improv-games");
  });

  it("names the classic's heading in the guide, as every kind must", () => {
    const md = fs.readFileSync(
      path.join(process.cwd(), "content/bridges/improv-prompts.md"),
      "utf8",
    );
    const headings = md
      .split("\n")
      .filter((line) => /^## /.test(line))
      .map((line) => line.replace(/^## /, "").trim());
    for (const kind of PROMPT_KINDS) expect(headings, kind.id).toContain(kind.heading);
  });
});

/**
 * Each line of the classic may name its own axis and no other.
 *
 * Reported on 2026-10-07: "each of the 'who' 'what' and 'where' often has all
 * three inside each of them". The three pools were correctly categorised by
 * subject the whole time, so the audit above passed and the bug was real. What
 * had gone wrong is that `combinable` is opt-out — `CLASSIC_SET.has(category)
 * && !flags.includes("x")` — so a row joins the classic unless whoever added it
 * remembered to type `x`. A later batch of task lines written as trades did
 * not: "Two movers and a piano on a landing" brings its own cast *and* its own
 * venue, so it was drawn as the What under a Who of "a driving instructor and a
 * student" and a Where of "a laundromat", contradicting both.
 *
 * The test above this one checks the flag is *respected*. It cannot fail on a
 * flag that is wrong, which is why it passed throughout. These two check the
 * flag is *correct*, mechanically, so the next unmarked batch fails the suite
 * instead of reaching a reader.
 *
 * The third case — a relationship that states its venue outright, as in "the
 * passenger who has never been on a boat" — is not caught here. Distinguishing
 * a stated place from an object or a shared history ("in a band together", "at
 * the same map") needs judgement rather than a lexicon, and the two in the bank
 * on 2026-10-07 were flagged by hand. That remainder is why this is two rules
 * and not three.
 */
describe("the classic's lines name one axis each", () => {
  /** An occupation or a named relationship: these say who the people are. */
  const ROLE =
    /\b(mover|locksmith|waiter|groomer|electrician|decorator|learner|examiner|farmer|pharmacist|stagehand|lifeguard|plumber|teacher|instructor|nurse|doctor|barber|chef|cleaner|driver|guard|receptionist|librarian|owner|customer|client|patient|student|pupil|coach|manager|boss|colleague|friend|parent|sibling|roommate|housemate|neighbour|cousin|swimmer|tailor|florist|gardener|priest|referee|apprentice|deckhand|passenger)s?\b/i;
  /** People placed in the scene. The possessive is excluded: "someone's
   *  childhood bedroom" says whose the room is, which is a place. */
  const CAST = /\b(someone|somebody|a person|two people|one person|a man|a woman)\b(?!'s)/i;

  it("gives the What no cast of its own", () => {
    const pool = PROMPT_BANK.filter((p) => p.category === "task" && p.combinable);
    // Guard the guard: a changed flag or selector must fail, not pass vacuously.
    expect(pool.length).toBeGreaterThanOrEqual(55);
    expect(pool.filter((p) => ROLE.test(p.text)).map((p) => p.text)).toEqual([]);
  });

  it("puts nobody in the Where", () => {
    const pool = PROMPT_BANK.filter((p) => p.category === "location" && p.combinable);
    expect(pool.length).toBeGreaterThanOrEqual(70);
    expect(pool.filter((p) => CAST.test(p.text)).map((p) => p.text)).toEqual([]);
  });

  /**
   * Reported on 2026-10-08: "why say 'two neighbours' then 'two people' - we
   * already know its two people", on a draw whose Who was "Two neighbours who
   * only ever meet on recycling day" and whose What was "Two people setting a
   * table for more guests than there are chairs".
   *
   * The rule the test below this one enforces was too weak: it allowed a task
   * to name its cast generically, on the reasoning that "two people" collides
   * with nothing. It collides with the Who, which has already said who is
   * there, and sometimes it contradicts the count — a group photo "of people
   * who will not stand still" put a crowd on a card whose Who named a pair.
   *
   * So a What names nobody. It may point back at the pair the Who established
   * ("the other", "one of them", "neither of them"), since that refers to the
   * cast rather than adding to it and several of these tasks need the
   * asymmetry; it introduces no one new and counts no one.
   */
  it("gives every drawable What a phrasing with nobody in it", () => {
    const tasks = PROMPT_BANK.filter((p) => p.category === "task" && p.combinable);
    expect(tasks.length).toBeGreaterThanOrEqual(55);
    // A missing line must fail rather than fall back to the prompt's own
    // wording, which is the wording this is here to keep off the card.
    expect(tasks.filter((p) => !p.line).map((p) => p.text)).toEqual([]);

    const NAMES_PEOPLE =
      /\b(someone|somebody|people|persons?|a man|a woman|guests|crowd|everyone|anybody)\b/i;
    const naming = tasks.map((p) => classicLine(p)).filter((line) => NAMES_PEOPLE.test(line));
    expect(naming).toEqual([]);
  });

  it("leaves the prompt itself alone, because it is a whole prompt elsewhere", () => {
    // The line is a second phrasing, not a rewrite. Drawn on its own a task is
    // a complete prompt and reads as one, and the guide and
    // improv-games-for-kids list it that way; only the classic card uses the
    // short form. If these ever became the same string the guide's
    // drama-class list would be half rewritten, since it mixes these with
    // prompts that are not combinable and keep their people on purpose.
    const folding = PROMPT_BANK.find((p) => p.text === "Two people folding a fitted sheet");
    expect(folding?.line).toBe("Folding a fitted sheet");
    expect(folding?.text).toBe("Two people folding a fitted sheet");
  });

  it("keeps the excluded lines in the bank, where they are still good prompts", () => {
    // `x` removes a line from the classic; it does not delete it. These are
    // complete scene starters and the single draw still offers every one.
    const excluded = PROMPT_BANK.filter(
      (p) => CLASSIC_PARTS.includes(p.category as (typeof CLASSIC_PARTS)[number]) && !p.combinable,
    );
    expect(excluded.length).toBeGreaterThanOrEqual(85);
    expect(excluded.map((p) => p.text)).toContain("Two movers and a piano on a landing");
  });
});
