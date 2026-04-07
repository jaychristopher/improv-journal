/**
 * Content loading and graph compilation.
 * Reads markdown files from content/, resolves all links, and builds the knowledge graph.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import remarkGfm from "remark-gfm";
import { glob } from "glob";
import type {
  SourceFrontmatter,
  AtomFrontmatter,
  AtomType,
  ThreadFrontmatter,
  PathFrontmatter,
  BridgeFrontmatter,
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

// ─── File loading ────────────────────────────────────────────────────────────

interface ContentFile<T> {
  frontmatter: T;
  content: string;      // raw markdown
  html: string;         // rendered HTML
  slug: string;         // filename without extension
}

async function loadFiles<T>(subdir: string): Promise<ContentFile<T>[]> {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  const files = await glob("*.md", { cwd: dir });
  const results: ContentFile<T>[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    const rendered = await remark().use(remarkGfm).use(html).process(content);

    results.push({
      frontmatter: data as T,
      content,
      html: rendered.toString(),
      slug: path.basename(file, ".md"),
    });
  }

  return results;
}

export async function loadSources() {
  return loadFiles<SourceFrontmatter>("sources");
}

export async function loadAtoms() {
  return loadFiles<AtomFrontmatter>("atoms");
}

export async function loadThreads() {
  return loadFiles<ThreadFrontmatter>("threads");
}

export async function loadPaths() {
  return loadFiles<PathFrontmatter>("paths");
}

export async function getAtomBySlug(slug: string) {
  const atoms = await loadAtoms();
  return atoms.find((a) => a.frontmatter.id === slug);
}

export async function getThreadBySlug(slug: string) {
  const threads = await loadThreads();
  return threads.find((t) => t.frontmatter.id === slug);
}

export async function getPathBySlug(slug: string) {
  const paths = await loadPaths();
  return paths.find((p) => p.frontmatter.id === slug);
}

export async function getSourceBySlug(slug: string) {
  const sources = await loadSources();
  return sources.find((s) => s.frontmatter.id === slug);
}

// ─── Bridges ────────────────────────────────────────────────────────────────

export async function loadBridges() {
  return loadFiles<BridgeFrontmatter>("bridges");
}

export async function getBridgeBySlug(slug: string) {
  const bridges = await loadBridges();
  return bridges.find((b) => b.slug === slug);
}

// ─── URL resolution ─────────────────────────────────────────────────────────

/** Resolve an atom to its canonical URL based on type */
export function getAtomUrl(atom: { id: string; type: AtomType }): string {
  switch (atom.type) {
    case "axiom":
    case "insight":
      return `/system/${atom.id}`;
    case "principle":
      return `/system/principles/${atom.id}`;
    case "antipattern":
    case "pattern":
    case "framework":
      return `/system/diagnosis/${atom.id}`;
    case "exercise":
      return `/practice/exercises/${atom.id}`;
    case "technique":
    case "pedagogy":
      return `/practice/techniques/${atom.id}`;
    case "format":
      return `/practice/formats/${atom.id}`;
    case "definition":
      return `/practice/vocabulary/${atom.id}`;
    case "reference":
      return `/library/${atom.id}`;
    default:
      return `/system/${atom.id}`;
  }
}

/** Resolve an atom ID to its URL (loads atom to determine type) */
export async function getAtomUrlById(id: string): Promise<string> {
  const atom = await getAtomBySlug(id);
  if (!atom) return `/system/${id}`;
  return getAtomUrl({ id, type: atom.frontmatter.type });
}

/** Generate redirect entries for all atoms: old /atoms/{id} → new URL */
export async function getAtomRedirects(): Promise<
  { source: string; destination: string; permanent: boolean }[]
> {
  const atoms = await loadAtoms();
  return atoms.map((a) => ({
    source: `/atoms/${a.frontmatter.id}`,
    destination: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    permanent: true,
  }));
}

// ─── Reverse lookups ────────────────────────────────────────────────────────

/** Find the first path that sequences a given thread */
export async function getParentPath(threadId: string) {
  const paths = await loadPaths();
  return paths.find((p) => p.frontmatter.threads?.includes(threadId)) ?? null;
}

/** Find all threads that compose a given atom */
export async function getThreadsForAtom(atomId: string) {
  const threads = await loadThreads();
  return threads.filter((t) => t.frontmatter.atoms?.includes(atomId));
}

/** Find all bridges that reference a given atom as an entry atom */
export async function getBridgesForAtom(atomId: string) {
  const bridges = await loadBridges();
  return bridges.filter((b) => b.frontmatter.entry_atoms?.includes(atomId));
}

// ─── Audio ──────────────────────────────────────────────────────────────────

/**
 * Check if an audio file exists for a given content type and slug.
 * Returns the public URL path if found, null otherwise.
 */
export function getAudioUrl(
  type: "bridges" | "paths" | "threads" | "atoms",
  slug: string
): string | null {
  const audioPath = path.join(
    process.cwd(),
    "public",
    "audio",
    type,
    `${slug}.mp3`
  );
  return fs.existsSync(audioPath) ? `/audio/${type}/${slug}.mp3` : null;
}

// ─── Graph compilation ───────────────────────────────────────────────────────

export async function buildGraph(): Promise<KnowledgeGraph> {
  const [sources, atoms, threads, paths] = await Promise.all([
    loadSources(),
    loadAtoms(),
    loadThreads(),
    loadPaths(),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Sources → nodes + extraction edges
  for (const source of sources) {
    const fm = source.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "source",
      status: fm.status,
      tags: fm.tags,
    });
    for (const atomId of fm.atoms_extracted ?? []) {
      edges.push({
        source: fm.id,
        target: atomId,
        relation: "extracted_from",
      });
    }
  }

  // Atoms → nodes + link edges + provenance edges
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "atom",
      type: fm.type,
      status: fm.status,
      tags: fm.tags,
    });
    for (const link of fm.links ?? []) {
      edges.push({
        source: fm.id,
        target: link.id,
        relation: link.relation,
      });
    }
  }

  // Threads → nodes + composition edges
  for (const thread of threads) {
    const fm = thread.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "thread",
      status: fm.status,
      tags: fm.tags,
    });
    for (const atomId of fm.atoms ?? []) {
      edges.push({
        source: fm.id,
        target: atomId,
        relation: "composes",
      });
    }
  }

  // Paths → nodes + sequence edges
  for (const p of paths) {
    const fm = p.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "path",
      status: fm.status,
      tags: [],
    });
    for (const threadId of fm.threads ?? []) {
      edges.push({
        source: fm.id,
        target: threadId,
        relation: "sequences",
      });
    }
  }

  return {
    nodes,
    edges,
    meta: {
      sourceCount: sources.length,
      atomCount: atoms.length,
      threadCount: threads.length,
      pathCount: paths.length,
      builtAt: new Date().toISOString(),
    },
  };
}
