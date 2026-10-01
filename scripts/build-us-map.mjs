/**
 * The directory's map: a base map for `public/us-map.svg` and a marker
 * position for every city in `src/lib/us-map-data.ts`.
 *
 * Why generate rather than render: an inline SVG of the states is 40 kB of
 * path data, and in the App Router that cost is paid twice — once in the HTML
 * and again in the flight payload that describes it. As a file it is fetched
 * once, cached, and tinted by CSS, so the page carries only the sixty markers.
 *
 * Provenance. The points are the US Census Bureau's 2023 Gazetteer place file
 * (public domain), matched to the archive's cities by name within their own
 * state and stored in `data/map/city-points.json`:
 *
 *   node scripts/build-us-map.mjs --gazetteer <2023_Gaz_place_national.txt>
 *
 * That pass refuses to write a point that falls outside the state it claims —
 * which is how San Francisco's Farallon Islands were caught (the city's areal
 * internal point is 30 km out in the Pacific) and given the exception
 * recorded in the data file. `directory-map.test.ts` holds the same rule over
 * the committed points, so the check survives the import that made it.
 *
 * The shapes are us-atlas's 1:10m state TopoJSON, projected with
 * geoAlbersUsa (Alaska and Hawai'i inset bottom-left, as that projection
 * does), simplified with Douglas-Peucker at a tolerance below what the
 * rendered map can show, and rounded to a tenth of a unit.
 *
 * Run `node scripts/build-us-map.mjs` after changing the city list.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { geoAlbersUsa, geoContains } from "d3-geo";
import { feature } from "topojson-client";

const ROOT = path.resolve(import.meta.dirname, "..");
const CITIES = path.join(ROOT, "data", "directory", "cities.json");
const POINTS = path.join(ROOT, "data", "map", "city-points.json");
const ATLAS = path.join(ROOT, "node_modules", "us-atlas", "states-10m.json");
const SVG_OUT = path.join(ROOT, "public", "us-map.svg");
const TS_OUT = path.join(ROOT, "src", "lib", "us-map-data.ts");

/** The viewBox the projection is fitted to, and the page lays markers out in. */
const WIDTH = 975;
const HEIGHT = 610;

/**
 * How far apart two markers must sit, in viewBox units.
 *
 * WCAG 2.2 Target Size (Minimum) wants a target of at least 24 by 24 CSS
 * pixels, and two targets that overlap are one target however large they are.
 * The map never renders narrower than the 41rem its container holds it to —
 * 656 px of its 975 units, so a unit is 0.673 CSS px and 24 px is 35.7 units.
 * 36 leaves a little margin. Thirteen kilometres separate San Francisco and
 * Oakland, under three units, so without this the two would be one target.
 *
 * `directory-map.test.ts` reads the container's width out of the component
 * and does this arithmetic again, so narrowing the map fails the suite rather
 * than quietly shrinking what a reader has to hit.
 */
const MIN_SEPARATION = 36;
/**
 * How finely the coastline is kept, in viewBox units.
 *
 * 0.8 of a unit is 0.6 of a CSS pixel at the map's narrowest render, which is
 * below what the screen can draw; the 1:10m outline costs 80 kB kept at a
 * tenth of that and shows no more.
 */
const SIMPLIFY_TOLERANCE = 0.8;
/** How far a marker may be moved from its true point before it stops meaning it. */
const MAX_DISPLACEMENT = 58;

/**
 * Cities whose Census point is not where a reader means.
 *
 * The gazetteer's point is the centre of a place's land area, and a city that
 * owns an island owns the sea between. San Francisco takes in the Farallon
 * Islands, so its internal point is 37.7272,-123.0322 — thirty kilometres out
 * in the Pacific, outside the state polygon, which is how the containment
 * check found it. City Hall stands in for it (USGS GNIS).
 */
const EXCEPTIONS = {
  "san-francisco": {
    lat: 37.7793,
    lng: -122.4193,
    why: "Farallon Islands pull the areal centre out to sea",
  },
};

const cities = JSON.parse(readFileSync(CITIES, "utf8")).cities;
const topo = JSON.parse(readFileSync(ATLAS, "utf8"));
const states = feature(topo, topo.objects.states);
/** Puerto Rico is in the TopoJSON and outside geoAlbersUsa; it drops out below. */
const projection = geoAlbersUsa().fitSize([WIDTH, HEIGHT], states);

function statePolygon(name) {
  return states.features.find((f) => f.properties.name === name);
}

