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

export interface ExternalLink {
  label: string;
  url: string;
}

/** schema.org type emitted for a reference atom's cited work. */
export type WorkType = "Book" | "Blog" | "PodcastSeries";

/**
 * Bibliographic detail for a `reference` atom, used to emit schema.org
 * entity markup so search engines can resolve the page to the real work.
 */
export interface CitedWork {
  type: WorkType;
  authors: string[];
  /** Full published title, which may be longer than the atom's display title. */
  name: string;
  publisher?: string;
  /** Publication year, or omitted for continuously updated works. */
  published?: string;
  /** ISBN-10 as printed; omitted where the work has no ISBN. */
  isbn?: string;
}

export interface AtomFrontmatter {
  id: string;
  title: string;
  type: AtomType;
  status: ContentStatus;
  tags: string[];
  links: Link[];
  sources: string[]; // IDs of sources this atom was extracted from
  external_links?: ExternalLink[];
  work?: CitedWork; // only on `reference` atoms
  created: string; // ISO date
  updated: string; // ISO date
}

// ─── Threads ─────────────────────────────────────────────────────────────────

export interface ThreadFrontmatter {
  id: string;
  title: string;
  lesson_goal?: string;
  key_takeaway?: string;
  common_mistake?: string;
  practice_prompt?: string;
  practice_reps?: string;
  success_signal?: string;
  transfer_prompt?: string;
  reflection_prompt?: string;
  estimated_minutes?: number;
  challenge_day?: number;
  difficulty?: "beginner" | "core" | "stretch";
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
  /**
   * Ahrefs keyword difficulty, 0-100, on the primary keyword.
   *
   * Recorded because volume alone hid a systematic misallocation: guides
   * aimed at terms in the 30-70 range were being deepened while winnable
   * ones at difficulty 0-5 with comparable volume sat thin. scripts/seo-audit
   * reports the gap.
   */
  difficulty?: number;
  /**
   * Ahrefs traffic potential: the traffic the top-ranking page actually
   * receives across every keyword it ranks for.
   *
   * Recorded because volume misranks badly on its own. "what is improv" is
   * 1,600 a month with a traffic potential of 50 — the query is answered in
   * the result page, so ranking first earns almost nothing. "how to read body
   * language" is 2,100 a month with a traffic potential of 37,000. Prioritise
   * on this where it exists.
   */
  traffic_potential?: number;

  /**
   * Ahrefs parent topic: the broader keyword Google actually ranks a page for
   * when it ranks for this one.
   *
   * Recorded because it is the only reliable test of whether two pages compete.
   * Distinct keyword strings are not enough — no two guides have ever declared
   * the same string, and two collisions still shipped. `/emotional-safety`
   * declared "emotional safety in the workplace", whose parent is
   * "psychological safety", putting it behind the site's own KD 64 page.
   * `/5-minute-team-building` declared "quick team building activities", whose
   * parent is "team building activities" — the primary of the biggest page on
   * the site.
   *
   * Both were secondary keywords, which is why an earlier audit comparing only
   * primaries passed. Storing the parent here lets a test check every declared
   * keyword instead, so the next one fails before it ships rather than being
   * found by a manual sweep of the Ahrefs API.
   *
   * Absent where Ahrefs reports no parent, which happens on terms too small to
   * have one.
   */
  parent?: string;
}

export interface BridgeFrontmatter {
  title: string;
  description: string;
  target_keywords: BridgeTargetKeyword[];
  entry_atoms: string[]; // atom IDs this bridge links into
  entry_path: string; // primary path ID
  primary_problem?: string;
  primary_cta_type?: "thread" | "path" | "exercise" | "challenge";
  primary_cta_target?: string;
  secondary_cta_target?: string;
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
  program_type?: "course" | "challenge" | "reference";
  program_length_days?: number;
  default_cadence?: "daily" | "weekly" | "self-paced";
  core_habits?: string[];
  transfer_contexts?: ("stage" | "life" | "work" | "relationships")[];
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
