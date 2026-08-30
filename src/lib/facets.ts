/**
 * Faceted filtering: OR inside a group, AND across groups.
 *
 * The hubs ran a single `some` over every active tag, which made it OR
 * everywhere. Choosing Beginner on /practice/techniques gave 12 results and
 * then adding Game gave 21 — a filter that widens what it is asked to narrow.
 *
 * Extracted from the component rather than left inline because the semantics
 * are the kind that look right and are not. The counts beside each tag depend
 * on the same rules and were separately wrong, so both live here and are tested
 * together.
 */

export interface FacetGroup {
  tags: { tag: string }[];
}

/** The chosen tags per group, groups with no selection dropped. */
export function selectionsFor(groups: FacetGroup[], active: Set<string>): string[][] {
  return groups
    .map((group) => group.tags.map((t) => t.tag).filter((tag) => active.has(tag)))
    .filter((chosen) => chosen.length > 0);
}

/**
 * Whether an item satisfies every group's selection.
 *
 * `ignoreIndex` drops one group from the test, which is what the per-tag counts
 * need: the number beside "Game" should say how many results choosing it would
 * give alongside the other groups, not how many it gives alongside its own
 * siblings.
 */
export function itemMatches(tags: string[], selections: string[][], ignoreIndex = -1): boolean {
  return selections.every(
    (chosen, i) => i === ignoreIndex || chosen.some((tag) => tags.includes(tag)),
  );
}

/**
 * How many items a tag would yield if it were chosen now.
 *
 * Shown on the chip, and the reason a correct filter still feels usable: under
 * AND, 56% of the level-and-area pairs on the exercises hub have no members at
 * all. An honest zero, visible before the click, is what stops that being
 * discovered as an empty result page.
 */
export function countFor<T extends { tags: string[] }>(
  items: T[],
  tag: string,
  selections: string[][],
  groupIndex: number,
): number {
  return items.filter(
    (item) => item.tags.includes(tag) && itemMatches(item.tags, selections, groupIndex),
  ).length;
}
