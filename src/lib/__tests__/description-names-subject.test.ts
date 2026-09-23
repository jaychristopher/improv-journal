import { describe, expect, it } from "vitest";

import { loadAtoms } from "../content";
import { atomPageDescription } from "../seo";

/**
 * A derived description names the thing it describes.
 *
 * 184 of 205 atoms have no hand-written `description`, so their search snippet
 * is their opening sentence (tracker entry 146). That sentence is doing two
 * jobs — introducing the page and standing for it in a result — and nothing
 * checked whether it does the second: whether a searcher who reads only the
 * snippet is told what the page is about. `description-endings` guards how a
 * snippet stops; this guards what it says.
 *
 * The matching rule, decided here rather than in content.ts so the site's own
 * derivation is what is measured:
 *
 * - The names are the atom's title and its aliases. Each is also split into
 *   segments on " — ", ": " and " (", so "Recovery: Decay" offers "Recovery"
 *   and "Decay", and "Impro — Keith Johnstone (1979)" offers "Impro" without
 *   requiring the author and the year to appear in the snippet.
 * - A name matches when every content word of any one segment is present in
 *   the snippet. Words are compared case-insensitively on their letters only,
 *   so a hyphen is a word break and "One-Word Story" is the three words
 *   "one", "word", "story". Stop words ("the", "of", "be", …) do not count.
 * - Presence allows a stem: two words match when they share a prefix at
 *   least as long as the shorter word less two, and at least four characters
 *   or the whole of the shorter word. So "Continuous Signaling" is named by
 *   "You signal continuously", "Recovery" by "recover", "Offers" by "an offer",
 *   "Tag-out" by "tag-outs" — and "Be Brave" is not named by "Act before you're
 *   ready", because nothing there begins with "brav".
 *
 * Measured 2026-09-22, after the plain lead label ("Recovery: ") was added to
 * the stripper: 117 of 184 derived atoms name their subject, 63.6%. The floor
 * sits just under that; it is not to be raised to make a failure go away, and
 * the way up is editing the opening sentences, not this rule. The 67 in debt,
 * for whoever takes them — 21 are references, whose title is a citation the
 * opening sentence deliberately does not repeat, and 8 are the principles,
 * whose imperative openings ("Act before you're ready") never say "Be Brave":
 *
 *   alphabet-game, audience-relationship, be-brave, be-changeable, be-honest,
 *   be-present, be-supportive, be-thankful, beyond-the-stage, blind-line,
 *   blind-offer, blocking-taxonomy, character-through-game,
 *   cognitive-bandwidth, connections, deconstruction, directed-scene,
 *   emotion-switch, emotional-honesty-scene, fracture-repair-drill,
 *   framing-as-angle-of-approach, game-types, genre-format, gift-giving,
 *   gorilla-theatre, group-mind-cultivation, harold, last-word-response,
 *   let-yourself-be-changed, mirroring, monoscene, no-backspace-scene,
 *   organic-longform, organic-opening-exercise, questions-only,
 *   ref-attention-and-effort-kahneman, ref-carrane-improv-nerd,
 *   ref-cowan-magical-number-four, ref-edmondson-psychological-safety,
 *   ref-fey-bossypants, ref-hines-greatest-improviser,
 *   ref-impro-storytellers-johnstone, ref-limb-braun-jazz-improvisation,
 *   ref-napier-improvise, ref-sawyer-group-genius, ref-sweller-cognitive-load,
 *   ref-tj-dave-speed-of-life, ref-truth-in-comedy, ref-ucb-manual,
 *   ref-viewpoints-bogart-landau, ref-wickens-multiple-resources,
 *   rigid-core-malleable-edge, scene-structure, scenes-from-a-hat,
 *   shared-reality-fragility, show-dynamic, space-work-scene, status-dynamics,
 *   status-transfer, story-spine, story-story-die, superheroes, the-machine,
 *   two-headed-expert, two-person-longform, what-are-you-doing, yes-and-chain
 */
