import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { getNextPath } from "../path-progression";
import type { ContentStatus } from "../schema";
import { compareSeedShare, getLadderSeedShare, seedSlots } from "../status-distribution";
import { getStatusDistribution } from "../system-counts";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The status label reaches the reader on the page it describes.
 *
 * The About page has said since the first commit that "content carries a
 * status of seed, draft, or validated, and those labels are meant honestly —
 * a draft is a draft", and on 2026-09-22 the label rendered on the source
 * transcript page (one page, noindex) and nowhere else: 284 drafts, 26 seeds
 * and 9 validated pages said nothing about which they were, so the honesty
 * was in the frontmatter and the reader was told it existed on the page
 * that did not show it (tracker entry 318). The label now rides the byline as
 * a muted one-word suffix, and on the path page's program map each lesson
 * row carries its own word, because that is where the split matters most:
 * 18 of the 25 lessons and 8 of the 11 paths are seeds, 29 of the 39 lesson
 * slots on the paths hold one, and 10 of the 11 paths open on one (entry
 * 319), while the furniture around them made each look as finished as the
 * next.
 *
 * Presence, not markup: the failure modes are a byline that stops passing
 * the prop, a program map that marks drafts and not seeds, a next-path card
 * that says the next path is unusually unfinished when it is the ladder's
 * norm (entry 323: the note rendered on 9 of 9 cards), and a hub sentence
 * whose numbers stop following the frontmatter.
 */

function builtFileFor(url: string): string {
  return path.join(APP, `${url === "/" ? "/index" : url}.html`);
}

/** The byline's status word, or null when the byline carries none. */
function bylineStatus(html: string): string | null {
  const byline = /<p[^>]*data-track="byline"[^>]*>([\s\S]*?)<\/p>/.exec(html);
  if (!byline) return null;
  const m = /data-status="([a-z]+)"[^>]*>([a-z]+)</.exec(byline[1]);
  if (!m) return null;
  // The attribute and the visible word are the same field; a mismatch is a
  // component that renders one and prints the other.
  expect(m[2]).toBe(m[1]);
  return m[1];
}

interface Page {
  url: string;
  layer: "guides" | "lessons" | "paths" | "library" | "concepts";
  status: ContentStatus;
}

async function statusPages(): Promise<Page[]> {
  const [bridges, atoms, threads, paths] = await Promise.all([
    loadBridges(),
    loadAtoms(),
    loadThreads(),
    loadPaths(),
  ]);
  return [
    ...bridges.map(
      (b): Page => ({ url: `/${b.slug}`, layer: "guides", status: b.frontmatter.status }),
    ),
    ...threads.map(
      (t): Page => ({
        url: `/threads/${t.frontmatter.id}`,
        layer: "lessons",
        status: t.frontmatter.status,
      }),
    ),
    ...paths.map(
      (p): Page => ({
        url: `/paths/${p.frontmatter.id}`,
        layer: "paths",
        status: p.frontmatter.status,
      }),
    ),
    ...atoms.map(
      (a): Page => ({
        url: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
        layer: a.frontmatter.type === "reference" ? "library" : "concepts",
        status: a.frontmatter.status,
      }),
    ),
  ];
}

