import type { MetadataRoute } from "next";

import {
  getAtomUrl,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadShows,
  loadThreads,
} from "@/lib/content";
import { getIndexableCombinations } from "@/lib/exercise-picker";
import { GUIDE_CATEGORIES, isStranded, trafficPotentialOf } from "@/lib/guide-categories";
import { inDegreeIndex } from "@/lib/hub-order";
import { indexablePrincipleFacets } from "@/lib/picker-principles";
import { SITE_URL } from "@/lib/seo";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/**
 * Priority and changefreq are read off what the site measures, not off the
 * route (novel-insights 240).
 *
 * They used to be a function of the layer alone: every guide 0.9, every atom
 * 0.5, every URL "monthly". The two signals the site computes for every page —
 * a guide's traffic potential and verdict, an atom's in-degree — produced no
 * variance inside a layer, so the 219,000 guide equalled the 200 guide, an
 * `authority` guide the site says it cannot rank outranked every concept it
 * leans on, and the frequency hint said a month on the day 391 files changed.
 * Search engines mostly ignore both hints; the point is that what the site
 * emits should be something it decided.
 *
 * Guides: the tiers of `byReach` (guide-categories.ts), which is how the hubs
 * already order them.
 *   0.9  reachable, with a measured traffic potential of 10,000 or more
 *   0.8  reachable, verdict winnable
 *   0.6  reachable but unverdicted or unmeasured — nobody has looked yet
 *   0.5  stranded: an `authority` verdict, or unverdicted at a difficulty the
 *        site does not clear. Kept for readers, not a ranking candidate, and
 *        no higher than the concepts it is built on.
 *
 * Atoms: declared in-degree (`inDegreeIndex`, the same count the techniques
 * hub sorts on), since a concept the rest of the graph requires is the one
 * a crawler should spend on.
 *   0.7  the 35 most-required atoms, the rich club of entry 202
 *   0.6  required by ten or more others
 *   0.5  the rest
 *
 * Lessons 0.6 and paths 0.7, unchanged. Hubs keep their directory tiers —
 * topic clusters 0.8, top-level hubs 0.7, type hubs 0.6, facets and the
 * per-show and per-tradition pages 0.5 — except that the audience hubs and
 * the picker levels are in the nav now (entry 222) and sit with the other
 * 0.7s.
 *
 * changefreq: a content page whose `updated` is within 30 days of the build
 * is "weekly", otherwise "monthly"; hubs are "weekly", since their lists
 * change with every content commit. `updated` is the last prose change
 * (entry 239), so a figure does not make a page look busy.
 */
