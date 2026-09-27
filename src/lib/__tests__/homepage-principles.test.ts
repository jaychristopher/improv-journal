import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CRAFT_STAGES, HOME_DOORS } from "../home-doors";
import { getRecommendedPath } from "../path-recommendations";

/**
 * The shape of the homepage, held to the rules docs/homepage-principles.md
 * settled on 2026-09-27 after reading the schools against each other and
 * measuring the page.
 *
 * The rules this holds, and the failure each guards against:
 *
 *  - The hero is a panel of its own height and ships as html. It was a
 *    viewport-high takeover that ended exactly at the fold on a phone with
 *    nothing peeking under it (a false floor), and a client component whose
 *    two cards were buttons opening a modal.
 *  - One starting point, in the hero, and both audiences as links there.
 *    A reader who is neither, or both, loses nothing by scrolling past; the
 *    old doors made them answer first.
 *  - Every answer the doors used to give is on the page: the four levels
 *    with the path each is recommended and its own hub. The clusters grid
 *    was already there; the levels were only behind the modal.
 *  - The page runs in the order a reader's attention does — start, problem,
 *    topic, level — before the tail.
 *  - A search field the reader can type into, not only the nav's icon.
 *
 * Source assertions where the build cannot tell the arrangements apart, as
 * homepage-journey-slot does; built assertions for everything the html shows.
 */
const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const HOME = path.join(APP, "index.html");
const built = fs.existsSync(APP) && fs.existsSync(HOME);

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf-8");

/** The server html of a tracked block: from its wrapper to the wrapper's close tag. */
function block(html: string, name: string, tag: string): string {
  const start = html.indexOf(`data-track="${name}"`);
  expect(start, `no ${name} block`).toBeGreaterThan(-1);
  const end = html.indexOf(`</${tag}>`, start);
  return html.slice(start, end);
}

/** The document without its scripts: the flight payload holds the markup again, escaped. */
function page(): string {
  return fs.readFileSync(HOME, "utf-8").replace(/<script[\s\S]*?<\/script>/g, "");
}

describe("homepage principles", () => {
  it("keeps the hero a panel of its own height, served as html", () => {
    const hero = read("src/components/HomeHero.tsx");
    expect(hero.trimStart().startsWith('"use client"')).toBe(false);
    expect(hero).not.toMatch(/HeroTakeover|data-hero-takeover|100svh|100vh/);
    expect(hero).not.toMatch(/role="dialog"|<button/);
    expect(hero).toContain('data-track="home-hero"');
    expect(hero).toContain("data-hero-slot");
  });

  it("names both audiences with the word for, and sends each to a different page", () => {
    expect(HOME_DOORS.map((door) => door.id)).toEqual(["communication", "improv"]);
    for (const door of HOME_DOORS) {
      expect(door.label, door.id).toMatch(/^For /);
      expect(door.href, door.id).toMatch(/^\/[a-z/-]+$/);
    }
    expect(new Set(HOME_DOORS.map((door) => door.href)).size).toBe(2);
  });

  it.runIf(built)(
    "puts the one starting point and both audience links in the hero's own html",
    () => {
      const hero = block(page(), "home-hero", "section");
      expect(hero).toContain("Start here");
      expect(hero).toContain(`href="/paths/${getRecommendedPath("beginner").id}"`);
      for (const door of HOME_DOORS) expect(hero, door.id).toContain(`href="${door.href}"`);
      // Links, not controls: nothing in the hero asks a question before it links.
      expect(hero).not.toContain("<button");
      expect(hero).not.toContain('role="dialog"');
    },
  );

  it.runIf(built)(
    "offers every level on the page, with its recommended path and its own hub",
    () => {
      const levels = block(page(), "home-levels", "section");
      expect(CRAFT_STAGES.length).toBeGreaterThanOrEqual(4);
      for (const stage of CRAFT_STAGES) {
        expect(levels, stage.audience).toContain(`href="/learn/${stage.audience}"`);
        expect(levels, stage.audience).toContain(
          `href="/paths/${getRecommendedPath(stage.audience).id}"`,
        );
        expect(levels, stage.audience).toContain(stage.label);
      }
    },
  );

  it.runIf(built)("runs start, problem, topic, level, then the tail", () => {
    const html = page();
    const order = [
      "Start here",
      "What keeps breaking right now?",
      'data-track="home-applies"',
      'data-track="home-levels"',
      'data-track="home-craft"',
      'data-track="home-start"',
      'role="search"',
    ].map((marker) => {
      const at = html.indexOf(marker);
      expect(at, marker).toBeGreaterThan(-1);
      return at;
    });
    for (let i = 1; i < order.length; i++) {
      expect(order[i], String(i)).toBeGreaterThan(order[i - 1]);
    }
  });

  it.runIf(built)("carries a search field in the body, not only the nav's icon", () => {
    const main = page().split("<main")[1].split("</main>")[0];
    const form = main.slice(main.indexOf('role="search"'), main.indexOf("</form>"));
    expect(form).toContain('action="/search"');
    expect(form).toMatch(/<input[^>]*name="q"/);
    expect(form).toMatch(/<button[^>]*type="submit"/);
    expect(form).toContain("Search the site");
  });
});
