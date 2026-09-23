import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** The targets ENTITY_MAP points at, read from the source so the two stay in step. */
function personTargets(): string[] {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "content.ts"), "utf-8");
  const block = /const ENTITY_MAP[\s\S]*?\n\];/.exec(src);
  if (!block) throw new Error("ENTITY_MAP not found in content.ts");
  return [...block[0].matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]);
}

/**
 * The person linker fires, and fires once.
 *
 * It shipped as a no-op the first time. The pattern is assembled with
 * `new RegExp(\`\\b${source}\\b\`)`, and written into a template literal with
 * one backslash `\b` is the backspace character rather than a word boundary —
 * so every pattern compiled cleanly, matched nothing, and the build succeeded
 * with no links added and no error anywhere. Nothing in the suite noticed,
 * because the only symptom was an absence.
 *
 * So this asserts presence rather than correctness of markup: each person's
 * page must be linked from a substantial number of others. Before the linker,
 * Keith Johnstone was named on 80 pages and linked from 5.
 *
 * The second assertion is the runaway check. linkEntities stops after the first
 * match on a page and skips pages that already link the target, so it can
 * contribute at most one. A page can still reach two honestly — ref-spolin
 * links Viola Spolin from its opening pointer and again from the paragraph on
 * Hull House, both written by hand — so two is allowed and three means the
 * per-page flag has stopped working.
 *
 * The transcript fold (2026-09-21) was linked by a separate pass that could
 * not see the body's hrefs, so it could add one more honest link per person,
 * and the count was taken on the page with the fold removed. Since
 * 2026-09-22 the fold receives the body's link ledger (tracker entry 267,
 * `autolinkTranscript`'s `alreadyLinked`) and unwraps any anchor to a target
 * the body links, so the whole page is counted: a person the fold links is
 * one the body did not, and the ceiling of two holds across both.
 */
describe("person auto-linking", () => {
  it.runIf(built)("links each person from many pages, at most once each", () => {
    const targets = personTargets();
    expect(targets.length).toBeGreaterThan(2);

    const counts = new Map<string, number>(targets.map((t) => [t, 0]));
    const repeated: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".html")) continue;
        const html = fs.readFileSync(full, "utf8");
        const url = path
          .relative(APP, full)
          .split(path.sep)
          .join("/")
          .replace(/\.html$/, "");

        for (const target of targets) {
          // The bare anchor shape. A markdown link renders identically, so
          // this counts authorial links too — which is why the threshold
          // below allows two rather than one.
          const bare = new RegExp(`<a href="${target}">`, "g");
          const n = [...html.matchAll(bare)].length;
          if (n > 0) counts.set(target, (counts.get(target) ?? 0) + 1);
          if (n > 2) repeated.push(`${url} links ${target} ${n} times`);
        }
      }
    };
    walk(APP);

    expect(repeated).toEqual([]);
    // Johnstone alone was named on 80 pages; a floor well under that catches a
    // linker that has stopped firing without pinning the exact content.
    const best = Math.max(...counts.values());
    expect(best).toBeGreaterThan(20);
  });
});

/** Anchors to `url` whose text is exactly `text`, whatever other attributes the anchor carries. */
function anchorsTo(html: string, url: string, text: string): number {
  return [...html.matchAll(new RegExp(`<a href="${url}"[^>]*>([^<]*)</a>`, "g"))].filter(
    (m) => m[1] === text,
  ).length;
}

/**
 * The 5 schools' inbound from the prose, and the hand-off up (tracker entry
 * 331, 2026-09-22).
 *
 * The full name of a founder with a biography guide routes to the guide,
 * because the guide is the keyword page; measured on the rendered corpus of
 * 319 pages that left /traditions/spolin with 5 body links against
 * /traditions/johnstone's 128, since every "Viola Spolin" and "Spolin" went
 * to the person and the school has no other name in the prose. The school
 * rule in linkEntities links the first lone surname after the full name to
 * the school. Measured when it shipped: johnstone 128 → 128, ucb 87 → 87,
 * annoyance 72 → 72, close 40 → 43, spolin 5 → 25; /viola-spolin 69 and
 * /del-close 48, unchanged. The floors sit just under those, as dated
 * readings rather than targets — a school that drops under its floor means
 * a name has stopped routing, which is the failure this file exists for.
 *
 * Read from the loaders rather than the build so it runs on every test run:
 * the loaders render the same html the build ships.
 */
