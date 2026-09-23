import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadThreads } from "../content";
import { getGuideConcepts } from "../guide-concepts";
import {
  conceptPhrase,
  mentionCount,
  namedAtomIds,
  namedShare,
  namesConcept,
  NOT_DISCUSSED_LABEL,
} from "../named-concepts";

const APP = path.join(process.cwd(), ".next", "server", "app");
const built =
  fs.existsSync(path.join(APP, "threads")) && fs.existsSync(path.join(APP, "index.html"));

/**
 * What a page declares it is about and what its words say are two sets
 * (tracker entry 294, 2026-09-22). Guides declared 455 entry atoms and named
 * 256 by title in the body; lessons composed 183 and named 117. Every
 * derived surface read the declaration. The concept block and the
 * composed-from list now mark the unnamed ones, and the share per layer is
 * held here as a floor that may only rise: the fix is naming a concept in
 * the prose or dropping it from the declaration, never lowering the number.
 *
 * Corrected later the same day: a backticked id in a guide body renders as
 * the atom's title, linked, so it is the strongest form of naming and the
 * title-only match undercounted it. Counting backticks, guides name 370 of
 * 455 (81%); lessons never backtick and stay at 117 of 183. The guide floor
 * moved from 0.55 to 0.80 for that reason, not because any page changed.
 */
describe("namesConcept", () => {
  it("matches the title as a whole phrase in any case", () => {
    expect(namesConcept("Every scene starts with an Offer.", "offer")).toBe(true);
    expect(namesConcept("we talked about active listening here", "Active Listening")).toBe(true);
    expect(namesConcept("listening is active", "Active Listening")).toBe(false);
    // Whole phrase: a longer word that contains the title is not the title.
    expect(namesConcept("the offering was declined", "offer")).toBe(false);
    expect(namesConcept("counteroffer", "offer")).toBe(false);
    // Punctuation and line breaks around the phrase still count.
    expect(namesConcept("(status).", "Status")).toBe(true);
    expect(namesConcept("first\nactive\n  listening", "Active Listening")).toBe(true);
  });

  it("counts a backticked id as naming the atom, and counts mentions", () => {
    // The renderer turns `offers` into the title as a link, so a page that
    // backticks the id names the concept without ever typing the word.
    expect(namesConcept("start with `yes-and`", "Yes, And", "yes-and")).toBe(true);
    expect(namesConcept("start with `yes-and`", "Yes, And")).toBe(false);
    // The id has to be the whole backticked span: `accepting-the-offer` is a
    // different atom, not a mention of `offers`.
    expect(namesConcept("see `accepting-the-offer`", "Offers", "offers")).toBe(false);
    const text = "An offer. Another offer, and `offers` twice: `offers`";
    expect(mentionCount(text, "Offer", "offer")).toBe(2);
    expect(mentionCount(text, "Offers", "offers")).toBe(2);
    expect(mentionCount("nothing here", "Offers", "offers")).toBe(0);
    // Zero exactly when namesConcept is false, so the block's flag and its
    // order read one measure.
    for (const t of ["no", "one Offer", "`offer`", "Offer and `offer`"]) {
      expect(mentionCount(t, "Offer", "offer") > 0).toBe(namesConcept(t, "Offer", "offer"));
    }
  });

  it("drops a parenthetical from the title before matching", () => {
    expect(conceptPhrase("Beats (First / Second / Third)")).toBe("Beats");
    expect(conceptPhrase("Judgment (Mid-Scene Evaluation)")).toBe("Judgment");
    expect(conceptPhrase("Impro — Keith Johnstone (1979)")).toBe("Impro — Keith Johnstone");
    expect(namesConcept("the second beats land", "Beats (First / Second / Third)")).toBe(true);
    expect(namesConcept("she used judgment", "Judgment (Mid-Scene Evaluation)")).toBe(true);
    expect(namesConcept("first / second / third", "Beats (First / Second / Third)")).toBe(false);
    expect(namesConcept("anything", "")).toBe(false);
  });

  it("returns the ids the text names, by title or by backticked id", () => {
    const named = namedAtomIds("Say yes, and then heighten it, with `offers`.", [
      { id: "yes-and", title: "Yes, And" },
      { id: "heightening", title: "Heightening" },
      { id: "offers", title: "Offers" },
    ]);
    expect([...named]).toEqual(["yes-and", "offers"]);
  });
});

