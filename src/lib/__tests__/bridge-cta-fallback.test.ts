import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { fallbackExerciseId, practiceCloser } from "../bridge-cta-fallback";
import { getAtomUrl, loadAtoms, loadBridges } from "../content";
import { getGuideDrills, nextDrill } from "../guide-concepts";

/**
 * A guide with no declared CTA gets its drill card from its own closer.
 *
 * Forty guides end in a practice section and 38 name drills there in
 * backticks; `primary_cta_target` was a hand copy of the first one on 23 of
 * the 26 guides that declared an exercise CTA, and absent on 12 whose closer
 * names a drill (novel-insights entry 183, 2026-09-21). The page now derives
 * the card from the closer when the field is absent, so the field is an
 * override and the section is the source.
 *
 * These are guards on the derivation, not on the markup: the failure mode is
 * a parser that quietly stops matching the closer heading, or a section split
 * that swallows the next H2, and either would return null for every guide
 * while the page still rendered — with the entry-path card it always had.
 */

const EXERCISE_IDS = new Set(["last-word-response", "mirroring"]);

describe("practice closer", () => {
  it("is the section under the practise H2 up to the next H2", () => {
    const md = [
      "# Title",
      "## Why it matters",
      "`mirroring` here does not count.",
      "## How to practise it",
      "First, `last-word-response`.",
      "### A sub-heading stays inside",
      "Then `mirroring`.",
      "## The honest caveat",
      "`mirroring` again, outside.",
    ].join("\n");
    expect(practiceCloser(md)).toBe(
      "First, `last-word-response`.\n### A sub-heading stays inside\nThen `mirroring`.",
    );
    expect(fallbackExerciseId(md, EXERCISE_IDS)).toBe("last-word-response");
  });

  it("matches the heading case-insensitively and runs to the end of the file", () => {
    const md = "## The Part You Can Practise\n\nDo `mirroring`.\n";
    expect(practiceCloser(md)).toBe("\nDo `mirroring`.\n");
    expect(fallbackExerciseId(md, EXERCISE_IDS)).toBe("mirroring");
  });

  it("skips backticked ids that are not exercises", () => {
    const md = "## Practise the listening part\n`space-work` then `last-word-response`.";
    expect(fallbackExerciseId(md, EXERCISE_IDS)).toBe("last-word-response");
    expect(fallbackExerciseId(md, new Set(["space-work"]))).toBe("space-work");
    expect(fallbackExerciseId(md, new Set())).toBeNull();
  });

  it("is null when no H2 mentions practice, even if the body does", () => {
    const md = "## Practice\nNot the same word.\n\nYou should practise `mirroring`.";
    expect(practiceCloser(md)).toBeNull();
    expect(fallbackExerciseId(md, EXERCISE_IDS)).toBeNull();
  });

  it("does not take an H3 or a heading inside a sentence for the closer", () => {
    const md = "### How to practise it\n`mirroring`\n\nWe practise ## this daily.";
    expect(practiceCloser(md)).toBeNull();
  });
});

