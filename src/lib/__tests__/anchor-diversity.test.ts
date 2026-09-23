import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { footerGuideLabel, footerLabelsByTitle } from "@/components/Footer";

import { normaliseText } from "../anchor-text";
import { loadBridges } from "../content";
import { getTopGuides } from "../top-guides";

/**
 * The inbound anchor profile of every guide, read off the build.
 *
 * Tracker entry 287 (2026-09-22): the 27 guides the footer promotes received
 * a median 0.961 of their inbound anchors — from `<main>` of every other page
 * plus the footer — as the exact primary keyword they target (min 0.894,
 * max 0.973), because the hand-written guide links use the keyword 218 times
 * in 270 and the footer said it again on all 376 pages. The 51 guides outside
 * the footer, linked mostly by widgets that use titles, sat at 0.333. The
 * pages the site most wants to rank were the ones whose inbound profile was a
 * single repeated search term.
 *
 * The footer now labels the promoted guides by title on the concept pages
 * and by keyword elsewhere (`footerLabelsByTitle`, Footer.tsx). Re-read the
 * same night, after that change:
 *
 *                       median exact share   min     max     min distinct
 *   promoted (27)       0.450                0.419   0.506   3
 *   the other 51        0.333                                (unchanged)
 *   all 78              0.419
 *
 * Every promoted guide now takes 215 to 246 of its ~400 inbound anchors as
 * its title and 172 to 225 as its keyword. The ceilings sit just above the
 * after-reading: the exact-keyword share, and the title share too, so a
 * change cannot swap one monoculture for the other and pass. The hand-link
 * habit that supplies the rest is `hand-anchor-share.test.ts`'s.
 *
 * Self-links are not inbound: an anchor on a guide's own page pointing at
 * itself (the breadcrumb, a table of contents) says nothing about how other
 * pages describe it, and is left out on both sides of the ratio.
 */
const PROMOTED_EXACT_CEILING = 0.52;
const PROMOTED_TITLE_CEILING = 0.6;
const SITEWIDE_MEDIAN_EXACT_CEILING = 0.45;
const MIN_DISTINCT_ANCHORS = 2;

const APP = path.join(process.cwd(), ".next", "server", "app");
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/** Anchors with a root-level href, the shape every guide route has. */
const GUIDE_ANCHOR = /<a\b[^>]*href="\/([a-z0-9-]+)(?:#[^"]*)?"[^>]*>([\s\S]*?)<\/a>/g;

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : e.name.endsWith(".html") ? [full] : [];
  });
}

function urlOf(file: string): string {
  const url =
    "/" +
    path
      .relative(APP, file)
      .split(path.sep)
      .join("/")
      .replace(/\.html$/, "");
  return url === "/index" ? "/" : url;
}

/** Anchor text as a reader would say it: no tags, entities decoded, one case. */
function anchorText(inner: string): string {
  return normaliseText(
    inner
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&#x27;|&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, " "),
  ).trim();
}

/** Region of a page whose links count: the article and the footer, not the nav. */
function linkingRegions(html: string): string[] {
  return [
    html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? "",
    html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "",
  ];
}

interface Profile {
  slug: string;
  total: number;
  exact: number;
  title: number;
  distinct: number;
}

