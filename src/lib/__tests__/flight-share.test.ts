import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * How much of every page is the React flight payload, per layer, as a dated
 * reading with a ceiling — so a change that serialises more of the shared
 * chrome behind the HTML shows up as a number instead of as a slower site.
 *
 * The flight payload (`self.__next_f.push`) is the App Router's rendered
 * server-component tree, embedded after the HTML so the client can hydrate
 * and navigate. It is the *server* components' output; a client component
 * appears in it only as a module reference plus its props, its markup living
 * once in a cached chunk. Tracker entry 265 (2026-09-22) measured the payload
 * at 58% of every page and found the footer's 46 links in it on 173 of 173
 * concept pages: the footer was a server component, so its list was
 * serialised behind every page, while the nav — a client component — cost
 * the flight nothing. The entry's remedy, "make the chrome server
 * components", had the direction backwards; the footer became a client
 * component with the promoted guides as its one prop, and the footer's
 * 10.3 kB left every page's flight (the sample concept page: 149,950 →
 * 139,373 bytes; the sample guide: 129,971 → 119,394).
 *
 * Readings on 2026-09-22 after that change, medians per layer, with the
 * before-reading from the same night in brackets:
 *
 *   layer     pages   HTML bytes            flight bytes         share
 *   guides       78   139,907 [150,448]     75,217 [85,794]      0.536 [0.569]
 *   concepts    205   103,333 [112,735]     55,417 [65,398]      0.537 [0.580]
 *   lessons      25   102,118 [112,119]     54,958 [65,042]      0.535 [0.579]
 *   paths        11   112,184 [114,333]     61,545 [66,846]      0.548 [0.584]
 *   hubs         57    76,272  [86,849]     40,147 [50,638]      0.512 [0.581]
 *
 * Two layers were re-read the same night before this landed, because other
 * work arrived between builds and the first ceilings caught it: the drill
 * pairs block on the exercise pages (concepts, +1.1 kB at the median) and
 * the composition row on every path header (paths, +8.2 kB of HTML and
 * +5.2 kB of flight on 11 pages — the row is server-rendered, so it is in
 * both). That is the test working; it is recorded here rather than absorbed
 * into the margin.
 *
 * Re-read later the same night (2026-09-22) when the footer's prop grew a
 * `title` field — the guide's title, 1,752 bytes of flight at the median
 * across 27 guides, so the footer can alternate its anchors between the
 * keyword and the title by hosting page (tracker entry 287,
 * `footerLabelsByTitle` in Footer.tsx). Four layers moved and were re-dated;
 * paths fell and kept their ceilings:
 *
 *   layer     pages   HTML bytes            flight bytes         share
 *   guides       78   141,679 [139,907]     76,777 [75,217]      0.542 [0.536]
 *   concepts    205   105,534 [103,333]     57,176 [55,417]      0.542 [0.537]
 *   lessons      25   103,005 [102,118]     56,203 [54,958]      0.543 [0.535]
 *   paths        11   108,610 [112,184]     60,045 [61,545]      0.552 [0.548]
 *   hubs         57    78,683  [76,272]     42,337 [40,147]      0.526 [0.512]
 *
 * The title accounts for about 1.75 kB of each flight rise and, on the 205
 * concept pages, for roughly 1 kB of HTML besides (27 titles in place of 27
 * keywords in the footer); the remainder, in either direction, is other
 * work that was in the same tree between the two builds. The prop is now
 * about 3.2 kB for 27 guides, against the 10.3 kB the footer cost as a
 * server component — the field earns its place, and it is the only one.
 *
 * Ceilings sit a little above the reading: about 3% on bytes and 0.015 on
 * the share. Bytes are the direct measure — chrome rendered on the server
 * again would add its size to the flight on every page of every layer at
 * once — and the share is the shape. Note the share's arithmetic before
 * raising it: prose is in the HTML and the flight both, so removing a block
 * that is in both (the transcript fold, entry 265's third bullet) *raises*
 * the share while lowering the bytes. A legitimate change that trips a
 * ceiling should re-date the reading here, not lift the number.
 */
type Layer = "guides" | "concepts" | "lessons" | "paths" | "hubs";

const CEILINGS: Record<Layer, { html: number; flight: number; share: number }> = {
  // html 151,704 and flight 83,005 on 2026-09-23, re-dated as the comment
  // above prescribes rather than lifted: the guide layer gained the sources
  // block (entry 334), the drills-walked row and the contents concept marks
  // (324) and the subject-gap line (340), all of them server-rendered blocks
  // that add to the HTML and the flight together, which is why the share
  // barely moved (0.549 against a 0.56 ceiling).
  guides: { html: 156_300, flight: 85_500, share: 0.56 },
  // flight 59,189 on 2026-09-23: the concept page gained the lineage line
  // (331), the try-it line (332) and the practice control (333). HTML is
  // still under its ceiling; the flight moved because two of the three are
  // client components whose props travel.
  //
  // html 108,865 on 2026-09-24, re-dated rather than lifted. The footer's 46
  // links moved off the opacity ramp to the contrast tokens — every one of
  // them failed AA at 3.51:1 — and `text-foreground-dim
  // hover:text-foreground-strong` is 14 characters longer than
  // `text-foreground/60 hover:text-foreground/90`. A client component still
  // server-renders into the HTML, so the class names are paid there: about
  // 640 bytes a page across the 46. The flight is untouched, which is the
  // point of the footer being a client component in the first place.
  concepts: { html: 109_400, flight: 60_400, share: 0.56 },
  // html 108,682 and flight 59,375 on 2026-09-23: the lesson page gained the
  // crosslink line (339) and the composed-from list's "also taught in" marks,
  // 74 of them across 20 lessons.
  lessons: { html: 111_900, flight: 61_200, share: 0.56 },
  paths: { html: 115_500, flight: 63_400, share: 0.565 },
  hubs: { html: 81_100, flight: 43_600, share: 0.54 },
};

/**
 * The population each layer must still hold, so a changed route pattern
 * fails here rather than measuring an empty list.
 */
const POPULATION: Record<Layer, number> = {
  guides: 70,
  concepts: 200,
  lessons: 20,
  paths: 10,
  hubs: 30,
};

/**
 * Words that only the chrome says. In the flight they mean the chrome has
 * been serialised again; in the HTML they should appear once, not twice.
 */
const NAV_ONLY = ["Guides by Topic", "Get a Prompt"];
const FOOTER_ONLY = ["Popular Guides"];

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

// `[\s\S]` rather than the `s` flag: the tsconfig target predates dotAll.
const FLIGHT = /<script>self\.__next_f\.push\([\s\S]*?\)<\/script>/g;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

const CONCEPT_ROUTE =
  /^\/(how-it-works\/(principles|diagnosis)\/[^/]+|how-it-works\/[^/]+|practice\/(exercises|techniques|formats|vocabulary)\/[^/]+|library\/[^/]+)$/;

/** The same partition link-tracking.test.ts uses, so the layers agree. */
function layerOf(url: string, guides: Set<string>): Layer {
  if (url.startsWith("/threads/")) return "lessons";
  if (url.startsWith("/paths/")) return "paths";
  if (CONCEPT_ROUTE.test(url) && !/^\/how-it-works\/(principles|diagnosis)$/.test(url)) {
    return "concepts";
  }
  if (/^\/[^/]+$/.test(url) && guides.has(url.slice(1))) return "guides";
  return "hubs";
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

interface Page {
  url: string;
  layer: Layer;
  html: string;
  flight: string;
}

function readPages(): Page[] {
  const guides = new Set(
    fs
      .readdirSync(path.join(process.cwd(), "content", "bridges"))
      .filter((f) => f.endsWith(".md"))
      .map((f) => f.replace(/\.md$/, "")),
  );
  const pages: Page[] = [];
  for (const file of walk(APP)) {
    let url =
      "/" +
      path
        .relative(APP, file)
        .split(path.sep)
        .join("/")
        .replace(/\.html$/, "");
    if (url === "/index") url = "/";
    if (url.startsWith("/_")) continue;
    const html = fs.readFileSync(file, "utf-8");
    pages.push({
      url,
      layer: layerOf(url, guides),
      html,
      flight: (html.match(FLIGHT) ?? []).join(""),
    });
  }
  return pages;
}

describe("flight share", () => {
  it("keeps the chrome on the client side of the boundary", () => {
    // The direction that keeps the chrome out of the flight is the one that
    // reads wrong at a glance (see the account above), so the boundary is
    // asserted at the source as well as in the build.
    for (const file of ["src/components/Nav.tsx", "src/components/Footer.tsx"]) {
      const src = fs.readFileSync(path.join(process.cwd(), file), "utf-8");
      expect(src.trimStart().startsWith('"use client"'), file).toBe(true);
    }
    // The one thing the footer cannot know on the client crosses as a prop,
    // trimmed: a field added to TopGuide would otherwise ride 27 times a page.
    // The title is the one field that has been let through, because the
    // footer alternates its anchors between the keyword and the title by
    // hosting page (tracker entry 287, 2026-09-22; `footerLabelsByTitle`) and
    // a client component has nowhere else to get the title from. It costs
    // about 1.7 kB of flight a page; the readings below were re-dated for it.
    const layout = fs.readFileSync(path.join(process.cwd(), "src/app/layout.tsx"), "utf-8");
    expect(layout).toContain("promoted.map(({ slug, label, title }) => ({ slug, label, title }))");
    expect(layout).toContain("<Footer topGuides={topGuides} />");
  });

  it.runIf(built)("records the flight share and the page bytes per layer under a ceiling", () => {
    const pages = readPages();
    expect(pages.length).toBeGreaterThanOrEqual(370);

    const per = new Map<Layer, Page[]>();
    for (const page of pages) per.set(page.layer, [...(per.get(page.layer) ?? []), page]);

    // Guard the guard: every page carries a payload the regex finds. A page
    // with no flight would read as a win here while being unhydratable.
    for (const page of pages) {
      expect(page.flight.length, `${page.url} has no flight payload`).toBeGreaterThan(10_000);
    }

    for (const [layer, ceiling] of Object.entries(CEILINGS) as [
      Layer,
      (typeof CEILINGS)[Layer],
    ][]) {
      const layerPages = per.get(layer) ?? [];
      expect(layerPages.length, layer).toBeGreaterThanOrEqual(POPULATION[layer]);
      const html = median(layerPages.map((p) => Buffer.byteLength(p.html)));
      const flight = median(layerPages.map((p) => Buffer.byteLength(p.flight)));
      const share = median(layerPages.map((p) => p.flight.length / p.html.length));
      // The whole reading travels in the message, so a run that trips one
      // ceiling shows the numbers to re-date the table above with.
      const reading = `${layer}: ${layerPages.length} pages, html ${html}, flight ${flight}, share ${share.toFixed(3)}`;
      expect(html, `median HTML bytes — ${reading}`).toBeLessThanOrEqual(ceiling.html);
      expect(flight, `median flight bytes — ${reading}`).toBeLessThanOrEqual(ceiling.flight);
      expect(share, `median flight share — ${reading}`).toBeLessThanOrEqual(ceiling.share);
      // A share this low would mean the payload had stopped being a copy of
      // the tree, which is not something this site can do without rewriting
      // its rendering; it is a floor on the measurement, not a target.
      expect(share, `median flight share — ${reading}`).toBeGreaterThan(0.3);
    }
  });

  it.runIf(built)("serialises the nav's and the footer's links once, in the HTML", () => {
    const pages = readPages();
    expect(pages.length).toBeGreaterThanOrEqual(370);

    const inFlight: string[] = [];
    const notOnce: string[] = [];
    let carried = 0;
    for (const page of pages) {
      for (const word of [...NAV_ONLY, ...FOOTER_ONLY]) {
        if (page.flight.includes(word)) inFlight.push(`${page.url}: ${word}`);
        // Once in the HTML: the nav's dropdown and its mobile overlay both
        // render the menu, so its words are twice in the DOM by design; the
        // footer's are once, and were twice when the flight held them too.
        const times = page.html.split(word).length - 1;
        const expected = NAV_ONLY.includes(word) ? 2 : 1;
        if (times !== expected) notOnce.push(`${page.url}: ${word} ×${times}`);
      }
      // The promoted guides still cross the boundary, as a prop. This is the
      // one part of the chrome that is in the flight on purpose, and it is
      // also what proves the regex above is reading the payload.
      if (page.flight.includes('\\"topGuides\\":[{\\"slug\\":')) carried++;
      // The delegated `link_clicked` listener finds these on the rendered
      // anchors' ancestors; they are plain attributes and survive the move.
      expect(page.html.split('data-track="nav"').length - 1, page.url).toBe(1);
      expect(page.html.split('data-track="footer"').length - 1, page.url).toBe(1);
    }
    expect(inFlight).toEqual([]);
    expect(notOnce).toEqual([]);
    expect(carried).toBe(pages.length);
  });
});
