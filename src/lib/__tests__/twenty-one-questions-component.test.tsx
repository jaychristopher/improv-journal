// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { TwentyOneQuestions } from "@/components/TwentyOneQuestions";
import {
  LAST_QUESTION,
  TOTAL,
  TWENTY_ONE_BANK,
  TWENTY_ONE_ROOMS,
  TWENTY_ONE_SEQUENCE,
} from "@/lib/twenty-one-questions-bank";
import { TOQ_SEEN_KEY } from "@/lib/twenty-one-questions-game";

/** Every text the tool can put on a card: the bank, the sequence, and number 21. */
const PRINTED = new Set([...TWENTY_ONE_BANK.map((q) => q.text), ...TWENTY_ONE_SEQUENCE]);

const SAFETY = "/how-it-works/safety-in-the-room";

function readSeen(): string[] {
  const raw = window.localStorage.getItem(TOQ_SEEN_KEY);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

/** Open on a room and land on question one. */
function play(room = "A friend") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(room) }));
  return screen.getByRole("dialog");
}

function card(dialog: HTMLElement): string {
  return dialog.querySelector("[data-question]")?.textContent ?? "";
}

function next(dialog: HTMLElement) {
  fireEvent.click(within(dialog).getByRole("button", { name: /Next question|Finish/ }));
}

/**
 * The hero on /21-questions-game is this component, and its value is a round
 * two people can run: open, say who, get question one with the count, answer,
 * get the next — twenty-one times, and then stop. That loop is what this
 * exercises, against the real bank rather than fixtures (2026-09-25).
 */
describe("TwentyOneQuestions", () => {
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(cleanup);

  it("renders the way in without a dialog, so the html carries it", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    for (const room of TWENTY_ONE_ROOMS) {
      expect(screen.getByRole("button", { name: new RegExp(room.label) })).toBeTruthy();
    }
    // The count on the card is the bank's plus the sequence, not a typed number.
    expect(
      screen.getByText(new RegExp(`${TWENTY_ONE_BANK.length + TOTAL} questions`)),
    ).toBeTruthy();
  });

  it("asks one thing and then deals question one from the page, with the count", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play();
    expect(PRINTED.has(card(dialog))).toBe(true);
    expect(within(dialog).getByText(new RegExp(`question 1 of ${TOTAL}`))).toBeTruthy();
    expect(readSeen()).toHaveLength(1);
  });

  it("says the two rules everybody drops on every card", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play();
    expect(within(dialog).getByText(/Take turns/)).toBeTruthy();
    expect(within(dialog).getByText(/Both of you answer every question/)).toBeTruthy();
    next(dialog);
    expect(within(dialog).getByText(/Take turns/)).toBeTruthy();
  });

  it("runs the sequence room as the article's list, in order", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play("Just run the 21");
    for (let position = 1; position <= TOTAL; position++) {
      expect(card(dialog), `position ${position}`).toBe(TWENTY_ONE_SEQUENCE[position - 1]);
      if (position < TOTAL) next(dialog);
    }
    // The sequence is the product: it is not written to the seen list.
    expect(readSeen()).toHaveLength(0);
  });

  it("counts to twenty-one, ends on the last question, and then stops", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play();
    for (let position = 1; position < TOTAL; position++) next(dialog);
    expect(within(dialog).getByText(new RegExp(`question ${TOTAL} of ${TOTAL}`))).toBeTruthy();
    expect(card(dialog)).toBe(LAST_QUESTION);
    expect(within(dialog).getByText(/The last turn is theirs/)).toBeTruthy();
    next(dialog);
    // The ending is a feature: no next question, a stop, and the drill.
    expect(within(dialog).getByText(/Twenty-one\. Stop here\./)).toBeTruthy();
    expect(dialog.querySelector("[data-question]")).toBeNull();
    expect(within(dialog).getByRole("link", { name: /Last-word response/ })).toBeTruthy();
    const names = trackMock.mock.calls.map((call) => call[0] as string);
    expect(names).toContain("twenty_one_questions_finished");
  });

  it("gives one pass each, replaces the question, and spends it visibly", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play();
    const before = card(dialog);
    const yours = dialog.querySelector<HTMLButtonElement>('button[data-pass="you"]')!;
    expect(yours.disabled).toBe(false);
    fireEvent.click(yours);
    // Same position, different question, and the pass is gone.
    expect(within(dialog).getByText(new RegExp(`question 1 of ${TOTAL}`))).toBeTruthy();
    expect(card(dialog)).not.toBe(before);
    expect(PRINTED.has(card(dialog))).toBe(true);
    expect(dialog.querySelector<HTMLButtonElement>('button[data-pass="you"]')!.disabled).toBe(true);
    expect(within(dialog).getByText(/Your pass is used/)).toBeTruthy();
    // Theirs is still there.
    expect(dialog.querySelector<HTMLButtonElement>('button[data-pass="them"]')!.disabled).toBe(
      false,
    );
  });

  it("lets you note a question and hands the notes back at the end", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play();
    const first = card(dialog);
    fireEvent.click(within(dialog).getByRole("button", { name: /Note this one/ }));
    expect(within(dialog).getByRole("button", { name: /Noted/ })).toBeTruthy();
    for (let position = 1; position <= TOTAL; position++) next(dialog);
    expect(within(dialog).getByText(/go back to the ones you noted/)).toBeTruthy();
    expect(within(dialog).getByRole("listitem").textContent).toBe(first);
  });

  it("never deals the same question twice on this device", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play("A couple");
    const shown = new Set<string>();
    for (let position = 1; position < TOTAL; position++) {
      const text = card(dialog);
      expect(shown.has(text), `repeat at ${position}`).toBe(false);
      shown.add(text);
      next(dialog);
    }
    expect(readSeen()).toHaveLength(TOTAL - 1);
  });

  it("links the pass rule to the concept the page rests it on", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    const dialog = play();
    const link = within(dialog).getByRole("link", { name: /safety in the room/ });
    expect(link.getAttribute("href")).toBe(SAFETY);
  });

  it("closes on Escape and reports the loop it ran", () => {
    render(<TwentyOneQuestions surface="guide-hero" safetyHref={SAFETY} />);
    play();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    const names = trackMock.mock.calls.map((call) => call[0] as string);
    expect(names).toContain("twenty_one_questions_opened");
    expect(names).toContain("twenty_one_questions_dealt");
    expect(names).toContain("twenty_one_questions_closed");
  });
});
