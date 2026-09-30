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
 * of it, keys for a host at a laptop, a list of what was dealt, a clock, and
 * the cast and a coaching line on a card. Each landed without a control the
 * prompt step did not already have, and this holds each one to the rule it
 * was built under.
 */
function openTo(kindLabel: string, room = PROMPT_USE_CASES[0].label) {
  fireEvent.click(screen.getByRole("button", { name: room }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: kindLabel }));
  return dialog;
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
      const pool = poolFor(PROMPT_BANK, part, PROMPT_USE_CASES[0].id, { combinable: true });
      expect(
        pool.map((p) => p.text),
        part,
      ).toContain(lineText(dialog, part));
    }
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ category: "classic" }),
    );
    // The concept under it is the classic's own, base reality.
    expect(dialog.textContent).toContain(CLASSIC_KIND.howToUse);
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
    // One card, not two: the session list holds the card with its new line.
    const history = dialog.querySelector('[data-testid="prompt-history"]');
    expect(history?.querySelectorAll("li")).toHaveLength(1);
    expect(history?.textContent).toContain(lineText(dialog, "location"));
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

describe("the keys, the session list and the clock", () => {
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
    const another = within(dialog).getByRole("button", { name: /another/i });
    fireEvent.keyDown(another, { key: " " });
    expect(generated()).toBe(3);
    fireEvent.keyDown(document.body, { key: "k" });
    expect(within(dialog).getByRole("button", { name: CLASSIC_KIND.label })).toBeTruthy();
  });

  it("lists what was drawn this session, newest first, below the buttons", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[0].label);
    const texts: string[] = [];
    texts.push(dialog.querySelector('[data-testid="prompt-text"]')?.textContent ?? "");
    for (let i = 0; i < 2; i++) {
      fireEvent.click(within(dialog).getByRole("button", { name: /another/i }));
      texts.push(dialog.querySelector('[data-testid="prompt-text"]')?.textContent ?? "");
    }
    const items = [...dialog.querySelectorAll('[data-testid="prompt-history"] li')].map(
      (li) => li.textContent,
    );
    expect(items).toEqual([...texts].reverse());
    // The list sits after the buttons in reading order.
    const buttons = within(dialog).getByRole("button", { name: /another/i });
    const list = dialog.querySelector('[data-testid="prompt-history"]') as HTMLElement;
    expect(buttons.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows how long the current prompt has been up, with no control to set", () => {
    render(<PromptGenerator surface="tool-page" />);
    openTo(PROMPT_CATEGORIES[0].label);
    expect(screen.getByTestId("prompt-clock").textContent).toMatch(/^\d+:\d\d on this one$/);
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
    // 19 on 2026-09-30, on the strongest prompts of each kind.
    expect(coached.length).toBeGreaterThanOrEqual(15);
    for (const p of coached) expect(p.coach!.length, p.text).toBeLessThanOrEqual(110);
  });

  it("shows the coaching line under the prompt that carries it", () => {
    leaveOnly("first-line", "She has your eyes.");
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[1].label);
    expect(dialog.querySelector('[data-testid="prompt-text"]')?.textContent).toBe(
      "She has your eyes.",
    );
    expect(dialog.querySelector('[data-testid="prompt-coach"]')?.textContent).toContain(
      "Whoever hears it decides who she is",
    );
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
