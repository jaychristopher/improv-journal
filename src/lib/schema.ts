/**
 * Content schema for the improv knowledge base.
 *
 * Four content types:
 *   Sources — raw material (transcripts, articles, lectures) from which atoms are mined
 *   Atoms   — validated primitives (smallest meaningful unit of improv knowledge)
 *   Threads — atoms woven into coherent concepts (a full thought)
 *   Paths   — curated journeys through threads for specific audiences
 */

// ─── Shared ──────────────────────────────────────────────────────────────────

export type ContentStatus = "seed" | "draft" | "validated";

export type SourceType = "transcript" | "article" | "lecture" | "book" | "conversation";

export type AtomType =
  | "principle"
  | "technique"
  | "exercise"
  | "insight"
  | "definition"
  | "pattern"
  | "antipattern"
  | "law"
  | "framework"
  | "reference"
  | "format"
  | "pedagogy";

export type Audience = "beginner" | "intermediate" | "advanced" | "teacher" | "performer";

export interface Link {
  id: string;
  relation: "requires" | "enables" | "contrasts" | "extends" | "illustrates";
}

// ─── Shows (podcast) ────────────────────────────────────────────────────────

export interface ShowEpisodeFilter {
  content_type: "bridge" | "atom" | "thread" | "path";
  atom_types?: AtomType[]; // only for content_type "atom"
}

export interface ShowSeason {
  label: string;
  filter: ShowEpisodeFilter;
}

export interface ShowFrontmatter {
  id: string;
  title: string;
  description: string;
  seasons: ShowSeason[];
  created: string;
}

// ─── Atoms ───────────────────────────────────────────────────────────────────

export interface SourceFrontmatter {
  id: string;
  title: string;
  type: SourceType;
  status: ContentStatus;
  origin: string; // where it came from (URL, file, event, etc.)
  atoms_extracted: string[]; // IDs of atoms mined from this source
  tags: string[];
  created: string;
  updated: string;
}

export interface AtomFrontmatter {
  id: string;
  title: string;
  type: AtomType;
  status: ContentStatus;
  tags: string[];
  links: Link[];
  sources: string[]; // IDs of sources this atom was extracted from
  created: string; // ISO date
  updated: string; // ISO date
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export interface ThreadFrontmatter {
  id: string;
  title: string;
  status: ContentStatus;
  atoms: string[]; // ordered list of atom IDs that compose this thought
  tags: string[];
  created: string;
  updated: string;
}

// ─── Bridges ────────────────────────────────────────────────────────────────

export interface BridgeTargetKeyword {
  keyword: string;
  volume: number;
}

export interface BridgeFrontmatter {
  title: string;
  description: string;
  target_keywords: BridgeTargetKeyword[];
  entry_atoms: string[]; // atom IDs this bridge links into
  entry_path: string; // primary path ID
  status: ContentStatus;
  created: string;
  updated?: string;
}

// ─── Paths ───────────────────────────────────────────────────────────────────

export interface PathFrontmatter {
  id: string;
  title: string;
  description: string;
  learning_objectives: string[];
  who_this_is_for: string[];
  prerequisites: string[];
  estimated_time: string;
  practice_cadence: string;
  completion_outcome: string;
  audience: Audience[];
  threads: string[]; // ordered sequence of thread IDs
  status: ContentStatus;
  created: string;
  updated: string;
}

// ─── Graph types ─────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  title: string;
  layer: "source" | "atom" | "thread" | "path";
  type?: AtomType;
  status: ContentStatus;
  tags: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: Link["relation"] | "composes" | "sequences" | "extracted_from";
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: {
    sourceCount: number;
    atomCount: number;
    threadCount: number;
    pathCount: number;
    builtAt: string;
  };
}
