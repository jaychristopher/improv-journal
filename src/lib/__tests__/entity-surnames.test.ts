import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges, loadThreads } from "../content";

/**
 * The surname rule in the entity linker.
 *
 * The guides' habit is to give a founder's full name once, often in a section
 * the reader did not arrive at, and the surname everywhere after — or the
 * surname only, on the assumption the reader knows who Johnstone is. The
 * linker matched the full name and nothing else, so 11 of the 29 guides
 * naming Johnstone and 6 of the 18 naming Spolin linked neither the tradition
 * nor the person (tracker entry 271, 2026-09-22). The rule: where the page
 * reaches the target through the full name or a hand-written link the
 * surname is left alone; where it does not, the first surname after the
 * first full-name mention (or the first surname at all) links once.
 *
 * Measured on 2026-09-22 when the rule shipped: guides linking
 * /traditions/johnstone went 18 → 29, /viola-spolin 10 → 17,
 * /traditions/annoyance 2 → 3; atoms 20 → 90, 17 → 45 and 23 → 66; lessons
 * 4 → 7, 1 → 4 and 1 → 2. The floors below sit just under those counts. Only
 * the guides are floored per target, because they are the layer the tracker
 * measured and the one search traffic arrives on.
 */

const anchor = (url: string) => new RegExp(`<a href="${url}">([^<]*)</a>`, "g");

const SURNAMES: { surname: string; url: string; ownPage: string }[] = [
  { surname: "Johnstone", url: "/traditions/johnstone", ownPage: "/traditions/johnstone" },
  { surname: "Spolin", url: "/viola-spolin", ownPage: "/viola-spolin" },
  { surname: "Napier", url: "/traditions/annoyance", ownPage: "/traditions/annoyance" },
];

describe("surname entity links", () => {
  it("links guides that name a founder only by surname", async () => {
    const bridges = await loadBridges();
    // Guard the guard: a filter that returned nothing would pass every floor
    // below vacuously.
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const reaching = (url: string) => bridges.filter((b) => b.html.includes(`href="${url}"`));
    // 29 on 2026-09-22; 18 before the rule.
    expect(reaching("/traditions/johnstone").length).toBeGreaterThanOrEqual(27);
    // 17 on 2026-09-22; 10 before the rule.
    expect(reaching("/viola-spolin").length).toBeGreaterThanOrEqual(15);

    // The shape the rule produces: a bare anchor whose text is the surname
    // alone, on a page whose full-name mention could not carry the link.
    const surnameOnly = bridges.filter((b) =>
      [...b.html.matchAll(anchor("/traditions/johnstone"))].some((m) => m[1] === "Johnstone"),
    );
    expect(surnameOnly.length).toBeGreaterThanOrEqual(9);
  });

  it("never links a surname on the target's own page", async () => {
    const [bridges, atoms, threads] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
    ]);
    const spolin = bridges.find((b) => b.slug === "viola-spolin");
    expect(spolin).toBeDefined();
    expect(spolin!.content).toMatch(/\bSpolin\b/);
    expect(spolin!.html).not.toContain('href="/viola-spolin"');

    // The tradition pages are TSX rather than markdown and never pass through
    // the linker; the person guides do, and are the own-page case that can
    // actually fire. Nothing in the corpus links itself.
    const docs = [...bridges, ...atoms, ...threads];
    expect(docs.length).toBeGreaterThanOrEqual(290);
    for (const { url, ownPage } of SURNAMES) {
      const self = docs.filter((d) => `/${d.slug}` === ownPage && d.html.includes(`href="${url}"`));
      expect(self.map((d) => d.slug)).toEqual([]);
    }
  });

  it("never links Close alone", async () => {
    const [bridges, atoms, threads] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
    ]);
    const docs = [...bridges, ...atoms, ...threads];
    // "Close" alone is an English word and the rule refuses it; the only
    // anchor text for /del-close the linker writes is the full name.
    const closeAlone = docs.filter((d) =>
      [...d.html.matchAll(anchor("/del-close"))].some((m) => m[1].trim() === "Close"),
    );
    expect(closeAlone.map((d) => d.slug)).toEqual([]);
    // And the population: the guides do say "Close" on its own, so the
    // absence above is the rule working and not the word being absent.
    const sayClose = bridges.filter((b) => /\bClose\b/.test(b.content.replace(/Del Close/g, "")));
    expect(sayClose.length).toBeGreaterThanOrEqual(5);
  });

  it("adds at most one surname link per target per page", async () => {
    const [bridges, atoms, threads] = await Promise.all([
      loadBridges(),
      loadAtoms(),
      loadThreads(),
    ]);
    const docs = [...bridges, ...atoms, ...threads];
    const repeated: string[] = [];
    for (const d of docs) {
      for (const { surname, url } of SURNAMES) {
        const n = [...d.html.matchAll(anchor(url))].filter((m) => m[1] === surname).length;
        if (n > 1) repeated.push(`${d.slug} links ${url} as "${surname}" ${n} times`);
      }
    }
    expect(repeated).toEqual([]);
  });
});
