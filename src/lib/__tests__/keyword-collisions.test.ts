import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { ROUTE_KEYWORDS, routeKeywordOwners } from "../route-keywords";

/**
 * Where each hub route's title lives in src, for the check below that reads
 * the H1/title constants rather than the built HTML. Every route in
 * ROUTE_KEYWORDS is here, plus /practice, whose H1 was written to claim
 * "improv practice" without registering it (tracker entry 197).
 */
const HUB_TITLE_SOURCES: Record<string, string> = {
  "/practice": "src/app/practice/page.tsx",
  "/improv-games": "src/app/improv-games/page.tsx",
  "/practice/exercises": "src/app/practice/exercises/page.tsx",
  "/traditions/ucb": "src/app/traditions/[tradition]/page.tsx",
  "/library": "src/app/library/page.tsx",
};

/** The `pageTitle("...")` argument and any literal `<h1>` text in a hub source. */
function hubTitles(route: string): string[] {
  const src = readFileSync(path.join(process.cwd(), HUB_TITLE_SOURCES[route]), "utf-8");
  const titles: string[] = [];
  if (route === "/traditions/ucb") {
    const label = src.match(/\bucb:\s*\{\s*label:\s*"([^"]+)"/)?.[1];
    if (label) titles.push(label);
  } else {
    for (const m of src.matchAll(/pageTitle\("([^"]+)"\)/g)) titles.push(m[1]);
  }
  for (const m of src.matchAll(/<h1[^>]*>\s*([^<{]+?)\s*<\/h1>/g)) titles.push(m[1]);
  return titles;
}

/** Lowercase, punctuation to spaces, whitespace collapsed. */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

describe("keyword collisions", () => {
  /**
   * Two guides targeting the same term split the signal between them. Every
   * instance found on this site was a stranded, high-difficulty page holding a
   * target that belonged to a winnable one — so the collision was not merely
   * redundant, it was actively backing the page that could not rank.
   */
  it("never targets the same keyword from two guides", async () => {
    const owners = new Map<string, string[]>();

    for (const bridge of await loadBridges()) {
      for (const { keyword } of bridge.frontmatter.target_keywords ?? []) {
        const key = keyword.trim().toLowerCase();
        owners.set(key, [...(owners.get(key) ?? []), bridge.slug]);
      }
    }

    const collisions = [...owners.entries()]
      .filter(([, pages]) => pages.length > 1)
      .map(([keyword, pages]) => `"${keyword}" — ${pages.join(", ")}`);

    expect(collisions).toEqual([]);
  });

  it("gives every guide a distinct primary keyword", async () => {
    const primaries = (await loadBridges())
      .map((b) => (b.frontmatter.target_keywords ?? [])[0]?.keyword?.toLowerCase())
      .filter((k): k is string => Boolean(k));

    const dupes = primaries.filter((k, i) => primaries.indexOf(k) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  /**
   * A hub that lives on a route has no frontmatter, so it was outside the check
   * above entirely — and the biggest keyword on the site sits on one. Nothing
   * would have objected to a guide being built on top of "improv games".
   */
  it("never lets a guide target a keyword a hub already holds", async () => {
    const hubs = routeKeywordOwners();
    expect(hubs.size).toBeGreaterThan(5);

    const collisions: string[] = [];
    for (const bridge of await loadBridges()) {
      for (const { keyword } of bridge.frontmatter.target_keywords ?? []) {
        const route = hubs.get(keyword.trim().toLowerCase());
        if (route) collisions.push(`"${keyword}" — ${bridge.slug} vs ${route}`);
      }
    }
    expect(collisions).toEqual([]);
  });

  /**
   * The two checks above compare guides with guides and with the ten
   * registered hub keywords. The concept layer — 205 atoms, the lessons, the
   * paths — and the hubs' own H1s were outside both, and seven guide keywords
   * are the title of one of those pages, two of them primaries (tracker entry
   * 197, 2026-09-21). Six of the seven pairs link each other, so a search
   * engine can tell which is primary; "improv practice" is held by a guide
   * and by the /practice hub, and the two pages never link.
   *
   * A keyword collides when it appears as a whole phrase in the page title,
   * after punctuation is dropped and whitespace collapsed. That is wider than
   * equality with the title or its prefix, which catches only four of the
   * seven ("viola spolin" is the second half of the Spolin page's title;
   * "psychological safety" sits inside "Psychological Safety in Work Teams").
   *
   * The debt is asserted exactly: a new twin fails the test, and so does
   * resolving one without striking it off, so this list stays honest.
   */
  it("never lets a guide keyword be the title of a concept or hub page, beyond the known debt", async () => {
    const pages: { url: string; title: string }[] = [];
    const atoms = await loadAtoms();
    const threads = await loadThreads();
    const paths = await loadPaths();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(threads.length).toBeGreaterThanOrEqual(20);
    expect(paths.length).toBeGreaterThanOrEqual(10);
    for (const a of atoms) {
      pages.push({ url: `atom:${a.frontmatter.id}`, title: a.frontmatter.title });
    }
    for (const t of threads) {
      pages.push({ url: `/threads/${t.frontmatter.id}`, title: t.frontmatter.title });
    }
    for (const p of paths) {
      pages.push({ url: `/paths/${p.frontmatter.id}`, title: p.frontmatter.title });
    }
    for (const route of new Set([...Object.keys(ROUTE_KEYWORDS), "/practice"])) {
      expect(HUB_TITLE_SOURCES[route], `${route} has no title source listed`).toBeDefined();
      const titles = hubTitles(route);
      expect(titles.length, `${route}: no title constant found`).toBeGreaterThan(0);
      for (const title of titles) pages.push({ url: route, title });
    }

    const collisions: string[] = [];
    for (const bridge of await loadBridges()) {
      for (const { keyword } of bridge.frontmatter.target_keywords ?? []) {
        const needle = ` ${normalise(keyword)} `;
        for (const page of pages) {
          if (` ${normalise(page.title)} `.includes(needle)) {
            collisions.push(`"${normalise(keyword)}" — ${bridge.slug} vs ${page.url}`);
          }
        }
      }
    }

    // Known twins as of 2026-09-21. Resolve one by choosing the owner — the
    // keyword moves to the twin or the guide drops it — then strike it here.
    const debt = [
      '"psychological safety" — psychological-safety vs atom:ref-edmondson-psychological-safety',
      '"viola spolin" — viola-spolin vs atom:ref-spolin-improvisation-for-theater',
      '"fear of failure" — how-to-overcome-fear-of-failure vs atom:fear-of-failure',
      '"reading the room" — how-to-read-the-room vs atom:reading-the-room',
      '"truth in comedy" — del-close vs atom:ref-truth-in-comedy',
      '"harold improv" — del-close vs atom:harold',
      '"improv practice" — how-to-get-better-at-improv vs /practice',
    ];
    expect([...new Set(collisions)].sort()).toEqual([...debt].sort());
  });

  it("never lets two hubs hold the same keyword", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const keywords of Object.values(ROUTE_KEYWORDS)) {
      for (const { keyword } of keywords) {
        const key = keyword.trim().toLowerCase();
        if (seen.has(key)) dupes.push(key);
        seen.add(key);
      }
    }
    expect(dupes).toEqual([]);
  });

  it("leaves every guide with at least one keyword after deduplication", async () => {
    const bare = (await loadBridges())
      .filter((b) => (b.frontmatter.target_keywords ?? []).length === 0)
      .map((b) => b.slug);

    expect(bare).toEqual([]);
  });
});
