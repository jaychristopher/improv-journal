import { describe, expect, it } from "vitest";

import {
  anchorKeyword,
  anchorLabel,
  normaliseText as normalise,
  pageSpelling,
} from "../anchor-text";
import { loadBridges } from "../content";
import type { BridgeTargetKeyword } from "../schema";
import { getTopGuides } from "../top-guides";

function pageOf(bridge: { frontmatter: { title: string }; content: string }): string {
  return normalise(`${bridge.frontmatter.title}\n${bridge.content}`);
}

describe("anchor text", () => {
  /**
   * The site-wide anchor for a guide is the one string every other page uses
   * to describe it, and the rule that chose it read only the keyword table.
   * The table is not required to match the page, so seven guides were linked
   * from every page under a phrase they never contain: "20 questions game"
   * (12,000 a month) for a page that only ever says "21"; "relationship
   * questions" for questions-for-couples; "how to be a better listener" for a
   * guide about being a good one. The rule now prefers, among the same-topic
   * keywords, the highest-volume one the page actually says.
   *
   * Every guide, not a sample: a guide added with a keyword table that
   * outruns its prose would otherwise start the drift again. At 2026-09-21
   * this held for all 78 with no exceptions, so there is no floor to record.
   */
  it("labels every guide with a phrase its title or body contains", async () => {
    const bridges = await loadBridges();
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const absent: string[] = [];
    let labelled = 0;
    for (const bridge of bridges) {
      const keywords = bridge.frontmatter.target_keywords ?? [];
      const label = anchorLabel(
        keywords,
        bridge.frontmatter.subject,
        `${bridge.frontmatter.title}\n${bridge.content}`,
      );
      if (!label) continue;
      labelled += 1;
      if (!pageOf(bridge).includes(normalise(label))) {
        absent.push(`${bridge.slug}: "${label}"`);
      }
    }

    // A selector that stopped finding keywords would pass on nothing.
    expect(labelled).toBeGreaterThanOrEqual(70);
    expect(absent).toEqual([]);
  });

  /**
   * The footer has two labels for a promoted guide since tracker entry 287
   * (2026-09-22): the keyword on most pages and the guide's own title on the
   * concept pages (`footerLabelsByTitle` in Footer.tsx). The guarantee above
   * is about the keyword form, which is chosen from a table the page need not
   * match; the title form satisfies it by construction, being the first line
   * of the very text the rule reads. Both forms are checked here so a title
   * that stopped being the frontmatter title — a rewrite in top-guides, say,
   * that trimmed it for the column — would be seen as the anchor change it is.
   */
  it("carries that guarantee through to the footer's promoted guides, in both forms", async () => {
    const bySlug = new Map((await loadBridges()).map((b) => [b.slug, b]));
    const guides = await getTopGuides();
    expect(guides.length).toBeGreaterThanOrEqual(8);

    for (const guide of guides) {
      const bridge = bySlug.get(guide.slug)!;
      expect(pageOf(bridge), `${guide.slug} labelled "${guide.label}"`).toContain(
        normalise(guide.label),
      );
      expect(guide.title, guide.slug).toBe(bridge.frontmatter.title);
      expect(pageOf(bridge), `${guide.slug} titled "${guide.title}"`).toContain(
        normalise(guide.title),
      );
      // Two forms, not one twice: a title that normalises to the keyword would
      // leave the footer's alternation with nothing to alternate between.
      expect(normalise(guide.title), guide.slug).not.toBe(normalise(guide.label));
    }
  });

  /**
   * The keyword volumes are American-majority and the titles lean British,
   * so the highest-volume keyword can be the page's own words in the other
   * dialect: /theatre-games, "Theatre Games: What They Are and How to Run
   * Them", was "Theater games" in the footer of every page including its
   * own (tracker entry 279). The label keeps the keyword's words and takes
   * the title's spelling of any word the two spell differently. On
   * 2026-09-22 this changed exactly one label sitewide.
   */
  describe("page spelling", () => {
    it("re-spells a keyword word the title spells the other way", () => {
      expect(pageSpelling("theater games", "Theatre Games: What They Are")).toBe("theatre games");
      expect(pageSpelling("theatre games", "Theater Games for Kids")).toBe("theater games");
      expect(pageSpelling("behavior change", "Changing Behaviour")).toBe("behaviour change");
    });

    it("leaves a word the title spells the keyword's way, or not at all", () => {
      expect(pageSpelling("theater games", "Theater Games")).toBe("theater games");
      expect(pageSpelling("theater games", "Viola Spolin: the woman who invented them")).toBe(
        "theater games",
      );
      // Both spellings in the title: the keyword's own is present, so it stays.
      expect(pageSpelling("theater games", "Theatre or theater games")).toBe("theater games");
    });

    it("only ever swaps whole words, one at a time, keeping case", () => {
      expect(pageSpelling("Theater games for kids", "Theatre Games")).toBe(
        "Theatre games for kids",
      );
      // "theatresports" is not "theatre".
      expect(pageSpelling("theater games", "Theatresports")).toBe("theater games");
      // The bare practise/practice pair is not a pair here: "practice" is British too.
      expect(pageSpelling("improv practice", "How to Practise Improv")).toBe("improv practice");
    });

    it("reaches the label through anchorLabel, from the first line of the page text", () => {
      const keywords: BridgeTargetKeyword[] = [
        { keyword: "theatre games", volume: 1400, parent: "theater games" },
        { keyword: "theater games", volume: 1900, parent: "theater games" },
      ];
      const page = "Theatre Games: What They Are\n\nTheater games and theatre games alike.";
      expect(anchorKeyword(keywords, page)?.keyword).toBe("theater games");
      expect(anchorLabel(keywords, undefined, page)).toBe("Theatre games");
      // Without page text there is no title to defer to.
      expect(anchorLabel(keywords)).toBe("Theater games");
    });

    it("changed the one footer label the entry named, and no other", async () => {
      const bridges = await loadBridges();
      const changed: string[] = [];
      for (const bridge of bridges) {
        const keywords = bridge.frontmatter.target_keywords ?? [];
        const subject = bridge.frontmatter.subject;
        const spelled = anchorLabel(
          keywords,
          subject,
          `${bridge.frontmatter.title}\n${bridge.content}`,
        );
        // The same label with the title line blank: the rule cannot fire.
        const declared = anchorLabel(keywords, subject, `\n${bridge.content}`);
        if (spelled !== declared) changed.push(`${bridge.slug}: ${declared} -> ${spelled}`);
      }
      expect(changed).toEqual(["theatre-games: Theater games -> Theatre games"]);
    });
  });

  describe("anchorKeyword", () => {
    const keywords: BridgeTargetKeyword[] = [
      { keyword: "21 questions game", volume: 5000, parent: "21 questions" },
      { keyword: "20 questions game", volume: 12000, parent: "21 questions" },
      { keyword: "questions game", volume: 8000, parent: "21 questions" },
      { keyword: "party games", volume: 50000, parent: "party games" },
    ];

    it("keeps the highest-volume same-topic keyword when no page text is given", () => {
      expect(anchorKeyword(keywords)?.keyword).toBe("20 questions game");
    });

    it("prefers the highest-volume same-topic keyword the page says", () => {
      const page = "# 21 Questions Game\n\nA questions game for two people.";
      expect(anchorKeyword(keywords, page)?.keyword).toBe("questions game");
    });

    it("matches across case, line breaks, hyphens and markdown emphasis", () => {
      const page = "the **20\nQuestions**-game is the older form";
      expect(anchorKeyword(keywords, page)?.keyword).toBe("20 questions game");
    });

    it("does not find a phrase inside a longer word", () => {
      const improv: BridgeTargetKeyword[] = [
        { keyword: "improv", volume: 100, parent: "improv" },
        { keyword: "improv games", volume: 500, parent: "improv" },
      ];
      expect(anchorKeyword(improv, "improvisation and improv gamesmanship")?.keyword).toBe(
        "improv",
      );
    });

    it("never picks a keyword from another topic, present or not", () => {
      expect(anchorKeyword(keywords, "party games all night")?.keyword).toBe("21 questions game");
    });

    it("falls back to the primary when the page says none of them", () => {
      expect(anchorKeyword(keywords, "nothing relevant here")?.keyword).toBe("21 questions game");
    });

    it("returns undefined when a guide declares no keywords", () => {
      expect(anchorKeyword([], "any text")).toBeUndefined();
      expect(anchorLabel([], undefined, "any text")).toBeUndefined();
    });
  });
});
