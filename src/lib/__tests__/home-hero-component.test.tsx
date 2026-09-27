// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HomeHero } from "@/components/HomeHero";
import { HOME_DOORS } from "@/lib/home-doors";

/**
 * The hero's job is to say what this is and hand over one starting point,
 * with the two audiences as links a reader can take or scroll past. Until
 * 2026-09-27 the two audiences were buttons that opened a modal asking a
 * second question before any link — audience-based navigation as the primary
 * route, and a dialog used for navigation, both of which the research this
 * page is now held to says to avoid (docs/homepage-principles.md). What this
 * exercises is that the hero stays that shape: real links, no buttons, no
 * dialog, and the slot's content rendered where the page put it.
 */
describe("HomeHero", () => {
  afterEach(cleanup);

  it("renders the title, the tagline and the slot, with no dialog and no buttons", () => {
    render(
      <HomeHero>
        <p>the starting point</p>
      </HomeHero>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading.textContent).toMatch(/Physics of\s*Connection/);
    expect(screen.getByText(/Learn the underlying mechanics of effective communication/));
    // The slot is inside the hero's own region, so what the page passes in is
    // labelled by the hero and tracked with it.
    const region = screen.getByRole("region", { name: /Physics of\s*Connection/ });
    expect(region.querySelector("[data-hero-slot]")?.textContent).toBe("the starting point");
    expect(region.getAttribute("data-track")).toBe("home-hero");
  });

  it("offers both audiences as links to a real page each, and nothing to answer first", () => {
    render(
      <HomeHero>
        <span />
      </HomeHero>,
    );
    expect(HOME_DOORS).toHaveLength(2);
    for (const door of HOME_DOORS) {
      const link = screen.getByRole("link", { name: door.label });
      expect(link.getAttribute("href")).toBe(door.href);
      // The line says who it is for, in the reader's terms.
      expect(link.parentElement?.textContent).toContain(door.note);
    }
    const hrefs = new Set(HOME_DOORS.map((door) => door.href));
    expect(hrefs.size).toBe(2);
  });
});