describe("status on the byline", () => {
  it.runIf(built)(
    "every guide, lesson, path and library page carries its status, and the right one",
    async () => {
      const missing: string[] = [];
      const wrong: string[] = [];
      const checked: Record<Page["layer"], number> = {
        guides: 0,
        lessons: 0,
        paths: 0,
        library: 0,
        concepts: 0,
      };
      let conceptsWithStatus = 0;

      for (const page of await statusPages()) {
        const file = builtFileFor(page.url);
        if (!fs.existsSync(file)) continue;
        checked[page.layer]++;
        const shown = bylineStatus(fs.readFileSync(file, "utf-8"));
        if (page.layer === "concepts") {
          // The concept page's byline is rendered by AtomDetail, whose call
          // site was owned elsewhere on 2026-09-22; the one-line edit
          // (`status={fm.status}` on its UpdatedOn) is reported, not made.
          // 0 of 173 carried the word that night. Whatever the count, a
          // concept page that shows a status shows its own.
          if (shown === null) continue;
          conceptsWithStatus++;
          if (shown !== page.status) wrong.push(`${page.url}: shows ${shown}, is ${page.status}`);
          continue;
        }
        if (shown === null) missing.push(page.url);
        else if (shown !== page.status) {
          wrong.push(`${page.url}: shows ${shown}, is ${page.status}`);
        }
      }

      // Guard the guard: 78 guides, 25 lessons, 11 paths, 32 library pages
      // on 2026-09-22. A loader returning nothing would pass on nothing.
      expect(checked.guides).toBeGreaterThanOrEqual(70);
      expect(checked.lessons).toBeGreaterThanOrEqual(20);
      expect(checked.paths).toBeGreaterThanOrEqual(10);
      expect(checked.library).toBeGreaterThanOrEqual(30);
      expect(missing).toEqual([]);
      expect(wrong).toEqual([]);
      // AtomDetail passes the prop since 2026-09-22, so every concept page
      // shows its status; the floor was 0 while the sidebar edit was in flight.
      expect(conceptsWithStatus).toBe(checked.concepts);
    },
  );

  /**
   * The distribution, as a dated reading. Seeds are a ceiling that may only
   * fall: the schema's ladder runs seed → draft → validated, and the lesson
   * rewrite (entry 254, docs/seeds.md) moves seeds down it one morning at a
   * time. A number here that rises is a page written and labelled unwritten,
   * or a seed reintroduced; either is worth a failing test.
   */
  it("records the distribution, and seeds may only fall", async () => {
    const { total, byLayer } = await getStatusDistribution();
    // 284 draft, 26 seed, 9 validated across 319 pages on 2026-09-22.
    const pages = total.seed + total.draft + total.validated;
    expect(pages).toBeGreaterThanOrEqual(300);
    expect(total.seed).toBeLessThanOrEqual(26);
    // Atoms 0 / 200 / 5, guides 0 / 77 / 1, lessons 18 / 5 / 2, paths
    // 8 / 2 / 1 (seed / draft / validated) the same night: the curriculum is
    // the seed layer, entire, and the other two layers hold no seed at all.
    expect(byLayer.atoms.seed).toBe(0);
    expect(byLayer.guides.seed).toBe(0);
    expect(byLayer.lessons.seed).toBeLessThanOrEqual(18);
    expect(byLayer.paths.seed).toBeLessThanOrEqual(8);
    // Validated is the top of the ladder and may only rise. 9 on 2026-09-22.
    expect(total.validated).toBeGreaterThanOrEqual(9);
  });
});

describe("status on the program map", () => {
  it.runIf(built)(
    "marks every seed lesson on every path, and marks no lesson wrongly",
    async () => {
      const [paths, threads] = await Promise.all([loadPaths(), loadThreads()]);
      const statusOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.status]));
      const wrong: string[] = [];
      let seedRows = 0;
      let rows = 0;

      for (const p of paths) {
        const file = builtFileFor(`/paths/${p.frontmatter.id}`);
        if (!fs.existsSync(file)) continue;
        const html = fs.readFileSync(file, "utf-8");
        const start = html.indexOf('id="program-map"');
        expect(start, `${p.frontmatter.id} renders a program map`).toBeGreaterThan(-1);
        const map = html.slice(start, html.indexOf("</section>", start));
        const marks = [...map.matchAll(/data-status="([a-z]+)"/g)].map((m) => m[1]);
        const expected = (p.frontmatter.threads ?? []).map((id) => statusOf.get(id) ?? "missing");
        rows += expected.length;
        seedRows += expected.filter((s) => s === "seed").length;
        // In order: the map lists the lessons in the path's sequence, so the
        // marks read in the same order as the frontmatter.
        if (marks.join(",") !== expected.join(",")) {
          wrong.push(`${p.frontmatter.id}: map marks [${marks}], lessons are [${expected}]`);
        }
      }

      // 39 lesson slots on 11 paths, 29 of them seeds, on 2026-09-22.
      expect(rows).toBeGreaterThanOrEqual(30);
      expect(seedRows).toBeGreaterThanOrEqual(1);
      expect(wrong).toEqual([]);
    },
  );

  /**
   * The next-path card adds a seeds note only where the next path's seed
   * share departs from the ladder's norm by more than NEXT_PATH_SEED_MARGIN.
   *
   * Until 2026-09-22 the card said "most of its lessons are still seeds"
   * where the share was over half, and the measure came back 9 of 9: every
   * next path on the ladder is over half seeds — Foundations to The Physics
   * of Connection (6 of 6), the Physics to Systems of Improv (3 of 4),
   * Systems and Teams to the Toolkit (4 of 4), the Toolkit to Advanced Game
   * (3 of 3), Everyday Life to Systems (3 of 4), Teaching to the Reference
   * Guide (4 of 4), Advanced Game to Mastering the Form (2 of 2), Mastering
   * the Form to The Art of Ensemble (2 of 3) — so the condition never failed
   * and the note was a fact about the ladder wearing a page's clothes
   * (tracker entry 323). The sentence moved up a level, to the paths hub and
   * the level hubs, and the card keeps a note only where this next path
   * differs from the norm beyond the first rung (29 seeds in 37 slots, 0.78)
   * by more than 0.25. The widest departure that night was 0.22 (the 6 paths
   * that are seeds throughout), so the count went 9 → 0. The count is
   * computed from the frontmatter; a rewrite that leaves one path far behind
   * the others puts the note back on the card that points at it.
   */
  it("keeps the seeds note off every next-path card within the margin of the ladder", async () => {
    const [paths, threads, ladder] = await Promise.all([
      loadPaths(),
      loadThreads(),
      getLadderSeedShare(),
    ]);
    const statusOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.status]));
    const lessonsOf = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.threads ?? []]));
    let withNext = 0;
    const noted: string[] = [];

    for (const p of paths) {
      const next = getNextPath(p.frontmatter.id);
      if (!next) continue;
      withNext++;
      const share = seedSlots((lessonsOf.get(next.id) ?? []).map((id) => statusOf.get(id)));
      const note = compareSeedShare(share, ladder.beyondFirstRung);
      if (note) noted.push(`${p.frontmatter.id} → ${next.id}: ${note}`);
    }

    // 9 paths have a next on 2026-09-22; a progression map read as empty
    // would pass on nothing.
    expect(withNext).toBeGreaterThanOrEqual(8);
    // 9 of 9 before entry 323, 0 of 9 after. Not a floor: a path that falls
    // far enough behind the ladder earns its note back, and this list names
    // it so the change is read rather than absorbed.
    expect(noted).toEqual([]);
  });

  it.runIf(built)(
    "the built card carries the note exactly where the frontmatter says",
    async () => {
      const [paths, threads, ladder] = await Promise.all([
        loadPaths(),
        loadThreads(),
        getLadderSeedShare(),
      ]);
      const statusOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.status]));
      const lessonsOf = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.threads ?? []]));
      const wrong: string[] = [];
      let checked = 0;

      for (const p of paths) {
        const file = builtFileFor(`/paths/${p.frontmatter.id}`);
        if (!fs.existsSync(file)) continue;
        checked++;
        const html = fs.readFileSync(file, "utf-8");
        const has = /data-next-path-seeds="(above|below)"/.exec(html)?.[1] ?? null;
        // The retired wording must not survive anywhere on the page.
        if (html.includes("Most of its lessons are still seeds")) {
          wrong.push(`${p.frontmatter.id}: carries the retired 9-of-9 note`);
        }
        const next = getNextPath(p.frontmatter.id);
        const expected = next
          ? compareSeedShare(
              seedSlots((lessonsOf.get(next.id) ?? []).map((id) => statusOf.get(id))),
              ladder.beyondFirstRung,
            )
          : null;
        if (has !== expected) {
          wrong.push(`${p.frontmatter.id}: note ${has ?? "absent"}, frontmatter says ${expected}`);
        }
      }

      // 11 paths on 2026-09-22.
      expect(checked).toBeGreaterThanOrEqual(10);
      expect(wrong).toEqual([]);
    },
  );
});

