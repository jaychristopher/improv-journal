import { loadAtoms } from "@/lib/content";
import type { AtomFrontmatter } from "@/lib/schema";

/**
 * What a drill says it is for.
 *
 * Every exercise but three opens with a bold `**Trains:**` line — "Be Brave —
 * the threshold moment of starting", "Specificity, commitment, shared
 * vocabulary, narrative heightening through convention" — and until
 * 2026-09-22 no code read it. The concept sidebar labelled every inbound
 * `illustrates` edge from an exercise "Drills that train this": 86 edges, of
 * which the drills' own Trains lines confirm 17. Sixteen of the 24 lines name
 * at least one concept by title; the other eight describe the effect in prose
 * ("working under enough load that deliberation becomes impossible") and name
 * none (tracker entry 274).
 *
 * This module is the one reader of that line. It resolves the concept titles
 * the line names — a case-insensitive whole-title match against the
 * non-reference atoms, so "Be Present" finds `be-present` and "narrative
 * heightening" finds `heightening`, and a title inside backticks or a link
 * counts too — and answers two questions: what does this drill train, and
 * which drills train this concept. The strong sidebar label is used where the
 * answer is yes; the rest of the `illustrates` edges get the weaker "Drills
 * that show this". Drill pairs weight a shared trains target above a shared
 * edge for the same reason.
 *
 * Titles are matched, not ids: the line is prose for a reader, and `see
 * \`accepting-the-offer\`` in yes-and-chain's line is a pointer away from the
 * drill, not a claim about it. A title that belongs to another exercise is
 * not a trains target either — group-mind-cultivation's line names
 * "mirroring" as what the drill goes *beyond* — because a drill trains a
 * concept, never a drill. Both exclusions are measured in `trains.test.ts`.
 */

/** The first bold Trains line in a body, and only the first. */
const TRAINS_LINE = /^\*\*Trains:\*\*\s*(.+)$/m;

export interface TrainsIndex {
  /** exercise id → the concept ids its Trains line names, in line order. */
  trains: Map<string, string[]>;
  /** concept id → the exercise ids whose Trains line names it. */
  trainedBy: Map<string, string[]>;
  /** The exercise ids that carry a Trains line at all, named or not. */
  withLine: string[];
}

type Atom = { frontmatter: AtomFrontmatter; content?: string };

/** The text after `**Trains:**` on the first such line, or null. */
export function trainsLine(markdown: string | undefined): string | null {
  if (!markdown) return null;
  const match = TRAINS_LINE.exec(markdown);
  return match ? match[1].trim() : null;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The atoms whose title the line names, whole and case-insensitively. A
 * title must stand on its own — "status" inside "statuses" would not count —
 * but punctuation, backticks and link brackets around it do not stop the
 * match, so "`Be Present`" and "[Offers](/…)" both resolve.
 */
export function titlesNamedIn(
  line: string,
  candidates: readonly { id: string; title: string }[],
): string[] {
  const hits: { id: string; at: number }[] = [];
  for (const { id, title } of candidates) {
    const pattern = new RegExp(`(^|[^a-z0-9])(${escapeRegExp(title)})(?=[^a-z0-9]|$)`, "i");
    const match = pattern.exec(line);
    if (match) hits.push({ id, at: match.index + match[1].length });
  }
  // Line order, so the first concept the drill names is the first listed.
  return hits.sort((a, b) => a.at - b.at).map((h) => h.id);
}

const cache = new WeakMap<readonly Atom[], TrainsIndex>();

/**
 * Build the index from a loaded atom list. Pure and cached per list, so the
 * page and the drill pairs share one parse. Reference atoms are not
 * candidates (a drill does not train a book) and neither is an exercise (a
 * drill does not train another drill); a drill naming itself is ignored.
 */
export function buildTrainsIndex(atoms: readonly Atom[]): TrainsIndex {
  const cached = cache.get(atoms);
  if (cached) return cached;

  const candidates = atoms
    .filter((a) => a.frontmatter.type !== "reference" && a.frontmatter.type !== "exercise")
    .map((a) => ({ id: a.frontmatter.id, title: a.frontmatter.title }));

  const trains = new Map<string, string[]>();
  const trainedBy = new Map<string, string[]>();
  const withLine: string[] = [];
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    if (fm.type !== "exercise") continue;
    const line = trainsLine(atom.content);
    if (line === null) continue;
    withLine.push(fm.id);
    const named = titlesNamedIn(line, candidates).filter((id) => id !== fm.id);
    trains.set(fm.id, named);
    for (const id of named) {
      const list = trainedBy.get(id);
      if (list) list.push(fm.id);
      else trainedBy.set(id, [fm.id]);
    }
  }
  const index = { trains, trainedBy, withLine };
  cache.set(atoms, index);
  return index;
}

async function index(): Promise<TrainsIndex> {
  return buildTrainsIndex(await loadAtoms());
}

/** The concept ids an exercise's Trains line names. Empty for anything else. */
export async function trainsOf(exerciseId: string): Promise<string[]> {
  return (await index()).trains.get(exerciseId) ?? [];
}

/** The exercise ids whose Trains line names this concept. */
export async function trainedBy(conceptId: string): Promise<string[]> {
  return (await index()).trainedBy.get(conceptId) ?? [];
}
