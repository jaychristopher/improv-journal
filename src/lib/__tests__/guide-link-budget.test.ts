import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fallbackExerciseForLevels, guideDrillLevels } from "../bridge-cta-fallback";
import {
  getAtomBySlug,
  getAtomUrl,
  getPathBySlug,
  getThreadBySlug,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadThreads,
} from "../content";
import { getGuideConcepts, getGuideDrills, getGuideLessons } from "../guide-concepts";
import { guideSources } from "../guide-sources";
import { getGuideHeadedConcepts, walkedDrills } from "../headed-concepts";
import { namedAtomIds } from "../named-concepts";
import { getRelatedBridges } from "../related-bridges";
import type { BridgeFrontmatter } from "../schema";

/**
 * `content/outlines/sitemap.md` (April 2026) is the only document in this
 * repo that wrote a per-page link budget: "Bridge articles link to: 4-6
 * atoms, 2-4 exercises, 1 primary path, 1-2 threads, 2-3 other bridge
 * articles". Entry 108 measured that 85% of a guide's links come from the
 * footer and entry 218 that everything sits within two clicks; neither had
 * the intended rule to compare against, because nobody had parsed it.
 *
 * The clauses are read out of the plan on every run rather than retyped, for
 * the reason outline-plan.test.ts parses its own targets: a number copied
 * into a test stops being the document's number the first time the document
 * changes, and then the test guards the copy.
 *
 * Each guide is counted twice. Once over `bridge.html` alone — what the
 * author wrote — and once including the blocks `src/app/[slug]/page.tsx`
 * mounts underneath it: the concept cards, the "Practise it" row, "Taught in
 * depth" (entry 205), the works block, the related rail and the CTA cards
 * (entries 220, 310, 306). The gap between the 2 readings is the finding —
 * the lesson clause is met by 5 guides in prose and by 77 once the page is
 * assembled, so the spec is satisfied by machinery rather than by writing.
 *
 * Readings are dated. Raising a floor to make a failure go away would defeat
 * the point: re-date the reading instead.
 */

const OUTLINE = path.join(process.cwd(), "content", "outlines", "sitemap.md");

/** The 5 registers the budget names, in the order the plan lists them. */
type Layer = "atoms" | "exercises" | "paths" | "threads" | "guides";

const LAYERS: Layer[] = ["atoms", "exercises", "paths", "threads", "guides"];

interface Clause {
  layer: Layer;
  /** The first number on the bullet: the floor the plan asked for. */
  min: number;
  /** The whole bullet, kept so an unparsed one is visible in a failure. */
  text: string;
}

/**
 * The budget as data: the `- 4-6 atoms (…)` bullets under "Bridge articles
 * link to:". A bullet naming no register this site has is skipped rather
 * than guessed at, and the count assertion below catches a skip.
 *
 * "other bridge articles" is tested for before "path" and "thread" only
 * because the bullets are prose: a clause is filed by the noun it counts.
 */
function parseBudget(markdown: string): Clause[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => /^###\s+Bridge articles link to:/.test(line));
  if (start < 0) return [];

  const clauses: Clause[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3}\s/.test(line)) break;
    const bullet = /^-\s+(\d+)(?:\s*[-–—]\s*\d+)?\s+(.+)$/.exec(line.trim());
    if (!bullet) continue;
    const noun = bullet[2];
    const layer: Layer | null = /atom/i.test(noun)
      ? "atoms"
      : /exercise/i.test(noun)
        ? "exercises"
        : /bridge article/i.test(noun)
          ? "guides"
          : /path/i.test(noun)
            ? "paths"
            : /thread/i.test(noun)
              ? "threads"
              : null;
    if (!layer) continue;
    clauses.push({ layer, min: Number(bullet[1]), text: line.trim() });
  }
  return clauses;
}

function budget(): Clause[] {
  return parseBudget(fs.readFileSync(OUTLINE, "utf-8"));
}

