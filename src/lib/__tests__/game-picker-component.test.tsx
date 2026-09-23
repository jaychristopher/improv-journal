// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { GamePicker } from "@/components/GamePicker";
import { buildGamePools, type GamePools, SYMPTOMS } from "@/lib/game-picker";
import { loadImprovGames } from "@/lib/games";

/**
 * The hero on /improv-games is this component, and its value is that it
 * answers in one screen what the page answers in 41 cards and two filters:
 * what is this for, what is going wrong, here is the game and how to run it.
 *
 * It runs against the real inventory rather than fixtures, because the thing
 * most likely to break it is the graph changing under it — a game losing its
 * rules, or a symptom naming an exercise that has been renamed (2026-09-23).
 */
let pools: GamePools;

/** Open on a job. The card and the dialog both offer all three. */
function start(job: string) {
  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(job) })[0]);
  return screen.getByRole("dialog");
}

/** The rules paragraph of whatever is dealt, which is how a card is identified. */
function dealtTitle(dialog: HTMLElement) {
  return dialog.querySelector("h3")?.textContent ?? "";
}

describe("GamePicker", () => {
  beforeAll(async () => {
    pools = buildGamePools(await loadImprovGames());
  });
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(cleanup);

  it("renders the way in without a dialog, so the html carries it", () => {
    render(<GamePicker pools={pools} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Warm the room up/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Fix something/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Something to play/ })).toBeTruthy();
    // The count on the card is the inventory's, not a number typed into copy.
    const total = Object.keys(pools.games).length;
    expect(total).toBeGreaterThanOrEqual(40);
    expect(screen.getByText(new RegExp(`${total} games`))).toBeTruthy();
  });

  it("deals straight away for the two jobs that have no second question", () => {
    render(<GamePicker pools={pools} />);
    const dialog = start("Warm the room up");
    // A warm-up has no wrong answers by the page's own account, so asking
    // what is going wrong would be asking a question with no answer.
    expect(within(dialog).queryByText(/What is going wrong/)).toBeNull();
    expect(dealtTitle(dialog)).not.toBe("");
    expect(pools.jobs["warm-up"]).toContain(
      Object.values(pools.games).find((g) => g.title === dealtTitle(dialog))?.id,
    );
  });

  it("asks what is going wrong, and answers with the game the page names", () => {
    render(<GamePicker pools={pools} />);
    const dialog = start("Fix something");
    for (const symptom of SYMPTOMS) {
      expect(within(dialog).getByRole("button", { name: symptom.label })).toBeTruthy();
    }
    const first = SYMPTOMS[0];
    fireEvent.click(within(dialog).getByRole("button", { name: first.label }));
    // The named games lead their pool, so the reader is handed the one the
    // prose underneath would have given them rather than a near neighbour.
    expect(pools.games[first.games[0]].title).toBe(dealtTitle(dialog));
  });

  it("hands over the rules with the game, not what it trains", () => {
    render(<GamePicker pools={pools} />);
    const dialog = start("Fix something");
    fireEvent.click(within(dialog).getByRole("button", { name: SYMPTOMS[0].label }));
    const dealt = Object.values(pools.games).find((g) => g.title === dealtTitle(dialog));
    expect(dealt).toBeTruthy();
    expect(within(dialog).getByText(dealt!.howToPlay)).toBeTruthy();
    // And the way to the full entry, which is where the failure modes are.
    expect(
      within(dialog)
        .getAllByRole("link")
        .some((a) => a.getAttribute("href") === dealt!.href),
    ).toBe(true);
  });

  it("does not deal the same game twice on this device", () => {
    render(<GamePicker pools={pools} />);
    const dialog = start("Warm the room up");
    const seen = new Set<string>();
    // One short of the smallest pool, so this never tests the wrap.
    for (let i = 0; i < 10; i++) {
      const title = dealtTitle(dialog);
      expect(seen.has(title), `repeat at game ${i + 1}`).toBe(false);
      seen.add(title);
      fireEvent.click(within(dialog).getByRole("button", { name: "Another one" }));
    }
  });

  it("warns against running an exercise as a performance game", () => {
    render(<GamePicker pools={pools} />);
    const fixing = start("Fix something");
    fireEvent.click(within(fixing).getByRole("button", { name: SYMPTOMS[0].label }));
    // The page calls this the classic mistake; it is said where it is about
    // to be made rather than in a section further down.
    expect(within(fixing).getByText(/not built to be watched/)).toBeTruthy();
    cleanup();

    render(<GamePicker pools={pools} />);
    const playing = start("Something to play");
    expect(within(playing).queryByText(/not built to be watched/)).toBeNull();
    cleanup();

    // And not under a warm-up, which is where this first went wrong: Big
    // Booty is tagged warm-up and is an exercise, so keying the note to the
    // kind told a reader who asked for two cheap minutes to run it slowly and
    // interrupt often — the opposite of the job they had just chosen.
    render(<GamePicker pools={pools} />);
    const warming = start("Warm the room up");
    expect(within(warming).queryByText(/not built to be watched/)).toBeNull();
  });

  it("closes on Escape and reports the loop it ran", () => {
    render(<GamePicker pools={pools} />);
    start("Warm the room up");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    const names = trackMock.mock.calls.map((call) => call[0] as string);
    expect(names).toContain("game_picker_opened");
    expect(names).toContain("improv_game_dealt");
    expect(names).toContain("game_picker_closed");
  });
});
