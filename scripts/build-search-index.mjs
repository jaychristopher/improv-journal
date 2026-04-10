/**
 * Build search index for MiniSearch.
 * Reads all content files, creates an index, writes to public/search-index.json.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import MiniSearch from "minisearch";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "..", "content");
const OUTPUT = path.join(__dirname, "..", "public", "search-index.json");

// Duplicate of getAtomUrl — avoids ESM import chain from content.ts
function atomTypeToUrl(id, type) {
  switch (type) {
    case "axiom":
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
      return `/how-it-works/${id}`;
  }
}

function loadDir(subdir) {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { data, content } = matter(raw);
      const slug = path.basename(f, ".md");
      return { frontmatter: data, content, slug };
    });
}

function stripMarkdown(md) {
  return md
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[|`]/g, "")
    .trim();
}

function main() {
  const docs = [];
  let id = 0;

  // Atoms
  for (const a of loadDir("atoms")) {
    const fm = a.frontmatter;
    if (!fm.id || !fm.type) continue;
    const body = stripMarkdown(a.content).substring(0, 500);
    // Resolve links for graph viz (store as JSON string)
    const links = (fm.links ?? [])
      .filter((l) => l.id && !l.id.startsWith("ref-"))
      .slice(0, 8)
      .map((l) => ({ id: l.id, relation: l.relation }));

    docs.push({
      id: id++,
      docId: fm.id,
      title: fm.title ?? fm.id,
      url: atomTypeToUrl(fm.id, fm.type),
      layer: "atom",
      type: fm.type,
      tags: (fm.tags ?? []).join(" "),
      body,
      links: JSON.stringify(links),
    });
  }

  // Threads
  for (const t of loadDir("threads")) {
    const fm = t.frontmatter;
    if (!fm.id) continue;
    const body = stripMarkdown(t.content).substring(0, 500);
    docs.push({
      id: id++,
      docId: fm.id,
      title: fm.title ?? fm.id,
      url: `/threads/${fm.id}`,
      layer: "thread",
      type: "thread",
      tags: (fm.tags ?? []).join(" "),
      body,
    });
  }

  // Paths
  for (const p of loadDir("paths")) {
    const fm = p.frontmatter;
    if (!fm.id) continue;
    const body = stripMarkdown(p.content).substring(0, 500);
    docs.push({
      id: id++,
      docId: fm.id,
      title: fm.title ?? fm.id,
      url: `/paths/${fm.id}`,
      layer: "path",
      type: "path",
      tags: (fm.audience ?? []).join(" "),
      body,
    });
  }

  // Bridges
  for (const b of loadDir("bridges")) {
    const fm = b.frontmatter;
    const body = stripMarkdown(b.content).substring(0, 500);
    docs.push({
      id: id++,
      docId: b.slug,
      title: fm.title ?? b.slug,
      url: `/${b.slug}`,
      layer: "guide",
      type: "guide",
      tags: "",
      body,
    });
  }

  // Build index
  const miniSearch = new MiniSearch({
    fields: ["title", "body", "tags"],
    storeFields: ["title", "url", "layer", "type", "docId", "links"],
    searchOptions: {
      boost: { title: 3 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  miniSearch.addAll(docs);

  const json = JSON.stringify(miniSearch);
  fs.writeFileSync(OUTPUT, json);

  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(
    `Search index: ${docs.length} docs, ${sizeKB} KB → ${OUTPUT}`
  );
}

main();
