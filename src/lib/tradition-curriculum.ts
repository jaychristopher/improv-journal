/**
 * The join between the traditions layer and the curriculum layer.
 *
 * A concept belongs to a school when it cites one of the school's works
 * (`getAtomsForTradition`, keyed by `TRADITION_REFS` in content.ts); a lesson
 * composes concepts (`atoms`) and a path sequences lessons. Read through, the
 * ladder has a slope nobody declared (tracker entry 330, 2026-09-22): the
 * beginner paths lean on Close, Johnstone and Spolin — *The Physics of
 * Connection* is Close 13, Johnstone 10, Spolin 8, UCB 4 of 27 concepts — and
 * the performer paths on UCB and Close — *Mastering the Form* Close 8, UCB 8
 * of 16; *Advanced Game and Character* UCB 14 of 23; the lesson *The Game
 * Beneath the Game* UCB on 8 of 8. UCB leads 0 of the 8 non-performer paths
 * and 2 of the 3 performer paths; Spolin leads the 2 paths for readers off the
 * stage. Entry 163 read the traditions as concept sets, 271 joined them to
 * the guides and 288 to their books; the curriculum was the layer with a
 * direction and it was never joined.
 *
 * Three surfaces read this: the tradition page lists the lessons and paths
 * where the school leads (`curriculumFor`), the path page's status pills
 * name the leading school where there is one by a margin (`pathTraditions`),
 * and the paths hub's ladder says the slope in one sentence
 * (`ladderTraditionsSentence`). The counts are computed once per process
 * and cached, as the sibling path modules do.
 */

import { getAtomsForTradition, loadPaths, loadThreads } from "./content";
import { getPathAudience } from "./path-progression";
import type { Audience } from "./schema";
import { TRADITION_IDS, type TraditionId } from "./tradition-guides";

/**
 * How far ahead of the runner-up a school must be before a page names it as
 * the leader: 1.5 times the runner-up's count. A tie shows nothing — a
 * marker that fires on every page discriminates nothing (entry 323) — and
 * on 2026-09-22 the margin leaves 10 of the 11 paths without a pill, which
 * is the point: the pill marks the rung where the school changes.
 */
export const LEAD_MARGIN = 1.5;

/** The school's name as the curriculum surfaces say it, short enough for a pill. */
export const TRADITION_SHORT_NAMES: Record<TraditionId, string> = {
  johnstone: "Johnstone",
  spolin: "Spolin",
  close: "Close",
  ucb: "UCB",
  annoyance: "the Annoyance",
};

export type TraditionCounts = Record<TraditionId, number>;

export interface TraditionMix {
  /** Concepts in the unit that cite each school's works. A concept citing 2 schools counts for both. */
  counts: TraditionCounts;
  /** Distinct concepts in the unit, whether or not any school claims them: the M in "N of M". */
  total: number;
}

export interface CurriculumUnit extends TraditionMix {
  id: string;
  title: string;
  href: string;
  /** The school ahead by LEAD_MARGIN, or null where none is. */
  leader: TraditionId | null;
}

export interface PathTraditions extends CurriculumUnit {
  audience: Audience;
}

export interface CurriculumEntry {
  id: string;
  title: string;
  href: string;
  /** Concepts citing the school. */
  count: number;
  /** Concepts in the unit. */
  total: number;
  share: number;
}

export interface TraditionCurriculum {
  lessons: CurriculumEntry[];
  paths: CurriculumEntry[];
}

let _membership: Promise<Map<TraditionId, Set<string>>> | null = null;

/** Tradition → the ids of the concepts that cite its works. */
function membership(): Promise<Map<TraditionId, Set<string>>> {
  if (!_membership) {
    _membership = (async () => {
      const map = new Map<TraditionId, Set<string>>();
      for (const tradition of TRADITION_IDS) {
        const atoms = await getAtomsForTradition(tradition);
        map.set(tradition, new Set(atoms.map((a) => a.frontmatter.id)));
      }
      return map;
    })();
  }
  return _membership;
}

/**
 * The mix of a set of concepts, given the membership. Pure, so a test can
 * read it on a fixture; `traditionMix` supplies the corpus's membership.
 */
export function mixOf(
  atomIds: readonly string[],
  members: ReadonlyMap<TraditionId, ReadonlySet<string>>,
): TraditionMix {
  const distinct = new Set(atomIds);
  const counts = {} as TraditionCounts;
  for (const tradition of TRADITION_IDS) {
    const set = members.get(tradition);
    counts[tradition] = set ? [...distinct].filter((id) => set.has(id)).length : 0;
  }
  return { counts, total: distinct.size };
}

/** How many of these concepts cite each school's works. */
export async function traditionMix(atomIds: readonly string[]): Promise<TraditionMix> {
  return mixOf(atomIds, await membership());
}

/**
 * The school whose count is at least `margin` times the runner-up's, or
 * null: a tie, or a unit no school claims, shows nothing.
 */
export function leadingTradition(
  counts: TraditionCounts,
  margin = LEAD_MARGIN,
): TraditionId | null {
  const ranked = [...TRADITION_IDS].sort((a, b) => counts[b] - counts[a]);
  const [first, second] = ranked;
  const top = counts[first];
  if (top === 0) return null;
  if (top < margin * counts[second]) return null;
  return first;
}

