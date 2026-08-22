import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";

/**
 * The question-list guides must not recycle each other's questions.
 *
 * Six of the highest-potential pages on the site are lists of questions, and
 * they had 36 near-duplicates between them — the same question reworded just
 * enough to survive every check the repo had. "What is something you want that
 * feels embarrassing to want?" against "What's something you want that feels
 * embarrassing to want?" is one string comparison away from identical and no
 * string comparison catches it.
 *
 * So the comparison is on content words with contractions expanded, which is
 * what makes a contraction stop being a disguise.
 */
const CONTRACTIONS: [RegExp, string][] = [
  [/\bwhat's\b/g, "what is"],
  [/\bthat's\b/g, "that is"],
  [/\bthere's\b/g, "there is"],
  [/\bwho's\b/g, "who is"],
  [/\bit's\b/g, "it is"],
  [/\byou're\b/g, "you are"],
  [/\bthey're\b/g, "they are"],
  [/\bwe're\b/g, "we are"],
  [/\bi'm\b/g, "i am"],
  [/\byou've\b/g, "you have"],
  [/\bi've\b/g, "i have"],
  [/\byou'd\b/g, "you would"],
  [/\bdon't\b/g, "do not"],
  [/\bdidn't\b/g, "did not"],
  [/\bdoesn't\b/g, "does not"],
  [/\bisn't\b/g, "is not"],
  [/\bcan't\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bhaven't\b/g, "have not"],
  [/\bwouldn't\b/g, "would not"],
  [/\bcouldn't\b/g, "could not"],
];

const STOP = new Set(
  (
    "a an the is are was were be been do does did you your yours my me i we our of to in on for " +
    "that this it its as at by with about from something someone some any what which who whom " +
    "whose how why when where would could should will can have has had if then than so and or " +
    "but not no more most one thing things ever never"
  ).split(" "),
);

function contentWords(question: string): Set<string> {
  let text = question.toLowerCase();
  for (const [pattern, expansion] of CONTRACTIONS) text = text.replace(pattern, expansion);
  return new Set(
    text
      .replace(/[^a-z ]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP.has(word)),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  const shared = [...a].filter((word) => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : shared / union;
}

/**
 * Pairs the measure cannot tell apart but a reader can. Each is a genuinely
 * different question that happens to survive stopword removal looking similar.
 */
const ALLOWED = [
  // What others misread about you, against what others are mistaken about.
  ["people get wrong about you", "most people are wrong about"],
  // The networking page asks within an industry; the friends page does not.
  ["changed your mind about in this industry", "changed your mind about"],
  // Being undecided about something, against returning to it.
  ["keep going back and forth on", "keep going back to"],
];

function isAllowed(a: string, b: string): boolean {
  const low = [a.toLowerCase(), b.toLowerCase()];
  return ALLOWED.some(([x, y]) => low.some((q) => q.includes(x)) && low.some((q) => q.includes(y)));
}

const THRESHOLD = 0.7;

describe("question lists", () => {
  it("do not repeat each other's questions", async () => {
    const bridges = await loadBridges();
    const questions: { slug: string; question: string; words: Set<string> }[] = [];

    for (const bridge of bridges) {
      for (const line of bridge.content.split("\n")) {
        // Two shapes carry a question: a plain list item ending in "?", and a
        // numbered item whose question is bolded with prose after it —
        // "1. **What has today been like?** Better than...". The second was
        // invisible here, and fifteen questions across two pages had been added
        // in that shape without ever being checked against anything.
        const trimmed = line.trim();
        const match =
          /^\s*(?:[-*]|\d+\.)\s+\*\*(.+?\?)\*\*/.exec(trimmed) ??
          /^\s*(?:[-*]|\d+\.)\s+(.*\?)\s*$/.exec(trimmed);
        if (!match) continue;
        const question = match[1].replace(/\*\*(.+?)\*\*/g, "$1").trim();
        const words = contentWords(question);
        if (words.size >= 2) questions.push({ slug: bridge.slug, question, words });
      }
    }

    // Guards against the extractor silently matching nothing, which would make
    // this pass on an empty set.
    expect(questions.length).toBeGreaterThan(400);

    const collisions: string[] = [];
    for (let i = 0; i < questions.length; i += 1) {
      for (let j = i + 1; j < questions.length; j += 1) {
        const a = questions[i];
        const b = questions[j];
        if (overlap(a.words, b.words) < THRESHOLD) continue;
        if (isAllowed(a.question, b.question)) continue;
        collisions.push(
          a.slug === b.slug
            ? `${a.slug} repeats itself: "${a.question}" / "${b.question}"`
            : `${a.slug} "${a.question}" duplicates ${b.slug} "${b.question}"`,
        );
      }
    }

    expect(collisions).toEqual([]);
  });
});