/** Every site-relative href in a fragment, hash and query dropped. */
function hrefsIn(html: string): string[] {
  return [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1].replace(/\/$/, "") || "/");
}

/**
 * url → the register it belongs to, built from the corpus rather than from
 * the route folders, because the type decides an atom's address
 * (`getAtomUrl`) and no prefix identifies the layer on its own: `/library/x`
 * and `/practice/techniques/x` are both atoms.
 *
 * An exercise is an atom too. It is filed under `exercises` here and counted
 * into the atom clause as well, because the plan's atom bullet says "the
 * concepts explained in the article" and its exercise bullet is a subset of
 * that rather than a sibling of it. Counted the narrow way instead — atoms
 * that are not exercises — the prose clause reads 75 of 78 rather than 77,
 * median 7 rather than 10.
 */
async function layerIndex(): Promise<Map<string, Layer>> {
  const [atoms, bridges, paths, threads] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadPaths(),
    loadThreads(),
  ]);
  const index = new Map<string, Layer>();
  for (const bridge of bridges) index.set(`/${bridge.slug}`, "guides");
  for (const p of paths) index.set(`/paths/${p.frontmatter.id}`, "paths");
  for (const t of threads) index.set(`/threads/${t.frontmatter.id}`, "threads");
  for (const atom of atoms) {
    const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
    index.set(url, atom.frontmatter.type === "exercise" ? "exercises" : "atoms");
  }
  return index;
}

/** Distinct links per register, the guide's own page excluded. */
function tally(urls: Iterable<string>, index: Map<string, Layer>, self: string) {
  const buckets: Record<Layer, Set<string>> = {
    atoms: new Set(),
    exercises: new Set(),
    paths: new Set(),
    threads: new Set(),
    guides: new Set(),
  };
  for (const raw of urls) {
    const url = raw.replace(/\/$/, "") || "/";
    if (url === `/${self}`) continue;
    const layer = index.get(url);
    if (layer) buckets[layer].add(url);
  }
  const counts: Record<Layer, number> = {
    // An exercise counts toward the atom clause as well; see layerIndex.
    atoms: buckets.atoms.size + buckets.exercises.size,
    exercises: buckets.exercises.size,
    paths: buckets.paths.size,
    threads: buckets.threads.size,
    guides: buckets.guides.size,
  };
  return counts;
}

/**
 * The hrefs the CTA cards resolve to, in the route's own order of preference:
 * the declared primary, else the drill the practice closer names, else the
 * entry path; then the secondary card, whatever layer it lands in. Read
 * through the same lib functions `src/app/[slug]/page.tsx` calls, so a change
 * to the resolution order shows up here rather than in a copy of it.
 */
async function ctaHrefs(
  fm: BridgeFrontmatter,
  content: string,
  exerciseTags: Map<string, string[]>,
): Promise<string[]> {
  const hrefs: string[] = [];
  const entryPath = fm.entry_path ? await getPathBySlug(fm.entry_path) : null;

  if (fm.primary_cta_type && fm.primary_cta_target) {
    const target = fm.primary_cta_target;
    if (fm.primary_cta_type === "path") {
      const p = await getPathBySlug(target);
      if (p) hrefs.push(`/paths/${p.frontmatter.id}`);
    } else if (fm.primary_cta_type === "thread") {
      const t = await getThreadBySlug(target);
      if (t) hrefs.push(`/threads/${t.frontmatter.id}`);
    } else if (fm.primary_cta_type === "exercise") {
      const a = await getAtomBySlug(target);
      if (a?.frontmatter.type === "exercise") hrefs.push(getAtomUrl(a.frontmatter));
    }
  } else {
    const levels = guideDrillLevels(entryPath?.frontmatter.audience);
    const id = fallbackExerciseForLevels(content, exerciseTags, levels);
    const drill = id ? await getAtomBySlug(id) : null;
    if (drill) hrefs.push(getAtomUrl(drill.frontmatter));
    else if (entryPath) hrefs.push(`/paths/${entryPath.frontmatter.id}`);
  }

  if (fm.secondary_cta_target) {
    const target = fm.secondary_cta_target;
    const [p, t, a] = await Promise.all([
      getPathBySlug(target),
      getThreadBySlug(target),
      getAtomBySlug(target),
    ]);
    if (p) hrefs.push(`/paths/${p.frontmatter.id}`);
    else if (t) hrefs.push(`/threads/${t.frontmatter.id}`);
    else if (a) hrefs.push(getAtomUrl(a.frontmatter));
  }

  return hrefs;
}

