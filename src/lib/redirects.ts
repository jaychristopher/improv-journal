/**
 * Generate redirect map for the site restructure.
 * Old URLs → new physics-first URLs.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { AtomFrontmatter } from "./schema";
import { getAtomUrl } from "./content";

/** Read all atom frontmatter and generate /atoms/{id} → new URL redirects */
export function generateAtomRedirects(): {
  source: string;
  destination: string;
  permanent: boolean;
}[] {
  const dir = path.join(process.cwd(), "content", "atoms");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data } = matter(raw);
    const fm = data as AtomFrontmatter;
    return {
      source: `/atoms/${fm.id}`,
      destination: getAtomUrl({ id: fm.id, type: fm.type }),
      permanent: true,
    };
  });
}

/** Read all bridge slugs for /guides/{slug} → /{slug} redirects */
export function generateBridgeRedirects(): {
  source: string;
  destination: string;
  permanent: boolean;
}[] {
  const dir = path.join(process.cwd(), "content", "bridges");
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  return files.map((file) => ({
    source: `/guides/${path.basename(file, ".md")}`,
    destination: `/${path.basename(file, ".md")}`,
    permanent: true,
  }));
}

/** All hub page redirects */
export function generateHubRedirects(): {
  source: string;
  destination: string;
  permanent: boolean;
}[] {
  return [
    { source: "/concepts/axioms", destination: "/system", permanent: true },
    { source: "/concepts/principles", destination: "/system/principles", permanent: true },
    { source: "/concepts/antipatterns", destination: "/system/diagnosis", permanent: true },
    { source: "/concepts/patterns", destination: "/system/diagnosis", permanent: true },
    { source: "/concepts/exercises", destination: "/practice/exercises", permanent: true },
    { source: "/concepts/techniques", destination: "/practice/techniques", permanent: true },
    { source: "/concepts/formats", destination: "/practice/formats", permanent: true },
    { source: "/concepts/definitions", destination: "/practice/vocabulary", permanent: true },
    { source: "/learn/beginner", destination: "/paths", permanent: true },
    { source: "/learn/intermediate", destination: "/paths", permanent: true },
    { source: "/learn/advanced", destination: "/paths", permanent: true },
    { source: "/learn/teacher", destination: "/paths", permanent: true },
    { source: "/learn/performer", destination: "/paths", permanent: true },
  ];
}