describe("bridge CTA fallback over the corpus", () => {
  it("yields a drill for the no-CTA guides with a closer, and never without one", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    // Guard the guard: a loader returning a handful would pass the counts below.
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const exerciseIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "exercise").map((a) => a.frontmatter.id),
    );
    expect(exerciseIds.size).toBeGreaterThanOrEqual(20);

    const noCta = bridges.filter(
      (b) => !b.frontmatter.primary_cta_type && !b.frontmatter.primary_cta_target,
    );
    expect(noCta.length).toBeGreaterThanOrEqual(30);

    const derived = noCta
      .map((b) => ({ slug: b.slug, drill: fallbackExerciseId(b.content, exerciseIds) }))
      .filter((b): b is { slug: string; drill: string } => b.drill !== null);
    // Twelve at the time of writing (2026-09-21). Set under it so a guide that
    // gains a declared CTA does not fail this; a parser that stops matching
    // the closer would drop it to zero.
    expect(derived.length).toBeGreaterThanOrEqual(10);

    // Every derived drill is a real exercise, and the guide's body names it.
    for (const { slug, drill } of derived) {
      expect(exerciseIds.has(drill), `${slug} → ${drill}`).toBe(true);
      const body = bridges.find((b) => b.slug === slug)!.content;
      expect(body.includes(`\`${drill}\``), `${slug} → ${drill}`).toBe(true);
    }

    // A guide with no closer never gets a drill from nowhere.
    const withoutCloser = bridges.filter((b) => practiceCloser(b.content) === null);
    expect(withoutCloser.length).toBeGreaterThanOrEqual(30);
    const invented = withoutCloser
      .filter((b) => fallbackExerciseId(b.content, exerciseIds) !== null)
      .map((b) => b.slug);
    expect(invented).toEqual([]);
  });

  it("agrees with the declared target where a guide has both", async () => {
    // The declared field was copied from the closer by hand on 23 of 26
    // guides; the derivation should reproduce those copies. Entry 183 found
    // three that differed; two were fixed the same day and one remains:
    // questions-to-ask-friends names `questions-only` before `gift-giving`,
    // and the field says gift-giving. Recorded 2026-09-21 as debt. The set
    // may shrink, not grow — and a paid-off entry must be struck off.
    const KNOWN_DIVERGENT = new Set(["questions-to-ask-friends"]);
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    const exerciseIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "exercise").map((a) => a.frontmatter.id),
    );
    const declared = bridges.filter(
      (b) => b.frontmatter.primary_cta_type === "exercise" && b.frontmatter.primary_cta_target,
    );
    expect(declared.length).toBeGreaterThanOrEqual(25);

    const divergent: string[] = [];
    const paidOff: string[] = [];
    let compared = 0;
    for (const b of declared) {
      const derived = fallbackExerciseId(b.content, exerciseIds);
      if (!derived) continue;
      compared++;
      const agrees = derived === b.frontmatter.primary_cta_target;
      if (!agrees && !KNOWN_DIVERGENT.has(b.slug)) {
        divergent.push(
          `${b.slug}: closer says ${derived}, field says ${b.frontmatter.primary_cta_target}`,
        );
      }
      if (agrees && KNOWN_DIVERGENT.has(b.slug)) paidOff.push(b.slug);
    }
    expect(compared).toBeGreaterThanOrEqual(20);
    expect(divergent).toEqual([]);
    expect(paidOff).toEqual([]);
  });
});

/**
 * The "Or do this drill" link beside the primary card.
 *
 * It used to come from BRIDGE_RELATIONS, a hand map in [slug]/page.tsx
 * written on 2026-04-07 that named Mirroring for 11 of its 20 guides. The
 * drill it named was backticked in the guide's body on one guide in twenty
 * and matched a declared CTA never, so on 19 guides the reader saw three
 * answers to "what drill": the path card's, the map's, and the body's
 * "Practise it" row (novel-insights entry 210, 2026-09-21). The map is
 * deleted; the slot reads the body through getGuideDrills, taking the first
 * drill that is not already the primary card.
 */
