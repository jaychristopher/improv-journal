// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { PromptGenerator } from "@/components/PromptGenerator";
import { PROMPT_BANK, PROMPT_CATEGORIES, PROMPT_USE_CASES } from "@/lib/prompt-bank";
import { poolFor, SEEN_STORAGE_KEY } from "@/lib/prompt-generator";

const textsInBank = new Set(PROMPT_BANK.map((p) => p.text));

function readSeen(): string[] {
  const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

function openWith(useCaseLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: useCaseLabel }));
  return screen.getByRole("dialog");
}

/**
 * The hero on /improv-prompts is this component. Its whole value is the loop
 * of open, choose, draw, draw again, close — so that loop is what the guard
 * exercises, against the real bank rather than fixtures.
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

  it("renders the first step inline, so the server html already offers a way in", () => {
    render(<PromptGenerator surface="guide-hero" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    for (const useCase of PROMPT_USE_CASES) {
      expect(screen.getByRole("button", { name: useCase.label })).toBeTruthy();
    }
  });

  it("takes over the viewport on the first tap, with a way out in the corner", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const dialog = openWith(PROMPT_USE_CASES[0].label);
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: /close/i })).toBeTruthy();
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generator_opened",
      expect.objectContaining({ use_case: PROMPT_USE_CASES[0].id }),
    );
  });

  it("offers every kind of prompt the article has a section for", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_USE_CASES[0].label);
    for (const category of PROMPT_CATEGORIES) {
      expect(screen.getByRole("button", { name: category.label })).toBeTruthy();
    }
  });

  it("draws a real prompt and remembers it in the browser", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_USE_CASES[0].label);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_CATEGORIES[0].label }));

    const shown = screen.getByTestId("prompt-text").textContent ?? "";
    expect(textsInBank.has(shown), shown).toBe(true);
    expect(readSeen().length).toBe(1);
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generated",
      expect.objectContaining({ category: PROMPT_CATEGORIES[0].id }),
    );
  });

  it("gives a different prompt every time until the pool runs dry", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_USE_CASES[0].label);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_CATEGORIES[0].label }));

    const pool = poolFor(PROMPT_BANK, PROMPT_CATEGORIES[0].id, PROMPT_USE_CASES[0].id);
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
    openWith(PROMPT_USE_CASES[0].label);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    // Focus lands back on the button that opened it, not on the body. On the
    // live site it landed on the body, because the restore ran while the card
    // behind the dialog was still inert.
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: PROMPT_USE_CASES[0].label }),
    );

    openWith(PROMPT_USE_CASES[1].label);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trackMock).toHaveBeenCalledWith("prompt_generator_closed", expect.any(Object));
  });

  it("never hands a school room a prompt the article says to keep out of one", () => {
    render(<PromptGenerator surface="guide-hero" />);
    const school = PROMPT_USE_CASES.find((u) => u.id === "school");
    expect(school).toBeDefined();
    if (!school) return;
    openWith(school.label);
    const relationship = PROMPT_CATEGORIES.find((c) => c.id === "relationship");
    if (!relationship) return;
    fireEvent.click(screen.getByRole("button", { name: relationship.label }));

    const byText = new Map(PROMPT_BANK.map((p) => [p.text, p]));
    const pool = poolFor(PROMPT_BANK, "relationship", "school");
    for (let i = 0; i < pool.length; i++) {
      const text = screen.getByTestId("prompt-text").textContent ?? "";
      const prompt = byText.get(text);
      expect(prompt, text).toBeDefined();
      expect(prompt?.personal || prompt?.adult || prompt?.loud, text).toBeFalsy();
      if (i < pool.length - 1) fireEvent.click(screen.getByRole("button", { name: /another/i }));
    }
  });

  it("lets the reader step back to change the kind of prompt without closing", () => {
    render(<PromptGenerator surface="guide-hero" />);
    openWith(PROMPT_USE_CASES[0].label);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_CATEGORIES[0].label }));
    fireEvent.click(screen.getByRole("button", { name: /different kind/i }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: PROMPT_CATEGORIES[1].label })).toBeTruthy();
  });
});
