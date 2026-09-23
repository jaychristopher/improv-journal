import type { AtomFrontmatter } from "./schema";

/**
 * How much the graph leans on an atom, read against the atom's age.
 *
 * 7 surfaces order their members by in-degree — the inbound sidebar
 * groups and their fold summaries, "Counter it with", the principles hub's
 * failure lines, the library's "Pages that cite it", the JSON-LD `subjectOf`
 * order, the techniques hub and the related-concepts tiebreak — each chosen
 * because in-degree is "what the graph leans on". But the edges were written
 * toward the atoms that existed when they were written, so in-degree follows
 * age: the 27 March atoms have a median in-degree of 17, the 128 April atoms
 * 7, the 46 August atoms 1, and on 2026-09-22 the March cohort (13% of the
 * graph) held the first slot in 26% of the 508 inbound groups while August
 * (22%) held 11%, and no August atom was among the top 20 by in-degree
 * (tracker entry 307). For the newest fifth of the corpus the "importance
 * signal" was a signal that they were new.
 *
 * `ageNormalisedRank` is the rule those surfaces order by now: edges received
 * divided by months since the atom was first published, so a concept the
 * newer writing leans on ranks where its use is rather than where its
 * birthday is. `recentInDegree` is the other reading the entry proposed —
 * edges received from atoms created after the target — kept as a measure and
 * a check, not an ordering.
 *
 * The divisor's date is `firstPublished` — the first commit that added the
 * file, or `created` where the file predates the repository (tracker entry
 * 321; first-published.ts) — and not `created`, which is a batch stamp with
 * 9 values across 205 atoms. On 2026-09-22 the 2 agree on every atom:
 * git dates the 126 files it saw added to the day `created` says, and the
 * 79 it did not see keep `created`. So the cohort readings below did not
 * move; what changed is that "months of existence" is now read from the
 * record of the site having the page, and a future atom whose `created` is
 * a stamp rather than a date is aged by the commit. An atom without the
 * field — the tests' hand-built ones — is aged by `created`. `cohortOf`,
 * `newestCohort` and `recentInDegree` still read `created`: a cohort is a
 * batch, and the stamp is what names it.
 *
 * The clock is the corpus's own: ages are measured to the latest `updated`
 * date any atom carries (`graphClock`), not to the wall clock, so a build on
 * a later day yields the same order as a build today and a test can hold the
 * order to a reading. The graph's present is the last time it was written.
 *
 * The divisor has a floor, AGE_FLOOR_MONTHS. Dividing by a true age of 1
 * month fixed one bias by installing its mirror: the 46 August atoms were a
 * month old on 2026-09-22 against 5.5 for April, so an August drill with 3
 * edges out-ranked an April drill with 30, and on a list capped at 3 the
 * newest cohort was not lifted but seated entirely — hesitation's "Counter
 * it with" became 3 August warm-ups, 1 of them with no Trains line, while
 * First Line Drill, written for hesitation, sat below the cap (tracker entry
 * 322). An atom younger than the floor is ranked as if it were the floor's
 * age, so a new batch is lifted without taking every seat; the reserved
 * slot (`reserveNewestSlot`) is what guarantees it 1. The floor gives back
 * most of the lift: August's share of the inbound groups' first slots went
 * 11% → 16% → 12% and no August work is in the top 20 by rank (2 were);
 * atom-rank.test.ts holds both readings.
 */

type Atom = { frontmatter: AtomFrontmatter; firstPublished?: string };

/** Days in a mean month; the unit `monthsSince` divides by. */
const DAYS_PER_MONTH = 365.25 / 12;

/**
 * The youngest age the divisor uses, in months: an atom 1 month old is
 * ranked as if it were 3. Was 1 until 2026-09-22, when a 1-month divisor
 * gave every short list to the newest cohort (entry 322, above). At 3 an
 * August atom with 3 edges ranks 1.0, level with an April atom with 5 or 6,
 * rather than 3.0, above every atom in the graph but the core. The number
 * is the gap the corpus's own batches have shown — they land months apart,
 * not weeks — and below it "edges per month" is a statement about the
 * month, not the edges.
 */
export const AGE_FLOOR_MONTHS = 3;

/**
 * The number of declared links, across every atom, that point at each id.
 * Every relation counts: `requires` and `enables` both say the graph leans on
 * the target. Was `hub-order.ts`'s until 2026-09-22; it lives here now so the
 * raw count and the age-normalised one are read from one place.
 */
export function inDegreeIndex(atoms: readonly Atom[]): Map<string, number> {
  const inDegree = new Map<string, number>();
  for (const atom of atoms) {
    for (const link of atom.frontmatter.links ?? []) {
      inDegree.set(link.id, (inDegree.get(link.id) ?? 0) + 1);
    }
  }
  return inDegree;
}