/* ------------------------------------------------------------------ points */

/** Rebuild the committed points from a Census Gazetteer place file. */
function importGazetteer(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/).slice(1);
  const places = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const f = line.split("\t").map((s) => s.trim());
    places.push({
      st: f[0],
      name: f[3],
      land: Number(f[6]),
      lat: Number(f[10]),
      lng: Number(f[11]),
    });
  }
  /** The gazetteer's name, cut back to the settlement's own. */
  const head = (name) =>
    name
      .replace(/\s+\(balance\)$/, "")
      .replace(
        /\s+(city|town|village|borough|CDP|municipality|(metro|metropolitan|consolidated|urban county)\s+government)$/i,
        "",
      )
      .trim();

  const points = {};
  const problems = [];
  for (const c of cities) {
    const polygonFor = statePolygon(c.state);
    const exception = EXCEPTIONS[c.slug];
    if (exception) {
      if (!polygonFor || !geoContains(polygonFor, [exception.lng, exception.lat])) {
        problems.push(`${c.slug}: its exception is outside ${c.state}`);
        continue;
      }
      points[c.slug] = { lat: exception.lat, lng: exception.lng };
      console.log(`  ${c.slug}: by hand — ${exception.why}`);
      continue;
    }
    const want = c.city.toLowerCase();
    const inState = places.filter((p) => p.st === c.stateCode);
    const hits = inState.filter((p) => {
      const h = head(p.name).toLowerCase();
      return h === want || h.startsWith(`${want}-`) || h.startsWith(`${want}/`);
    });
    if (hits.length === 0) {
      problems.push(`${c.slug}: no place named ${c.city} in ${c.stateCode}`);
      continue;
    }
    hits.sort((a, b) => b.land - a.land);
    const best = hits[0];
    const polygon = statePolygon(c.state);
    if (!polygon) {
      problems.push(`${c.slug}: no ${c.state} in the atlas`);
      continue;
    }
    if (!geoContains(polygon, [best.lng, best.lat])) {
      problems.push(
        `${c.slug}: ${best.name} at ${best.lat},${best.lng} is outside ${c.state} — ` +
          `give it a point by hand, with the reason`,
      );
      continue;
    }
    points[c.slug] = { lat: Number(best.lat.toFixed(4)), lng: Number(best.lng.toFixed(4)) };
  }
  if (problems.length > 0) {
    console.error("The gazetteer pass found:");
    for (const p of problems) console.error(`  ${p}`);
    console.error("\nNothing written. Fix the list or record the exception in the data file.");
    process.exit(1);
  }
  const existing = JSON.parse(readFileSync(POINTS, "utf8"));
  writeFileSync(
    POINTS,
    `${JSON.stringify({ _comment: existing._comment, points }, null, 2)}\n`,
    "utf8",
  );
  console.log(`city-points.json: ${Object.keys(points).length} points`);
}

/* ------------------------------------------------------------- projection */

/** Douglas-Peucker, so a 1:10m coastline costs what the render can show. */
function simplify(ring, tolerance) {
  if (ring.length < 3) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack = [[0, ring.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let worst = 0;
    let at = -1;
    const [ax, ay] = ring[first];
    const [bx, by] = ring[last];
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    for (let i = first + 1; i < last; i += 1) {
      const [px, py] = ring[i];
      // A ring closes on the point it opened with, so the first segment has no
      // length and perpendicular distance to it is zero for every point in
      // between. Measure from the point itself there, or the whole outline
      // thins to two coordinates and the map comes out empty.
      const d =
        len < 1e-9 ? Math.hypot(px - ax, py - ay) : Math.abs((px - ax) * dy - (py - ay) * dx) / len;
      if (d > worst) {
        worst = d;
        at = i;
      }
    }
    if (at > 0 && worst > tolerance) {
      keep[at] = 1;
      stack.push([first, at], [at, last]);
    }
  }
  return ring.filter((_, i) => keep[i] === 1);
}

const round = (n) => Math.round(n * 10) / 10;

/** One state as a path, projected, simplified and rounded. */
function statePath(featureIn) {
  const geometry = featureIn.geometry;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const parts = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const projected = [];
      for (const coordinate of ring) {
        const p = projection(coordinate);
        if (p) projected.push(p);
      }
      if (projected.length < 4) continue;
      const thinned = simplify(projected, SIMPLIFY_TOLERANCE);
      if (thinned.length < 4) continue;
      parts.push(`M${thinned.map(([x, y]) => `${round(x)},${round(y)}`).join("L")}Z`);
    }
  }
  return parts.join("");
}

