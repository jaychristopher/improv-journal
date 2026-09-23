import { getAtomUrl, loadAtoms } from "@/lib/content";
import { PAIRING_RELATIONS } from "@/lib/drill-pairs";
import type { AtomFrontmatter } from "@/lib/schema";
import { buildTrainsIndex } from "@/lib/trains";

/**
 * "Drills that prepare for this": the derived bridge between the two
 * practice layers.
 *
 * The 27 exercises and the 24 formats are both things a reader can *do*, and
 * the graph keeps them apart: ten edges join an exercise and a format in
 * either direction out of 2,435, no format's body names an exercise, and no
 * lesson composes both (tracker entry 283, 2026-09-22). The formats are a
 * well-linked layer that points at techniques, definitions and each other,
 * so the Harold — the most-linked format on the site, 24 formats pointing at
 * it — arrives at the end of every walk as a description with no drill that
 * builds toward it.
 *
 * The rule is drill-pairs' shared-target rule applied across the two types:
 * a drill prepares for a format when the two point at the same concept. The
 * format's targets are its `requires` and `illustrates` edges
 * (PAIRING_RELATIONS); the drill's are the same edges plus whatever its own
 * `**Trains:**` line names (trains.ts). A concept the drill *says* it trains
 * is the drill agreeing about its point, so a shared trains target counts
 * double; a shared edge counts once; and the ten direct edges between an
 * exercise and a format are the graph's own claim, so a direct link counts as
 * a trains share does. Ranked by that score, then title, cut at
 * FORMAT_DRILLS_CAP, and each link names the concept it comes through
 * ("through Editing") so the reader knows why the drill is offered.
 *
 * Nothing here is authored and no frontmatter edge changes; the graph's core
 * numbers are what they were. `formatsFedBy` is the same relation read from
 * the exercise's end, for the "feeds" line on a drill card.
 */

/** Drills shown under a format. Below SIDEBAR_VISIBLE, so the group never folds. */
export const FORMAT_DRILLS_CAP = 4;

/** The group's heading. Not a relation label: nothing in frontmatter says "prepares". */
export const FORMAT_DRILLS_LABEL = "Drills that prepare for this";

/** The lead-in on a hub card: "prepare with: Editing Drill, Sound Ball". */
export const PREPARE_WITH_LABEL = "prepare with";
/** The reverse lead-in on a drill's card: "feeds: Harold, Armando". */
export const FEEDS_LABEL = "feeds";

/** How many links a hub card's one-line prepare-with or feeds note carries. */
export const CARD_LINE_CAP = 2;

/** The score a direct edge between an exercise and a format earns; equal to a trains share. */
const DIRECT_SCORE = 2;

export interface PreparedThrough {
  id: string;
  title: string;
  /** True when the drill's Trains line names the concept, so it counted double. */
  trains: boolean;
}

export interface FormatDrill {
  id: string;
  title: string;
  url: string;
  /**
   * The concepts both point at: trains shares first, then the rest in the
   * order the format's frontmatter names them.
   */
  shared: PreparedThrough[];
  /** True when the exercise and the format link each other in frontmatter. */
  direct: boolean;
  /** Shared concepts weighted (trains double) plus the direct-link bonus. */
  score: number;
}

export interface FormatDrills {
  drills: FormatDrill[];
  /** How many candidates the cap cut, for the "and N more" note. */
  omitted: number;
}

/** A format an exercise prepares for, from the exercise's end. */
export interface FedFormat {
  id: string;
  title: string;
  url: string;
  shared: PreparedThrough[];
  direct: boolean;
  score: number;
}

export interface FedFormats {
  formats: FedFormat[];
  omitted: number;
}

type Atom = { frontmatter: AtomFrontmatter; content?: string };

/**
 * The concept ids an atom's pairing edges point at, in frontmatter order.
 * A drill trains a concept, not another drill and not a book, so exercises
 * and references are not shared targets; a format target is allowed, since a
 * drill that builds the Harold's opening does prepare for the forms that
 * require the Harold.
 */
function pairingTargets(fm: AtomFrontmatter, byId: Map<string, AtomFrontmatter>): string[] {
  const out: string[] = [];
  for (const link of fm.links ?? []) {
    if (!PAIRING_RELATIONS.includes(link.relation)) continue;
    const target = byId.get(link.id);
    if (!target || target.type === "exercise" || target.type === "reference") continue;
    if (out.includes(link.id)) continue;
    out.push(link.id);
  }
  return out;
}

function linksTo(fm: AtomFrontmatter, id: string): boolean {
  return (fm.links ?? []).some((l) => l.id === id);
}

function scoreOf(shared: PreparedThrough[], direct: boolean): number {
  return shared.reduce((n, c) => n + (c.trains ? 2 : 1), 0) + (direct ? DIRECT_SCORE : 0);
}

