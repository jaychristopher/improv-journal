/**
 * Content loading and graph compilation.
 * Reads markdown files from content/, resolves all links, and builds the knowledge graph.
 */

import fs from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

import { type AudioContentType, getAudioAssetUrl, getRelativeAudioPath } from "./audio";
import { getAudioDuration, loadAudioManifest } from "./audio-manifest";
import type {
  AtomFrontmatter,
  AtomType,
  BridgeFrontmatter,
  GraphEdge,
  GraphNode,
  KnowledgeGraph,
  PathFrontmatter,
  ShowFrontmatter,
  SourceFrontmatter,
  ThreadFrontmatter,
} from "./schema";

const CONTENT_DIR = path.join(process.cwd(), "content");

// ─── Source auto-linking ────────────────────────────────────────────────────
// Maps italic book/source titles in rendered HTML to their /library/ reference pages.
// Matches <em>Title</em> that is NOT already inside an <a> tag.

const SOURCE_TITLE_MAP: [RegExp, string][] = [
  [/Truth in Comedy/g, "/library/ref-truth-in-comedy"],
  [/Bossypants/g, "/library/ref-fey-bossypants"],
  [/Impro for Storytellers/g, "/library/ref-impro-storytellers-johnstone"],
  [/Improvisation for the Theater/g, "/library/ref-spolin-improvisation-for-theater"],
  [/Improv Wisdom/g, "/library/ref-madson-improv-wisdom"],
  [/Group Genius/g, "/library/ref-sawyer-group-genius"],
  [/Improvisation at the Speed of Life/g, "/library/ref-tj-dave-speed-of-life"],
  [/Speed of Life/g, "/library/ref-tj-dave-speed-of-life"],
  [/Improv Nonsense/g, "/library/ref-hines-substack"],
  [/UCB Comedy Improvisation Manual/g, "/library/ref-ucb-manual"],
  [/Attention and Effort/g, "/library/ref-attention-and-effort-kahneman"],
  [/The Viewpoints Book/g, "/library/ref-viewpoints-bogart-landau"],
  [/Sanford Meisner on Acting/g, "/library/ref-meisner-on-acting"],
  [/Improvise/g, "/library/ref-napier-improvise"],
  [/Impro(?!v)/g, "/library/ref-impro-johnstone"],
];

function linkSources(htmlStr: string): string {
  let result = htmlStr;
  for (const [pattern, url] of SOURCE_TITLE_MAP) {
    // Replace <em>Title</em> with linked version, but skip if already inside an <a> tag.
    // We use a two-pass approach: first find all <em>Title</em>, then check context.
    const emPattern = new RegExp(`<em>(${pattern.source})</em>`, "g");
    result = result.replace(emPattern, (match, title, offset) => {
      const before = result.slice(Math.max(0, offset - 100), offset);
      if (before.includes("<a ") && !before.includes("</a>")) return match;
      const ref = getAtomUrlMap().get(url.replace("/library/", ""));
      const tip = ref ? ref.tip.replace(/"/g, "&quot;") : title;
      return `<a href="${url}" title="${tip}"><em>${title}</em></a>`;
    });
  }
  return result;
}

// ─── File loading ────────────────────────────────────────────────────────────

interface ContentFile<T> {
  frontmatter: T;
  content: string; // raw markdown
  html: string; // rendered HTML
  slug: string; // filename without extension
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
      html: linkAtomRefs(linkSources(rendered.toString())),
      slug: path.basename(file, ".md"),
    });
  }

  return results;
}

// ─── Cached loaders (prevent re-reading 155+ files per page during SSG) ─────

const _cache = new Map<string, Promise<ContentFile<unknown>[]>>();

function cachedLoad<T>(subdir: string): Promise<ContentFile<T>[]> {
  if (!_cache.has(subdir)) {
    _cache.set(subdir, loadFiles<T>(subdir));
  }
  return _cache.get(subdir) as Promise<ContentFile<T>[]>;
}

export function loadSources() {
  return cachedLoad<SourceFrontmatter>("sources");
}

