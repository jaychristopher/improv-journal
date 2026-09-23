import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * A guide's primary CTA must point at something the resolver can find.
 *
 * `resolveBridgePrimaryCta` in src/app/[slug]/page.tsx looks `primary_cta_target`
 * up by the declared `primary_cta_type`: an exercise is fetched as an atom and
 * must have `type: exercise`, a thread from content/threads, a path from
 * content/paths. Anything that misses returns null and the page renders no
 * card — silently, because the schema accepts any string as a target.
 *
 * That happened once: `this-or-that-questions` declared an exercise CTA whose
 * target was the lesson `quieting-the-planning-mind`, so the built page carried
 * zero "Do this drill" cards and nobody noticed (novel-insights entry 183,
 * 2026-09-21). The funnel test covers five guides by hand; this covers all of
 * them.
 *
 * `challenge` is a declared type the resolver returns null for, so a guide
 * using it would also render nothing. No guide does; it is asserted so that a
 * new one cannot start.
 */

/**
 * Exercise CTAs whose target the guide's body never names in backticks.
 *
 * The card after the practice closer says "Do this drill: X", and on 34 guides
 * the body has already argued for X. On these four the reader meets a card for
 * a drill the guide never mentions. Recorded 2026-09-21 as debt: the fix is a
 * sentence in each guide, not a wider exception. The set may shrink; it may not
 * grow.
 */
const UNARGUED_EXERCISE_CTAS = new Set([
  "2-person-improv-games",
  "how-to-make-friends-as-an-adult",
  "improv-games-for-kids",
  "improv-warm-up-games",
]);

describe("bridge primary CTAs", () => {
  it("resolve against the declared type", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);
    const exerciseIds = new Set(
      atoms.filter((a) => a.frontmatter.type === "exercise").map((a) => a.frontmatter.id),
    );
    const threadIds = new Set(threads.map((t) => t.frontmatter.id));
    const pathIds = new Set(paths.map((p) => p.frontmatter.id));

    const withCta = bridges.filter(
      (b) => b.frontmatter.primary_cta_type && b.frontmatter.primary_cta_target,
    );
    // Guard the guard: a loader that stops reading the field passes vacuously.
    expect(withCta.length).toBeGreaterThanOrEqual(30);

    const broken: string[] = [];
    for (const bridge of withCta) {
      const type = bridge.frontmatter.primary_cta_type;
      const target = bridge.frontmatter.primary_cta_target!;
      const ok =
        type === "exercise"
          ? exerciseIds.has(target)
          : type === "thread"
            ? threadIds.has(target)
            : type === "path"
              ? pathIds.has(target)
              : false;
      if (!ok) broken.push(`${bridge.slug}: ${type} → ${target}`);
    }

    expect(broken).toEqual([]);
  });

  it("half-declared CTAs do not exist", async () => {
    const bridges = await loadBridges();
    const half = bridges
      .filter(
        (b) =>
          Boolean(b.frontmatter.primary_cta_type) !== Boolean(b.frontmatter.primary_cta_target),
      )
      .map((b) => b.slug);
    expect(half).toEqual([]);
  });

  it("names every exercise CTA in the guide body, except the recorded debt", async () => {
    const bridges = await loadBridges();
    const exerciseCtas = bridges.filter(
      (b) => b.frontmatter.primary_cta_type === "exercise" && b.frontmatter.primary_cta_target,
    );
    expect(exerciseCtas.length).toBeGreaterThanOrEqual(25);

    const unnamed: string[] = [];
    const paidOff: string[] = [];
    for (const bridge of exerciseCtas) {
      const target = bridge.frontmatter.primary_cta_target!;
      const named = bridge.content.includes(`\`${target}\``);
      if (!named && !UNARGUED_EXERCISE_CTAS.has(bridge.slug)) {
        unnamed.push(`${bridge.slug} → ${target}`);
      }
      if (named && UNARGUED_EXERCISE_CTAS.has(bridge.slug)) paidOff.push(bridge.slug);
    }

    expect(unnamed).toEqual([]);
    // A debt that has been paid must be struck off, so the set only shrinks.
    expect(paidOff).toEqual([]);
  });
});
