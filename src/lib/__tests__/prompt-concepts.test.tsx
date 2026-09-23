// @vitest-environment jsdom
import fs from "node:fs";
import path from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/analytics", () => ({ trackEvent: vi.fn() }));

import { PromptGenerator } from "@/components/PromptGenerator";
import { hasPromptTryLine, PromptTryLine } from "@/components/PromptTryLine";

import { loadAtoms } from "../content";
import { generatorHrefFor, PROMPT_CATEGORIES, PROMPT_USE_CASES } from "../prompt-bank";
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

  it("drops an id that is not an atom rather than inventing a route for it", async () => {
    const links = await resolveIds(["relationship", "not-an-atom-anyone-wrote"]);
    expect(links.map((l) => l.id)).toEqual(["relationship"]);
    expect(links[0].title).toBe("Relationship");
  });
});

describe("PromptTryLine", () => {
  afterEach(cleanup);

  it("offers the line on every concept a category names, and no other", async () => {
    const named = new Set(PROMPT_CATEGORIES.flatMap((c) => c.concepts));
    // 7 concepts on 2026-09-22: relationship, initiation, environment,
    // space-work, want, tilt, suggestion.
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

  it("links the generator pre-set to the category, and renders nothing elsewhere", () => {
    const { container } = render(<PromptTryLine atomId="want" />);
    const line = container.querySelector("[data-prompt-try]");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("data-prompt-try")).toBe("situation");
    expect(line?.getAttribute("data-derived")).toBe("true");
    const link = line?.querySelector("a");
    expect(link?.getAttribute("href")).toBe(generatorHrefFor("situation"));
    expect(link?.getAttribute("href")).toBe("/tools/improv-prompt-generator?category=situation");
    expect(link?.textContent).toContain("something already wrong");
    cleanup();

    const none = render(<PromptTryLine atomId="commitment" />);
    expect(none.container.querySelector("[data-prompt-try]")).toBeNull();
  });
});

describe("the generator's concept line", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
    document.body.style.overflow = "";
  });

  it("names the category's concept under a drawn prompt, with the resolved link", async () => {
    const concepts = await resolvePromptConcepts();
    render(<PromptGenerator surface="tool-page" concepts={concepts} />);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_USE_CASES[0].label }));
    const relationship = PROMPT_CATEGORIES.find((c) => c.id === "relationship");
    expect(relationship).toBeDefined();
    if (!relationship) return;
    fireEvent.click(screen.getByRole("button", { name: relationship.label }));
    expect(screen.getByTestId("prompt-text")).toBeTruthy();

    const line = document.querySelector("[data-prompt-concept]");
    expect(line).not.toBeNull();
    expect(line?.getAttribute("data-prompt-concept")).toBe("relationship");
    expect(line?.textContent).toContain("The idea behind it");
    expect(line?.textContent).toContain("play what is between them, not the label.");
    expect(line?.querySelector("a")?.getAttribute("href")).toBe(concepts.relationship[0].href);
  });

  it("renders no concept line for the task category, which has no concept", async () => {
    const concepts = await resolvePromptConcepts();
    render(<PromptGenerator surface="tool-page" concepts={concepts} />);
    fireEvent.click(screen.getByRole("button", { name: PROMPT_USE_CASES[0].label }));
    const task = PROMPT_CATEGORIES.find((c) => c.id === "task");
    if (!task) return;
    fireEvent.click(screen.getByRole("button", { name: task.label }));
    expect(screen.getByTestId("prompt-text")).toBeTruthy();
    expect(document.querySelector("[data-prompt-concept]")).toBeNull();
  });

  it("opens straight onto the category the query names, so a concept's link lands on its prompts", () => {
    window.history.replaceState(null, "", generatorHrefFor("location"));
    render(<PromptGenerator surface="tool-page" />);
    // The inline card says what it was set to, so the reader is not surprised.
    expect(document.querySelector("[data-prompt-preset]")?.getAttribute("data-prompt-preset")).toBe(
      "location",
    );
    fireEvent.click(screen.getByRole("button", { name: PROMPT_USE_CASES[0].label }));
    // No "what kind of start?" step: the first tap draws a location prompt.
    expect(screen.getByTestId("prompt-text")).toBeTruthy();
    expect(screen.getByRole("dialog").textContent).toContain("A location");
    window.history.replaceState(null, "", "/");
  });

  it("ignores a query naming a category the bank does not have", () => {
    window.history.replaceState(null, "", "/tools/improv-prompt-generator?category=banana");
    render(<PromptGenerator surface="tool-page" />);
    expect(document.querySelector("[data-prompt-preset]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: PROMPT_USE_CASES[0].label }));
    expect(screen.queryByTestId("prompt-text")).toBeNull();
    expect(screen.getByRole("button", { name: PROMPT_CATEGORIES[0].label })).toBeTruthy();
    window.history.replaceState(null, "", "/");
  });
});

/**
 * On the built page. The concept line itself renders inside the dialog,
 * which is client-only by design (prompt-generator-rendered.test.ts guards
 * that no dialog markup ships), so the server html cannot carry
 * `data-prompt-concept`; what it carries is the map the page hands the
 * generator, serialised into the RSC payload — each concept's route, by
 * name. That is the fact worth guarding: a page that stops resolving the map
 * ships a generator that renders no concept line at all.
 */
describe("the built tool page", () => {
  it.runIf(built)("hands the generator every resolved concept route", async () => {
    const html = fs.readFileSync(TOOL, "utf8");
    const map = await resolvePromptConcepts();
    const links = Object.values(map).flat();
    expect(links.length).toBeGreaterThanOrEqual(7);
    for (const link of links) expect(html, link.id).toContain(link.href);
    expect(html).toContain('href="/threads/anatomy-of-a-scene"');
  });
});