/* ----------------------------------------------------------- displacement */

/**
 * Push overlapping markers apart, and no further.
 *
 * Deterministic: the only motion is a pair repulsion and a spring back to the
 * true point, run to a fixed number of iterations in city order, so the same
 * list always gives the same map. A marker that has nobody near it does not
 * move at all.
 */
function displace(points) {
  const marks = points.map(([x, y]) => [x, y]);
  for (let iteration = 0; iteration < 1200; iteration += 1) {
    for (let i = 0; i < marks.length; i += 1) {
      for (let j = i + 1; j < marks.length; j += 1) {
        let dx = marks[j][0] - marks[i][0];
        let dy = marks[j][1] - marks[i][1];
        let d = Math.hypot(dx, dy);
        if (d >= MIN_SEPARATION) continue;
        if (d < 0.001) {
          // Coincident: part them along a direction fixed by their order.
          dx = (j % 2 === 0 ? 1 : -1) * 0.01;
          dy = 0.01;
          d = Math.hypot(dx, dy);
        }
        const push = ((MIN_SEPARATION - d) / 2) * 0.35;
        const ux = dx / d;
        const uy = dy / d;
        marks[i][0] -= ux * push;
        marks[i][1] -= uy * push;
        marks[j][0] += ux * push;
        marks[j][1] += uy * push;
      }
    }
    for (let i = 0; i < marks.length; i += 1) {
      // A weak spring home, so displacement is only ever as much as the
      // crowding demands.
      marks[i][0] += (points[i][0] - marks[i][0]) * 0.02;
      marks[i][1] += (points[i][1] - marks[i][1]) * 0.02;
      const dx = marks[i][0] - points[i][0];
      const dy = marks[i][1] - points[i][1];
      const d = Math.hypot(dx, dy);
      if (d > MAX_DISPLACEMENT) {
        marks[i][0] = points[i][0] + (dx / d) * MAX_DISPLACEMENT;
        marks[i][1] = points[i][1] + (dy / d) * MAX_DISPLACEMENT;
      }
    }
  }
  // The relaxation above settles where the push balances the spring, which is
  // a little inside MIN_SEPARATION. This last phase is repulsion alone, so the
  // separation the targets need is the one they end with.
  for (let iteration = 0; iteration < 500; iteration += 1) {
    let worst = Infinity;
    for (let i = 0; i < marks.length; i += 1) {
      for (let j = i + 1; j < marks.length; j += 1) {
        const dx = marks[j][0] - marks[i][0];
        const dy = marks[j][1] - marks[i][1];
        const d = Math.hypot(dx, dy);
        if (d < worst) worst = d;
        if (d >= MIN_SEPARATION || d < 0.001) continue;
        const push = ((MIN_SEPARATION - d) / 2) * 0.5;
        const ux = dx / d;
        const uy = dy / d;
        marks[i][0] -= ux * push;
        marks[i][1] -= uy * push;
        marks[j][0] += ux * push;
        marks[j][1] += uy * push;
      }
    }
    for (let i = 0; i < marks.length; i += 1) {
      const dx = marks[i][0] - points[i][0];
      const dy = marks[i][1] - points[i][1];
      const d = Math.hypot(dx, dy);
      if (d > MAX_DISPLACEMENT) {
        marks[i][0] = points[i][0] + (dx / d) * MAX_DISPLACEMENT;
        marks[i][1] = points[i][1] + (dy / d) * MAX_DISPLACEMENT;
      }
    }
    if (worst >= MIN_SEPARATION) break;
  }
  return marks;
}

/* ------------------------------------------------------------------- write */