/**
 * The shared concepts between one format and one exercise, trains shares
 * first, or null when nothing joins them.
 */
function joinOf(
  format: AtomFrontmatter,
  formatTargets: readonly string[],
  exercise: AtomFrontmatter,
  exerciseTargets: ReadonlySet<string>,
  exerciseTrains: ReadonlySet<string>,
  byId: Map<string, AtomFrontmatter>,
): { shared: PreparedThrough[]; direct: boolean } | null {
  const direct = linksTo(exercise, format.id) || linksTo(format, exercise.id);
  const trainsShared = formatTargets.filter((id) => exerciseTrains.has(id));
  const edgeShared = formatTargets.filter(
    (id) => exerciseTargets.has(id) && !trainsShared.includes(id),
  );
  if (!direct && trainsShared.length === 0 && edgeShared.length === 0) return null;
  const shared = [
    ...trainsShared.map((id) => ({ id, title: byId.get(id)!.title, trains: true })),
    ...edgeShared.map((id) => ({ id, title: byId.get(id)!.title, trains: false })),
  ];
  return { shared, direct };
}

const byScore = (a: { score: number; title: string }, b: { score: number; title: string }) =>
  b.score - a.score || a.title.localeCompare(b.title);

/** Every drill that joins a format, ranked, uncut. */
function candidatesFor(formatId: string, atoms: readonly Atom[]): FormatDrill[] {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const self = byId.get(formatId);
  if (!self || self.type !== "format") return [];
  const { trains } = buildTrainsIndex(atoms);
  const formatTargets = pairingTargets(self, byId);

  const out: FormatDrill[] = [];
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    if (fm.type !== "exercise") continue;
    const join = joinOf(
      self,
      formatTargets,
      fm,
      new Set(pairingTargets(fm, byId)),
      new Set(trains.get(fm.id) ?? []),
      byId,
    );
    if (!join) continue;
    out.push({
      id: fm.id,
      title: fm.title,
      url: getAtomUrl({ id: fm.id, type: fm.type }),
      ...join,
      score: scoreOf(join.shared, join.direct),
    });
  }
  return out.sort(byScore);
}

/**
 * The drills that prepare for a format, ranked by weighted shared targets
 * then title, cut at FORMAT_DRILLS_CAP. Empty for anything that is not a
 * format.
 */
export function drillsPreparingFor(formatId: string, atoms: readonly Atom[]): FormatDrills {
  const all = candidatesFor(formatId, atoms);
  return {
    drills: all.slice(0, FORMAT_DRILLS_CAP),
    omitted: Math.max(0, all.length - FORMAT_DRILLS_CAP),
  };
}

/**
 * The reverse: the formats an exercise prepares for, by the same join and
 * the same ranking, cut at the same cap. Empty for anything that is not an
 * exercise.
 */
export function formatsFedBy(exerciseId: string, atoms: readonly Atom[]): FedFormats {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const self = byId.get(exerciseId);
  if (!self || self.type !== "exercise") return { formats: [], omitted: 0 };
  const { trains } = buildTrainsIndex(atoms);
  const exerciseTargets = new Set(pairingTargets(self, byId));
  const exerciseTrains = new Set(trains.get(exerciseId) ?? []);

  const out: FedFormat[] = [];
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    if (fm.type !== "format") continue;
    const join = joinOf(fm, pairingTargets(fm, byId), self, exerciseTargets, exerciseTrains, byId);
    if (!join) continue;
    out.push({
      id: fm.id,
      title: fm.title,
      url: getAtomUrl({ id: fm.id, type: fm.type }),
      ...join,
      score: scoreOf(join.shared, join.direct),
    });
  }
  out.sort(byScore);
  return {
    formats: out.slice(0, FORMAT_DRILLS_CAP),
    omitted: Math.max(0, out.length - FORMAT_DRILLS_CAP),
  };
}

/**
 * The note under a link: the concept the pair comes through, and how many
 * more. A direct edge is the graph's own claim and reads "linked directly";
 * otherwise "through X", with the trains share first so the note names the
 * concept the drill says it trains.
 */
export function preparesNote(drill: { shared: PreparedThrough[]; direct: boolean }): string {
  const [first, ...rest] = drill.shared;
  if (!first) return drill.direct ? "linked directly" : "";
  const lead = `through ${first.title}`;
  return rest.length === 0 ? lead : `${lead} and ${rest.length} more`;
}

/**
 * The hub card's line: the first CARD_LINE_CAP drills that prepare for a
 * format, loaded here so a hub page that lists from `orderedFormats` need
 * not load the atoms itself (hub-order.test.ts holds the page to that).
 */
export async function prepareWithFor(formatId: string): Promise<FormatDrill[]> {
  return drillsPreparingFor(formatId, await loadAtoms()).drills.slice(0, CARD_LINE_CAP);
}
