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
export type WorkType = "Book" | "Blog" | "PodcastSeries" | "ScholarlyArticle";

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
  /** Journal the article appeared in. `ScholarlyArticle` only. */
  periodical?: string;
  /** Bare DOI, no `https://doi.org/` prefix. `ScholarlyArticle` only. */
  doi?: string;
}

export interface AtomFrontmatter {
  id: string;
  title: string;
  type: AtomType;
  status: ContentStatus;
  tags: string[];
  links: Link[];
  sources: string[]; // IDs of sources this atom was extracted from
  /**
   * Other names the same concept is taught under.
   *
   * Improv vocabulary is dialectal: what the Spolin lineage calls space work
   * is object work at UCB. A page that never says the reader's word does not
   * answer them, so aliases are emitted as schema.org alternateName and must
   * also be explained in the prose — see the aliases guard.
   */
  aliases?: string[];
  /** The named entity this atom is about — see BridgeFrontmatter.subject. */
  subject?: PageSubject;
  external_links?: ExternalLink[];
  work?: CitedWork; // only on `reference` atoms
  /**
   * An authored search snippet, for the few pages that need one.
   *
   * Atom descriptions are derived from the opening prose, and where the first
   * sentence runs past the 158-character budget the fallback trims at a word
   * boundary and appends an ellipsis. That is a deliberate trade — a longer
   * truncated snippet carries more than a short complete one — and it is fine
   * on the 300-odd pages nobody has been shown yet.
   *
   * It is not fine on the ones Google is already displaying. Nine of the 25
   * non-guide URLs Search Console has ever surfaced end mid-thought, including
   * the best-ranking page on the site. Those get a written snippet; everything
   * else keeps the derived one.
   */
  description?: string;
  /**
   * One sentence of actual rules, on games only — setup and the constraint.
   * Separate from the atom's body, which explains what the game trains. The
   * games hub was listing thirty entries by what each develops and never how
   * any of them is played.
   */
  how_to_play?: string;
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

/** A named entity a page is about, for schema.org `about`. */
export interface PageSubject {
  type: "Person" | "Organization" | "CreativeWork";
  name: string;
  /** One-line disambiguator, e.g. "Improv teacher, 1934-1999". */
  description?: string;
  /** Authority records for the same entity. Absolute URLs only. */
  sameAs?: string[];
}

export interface BridgeFrontmatter {
  title: string;
  description: string;
  target_keywords: BridgeTargetKeyword[];
  entry_atoms: string[]; // atom IDs this bridge links into
  entry_path: string; // primary path ID

  /**
   * The named entity this page is about, emitted as schema.org `about`.
   *
   * Library pages rank because they say which work they describe, so a crawler
   * can resolve them against a known entity rather than treating them as an
   * article that happens to mention it. A page about a person had no way to say
   * the same thing: /del-close emitted an Article with no subject at all.
   *
   * `sameAs` should point at an authority record — Wikipedia, Wikidata — and is
   * the part doing the disambiguating. Omit it rather than guess one.
   */
  subject?: PageSubject;
  /**
   * What the search results for the primary keyword actually look like.
   *
   * Keyword difficulty is computed from the backlinks of the pages ranking,
   * and on a commercial or institutional query it is a poor guide to whether
   * this site can enter at all. "how to be a better manager" is difficulty 1
   * and its first page is Reddit, Forbes, LinkedIn, Indeed and Asana.
   * "team building activities" is difficulty 5 against Slack, BambooHR and
   * Gusto. "what is active listening" is difficulty 0 against NIH, Berkeley
   * and Carnegie Mellon. The audit was sending work at all three.
   *
   * `serp_min_dr` is the lowest domain rating observed holding a top-ten
   * position, and `serp_verdict` is the reading of the whole page of results
   * rather than that one number — a single low-rated outlier among nine
   * institutions is not an opening. Absent where the results have not been
   * looked at, and the audit says so rather than guessing.
   *
   * Two pages here record min_dr 36 and hold opposite verdicts, which is the
   * clearest way to see why the number is evidence and not the criterion.
   * "team building activities" is gated: its 36 sits alone at position seven
   * behind SessionLab at 72, Gusto at 86 and Asana at 91. "How to make small
   * talk" is winnable: it has two sub-40 results, and the one at 38 holds
   * position six on more traffic than the pages either side of Reddit. Same
   * figure, different shape, and only the shape decides it.
   */
  serp_checked?: string;
  serp_min_dr?: number;
  serp_verdict?: "winnable" | "authority";
  /**
   * Every domain rating seen in the top ten, in position order.
   *
   * `serp_min_dr` records one number and the verdict is a reading of the whole
   * page, so the reasoning behind a verdict was never stored — only its
   * conclusion. That gap has already cost something: the verdicts disagree
   * between DR 36 and DR 40, and with nothing but the minimum recorded there is
   * no way to tell whether that is drift or two genuinely different results
   * pages. Re-deciding it from the minimum alone would have moved 109,000 of
   * traffic potential on evidence the schema says is not the criterion.
   *
   * With the distribution stored, the question is answerable without spending
   * another API unit: one weak site at position ten is a different page from
   * three of them in the top five, and the minimum cannot tell those apart.
   */
  serp_top10_dr?: number[];

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