async function inboundProfiles(): Promise<{ profiles: Profile[]; pages: number }> {
  const bridges = await loadBridges();
  const bySlug = new Map(bridges.map((b) => [b.slug, b]));
  const anchors = new Map<string, Map<string, number>>();
  let pages = 0;
  for (const file of walk(APP)) {
    const url = urlOf(file);
    if (url.startsWith("/_")) continue;
    pages += 1;
    for (const region of linkingRegions(fs.readFileSync(file, "utf-8"))) {
      for (const match of region.matchAll(GUIDE_ANCHOR)) {
        const [, slug, inner] = match;
        if (!bySlug.has(slug) || url === `/${slug}`) continue;
        const text = anchorText(inner);
        if (!text) continue;
        const counts = anchors.get(slug) ?? new Map<string, number>();
        counts.set(text, (counts.get(text) ?? 0) + 1);
        anchors.set(slug, counts);
      }
    }
  }
  const profiles = bridges.map((bridge) => {
    const counts = anchors.get(bridge.slug) ?? new Map<string, number>();
    const primary = bridge.frontmatter.target_keywords?.[0]?.keyword;
    return {
      slug: bridge.slug,
      total: [...counts.values()].reduce((sum, n) => sum + n, 0),
      exact: primary ? (counts.get(normaliseText(primary).trim()) ?? 0) : 0,
      title: counts.get(normaliseText(bridge.frontmatter.title).trim()) ?? 0,
      distinct: counts.size,
    };
  });
  return { profiles, pages };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

describe("footer label form by hosting page", () => {
  it("says the title on concept pages and the keyword everywhere else", () => {
    for (const concept of [
      "/how-it-works/yes-and",
      "/how-it-works/principles/be-present",
      "/how-it-works/diagnosis/bulldozing",
      "/practice/exercises/zip-zap-zop",
      "/practice/techniques/heightening",
      "/practice/formats/harold",
      "/practice/vocabulary/tilt",
      "/library/ref-truth-in-comedy",
    ]) {
      expect(footerLabelsByTitle(concept), concept).toBe(true);
    }
    for (const other of [
      "/",
      "/how-to-be-funny",
      "/how-it-works",
      "/how-it-works/principles",
      "/how-it-works/diagnosis",
      "/practice",
      "/practice/exercises",
      "/practice/vocabulary",
      "/library",
      "/threads/anatomy-of-a-scene",
      "/paths/improv-for-teams",
      "/topics/communication",
      "/traditions/johnstone",
      "/tools/exercise-picker/beginner",
    ]) {
      expect(footerLabelsByTitle(other), other).toBe(false);
    }
    const guide = { slug: "party-games", label: "Party games", title: "Party Games: 40" };
    expect(footerGuideLabel(guide, "/practice/exercises/zip-zap-zop")).toBe("Party Games: 40");
    expect(footerGuideLabel(guide, "/how-to-be-funny")).toBe("Party games");
  });

  it.runIf(built)("renders both forms in the build, each on its own layer", async () => {
    const guides = await getTopGuides();
    expect(guides.length).toBeGreaterThanOrEqual(20);
    const concept = fs.readFileSync(
      path.join(APP, "practice", "techniques", "yes-and.html"),
      "utf-8",
    );
    const guide = fs.readFileSync(path.join(APP, "how-to-be-funny.html"), "utf-8");
    const footerOf = (html: string) => html.match(/<footer[\s\S]*?<\/footer>/)?.[0] ?? "";
    const footerAnchor = (footer: string, slug: string) => {
      const match = footer.match(new RegExp(`<a\\b[^>]*href="/${slug}"[^>]*>([\\s\\S]*?)</a>`));
      return match ? anchorText(match[1]) : undefined;
    };
    for (const promoted of guides) {
      expect(
        footerAnchor(footerOf(concept), promoted.slug),
        `${promoted.slug} on a concept page`,
      ).toBe(normaliseText(promoted.title).trim());
      if (promoted.slug === "how-to-be-funny") continue;
      expect(footerAnchor(footerOf(guide), promoted.slug), `${promoted.slug} on a guide page`).toBe(
        normaliseText(promoted.label).trim(),
      );
    }
  });
});

describe("inbound anchor diversity", () => {
  it.runIf(built)("gives no promoted guide a single-string inbound profile", async () => {
    const { profiles, pages } = await inboundProfiles();
    const promoted = new Set((await getTopGuides()).map((g) => g.slug));
    // Guard the guard: the build, the guide layer and the promoted set are
    // all still there and still linked; a regex that found nothing would
    // otherwise report a share of zero and pass.
    expect(pages).toBeGreaterThanOrEqual(370);
    expect(profiles.length).toBeGreaterThanOrEqual(70);
    expect(promoted.size).toBeGreaterThanOrEqual(20);
    expect(profiles.filter((p) => p.total > 0).length).toBe(profiles.length);

    const over: string[] = [];
    for (const profile of profiles.filter((p) => promoted.has(p.slug))) {
      expect(profile.total, profile.slug).toBeGreaterThanOrEqual(pages / 2);
      expect(profile.distinct, profile.slug).toBeGreaterThanOrEqual(MIN_DISTINCT_ANCHORS);
      const exact = profile.exact / profile.total;
      const title = profile.title / profile.total;
      if (exact > PROMOTED_EXACT_CEILING) {
        over.push(`${profile.slug}: keyword ${exact.toFixed(3)} of ${profile.total}`);
      }
      if (title > PROMOTED_TITLE_CEILING) {
        over.push(`${profile.slug}: title ${title.toFixed(3)} of ${profile.total}`);
      }
    }
    expect(over).toEqual([]);
  });

  it.runIf(built)("records the sitewide median exact-keyword share", async () => {
    const { profiles } = await inboundProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(70);
    const promoted = new Set((await getTopGuides()).map((g) => g.slug));

    const share = (p: Profile) => (p.total ? p.exact / p.total : 0);
    const all = median(profiles.map(share));
    const inFooter = median(profiles.filter((p) => promoted.has(p.slug)).map(share));
    const outside = median(profiles.filter((p) => !promoted.has(p.slug)).map(share));
    const reading = `all ${all.toFixed(3)}, promoted ${inFooter.toFixed(3)}, outside the footer ${outside.toFixed(3)}`;
    expect(all, reading).toBeLessThanOrEqual(SITEWIDE_MEDIAN_EXACT_CEILING);
    expect(inFooter, reading).toBeLessThanOrEqual(PROMOTED_EXACT_CEILING);
    // The 51 outside the footer were 0.333 before and after; they are linked
    // by the widgets that use titles and the change did not touch them. A
    // floor on the measurement, not a target: a median of zero here would
    // mean the guides had stopped being linked by their keywords at all.
    expect(outside).toBeGreaterThan(0.1);
  });
});