function build() {
  const data = JSON.parse(readFileSync(POINTS, "utf8"));
  const missing = cities.filter((c) => !data.points[c.slug]);
  if (missing.length > 0) {
    console.error(`No point for: ${missing.map((c) => c.slug).join(", ")}`);
    console.error("Run with --gazetteer <file> to import them.");
    process.exit(1);
  }

  // The base map.
  const paths = [];
  for (const f of states.features) {
    const d = statePath(f);
    if (d) paths.push({ name: f.properties.name, d });
  }
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="presentation">`,
    // The fills and the borders are one path set drawn twice: as a CSS mask
    // the alpha becomes the page's own colour, so the body of a state reads
    // at a fifth of the strength of its border. The literal colours here are
    // only for the `background-image` fallback, where a neutral grey has to
    // sit on both themes.
    `<g fill="#8a8a8a" fill-opacity="0.18" stroke="#8a8a8a" stroke-opacity="0.95" stroke-width="0.7" stroke-linejoin="round">`,
    ...paths.map((p) => `<path d="${p.d}"/>`),
    `</g>`,
    `</svg>`,
    "",
  ].join("\n");
  writeFileSync(SVG_OUT, svg, "utf8");

  // The markers.
  const projected = cities.map((c) => {
    const { lat, lng } = data.points[c.slug];
    const p = projection([lng, lat]);
    if (!p) {
      console.error(`${c.slug} does not project: ${lat},${lng}`);
      process.exit(1);
    }
    return p;
  });
  const marks = displace(projected);

  let worstSeparation = Infinity;
  let worstPair = "";
  for (let i = 0; i < marks.length; i += 1) {
    for (let j = i + 1; j < marks.length; j += 1) {
      const d = Math.hypot(marks[j][0] - marks[i][0], marks[j][1] - marks[i][1]);
      if (d < worstSeparation) {
        worstSeparation = d;
        worstPair = `${cities[i].slug}/${cities[j].slug}`;
      }
    }
  }
  let worstMove = 0;
  let movedCity = "";
  const rows = cities.map((c, i) => {
    const [x, y] = projected[i];
    const [mx, my] = marks[i];
    const moved = Math.hypot(mx - x, my - y);
    if (moved > worstMove) {
      worstMove = moved;
      movedCity = c.slug;
    }
    return `  ["${c.slug}", ${round(x)}, ${round(y)}, ${round(mx)}, ${round(my)}],`;
  });

  const ts = `/**
 * Where each city sits on the map, in the units of US_MAP_VIEWBOX.
 *
 * Generated by scripts/build-us-map.mjs from data/map/city-points.json
 * (US Census 2023 Gazetteer) and us-atlas's 1:10m states, projected with
 * geoAlbersUsa. Do not edit: run the script.
 *
 * Each row is [slug, x, y, markerX, markerY]. The first pair is where the
 * city is; the second is where its target had to move to so that no two
 * targets overlap at the map's narrowest render (see MIN_SEPARATION in the
 * script). Where the two differ the map draws a hairline between them, so a
 * moved marker still points at its city. The tightest pair is
 * ${worstPair} at ${round(worstSeparation)} units; the longest move is
 * ${movedCity} at ${round(worstMove)}.
 */
export const US_MAP_VIEWBOX = { width: ${WIDTH}, height: ${HEIGHT} } as const;

/** [slug, x, y, markerX, markerY] */
export type UsMapRow = readonly [string, number, number, number, number];

// prettier-ignore
export const US_MAP_ROWS: readonly UsMapRow[] = [
${rows.join("\n")}
];

export interface UsMapPlace {
  slug: string;
  /** Where the city is. */
  x: number;
  y: number;
  /** Where its target sits, moved only as far as crowding demanded. */
  markerX: number;
  markerY: number;
  /** Whether the target had to move, so the map knows to draw the hairline. */
  moved: boolean;
}

export const US_MAP_PLACES: readonly UsMapPlace[] = US_MAP_ROWS.map(
  ([slug, x, y, markerX, markerY]) => ({
    slug,
    x,
    y,
    markerX,
    markerY,
    moved: Math.hypot(markerX - x, markerY - y) > 1,
  }),
);

export const US_MAP_PLACE_BY_SLUG: ReadonlyMap<string, UsMapPlace> = new Map(
  US_MAP_PLACES.map((place) => [place.slug, place]),
);
`;
  writeFileSync(TS_OUT, ts, "utf8");

  const bytes = Buffer.byteLength(svg);
  console.log(`us-map.svg: ${paths.length} states, ${(bytes / 1024).toFixed(1)} kB`);
  console.log(
    `us-map-data.ts: ${rows.length} cities, tightest pair ${worstPair} at ` +
      `${round(worstSeparation)} units, longest move ${movedCity} at ${round(worstMove)}`,
  );
  if (worstSeparation < MIN_SEPARATION - 1) {
    console.log(
      `  note: ${round(worstSeparation)} is under MIN_SEPARATION ${MIN_SEPARATION}; ` +
        `the cap on displacement is binding somewhere.`,
    );
  }
}

const gazetteer = process.argv.indexOf("--gazetteer");
if (gazetteer !== -1) importGazetteer(process.argv[gazetteer + 1]);
build();
