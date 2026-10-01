// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { PromptGenerator } from "@/components/PromptGenerator";
import {
  DEFAULT_USE_CASE,
  PROMPT_BANK,
  PROMPT_CATEGORIES,
  PROMPT_KINDS,
  PROMPT_USE_CASES,
  WORD_BANK,
  WORD_KIND,
} from "@/lib/prompt-bank";
import { poolFor, SEEN_STORAGE_KEY } from "@/lib/prompt-generator";

const SETTINGS_KEY = "improv-prompts:settings:v1";
const textsInBank = new Set(PROMPT_BANK.map((p) => p.text));

function readSeen(): string[] {
  const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

/** The one question: a kind, and the dialog opens on a prompt of it. */
function openWith(kindLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: kindLabel }));
  return screen.getByRole("dialog");
}

function openSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Settings" }));
  return screen.getByRole("dialog");
}

/**
 * The hero on /improv-prompts is this component. Its whole value is the loop
 * of open, draw, draw again, close — so that loop is what the guard
 * exercises, against the real bank rather than fixtures. Since 2026-09-30
 * the first tap is the kind of start and the room lives behind the cog,
 * blended by default; the last four tests hold that.
 */
describe("PromptGenerator", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders every kind inline, so the server html already offers a way in", () => {
    render(<PromptGenerator surface="guide-hero" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    // 8 on 2026-09-30: the classic, one word for a longform opening, and the
    // six kinds of scene starter (PG-2).
    expect(PROMPT_KINDS.length).toBe(8);
    for (const kind of PROMPT_KINDS) {
      expect(screen.getByRole("button", { name: kind.label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Settings" })).toBeTruthy();
  });

  it("takes over the viewport on the first tap, straight onto a prompt, with a way out", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openWith(PROMPT_CATEGORIES[0].label);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(dialog).getByTestId("prompt-text")).toBeTruthy();
    expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generator_opened",
      expect.objectContaining({ use_case: DEFAULT_USE_CASE, category: PROMPT_CATEGORIES[0].id }),
    );
  });

  it("offers every kind of prompt the article has a section for, one step back", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openWith(PROMPT_CATEGORIES[0].label);
    fireEvent.click(within(dialog).getByRole("button", { name: /different kind/i }));
    for (const category of PROMPT_CATEGORIES) {
      expect(within(dialog).getByRole("button", { name: category.label })).toBeTruthy();
    }
  });

  it("draws a real prompt and remembers it in the browser", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_CATEGORIES[0].label);
    const shown = screen.getByTestId("prompt-text").textContent ?? "";
    expect(textsInBank.has(shown), shown).toBe(true);
    expect(readSeen().length).toBe(1);
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ category: PROMPT_CATEGORIES[0].id, use_case: DEFAULT_USE_CASE }),
    );
  });

  it("gives a different prompt every time until the pool runs dry", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_CATEGORIES[0].label);

    // Blended: the whole category, nothing filtered out.
    const pool = poolFor(PROMPT_BANK, PROMPT_CATEGORIES[0].id, DEFAULT_USE_CASE);
    expect(pool.length).toBe(
      PROMPT_BANK.filter((p) => p.category === PROMPT_CATEGORIES[0].id).length,
    );
    const seenTexts = new Set<string>();
    seenTexts.add(screen.getByTestId("prompt-text").textContent ?? "");
    for (let i = 1; i < pool.length; i++) {
      fireEvent.click(screen.getByRole("button", { name: /another/i }));
      const text = screen.getByTestId("prompt-text").textContent ?? "";
      expect(seenTexts.has(text), text).toBe(false);
      seenTexts.add(text);
    }
    expect(seenTexts.size).toBe(pool.length);
    expect(readSeen().length).toBe(pool.length);

    // One more and the pool is dry: the tool says so and offers a fresh start.
    fireEvent.click(screen.getByRole("button", { name: /another/i }));
    expect(screen.queryByTestId("prompt-text")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /start again/i }));
    expect(textsInBank.has(screen.getByTestId("prompt-text").textContent ?? "")).toBe(true);
    expect(readSeen().length).toBe(1);
  });

  it("closes from the corner button and from the Escape key", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_CATEGORIES[0].label);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    // Focus lands back on the button that opened it, not on the body. On the
    // live site it landed on the body, because the restore ran while the card
    // behind the dialog was still inert.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: PROMPT_CATEGORIES[0].label }),
    );

    openWith(PROMPT_CATEGORIES[1].label);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trackMock).toHaveBeenCalledWith("prompt_generator_closed", expect.any(Object));
  });

  it("lets the reader step back to change the kind of prompt without closing", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_CATEGORIES[0].label);
    fireEvent.click(screen.getByRole("button", { name: /different kind/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: PROMPT_CATEGORIES[1].label })).toBeTruthy();
  });

  it("opens the settings from the cog, and Done goes back to the question or the card", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openSettings();
    expect(within(dialog).getByTestId("prompt-settings")).toBeTruthy();
    for (const room of PROMPT_USE_CASES) {
      expect(within(dialog).getByRole("button", { name: new RegExp(room.label) })).toBeTruthy();
    }
    // Nothing drawn yet, so Done lands on the question.
    fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
    expect(within(dialog).getByRole("heading", { name: /what kind of start/i })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: PROMPT_CATEGORIES[0].label }));
    const shown = within(dialog).getByTestId("prompt-text").textContent;
    // With a card up, the cog in the header opens the settings and Done
    // returns to the same card.
    fireEvent.click(within(dialog).getByRole("button", { name: "Settings" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
    expect(within(dialog).getByTestId("prompt-text").textContent).toBe(shown);
  });

  it("never hands a school room a prompt the article says to keep out, once the cog says school", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const school = PROMPT_USE_CASES.find((u) => u.id === "school");
    expect(school).toBeDefined();
    if (!school) return;
    const dialog = openSettings();
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(school.label) }));
    // The setting is on the device, so a teacher sets it once.
    expect(window.localStorage.getItem(SETTINGS_KEY)).toContain('"school"');
    fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
    const relationship = PROMPT_CATEGORIES.find((c) => c.id === "relationship");
    if (!relationship) return;
    fireEvent.click(within(dialog).getByRole("button", { name: relationship.label }));
    // The header says which room is set; blended, it says only the kind.
    expect(dialog.textContent).toContain(school.label);

    const byText = new Map(PROMPT_BANK.map((p) => [p.text, p]));
    const pool = poolFor(PROMPT_BANK, "relationship", "school");
    expect(pool.length).toBeLessThan(
      PROMPT_BANK.filter((p) => p.category === "relationship").length,
    );
    for (let i = 0; i < pool.length; i++) {
      const text = screen.getByTestId("prompt-text").textContent ?? "";
      const prompt = byText.get(text);
      expect(prompt, text).toBeDefined();
      expect(prompt?.personal || prompt?.adult || prompt?.loud, text).toBeFalsy();
      if (i < pool.length - 1) fireEvent.click(screen.getByRole("button", { name: /another/i }));
    }
  });

  it("reads the room back from the device on the next visit", () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ room: "show" }));
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openWith(PROMPT_CATEGORIES[0].label);
    expect(dialog.textContent).toContain("A show, with an audience");
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ use_case: "show" }),
    );
    // A room the bank does not know falls back to the blend rather than crashing.
    cleanup();
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ room: "banana" }));
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_CATEGORIES[0].label);
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ use_case: DEFAULT_USE_CASE }),
    );
  });

  it("forgets what this device has seen from the settings, so every pool starts again", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openWith(PROMPT_CATEGORIES[0].label);
    fireEvent.click(within(dialog).getByRole("button", { name: /another/i }));
    expect(readSeen().length).toBe(2);
    fireEvent.click(within(dialog).getByRole("button", { name: "Settings" }));
    const forget = within(dialog).getByRole("button", { name: /forget what this device/i });
    fireEvent.click(forget);
    expect(readSeen().length).toBe(0);
    expect(within(dialog).getByRole("button", { name: /forgotten/i })).toBeTruthy();
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generator_reset",
      expect.objectContaining({ category: "all" }),
    );
  });

  it("deals a hand of as many as the cog says, all different, all remembered", () => {
    // Andi Smith's generator deals one to eight at once; a teacher handing
    // prompts to pairs is who that is for. Here it is a setting, not a row of
    // buttons under the card.
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openSettings();
    fireEvent.click(within(dialog).getByRole("button", { name: "4" }));
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}").count).toBe(4);
    fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: PROMPT_CATEGORIES[0].label }));
    const items = within(dialog)
      .getAllByTestId("prompt-item")
      .map((li) => li.textContent?.replace(/^\d+/, "") ?? "");
    expect(items).toHaveLength(4);
    expect(new Set(items).size).toBe(4);
    for (const text of items) expect(textsInBank.has(text), text).toBe(true);
    expect(readSeen().length).toBe(4);
    expect(within(dialog).queryByTestId("prompt-text")).toBeNull();
    // The hand has focus, so a screen reader reads all four.
    expect(document.activeElement).toBe(within(dialog).getByTestId("prompt-set"));
    fireEvent.click(within(dialog).getByRole("button", { name: /another hand/i }));
    expect(readSeen().length).toBe(8);
    // The classic ignores the count: one card, three lines.
    fireEvent.click(within(dialog).getByRole("button", { name: /different kind/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: PROMPT_KINDS[0].label }));
    expect(within(dialog).getByTestId("classic-card")).toBeTruthy();
    expect(within(dialog).queryAllByTestId("prompt-item")).toHaveLength(0);
  });

  it("changes the card on its own when the cog sets a time, and counts it down", () => {
    vi.useFakeTimers();
    try {
      window.localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify({ room: "any", count: 1, every: 30 }),
      );
      render(<PromptGenerator surface="guide-hero" />);
      const dialog = openWith(PROMPT_CATEGORIES[0].label);
      const first = within(dialog).getByTestId("prompt-text").textContent;
      expect(within(dialog).getByTestId("prompt-clock").textContent).toMatch(/until the next$/);
      act(() => vi.advanceTimersByTime(29_000));
      expect(within(dialog).getByTestId("prompt-text").textContent).toBe(first);
      act(() => vi.advanceTimersByTime(1_500));
      expect(within(dialog).getByTestId("prompt-text").textContent).not.toBe(first);
      expect(trackMock).toHaveBeenCalledWith(
        "prompt_generator_auto",
        expect.objectContaining({ every: 30 }),
      );
      // Off by default: with no time set the clock counts up and nothing moves.
      fireEvent.click(within(dialog).getByRole("button", { name: "Settings" }));
      fireEvent.click(within(dialog).getByRole("button", { name: /^off$/i }));
      fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
      const held = within(dialog).getByTestId("prompt-text").textContent;
      act(() => vi.advanceTimersByTime(60_000));
      expect(within(dialog).getByTestId("prompt-text").textContent).toBe(held);
      expect(within(dialog).getByTestId("prompt-clock").textContent).toMatch(/on this one$/);
    } finally {
      vi.useRealTimers();
    }
  });
  it("deals a word from its own bank, never twice, in hands, and keeps a school room to the safe ones", () => {
    const words = new Map(WORD_BANK.map((w) => [w.text, w]));
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openWith(WORD_KIND.label);
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const text = within(dialog).getByTestId("prompt-text").textContent ?? "";
      expect(words.has(text), text).toBe(true);
      expect(seen.has(text), text).toBe(false);
      seen.add(text);
      fireEvent.click(within(dialog).getByRole("button", { name: /another one/i }));
    }
    expect(readSeen().filter((id) => id.startsWith("word:"))).toHaveLength(21);
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ category: "word" }),
    );
    // A hand of four, in a school room: none that lands on a life or needs a job.
    fireEvent.click(within(dialog).getByRole("button", { name: "Settings" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "4" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /a school drama room/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /another/i }));
    const hand = within(dialog)
      .getAllByTestId("prompt-item")
      .map((li) => li.textContent?.replace(/^\d+/, "") ?? "");
    expect(hand).toHaveLength(4);
    for (const text of hand) {
      const w = words.get(text);
      expect(w, text).toBeDefined();
      expect(w?.personal || w?.adult, text).toBeFalsy();
    }
    // Forgetting what the device has seen clears the word ids as well.
    fireEvent.click(within(dialog).getByRole("button", { name: "Settings" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /forget what this device/i }));
    expect(readSeen().filter((id) => id.startsWith("word:"))).toEqual([]);
  });
});