const GUIDE_MAJOR_TRAFFIC_POTENTIAL = 10_000;
const ATOM_RICH_CLUB_SIZE = 35;
const ATOM_WELL_REQUIRED_IN_DEGREE = 10;
const RECENT_DAYS = 30;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [atoms, bridges, threads, paths, shows] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
    loadShows(),
  ]);

  const entries: MetadataRoute.Sitemap = [];

  /**
   * Newest date among the given content, for a page that lists it.
   *
   * <lastmod> is the only one of the three sitemap hints search engines
   * actually act on — changefreq and priority are ignored — and 56 URLs
   * carried none, the homepage and every hub among them. A hub is as fresh as
   * the newest thing it surfaces, so that is what it reports.
   */
  const newest = (items: { frontmatter: { updated?: string; created: string } }[]) => {
    const dates = items.map((i) => i.frontmatter.updated ?? i.frontmatter.created).filter(Boolean);
    return dates.length > 0 ? dates.sort().at(-1) : undefined;
  };

  const atomsOfType = (...types: string[]) =>
    atoms.filter((a) => types.includes(a.frontmatter.type));

  const everything = [...atoms, ...bridges, ...threads, ...paths];
  const siteModified = newest(everything);

  // A page changed in the last 30 days is worth a weekly look (entry 240).
  const recentSince = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const frequencyOf = (modified: string | undefined): ChangeFrequency =>
    modified !== undefined && modified.slice(0, 10) >= recentSince ? "weekly" : "monthly";

  const guidePriority = (b: (typeof bridges)[number]): number => {
    if (isStranded(b)) return 0.5;
    const potential = trafficPotentialOf(b);
    if (potential !== undefined && potential >= GUIDE_MAJOR_TRAFFIC_POTENTIAL) return 0.9;
    if (b.frontmatter.serp_verdict === "winnable") return 0.8;
    return 0.6;
  };

  const inDegree = inDegreeIndex(atoms);
  const degreeOf = (a: (typeof atoms)[number]) => inDegree.get(a.frontmatter.id) ?? 0;
  const richClub = new Set(
    [...atoms]
      .sort((a, b) => degreeOf(b) - degreeOf(a) || a.frontmatter.id.localeCompare(b.frontmatter.id))
      .slice(0, ATOM_RICH_CLUB_SIZE)
      .map((a) => a.frontmatter.id),
  );
  const atomPriority = (a: (typeof atoms)[number]): number => {
    if (richClub.has(a.frontmatter.id)) return 0.7;
    if (degreeOf(a) >= ATOM_WELL_REQUIRED_IN_DEGREE) return 0.6;
    return 0.5;
  };

  const hub = (path: string, modified: string | undefined, priority: number) => {
    entries.push({
      url: `${SITE_URL}${path}`,
      lastModified: modified,
      priority,
      changeFrequency: "weekly",
    });
  };

  // Homepage
  hub("", siteModified, 1.0);

  // Bridge pages, by what each can bring in
  for (const b of bridges) {
    const modified = b.frontmatter.updated ?? b.frontmatter.created;
    entries.push({
      url: `${SITE_URL}/${b.slug}`,
      lastModified: modified,
      priority: guidePriority(b),
      changeFrequency: frequencyOf(modified),
    });
  }

  // Hub pages, each as fresh as the content it lists
  hub("/how-it-works", newest(atomsOfType("law", "insight", "principle")), 0.7);
  hub("/improv-games", newest(atomsOfType("exercise", "format")), 0.7);
  hub("/practice", newest(atomsOfType("exercise", "technique", "format")), 0.7);
  hub("/guides", newest(bridges), 0.7);
  hub("/paths", newest(paths), 0.7);
  hub("/traditions", newest(atoms), 0.7);
  hub("/library", newest(atomsOfType("reference")), 0.7);
  hub("/listen", newest(everything), 0.7);
  hub("/about", siteModified, 0.7);

  // Guide category hubs
  for (const category of GUIDE_CATEGORIES) {
    hub(
      `/topics/${category.slug}`,
      newest(bridges.filter((b) => category.slugs.includes(b.slug))),
      0.8,
    );
  }

  // Tools — exercise picker with level/focus hierarchy
  const levels = ["beginner", "intermediate", "advanced"];
  hub("/threads", newest(threads), 0.7);
  hub("/tools/exercise-picker", newest(atomsOfType("exercise")), 0.7);
  hub(
    "/tools/improv-prompt-generator",
    newest(bridges.filter((b) => b.slug === "improv-prompts")),
    0.7,
  );
  // The levels are in the nav (entry 222), so they sit with the other 0.7s.
  for (const level of levels) {
    hub(`/tools/exercise-picker/${level}`, newest(atomsOfType("exercise")), 0.7);
  }
  // Only combinations that actually have exercises are published, so only
  // those belong in the sitemap.
  for (const combo of await getIndexableCombinations()) {
    hub(
      `/tools/exercise-picker/${combo.level}/${combo.focus}`,
      newest(atomsOfType("exercise")),
      0.5,
    );
  }
  // The derived "by principle" facets (entry 335), under the same count gate
  // as the focus facets above: a facet holding one or two drills is served
  // and not indexed, so it is not asked for here either. That empties this
  // loop on 2026-09-22 — every principle is under the gate — and fills it
  // the moment a principle gathers three drills that name it.
  for (const facet of await indexablePrincipleFacets()) {
    hub(facet.href, newest(atomsOfType("exercise")), 0.5);
  }

  // Sub-hub pages, each as fresh as the atoms it lists
  const subHubModified: Record<string, string | undefined> = {
    "/how-it-works/principles": newest(atomsOfType("principle")),
    "/how-it-works/diagnosis": newest(atomsOfType("antipattern", "pattern", "framework")),
    // The core's members are recomputed from the requires graph, so the page
    // is as fresh as any atom that could join or leave the cycle.
    "/how-it-works/the-core": newest(atoms),
    "/practice/exercises": newest(atomsOfType("exercise")),
    "/practice/techniques": newest(atomsOfType("technique", "pedagogy")),
    "/practice/formats": newest(atomsOfType("format")),
    "/practice/vocabulary": newest(atomsOfType("definition")),
  };
  for (const [sub, modified] of Object.entries(subHubModified)) {
    hub(sub, modified ?? siteModified, 0.6);
  }

  // Audience pages — in the nav (entry 222), so 0.7 with the other hubs
  for (const aud of ["beginner", "intermediate", "teacher", "performer", "advanced"]) {
    hub(
      `/learn/${aud}`,
      newest(paths.filter((p) => p.frontmatter.audience?.includes(aud as never))),
      0.7,
    );
  }

  // Path pages
  for (const p of paths) {
    const modified = p.frontmatter.updated ?? p.frontmatter.created;
    entries.push({
      url: `${SITE_URL}/paths/${p.frontmatter.id}`,
      lastModified: modified,
      priority: 0.7,
      changeFrequency: frequencyOf(modified),
    });
  }

  // Thread pages
  for (const t of threads) {
    const modified = t.frontmatter.updated ?? t.frontmatter.created;
    entries.push({
      url: `${SITE_URL}/threads/${t.frontmatter.id}`,
      lastModified: modified,
      priority: 0.6,
      changeFrequency: frequencyOf(modified),
    });
  }

  // Atom pages, by how much of the graph requires each
  for (const a of atoms) {
    const url = getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type });
    const modified = a.frontmatter.updated ?? a.frontmatter.created;
    entries.push({
      url: `${SITE_URL}${url}`,
      lastModified: modified,
      priority: atomPriority(a),
      changeFrequency: frequencyOf(modified),
    });
  }

  /*
   * Source pages are deliberately absent.
   *
   * They were added here on the reasoning that the route was "canonical,
   * indexable" and that nothing linked to the one page under it. Both were
   * wrong. /sources/[slug] sets robots index:false — the route says why, that
   * a raw transcript should stay reachable for provenance without competing in
   * search — and 22 atom pages link to it, since every atom extracted from a
   * transcript cites it.
   *
   * A noindex URL in a sitemap asks a crawler to index a page that then tells
   * it not to, and Search Console reports it as an error. no-noindex-in-sitemap
   * holds the rule.
   */

  // Show pages
  for (const s of shows) {
    hub(`/listen/${s.frontmatter.id}`, newest(everything), 0.5);
  }

  // Tradition pages
  for (const t of ["johnstone", "spolin", "close", "ucb", "annoyance"]) {
    hub(`/traditions/${t}`, newest(atoms), 0.5);
  }

  return entries;
}
