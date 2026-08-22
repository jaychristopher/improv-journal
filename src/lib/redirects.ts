/**
 * Generate redirect map for the site restructure.
 * Old URLs → new physics-first URLs.
 *
 * NOTE: This file must NOT import from content.ts because content.ts
 * depends on remark (ESM-only) which breaks next.config.ts loading.
 * The URL mapping logic is duplicated here intentionally.
 */

import fs from "fs";
import matter from "gray-matter";
import path from "path";

/** Duplicate of getAtomUrl logic — kept in sync manually to avoid ESM import chain */
function atomTypeToUrl(id: string, type: string): string {
  switch (type) {
    case "law":
    case "insight":
      return `/how-it-works/${id}`;
    case "principle":
      return `/how-it-works/principles/${id}`;
    case "antipattern":
    case "pattern":
    case "framework":
      return `/how-it-works/diagnosis/${id}`;
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
    // Retargeted: the page always described people skills, and the term it
    // used to carry has a traffic potential of 30 against 1,100 for this one.
    // Same retarget: "group dynamics" is the academic phrasing at a traffic
    // potential of 250; "team dynamics" is what the audience types, at 3,500.
    { source: "/group-dynamics", destination: "/team-dynamics", permanent: true },
    // The slug named a 450-a-month secondary while the page targets "how to
    // keep a conversation going" at 4,500 and difficulty 2.
    {
      source: "/how-to-be-a-better-conversationalist",
      destination: "/how-to-keep-a-conversation-going",
      permanent: true,
    },
    // Consolidated: "team bonding activities" has "team building activities"
    // as its parent topic, so the two pages were competing for one term.
    {
      source: "/team-bonding-activities",
      destination: "/team-building-activities",
      permanent: true,
    },
    {
      source: "/interpersonal-communication-skills",
      destination: "/people-skills",
      permanent: true,
    },
    // Old /system/ URLs → /how-it-works/
    { source: "/system", destination: "/how-it-works", permanent: true },
    { source: "/system/principles", destination: "/how-it-works/principles", permanent: true },
    {
      source: "/system/principles/:slug",
      destination: "/how-it-works/principles/:slug",
      permanent: true,
    },
    { source: "/system/diagnosis", destination: "/how-it-works/diagnosis", permanent: true },
    {
      source: "/system/diagnosis/:slug",
      destination: "/how-it-works/diagnosis/:slug",
      permanent: true,
    },
    { source: "/system/:slug", destination: "/how-it-works/:slug", permanent: true },
    // Old /concepts/ URLs
    { source: "/concepts/axioms", destination: "/how-it-works", permanent: true },
    { source: "/concepts/laws", destination: "/how-it-works", permanent: true },
    { source: "/concepts/principles", destination: "/how-it-works/principles", permanent: true },
    { source: "/concepts/antipatterns", destination: "/how-it-works/diagnosis", permanent: true },
    { source: "/concepts/patterns", destination: "/how-it-works/diagnosis", permanent: true },
    { source: "/concepts/exercises", destination: "/practice/exercises", permanent: true },
    { source: "/concepts/techniques", destination: "/practice/techniques", permanent: true },
    { source: "/concepts/formats", destination: "/practice/formats", permanent: true },
    { source: "/concepts/definitions", destination: "/practice/vocabulary", permanent: true },
  ];
}