describe("the drill beside the primary card", () => {
  const drill = (id: string) => ({
    id,
    title: id,
    url: `/practice/exercises/${id}`,
    description: "",
    type: "exercise" as const,
  });

  it("is the second drill when the primary card is a drill, the first otherwise", () => {
    const drills = [drill("mirroring"), drill("blind-offer")];
    expect(nextDrill(drills, "/practice/exercises/mirroring")?.id).toBe("blind-offer");
    expect(nextDrill(drills, "/paths/beginner-foundations")?.id).toBe("mirroring");
    expect(nextDrill(drills, undefined)?.id).toBe("mirroring");
    // A guide whose body names one drill shows it once, on the card.
    expect(nextDrill([drill("mirroring")], "/practice/exercises/mirroring")).toBeNull();
    expect(nextDrill([], "/paths/beginner-foundations")).toBeNull();
  });

  it("only ever names a drill the guide's body backticks", async () => {
    const [bridges, atoms] = await Promise.all([loadBridges(), loadAtoms()]);
    expect(bridges.length).toBeGreaterThanOrEqual(70);
    const exerciseIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "exercise").map((a) => a.frontmatter.id),
    );

    // The four declared exercise CTAs the body never backticks. The field is
    // an override and a content matter; recorded 2026-09-21 as debt. The set
    // may shrink, not grow, and a paid-off entry must be struck off.
    const KNOWN_UNBACKTICKED_CTA = new Set([
      "2-person-improv-games",
      "how-to-make-friends-as-an-adult",
      "improv-games-for-kids",
      "improv-warm-up-games",
    ]);

    let withDrillLink = 0;
    let withOtherDrill = 0;
    const unbacktickedDeclared: string[] = [];
    const paidOff: string[] = [];
    for (const b of bridges) {
      const fm = b.frontmatter;
      const backticked = (id: string) => b.content.includes(`\`${id}\``);
      // Mirrors the page: declared exercise CTA, else the closer's first
      // drill when nothing is declared, else the entry path (never a drill).
      // The page now prefers the closer's first drill that fits the entry
      // path's level (entry 275); this test reads the level-blind first
      // drill because what it asserts — that the slot only names a drill the
      // body backticks — holds whichever closer drill is primary.
      let primaryId: string | null = null;
      if (fm.primary_cta_type === "exercise" && fm.primary_cta_target) {
        primaryId = fm.primary_cta_target;
      } else if (!fm.primary_cta_type && !fm.primary_cta_target) {
        primaryId = fallbackExerciseId(b.content, exerciseIds);
      }
      const primaryHref = primaryId
        ? getAtomUrl({ id: primaryId, type: "exercise" })
        : fm.entry_path
          ? `/paths/${fm.entry_path}`
          : undefined;

      if (primaryId) {
        const ok = backticked(primaryId);
        if (!ok && !KNOWN_UNBACKTICKED_CTA.has(b.slug)) {
          unbacktickedDeclared.push(`${b.slug}: ${primaryId}`);
        }
        if (ok && KNOWN_UNBACKTICKED_CTA.has(b.slug)) paidOff.push(b.slug);
      }

      const other = nextDrill(await getGuideDrills(b.slug), primaryHref);
      if (other) {
        withOtherDrill += 1;
        expect(other.type, `${b.slug}: ${other.id}`).toBe("exercise");
        expect(other.url, b.slug).not.toBe(primaryHref);
        expect(backticked(other.id), `${b.slug} → ${other.id}`).toBe(true);
      }
      if (primaryId || other) withDrillLink += 1;
    }

    expect(unbacktickedDeclared).toEqual([]);
    expect(paidOff).toEqual([]);
    // 50 guides show at least one drill link and 26 show the second slot at
    // the time of writing (2026-09-21); set under so a guide that loses a
    // drill does not fail this, while a derivation that stopped reading the
    // body would drop both to zero.
    expect(withDrillLink).toBeGreaterThanOrEqual(40);
    expect(withOtherDrill).toBeGreaterThanOrEqual(20);
  });

  it("has no hand map left to disagree with the body", () => {
    const source = readFileSync(path.resolve(__dirname, "../../app/[slug]/page.tsx"), "utf8");
    expect(source).not.toContain("BRIDGE_RELATIONS");
    // Since 2026-09-22 the slot prefers a drill that fits the entry path's
    // level (tracker entry 275, cta-levels.test.ts) and falls back to
    // nextDrill; the fallback is what keeps the slot reading the body.
    expect(source).toMatch(/nextDrill\(drills, resolvedPrimaryCta\?\.href\)/);
    expect(source).toMatch(/drillFitsLevels\(/);
  });
});
