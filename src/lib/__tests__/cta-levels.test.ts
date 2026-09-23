import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  closerExerciseIds,
  drillFitsLevels,
  drillLevelNote,
  fallbackExerciseForLevels,
  fallbackExerciseId,
  guideDrillLevels,
} from "../bridge-cta-fallback";
import { loadAtoms, loadBridges, loadPaths } from "../content";
import { matchesLevel } from "../exercise-picker";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "improv-prompts.html")) &&
  fs.existsSync(path.join(APP, "index.html"));

/**
 * The guide page's drill card reads the level of the reader its path card
 * names.
 *
 * Until 2026-09-22 the "Do this drill" card and the "Start this path" card
 * on the same guide disagreed about who was reading on 13 of the 44 guides
 * with a drill card: 7 of the 32 declared exercise CTAs and 6 of the 12
 * derived from the practice closer named a drill whose picker tags fail
 * `matchesLevel` for the entry path's audience, eleven of them handing a
 * beginner-path reader one of the intermediate courage drills the closers
 * favour — First Line Drill, Status Transfer, No-Backspace Scene, Emotional
 * Honesty Scene (tracker entry 275). The picker (entry 56), the lesson
 * hand-off (205) and the lesson drills (270) all read the level; the guide
 * card, the surface with the most search traffic, did not.
 *
 * Now `fallbackExerciseForLevels` takes the closer's first drill that fits
 * before its first drill at all, a declared drill that fails is kept (the
 * field is the author's override) with a note on the card saying which way
 * the gap runs, and the "Or do this drill" slot prefers a fitting drill.
 * These guards hold it there: the derived failures that remain are the ones
 * no closer drill could avoid, and the declared ones are named so the
 * ceiling can only come down.
 */

/**
 * Declared exercise CTAs that fail the entry path's level, 2026-09-22. The
 * author's drill stands and the card carries the level note. Fixing one
 * means changing the guide's field or the drill's tags — content, not code.
 * The set may shrink; it may not grow, and a paid-off entry must be struck.
 */
const DECLARED_LEVEL_FAILURES = new Set([
  "2-person-improv-games", // intermediate path → last-word-response, beginner
  "confidence-building-exercises", // beginner → first-line-drill, intermediate
  "how-to-be-a-better-manager", // beginner/intermediate → directed-scene, advanced
  "improv-prompts", // beginner → first-line-drill, intermediate
  "public-speaking-tips", // beginner → no-backspace-scene, intermediate
  "questions-to-ask-in-an-interview", // beginner → status-transfer, intermediate
  "would-you-rather-questions", // beginner → no-backspace-scene, intermediate
]);

/**
 * Derived drill CTAs whose closer names no drill at the entry path's level,
 * 2026-09-22: five guides whose practice section names only the courage
 * drills (assertive, rejection, caring-what-people-think, people-pleasing:
 * all intermediate on a beginner path) or, for how-to-get-better-at-improv,
 * only Last Word Response on an intermediate path. The card keeps the first
 * and carries the note. Fixing one means a fitting drill in the closer, or
 * the entry path's level page in the picker (entry 275's third proposal,
 * not yet applied). Same rule as above: shrink only, strike when paid.
 */
const UNAVOIDABLE_DERIVED_FAILURES = new Set([
  "how-to-be-more-assertive",
  "how-to-deal-with-rejection",
  "how-to-get-better-at-improv",
  "how-to-stop-caring-what-people-think",
  "how-to-stop-people-pleasing",
]);

interface GuideDrillCta {
  slug: string;
  source: "declared" | "derived";
  drill: string;
  levels: string[];
  fits: boolean;
  /** Every closer drill, so "no closer drill fits" can be checked directly. */
  closer: string[];
  /** Whether any closer drill fits the levels — false makes a failure unavoidable. */
  closerFits: boolean;
}

/** Mirrors the page: declared exercise CTA, else the level-aware closer derivation. */
async function guideDrillCtas(): Promise<GuideDrillCta[]> {
  const [bridges, atoms, paths] = await Promise.all([loadBridges(), loadAtoms(), loadPaths()]);
  expect(bridges.length).toBeGreaterThanOrEqual(70);
  expect(paths.length).toBeGreaterThanOrEqual(8);
  const tags = new Map(
    atoms
      .filter((a) => a.frontmatter.type === "exercise")
      .map((a) => [a.frontmatter.id, a.frontmatter.tags ?? []]),
  );
  expect(tags.size).toBeGreaterThanOrEqual(20);
  const audience = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter.audience ?? []]));

  const ctas: GuideDrillCta[] = [];
  for (const b of bridges) {
    const fm = b.frontmatter;
    const levels = guideDrillLevels(fm.entry_path ? audience.get(fm.entry_path) : undefined);
    let source: GuideDrillCta["source"] | null = null;
    let drill: string | null = null;
    if (fm.primary_cta_type === "exercise" && fm.primary_cta_target) {
      source = "declared";
      drill = fm.primary_cta_target;
    } else if (!fm.primary_cta_type && !fm.primary_cta_target) {
      source = "derived";
      drill = fallbackExerciseForLevels(b.content, tags, levels);
    }
    if (!source || !drill) continue;
    const closer = closerExerciseIds(b.content, new Set(tags.keys()));
    ctas.push({
      slug: b.slug,
      source,
      drill,
      levels,
      fits: drillFitsLevels(tags.get(drill) ?? [], levels),
      closer,
      closerFits: closer.some((id) => drillFitsLevels(tags.get(id) ?? [], levels)),
    });
  }
  return ctas;
}

