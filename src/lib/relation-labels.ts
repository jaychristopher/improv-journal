import type { Link } from "./schema";

export type Relation = Link["relation"];

export interface RelationLabel {
  /** What this page says about the neighbour it links to: "A *builds on* B". */
  outbound: string;
  /** What this page shows for an edge another atom declared toward it: "B is *required by* A". */
  inbound: string;
  /** True when the relation reads the same from either end, so one label serves both. */
  symmetric: boolean;
}

/**
 * The one reader-facing vocabulary for the five relations, in both directions.
 *
 * On 2026-09-21 the same edge from `commitment` to `be-present` was "Builds
 * on" on one page, "Required by" on the other and "Builds on this" on the
 * related-concepts card between them, because four hand-written maps in three
 * files each chose their own words (tracker entry 227). `extends` was
 * "Related" inside a sidebar section headed "Related". Every surface that
 * names a relation — the sidebar's outbound and inbound groups, the
 * related-concepts card's hints, the mini graph's legend — now reads from
 * here, and `relation-labels.test.ts` fails if a file under `src/` grows a
 * map of its own.
 *
 * `requires` and `enables` are converses ("A builds on B" and "B unlocks A"
 * are one fact), so their inbound labels name the other atom's claim rather
 * than restating this page's. `contrasts` is the only symmetric relation
 * (entry 162), which is why it is the only one whose two directions share a
 * word.
 */
export const RELATION_LABELS: Record<Relation, RelationLabel> = {
  requires: { outbound: "Builds on", inbound: "Required by", symmetric: false },
  enables: { outbound: "Unlocks", inbound: "Enabled by", symmetric: false },
  contrasts: { outbound: "Compare", inbound: "Compare", symmetric: true },
  extends: { outbound: "Extends", inbound: "Extended by", symmetric: false },
  illustrates: { outbound: "Example of", inbound: "Illustrated by", symmetric: false },
};

/**
 * A drill declares `illustrates` toward the concept it trains, and the concept
 * declares nothing back — so the concept page is the one place its exercises
 * can be listed, and the label says so rather than naming the relation.
 *
 * Two labels, because the edge and the drill do not always agree. The graph
 * applies `illustrates` from an exercise 86 times; the drills' own
 * `**Trains:**` lines (trains.ts) confirm 17 of them (tracker entry 274,
 * 2026-09-22). The strong label is for an edge the drill's own statement of
 * purpose backs; the weaker one is what a bare `illustrates` edge says —
 * "this drill shows this concept in action", the claim the edges were
 * written to make.
 */
export const DRILLS_LABEL = "Drills that train this";
export const DRILLS_SHOW_LABEL = "Drills that show this";

/**
 * A `contrasts` edge from a drill to a failure is not a comparison. 37 such
 * edges ran from exercises to the ten antipatterns on 2026-09-22 (hesitation
 * 12, internal-computation 5, performing-cleverness 5, steering 4 …), every
 * one written from the drill's "Common failures" section, and every one
 * rendered "Compare" — the symmetric word — so on hesitation's page the twelve
 * drills built to break the habit sat in a group that means "differs from",
 * beside the principles it merely differs from (tracker entry 286). The
 * source type and the target type decide the case, as they do for the drills
 * labels above: seen from the failure the drills "counter this"; seen from
 * the drill it "counters" the failure. Every other pair keeps "Compare".
 */
export const COUNTERS_LABEL = "Drills that counter this";
export const COUNTERS_OUTBOUND_LABEL = "Counters";

/**
 * The counter case: `contrasts`, declared by an exercise, toward an
 * antipattern. `sourceType` is the atom that declares the edge and
 * `targetType` the atom it points at, whichever page is being rendered.
 */
export function isCounterEdge(
  relation: Relation,
  sourceType?: string,
  targetType?: string,
): boolean {
  return relation === "contrasts" && sourceType === "exercise" && targetType === "antipattern";
}

