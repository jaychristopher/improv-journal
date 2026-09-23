import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";
import { getAtomUrl, loadAtoms, loadBridges, loadPaths, loadThreads } from "../content";
import { inDegreeIndex } from "../hub-order";
import { SITE_URL } from "../seo";

/**
 * The sitemap's priority and changefreq carry what the site measures.
 *
 * Both were a function of the route alone (novel-insights 240): 78 guides at
 * 0.9, 205 atoms at 0.5, "monthly" on 363 of 364 URLs the day 391 files
 * changed. The traffic potential a guide declares and the in-degree an atom
 * earns produced no variance inside a layer, so `public-speaking-tips`
 * (219,000, winnable) equalled `improv-theory` (unmeasured), an `authority`
 * guide outranked every concept it leans on, and `commitment` (required by
 * 70) equalled a drill required by two.
 *
 * Each check here recomputes the rule from the same data the sitemap reads —
 * `isStranded`/`trafficPotentialOf` for guides, `inDegreeIndex` for atoms —
 * rather than pinning values, so a guide gaining a verdict or an atom gaining
 * dependents moves its priority without an edit here, and a sitemap that
 * silently went flat again fails.
 */

const path = (url: string | URL) => new URL(String(url)).pathname.replace(/\/+$/, "") || "/";

async function build() {
  const [entries, atoms, bridges, threads, paths] = await Promise.all([
    sitemap(),
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);
  const byPath = new Map(entries.map((e) => [path(e.url), e]));
  const guidePaths = bridges.map((b) => `/${b.slug}`);
  const atomPaths = atoms.map((a) =>
    getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
  );
  const lessonPaths = threads.map((t) => `/threads/${t.frontmatter.id}`);
  const pathPaths = paths.map((p) => `/paths/${p.frontmatter.id}`);
  const contentPaths = new Set([...guidePaths, ...atomPaths, ...lessonPaths, ...pathPaths]);
  const hubPaths = [...byPath.keys()].filter((p) => !contentPaths.has(p));
  return { entries, atoms, bridges, byPath, guidePaths, atomPaths, contentPaths, hubPaths };
}

const priorityOf = (byPath: Awaited<ReturnType<typeof build>>["byPath"], p: string) => {
  const entry = byPath.get(p);
  expect(entry, `${p} missing from sitemap`).toBeDefined();
  expect(entry?.priority, `${p} has no priority`).toBeTypeOf("number");
  return entry?.priority as number;
};

describe("sitemap priority", () => {
  it("is not constant within the guides or within the atoms", async () => {
    const { byPath, guidePaths, atomPaths } = await build();
    expect(guidePaths.length).toBeGreaterThanOrEqual(70);
    expect(atomPaths.length).toBeGreaterThanOrEqual(200);

    const guideValues = new Set(guidePaths.map((p) => priorityOf(byPath, p)));
    const atomValues = new Set(atomPaths.map((p) => priorityOf(byPath, p)));
    expect([...guideValues].sort().length, "guides priorities").toBeGreaterThanOrEqual(3);
    expect([...atomValues].sort().length, "atom priorities").toBeGreaterThanOrEqual(3);
  });

  it("stays within 0.3 to 1.0 on every URL, with only the homepage at 1.0", async () => {
    const { entries } = await build();
    expect(entries.length).toBeGreaterThan(300);
    const outside = entries
      // 0.3 is /resources alone: a link list with no main-column inbound link
      // (tracker entry 248, 2026-09-21).
      .filter((e) => typeof e.priority !== "number" || e.priority < 0.3 || e.priority > 1)
      .map((e) => `${path(e.url)}: ${e.priority}`);
    expect(outside).toEqual([]);
    const top = entries.filter((e) => e.priority === 1).map((e) => path(e.url));
    expect(top).toEqual([SITE_URL].map(path));
  });

  it("never lifts an authority guide above 0.5", async () => {
    const { byPath, bridges } = await build();
    const authority = bridges.filter((b) => b.frontmatter.serp_verdict === "authority");
    // Entry 186 counted 18; a verdict can change, but not to zero.
    expect(authority.length).toBeGreaterThanOrEqual(10);
    const lifted = authority.map((b) => `/${b.slug}`).filter((p) => priorityOf(byPath, p) > 0.5);
    expect(lifted).toEqual([]);
  });

  it("puts a winnable guide with a large measured traffic potential above an unmeasured one", async () => {
    const { byPath, bridges } = await build();
    const measured = bridges.filter(
      (b) =>
        b.frontmatter.serp_verdict === "winnable" &&
        (b.frontmatter.target_keywords?.[0]?.traffic_potential ?? 0) >= 10_000,
    );
    const unmeasured = bridges.filter(
      (b) =>
        b.frontmatter.serp_verdict === undefined &&
        b.frontmatter.target_keywords?.[0]?.traffic_potential === undefined,
    );
    // Both populations exist today (entry 240 named public-speaking-tips and
    // improv-theory); if either empties, the comparison has nothing to say and
    // this should be rewritten rather than pass on nothing.
    expect(measured.length).toBeGreaterThanOrEqual(1);
    expect(unmeasured.length).toBeGreaterThanOrEqual(1);
    for (const b of measured) expect(priorityOf(byPath, `/${b.slug}`)).toBe(0.9);
    for (const b of unmeasured) expect(priorityOf(byPath, `/${b.slug}`)).toBeLessThanOrEqual(0.6);
  });

  it("gives the 35 most-required atoms 0.7, and no other atom", async () => {
    const { byPath, atoms } = await build();
    const inDegree = inDegreeIndex(atoms);
    const degree = (id: string) => inDegree.get(id) ?? 0;
    const ranked = [...atoms]
      .map((a) => a.frontmatter.id)
      .sort((a, b) => degree(b) - degree(a) || a.localeCompare(b));
    // The cut falls inside a tie today (four atoms at in-degree 25 around the
    // 35th place), broken by id in the sitemap and here alike, so it is a
    // rule and not load order — the failure mode of entry 208's hubs.
    const richClub = new Set(ranked.slice(0, 35));

    const wrong: string[] = [];
    for (const a of atoms) {
      const p = getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type });
      const priority = priorityOf(byPath, p);
      const expected = richClub.has(a.frontmatter.id)
        ? 0.7
        : degree(a.frontmatter.id) >= 10
          ? 0.6
          : 0.5;
      if (priority !== expected) {
        wrong.push(`${p}: ${priority}, in-degree ${degree(a.frontmatter.id)} expects ${expected}`);
      }
    }
    expect(wrong).toEqual([]);
    expect(atoms.filter((a) => richClub.has(a.frontmatter.id)).length).toBe(35);
  });
});

