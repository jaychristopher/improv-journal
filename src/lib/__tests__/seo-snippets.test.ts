import { describe, expect, it } from "vitest";

import {
  atomDescription,
  DESCRIPTION_MAX,
  extractDescription,
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

  it("ends on a complete sentence rather than a mid-word ellipsis", () => {
    const desc = atomDescription("Belief as Architecture", "law", extracted);
    expect(desc.endsWith("...")).toBe(false);
    expect(desc.trimEnd().endsWith(".")).toBe(true);
  });

  it("appends the type label only when it fits", () => {
    const short = "A short definition.";
    const desc = atomDescription("Yes And", "technique", short);
    expect(desc).toBe("A short definition. Yes And is an improv technique.");
    expect(desc.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
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
