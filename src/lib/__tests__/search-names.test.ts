import fs from "node:fs";
import path from "node:path";

import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";

import { getAtomUrl, loadAtoms, loadBridges } from "../content";
import { ALL_HUBS, HUBS } from "../hubs";
import { MINISEARCH_OPTIONS } from "../search-index";

const ROOT = process.cwd();
const INDEX = path.join(ROOT, "public", "search-index.json");

/** The serialized index: enough of its shape to read a term's postings. */
interface SerializedIndex {
  fieldIds: Record<string, number>;
  storedFields: Record<string, { url: string }>;
  index: [term: string, postings: Record<string, Record<string, number>>][];
}

function loadIndex() {
  const json = fs.readFileSync(INDEX, "utf-8");
  return {
    ms: MiniSearch.loadJSON(json, MINISEARCH_OPTIONS),
    raw: JSON.parse(json) as SerializedIndex,
  };
}

function urls(ms: MiniSearch, query: string): string[] {
  return ms.search(query, MINISEARCH_OPTIONS.searchOptions).map((r) => r.url as string);
}

/** One-based rank of `url` for `query`, or Infinity when absent. */
function rankOf(ms: MiniSearch, query: string, url: string): number {
  const i = urls(ms, query).indexOf(url);
  return i < 0 ? Infinity : i + 1;
}

/** The urls whose `field` holds `term`, read from the postings rather than searched. */
function holders(raw: SerializedIndex, field: string, term: string): string[] {
  const fieldId = raw.fieldIds[field];
  const postings = raw.index.find(([t]) => t === term)?.[1]?.[fieldId] ?? {};
  return Object.keys(postings).map((docId) => raw.storedFields[docId].url);
}

/**
 * The hubs are findable by every name a reader has learned for them.
 *
 * Entry 264 gave four hubs one name across the nav, the footer, the
 * breadcrumb and the H1, and the search box was the fifth surface, where a
 * rename is a deletion: the route pages were indexed by title and
 * description, so "library" returned three results and not the Reading
 * List, "essays" one book and not the Lessons hub, "vocabulary" put the
 * Glossary third; and the audience hub for teachers, titled "Learning to
 * Teach", was absent from the 21 results for "teacher" (tracker entry 312,
 * 2026-09-22). The concept layer, whose titles never changed, answered its
 * own titles first 202 times of 205.
 *
 * Now hubs.ts carries `formerNames`, route-pages.mjs declares a plain
 * handle for the pages whose title cannot say the word, and both — with
 * the nav label and the breadcrumb — go into each route page's `aliases`,
 * the boosted field the concepts already had. Measured after the change:
 * library, essays and vocabulary first; teacher second; podcast first
 * where a book about a podcast had been; beginner third from seventh,
 * performer third from forty-seventh.
 *
 * These read the built index through the loader's options, as the browser
 * does, so a builder that stops writing the aliases fails here rather than
 * in the search box.
 */