describe("sitemap changefreq", () => {
  it("is weekly for content changed in the last 30 days, monthly otherwise, and weekly on hubs", async () => {
    const { byPath, contentPaths, hubPaths } = await build();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const wrong: string[] = [];
    let weekly = 0;
    for (const p of contentPaths) {
      const entry = byPath.get(p);
      expect(entry, `${p} missing from sitemap`).toBeDefined();
      const modified = String(entry?.lastModified ?? "").slice(0, 10);
      const expected = modified >= since ? "weekly" : "monthly";
      if (entry?.changeFrequency !== expected) {
        wrong.push(`${p}: ${entry?.changeFrequency}, lastmod ${modified}`);
      }
      if (expected === "weekly") weekly++;
    }
    expect(wrong).toEqual([]);
    // A content page changed in the last month: the site is edited most days,
    // and a zero here means either the rule is off or nothing has been
    // written for a month — both worth hearing about.
    expect(contentPaths.size).toBeGreaterThan(300);
    expect(weekly).toBeGreaterThanOrEqual(1);

    expect(hubPaths.length).toBeGreaterThanOrEqual(40);
    const slowHubs = hubPaths.filter((p) => byPath.get(p)?.changeFrequency !== "weekly");
    expect(slowHubs).toEqual([]);
  });
});