const NAMING_FLOOR = 116;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "in",
  "to",
  "on",
  "for",
  "is",
  "or",
  "with",
  "your",
  "be",
  "as",
  "at",
  "by",
  "from",
  "vs",
]);

function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’']/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

function sameStem(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = Math.min(a.length, b.length);
  const needed = Math.max(Math.min(shorter, 4), shorter - 2);
  let shared = 0;
  while (shared < shorter && a[shared] === b[shared]) shared += 1;
  return shared >= needed;
}

/** The whole name first, so the fullest match is the one reported. */
function segments(name: string): string[] {
  const parts = name.split(/\s+—\s+|:\s+|\s+\(/).map((segment) => segment.replace(/\)$/, ""));
  return [...new Set([name, ...parts])];
}

/** The segment of a title or alias the snippet names, or undefined. */
function namedSubject(names: string[], snippet: string): string | undefined {
  const present = contentWords(snippet);
  for (const name of names) {
    for (const segment of segments(name)) {
      const words = contentWords(segment);
      if (words.length === 0) continue;
      if (words.every((word) => present.some((candidate) => sameStem(word, candidate)))) {
        return segment;
      }
    }
  }
  return undefined;
}

describe("derived atom descriptions", () => {
  it("name the atom's title or an alias", async () => {
    const atoms = await loadAtoms();
    const derived = atoms.filter((a) => !a.frontmatter.description?.trim());
    // Guard the guard: a loader that returned nothing, or a corpus that had
    // grown a hand-written description on every page, would otherwise let a
    // floor of zero failures pass on zero pages.
    expect(derived.length).toBeGreaterThanOrEqual(180);

    const unnamed: string[] = [];
    for (const atom of derived) {
      const snippet = atomPageDescription(atom);
      const names = [atom.frontmatter.title, ...(atom.frontmatter.aliases ?? [])];
      if (!namedSubject(names, snippet)) {
        unnamed.push(`${atom.frontmatter.id} ("${atom.frontmatter.title}"): ${snippet}`);
      }
    }

    const named = derived.length - unnamed.length;
    expect(
      named,
      `${named} of ${derived.length} derived descriptions name their subject; ` +
        `the floor is ${NAMING_FLOOR}. Unnamed:\n  ${unnamed.join("\n  ")}`,
    ).toBeGreaterThanOrEqual(NAMING_FLOOR);
  });

  it("apply the documented matching rule", () => {
    // Stemmed presence, and the ceiling on how far a stem may drift.
    expect(namedSubject(["Continuous Signaling"], "You signal continuously.")).toBe(
      "Continuous Signaling",
    );
    expect(
      namedSubject(["Recovery: Decay"], "Decay is how to recover when the scene has gone thin."),
    ).toBe("Recovery: Decay");
    expect(namedSubject(["Recovery: Decay"], "How to recover a scene that has gone thin.")).toBe(
      "Recovery",
    );
    expect(namedSubject(["Be Brave"], "Act before you're ready.")).toBeUndefined();

    // Hyphens are word breaks; short words need the whole of themselves.
    expect(namedSubject(["Tag Run", "Tag-out"], "A rapid sequence of tag-outs.")).toBe("Tag-out");
    expect(namedSubject(["One-Word Story"], "A circle tells one story, one word per person.")).toBe(
      "One-Word Story",
    );

    // A citation title offers its work as a segment without author or year.
    expect(
      namedSubject(["Impro — Keith Johnstone (1979)"], "The book modern improv is downstream of."),
    ).toBe("Impro");
    // …but a segment has to be wholly present: "Attention and Effort" is not
    // named by a sentence that says only "attention".
    expect(
      namedSubject(
        ["Attention and Effort — Daniel Kahneman (1973)"],
        "The capacity model of attention.",
      ),
    ).toBeUndefined();
  });
});