let _lessons: Promise<CurriculumUnit[]> | null = null;
let _paths: Promise<PathTraditions[]> | null = null;

/** Every lesson's mix and leader, in content order. */
export function lessonTraditions(): Promise<CurriculumUnit[]> {
  if (!_lessons) {
    _lessons = (async () => {
      const [threads, members] = await Promise.all([loadThreads(), membership()]);
      return threads.map((t) => {
        const mix = mixOf(t.frontmatter.atoms ?? [], members);
        return {
          id: t.frontmatter.id,
          title: t.frontmatter.title,
          href: `/threads/${t.frontmatter.id}`,
          ...mix,
          leader: leadingTradition(mix.counts),
        };
      });
    })();
  }
  return _lessons;
}

/**
 * Every path's mix and leader, in content order. A path's concepts are the
 * union of its lessons' `atoms`, so a concept two lessons share counts once.
 */
export function pathTraditions(): Promise<PathTraditions[]> {
  if (!_paths) {
    _paths = (async () => {
      const [paths, threads, members] = await Promise.all([
        loadPaths(),
        loadThreads(),
        membership(),
      ]);
      const atomsOf = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.atoms ?? []]));
      return paths.map((p) => {
        const atomIds = (p.frontmatter.threads ?? []).flatMap((id) => atomsOf.get(id) ?? []);
        const mix = mixOf(atomIds, members);
        return {
          id: p.frontmatter.id,
          title: p.frontmatter.title,
          href: `/paths/${p.frontmatter.id}`,
          audience: p.frontmatter.audience?.[0] ?? getPathAudience(p.frontmatter.id) ?? "beginner",
          ...mix,
          leader: leadingTradition(mix.counts),
        };
      });
    })();
  }
  return _paths;
}

function toEntry(unit: CurriculumUnit, tradition: TraditionId): CurriculumEntry {
  const count = unit.counts[tradition];
  return {
    id: unit.id,
    title: unit.title,
    href: unit.href,
    count,
    total: unit.total,
    share: unit.total === 0 ? 0 : count / unit.total,
  };
}

/** Largest share first; the count breaks ties so 8 of 8 outranks 4 of 4. */
function byShare(a: CurriculumEntry, b: CurriculumEntry): number {
  return b.share - a.share || b.count - a.count || a.id.localeCompare(b.id);
}

/** The lessons and paths where a school leads, largest share first. */
export async function curriculumFor(tradition: TraditionId): Promise<TraditionCurriculum> {
  const [lessons, paths] = await Promise.all([lessonTraditions(), pathTraditions()]);
  return {
    lessons: lessons
      .filter((l) => l.leader === tradition)
      .map((l) => toEntry(l, tradition))
      .sort(byShare),
    paths: paths
      .filter((p) => p.leader === tradition)
      .map((p) => toEntry(p, tradition))
      .sort(byShare),
  };
}

/** "8 of 8 concepts", for the entry's link. */
export function countLabel(entry: CurriculumEntry): string {
  return `${entry.count} of ${entry.total} concept${entry.total === 1 ? "" : "s"}`;
}

/** The path page's pill: "leans on UCB". */
export function leadingSchoolLabel(tradition: TraditionId): string {
  return `leans on ${TRADITION_SHORT_NAMES[tradition]}`;
}

/** "Close, Johnstone and Spolin" — an English list without the serial comma the site does not use. */
export function englishList(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * The schools a rung's paths top, most-topped first. "Top" here is the
 * plain maximum with ties included rather than the margin's leader, because
 * the sentence describes a rung and a rung's tendency shows through ties
 * that a single path's pill must not show; a tie between schools in how
 * many paths each tops is broken by their concept counts across the rung.
 */
export function rungSchools(paths: readonly PathTraditions[]): TraditionId[] {
  const topped = {} as TraditionCounts;
  const concepts = {} as TraditionCounts;
  for (const t of TRADITION_IDS) {
    topped[t] = 0;
    concepts[t] = 0;
  }
  for (const p of paths) {
    const max = Math.max(...TRADITION_IDS.map((t) => p.counts[t]));
    for (const t of TRADITION_IDS) {
      concepts[t] += p.counts[t];
      if (max > 0 && p.counts[t] === max) topped[t] += 1;
    }
  }
  return [...TRADITION_IDS]
    .filter((t) => topped[t] > 0)
    .sort((a, b) => topped[b] - topped[a] || concepts[b] - concepts[a]);
}

/**
 * The ladder's slope in one sentence, from the schools the beginner-rung
 * paths top against the performer-rung paths: "Beginner paths lean on Close,
 * Johnstone and Spolin; the performer paths on UCB and Close." Null when
 * either rung has no path or no school, so the hub says nothing rather than
 * a half sentence.
 */
export async function ladderTraditionsSentence(): Promise<string | null> {
  const paths = await pathTraditions();
  const beginner = rungSchools(paths.filter((p) => p.audience === "beginner"));
  const performer = rungSchools(paths.filter((p) => p.audience === "performer"));
  if (beginner.length === 0 || performer.length === 0) return null;
  const names = (ids: TraditionId[]) => englishList(ids.map((id) => TRADITION_SHORT_NAMES[id]));
  return `Beginner paths lean on ${names(beginner)}; the performer paths on ${names(performer)}.`;
}
