import { ageNormalisedRank, byRank, newestCohort, reserveNewestSlot } from "./atom-rank";
import { getAtomUrl } from "./content";
import { principleFailures } from "./principle-failures";
import type { AtomFrontmatter } from "./schema";
import { buildTrainsIndex } from "./trains";

/**
 * What a drill's own Trains line says about the failure it counters:
 * `pair` names the failure itself or a principle the failure is paired with
 * (principle-failures.ts); `line` is a Trains line naming neither; `none`
 * is a drill with no Trains line. The tiers the counters are ranked in.
 */
export type CounterPurpose = "pair" | "line" | "none";

/**
 * A drill that counters a failure: an exercise joined to an antipattern by a
 * `contrasts` edge, declared from either end.
 */
export interface CounterDrill {
  id: string;
  title: string;
  url: string;
  /** What the drill's Trains line says about this failure — the first key the order is read by. */
  purpose: CounterPurpose;
  /** How many atoms link to the drill, per month since it was written — the tiebreak within a purpose tier. */
  rank: number;
}

/** How many drills the diagnosis hub names under a failure. */
export const COUNTER_DRILLS_CAP = 3;

/** The tiers as a sort key: a drill written for the failure, then any drill that says what it is for, then the rest. */
const PURPOSE_TIER: Record<CounterPurpose, number> = { pair: 2, line: 1, none: 0 };

type Atom = { frontmatter: AtomFrontmatter; content?: string; firstPublished?: string };

/**
 * The remedy map the graph held and no surface drew.
 *
 * The drills' "Common failures" sections name the antipatterns each drill
 * goes wrong into, and those names were applied as `contrasts` edges: 37 of
 * them on 2026-09-22, from exercises to every one of the 10 antipatterns
 * (hesitation 12, internal-computation 5, performing-cleverness 5, steering
 * 4, negation 3, blocking 2, overcomplication 2, wimping 2, bulldozing 1,
 * judgment 1). Read from the failure's side that is the list of drills built
 * to break the habit, and the diagnosis hub — whose instruction is "name the
 * failure" — named none of them (tracker entry 286). This reads the pairing
 * so the hub can say "Counter it with: …" and the failure's page can head
 * the group "Drills that counter this" (relation-labels.ts).
 *
 * `contrasts` is the symmetric relation, so an edge counts whichever atom
 * declared it, as `principleFailures` counts principle–failure pairs. Today
 * one antipattern declares a drill from its own side (blocking → one-word-
 * scene) and it is not reciprocated, so the map is 38 pairs: the 37 the
 * drills declare and that one. Only exercises count — a failure also
 * contrasts principles and definitions, and those are not things to do.
 *
 * Within a failure the drills are ordered by purpose first, then by rank.
 * Purpose is the drill's own Trains line (trains.ts, entry 274) read against
 * the failure: a drill whose line names the failure itself or one of the
 * principles the failure is paired with (principle-failures.ts, entry 155 —
 * hesitation ↔ be-brave, be-present, be-honest, be-supportive) leads; then
 * a drill with any Trains line; then a drill with none. Within a tier the
 * order is how much the graph leans on the drill for its age — in-degree
 * per month since it was first published (`ageNormalisedRank`, entry 307)
 * — descending, then title.
 *
 * The rank alone was the rule from the morning of 2026-09-22 to the
 * evening, and raw in-degree before that. Raw in-degree put the August
 * drills last on every line because the edges toward them were a month
 * old; the age-normalised rank, dividing by that month, put them first on
 * every line, and hesitation's 3 became Pass the Clap ("shared timing"),
 * Zip Zap Zop and Bippity Bippity Bop (no Trains line) while First Line
 * Drill ("Be Brave — the threshold moment of starting") sat below the cap
 * (entry 322). The counters are the one list with the drills' statements
 * of purpose to hand, so purpose is read first and the rank breaks ties:
 * on 2026-09-22 the first counter changed on 6 of the 10 lines (4 by
 * purpose, 2 more by the rank's 3-month age floor), hesitation's first is
 * now Zip Zap Zop, whose line names Be Present, then First Line Drill.
 *
 * The cap reserves one slot for the newest cohort, the way the level pages
 * reserve beginner drills: where the first 3 hold no drill from the latest
 * month of writing and a later one does, the best-ranked such drill takes
 * the third slot. A line already naming one, or with none to name, is
 * unchanged. On 2026-09-22 the reservation moves nothing: an August drill
 * sits in the first 3 of every line that has one, by purpose or by rank.
 * The slot is a guard for the day a batch lands whose drills say nothing
 * a failure's principles name.
 */
