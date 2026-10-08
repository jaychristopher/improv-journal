// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import { PromptGenerator } from "@/components/PromptGenerator";
import { hasPromptTryLine, PromptTryLine } from "@/components/PromptTryLine";

import { loadAtoms } from "../content";
import { GENERATOR_HREF, PROMPT_CATEGORIES, PROMPT_KINDS } from "../prompt-bank";
import { resolveIds, resolvePromptConcepts } from "../prompt-concepts";

const APP = path.join(process.cwd(), ".next", "server", "app");
const TOOL = path.join(APP, "tools", "improv-prompt-generator.html");
const built = fs.existsSync(TOOL);

/**
 * The join between the prompt generator and the graph, in both directions.
 *
 * The generator's categories are the first atoms of *The Anatomy of a Scene*
 * under other names, and neither side knew the other: the tool linked no
 * concept, and no concept page linked the tool (tracker entry 332,
 * 2026-09-22). Two derived lines close it — "The idea behind it" under a
 * drawn prompt, and "Try it" on the concepts the categories name — and both
 * read the one `concepts` field, resolved here on the server. What is
 * guarded is presence: a resolver that returns an empty map, a category
 * whose concept resolves to nothing, a concept page that stops offering the
 * line, a tool page that stops handing the generator its map.
 */
describe("resolvePromptConcepts", () => {
  it("resolves every declared concept to a title and a route", async () => {
    const map = await resolvePromptConcepts();
    for (const category of PROMPT_CATEGORIES) {
      const links = map[category.id];
      expect(links.length, category.id).toBe(category.concepts.length);
      links.forEach((link, i) => {
        expect(link.id).toBe(category.concepts[i]);
        expect(link.title.length, link.id).toBeGreaterThan(0);
        expect(link.href, link.id).toMatch(/^\/(practice|how-it-works|library)\//);
      });
    }
    // 5 of the 6 categories carry a concept on 2026-09-22; the task does not.
    const withConcept = PROMPT_CATEGORIES.filter((c) => map[c.id].length > 0);
    expect(withConcept.length).toBe(5);
  });

  it("names opening for the one word, which sits outside the six (2026-09-30)", async () => {
    const map = await resolvePromptConcepts();
    expect(map.word.map((l) => l.id)).toEqual(["opening"]);
    expect(map.word[0].href).toBe("/practice/techniques/opening");
  });

  it("drops an id that is not an atom rather than inventing a route for it", async () => {
    const links = await resolveIds(["relationship", "not-an-atom-anyone-wrote"]);
    expect(links.map((l) => l.id)).toEqual(["relationship"]);
    expect(links[0].title).toBe("Relationship");
  });
});

describe("PromptTryLine", () => {
  afterEach(cleanup);

  it("offers the line on every concept a category names, and no other", async () => {
    const named = new Set(PROMPT_KINDS.flatMap((c) => c.concepts));
    // 7 concepts on 2026-09-22: relationship, initiation, environment,
    // space-work, want, tilt, suggestion. The classic added base-reality on
    // 2026-09-30, so the try line now sits on that page too.
    expect(named.size).toBeGreaterThanOrEqual(7);
    for (const id of named) expect(hasPromptTryLine(id), id).toBe(true);
    expect(hasPromptTryLine("want")).toBe(true);
    expect(hasPromptTryLine("commitment")).toBe(false);

    // The decision against the whole graph: only the named concepts get it.
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const withLine = atoms.map((a) => a.frontmatter.id).filter(hasPromptTryLine);
    expect(withLine.sort()).toEqual([...named].sort());
  });

  it("links the generator, and renders nothing elsewhere", () => {
    const { container } = render(<PromptTryLine atomId="want" />);
    const line = container.querySelector("[data-prompt-try]");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("data-prompt-try")).toBe("situation");
    expect(line?.getAttribute("data-derived")).toBe("true");
    const link = line?.querySelector("a");
    expect(link?.getAttribute("href")).toBe(GENERATOR_HREF);
    expect(link?.getAttribute("href")).toBe("/tools/improv-prompt-generator");
    expect(link?.textContent).toContain("something already wrong");
    cleanup();

    const none = render(<PromptTryLine atomId="commitment" />);
    expect(none.container.querySelector("[data-prompt-try]")).toBeNull();
  });
});

