import { describe, expect, it } from "vitest";

import {
  atomDescription,
  DESCRIPTION_MAX,
  extractDescription,
  metaDescription,
  pageTitle,
  SITE_NAME,
  TITLE_MAX,
} from "../seo";

const BRAND = ` | ${SITE_NAME}`;

describe("pageTitle", () => {
  it("lets the brand template run when the result still fits", () => {
    const short = "Improv Glossary";
    expect(pageTitle(short)).toBe(short);
    expect(short.length + BRAND.length).toBeLessThanOrEqual(TITLE_MAX);
  });

  it("drops the brand suffix once it would push past truncation", () => {
    const long =
      "How to Make Small Talk: The Improv Method That Turns Any Conversation Into Connection";
    expect(pageTitle(long)).toEqual({ absolute: long });
  });

  it("never returns a templated title that exceeds the limit", () => {
    const titles = ["A", "Improv Glossary", "x".repeat(32), "x".repeat(33), "x".repeat(120)];
    for (const t of titles) {
      const result = pageTitle(t);
      if (typeof result === "string") {
        expect(result.length + BRAND.length).toBeLessThanOrEqual(TITLE_MAX);
      } else {
        expect(result.absolute).toBe(t);
      }
    }
  });
});

describe("atomDescription", () => {
  const extracted =
    "People defend their belief systems by default. Challenging a belief reads as an attack on the person holding it. That reflex shapes every disagreement you have ever had.";

  it("leads with the concept's own words, not the title", () => {
    const desc = atomDescription("Belief as Architecture", "law", extracted);
    expect(desc.startsWith("People defend")).toBe(true);
  });

  it("stays within the description budget", () => {
    const desc = atomDescription("Belief as Architecture", "law", extracted);
    expect(desc.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  /**
   * This asserted the right thing against the wrong character.
   *
   * metaDescription emits a single U+2026 when it has to trim, and this looked
   * for three full stops — so the check could never fire however badly a
   * snippet was cut. It also ran on one hand-written fixture whose sentences
   * happen to fit the budget, which is the other half of why it stayed green
   * while 50 real pages shipped descriptions ending "...while the scene
   * contin…" and "...rather than retreating i…".
   *
   * Both halves are fixed: the real character, and the real content, in the
   * page-level test below.
   */
  it("ends on a complete sentence rather than a mid-word ellipsis", () => {
    const desc = atomDescription("Belief as Architecture", "law", extracted);
    expect(desc.endsWith("…")).toBe(false);
    expect(desc.endsWith("...")).toBe(false);
    expect(desc.trimEnd().endsWith(".")).toBe(true);
  });

  /**
   * A long opening sentence with no stop inside the budget still has to be cut
   * somewhere. Cutting at a clause reads finished; cutting at whatever word
   * lands on the limit does not, and costs the same space to say less.
   */
  it("cuts a long lead at a clause rather than mid-phrase", () => {
    const long =
      "The capacity to sustain sensory contact with what is happening right now — with your partner, the environment, and yourself — rather than retreating into your own head.";

    // metaDescription, not atomDescription. The clause-cut lives here, and
    // atomDescription weighs this against its rules-built alternative and can
    // legitimately prefer the other one — which is what the first version of
    // this test hit, asserting on a string the clamp never produced.
    const desc = metaDescription(long, DESCRIPTION_MAX, 0.5);

    expect(desc.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(desc.endsWith("…")).toBe(false);
    // Stops after a whole clause and closes it, so a type label appended after
    // it does not run straight into the last word.
    expect(desc.endsWith("and yourself.")).toBe(true);
  });

  it("leaves the type out when the title already carries it", () => {
    // conceptTitle renders this as "Yes And — Improv Technique", which sits
    // directly above the description in a result. Saying it twice spent a
    // fifth of the snippet on words the reader can already see.
    const desc = atomDescription("Yes And", "technique", "A short definition.");
    expect(desc).toBe("A short definition.");
  });

  it("still names the type where nothing else would", () => {
    // Long enough that conceptTitle declines to qualify it, so the description
    // is the only place the reader learns what kind of thing this is.
    const long = "Framing as an Angle of Approach to a Difficult Conversation";
    const desc = atomDescription(long, "technique", "A short definition.");
    expect(desc).toBe(`A short definition. ${long} is an improv technique.`);
    expect(desc.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("does not restate a reference, which its citation already qualifies", () => {
    const desc = atomDescription("Bossypants — Tina Fey (2011)", "reference", "A short note.");
    expect(desc).toBe("A short note.");
  });

  it("prefers a game's rules over its list of what it trains", () => {
    const trains = "Deep attention, body awareness, ensemble connection.";
    const rules =
      "Two players face each other and move in unison with no agreed leader, slowly enough that an observer cannot tell who is initiating.";
    const desc = atomDescription("Mirroring", "exercise", trains, DESCRIPTION_MAX, rules);
    expect(desc.startsWith("Two players face each other")).toBe(true);
  });

  it("keeps the lead when fitting the rules would leave only a stub", () => {
    // Whole-sentence fitting cannot keep the second sentence here, and the
    // first alone says less than the lead does. This is the Freeze Tag case.
    const lead =
      "The most universal shortform improv game. Two performers begin a scene and play until somebody stops them.";
    const rules = `Two players start a scene. ${"and then something happens ".repeat(8)}`;
    const desc = atomDescription("Freeze Tag", "format", lead, DESCRIPTION_MAX, rules);
    expect(desc.startsWith("The most universal")).toBe(true);
  });

  it("falls back to the title and label when no sentence fits", () => {
    const unbroken = `${"word ".repeat(80)}`;
    const desc = atomDescription("Mirroring", "exercise", unbroken);
    expect(desc.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(desc.length).toBeGreaterThan(0);
  });
});

describe("extractDescription", () => {
  const atom = (body: string) => `---
id: x
---

# Heading

${body}
`;

  it("drops the clause a stripped label was the subject of", () => {
    const out = extractDescription(
      atom(
        "**Trains:** working under enough load that deliberation becomes impossible. " +
          "A rhythm game whose real function is to flood attention.",
      ),
    );
    expect(out).toBe("A rhythm game whose real function is to flood attention.");
  });

  it("keeps a label whose clause already starts a sentence", () => {
    const out = extractDescription(atom("**Trains:** Be Changeable — shifting state on input."));
    expect(out).toBe("Be Changeable — shifting state on input.");
  });

  it("capitalises rather than shipping a fragment when nothing follows", () => {
    expect(extractDescription(atom("**Trains:** giving up authorship"))).toBe(
      "Giving up authorship",
    );
  });

  it("never opens a snippet mid-sentence", () => {
    const cases = [
      "**Trains:** shared timing. Two people clap at the same instant.",
      "**Trains:** noticing how much of a conversation is deferral.",
      "A perfectly ordinary opening sentence.",
    ];
    for (const body of cases) {
      const out = extractDescription(atom(body));
      expect(out.length).toBeGreaterThan(0);
      expect(/^\p{Ll}/u.test(out)).toBe(false);
    }
  });

  it("clamps to a whole sentence rather than cutting mid-thought", () => {
    const long =
      "You cannot build shared reality alone. The system requires multiple agents. " +
      "No individual performer has enough bandwidth, perspective, or creative range to do it.";
    const out = extractDescription(atom(long), DESCRIPTION_MAX);
    expect(out.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    expect(out.endsWith("...")).toBe(false);
  });
});
