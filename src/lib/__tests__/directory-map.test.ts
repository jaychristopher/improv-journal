import fs from "node:fs";
import path from "node:path";

import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import { describe, expect, it } from "vitest";

import { loadDirectory, loadDirectoryCities } from "../directory";
import { US_MAP_PLACES, US_MAP_ROWS, US_MAP_VIEWBOX } from "../us-map-data";

/**
 * The map of the sixty cities on /improv-near-you.
 *
 * Three things can go wrong with a map that is generated, and all three are
 * silent: a point can be in the wrong place, a target can end up on top of
 * another target, and the geometry can stop agreeing with the layout that
 * renders it. Each is a guard here.
 *
 * The arithmetic that decides whether a target is big enough depends on the
 * width the container holds the map to, so these read that width out of the
 * component rather than restating it. A narrower map is then a failing test
 * and not a quietly smaller target.
 */

const ROOT = process.cwd();
const POINTS = path.join(ROOT, "data", "map", "city-points.json");
const COMPONENT = path.join(ROOT, "src", "components", "UsCityMap.tsx");
const ATLAS = path.join(ROOT, "node_modules", "us-atlas", "states-10m.json");
const SVG = path.join(ROOT, "public", "us-map.svg");
const CSS = path.join(ROOT, "src", "app", "globals.css");
const APP = path.join(ROOT, ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

const points: { points: Record<string, { lat: number; lng: number }> } = JSON.parse(
  fs.readFileSync(POINTS, "utf8"),
);
const component = fs.readFileSync(COMPONENT, "utf8");

/** WCAG 2.2 Target Size (Minimum), AA. */
const TARGET_PX = 24;

/**
 * The narrowest the map is ever drawn, from the component's own class.
 *
 * A Tailwind `min-w-[41rem]` with the site's 16 px root is 656 CSS pixels.
 * Everything below is measured against that, because the markers are placed
 * in viewBox units and a unit is only worth what the render makes it worth.
 */
function narrowestRenderPx(): number {
  const match = component.match(/min-w-\[(\d+(?:\.\d+)?)rem\]/);
  expect(match, "the map's container states a minimum width in rem").not.toBeNull();
  return Number(match![1]) * 16;
}

describe("the map's points", () => {
  it("has one for every city of the archive, and none it does not have", () => {
    const cities = loadDirectoryCities();
    // Fifty of the fifty largest and ten more, 2026-10-01. A loader that
    // returned nothing would otherwise pass every check in this file.
    expect(cities.length).toBeGreaterThanOrEqual(50);
    expect(Object.keys(points.points).sort()).toEqual(cities.map((c) => c.slug).sort());
  });

  /**
   * The check that caught San Francisco.
   *
   * The Census gives a place's internal point, which is the centre of its land
   * area, and San Francisco's land takes in the Farallon Islands — so its
   * point is thirty kilometres out in the Pacific. A city whose point is
   * outside its own state is wrong by any reading, whatever put it there, and
   * this is the rule the import obeys too (scripts/build-us-map.mjs).
   */
  it("puts every city inside the state it says it is in", () => {
    const topo = JSON.parse(fs.readFileSync(ATLAS, "utf8"));
    const states = feature(topo, topo.objects.states) as unknown as {
      features: { properties: { name: string } }[];
    };
    const byName = new Map(states.features.map((f) => [f.properties.name, f]));
    const outside: string[] = [];
    for (const city of loadDirectoryCities()) {
      const point = points.points[city.slug];
      const polygon = byName.get(city.state);
      expect(polygon, `${city.state} is in the atlas`).toBeDefined();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!geoContains(polygon as any, [point.lng, point.lat])) {
        outside.push(`${city.slug} (${point.lat}, ${point.lng}) is not in ${city.state}`);
      }
    }
    expect(outside).toEqual([]);
  });
});

describe("the map's markers", () => {
  it("carries one row a city, in the archive's own order", () => {
    expect(US_MAP_ROWS.map((row) => row[0])).toEqual(loadDirectoryCities().map((c) => c.slug));
  });

  it("keeps every marker on the map", () => {
    for (const place of US_MAP_PLACES) {
      expect(place.x, place.slug).toBeGreaterThan(0);
      expect(place.x, place.slug).toBeLessThan(US_MAP_VIEWBOX.width);
      expect(place.y, place.slug).toBeGreaterThan(0);
      expect(place.y, place.slug).toBeLessThan(US_MAP_VIEWBOX.height);
      expect(place.markerX, place.slug).toBeGreaterThan(0);
      expect(place.markerX, place.slug).toBeLessThan(US_MAP_VIEWBOX.width);
      expect(place.markerY, place.slug).toBeGreaterThan(0);
      expect(place.markerY, place.slug).toBeLessThan(US_MAP_VIEWBOX.height);
    }
  });

  /**
   * No two targets overlap, at the narrowest the map is drawn.
   *
   * This is the accessibility of the thing. San Francisco and Oakland are
   * thirteen kilometres apart, which is under three units: left where they
   * fall, the two cities are one target and a reader can only ever reach one
   * of them. The generator moves crowded markers apart and draws a hairline
   * back to the city; this holds it to the number that makes each target
   * reachable.
   */
  it("leaves 24 CSS pixels between every pair of targets", () => {
    const unitPx = narrowestRenderPx() / US_MAP_VIEWBOX.width;
    const needed = TARGET_PX / unitPx;
    let tightest = Infinity;
    let pair = "";
    for (let i = 0; i < US_MAP_PLACES.length; i += 1) {
      for (let j = i + 1; j < US_MAP_PLACES.length; j += 1) {
        const a = US_MAP_PLACES[i];
        const b = US_MAP_PLACES[j];
        const d = Math.hypot(b.markerX - a.markerX, b.markerY - a.markerY);
        if (d < tightest) {
          tightest = d;
          pair = `${a.slug} and ${b.slug}`;
        }
      }
    }
    expect(
      tightest,
      `${pair} are ${(tightest * unitPx).toFixed(1)} CSS px apart at ${narrowestRenderPx()} px wide`,
    ).toBeGreaterThanOrEqual(needed);
  });

  /**
   * A marker that has been moved says so, and is not moved far.
   *
   * The hairline is drawn only for a marker whose `moved` is true, so a
   * marker that has drifted without the flag is a dot pointing at the wrong
   * city with nothing to say so.
   */
  it("flags every marker it moved, and moves none of them far", () => {
    let moved = 0;
    for (const place of US_MAP_PLACES) {
      const distance = Math.hypot(place.markerX - place.x, place.markerY - place.y);
      expect(place.moved, `${place.slug} is flagged iff it moved`).toBe(distance > 1);
      // 58 is MAX_DISPLACEMENT in the generator; a marker further from its
      // city than that has stopped meaning it.
      expect(distance, place.slug).toBeLessThanOrEqual(58.5);
      if (place.moved) moved += 1;
    }
    // Crowding is real: the Bay Area, Dallas and Phoenix all need it. If
    // nothing moved, the solver is not running.
    expect(moved).toBeGreaterThanOrEqual(8);
  });
});

