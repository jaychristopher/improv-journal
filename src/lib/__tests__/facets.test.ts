import { describe, expect, it } from "vitest";

import { countFor, itemMatches, selectionsFor } from "../facets";

const GROUPS = [
  { tags: [{ tag: "beginner" }, { tag: "intermediate" }, { tag: "advanced" }] },
  { tags: [{ tag: "game" }, { tag: "ensemble" }] },
];

const ITEMS = [
  { id: "a", tags: ["beginner", "ensemble"] },
  { id: "b", tags: ["beginner", "game"] },
  { id: "c", tags: ["advanced", "game"] },
  { id: "d", tags: ["intermediate"] },
];

const apply = (active: string[]) => {
  const selections = selectionsFor(GROUPS, new Set(active));
  return selections.length === 0
    ? ITEMS
    : ITEMS.filter((item) => itemMatches(item.tags, selections));
};

/**
 * OR inside a group, AND across groups.
 *
 * The hubs ran one `some` over every active tag, so everything was OR: Beginner
 * on /practice/techniques returned 12 and Beginner plus Game returned 21. A
 * filter that widens when you add to it is not doing the job its name promises,
 * and the behaviour is easy to write by accident and hard to see by reading.
 */
describe("facet selection", () => {
  it("narrows when a second group is chosen", () => {
    expect(apply(["beginner"]).map((i) => i.id)).toEqual(["a", "b"]);
    // The detecting assertion. Under the old `some` this returned a, b and c —
    // more results than "beginner" alone.
    expect(apply(["beginner", "game"]).map((i) => i.id)).toEqual(["b"]);
  });

  it("widens when a second tag in the same group is chosen", () => {
    expect(apply(["beginner"]).length).toBe(2);
    expect(apply(["beginner", "advanced"]).map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("returns everything when nothing is chosen", () => {
    expect(apply([])).toHaveLength(ITEMS.length);
  });
});

/**
 * A tag's count answers "how many if I click this", not "how many exist".
 *
 * The chips showed a total across all items regardless of what was already
 * chosen, so "Game 2" sat beside an active Beginner that would yield one. Under
 * AND that gap matters: on the exercises hub 56% of level-and-area pairs have no
 * members, and an honest zero shown before the click is what keeps a correct
 * filter from feeling broken.
 */
describe("facet counts", () => {
  it("counts against the other groups, not its own", () => {
    const selections = selectionsFor(GROUPS, new Set(["beginner"]));
    // Group 0 is the only one with a selection, so it is index 0.
    // "game" lives in group 1, which has no selection — counted against beginner.
    expect(countFor(ITEMS, "game", selections, -1)).toBe(1);
    // Within the selected group, its own selection is ignored so siblings stay
    // comparable: advanced is counted as if beginner were not chosen.
    expect(countFor(ITEMS, "advanced", selections, 0)).toBe(1);
  });

  it("reports zero for a combination with no members", () => {
    const selections = selectionsFor(GROUPS, new Set(["intermediate"]));
    // Nothing is both intermediate and a game — the chip must say so up front.
    expect(countFor(ITEMS, "game", selections, -1)).toBe(0);
  });
});