describe("named share per layer", () => {
  it("guides: 78 pages declaring 455, naming 370 on 2026-09-22; floor 0.80, rises only", async () => {
    const share = await namedShare("guides");
    // Guard the guard: the measure has to have seen the corpus.
    expect(share.pages.length).toBeGreaterThanOrEqual(70);
    expect(share.declared).toBeGreaterThanOrEqual(400);
    expect(share.named).toBeGreaterThan(0);
    // 256 of 455 (0.56) by title alone; 370 (0.81) once backticked ids
    // count, which they must — they render as the title. The floor sits
    // just under the corrected share.
    expect(share.share).toBeGreaterThanOrEqual(0.8);
    // By title alone one guide named none of its declared concepts
    // (public-speaking-tips); it backticks them, so with backticks counted
    // no guide does, and a first would be a regression.
    const namingNone = share.pages.filter((p) => p.declared > 0 && p.named === 0);
    expect(namingNone.map((p) => p.slug)).toEqual([]);
  });

  it("lessons: 25 pages composing 183, naming 117 on 2026-09-22; floor 0.63, rises only", async () => {
    const share = await namedShare("lessons");
    expect(share.pages.length).toBeGreaterThanOrEqual(20);
    expect(share.declared).toBeGreaterThanOrEqual(150);
    expect(share.named).toBeGreaterThan(0);
    expect(share.share).toBeGreaterThanOrEqual(0.63);
    expect(share.pages.filter((p) => p.declared > 0 && p.named === 0)).toEqual([]);
  });

  it("the guide block carries the flag the measure computed", async () => {
    const share = await namedShare("guides");
    const byPage = new Map(share.pages.map((p) => [p.slug, p]));
    let flagged = 0;
    let unflagged = 0;
    for (const [slug, page] of byPage) {
      const concepts = await getGuideConcepts(slug);
      const unnamed = new Set(page.unnamed);
      for (const c of concepts) {
        expect(c.named, `${slug} -> ${c.id}`).toBe(!unnamed.has(c.id));
        if (c.named) flagged += 1;
        else unflagged += 1;
      }
    }
    expect(flagged).toBe(share.named);
    expect(unflagged).toBe(share.declared - share.named);
  });
});

describe.runIf(built)("the built pages mark the concepts their words do not name", () => {
  const read = (...parts: string[]) => fs.readFileSync(path.join(APP, ...parts), "utf-8");
  const block = (html: string, track: string): string => {
    const start = html.indexOf(`data-track="${track}"`);
    expect(start, track).toBeGreaterThan(-1);
    return html.slice(start, html.indexOf("</nav>", start));
  };
  const count = (html: string, value: "true" | "false") =>
    (html.match(new RegExp(`data-named="${value}"`, "g")) ?? []).length;

  it("/how-to-be-funny: 11 declared, 9 named, 2 marked on 2026-09-22", () => {
    const nav = block(read("how-to-be-funny.html"), "guide-concepts");
    expect(count(nav, "false")).toBeGreaterThanOrEqual(1);
    expect(count(nav, "true")).toBeGreaterThanOrEqual(1);
    expect(nav).toContain(NOT_DISCUSSED_LABEL);
    // The marker sits only on the unnamed items.
    expect(nav.split(NOT_DISCUSSED_LABEL).length - 1).toBe(count(nav, "false"));
  });

  it("a lesson's composed-from list makes the same mark", async () => {
    const share = await namedShare("lessons");
    const page = share.pages.find((p) => p.unnamed.length > 0 && p.named > 0);
    expect(page).toBeDefined();
    const thread = (await loadThreads()).find((t) => t.frontmatter.id === page!.slug);
    expect(thread).toBeDefined();
    const nav = block(read("threads", `${page!.slug}.html`), "composed-from");
    expect(count(nav, "false")).toBe(page!.unnamed.length);
    expect(count(nav, "true")).toBe(page!.named);
    expect(nav.split(NOT_DISCUSSED_LABEL).length - 1).toBe(page!.unnamed.length);
  });
});
