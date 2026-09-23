// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { WouldYouRather } from "@/components/WouldYouRather";
import { WOULD_YOU_RATHER_BANK, WOULD_YOU_RATHER_ROOMS } from "@/lib/would-you-rather-bank";
import { WYR_SEEN_KEY } from "@/lib/would-you-rather-game";

/** Every option text the bank can put on a card, either side, capitalised. */
const SIDES = new Set(
  WOULD_YOU_RATHER_BANK.flatMap((p) => [p.left, p.right]).map(
    (s) => s.charAt(0).toUpperCase() + s.slice(1),
  ),
);

function readSeen(): string[] {
  const raw = window.localStorage.getItem(WYR_SEEN_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

/** Open on a room, answer the size question, and land on the first pair. */
function play(room = "Friends", size = "3 to 10") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(room) }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(size) }));
  return dialog;
}

/** The two option buttons on the pair currently dealt. */
function sides(dialog: HTMLElement) {
  return [...dialog.querySelectorAll<HTMLButtonElement>("button[data-side]")];
}

/**
 * The hero on /would-you-rather-questions is this component, and its value is
 * a loop a room can run: open, say who and how many, get a pair, pick a side,
 * get another. That loop is what this exercises, against the real bank rather
 * than fixtures (2026-09-23).
 */
describe("WouldYouRather", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(cleanup);

  it("renders the way in without a dialog, so the html carries it", () => {
    render(<WouldYouRather surface="guide-hero" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    for (const room of WOULD_YOU_RATHER_ROOMS) {
      expect(screen.getByRole("button", { name: new RegExp(room.label) })).toBeTruthy();
    }
    // The count on the card is the bank's, not a number typed into the copy.
    expect(screen.getByText(new RegExp(`${WOULD_YOU_RATHER_BANK.length} pairs`))).toBeTruthy();
  });

  it("asks two questions and then deals a pair from the bank", () => {
    render(<WouldYouRather surface="guide-hero" />);
    const dialog = play();
    const [left, right] = sides(dialog);
    expect(SIDES.has(left.textContent ?? "")).toBe(true);
    expect(SIDES.has(right.textContent ?? "")).toBe(true);
    expect(readSeen()).toHaveLength(1);
  });

  it("offers no third option, and asks for the defence once a side is picked", () => {
    render(<WouldYouRather surface="guide-hero" />);
    const dialog = play();
    // The one rule: two sides, and no third thing to press. The rule line
    // says the words "both" and "neither" — it is what names them as
    // non-options — so this counts buttons rather than text.
    expect(sides(dialog)).toHaveLength(2);
    const pressable = within(dialog)
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(pressable.filter((t) => /both|neither|it depends/i.test(t ?? ""))).toEqual([]);

    expect(within(dialog).queryByText(/Now say why/)).toBeNull();
    fireEvent.click(sides(dialog)[0]);
    expect(sides(dialog)[0].getAttribute("aria-pressed")).toBe("true");
    // The page's whole argument: the answer is worthless, the argument is the game.
    expect(within(dialog).getByText(/Now say why/)).toBeTruthy();
  });

  it("never deals the same pair twice on this device", () => {
    render(<WouldYouRather surface="guide-hero" />);
    const dialog = play();
    const seenText = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const pair = sides(dialog)
        .map((b) => b.textContent)
        .join(" | ");
      expect(seenText.has(pair), `repeat at pair ${i + 1}`).toBe(false);
      seenText.add(pair);
      fireEvent.click(within(dialog).getByRole("button", { name: "Next pair" }));
    }
    expect(readSeen()).toHaveLength(13);
  });

  it("says how to run it for the size the room chose", () => {
    render(<WouldYouRather surface="guide-hero" />);
    const dialog = play("Friends", "20 or more");
    // The article's variant for 20+, in its own terms.
    expect(within(dialog).getAllByText(/Split the room/).length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/Move to the one you pick/)).toBeTruthy();
  });

  it("nudges at the session length the page prescribes", () => {
    render(<WouldYouRather surface="guide-hero" />);
    const dialog = play();
    expect(within(dialog).queryByText(/still want another one/)).toBeNull();
    for (let i = 1; i < 10; i++) {
      fireEvent.click(within(dialog).getByRole("button", { name: "Next pair" }));
    }
    expect(within(dialog).getByText(/still want another one/)).toBeTruthy();
  });

  it("closes on Escape and reports the loop it ran", () => {
    render(<WouldYouRather surface="guide-hero" />);
    play();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    const names = trackMock.mock.calls.map((call) => call[0] as string);
    expect(names).toContain("would_you_rather_opened");
    expect(names).toContain("would_you_rather_dealt");
    expect(names).toContain("would_you_rather_closed");
  });
});
