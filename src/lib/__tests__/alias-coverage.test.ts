import { describe, expect, it } from "vitest";

import {
  GENERIC_ONE_WORD_ATOM_TITLES,
  getAtomUrl,
  loadAtoms,
  loadBridges,
  loadThreads,
} from "../content";

/**
 * How much of the corpus has a second name at all.
 *
 * `aliases` is the field the linker, site search and schema.org all read,
 * and on 2026-09-22 it was 43 registrations on 33 of the 205 atoms: the
 * other 172 concepts have never been asked what else they are called, while
 * 45 atoms cannot be linked from prose by their title at all (tracker entry
 * 353). The marginal alias was worth about 37 prose occurrences and 4 links,
 * which makes it the cheapest link the corpus has and the least filled-in
 * field it has.
 *
 * So the readings below are a coverage record, not a target. The floors may
 * only rise: an atom that gains an alias moves them up, and an alias that
 * quietly disappears from a frontmatter moves them down and fails. Nothing
 * here asks anyone to add one — `src/lib/alias-candidates.ts` and the
 * "Concepts with no second name" section of `docs/seeds.md` carry the
 * shortlist, and accepting a candidate is the author's call because a wrong
 * alias makes a wrong link on every page that says the phrase.
 *
 * Asserts presence, not markup, and guards its own populations: every count
 * below would pass vacuously on an empty corpus, so the atom count, the
 * corpus size and the alias population are asserted first.
 */

/**
 * The one alias two atoms both claim. `Denial` is declared by `blocking` and
 * by `blocking-taxonomy`, so a link on that word would have two possible
 * targets and no way to choose between them — which is a reason to leave it
 * declined that is independent of how its occurrences read. It is named here
 * rather than tolerated in general, so a second collision fails.
 */
const ALLOWED_DUPLICATE_ALIASES = ["denial"];

type Doc = { content: string; html: string; slug: string };