describe("site search finds the hubs by their names", () => {
  it("declares former names only for the renamed hubs, and none that is a current name", () => {
    const renamed = ALL_HUBS.filter((h) => h.formerNames?.length);
    // Threads, library and glossary were the three entry 264 renamed.
    expect(renamed.length).toBeGreaterThanOrEqual(3);
    expect(renamed.map((h) => h.href).sort()).toEqual(
      [HUBS.threads.href, HUBS.library.href, HUBS.glossary.href].sort(),
    );
    for (const hub of renamed) {
      for (const name of hub.formerNames!) {
        expect(name.trim(), `${hub.href} has an empty former name`).toBeTruthy();
        // A former name that is still the current name is a duplicate, not history.
        expect([hub.label, hub.crumb, hub.h1], `${hub.href} "${name}"`).not.toContain(name);
      }
    }
  });

  it("writes each hub's former names and handles into the index as aliases", () => {
    const { raw } = loadIndex();
    expect(raw.fieldIds).toHaveProperty("aliases");
    // A rebuilt index that dropped the postings would otherwise be read as
    // an index that never had them.
    expect(raw.index.length).toBeGreaterThanOrEqual(3500);

    const cases: [term: string, url: string][] = [
      ["essays", HUBS.threads.href],
      ["library", HUBS.library.href],
      ["vocabulary", HUBS.glossary.href],
      ["teacher", "/learn/teacher"],
      ["performer", "/learn/performer"],
      ["podcast", HUBS.listen.href],
      ["picker", HUBS.tools.href],
      ["listen", HUBS.listen.href],
      ["diagnosis", HUBS.diagnosis.href],
    ];
    for (const [term, url] of cases) {
      expect(holders(raw, "aliases", term), `"${term}" as an alias`).toContain(url);
    }
  });

  /**
   * The nav's name is the one the reader clicked; the H1 is the one they
   * read. Three labels are not first, each behind a page that says the word
   * in its title or body outright: "Diagnosis" (#2, behind the diagnosing-
   * scene-failure framework), "Listen" (#3, behind two guides about
   * listening) and "Exercises" (#4, behind the picker's three level pages,
   * whose orientation prose repeats the word; the hub's own H1 is #3 for the
   * same reason). The level ladder's label, "Start by Level", names five
   * pages and is not attached to the beginner page — hub-names.test.ts holds
   * that page to its own title, and so does this. Ranks measured 2026-09-22;
   * a residue entry may improve and may not slip.
   *
   * "Listen" was #2 until the `sections` field was added later the same day
   * (novel-insights 337). It indexes every h2 and h3 with the sentence under
   * it, and *How to Be a Good Listener* carries a section heading that says
   * "listen" where the hub has the word only as an alias, so a second
   * listening guide passed the hub. This is the one reading in this file the
   * field made worse; the options module's sweep records what the
   * alternatives cost, and every step above the boost it chose moves another.
   */
  it("returns every hub first for its current label and heading, with the residue named", () => {
    const { ms } = loadIndex();
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);
    expect(ALL_HUBS.length).toBeGreaterThanOrEqual(9);

    const RESIDUE: Record<string, number> = {
      [`${HUBS.diagnosis.href} label`]: 2,
      [`${HUBS.listen.href} label`]: 3,
      [`${HUBS.exercises.href} label`]: 4,
      [`${HUBS.exercises.href} h1`]: 3,
    };
    const wrong: string[] = [];
    let checked = 0;
    for (const hub of ALL_HUBS) {
      const queries: [kind: string, query: string][] =
        hub.href === HUBS.learn.href
          ? [["h1", hub.h1]]
          : [
              ["label", hub.label],
              ["h1", hub.h1],
            ];
      for (const [kind, query] of queries) {
        checked++;
        const rank = rankOf(ms, query, hub.href);
        const allowed = RESIDUE[`${hub.href} ${kind}`] ?? 1;
        if (rank > allowed) {
          wrong.push(`${hub.href} ${kind} "${query}" is #${rank}, allowed #${allowed}`);
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(30);
    expect(wrong).toEqual([]);
  });

  it("returns each renamed hub in the top three for every former name", () => {
    const { ms } = loadIndex();
    const renamed = ALL_HUBS.filter((h) => h.formerNames?.length);
    expect(renamed.length).toBeGreaterThanOrEqual(3);
    const wrong: string[] = [];
    let checked = 0;
    for (const hub of renamed) {
      for (const name of hub.formerNames!) {
        checked++;
        const rank = rankOf(ms, name, hub.href);
        // All three were first on 2026-09-22; the top three is the bar.
        if (rank > 3) wrong.push(`${hub.href} "${name}" is #${rank}`);
      }
    }
    expect(checked).toBeGreaterThanOrEqual(3);
    expect(wrong).toEqual([]);
  });

  /**
   * The audience words and the one-word handles. "intermediate" and
   * "advanced" are the residue: each sits fifth behind the exercise picker's
   * level page and its facets, all of which say the word in their title,
   * and the reader who typed it may well have wanted them. "beginner" is
   * third behind the picker's beginner page, which is why the ladder's
   * label is kept off the page (above). Measured 2026-09-22.
   */
  it("returns each audience hub and tool in the top three for its plain word, with the residue named", () => {
    const { ms } = loadIndex();
    const cases: [word: string, url: string, allowed: number][] = [
      ["beginner", "/learn/beginner", 3],
      ["intermediate", "/learn/intermediate", 5],
      ["teacher", "/learn/teacher", 3],
      ["performer", "/learn/performer", 3],
      ["advanced", "/learn/advanced", 5],
      ["podcast", HUBS.listen.href, 3],
      ["picker", HUBS.tools.href, 3],
      ["prompts", "/tools/improv-prompt-generator", 3],
    ];
    const wrong: string[] = [];
    for (const [word, url, allowed] of cases) {
      const rank = rankOf(ms, word, url);
      if (rank > allowed) wrong.push(`"${word}" → ${url} is #${rank}, allowed #${allowed}`);
    }
    expect(wrong).toEqual([]);
  });
});

/**
 * A guide's primary keyword returns the guide, and a concept's title still
 * returns the concept.
 *
 * Seven guides did not come first for their own primary keyword, and on
 * five of them the page that beat the guide was a concept or a reference
 * whose title *is* the keyword: "Viewpoints" beat *Anne Bogart Viewpoints*,
 * the Be Present principle beat *How to Be Present*, the Yes, And technique
 * beat *Yes And Improv*, Edmondson's paper beat *Psychological Safety*,
 * Spolin's book beat *Viola Spolin* — because the title is boosted three
 * times and a concept's title is the phrase while the guide's is a
 * sentence (tracker entry 316, 2026-09-22). Three of the five are winnable
 * guides at 1,000–1,100 monthly traffic potential, and the concept that
 * beat them is the page the site does not mean to rank.
 *
 * The fix is a `keyword` field only guides fill, appended to the shared
 * options. Its boost is 0.55, not the 3.5 the entry proposed: the field is
 * sparse, MiniSearch's inverse document frequency and average field length
 * are taken over every document, so a term found there is rare by
 * construction; swept on one built index, 3.5 returned 77 guides first and
 * took thirteen one-word concept titles from their concept ("Trust",
 * "Warm-Up", "Viewpoints"), 1 took eight, and 0.55 returned 76 first and
 * took none. Above 0.56 the trust-building guide, whose title says "trust"
 * twice, takes "Trust" from the concept. The options module has the sweep.
 *
 * Both counts are held here: a boost raised to win the last two guides
 * must not be paid for by the concepts.
 */
describe("site search ranks a guide's keyword and a concept's title apart", () => {
  it("appends the keyword field to the shared options, boosted below the title", () => {
    // Appended, not inserted: MiniSearch.loadJSON needs the fields in the
    // order the index was built with, and the parity comment says so. The
    // keyword field was last until `sections` was appended after it on
    // 2026-09-22, so what this holds is its position: an *insertion* before
    // it, which would silently re-key every posting in the built file, still
    // fails here.
    expect(MINISEARCH_OPTIONS.fields.indexOf("keyword")).toBe(5);
    expect(MINISEARCH_OPTIONS.fields.at(-1)).toBe("sections");
    expect(MINISEARCH_OPTIONS.searchOptions.boost.keyword).toBeGreaterThan(0);
    expect(MINISEARCH_OPTIONS.searchOptions.boost.keyword).toBeLessThan(
      MINISEARCH_OPTIONS.searchOptions.boost.title,
    );
    const { raw } = loadIndex();
    expect(raw.fieldIds).toHaveProperty("keyword");
    // Only guides fill it: the twins' keywords post to the guide and not
    // to the concept whose title is the same phrase.
    expect(holders(raw, "keyword", "viewpoints")).toContain("/viewpoints");
    expect(holders(raw, "keyword", "viewpoints")).not.toContain("/practice/techniques/viewpoints");
    expect(holders(raw, "keyword", "spolin")).toContain("/viola-spolin");
  });

  it("returns the guide for each twin's keyword and the concept for each twin's title", async () => {
    const { ms } = loadIndex();
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);
    const twins: [keyword: string, guide: string, title: string, concept: string][] = [
      ["anne bogart viewpoints", "/viewpoints", "Viewpoints", "/practice/techniques/viewpoints"],
      [
        "how to be present",
        "/how-to-be-present",
        "Be Present",
        "/how-it-works/principles/be-present",
      ],
      [
        "yes and improv",
        "/yes-and-improv",
        "Yes, And: The First Rule of Improv",
        "/practice/techniques/yes-and",
      ],
      [
        "psychological safety",
        "/psychological-safety",
        "Amy Edmondson — Psychological Safety in Work Teams (1999)",
        "/library/edmondson-psychological-safety",
      ],
      [
        "viola spolin",
        "/viola-spolin",
        "Improvisation for the Theater — Viola Spolin (1963)",
        "/library/spolin-improvisation-for-theater",
      ],
    ];
    // The titles above are the twins' as of 2026-09-22; a retitled twin
    // should fail here by name rather than pass on a query nobody owns.
    const atoms = await loadAtoms();
    const titles = new Set(atoms.map((a) => a.frontmatter.title));
    for (const [keyword, guide, title, concept] of twins) {
      expect(titles, `${concept} is no longer titled "${title}"`).toContain(title);
      expect(urls(ms, keyword)[0], `"${keyword}"`).toBe(guide);
      expect(urls(ms, title)[0], `"${title}"`).toBe(concept);
    }
  });

  it("returns each guide first for its primary keyword, floor 75 of 78, residue named", async () => {
    const bridges = await loadBridges();
    const withKeyword = bridges.filter((b) => b.frontmatter.target_keywords?.[0]?.keyword);
    // 78 on 2026-09-22.
    expect(withKeyword.length).toBeGreaterThanOrEqual(75);
    const { ms } = loadIndex();

    // The sibling guide: "how to stop overthinking" returns the relationship
    // variant first. It is not a twin, and it is a fair first answer.
    //
    // "improv warm up games" was the second residue entry, lost to the games
    // hub, and the guide took it back when `sections` was added on
    // 2026-09-22: the guide's own h2s say "warm up" repeatedly and the hub's
    // prose says it once. A win, so the entry is dropped rather than carried.
    const RESIDUE = new Set(["/how-to-stop-overthinking"]);
    const notFirst: string[] = [];
    let inTopThree = 0;
    for (const bridge of withKeyword) {
      const rank = rankOf(ms, bridge.frontmatter.target_keywords[0].keyword, `/${bridge.slug}`);
      if (rank !== 1) notFirst.push(`/${bridge.slug}`);
      if (rank <= 3) inTopThree++;
    }
    // 77 first and 78 in the top three on 2026-09-22, up from 76 and 78
    // before the `sections` field.
    expect(withKeyword.length - notFirst.length, notFirst.join("\n")).toBeGreaterThanOrEqual(76);
    expect(notFirst.filter((slug) => !RESIDUE.has(slug))).toEqual([]);
    expect(inTopThree).toBeGreaterThanOrEqual(78);
  });

  it("returns each concept first for its title, floor 200 of 205, residue named", async () => {
    const atoms = await loadAtoms();
    // 205 on 2026-09-22.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const { ms } = loadIndex();

    // The three that were not first before the keyword field existed, and
    // are not first after it: each loses to a page whose title extends the
    // concept's ("Character" → Character Through Game; "Group Mind" → Group
    // Mind Cultivation; "One-Word Story" → One-Word Scene, on the fuzzy
    // match). All 205 are in the top three.
    const RESIDUE = new Set(["character", "group-mind", "one-word-story"]);
    const notFirst: string[] = [];
    let inTopThree = 0;
    for (const atom of atoms) {
      const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
      const rank = rankOf(ms, atom.frontmatter.title, url);
      if (rank !== 1) notFirst.push(atom.frontmatter.id);
      if (rank <= 3) inTopThree++;
    }
    // 202 first, the count before the keyword field, which must not fall.
    expect(atoms.length - notFirst.length, notFirst.join("\n")).toBeGreaterThanOrEqual(200);
    expect(notFirst.filter((id) => !RESIDUE.has(id))).toEqual([]);
    expect(inTopThree).toBeGreaterThanOrEqual(203);
  });
});
