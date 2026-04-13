import type { MetadataRoute } from "next";

import {
  getAtomUrl,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadShows,
  loadThreads,
} from "@/lib/content";
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

  // Homepage
  entries.push({ url: SITE_URL, priority: 1.0, changeFrequency: "weekly" });

  // Bridge pages (highest SEO value)
  for (const b of bridges) {
    entries.push({
      url: `${SITE_URL}/${b.slug}`,
      lastModified: b.frontmatter.updated ?? b.frontmatter.created,
      priority: 0.9,
      changeFrequency: "monthly",
    });
  }

  // Hub pages
  const hubs = [
    "/how-it-works",
    "/practice",
    "/guides",
    "/resources",
    "/paths",
    "/traditions",
    "/library",
    "/listen",
  ];
  for (const hub of hubs) {
    entries.push({ url: `${SITE_URL}${hub}`, priority: 0.7, changeFrequency: "monthly" });
  }

  // Sub-hub pages
  const subHubs = [
    "/how-it-works/principles",
    "/how-it-works/diagnosis",
    "/practice/exercises",
    "/practice/techniques",
    "/practice/formats",
    "/practice/vocabulary",
  ];
  for (const sub of subHubs) {
    entries.push({ url: `${SITE_URL}${sub}`, priority: 0.6, changeFrequency: "monthly" });
  }

  // Audience pages
  for (const aud of ["beginner", "intermediate", "teacher", "performer", "advanced"]) {
    entries.push({
      url: `${SITE_URL}/learn/${aud}`,
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
      priority: 0.5,
      changeFrequency: "monthly",
    });
  }

  // Tradition pages
  for (const t of ["johnstone", "spolin", "close", "ucb", "annoyance"]) {
    entries.push({
      url: `${SITE_URL}/traditions/${t}`,
      priority: 0.5,
      changeFrequency: "monthly",
    });
  }

  return entries;
}