export function counterDrills(atoms: readonly Atom[]): Map<string, CounterDrill[]> {
  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
  const rank = ageNormalisedRank(atoms);
  const newest = newestCohort(atoms);
  const { trains, withLine } = buildTrainsIndex(atoms);
  const hasLine = new Set(withLine);
  // failure id → the principles it is paired with, the map read from the failure's side.
  const principlesOf = new Map<string, Set<string>>();
  for (const [principleId, failures] of principleFailures(atoms)) {
    for (const f of failures) {
      const set = principlesOf.get(f.id) ?? new Set<string>();
      set.add(principleId);
      principlesOf.set(f.id, set);
    }
  }

  const purposeOf = (antipatternId: string, drillId: string): CounterPurpose => {
    if (!hasLine.has(drillId)) return "none";
    const named = trains.get(drillId) ?? [];
    const principles = principlesOf.get(antipatternId);
    const forThis = named.some((id) => id === antipatternId || principles?.has(id));
    return forThis ? "pair" : "line";
  };

  const result = new Map<string, Map<string, CounterDrill>>();
  for (const a of atoms) {
    if (a.frontmatter.type === "antipattern") result.set(a.frontmatter.id, new Map());
  }

  const pair = (antipatternId: string, drillId: string) => {
    const antipattern = byId.get(antipatternId);
    const drill = byId.get(drillId);
    if (antipattern?.type !== "antipattern" || drill?.type !== "exercise") return;
    result.get(antipatternId)?.set(drillId, {
      id: drill.id,
      title: drill.title,
      url: getAtomUrl({ id: drill.id, type: drill.type }),
      purpose: purposeOf(antipatternId, drillId),
      rank: rank.get(drill.id) ?? 0,
    });
  };

  for (const atom of atoms) {
    const fm = atom.frontmatter;
    for (const link of fm.links ?? []) {
      if (link.relation !== "contrasts") continue;
      if (fm.type === "exercise") pair(link.id, fm.id);
      else if (fm.type === "antipattern") pair(fm.id, link.id);
    }
  }

  const ordered = new Map<string, CounterDrill[]>();
  for (const [id, drills] of result) {
    ordered.set(
      id,
      reserveNewestSlot(
        [...drills.values()].sort(byCounterOrder(rank)),
        COUNTER_DRILLS_CAP,
        newest,
      ),
    );
  }
  return ordered;
}

/**
 * The counters' order: purpose tier descending, then the shared rank order
 * (`byRank`: rank descending, then title, then id), so 2 drills written for
 * the failure still stand in the order the rest of the site uses.
 */
function byCounterOrder(
  rank: ReadonlyMap<string, number>,
): (a: CounterDrill, b: CounterDrill) => number {
  const inner = byRank<CounterDrill>(rank);
  return (a, b) => PURPOSE_TIER[b.purpose] - PURPOSE_TIER[a.purpose] || inner(a, b);
}

/** The drills countering one failure, in the order above; empty for an unknown id. */
export function drillsCountering(antipatternId: string, atoms: readonly Atom[]): CounterDrill[] {
  return counterDrills(atoms).get(antipatternId) ?? [];
}
