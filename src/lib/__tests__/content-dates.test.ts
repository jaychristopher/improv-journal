import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";

/**
 * No content may claim a date in the future.
 *
 * `updated` is emitted as dateModified on every article and drives the
 * sitemap's lastmod, so a date that has not happened yet is a claim about
 * freshness that is not true. Thirteen guides carried serp_checked dates a day
 * ahead of the clock — written by hand, at a point where the working date had
 * rolled over mid-session and nothing checked.
 *
 * Dates are compared against the day the test runs rather than a fixed value,
 * so this keeps working without maintenance.
 */
describe("content dates", () => {
  it("are never in the future", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const offenders: string[] = [];

    const check = (id: string, field: string, value: unknown) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(value)) return;
      if (value.slice(0, 10) > today) offenders.push(`${id}: ${field} = ${value}`);
    };

    for (const b of bridges) {
      check(b.slug, "created", b.frontmatter.created);
      check(b.slug, "updated", b.frontmatter.updated);
      check(b.slug, "serp_checked", b.frontmatter.serp_checked);
    }
    for (const a of atoms) {
      check(a.slug, "created", a.frontmatter.created);
      check(a.slug, "updated", a.frontmatter.updated);
    }
    for (const t of threads) {
      check(t.slug, "created", t.frontmatter.created);
      check(t.slug, "updated", t.frontmatter.updated);
    }
    for (const p of paths) {
      check(p.slug, "created", p.frontmatter.created);
      check(p.slug, "updated", p.frontmatter.updated);
    }

    // Guards against the loaders returning nothing and this passing on an
    // empty set — the failure mode that has hidden two other checks here.
    expect(bridges.length + atoms.length + threads.length + paths.length).toBeGreaterThan(200);
    expect(offenders).toEqual([]);
  });

  /**
   * This covered bridges only, while the future-date check above covers all
   * four types — 61 files guarded against a rule that applies to 276. An
   * update recorded before its own creation is emitted as dateModified
   * preceding datePublished, which is invalid and silently ineligible for
   * anything that reads them.
   */
  it("never record an update before creation, in any content type", async () => {
    const [bridges, atoms, threads, paths] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
      loadPaths(),
    ]);

    const backwards: string[] = [];
    let checked = 0;
    for (const item of [...bridges, ...atoms, ...threads, ...paths]) {
      const { created, updated } = item.frontmatter;
      if (!created || !updated) continue;
      checked++;
      if (updated.slice(0, 10) < created.slice(0, 10)) {
        backwards.push(`${item.slug}: created ${created}, updated ${updated}`);
      }
    }

    // Guards against the loaders returning nothing and this passing on no data.
    expect(checked).toBeGreaterThan(200);
    expect(backwards).toEqual([]);
  });
});