describe("guide drill levels", () => {
  it("maps path audiences to picker levels the way the lesson page does", () => {
    expect(guideDrillLevels(["beginner"])).toEqual(["beginner"]);
    expect(guideDrillLevels(["teacher"])).toEqual(["intermediate"]);
    expect(guideDrillLevels(["performer", "advanced"])).toEqual(["advanced"]);
    // Two audiences admit both, in picker order regardless of the path's.
    expect(guideDrillLevels(["intermediate", "beginner"])).toEqual(["beginner", "intermediate"]);
    expect(guideDrillLevels([])).toEqual([]);
    expect(guideDrillLevels(undefined)).toEqual([]);
    expect(guideDrillLevels(["not-a-level"])).toEqual([]);
  });

  it("fits by the picker's own rule, and everything fits when there is no level", () => {
    expect(drillFitsLevels(["intermediate"], ["beginner"])).toBe(false);
    expect(drillFitsLevels(["intermediate"], ["beginner", "intermediate"])).toBe(true);
    // fundamentals passes beginner and intermediate, not advanced — matchesLevel's rule.
    expect(drillFitsLevels(["fundamentals"], ["beginner"])).toBe(true);
    expect(drillFitsLevels(["fundamentals"], ["advanced"])).toBe(false);
    expect(drillFitsLevels(["intermediate"], [])).toBe(true);
    expect(drillFitsLevels(["fundamentals"], ["advanced"])).toBe(
      matchesLevel(["fundamentals"], "advanced"),
    );
  });

  it("writes a note that is honest about direction, and none when the drill fits", () => {
    expect(drillLevelNote(["intermediate"], ["beginner"])).toBe(
      "An intermediate drill; the path below starts earlier.",
    );
    expect(drillLevelNote(["advanced"], ["beginner", "intermediate"])).toBe(
      "An advanced drill; the path below starts earlier.",
    );
    expect(drillLevelNote(["beginner"], ["intermediate"])).toBe(
      "A beginner drill; the path below assumes more.",
    );
    expect(drillLevelNote(["fundamentals"], ["advanced"])).toBe(
      "A beginner drill; the path below assumes more.",
    );
    // Without a path card below, the note names the guide instead of a card
    // that is not there: the five residual derived failures declare no
    // secondary CTA, so "the path below" would point at nothing.
    expect(drillLevelNote(["intermediate"], ["beginner"], false)).toBe(
      "An intermediate drill; this guide starts earlier.",
    );
    expect(drillLevelNote(["beginner"], ["intermediate"], false)).toBe(
      "A beginner drill; this guide assumes more.",
    );
    expect(drillLevelNote(["beginner"], ["beginner"])).toBeNull();
    expect(drillLevelNote(["intermediate"], [])).toBeNull();
    // A drill with no level tag at all cannot be described, so no note.
    expect(drillLevelNote(["presence"], ["beginner"])).toBeNull();
  });

  it("derives the first closer drill that fits, else the first at all", () => {
    const tags = new Map<string, string[]>([
      ["status-transfer", ["intermediate"]],
      ["mirroring", ["fundamentals"]],
      ["first-line-drill", ["intermediate"]],
    ]);
    const md =
      "## How to practise it\n`status-transfer`, then `mirroring`, then `first-line-drill`.";
    expect(fallbackExerciseForLevels(md, tags, ["beginner"])).toBe("mirroring");
    expect(fallbackExerciseForLevels(md, tags, ["intermediate"])).toBe("status-transfer");
    // No level: the level-blind answer, unchanged.
    expect(fallbackExerciseForLevels(md, tags, [])).toBe(
      fallbackExerciseId(md, new Set(tags.keys())),
    );
    // Nothing fits: today's behaviour, the first that exists.
    const hard = "## How to practise it\n`status-transfer` then `first-line-drill`.";
    expect(fallbackExerciseForLevels(hard, tags, ["beginner"])).toBe("status-transfer");
    expect(fallbackExerciseForLevels("## Why\n`mirroring`", tags, ["beginner"])).toBeNull();
  });
});