async function loadCorpus(): Promise<Doc[]> {
  // Concepts, guides and lessons: the bodies entry 353's 1,576 was read
  // over, and the three layers that carry prose.
  const [atoms, bridges, threads] = await Promise.all([loadAtoms(), loadBridges(), loadThreads()]);
  return [...atoms, ...bridges, ...threads];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function anchorsIn(html: string) {
  return [...html.matchAll(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g)].map((match) => ({
    href: match[1],
    text: match[2],
  }));
}

describe("alias coverage", () => {
  it("records how many concepts carry a second name", async () => {
    const atoms = await loadAtoms();
    // Guard the guard: a changed loader that returned nothing would pass
    // every floor below on no evidence.
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const withAlias = atoms.filter((atom) => (atom.frontmatter.aliases ?? []).length > 0);
    const registrations = atoms.reduce(
      (total, atom) => total + (atom.frontmatter.aliases ?? []).length,
      0,
    );

    // 33 of 205 atoms and 43 registrations on 2026-09-22. Floors, not
    // targets: an alias added moves them up and an alias deleted fails.
    expect(withAlias.length).toBeGreaterThanOrEqual(33);
    expect(registrations).toBeGreaterThanOrEqual(43);
    // The field is the minority state, which is the whole finding. If this
    // ever fails the corpus has been filled in and the entry is history.
    expect(withAlias.length).toBeLessThan(atoms.length);
  });

  it("lets only the one known alias be claimed by two atoms", async () => {
    const atoms = await loadAtoms();
    const claimedBy = new Map<string, string[]>();
    for (const atom of atoms) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        const key = alias.toLowerCase();
        claimedBy.set(key, [...(claimedBy.get(key) ?? []), atom.frontmatter.id]);
      }
    }
    // 42 distinct aliases across 43 registrations on 2026-09-22.
    expect(claimedBy.size).toBeGreaterThanOrEqual(42);

    const duplicates = [...claimedBy]
      .filter(([, ids]) => ids.length > 1)
      .map(([alias]) => alias)
      .sort();
    expect(duplicates).toEqual(ALLOWED_DUPLICATE_ALIASES);
    // The allowance is not vacuous: both atoms still declare it.
    expect(claimedBy.get("denial")?.sort()).toEqual(["blocking", "blocking-taxonomy"]);
  });

  it("never lets an alias be another atom's title", async () => {
    const atoms = await loadAtoms();
    const titleOwner = new Map<string, string>();
    for (const atom of atoms) {
      titleOwner.set(atom.frontmatter.title.toLowerCase(), atom.frontmatter.id);
    }
    expect(titleOwner.size).toBeGreaterThanOrEqual(200);

    // Hard assertion, not a floor: this holds today and an alias that stole
    // another concept's title would send its links to the wrong page. The
    // collisions guard in the linker depends on it.
    const collisions: string[] = [];
    for (const atom of atoms) {
      for (const alias of atom.frontmatter.aliases ?? []) {
        const owner = titleOwner.get(alias.toLowerCase());
        if (owner && owner !== atom.frontmatter.id) {
          collisions.push(`${atom.frontmatter.id}: "${alias}" is ${owner}'s title`);
        }
      }
    }
    expect(collisions).toEqual([]);
  });

  it("reads the aliases the prose already says, and the links they make", async () => {
    const atoms = await loadAtoms();
    const docs = await loadCorpus();
    // 308 bodies on 2026-09-22: 205 concepts, 78 guides, 25 lessons.
    expect(docs.length).toBeGreaterThanOrEqual(300);

    const aliases = atoms.flatMap((atom) =>
      (atom.frontmatter.aliases ?? []).map((alias) => ({
        alias,
        url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
      })),
    );
    expect(aliases.length).toBeGreaterThanOrEqual(43);

    let occurrences = 0;
    for (const { alias } of aliases) {
      const matcher = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(alias)}(?![A-Za-z0-9])`, "gi");
      for (const doc of docs) occurrences += (doc.content.match(matcher) ?? []).length;
    }

    const urlsByAlias = new Map<string, Set<string>>();
    for (const { alias, url } of aliases) {
      const key = alias.toLowerCase();
      urlsByAlias.set(key, (urlsByAlias.get(key) ?? new Set()).add(url));
    }
    const titleUrls = new Map<string, string>();
    for (const atom of atoms) {
      titleUrls.set(
        atom.frontmatter.title.toLowerCase(),
        getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
      );
    }
    let anchors = 0;
    let titleAnchors = 0;
    for (const doc of docs) {
      for (const { href, text } of anchorsIn(doc.html)) {
        const key = text.toLowerCase();
        if (urlsByAlias.get(key)?.has(href)) anchors += 1;
        if (titleUrls.get(key) === href) titleAnchors += 1;
      }
    }

    // Dated readings, 2026-09-22, over these 308 bodies: the 43 aliases are
    // said 1,576 times and render as 171 anchors, against 1,559 anchors
    // whose text is an exact title. (Entry 353 quotes 173 and 1,604 for the
    // anchors; it counted paths and sources too, which this does not, and
    // the occurrence total is the same 1,576 either way.) The floors sit
    // under each so a rewritten paragraph does not fail and a registration
    // that stopped working does.
    expect(occurrences).toBeGreaterThanOrEqual(1400);
    expect(anchors).toBeGreaterThanOrEqual(150);
    expect(titleAnchors).toBeGreaterThanOrEqual(1400);
    // The finding, as a relation rather than a number: the prose says these
    // names constantly and the linker converts about 1 in 9, because 2 of
    // the 43 are `Game` and `The game`, which the article rule declines on
    // purpose, and most of the rest are said on the page they name.
    expect(anchors).toBeLessThan(occurrences);
    expect(anchors).toBeLessThan(titleAnchors);
  });

  it("keeps the generic one-word titles addressable by atom id", async () => {
    const atoms = await loadAtoms();
    const ids = new Set(atoms.map((atom) => atom.frontmatter.id));
    expect(GENERIC_ONE_WORD_ATOM_TITLES.size).toBeGreaterThanOrEqual(25);

    // `alias-candidates.ts` excludes every atom id from its shortlist and
    // relies on that to exclude the generic set without copying it. All 27
    // entries are atom ids today; if one ever is not, the candidate list
    // could propose a phrase the linker deliberately declines.
    const notAnId = [...GENERIC_ONE_WORD_ATOM_TITLES].filter((title) => !ids.has(title));
    expect(notAnId).toEqual([]);
  });
});