describe("the map's parts", () => {
  it("ships the base map the stylesheet asks for", () => {
    expect(fs.existsSync(SVG)).toBe(true);
    const svg = fs.readFileSync(SVG, "utf8");
    expect(svg).toContain(`viewBox="0 0 ${US_MAP_VIEWBOX.width} ${US_MAP_VIEWBOX.height}"`);
    // Fifty states and the District of Columbia; Puerto Rico is in the atlas
    // and outside the projection, so it is not drawn.
    expect((svg.match(/<path /g) ?? []).length).toBeGreaterThanOrEqual(51);
    // Decoration: it must not announce itself to a screen reader.
    expect(svg).toContain('role="presentation"');
    const css = fs.readFileSync(CSS, "utf8");
    expect(css).toContain('mask-image: url("/us-map.svg")');
    expect(css).toContain('background-image: url("/us-map.svg")');
  });

  /**
   * The things that make the map usable without a mouse, held in the source
   * because no guard here renders React.
   */
  it("keeps the markers links, named, and the tooltip out of the way", () => {
    // Every dot is a link to a city page, not a button that moves the page.
    expect(component).toContain("href={place.href}");
    expect(
      fs.readFileSync(path.join(ROOT, "src", "app", "improv-near-you", "page.tsx"), "utf8"),
    ).toContain("href: directoryCityPath(city.slug)");
    // The whole summary is the link's name, so a screen reader needs no hover.
    expect(component).toContain("aria-label={mapLabel(place)}");
    // 24 by 24 CSS px: h-6 w-6 at the site's root size.
    expect(component).toMatch(/className="absolute grid h-6 w-6/);
    // Shown on focus as well as on hover (WCAG 1.4.13), and dismissible.
    expect(component).toContain("onFocus={() => show(place.slug)}");
    expect(component).toContain('event.key === "Escape"');
    // The tooltip repeats the link's own name, so it is not announced twice.
    expect(component).toContain('aria-hidden="true"');
    // A way past sixty tab stops.
    expect(component).toContain("sr-only focus-visible:not-sr-only");
    // Named, so a reader who tabs into the middle of it knows where they are.
    expect(component).toContain('role="group"');
    expect(component).toContain("aria-labelledby={labelledBy}");
    // Forced-colours themes replace every background a page sets, and both the
    // map and its dots are backgrounds.
    const css = fs.readFileSync(CSS, "utf8");
    expect(css).toContain("@media (forced-colors: active)");
    expect(css).toContain("background-color: LinkText");
  });
});

describe("the map as built", () => {
  it.runIf(built)("draws every city as a link, inside a tracked, derived block", () => {
    const html = fs.readFileSync(path.join(APP, "improv-near-you.html"), "utf8");
    expect(html).toContain('data-track="directory-map" data-derived="true"');
    const cities = loadDirectory();
    for (const city of cities) {
      expect(html, city.slug).toContain(`aria-label="Improv in ${city.city}, ${city.state}.`);
    }
    // The dots, as opposed to the grid's cards: one span a marker.
    expect((html.match(/us-map-dot/g) ?? []).length).toBeGreaterThanOrEqual(cities.length);
    // The base map is a file, not markup: the state outlines must not have
    // found their way into the HTML, where they cost their own weight again
    // in the flight payload beside it.
    expect(html).not.toContain("M678,480.5");
    expect(html.length).toBeLessThanOrEqual(260_000);
  });

  it.runIf(built)("tells a reader with nothing listed that there is nothing listed", () => {
    const html = fs.readFileSync(path.join(APP, "improv-near-you.html"), "utf8");
    const thin = loadDirectory().filter((city) => city.entries.length === 0);
    // 22 cities were thin on 2026-10-01; the engine fills them as it reaches
    // them, and this only has to find one to prove the branch renders.
    if (thin.length === 0) return;
    expect(html).toContain("Nothing listed yet.");
  });
});