interface Reading {
  slug: string;
  /** Distinct links in `bridge.html`: what the author wrote. */
  prose: Record<Layer, number>;
  /** Those plus every derived block the guide page mounts. */
  rendered: Record<Layer, number>;
  /** Whether any drill reaches the page at all — the "Practise it" source. */
  hasDrill: boolean;
}

let _readings: Promise<Reading[]> | null = null;

/** Every guide, counted both ways. Memoised: each run walks the whole corpus. */
function readings(): Promise<Reading[]> {
  if (!_readings) {
    _readings = (async () => {
      const [index, bridges, atoms] = await Promise.all([layerIndex(), loadBridges(), loadAtoms()]);
      const exerciseTags = new Map(
        atoms
          .filter((a) => a.frontmatter.type === "exercise")
          .map((a) => [a.frontmatter.id, a.frontmatter.tags ?? []]),
      );

      const out: Reading[] = [];
      for (const bridge of bridges) {
        const slug = bridge.slug;
        const [concepts, drills, lessons, related, sources, headed, cta] = await Promise.all([
          getGuideConcepts(slug),
          getGuideDrills(slug),
          getGuideLessons(slug),
          getRelatedBridges(slug),
          guideSources(slug),
          getGuideHeadedConcepts(slug),
          ctaHrefs(bridge.frontmatter, bridge.content, exerciseTags),
        ]);

        const derived = [
          ...concepts.map((c) => c.url),
          ...drills.map((d) => d.url),
          ...lessons.map((l) => l.href),
          ...related.map((r) => `/${r.slug}`),
          ...sources.map((s) => s.url),
          ...walkedDrills(headed).map((w) => w.url),
          ...cta,
        ];

        const prose = hrefsIn(bridge.html);
        out.push({
          slug,
          prose: tally(prose, index, slug),
          rendered: tally([...prose, ...derived], index, slug),
          hasDrill: drills.length > 0,
        });
      }
      return out;
    })();
  }
  return _readings;
}

