// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { PromptGenerator } from "@/components/PromptGenerator";
import { CLASSIC_KIND, PROMPT_CATEGORIES, PROMPT_KINDS } from "@/lib/prompt-bank";

const SETTINGS_KEY = "improv-prompts:settings:v1";

/**
 * What walking twenty-four people through the generator asked for
 * (docs/improv-prompts-personas.md, 2026-09-30), as it stands after the
 * owner's redesign the same day: the kind of start is the only question, the
 * rooms blend unless the cog says otherwise, and a button is an icon and a
 * label.
 *
 * A. the first tap is a prompt, on every visit, with no memory to keep;
 * B. a new card takes focus and a live region speaks, and the classic lines
 *    say they redraw; C. a kind button carries its label and its icon and
 *    nothing under them; D. the classic card wraps and stacks on a small
 *    phone; E. a show, set in the cog, keeps the host's notes off the
 *    projected part of the screen; F. the cog is in the hero's corner and in
 *    the dialog's, and its settings stay on the device.
 */
function openTo(kindLabel: string) {
  fireEvent.click(screen.getByRole("button", { name: kindLabel }));
  return screen.getByRole("dialog");
}

describe("what the personas asked for", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("A: the first tap is a prompt, on the first visit and every one after", () => {
    const { unmount } = render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[1].label);
    expect(dialog.querySelector('[data-testid="prompt-text"]')).not.toBeNull();
    expect(dialog.textContent).toContain(PROMPT_CATEGORIES[1].label);
    // A different kind is still one tap away.
    fireEvent.click(within(dialog).getByRole("button", { name: /different kind/i }));
    expect(within(dialog).getByRole("button", { name: CLASSIC_KIND.label })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    unmount();

    // Nothing was kept to make the second visit one tap: it already is. The
    // last-kind memory that did that job (change A, the morning version)
    // went with the room step.
    expect(window.localStorage.getItem("improv-prompts:last-kind:v1")).toBeNull();
    render(<PromptGenerator surface="tool-page" />);
    const again = openTo(CLASSIC_KIND.label);
    expect(again.querySelector('[data-testid="classic-card"]')).not.toBeNull();
  });

  it("B: a new card takes focus and is announced; a redrawn line is announced and named", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[0].label);
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

  it("C: a kind button is its label and its icon, with nothing under them", () => {
    render(<PromptGenerator surface="guide-hero" />);
    for (const kind of PROMPT_KINDS) {
      const button = screen.getByRole("button", { name: kind.label });
      // The accessible name is exactly the label: no description read after it.
      expect(button.getAttribute("aria-describedby")).toBeNull();
      expect(button.textContent?.trim(), kind.id).toBe(kind.label);
      expect(button.querySelector("svg[aria-hidden]"), kind.id).not.toBeNull();
    }
    // The room descriptions that sat under the four room buttons are gone
    // from the hero with the buttons; they live in the settings now.
    expect(screen.queryByText("Adults learning. Anything goes; depth first.")).toBeNull();
  });

  it("D: the classic card's lines wrap anywhere and stack below 360px", () => {
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(CLASSIC_KIND.label);
    const line = dialog.querySelector('[data-part="relationship"]') as HTMLElement;
    expect(line.className).toContain("flex-col");
    expect(line.className).toContain("min-[360px]:flex-row");
    const words = dialog.querySelector('[data-testid="classic-relationship"]') as HTMLElement;
    expect(words.className).toContain("[overflow-wrap:anywhere]");
  });

  it("E: a show, set in the cog, puts the notes under the buttons; the blend keeps them under the prompt", () => {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ room: "show" }));
    render(<PromptGenerator surface="tool-page" />);
    const dialog = openTo(PROMPT_CATEGORIES[0].label);
    const notes = dialog.querySelector('[data-testid="prompt-notes"]') as HTMLElement;
    expect(notes.getAttribute("data-notes")).toBe("foot");
    const another = within(dialog).getByRole("button", { name: /another/i });
    expect(another.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    cleanup();

    window.localStorage.clear();
    render(<PromptGenerator surface="tool-page" />);
    const blended = openTo(PROMPT_CATEGORIES[0].label);
    const blendedNotes = blended.querySelector('[data-testid="prompt-notes"]') as HTMLElement;
    expect(blendedNotes.getAttribute("data-notes")).toBe("card");
    const blendedAnother = within(blended).getByRole("button", { name: /another/i });
    expect(
      blendedNotes.compareDocumentPosition(blendedAnother) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("F: the cog sits in the hero's corner and the dialog's, and what it sets stays on the device", () => {
    render(<PromptGenerator surface="guide-hero" />);
    // One cog on the closed hero; the dialog's is not in the document yet.
    expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByTestId("prompt-settings")).toBeTruthy();
    // On the settings step the header shows no second cog.
    expect(within(dialog).queryByRole("button", { name: "Settings" })).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: /a team or work session/i }));
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}")).toMatchObject({
      room: "team",
    });
    // The chosen room reads as pressed, the others not.
    // The count and the timer have a pressed button each as well; only the
    // rooms are asked about here.
    const pressed = within(dialog)
      .getAllByRole("button", { pressed: true })
      .map((b) => b.getAttribute("data-room"))
      .filter((room) => room !== null);
    expect(pressed).toEqual(["team"]);
    fireEvent.click(within(dialog).getByRole("button", { name: /^done$/i }));
    expect(within(dialog).getByRole("button", { name: "Settings" })).toBeTruthy();
  });
});
