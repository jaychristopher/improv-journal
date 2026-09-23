import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { HOMEPAGE_SYMPTOMS } from "../homepage-symptoms";

/** Function words, so a shared "you" or "the" does not count as a paraphrase. */
const STOP = new Set(
  (
    "a an and are as at be because been but by for from get gets go has have i in into is it " +
    "its keeps me of on or so than that the them then there they this to you your instead making"
  ).split(" "),
);
const contentWords = (text: string): Set<string> =>
  new Set(
    text
      .toLowerCase()
      .replace(/[^a-z\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w)),
  );

/**
 * The homepage quiz's symptoms and the guides' problem sentences agree.
 *
 * The site has two hand-written statements of what a reader is struggling
 * with: the five symptoms the homepage quiz offers ("I freeze and overthink",
 * each with a one-line description) and the 39 `primary_problem` sentences
 * on the guides ("you freeze because your attention collapses into
 * planning"). The quiz routes each symptom to a guide by a hand map, and
 * nothing checked that the guide it lands on has a problem sentence at all,
 * or that the two describe the same thing (novel-insights 291, third
 * bullet; entries 57 and 59 on the map). This is that reading. It does not
 * derive one from the other, and it changes neither the quiz's copy nor its
 * routing; it records the relationship so the author sees a drift.
 *
 * Measured 2026-09-22: all five destinations carry a `primary_problem`, and
 * four of the five symptoms share a content word with it — "freeze,
 * attention, planning"; "receiving"; "self-monitoring, louder, connection";
 * "fear, hesitate, first, move". The miss is `forcing-funny` → /how-to-be-funny:
 * "Reaching for cleverness is flattening the scene" against "trying to be
 * clever is making the moment feel forced" share a stem (clever) and no
 * word. That is the debt for the author: either sentence could be brought
 * to the other's vocabulary. The floor is four so it is the named miss that
 * is tolerated, not a second one.
 */
describe("homepage quiz symptoms and guide problems", () => {
  it("routes every symptom to a guide that states its problem", async () => {
    expect(HOMEPAGE_SYMPTOMS.length).toBeGreaterThanOrEqual(5);
    const bridges = await loadBridges();
    const bySlug = new Map(bridges.map((b) => [b.slug, b]));

    const withoutProblem: string[] = [];
    const withoutSharedWord: string[] = [];
    for (const symptom of HOMEPAGE_SYMPTOMS) {
      const guide = bySlug.get(symptom.bridgeSlug);
      expect(guide, `${symptom.id} routes to /${symptom.bridgeSlug}`).toBeTruthy();
      const problem = guide!.frontmatter.primary_problem;
      if (!problem) {
        withoutProblem.push(`${symptom.id} → /${symptom.bridgeSlug}`);
        continue;
      }
      const theirs = contentWords(problem);
      const shared = [...contentWords(`${symptom.label} ${symptom.description}`)].filter((w) =>
        theirs.has(w),
      );
      if (shared.length === 0) withoutSharedWord.push(`${symptom.id} → /${symptom.bridgeSlug}`);
    }

    expect(withoutProblem).toEqual([]);
    // Four of five paraphrase; forcing-funny is the recorded miss.
    expect(
      HOMEPAGE_SYMPTOMS.length - withoutSharedWord.length,
      withoutSharedWord.join("\n"),
    ).toBeGreaterThanOrEqual(4);
  });
});
