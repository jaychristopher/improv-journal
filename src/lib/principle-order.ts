/**
 * The one order the principles are published in.
 *
 * `/how-it-works/principles` draws a dependency diagram — be present as the
 * precondition, the ones that build on it, be simple as the corrective, framing
 * apart — and its prose walks the same order. The cards above the diagram were
 * `loadAtoms().filter(type === "principle")`, which is directory order, so the
 * list put the precondition fifth beneath a caption calling that "the least
 * useful way to use them" (tracker entry 74, 2026-09-21). This is the order
 * the page's own text gives, read off "How the Nine Fit Together".
 *
 * Until the same day the detail pages walked a second, hand-written teaching
 * order beginning at be-positive, and the Improv Lab's "Principles" season
 * and its feed replayed a third — the alphabet, because the loader sorts by
 * filename and the season never sorted (entry 207). A reader who took the
 * hub's advice, opened be-present and pressed "Next principle" was sent to
 * the pager's third rather than the hub's second. The hub, the pager and the
 * season now all read this module, and `principle-order.test.ts` holds the
 * three to it.
 *
 * A principle not named here (the next one written) is appended after the
 * eight it builds on and before framing, alphabetically, so it is reachable
 * and no surface can silently drop it.
 */
export const PRINCIPLE_DEPENDENCY_ORDER: readonly string[] = [
  "be-present",
  "be-changeable",
  "be-honest",
  "be-brave",
  "be-supportive",
  "be-thankful",
  "be-simple",
  "be-positive",
  "framing-as-angle-of-approach",
];

/** The id that "sits slightly apart from the eight", kept last whatever else is added. */
const APART = "framing-as-angle-of-approach";

export function sortPrinciples<T extends { frontmatter: { id: string } }>(principles: T[]): T[] {
  const rank = (id: string): number => {
    const i = PRINCIPLE_DEPENDENCY_ORDER.indexOf(id);
    if (i >= 0) return id === APART ? Number.MAX_SAFE_INTEGER : i;
    return PRINCIPLE_DEPENDENCY_ORDER.length;
  };
  return [...principles].sort((a, b) => {
    const diff = rank(a.frontmatter.id) - rank(b.frontmatter.id);
    return diff !== 0 ? diff : a.frontmatter.id.localeCompare(b.frontmatter.id);
  });
}

/**
 * The principle ids in published order, from whatever atoms are passed —
 * the sequence the detail pages' next/previous loop walks. Non-principles
 * are ignored so a caller can hand over the whole corpus.
 */
export function principleSequence<T extends { frontmatter: { id: string; type: string } }>(
  atoms: T[],
): string[] {
  return sortPrinciples(atoms.filter((a) => a.frontmatter.type === "principle")).map(
    (a) => a.frontmatter.id,
  );
}
