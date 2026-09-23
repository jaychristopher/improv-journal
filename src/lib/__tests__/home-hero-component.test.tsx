// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { trackMock } = vi.hoisted(() => ({ trackMock: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackEvent: trackMock }));

import { HomeHero } from "@/components/HomeHero";
import { loadBridges } from "@/lib/content";
import { orderedCategories } from "@/lib/guide-categories";
import { buildHomeDoors, CRAFT_STAGES, HOME_DOORS, type HomeDoorOptions } from "@/lib/home-doors";
import { getJourneyState } from "@/lib/journey";

/**
 * The hero's job is to fork before it asks anything: two readers want
 * opposite things from this site, and the question that serves one of them is
 * not a question the other can answer. What this exercises is that the fork
 * holds — that the two doors ask different things and hand over different
 * pages — against the real clusters and the real recommendation table rather
 * than fixtures (2026-09-23).
 */
let options: HomeDoorOptions;

function openDoor(label: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(label) }));
  return screen.getByRole("dialog");
}

describe("HomeHero", () => {
  beforeAll(async () => {
    const bridges = await loadBridges();
    const bySlug = new Set(bridges.map((b) => b.slug));
    options = buildHomeDoors(
      orderedCategories(bridges).map((cluster) => ({
        slug: cluster.slug,
        title: cluster.title,
        description: cluster.description,
        orientation: cluster.orientation,
        count: cluster.slugs.filter((slug) => bySlug.has(slug)).length,
      })),
    );
  });
  beforeEach(() => {
    window.localStorage.clear();
    trackMock.mockClear();
  });
  afterEach(cleanup);

  it("renders the title, the subtitle and both doors, with no dialog", () => {
    render(<HomeHero options={options} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    // The h1 is the hero's; the page's opening argument is an h2 below it.
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toMatch(/Physics of\s*Connection/);
    expect(screen.getByText(/Learn conversational magic through the practice of improv/));
    expect(screen.getByRole("button", { name: /Communication skills/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Practice improv/ })).toBeTruthy();
  });

  it("asks each reader a different second question", () => {
    render(<HomeHero options={options} />);
    expect(within(openDoor("Communication skills")).getByText("Where does it matter most?"));
    cleanup();
    render(<HomeHero options={options} />);
    expect(within(openDoor("Practice improv")).getByText("Where are you with it?"));
  });

  it("offers the applied clusters behind one door and the stages behind the other", () => {
    render(<HomeHero options={options} />);
    const applied = openDoor("Communication skills");
    for (const option of options.communication) {
      expect(within(applied).getByRole("button", { name: new RegExp(option.label) })).toBeTruthy();
    }
    // The improv cluster is the other door's, so it is not offered here.
    expect(within(applied).queryByRole("button", { name: /^Improv Skills/ })).toBeNull();
    cleanup();

    render(<HomeHero options={options} />);
    const craft = openDoor("Practice improv");
    for (const stage of CRAFT_STAGES) {
      expect(within(craft).getByRole("button", { name: new RegExp(stage.label) })).toBeTruthy();
    }
  });

  it("answers with two real destinations, the recommended path first", () => {
    render(<HomeHero options={options} />);
    const dialog = openDoor("Practice improv");
    const stage = options.improv[0];
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(stage.label) }));

    const hrefs = within(dialog)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain(stage.primary.href);
    expect(hrefs).toContain(stage.secondary.href);
    // The rationale comes from the recommendation table, not from copy here.
    expect(within(dialog).getByText(stage.rationale)).toBeTruthy();
  });

  it("sets the journey when it hands over a path, so a return visit resumes", () => {
    render(<HomeHero options={options} />);
    const dialog = openDoor("Practice improv");
    const stage = options.improv[0];
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(stage.label) }));
    const link = within(dialog)
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === stage.primary.href)!;
    fireEvent.click(link);
    // The quiz below does this on its own path links; a reader who took the
    // hero's instead would otherwise have nothing to continue.
    expect(getJourneyState()?.pathId).toBe(stage.primary.href.replace("/paths/", ""));
  });

  it("goes back to the question, and closes on Escape", () => {
    render(<HomeHero options={options} />);
    const dialog = openDoor("Communication skills");
    const option = options.communication[0];
    fireEvent.click(within(dialog).getByRole("button", { name: new RegExp(option.label) }));
    expect(
      within(dialog).queryByRole("heading", { name: "Where does it matter most?" }),
    ).toBeNull();
    // The way back is the door's own phrase, not the question again: next to
    // an answer, a heading repeated as a button reads as the answer's label.
    fireEvent.click(within(dialog).getByRole("button", { name: HOME_DOORS[0].back }));
    expect(
      within(dialog).getByRole("heading", { name: "Where does it matter most?" }),
    ).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    const names = trackMock.mock.calls.map((call) => call[0] as string);
    expect(names).toContain("home_door_opened");
    expect(names).toContain("home_door_answered");
    expect(names).toContain("home_door_closed");
  });
});