describe("the schools' inbound from the prose", () => {
  const SCHOOL_FLOORS: [string, number][] = [
    ["/traditions/johnstone", 120],
    ["/traditions/ucb", 80],
    ["/traditions/annoyance", 65],
    ["/traditions/close", 35],
    // 25 on 2026-09-22; 5 before the school rule.
    ["/traditions/spolin", 20],
  ];

  it("links each school from the corpus, at or above its dated floor", async () => {
    const [atoms, bridges, threads, paths] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
      loadPaths(),
    ]);
    const docs = [...atoms, ...bridges, ...threads, ...paths];
    // Guard the guard: 319 pages on 2026-09-22.
    expect(docs.length).toBeGreaterThanOrEqual(300);

    for (const [url, floor] of SCHOOL_FLOORS) {
      const pages = docs.filter((d) => d.html.includes(`href="${url}"`)).length;
      expect(pages, `${url} inbound pages`).toBeGreaterThanOrEqual(floor);
    }
    // The guides keep their inbound: the school rule adds a link, it does
    // not move one. 68 and 48 pages on 2026-09-22.
    expect(
      docs.filter((d) => d.html.includes('href="/viola-spolin"')).length,
    ).toBeGreaterThanOrEqual(65);
    expect(docs.filter((d) => d.html.includes('href="/del-close"')).length).toBeGreaterThanOrEqual(
      45,
    );
  });

  it("links the guide at the full name and the school at the next surname, once each", async () => {
    const atoms = await loadAtoms();
    // Mirroring is Spolin's core exercise: its Trains line says "Viola
    // Spolin" and the peak stage says "Spolin called this…". Before the
    // rule the second name linked nothing and the page reached the school
    // only through its sidebar.
    const mirroring = atoms.find((a) => a.slug === "mirroring");
    expect(mirroring).toBeDefined();
    const html = mirroring!.html;

    expect(anchorsTo(html, "/viola-spolin", "Viola Spolin")).toBe(1);
    expect(anchorsTo(html, "/traditions/spolin", "Spolin")).toBe(1);
    expect(html.indexOf('href="/viola-spolin"')).toBeLessThan(
      html.indexOf('href="/traditions/spolin"'),
    );
    // Once per target: the school link is the only anchor to the school.
    expect([...html.matchAll(/href="\/traditions\/spolin"/g)].length).toBe(1);

    // And the shape that must never appear: a surname linked out of the
    // middle of a later, unlinked full name. The handle's lookbehind is what
    // prevents it; this is the population it protects.
    const split = atoms.filter(
      (a) =>
        /Viola <a href="\/traditions\/spolin"/.test(a.html) ||
        /Del <a href="\/traditions\/close"/.test(a.html),
    );
    expect(split.map((a) => a.slug)).toEqual([]);
  });

  it("links Close's school only through the possessive after the full name", async () => {
    const [atoms, bridges, threads] = await Promise.all([
      loadAtoms(),
      loadBridges(),
      loadThreads(),
    ]);
    const docs = [...atoms, ...bridges, ...threads];
    // "Close" alone is an English word; the only surname anchor the school
    // rule writes for him is "Close's", and only on a page that says "Del
    // Close". 2 pages on 2026-09-22 (failing-forward, what-is-improv); the
    // other 40-odd reach the school through "iO".
    const possessive = docs.filter((d) => anchorsTo(d.html, "/traditions/close", "Close's") > 0);
    expect(possessive.length).toBeGreaterThanOrEqual(2);
    for (const d of possessive) {
      expect(d.content, `${d.slug} says Del Close`).toMatch(/\bDel Close\b/);
    }
    const bare = docs.filter((d) => anchorsTo(d.html, "/traditions/close", "Close") > 0);
    expect(bare.map((d) => d.slug)).toEqual([]);
  });
});
