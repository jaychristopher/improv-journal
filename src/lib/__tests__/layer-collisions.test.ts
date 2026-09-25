import { describe, expect, it } from "vitest";

import { loadAtoms, loadBridges } from "../content";
import { GSC_SURFACED_ATOMS, GSC_SURFACED_ON } from "../gsc-surfaced.mjs";

/**
 * The search discipline now covers two layers, and this is what keeps the
 * second one honest.
 *
 * Until SA-5.1 (2026-09-25) every keyword, verdict and parent in the corpus
 * sat on a guide. 205 atoms, 212 indexable URLs, carried none of it — and the
 * twelve pages of theirs Search Console had already shown, two of them at
 * position 10, had never been measured. The fields exist on atoms now, with
 * a rule the card was explicit about: they are written on the atoms Google
 * has shown and nowhere else, because inventing demand for 200 pages nobody
 * has researched is the drift the epic exists to prevent.
 *
 * Three things hold. A keyword block appears only on an atom in the surfaced
 * list, and every surfaced atom records the query it was shown for. A parent
 * topic is claimed by one page across both layers, not one per layer. And an
 * atom whose name, alias, query or keyword is a guide's declared keyword
 * names that guide as `search_owner` — three today, each a decision.
 */
const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Atoms that name a guide as the owner of their term, 2026-09-25. Two came
 * from matching titles against keywords (the card's method); the third from
 * the query the atom was shown for, "yes and rule", which yes-and-improv
 * declares. Grows only by a decision, so it is asserted by name.
 */
const OWNED: Record<string, string> = {
  "fear-of-failure": "how-to-overcome-fear-of-failure",
  "reading-the-room": "how-to-read-the-room",
  "yes-and": "yes-and-improv",
};

describe("search fields across the layers", () => {
  it("writes a keyword block only on an atom Search Console has shown", async () => {
    const atoms = await loadAtoms();
    // Guard the guard: the corpus and the list, not an empty pair.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(GSC_SURFACED_ATOMS.length).toBeGreaterThanOrEqual(12);
    expect(GSC_SURFACED_ON).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const surfaced = new Set(GSC_SURFACED_ATOMS.map((a) => a.slug));
    const keyed = atoms.filter((a) => (a.frontmatter.target_keywords ?? []).length > 0);
    // 8 of the 12 on 2026-09-25: the queries the index prices.
    expect(keyed.length).toBeGreaterThanOrEqual(5);
    const bulk = keyed.filter((a) => !surfaced.has(a.frontmatter.id)).map((a) => a.frontmatter.id);
    expect(
      bulk,
      "a keyword block on an atom Google has not shown — the bulk edit SA-5.1 ruled out",
    ).toEqual([]);

    // The other direction: shown means read, and the query is written down.
    const unread = GSC_SURFACED_ATOMS.filter((s) => {
      const atom = atoms.find((a) => a.frontmatter.id === s.slug);
      return !atom || atom.frontmatter.serp_query !== s.query;
    }).map((s) => s.slug);
    expect(unread, "a surfaced atom without the query it was shown for").toEqual([]);
    const unchecked = GSC_SURFACED_ATOMS.filter((s) => {
      const atom = atoms.find((a) => a.frontmatter.id === s.slug);
      return atom && !atom.frontmatter.search_owner && !atom.frontmatter.serp_checked;
    }).map((s) => s.slug);
    expect(unchecked, "a surfaced atom whose results page nobody has requested").toEqual([]);
  });

  it("claims each parent topic on one page across guides and atoms", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    const claims = new Map<string, Set<string>>();
    const claim = (page: string, parent: string | undefined) => {
      if (!parent) return;
      const key = norm(parent);
      claims.set(key, new Set([...(claims.get(key) ?? []), page]));
    };
    for (const b of bridges) {
      for (const k of b.frontmatter.target_keywords ?? []) claim(b.slug, k.parent);
    }
    for (const a of atoms) {
      for (const k of a.frontmatter.target_keywords ?? []) {
        claim(`atom:${a.frontmatter.id}`, k.parent);
      }
    }
    expect(claims.size).toBeGreaterThanOrEqual(150);
    const shared = [...claims.entries()]
      .filter(([, pages]) => pages.size > 1)
      .map(([parent, pages]) => `"${parent}" is claimed by ${[...pages].join(" and ")}`);
    expect(shared).toEqual([]);
  });

  it("names an owner wherever an atom's term is a guide's keyword", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    const keywordOwner = new Map<string, string>();
    for (const b of bridges) {
      for (const k of b.frontmatter.target_keywords ?? []) {
        if (!keywordOwner.has(norm(k.keyword))) keywordOwner.set(norm(k.keyword), b.slug);
      }
    }
    expect(keywordOwner.size).toBeGreaterThanOrEqual(300);

    const needs: string[] = [];
    const owners: Record<string, string> = {};
    for (const a of atoms) {
      const fm = a.frontmatter;
      const names = [
        fm.title,
        ...(fm.aliases ?? []),
        ...(fm.serp_query ? [fm.serp_query] : []),
        ...(fm.target_keywords ?? []).map((k) => k.keyword),
      ].map(norm);
      const taken = names.find((n) => keywordOwner.has(n));
      const guide = taken ? keywordOwner.get(taken) : undefined;
      if (guide && fm.search_owner !== guide) {
        needs.push(
          `${fm.id}: "${taken}" is ${guide}'s keyword — name it as search_owner or take the term back`,
        );
      }
      if (fm.search_owner) {
        owners[fm.id] = fm.search_owner;
        expect(
          bridges.some((b) => b.slug === fm.search_owner),
          `${fm.id} names a guide that does not exist`,
        ).toBe(true);
        // An owned atom is the concept page; the guide is the candidate.
        expect(fm.target_keywords ?? [], `${fm.id} is owned and declares keywords`).toEqual([]);
      }
    }
    expect(needs).toEqual([]);
    expect(owners).toEqual(OWNED);
  });
});