/** Built html to its visible text. */
function visible(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const readSrc = (rel: string) => fs.readFileSync(path.join(process.cwd(), "src", rel), "utf-8");

/**
 * The site fact, said once where the site describes itself.
 *
 * Entry 323's remedy for a constant marker: the ladder's seed share becomes
 * one sentence on the paths hub and the level hubs, with the numbers, and the
 * About page states the status distribution as numbers beside the promise
 * that "a draft is a draft", so the byline's word — "draft" on 284 of 319
 * pages, "seed" on 26, "validated" on 9 that night — reads as the norm and
 * links the paragraph that says so. Each sentence's numbers are computed at
 * render and checked here against the frontmatter, so the hub cannot say
 * "29 of 37" a morning after a seed is rewritten.
 */
describe("the ladder's seed share, said once", () => {
  /** "29/37" from a hub's data attribute, and the sentence it marks. */
  function ladderSentence(html: string): { seeds: number; slots: number; text: string } | null {
    const m = /<(p|span)[^>]*data-ladder-seeds="(\d+)\/(\d+)"[^>]*>([\s\S]*?)<\/\1>/.exec(html);
    if (!m) return null;
    return { seeds: Number(m[2]), slots: Number(m[3]), text: visible(m[4]) };
  }

  it("records the ladder's share as a dated reading, and seeds may only fall", async () => {
    const ladder = await getLadderSeedShare();
    // 29 of 39 slots across the 11 paths, 29 of 37 beyond Foundations, on
    // 2026-09-22. Slots are a population guard; seed slots a ceiling.
    expect(ladder.all.slots).toBeGreaterThanOrEqual(30);
    expect(ladder.all.seedSlots).toBeLessThanOrEqual(29);
    expect(ladder.beyondFirstRung.slots).toBeGreaterThanOrEqual(28);
    expect(ladder.beyondFirstRung.seedSlots).toBeLessThanOrEqual(29);
    // The first rung is the one validated path and holds no seed, which is
    // why the norm is measured without it.
    expect(ladder.all.seedSlots - ladder.beyondFirstRung.seedSlots).toBe(0);
  });

  it("the paths hub and the level hubs carry the sentence in source", () => {
    for (const rel of ["app/paths/page.tsx", "app/learn/[audience]/page.tsx"]) {
      const src = readSrc(rel);
      expect(src, `${rel} marks the sentence`).toContain("data-ladder-seeds=");
      expect(src, `${rel} says the byline carries the word`).toContain("byline says so");
      expect(src, `${rel} computes the numbers`).toContain("getLadderSeedShare()");
    }
  });

  it.runIf(built)(
    "the paths hub says it inside the ladder, with the frontmatter's numbers",
    async () => {
      const ladder = await getLadderSeedShare();
      const html = fs.readFileSync(builtFileFor("/paths"), "utf-8");
      const start = html.indexOf('data-track="level-ladder"');
      expect(start).toBeGreaterThan(-1);
      const region = html.slice(start, html.indexOf('data-track="reference-path"', start));
      const found = ladderSentence(region);
      expect(found).not.toBeNull();
      expect(found!.seeds).toBe(ladder.beyondFirstRung.seedSlots);
      expect(found!.slots).toBe(ladder.beyondFirstRung.slots);
      expect(found!.text).toContain(`${found!.seeds} of the ${found!.slots} lesson slots`);
      expect(found!.text).toContain("byline says so");
    },
  );

  it.runIf(built)("every level hub with a lesson list says it, with the same numbers", async () => {
    const ladder = await getLadderSeedShare();
    const missing: string[] = [];
    let withList = 0;
    for (const audience of ["beginner", "intermediate", "performer", "teacher", "advanced"]) {
      const file = builtFileFor(`/learn/${audience}`);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      if (!html.includes('data-track="lesson-list"')) continue;
      withList++;
      const found = ladderSentence(html);
      if (
        !found ||
        found.seeds !== ladder.beyondFirstRung.seedSlots ||
        found.slots !== ladder.beyondFirstRung.slots
      ) {
        missing.push(audience);
      }
    }
    // 5 level hubs on 2026-09-22; the sentence rides the lesson list, which
    // renders wherever the audience's paths sequence a lesson.
    expect(withList).toBeGreaterThanOrEqual(3);
    expect(missing).toEqual([]);
  });
});

describe("the status word links the paragraph that explains it", () => {
  it("the byline wraps the word in a link to /about#status, and About has the anchor", () => {
    const byline = readSrc("components/UpdatedOn.tsx");
    // Both halves, in the right nesting: the link first, the marked word
    // inside it.
    const link = byline.indexOf('href="/about#status"');
    const word = byline.indexOf("data-status={status}");
    expect(link).toBeGreaterThan(-1);
    expect(word).toBeGreaterThan(link);
    const about = readSrc("app/about/page.tsx");
    expect(about).toContain('id="status"');
    expect(about).toContain("data-status-distribution");
    expect(about).toContain("tallyStatus(");
  });

  it.runIf(built)("every byline's status word is that link", async () => {
    const unlinked: string[] = [];
    let checked = 0;
    for (const page of await statusPages()) {
      const file = builtFileFor(page.url);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, "utf-8");
      const byline = /<p[^>]*data-track="byline"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1];
      if (!byline || !byline.includes("data-status=")) continue;
      checked++;
      if (!/href="\/about#status"[^>]*>\s*<span[^>]*data-status=/.test(byline)) {
        unlinked.push(page.url);
      }
    }
    // 319 bylines carried the word on 2026-09-22 (78 guides, 25 lessons, 11
    // paths, 205 concept and library pages, AtomDetail passing the prop by
    // then); the floor sits under the 146 that carried it before it did.
    expect(checked).toBeGreaterThanOrEqual(140);
    expect(unlinked).toEqual([]);
  });

  it.runIf(built)(
    "the About page states the distribution, and the numbers are the frontmatter's",
    async () => {
      const { total } = await getStatusDistribution();
      const html = fs.readFileSync(builtFileFor("/about"), "utf-8");
      const para = /<p[^>]*data-about-status[^>]*id="status"[^>]*>([\s\S]*?)<\/p>/.exec(html);
      expect(para, "the status paragraph carries the anchor").not.toBeNull();
      const sentence = visible(para![1]);
      const pages = total.seed + total.draft + total.validated;
      // "Today 284 of the 319 pages are drafts, 26 seeds and 9 validated" on
      // 2026-09-22; whatever the morning's numbers, they are these.
      expect(sentence).toContain(`${total.draft} of the ${pages} pages are drafts`);
      expect(sentence).toContain(`${total.seed} seeds`);
      expect(sentence).toContain(`${total.validated} validated`);
      // The promise the paragraph has made since the first commit stays in it.
      expect(sentence).toContain("a draft is a draft");
    },
  );
});
