import type { Link } from "./schema";

/**
 * The order a lesson's atoms should be presented in.
 *
 * Each lesson's `atoms:` list was written as a table of contents, not as a
 * dependency order: of the 94 `requires` edges that run between two atoms
 * of the same lesson, 41 (44%) point at an atom listed *later* — the
 * prerequisite after the concept that needs it — and 16 of the 25 lessons
 * have at least one such edge (tracker entry 273, 2026-09-22). No lesson body
 * names a single one of its atoms in backticks, so the list's order reaches
 * the reader only through the derived surfaces: "Composed from", the drill
 * router's walk, the episode notes' "Ideas in this episode", the atom page's
 * "next in this lesson". Every one of them obeyed the authored order.
 *
 * `lessonAtomOrder` is the one place that order is derived, so the consumers
 * agree with each other. The frontmatter keeps its authored order; this
 * reads it as a tiebreak.
 *
 * The rule: a stable topological sort of the intra-lesson `requires` edges,
 * prerequisite first, with the authored order as the tiebreak. The list is
 * walked as written and each atom is emitted once its in-lesson
 * prerequisites have been, those being emitted first, recursively, in their
 * own authored order — so a prerequisite listed late is pulled up to just
 * before the first atom that needs it, and nothing else moves. (Kahn's walk
 * would instead sink the dependent past every unconstrained atom listed
 * between them; the lesson's lead concept, which is what the author wrote
 * first, would end up last whenever it rests on the rest.) Edges to atoms
 * outside the lesson, unknown ids and self-links are ignored. A cycle — the
 * corpus has three mutual pairs — is one unit that sits where its
 * earliest-listed member sits and emits its members in authored order, so
 * a cycle neither blocks the atoms that wait on it nor lets an unrelated
 * atom leapfrog it; the only forward edges the derived order keeps are the
 * ones inside a cycle, which no order could remove.
 */

/** The parts of a lesson this module reads. */
export interface OrderableLesson {
  frontmatter: { atoms?: readonly string[] };
}

/** The parts of an atom this module reads, keyed by id. */
export type LinkedAtoms = ReadonlyMap<string, { links?: readonly Pick<Link, "id" | "relation">[] }>;

/** A `requires` edge between two atoms of the same lesson. */
export interface LessonRequires {
  /** The atom that declares the edge — the dependent. */
  from: string;
  /** The atom it requires — the prerequisite. */
  to: string;
}

/**
 * The lesson's atom ids as authored, with duplicates dropped. Unknown ids
 * are kept: they carry no edges, so they hold their place, and the page
 * renders a fallback link for them as it always has.
 */
function authoredIds(lesson: OrderableLesson): string[] {
  return [...new Set(lesson.frontmatter.atoms ?? [])];
}

/**
 * Every `requires` edge whose two ends are both in the lesson, dependent →
 * prerequisite, each directed edge once. A mutual pair yields two edges.
 */
export function intraLessonRequires(lesson: OrderableLesson, atoms: LinkedAtoms): LessonRequires[] {
  const ids = new Set(authoredIds(lesson));
  const seen = new Set<string>();
  const edges: LessonRequires[] = [];
  for (const from of ids) {
    for (const link of atoms.get(from)?.links ?? []) {
      if (link.relation !== "requires" || link.id === from || !ids.has(link.id)) continue;
      const key = `${from}>${link.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ from, to: link.id });
    }
  }
  return edges;
}

/** Every node reachable from `start` along `next`, not counting `start` unless it loops. */
function reachable(start: string, next: Map<string, Set<string>>): Set<string> {
  const seen = new Set<string>();
  const stack = [...(next.get(start) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const n of next.get(id) ?? []) stack.push(n);
  }
  return seen;
}

/**
 * The lesson's atom ids in dependency order: a permutation of the authored
 * list in which every prerequisite precedes the atom that requires it,
 * wherever the edges allow, with the authored order as the tiebreak.
 */
export function lessonAtomOrder(lesson: OrderableLesson, atoms: LinkedAtoms): string[] {
  const ids = authoredIds(lesson);
  const prerequisites = new Map<string, Set<string>>(ids.map((id) => [id, new Set<string>()]));
  for (const { from, to } of intraLessonRequires(lesson, atoms)) prerequisites.get(from)!.add(to);

  // Strongly connected components, each identified by its earliest-listed
  // member and holding its members in authored order. Lessons are a dozen
  // atoms at most, so the quadratic reachability test is nothing.
  const reach = new Map(ids.map((id) => [id, reachable(id, prerequisites)]));
  const unitOf = new Map<string, string>();
  const members = new Map<string, string[]>();
  for (const id of ids) {
    if (unitOf.has(id)) continue;
    const unit = [
      id,
      ...ids.filter((o) => o !== id && reach.get(id)!.has(o) && reach.get(o)!.has(id)),
    ];
    for (const m of unit) unitOf.set(m, id);
    members.set(id, unit);
  }

  // The condensation is a DAG, so a depth-first walk in authored order —
  // a unit's prerequisite units first, each in authored order — terminates
  // and emits every unit exactly once.
  const needs = new Map<string, string[]>([...members.keys()].map((u) => [u, []]));
  for (const unit of members.keys()) {
    const seen = new Set<string>();
    for (const member of members.get(unit)!) {
      for (const to of prerequisites.get(member)!) {
        const target = unitOf.get(to)!;
        if (target === unit || seen.has(target)) continue;
        seen.add(target);
        needs.get(unit)!.push(target);
      }
    }
    needs.get(unit)!.sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
  }
  const order: string[] = [];
  const emitted = new Set<string>();
  const visit = (unit: string) => {
    if (emitted.has(unit)) return;
    emitted.add(unit);
    for (const need of needs.get(unit)!) visit(need);
    order.push(...members.get(unit)!);
  };
  for (const unit of members.keys()) visit(unit);
  return order;
}

/** How many edges of `edges` point at an atom `order` lists later. */
function countForward(order: readonly string[], edges: readonly LessonRequires[]): number {
  const position = new Map(order.map((id, i) => [id, i]));
  return edges.filter(({ from, to }) => position.get(to)! > position.get(from)!).length;
}

/**
 * The lesson's forward `requires` edges — prerequisite listed after the
 * atom that needs it — under the authored order and under the derived one.
 * The derived count is the residual no permutation removes: one per cycle.
 */
export function forwardRequires(
  lesson: OrderableLesson,
  atoms: LinkedAtoms,
): { authored: number; derived: number } {
  const edges = intraLessonRequires(lesson, atoms);
  return {
    authored: countForward(authoredIds(lesson), edges),
    derived: countForward(lessonAtomOrder(lesson, atoms), edges),
  };
}