/** Which clauses a reading satisfies. */
function meets(reading: Record<Layer, number>, clauses: Clause[]): Layer[] {
  return clauses.filter((c) => reading[c.layer] >= c.min).map((c) => c.layer);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

describe("the April link budget, against the guides", () => {
  /**
   * The guard on the guard. Every count below is taken against these clauses,
   * so a reworded bullet or a changed heading level would otherwise let the
   * whole file pass on an empty budget and report 78 of 78 everywhere.
   *
   * 5 bullets on 2026-09-22, 1 per register, their floors reading 4, 2, 1, 1
   * and 2 — asserted here as the plan's numbers rather than as literals.
   */
  it("parses the budget it is measuring", () => {
    const clauses = budget();
    expect(clauses.length).toBeGreaterThanOrEqual(5);
    expect([...clauses.map((c) => c.layer)].sort()).toEqual([...LAYERS].sort());
    expect(clauses.filter((c) => Number.isInteger(c.min) && c.min >= 1).length).toBe(
      clauses.length,
    );
    expect(clauses.filter((c) => c.text.length > 0).length).toBe(clauses.length);
  });

  /**
   * The author's own prose, on 2026-09-22 over 78 guides:
   *
   *   atoms 77 of 78 (median 10), exercises 38 (median 1), paths 43
   *   (median 1), lessons 5 (median 0), other guides 63 (median 4);
   *   2 guides meet all 5 clauses.
   *
   * The atom clause is exceeded by 2.5x and the lesson clause is met by 5.
   * Floors sit just under each reading. Debt, written down: 40 guides link
   * fewer than 2 drills in their body, 35 link no path, 73 link no lesson.
   */
  it("records what the guides' own prose links", async () => {
    const clauses = budget();
    expect(clauses.length).toBeGreaterThanOrEqual(5);
    const rows = await readings();
    // The population, so an empty load cannot read as 0 guides failing.
    expect(rows.length).toBeGreaterThanOrEqual(70);

    const meet = (layer: Layer) =>
      rows.filter((r) => r.prose[layer] >= clauses.find((c) => c.layer === layer)!.min).length;

    expect(meet("atoms")).toBeGreaterThanOrEqual(75);
    expect(meet("exercises")).toBeGreaterThanOrEqual(36);
    expect(meet("paths")).toBeGreaterThanOrEqual(41);
    expect(meet("guides")).toBeGreaterThanOrEqual(60);

    // The clause the writing does not meet. A floor, not a ceiling: a guide
    // that links a lesson in its body is the fix, and 5 do.
    expect(meet("threads")).toBeGreaterThanOrEqual(4);

    // The medians, so a clause cannot be met by a handful of link-heavy
    // guides while the corpus thins out underneath. Lessons sit at 0 and so
    // are not floored here; the count above carries that clause.
    expect(median(rows.map((r) => r.prose.atoms))).toBeGreaterThanOrEqual(9);
    expect(median(rows.map((r) => r.prose.exercises))).toBeGreaterThanOrEqual(1);
    expect(median(rows.map((r) => r.prose.paths))).toBeGreaterThanOrEqual(1);
    expect(median(rows.map((r) => r.prose.guides))).toBeGreaterThanOrEqual(3);

    // 2 guides meet the whole budget in their own words — the number the
    // rendered reading below is worth comparing against.
    const whole = rows.filter((r) => meets(r.prose, clauses).length === clauses.length);
    expect(whole.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * The same budget over the page the reader gets, on 2026-09-22:
   *
   *   atoms 78 of 78 (median 18), exercises 40 (median 2), paths 78
   *   (median 1), lessons 77 (median 2), other guides 78 (median 9);
   *   40 guides meet all 5 clauses.
   *
   * 3 clauses are now met by every guide on the site and none of the 3 is
   * met by writing: the path comes from the entry-path CTA card and the
   * guide clause from the related rail, which hands every guide 4. The
   * lesson clause reads 76 through `getGuideLessons` alone and 77 once a
   * declared thread CTA is counted; entry 343 recorded 76, having counted
   * the hand-off block only.
   *
   * The exercise clause is the one the furniture barely moves: 38 to 40. A
   * drill has to be named in the body before any block can offer it, so 38
   * guides fail this clause with everything rendered. docs/seeds.md lists
   * the 23 that reach no drill at all, because that fix is authoring.
   */
  it("records what the rendered guide page links", async () => {
    const clauses = budget();
    expect(clauses.length).toBeGreaterThanOrEqual(5);
    const rows = await readings();
    expect(rows.length).toBeGreaterThanOrEqual(70);

    const meet = (layer: Layer) =>
      rows.filter((r) => r.rendered[layer] >= clauses.find((c) => c.layer === layer)!.min).length;

    expect(meet("atoms")).toBeGreaterThanOrEqual(76);
    expect(meet("paths")).toBeGreaterThanOrEqual(76);
    expect(meet("guides")).toBeGreaterThanOrEqual(76);
    expect(meet("threads")).toBeGreaterThanOrEqual(75);

    // The honest gap: 40, against 38 in prose. The floor sits under both.
    expect(meet("exercises")).toBeGreaterThanOrEqual(38);

    expect(median(rows.map((r) => r.rendered.atoms))).toBeGreaterThanOrEqual(16);
    expect(median(rows.map((r) => r.rendered.threads))).toBeGreaterThanOrEqual(2);
    expect(median(rows.map((r) => r.rendered.guides))).toBeGreaterThanOrEqual(8);

    // 40 guides meet the whole budget once the page is assembled, against 2
    // in prose. Debt: 38 still do not, every one of them on the drill clause.
    const whole = rows.filter((r) => meets(r.rendered, clauses).length === clauses.length);
    expect(whole.length).toBeGreaterThanOrEqual(38);
  });

  /**
   * The invariant, and the only assertion here that is not a dated reading:
   * a derived block may add links to a guide and may never take one away.
   *
   * It can be broken without breaking anything visible. The blocks are
   * filtered against each other — the "Or do this drill" slot drops a drill
   * the primary card already holds, `walkedDrills` drops one the concept
   * block declares — and a filter written against the wrong set would
   * quietly leave a guide with fewer distinct destinations than its own
   * prose carries, which is the failure the counts above cannot see because
   * they are corpus totals. 0 guides regress on 2026-09-22.
   */
  it("never lets a guide lose a clause its prose already meets", async () => {
    const clauses = budget();
    expect(clauses.length).toBeGreaterThanOrEqual(5);
    const rows = await readings();
    expect(rows.length).toBeGreaterThanOrEqual(70);

    const lost = rows.filter((r) => {
      const after = new Set(meets(r.rendered, clauses));
      return meets(r.prose, clauses).some((layer) => !after.has(layer));
    });
    expect(lost.map((r) => r.slug)).toEqual([]);

    const thinner = rows.filter((r) => LAYERS.some((l) => r.rendered[l] < r.prose[l]));
    expect(thinner.map((r) => r.slug)).toEqual([]);
  });

  /**
   * The guides the furniture cannot answer for: no drill reaches the page
   * through any block, and the body names fewer than 2 drills of its own.
   *
   * Every drill on a guide page is read out of the body — `getGuideDrills`
   * takes the backticked ids and the CTA fallback takes the practice
   * closer's — so a guide that backticks no exercise gets no drill card, no
   * "Practise it" row and no drill beside the CTA: 28 of 78 on 2026-09-22.
   * 23 of those 28 also name fewer than 2 drills in words, and those 23 are
   * the list docs/seeds.md carries, each with its primary keyword, because
   * the fix is a sentence naming a drill.
   *
   * `namesConcept` is the rule here, not the rendered link count, so the
   * seeds page can derive the same 23 from the markdown alone. Counted by
   * rendered links the list is also 23 and is not the same 23: 21 guides
   * sit in both. `active-listening` and `how-to-be-more-creative` say a
   * second drill's name in a span that is already a link, which the
   * autolinker leaves alone, so the page carries 1 link where the body says
   * 2 names; the 2 overthinking guides link a drill they never name.
   */
  it("records the guides no block can give a drill", async () => {
    const rows = await readings();
    expect(rows.length).toBeGreaterThanOrEqual(70);

    const clauses = budget();
    const exercises = clauses.find((c) => c.layer === "exercises");
    expect(exercises?.min).toBeGreaterThanOrEqual(1);

    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    const drills = atoms
      .filter((a) => a.frontmatter.type === "exercise")
      .map((a) => ({ id: a.frontmatter.id, title: a.frontmatter.title }));
    // The population on the other side: an empty drill list would report
    // every guide mute and still pass the ceiling below.
    expect(drills.length).toBeGreaterThanOrEqual(25);

    const silent = new Set(
      bridges
        .filter((b) => namedAtomIds(b.content, drills).size < exercises!.min)
        .map((b) => b.slug),
    );
    const mute = rows.filter((r) => !r.hasDrill && silent.has(r.slug));

    expect(mute.length).toBeLessThanOrEqual(23);
    // 50 guides carry a "Practise it" row on 2026-09-22; a corpus that
    // stopped resolving drills would pass the ceiling above on its own.
    expect(rows.filter((r) => r.hasDrill).length).toBeGreaterThanOrEqual(48);
  });
});