describe("guide drill CTAs over the corpus", () => {
  it("covers the population, so a changed selector cannot pass vacuously", async () => {
    const ctas = await guideDrillCtas();
    // 44 on 2026-09-22: 32 declared, 12 derived. Under, so a guide that
    // gains or loses a CTA does not fail this; a resolver that stopped
    // reading either source would.
    expect(ctas.length).toBeGreaterThanOrEqual(40);
    expect(ctas.filter((c) => c.source === "declared").length).toBeGreaterThanOrEqual(28);
    expect(ctas.filter((c) => c.source === "derived").length).toBeGreaterThanOrEqual(10);
    // And the level check is live: most guides sit on a path with a level.
    expect(ctas.filter((c) => c.levels.length > 0).length).toBeGreaterThanOrEqual(40);
  });

  it("derives a drill that fits the entry path's level whenever the closer offers one", async () => {
    const ctas = await guideDrillCtas();
    const derived = ctas.filter((c) => c.source === "derived");
    // Zero avoidable failures: a derived drill may fail only when no drill
    // in the closer fits. Independent of the set below, so the set cannot
    // hide a chooser that stopped preferring the fitting drill.
    const avoidable = derived
      .filter((c) => !c.fits && c.closerFits)
      .map((c) => `${c.slug}: ${c.drill} for ${c.levels.join("/")}, closer ${c.closer.join(", ")}`);
    expect(avoidable).toEqual([]);

    // The unavoidable ones are named. Shrink only; strike when paid.
    const unavoidable = derived.filter((c) => !c.fits && !c.closerFits);
    const unexpected = unavoidable
      .filter((c) => !UNAVOIDABLE_DERIVED_FAILURES.has(c.slug))
      .map((c) => `${c.slug}: ${c.drill} for ${c.levels.join("/")}`);
    const paidOff = derived
      .filter((c) => c.fits && UNAVOIDABLE_DERIVED_FAILURES.has(c.slug))
      .map((c) => c.slug);
    expect(unexpected).toEqual([]);
    expect(paidOff).toEqual([]);
    expect(unavoidable.length).toBeLessThanOrEqual(UNAVOIDABLE_DERIVED_FAILURES.size);
    // Guard the guard: the recorded set is not vacuous while its guides exist.
    expect(unavoidable.length).toBeGreaterThanOrEqual(3);
  });

  it("holds the declared failures to the named ceiling", async () => {
    const ctas = await guideDrillCtas();
    const failing = ctas.filter((c) => c.source === "declared" && !c.fits);
    const unexpected = failing
      .filter((c) => !DECLARED_LEVEL_FAILURES.has(c.slug))
      .map((c) => `${c.slug}: ${c.drill} for ${c.levels.join("/")}`);
    const paidOff = ctas
      .filter((c) => c.source === "declared" && c.fits && DECLARED_LEVEL_FAILURES.has(c.slug))
      .map((c) => c.slug);
    expect(unexpected).toEqual([]);
    expect(paidOff).toEqual([]);
    expect(failing.length).toBeLessThanOrEqual(DECLARED_LEVEL_FAILURES.size);
  });

  it("changed the charismatic guide's derived drill from Status Transfer to Mirroring", async () => {
    // The one derived CTA the level rule moved on 2026-09-22: the closer
    // names Status Transfer (intermediate) before Mirroring (fundamentals)
    // on a beginner path. Pinned so a regression in the chooser shows here
    // by name rather than as a count.
    const ctas = await guideDrillCtas();
    const charismatic = ctas.find((c) => c.slug === "how-to-be-more-charismatic");
    expect(charismatic?.source).toBe("derived");
    expect(charismatic?.drill).toBe("mirroring");
    expect(charismatic?.fits).toBe(true);
  });
});

describe("the built guide pages", () => {
  const card = (html: string) => {
    const start = html.indexOf("Do this drill");
    expect(start).toBeGreaterThan(-1);
    // The card is one div; the next card's label ends it. Enough to hold the
    // title anchor and the description paragraph.
    return html.slice(start, start + 2000);
  };

  it.runIf(built)("say on /improv-prompts that First Line Drill is above its beginner path", () => {
    const html = fs.readFileSync(path.join(APP, "improv-prompts.html"), "utf-8");
    const block = card(html);
    expect(block).toContain('href="/practice/exercises/first-line-drill"');
    expect(block).toContain("An intermediate drill; the path below starts earlier.");
  });

  it.runIf(built)("ship Mirroring, not Status Transfer, on /how-to-be-more-charismatic", () => {
    const html = fs.readFileSync(path.join(APP, "how-to-be-more-charismatic.html"), "utf-8");
    const block = card(html);
    const firstHref = block.match(/<a\b[^>]*\bhref="([^"]+)"/)?.[1];
    expect(firstHref).toBe("/practice/exercises/mirroring");
    expect(block).not.toContain("the path below starts earlier");
  });

  it.runIf(built)("name the guide, not a path card, on a residual derived failure", () => {
    // how-to-stop-people-pleasing: beginner path, closer names only the
    // intermediate courage drills, no secondary CTA — so no path card below.
    const html = fs.readFileSync(path.join(APP, "how-to-stop-people-pleasing.html"), "utf-8");
    const block = card(html);
    expect(block).toContain('href="/practice/exercises/emotional-honesty-scene"');
    expect(block).toContain("An intermediate drill; this guide starts earlier.");
    expect(block).not.toContain("the path below");
  });

  it.runIf(built)("carry no note on a guide whose drill fits", () => {
    const html = fs.readFileSync(path.join(APP, "conversation-starters.html"), "utf-8");
    const block = card(html);
    expect(block).toContain('href="/practice/exercises/last-word-response"');
    expect(block).not.toContain("the path below");
  });
});
