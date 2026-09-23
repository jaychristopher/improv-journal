import { SIDEBAR_VISIBLE } from "@/components/SidebarLinkGroup";

/**
 * Which of a concept page's sidebar groups open without a click.
 *
 * Until 2026-09-22 the connections column opened its first three outbound
 * groups in relation order and its first inbound group, and folded the rest
 * behind one "N more groups" fold each. That budget kept the column under
 * `sidebar-load`'s ceiling, and it cost the graph's centre the most: with
 * every relation present, `active-listening` opened 18 of 96 sidebar slots,
 * `commitment` 25 of 105, and the antipatterns and principles — the atoms
 * with the most inbound groups — opened a median 44% and 50% against the
 * references' and formats' 97–100% (tracker entry 272). The rich club was,
 * for a reader, the least visible part of the graph.
 *
 * The budget is now per atom and spent by size. Every group, outbound and
 * inbound pooled, is ranked by how many members it has; the largest open
 * first, and the column stops opening at the first group that would push the
 * links shown past SIDEBAR_OPEN_BUDGET. A group costs what it puts outside
 * a fold — SIDEBAR_VISIBLE at most, because SidebarLinkGroup folds the rest
 * — so a leaf with four groups of two opens all of them and a hub with six
 * groups over five opens its four biggest. Pooling beats a per-column split
 * (83% of slots open against 77% for the best split measured), and because
 * the first group of each column always fits, no column is ever wholly
 * folded. The ceiling `sidebar-load` asserts on the built page is unchanged.
 */

/**
 * Links the connections and inbound blocks may show outside a fold, together.
 * Four groups at SIDEBAR_VISIBLE each — what the old rule (three outbound
 * groups and one inbound) showed at most, so the column's worst case is what
 * it was and the budget is redistributed, not raised.
 */
export const SIDEBAR_OPEN_BUDGET = 4 * SIDEBAR_VISIBLE;

/** Names a closed group's summary carries before the ellipsis. */
export const FOLD_SUMMARY_NAMES = 3;

export interface BudgetGroup {
  key: string;
  /** Members before any cap: the count the reader is told. */
  size: number;
  /**
   * What the ranking weighs when it is not the size: a group the page wants
   * open ahead of larger ones. The cost is still the size's — the weight
   * changes the order, never the budget.
   */
  weight?: number;
}

/** What an open group spends: its links outside SidebarLinkGroup's fold. */
export function openCost(size: number): number {
  return Math.min(size, SIDEBAR_VISIBLE);
}

/**
 * The keys of the groups that open. Largest first (a group's `weight` stands
 * in for its size where one is set); ties keep the caller's order, so with
 * equal sizes an outbound group beats an inbound one and `requires` beats
 * `illustrates`, as the column lists them. Stops at the first group that
 * would breach the budget rather than skipping it for a smaller one behind,
 * so the reading order of "what opened" is the size order and nothing else.
 */
export function chooseOpenGroups(
  groups: readonly BudgetGroup[],
  budget: number = SIDEBAR_OPEN_BUDGET,
): Set<string> {
  const rank = (g: BudgetGroup) => g.weight ?? g.size;
  const ranked = groups
    .map((group, index) => ({ group, index }))
    .sort((a, b) => rank(b.group) - rank(a.group) || a.index - b.index);
  const open = new Set<string>();
  let spent = 0;
  for (const { group } of ranked) {
    const cost = openCost(group.size);
    if (spent + cost > budget) break;
    open.add(group.key);
    spent += cost;
  }
  return open;
}

/** The key an outbound relation group carries in the pooled ranking. */
export function outboundKey(relation: string): string {
  return `out:${relation}`;
}

/** The key an inbound group carries in the pooled ranking. */
export function inboundKey(key: string): string {
  return `in:${key}`;
}

/**
 * A closed group's summary: its label, its count and its first names, so a
 * fold is a sentence and not a label — "Required by 26: Yes, And; Commitment;
 * Offers …". Semicolons, because titles carry commas ("Yes, And").
 */
export function foldSummary(label: string, count: number, names: readonly string[]): string {
  const shown = names.slice(0, FOLD_SUMMARY_NAMES);
  const tail = count > shown.length ? " …" : "";
  return `${label} ${count}: ${shown.join("; ")}${tail}`;
}

/**
 * The outbound relation whose group a page in no lesson opens first: its
 * "Unlocks" group, the graph's one forward pointer. The 119 pages a lesson
 * composes get the lesson's next atom; the 68 that none does have only the
 * graph to say what comes after, and the size-ranked budget folded that
 * group behind the page's prerequisites and drills on the pages where it
 * mattered most (tracker entry 292, 2026-09-22).
 */
export const FORWARD_RELATION = "enables";

/**
 * The pooled list the column ranks: its outbound relation groups in display
 * order, then its inbound groups in theirs. An inbound group's size is what
 * it has before INBOUND_GROUP_LIMIT cuts it — the count the summary states,
 * and the neighbourhood the rank is meant to weigh.
 *
 * With `forward` set — the page sits in no lesson — the FORWARD_RELATION
 * group is weighted by the largest group's size on top of its own, so it
 * ranks first and opens whenever it exists. The weight is not a cost: the
 * group still spends what its size costs, so SIDEBAR_OPEN_BUDGET holds and
 * the column's ceiling in `sidebar-load` is untouched. Measured over the 205
 * atoms on 2026-09-22: the group was already open on every page in no lesson
 * that has one, so the weight changes what opens on none of them today and
 * is a guarantee for the pages content growth adds — see
 * whats-next-direction.test.ts.
 */
export function sidebarBudgetGroups(
  outbound: readonly { relation: string; size: number }[],
  inbound: readonly { key: string; links: readonly unknown[]; omitted: number }[],
  { forward = false }: { forward?: boolean } = {},
): BudgetGroup[] {
  const groups: BudgetGroup[] = [
    ...outbound.map((g) => ({ key: outboundKey(g.relation), size: g.size })),
    ...inbound.map((g) => ({ key: inboundKey(g.key), size: g.links.length + g.omitted })),
  ];
  if (forward) {
    const largest = Math.max(0, ...groups.map((g) => g.size));
    for (const g of groups) {
      if (g.key === outboundKey(FORWARD_RELATION)) g.weight = g.size + largest;
    }
  }
  return groups;
}
