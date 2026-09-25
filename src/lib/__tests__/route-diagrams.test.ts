import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";
import { ROUTE_DIAGRAMS } from "../route-diagrams";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const TRADITIONS = ["johnstone", "spolin", "close", "ucb", "annoyance"];

/**
 * Every path and every school page renders a content diagram.
 *
 * Counted on production on 2026-09-25 (SA-13.1): all eleven paths and all
 * five traditions had zero, against a corpus norm of one to four and a library
 * of 248 diagrams, because they are JSX routes the markdown transform never
 * sees. `ROUTE_DIAGRAMS` declares one existing diagram per route and
 * `<RouteDiagram>` renders it; this holds the declaration complete, every file
 * present, and — on a build — the diagram actually on the page.
 */
describe("route diagrams", () => {
  it("declares one for every path and every tradition, with a file behind it", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(11);
    const routes = [
      ...paths.map((p) => `/paths/${p.frontmatter.id}`),
      ...TRADITIONS.map((t) => `/traditions/${t}`),
    ];
    const missing = routes.filter((r) => !ROUTE_DIAGRAMS[r]);
    expect(missing).toEqual([]);
    for (const [route, d] of Object.entries(ROUTE_DIAGRAMS)) {
      expect(routes, `${route} is not a path or a tradition`).toContain(route);
      expect(d.src, route).toMatch(/^\/images\/[a-z0-9-]+\.svg$/);
      expect(fs.existsSync(path.join(process.cwd(), "public", d.src)), `${route}: ${d.src}`).toBe(
        true,
      );
      // The alt describes the information, not the artefact, and the caption
      // says something the alt does not.
      expect(d.alt.length, route).toBeGreaterThan(40);
      expect(d.caption.length, route).toBeGreaterThan(40);
      expect(d.caption, route).not.toBe(d.alt);
    }
  });

  it.runIf(built)("renders it on every one of the sixteen pages", () => {
    const pages = Object.keys(ROUTE_DIAGRAMS);
    expect(pages.length).toBeGreaterThanOrEqual(16);
    for (const route of pages) {
      const file = path.join(APP, ...route.slice(1).split("/")) + ".html";
      expect(fs.existsSync(file), route).toBe(true);
      const html = fs.readFileSync(file, "utf-8");
      const diagrams = html.match(/<svg class="dg" role="img"/g) ?? [];
      expect(diagrams.length, route).toBeGreaterThanOrEqual(1);
      // and its card names the picture
      expect(html, `${route} og:image carries the diagram's description`).toMatch(/og\?[^"]*sub=/);
    }
  });
});
