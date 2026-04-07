/**
 * Generate redirect map for the site restructure.
 * Old URLs → new physics-first URLs.
 *
 * NOTE: This file must NOT import from content.ts because content.ts
 * depends on remark (ESM-only) which breaks next.config.ts loading.
 * The URL mapping logic is duplicated here intentionally.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";

/** Duplicate of getAtomUrl logic — kept in sync manually to avoid ESM import chain */
function atomTypeToUrl(id: string, type: string): string {
  switch (type) {
    case "axiom":
    case "insight":
      return `/system/${id}`;
    case "principle":
      return `/system/principles/${id}`;
    case "antipattern":
    case "pattern":
    case "framework":
      return `/system/diagnosis/${id}`;
    case "exercise":
      return `/practice/exercises/${id}`;
    case "technique":
    case "pedagogy":
      return `/practice/techniques/${id}`;
    case "format":
      return `/practice/formats/${id}`;
    case "definition":
      return `/practice/vocabulary/${id}`;
    case "reference":
      return `/library/${id}`;
    default:
      return `/system/${id}`;
  }
}

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
    const id = (data as { id: string }).id;
    const type = (data as { type: string }).type;
    return {
      source: `/atoms/${id}`,
      destination: atomTypeToUrl(id, type),
      permanent: true,
    };
  });
}

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
