import type { MetadataRoute } from "next";

import {
  getAtomUrl,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadShows,
  loadThreads,
} from "@/lib/content";
import { GUIDE_CATEGORIES } from "@/lib/guide-categories";
import { SITE_URL } from "@/lib/seo";

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

  // Homepage
  entries.push({
    url: SITE_URL,
    lastModified: siteModified,
    priority: 1.0,
    changeFrequency: "weekly",
  });

  // Bridge pages (highest SEO value)
  for (const b of bridges) {
    entries.push({
      url: `${SITE_URL}/${b.slug}`,
      lastModified: b.frontmatter.updated ?? b.frontmatter.created,
      priority: 0.9,
      changeFrequency: "monthly",
    });
  }

  // Hub pages, each as fresh as the content it lists
  const hubs: { path: string; modified?: string }[] = [
    { path: "/how-it-works", modified: newest(atomsOfType("law", "insight", "principle")) },
    {
      path: "/improv-games",
      modified: newest(atomsOfType("exercise", "format")),
    },
    { path: "/practice", modified: newest(atomsOfType("exercise", "technique", "format")) },
    { path: "/guides", modified: newest(bridges) },
    { path: "/resources", modified: siteModified },
    { path: "/paths", modified: newest(paths) },
    { path: "/traditions", modified: newest(atoms) },
    { path: "/library", modified: newest(atomsOfType("reference")) },
    { path: "/listen", modified: newest(everything) },
    { path: "/about", modified: siteModified },
  ];
  for (const hub of hubs) {
    entries.push({
      url: `${SITE_URL}${hub.path}`,
      lastModified: hub.modified,
      priority: 0.7,
      changeFrequency: "monthly",
    });
  }

  // Guide category hubs
  for (const category of GUIDE_CATEGORIES) {
    entries.push({
      url: `${SITE_URL}/topics/${category.slug}`,
      lastModified: newest(bridges.filter((b) => category.slugs.includes(b.slug))),
      priority: 0.8,
      changeFrequency: "monthly",
    });
  }

  // Tools — exercise picker with level/focus hierarchy
  const levels = ["beginner", "intermediate", "advanced"];
  const focuses = ["presence", "ensemble", "emotion", "courage", "physicality", "recovery"];
  entries.push({
    url: `${SITE_URL}/tools/exercise-picker`,
    lastModified: newest(atomsOfType("exercise")),
    priority: 0.7,
    changeFrequency: "monthly",
  });
  for (const level of levels) {
    entries.push({
      url: `${SITE_URL}/tools/exercise-picker/${level}`,
      lastModified: newest(atomsOfType("exercise")),
      priority: 0.6,
      changeFrequency: "monthly",
    });
    for (const focus of focuses) {
      entries.push({
        url: `${SITE_URL}/tools/exercise-picker/${level}/${focus}`,
        lastModified: newest(atomsOfType("exercise")),
        priority: 0.5,
        changeFrequency: "monthly",
      });
    }
  }

  // Sub-hub pages, each as fresh as the atoms it lists
  const subHubModified: Record<string, string | undefined> = {
    "/how-it-works/principles": newest(atomsOfType("principle")),
    "/how-it-works/diagnosis": newest(atomsOfType("antipattern", "pattern", "framework")),
    "/practice/exercises": newest(atomsOfType("exercise")),
    "/practice/techniques": newest(atomsOfType("technique", "pedagogy")),
    "/practice/formats": newest(atomsOfType("format")),
    "/practice/vocabulary": newest(atomsOfType("definition")),
  };
  const subHubs = [
    "/how-it-works/principles",
    "/how-it-works/diagnosis",
    "/practice/exercises",
    "/practice/techniques",
    "/practice/formats",
    "/practice/vocabulary",
  ];
  for (const sub of subHubs) {
    entries.push({
      url: `${SITE_URL}${sub}`,
      lastModified: subHubModified[sub] ?? siteModified,
      priority: 0.6,
      changeFrequency: "monthly",
    });
  }

  // Audience pages
  for (const aud of ["beginner", "intermediate", "teacher", "performer", "advanced"]) {
    entries.push({
      url: `${SITE_URL}/learn/${aud}`,
      lastModified: newest(paths.filter((p) => p.frontmatter.audience?.includes(aud as never))),
      priority: 0.6,
      changeFrequency: "monthly",
    });
  }

  // Path pages
  for (const p of paths) {
    entries.push({
      url: `${SITE_URL}/paths/${p.frontmatter.id}`,
      lastModified: p.frontmatter.updated ?? p.frontmatter.created,
      priority: 0.7,
      changeFrequency: "monthly",
    });
  }

  // Thread pages
  for (const t of threads) {
    entries.push({
      url: `${SITE_URL}/threads/${t.frontmatter.id}`,
      lastModified: t.frontmatter.updated ?? t.frontmatter.created,
      priority: 0.6,
      changeFrequency: "monthly",
    });
  }

  // Atom pages
  for (const a of atoms) {
    const url = getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type });
    entries.push({
      url: `${SITE_URL}${url}`,
      lastModified: a.frontmatter.updated ?? a.frontmatter.created,
      priority: 0.5,
      changeFrequency: "monthly",
    });
  }

  // Show pages
  for (const s of shows) {
    entries.push({
      url: `${SITE_URL}/listen/${s.frontmatter.id}`,
      lastModified: newest(everything),
      priority: 0.5,
      changeFrequency: "monthly",
    });
  }

  // Tradition pages
  for (const t of ["johnstone", "spolin", "close", "ucb", "annoyance"]) {
    entries.push({
      url: `${SITE_URL}/traditions/${t}`,
      lastModified: newest(atoms),
      priority: 0.5,
      changeFrequency: "monthly",
    });
  }

  return entries;
}