/** The latest `updated` (or `created`, if later) date any atom carries, as an ISO date. */
export function graphClock(atoms: readonly Atom[]): string {
  let latest = "";
  for (const { frontmatter } of atoms) {
    for (const date of [frontmatter.updated, frontmatter.created]) {
      if (date && date > latest) latest = date;
    }
  }
  return latest;
}

/**
 * Months from `from` (an ISO date; an atom's first-published date) to `at`,
 * floored at AGE_FLOOR_MONTHS: an atom written this month is treated as
 * leaned on for as long as the floor says, not for a fraction that would
 * divide its edges into a rank no older atom could reach. A `from` after
 * `at`, or one that does not parse, is also the floor.
 */
export function monthsSince(fromDate: string, at: string): number {
  const from = Date.parse(fromDate);
  const to = Date.parse(at);
  if (Number.isNaN(from) || Number.isNaN(to)) return AGE_FLOOR_MONTHS;
  const days = (to - from) / (24 * 60 * 60 * 1000);
  return Math.max(AGE_FLOOR_MONTHS, days / DAYS_PER_MONTH);
}

/**
 * Edges received per month of existence, for every atom, measured to the
 * graph's clock (or `at`, when given). An atom nothing links to ranks 0.
 */
export function ageNormalisedRank(atoms: readonly Atom[], at?: string): Map<string, number> {
  const clock = at ?? graphClock(atoms);
  const inDegree = inDegreeIndex(atoms);
  const rank = new Map<string, number>();
  for (const { frontmatter, firstPublished } of atoms) {
    const edges = inDegree.get(frontmatter.id) ?? 0;
    rank.set(frontmatter.id, edges / monthsSince(firstPublished ?? frontmatter.created, clock));
  }
  return rank;
}

/**
 * Edges received from atoms created strictly after the target, for every
 * atom: the count of writing that came later and still leaned on it. An
 * edge from an atom of the same day or earlier does not count.
 */
export function recentInDegree(atoms: readonly Atom[]): Map<string, number> {
  const created = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.created]));
  const recent = new Map<string, number>();
  for (const { frontmatter } of atoms) recent.set(frontmatter.id, 0);
  for (const { frontmatter } of atoms) {
    for (const link of frontmatter.links ?? []) {
      const targetCreated = created.get(link.id);
      if (targetCreated === undefined || !(frontmatter.created > targetCreated)) continue;
      recent.set(link.id, (recent.get(link.id) ?? 0) + 1);
    }
  }
  return recent;
}

/** An atom's creation month, `YYYY-MM`, the unit the cohorts are read in. */
export function cohortOf(fm: Pick<AtomFrontmatter, "created">): string {
  return fm.created.slice(0, 7);
}

/**
 * The ids of the newest cohort: every atom created in the latest month any
 * atom was created in. On 2026-09-22 that is the 46 August atoms. Read from
 * the corpus rather than named, so the next batch is the newest cohort the
 * day it lands.
 */
export function newestCohort(atoms: readonly Atom[]): Set<string> {
  let latest = "";
  for (const { frontmatter } of atoms) {
    const month = cohortOf(frontmatter);
    if (month > latest) latest = month;
  }
  return new Set(
    atoms.filter((a) => cohortOf(a.frontmatter) === latest).map((a) => a.frontmatter.id),
  );
}

/**
 * The ordering the surfaces share: by `rank` descending, then title, then
 * id, so the order is stable across builds. `rank` is a map from id; an id
 * it does not hold ranks 0.
 */
export function byRank<T extends { id: string; title: string }>(
  rank: ReadonlyMap<string, number>,
): (a: T, b: T) => number {
  const of = (x: T) => rank.get(x.id) ?? 0;
  return (a, b) => of(b) - of(a) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

/**
 * One slot for the newest cohort on a short list, the way the level pages
 * reserve beginner drills. If the first `open` entries hold no member of
 * `newest` and a later entry is one, the best-ranked such entry moves into
 * the last open slot and the one it displaces steps down to just after it;
 * everything else keeps its order. A list already showing a newest-cohort
 * member, or holding none, comes back as it was. `open` counts the entries
 * the surface shows before its cap or fold.
 */
export function reserveNewestSlot<T extends { id: string }>(
  list: readonly T[],
  open: number,
  newest: ReadonlySet<string>,
): T[] {
  if (open <= 0 || list.length <= open) return [...list];
  const head = list.slice(0, open);
  if (head.some((x) => newest.has(x.id))) return [...list];
  const at = list.findIndex((x, i) => i >= open && newest.has(x.id));
  if (at < 0) return [...list];
  const out = [...list];
  const [promoted] = out.splice(at, 1);
  out.splice(open - 1, 0, promoted);
  return out;
}
