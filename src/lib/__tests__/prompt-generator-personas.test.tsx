// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { PromptGenerator } from "@/components/PromptGenerator";
import { CLASSIC_KIND, PROMPT_CATEGORIES, PROMPT_USE_CASES } from "@/lib/prompt-bank";

/**
 * Six changes from walking twenty-four people through the generator
 * (docs/improv-prompts-personas.md, 2026-09-30), none of them a control:
 *
 * A. the device remembers the last kind, so a return visit's first tap is a
 *    prompt; B. a new card takes focus and a live region speaks, and the
 *    classic lines say they redraw; C. the phone hero shows what a room is;
 *    D. the classic card wraps and stacks on a small phone; E. the show room
 *    keeps the host's notes off the projected part of the screen; F. the hero
 *    says it works with no signal.
 */
function openRoom(room = PROMPT_USE_CASES[0].label) {
  fireEvent.click(screen.getByRole("button", { name: room }));
  return screen.getByRole("dialog");
}

describe("what the personas asked for", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
    window.history.replaceState(null, "", "/tools/improv-prompt-generator");
  });
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("A: remembers the last kind, so the next visit's first tap is a prompt", () => {
    const { unmount } = render(<PromptGenerator surface="tool-page" />);
    const dialog = openRoom();
    fireEvent.click(within(dialog).getByRole("button", { name: PROMPT_CATEGORIES[1].label }));
    expect(dialog.querySelector('[data-testid="prompt-text"]')).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    unmount();

    render(<PromptGenerator surface="tool-page" />);
    // The hero says so, and says why.
    expect(screen.getByText(/as last time/)).toBeTruthy();
    const again = openRoom(PROMPT_USE_CASES[2].label);
    expect(again.querySelector('[data-testid="prompt-text"]')).not.toBeNull();
    expect(again.textContent).toContain(PROMPT_CATEGORIES[1].label);
    expect(trackMock).toHaveBeenCalledWith(
      "prompt_generator_opened",
      expect.objectContaining({ preset: PROMPT_CATEGORIES[1].id, preset_source: "memory" }),
    );
    // A different kind is still one tap away.
    fireEvent.click(within(again).getByRole("button", { name: /different kind/i }));
    expect(within(again).getByRole("button", { name: CLASSIC_KIND.label })).toBeTruthy();
  });

  it("A: a concept page's query still wins over the memory", () => {
    window.localStorage.setItem("improv-prompts:last-kind:v1", "task");
    window.history.replaceState(null, "", "/tools/improv-prompt-generator?category=location");
    render(<PromptGenerator surface="tool-page" />);
    expect(screen.getByText(/as the page you came from asked/)).toBeTruthy();
    const dialog = openRoom();
    expect(dialog.textContent).toContain("A location");
  });

  it("B: a new card takes focus and is announced; a redrawn line is announced and named", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openRoom();
    fireEvent.click(within(dialog).getByRole("button", { name: PROMPT_CATEGORIES[0].label }));
    const text = dialog.querySelector('[data-testid="prompt-text"]') as HTMLElement;
    expect(document.activeElement).toBe(text);
    const live = dialog.querySelector('[data-testid="prompt-announce"]') as HTMLElement;
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe(text.textContent);
    // Another one: focus and the announcement move to the new card.
    fireEvent.click(within(dialog).getByRole("button", { name: /another/i }));
    const next = dialog.querySelector('[data-testid="prompt-text"]') as HTMLElement;
    expect(document.activeElement).toBe(next);
    expect(live.textContent).toBe(next.textContent);

    fireEvent.click(within(dialog).getByRole("button", { name: /different kind/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: CLASSIC_KIND.label }));
    const card = dialog.querySelector('[data-testid="classic-card"]') as HTMLElement;
    expect(document.activeElement).toBe(card);
    expect(live.textContent).toMatch(/^Who: .+\. Where: .+\. What: .+/);
    const where = dialog.querySelector('[data-part="location"]') as HTMLElement;
    expect(where.getAttribute("aria-label")).toMatch(/^Change the where line: .+/);
    // A pointer focuses the button it presses; jsdom's click does not, so the
    // focus a real tap gives is set by hand before the tap.
    where.focus();
    fireEvent.click(where);
    expect(live.textContent).toMatch(/^Where: .+/);
    // The tapped line keeps focus; the card did not steal it.
    expect(document.activeElement).toBe(where);
  });

  it("C: the phone hero shows what each room is", () => {
    render(<PromptGenerator surface="guide-hero" />);
    for (const room of PROMPT_USE_CASES) {
      const description = screen.getByText(room.description);
      expect(description.className, room.id).not.toContain("hidden");
    }
  });

  it("D: the classic card's lines wrap anywhere and stack below 360px", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openRoom();
    fireEvent.click(within(dialog).getByRole("button", { name: CLASSIC_KIND.label }));
    const line = dialog.querySelector('[data-part="relationship"]') as HTMLElement;
    expect(line.className).toContain("flex-col");
    expect(line.className).toContain("min-[360px]:flex-row");
    const words = dialog.querySelector('[data-testid="classic-relationship"]') as HTMLElement;
    expect(words.className).toContain("[overflow-wrap:anywhere]");
  });

  it("E: the show room puts the notes under the buttons; a class keeps them under the prompt", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openRoom(PROMPT_USE_CASES[1].label);
    fireEvent.click(within(dialog).getByRole("button", { name: PROMPT_CATEGORIES[0].label }));
    const notes = dialog.querySelector('[data-testid="prompt-notes"]') as HTMLElement;
    expect(notes.getAttribute("data-notes")).toBe("foot");
    const another = within(dialog).getByRole("button", { name: /another/i });
    expect(another.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    cleanup();

    window.localStorage.clear();
    render(<PromptGenerator surface="tool-page" />);
    const classDialog = openRoom(PROMPT_USE_CASES[0].label);
    fireEvent.click(within(classDialog).getByRole("button", { name: PROMPT_CATEGORIES[0].label }));
    const classNotes = classDialog.querySelector('[data-testid="prompt-notes"]') as HTMLElement;
    expect(classNotes.getAttribute("data-notes")).toBe("card");
    const classAnother = within(classDialog).getByRole("button", { name: /another/i });
    expect(
      classNotes.compareDocumentPosition(classAnother) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("F: the hero says it works with no signal", () => {
    render(<PromptGenerator surface="guide-hero" />);
    expect(screen.getByText(/opens with no signal once it has loaded here/)).toBeTruthy();
  });
});
