---
key: DI-3.1
type: task
summary: An interactive US map on the directory hub — a link a city, tooltips with what is listed, and every target reachable by keyboard, screen reader and thumb
epic: "[[Improv directory]]"
parent: "[[DI-3 The archive has no map]]"
status: Done
priority: High
sequence: 1
executable: agent
estimate: 4h
labels: [directory, accessibility, product]
impact: 4
radius: 3
opportunity: 15
complexity: 3
roi: 5.0
blocked_by: []
blocks: []
files:
  - src/components/UsCityMap.tsx
  - scripts/build-us-map.mjs
  - data/map/city-points.json
  - public/us-map.svg
---

# DI-3.1 — The map

## What was found

The hub listed sixty cities as text and nothing said where they were. The
three things that make a map of this kind fail an audit are all avoidable
before a line of it is written: targets too small to hit, targets on top of
each other, and information that only a hover can reach.

Two cities are thirteen kilometres apart (San Francisco and Oakland), which
on a map of the whole country is under three units of a 975-unit viewBox.
Left where they fall they are one target and one of the two cities cannot be
reached at all.

## Run

```bash
node scripts/build-us-map.mjs
npx vitest run directory-map
```

The first command regenerates `public/us-map.svg` and `src/lib/us-map-data.ts`
from `data/map/city-points.json` and the us-atlas 1:10m states. Points were
imported once from the US Census 2023 Gazetteer place file:

```bash
node scripts/build-us-map.mjs --gazetteer <2023_Gaz_place_national.txt>
```

## Verify

`npm run build`, then the browser pass in the session's scratchpad
(`verify-map.mjs`, Chrome through Playwright at 1440 and 390 wide, light and
dark): sixty markers, every target at least 24 by 24 CSS pixels, no pair of
centres closer than 24, hover and focus both showing the tooltip, Escape
dismissing it, the tooltip surviving being hovered, a click landing on the
city's page, the page not scrolling sideways on a phone.

## Acceptance criteria

- Every one of the sixty cities is a link on the map, named for a screen
  reader, and reachable by keyboard with a visible focus ring.
- No two targets overlap at the narrowest width the map is drawn at, and the
  guard computes that from the component's own minimum width.
- The base map costs the page nothing but a cached file: no state outlines in
  the HTML or in the flight payload.
- Every city's point lies inside the state it claims.

## Scoring

Impact 4, radius 3, opportunity 15, complexity 3, ROI 5.0.

## Outcome

2026-10-01: shipped. The markers are placed by a deterministic solver that
moves a crowded one off its city only as far as the 24-pixel rule demands —
the longest move is Oakland at 19.6 units, about 14 CSS pixels — and draws a
hairline back to where the city is. The tightest pair is now Tampa and
Orlando at exactly 36 units, which is 24.2 CSS pixels at the map's narrowest
render.

The containment check caught one bad point before it shipped: San Francisco's
Census internal point is thirty kilometres out in the Pacific, because the
city's land takes in the Farallon Islands. It carries City Hall instead, with
the reason recorded in `data/map/city-points.json`.

The base map is a 38 kB file used as a CSS mask, so the page supplies the
colour and the map follows the theme; inlining it would have cost that twice,
once in the HTML and again in the flight payload. `directory-map.test.ts`
holds all of it, including re-deriving the target-separation arithmetic from
the width in the component, so narrowing the map fails the suite rather than
quietly shrinking what a reader has to hit.