/**
 * The principle–failure pairing, on the pages the pairs live on. The
 * principles hub lists "Failures this addresses" under each principle
 * (principle-failures.ts, entry 155): 24 `contrasts` edges between the 9
 * principles and the 10 antipatterns, read from either end. On the pages
 * themselves the same edges wore the relation's plain word until 2026-09-22
 * — 24 of the 32 "Compare" items on the principle pages, 24 of the 104 on
 * the failure pages among 34 techniques, 25 definitions and 9 formats — so
 * a reader who named their failure on *Hesitation* met Be Brave under the
 * same neutral label as *World's Worst* (tracker entry 328). Seen from the
 * failure the principle is the one it violates; seen from the principle the
 * failures are the ones it addresses, in the hub's own phrase, which the hub
 * now imports from here so the two surfaces cannot drift apart.
 */
export const PRINCIPLE_LABEL = "Principle it violates";
export const FAILURES_LABEL = "Failures this addresses";

/**
 * The pair case: `contrasts` between a principle and an antipattern, in
 * either direction. `sourceType` is the atom that declares the edge and
 * `targetType` the atom it points at; both orders are one pairing because
 * `contrasts` is symmetric and the map reads it from either end.
 */
export function isPairEdge(relation: Relation, sourceType?: string, targetType?: string): boolean {
  if (relation !== "contrasts") return false;
  return (
    (sourceType === "principle" && targetType === "antipattern") ||
    (sourceType === "antipattern" && targetType === "principle")
  );
}

/**
 * The pair group's label on the page whose type is given: the failure's
 * page names the principle, the principle's page names the failures. Any
 * other page has no pair group and gets the relation's word.
 */
export function pairLabel(pageType?: string): string {
  if (pageType === "antipattern") return PRINCIPLE_LABEL;
  if (pageType === "principle") return FAILURES_LABEL;
  return RELATION_LABELS.contrasts.outbound;
}

/**
 * The outgoing relation under which the same neighbour would already be
 * listed, so an inbound edge that only repeats a declared outgoing one is
 * shown once. `requires` and `enables` are each other's converse; the other
 * three read the same from either end.
 *
 * The rule is direction-blind and the labels are not: on `illustrates` the
 * inbound edge from a drill carries the drills label and the outbound one
 * toward it the plain word, so a caller that drops the inbound edge for its
 * reciprocal keeps the weak line (entry 327). AtomDetail's grouping exempts
 * the drill edge from the rule for that reason.
 */
export const RECIPROCAL: Record<Relation, Relation> = {
  requires: "enables",
  enables: "requires",
  contrasts: "contrasts",
  extends: "extends",
  illustrates: "illustrates",
};

/**
 * The label for an edge this page declares. Pass the page's own type and the
 * neighbour's to get the counter case — a drill's `contrasts` toward a
 * failure reads "Counters", not "Compare" — or the pair case, a failure's
 * `contrasts` toward a principle ("Principle it violates") and a principle's
 * toward a failure ("Failures this addresses"); without them, the relation's
 * plain word.
 */
export function outboundLabel(relation: Relation, pageType?: string, targetType?: string): string {
  if (isCounterEdge(relation, pageType, targetType)) return COUNTERS_OUTBOUND_LABEL;
  if (isPairEdge(relation, pageType, targetType)) return pairLabel(pageType);
  return RELATION_LABELS[relation].outbound;
}

/**
 * The label for an edge another atom declared toward this page. An
 * `illustrates` edge from an exercise is the drills case above; pass the
 * source atom's type to get it, and `trains: true` when the drill's Trains
 * line names this page — the only case that earns the strong label. A
 * `contrasts` edge from an exercise onto an antipattern page is the counter
 * case, and needs the page's type as the fourth argument: an exercise's
 * `contrasts` is a counter only when what it lands on is a failure. The
 * pair case reads the same two types: a principle's `contrasts` onto a
 * failure's page, or a failure's onto a principle's, is the pairing and
 * takes the page's pair label (entry 328).
 */
export function inboundLabel(
  relation: Relation,
  sourceType?: string,
  trains = false,
  pageType?: string,
): string {
  if (relation === "illustrates" && sourceType === "exercise") {
    return trains ? DRILLS_LABEL : DRILLS_SHOW_LABEL;
  }
  if (isCounterEdge(relation, sourceType, pageType)) return COUNTERS_LABEL;
  if (isPairEdge(relation, sourceType, pageType)) return pairLabel(pageType);
  return RELATION_LABELS[relation].inbound;
}