describe("the slide carries the prompt and the controls", () => {
  beforeEach(() => {
    // A clean device: nothing set in the cog, nothing seen.
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.body.style.overflow = "";
  });

  /**
   * Cut on 2026-10-08: "we have a ton of noise, the user wants a word ... for
   * each element we need to have a REALLY good reason for it to be on the
   * screen if its not simply the word or a way to move to the next one."
   *
   * The how-to sentence, the coaching line and the theory gloss came off the
   * slide. The gloss was derived from the how-to sentence, so the slide had
   * been printing one sentence twice — the duplication was structural, not a
   * mistake somebody made once. The theory link moved into this page's own
   * prose rather than being deleted, where it is server-rendered and so can
   * actually be followed; the test below holds that end of it.
   */
  it("prints no theory, no how-to and no coaching under a drawn prompt", () => {
    render(<PromptGenerator surface="tool-page" />);
    const relationship = PROMPT_CATEGORIES.find((c) => c.id === "relationship");
    expect(relationship).toBeDefined();
    if (!relationship) return;
    fireEvent.click(screen.getByRole("button", { name: relationship.label }));
    // Guard the guard: a prompt really is on screen, so the absences below
    // are the notes being gone and not the whole card failing to render.
    expect(screen.getByTestId("prompt-text").textContent?.length ?? 0).toBeGreaterThan(10);

    expect(document.querySelector("[data-prompt-concept]")).toBeNull();
    expect(document.querySelector('[data-testid="prompt-coach"]')).toBeNull();
    const dialog = screen.getByRole("dialog").textContent ?? "";
    expect(dialog).not.toContain("The idea behind it");
    expect(dialog).not.toContain(relationship.howToUse);
  });

  it("shows no pool count and no elapsed clock", () => {
    // Both were on screen on every single draw and neither was asked for.
    // The countdown survives only where the cog has set an interval, because
    // then the card advances on its own and the clock is that feature saying
    // when; a clean device has set none, so there should be no clock at all.
    render(<PromptGenerator surface="tool-page" />);
    const location = PROMPT_CATEGORIES.find((c) => c.id === "location");
    if (!location) return;
    fireEvent.click(screen.getByRole("button", { name: location.label }));
    expect(screen.getByTestId("prompt-text")).toBeTruthy();
    expect(document.querySelector('[data-testid="prompt-clock"]')).toBeNull();
    expect(screen.getByRole("dialog").textContent ?? "").not.toMatch(/\d+ of \d+ left/);
  });

  it("lands a concept's link on a page whose hero offers that kind as one tap", () => {
    // The link once carried `?category=<kind>` to skip the room step. The
    // kind is the first tap now, so the page is enough.
    expect(GENERATOR_HREF).toBe("/tools/improv-prompt-generator");
    render(<PromptGenerator surface="tool-page" />);
    const location = PROMPT_CATEGORIES.find((c) => c.id === "location");
    if (!location) return;
    fireEvent.click(screen.getByRole("button", { name: location.label }));
    expect(screen.getByTestId("prompt-text")).toBeTruthy();
    expect(screen.getByRole("dialog").textContent).toContain("A location");
  });
});

/**
 * On the built page. The theory links are ordinary server-rendered anchors in
 * the page's prose since 2026-10-08, not a map serialised into the generator's
 * RSC payload, so this can assert the thing a reader and a crawler both get: a
 * followable link per kind. A page that stops resolving the map now drops
 * visible links rather than silently emptying a line inside a dialog.
 */
describe("the built tool page", () => {
  it.runIf(built)("links every resolved concept from its own prose", async () => {
    const html = fs.readFileSync(TOOL, "utf8");
    const map = await resolvePromptConcepts();
    const links = Object.values(map).flat();
    expect(links.length).toBeGreaterThanOrEqual(7);
    for (const link of links) expect(html, link.id).toContain(`href="${link.href}"`);
    expect(html).toContain("The idea behind it is");
    expect(html).toContain('href="/threads/anatomy-of-a-scene"');
  });
});