/**
 * Atom slug → URL map, built from filesystem frontmatter (no HTML rendering).
 * Used to resolve `<code>atom-id</code>` references into links.
 */
let _atomUrlMap: Map<string, { title: string; url: string; tip: string }> | null = null;

function getAtomUrlMap(): Map<string, { title: string; url: string; tip: string }> {
  if (_atomUrlMap) return _atomUrlMap;
  _atomUrlMap = new Map();
  const dir = path.join(CONTENT_DIR, "atoms");
  if (!fs.existsSync(dir)) return _atomUrlMap;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as AtomFrontmatter;
    if (fm.id && fm.type) {
      // Extract first sentence for tooltip (strip markdown formatting)
      const firstSentence =
        content
          .replace(/^\s*\*\*[^*]+\*\*:?\s*/m, "") // strip leading bold label
          .replace(/\*\*([^*]+)\*\*/g, "$1") // strip bold
          .replace(/\*([^*]+)\*/g, "$1") // strip italic
          .replace(/`([^`]+)`/g, "$1") // strip code
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip links
          .trim()
          .split(/(?<=[.!?])\s/)[0] // first sentence
          ?.substring(0, 120) || fm.title;
      _atomUrlMap.set(fm.id, {
        title: fm.title,
        url: getAtomUrl({ id: fm.id, type: fm.type }),
        tip: firstSentence,
      });
    }
  }
  return _atomUrlMap;
}

/**
 * Replace <code>atom-id</code> references in HTML with links to the atom page.
 * Only matches IDs that exist in the atom index.
 */
function linkAtomRefs(htmlStr: string): string {
  const urlMap = getAtomUrlMap();
  return htmlStr.replace(/<code>([a-z][a-z0-9-]*)<\/code>/g, (match, id) => {
    const atom = urlMap.get(id);
    if (!atom) return match;
    const tip = atom.tip.replace(/"/g, "&quot;");
    return `<a href="${atom.url}" title="${tip}">${atom.title}</a>`;
  });
}

export function loadAtoms() {
  return cachedLoad<AtomFrontmatter>("atoms");
}

export function loadThreads() {
  return cachedLoad<ThreadFrontmatter>("threads");
}

export function loadPaths() {
  return cachedLoad<PathFrontmatter>("paths");
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

export function loadBridges() {
  return cachedLoad<BridgeFrontmatter>("bridges");
}

export async function getBridgeBySlug(slug: string) {
  const bridges = await loadBridges();
  return bridges.find((b) => b.slug === slug);
}

// ─── Shows (podcast) ────────────────────────────────────────────────────────

export async function loadShows() {
  return cachedLoad<ShowFrontmatter>("shows");
}

export async function getShowBySlug(slug: string) {
  const shows = await loadShows();
  return shows.find((s) => s.frontmatter.id === slug);
}

export interface Episode {
  title: string;
  href: string;
  audioUrl: string;
  description?: string;
  duration?: string; // formatted, e.g. "4:32"
}

/** Resolve all episodes for a show season filter */
export async function getEpisodesForShow(
  showId: string,
): Promise<{ label: string; episodes: Episode[] }[]> {
  const show = await getShowBySlug(showId);
  if (!show) return [];

  const [bridges, atoms, threads, paths] = await Promise.all([
    loadBridges(),
    loadAtoms(),
    loadThreads(),
    loadPaths(),
  ]);

  const seasons: { label: string; episodes: Episode[] }[] = [];

  for (const season of show.frontmatter.seasons) {
    const eps: Episode[] = [];
    const filter = season.filter;

    if (filter.content_type === "bridge") {
      for (const b of bridges) {
        const audio = getAudioUrl("bridges", b.slug);
        if (audio) {
          eps.push({
            title: b.frontmatter.title,
            href: `/${b.slug}`,
            audioUrl: audio,
            description: b.frontmatter.description,
            duration: getAudioDuration(audio),
          });
        }
      }
    } else if (filter.content_type === "atom" && filter.atom_types) {
      for (const a of atoms) {
        if (filter.atom_types.includes(a.frontmatter.type)) {
          const audio = getAudioUrl("atoms", a.frontmatter.id);
          if (audio) {
            eps.push({
              title: a.frontmatter.title,
              href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
              audioUrl: audio,
              duration: getAudioDuration(audio),
            });
          }
        }
      }
    } else if (filter.content_type === "thread") {
      for (const t of threads) {
        const audio = getAudioUrl("threads", t.frontmatter.id);
        if (audio) {
          eps.push({
            title: t.frontmatter.title,
            href: `/threads/${t.frontmatter.id}`,
            audioUrl: audio,
            duration: getAudioDuration(audio),
          });
        }
      }
    } else if (filter.content_type === "path") {
      for (const p of paths) {
        const audio = getAudioUrl("paths", p.frontmatter.id);
        if (audio) {
          eps.push({
            title: p.frontmatter.title,
            href: `/paths/${p.frontmatter.id}`,
            audioUrl: audio,
            duration: getAudioDuration(audio),
          });
        }
      }
    }

    seasons.push({ label: season.label, episodes: eps });
  }

  return seasons;
}

// ─── Traditions ─────────────────────────────────────────────────────────────

/** Map tradition names to their reference atom IDs */
const TRADITION_REFS: Record<string, string[]> = {
  johnstone: ["ref-impro-johnstone", "ref-impro-storytellers-johnstone"],
  spolin: ["ref-spolin-improvisation-for-theater"],
  close: ["ref-truth-in-comedy"],
  ucb: ["ref-ucb-manual", "ref-hines-substack", "ref-hines-greatest-improviser"],
  annoyance: ["ref-napier-improvise", "ref-tj-dave-speed-of-life"],
};

/** Get all non-reference atoms that link to a tradition's reference atoms */
export async function getAtomsForTradition(tradition: string) {
  const refIds = TRADITION_REFS[tradition];
  if (!refIds) return [];
  const atoms = await loadAtoms();
  return atoms.filter(
    (a) =>
      a.frontmatter.type !== "reference" &&
      a.frontmatter.links?.some((link) => refIds.includes(link.id)),
  );
}

export function getTraditionNames(): string[] {
  return Object.keys(TRADITION_REFS);
}

/** Extract counter-position text from an atom's raw markdown */
export function extractCounterPositions(content: string): { text: string; tradition?: string }[] {
  const results: { text: string; tradition?: string }[] = [];
  // Match **Counter-position:** or **Counter-position (Tradition):** or **Counter-argument:**
  const regex =
    /\*\*Counter-(?:position|argument)(?:\s*\(([^)]+)\))?:\*\*\s*([\s\S]+?)(?=\n\n|\n\*\*[A-Z]|$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({
      tradition: match[1]?.trim(),
      text: match[2]
        .trim()
        .replace(/\*\*/g, "")
        .replace(/\*([^*]+)\*/g, "$1"),
    });
  }
  return results;
}

// ─── URL resolution ─────────────────────────────────────────────────────────

/** Resolve an atom to its canonical URL based on type */
export function getAtomUrl(atom: { id: string; type: AtomType }): string {
  switch (atom.type) {
    case "law":
    case "insight":
      return `/how-it-works/${atom.id}`;
    case "principle":
      return `/how-it-works/principles/${atom.id}`;
    case "antipattern":
    case "pattern":
    case "framework":
      return `/how-it-works/diagnosis/${atom.id}`;
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

export interface ThreadPracticeRecommendation {
  id: string;
  title: string;
  url: string;
  source: "direct" | "linked";
}

export async function getPracticeRecommendationsForThread(
  threadId: string,
): Promise<ThreadPracticeRecommendation[]> {
  const [thread, atoms] = await Promise.all([getThreadBySlug(threadId), loadAtoms()]);
  if (!thread) return [];

  const atomById = new Map(atoms.map((atom) => [atom.frontmatter.id, atom]));
  const directRecommendations: ThreadPracticeRecommendation[] = [];
  const linkedRecommendations: ThreadPracticeRecommendation[] = [];
  const seen = new Set<string>();

  const addRecommendation = (atomId: string, source: "direct" | "linked") => {
    if (seen.has(atomId)) return;

    const atom = atomById.get(atomId);
    if (!atom || atom.frontmatter.type !== "exercise") return;

    seen.add(atomId);
    const recommendation = {
      id: atomId,
      title: atom.frontmatter.title,
      url: getAtomUrl({ id: atomId, type: atom.frontmatter.type }),
      source,
    };

    if (source === "direct") {
      directRecommendations.push(recommendation);
      return;
    }

    linkedRecommendations.push(recommendation);
  };

  for (const atomId of thread.frontmatter.atoms ?? []) {
    const atom = atomById.get(atomId);
    if (!atom) continue;

    addRecommendation(atomId, "direct");

    for (const link of atom.frontmatter.links ?? []) {
      addRecommendation(link.id, "linked");
    }
  }

  return [...directRecommendations, ...linkedRecommendations].slice(0, 3);
}

/** Find all bridges that reference a given atom as an entry atom */
export async function getBridgesForAtom(atomId: string) {
  const bridges = await loadBridges();
  return bridges.filter((b) => b.frontmatter.entry_atoms?.includes(atomId));
}

/** Find ALL paths that sequence a given thread (not just the first) */
export async function getAllPathsForThread(threadId: string) {
  const paths = await loadPaths();
  return paths.filter((p) => p.frontmatter.threads?.includes(threadId));
}

/** Get the first thread of a path */
export async function getFirstThreadOfPath(
  pathId: string,
): Promise<{ id: string; title: string } | null> {
  const pathData = await getPathBySlug(pathId);
  if (!pathData) return null;
  const firstThreadId = pathData.frontmatter.threads?.[0];
  if (!firstThreadId) return null;
  const thread = await getThreadBySlug(firstThreadId);
  return thread ? { id: thread.frontmatter.id, title: thread.frontmatter.title } : null;
}

/** Get the next atom in a thread's sequence after the given atom */
export async function getNextAtomInThread(
  atomId: string,
  threadId: string,
): Promise<{ id: string; title: string; url: string } | null> {
  const thread = await getThreadBySlug(threadId);
  if (!thread) return null;
  const atomIds = thread.frontmatter.atoms ?? [];
  const idx = atomIds.indexOf(atomId);
  if (idx === -1 || idx >= atomIds.length - 1) return null;
  const nextId = atomIds[idx + 1];
  const nextAtom = await getAtomBySlug(nextId);
  if (!nextAtom) return null;
  return {
    id: nextId,
    title: nextAtom.frontmatter.title,
    url: getAtomUrl({ id: nextId, type: nextAtom.frontmatter.type }),
  };
}

/** Get audio duration for a thread (from durations.json) */
export function getThreadDuration(threadId: string): string | null {
  const durations = loadAudioManifest();
  const dur = durations[`/audio/threads/${threadId}.mp3`] as { formatted?: string } | undefined;
  return dur?.formatted ?? null;
}

/** Get total path duration by summing thread durations */
export function getPathTotalDuration(pathThreadIds: string[]): string | null {
  const durations = loadAudioManifest();
  let totalSeconds = 0;
  let found = false;
  for (const id of pathThreadIds) {
    const dur = durations[`/audio/threads/${id}.mp3`] as { seconds?: number } | undefined;
    if (dur?.seconds) {
      totalSeconds += dur.seconds;
      found = true;
    }
  }
  if (!found) return null;
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// ─── Audio ──────────────────────────────────────────────────────────────────

export function getAudioUrl(type: AudioContentType, slug: string): string | null {
  const relativePath = getRelativeAudioPath(type, slug);

  // Check durations manifest (works in both local and production)
  const durations = loadAudioManifest();
  if (durations[relativePath]) {
    return getAudioAssetUrl(relativePath);
  }

  // Fallback: check local filesystem (dev only)
  const audioPath = path.join(process.cwd(), "public", "audio", type, `${slug}.mp3`);
  if (fs.existsSync(audioPath)) {
    return getAudioAssetUrl(relativePath);
  }

  return null;
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
