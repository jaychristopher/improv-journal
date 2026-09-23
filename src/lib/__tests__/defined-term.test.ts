import { describe, expect, it } from "vitest";

import {
  type DefinedTermFrontmatter,
  DefinedTermJsonLd,
  definedTermJsonLd,
  definedTermSameAs,
} from "../../components/DefinedTermJsonLd";
import { getAtomBySlug, getAtomUrl, loadAtoms, loadBridges } from "../content";
import { definitionFromHtml, type GlossaryTerm, isGlossaryType } from "../glossary";

/** What loadAtoms yields; the content module does not export the shape. */
type Atom = Awaited<ReturnType<typeof loadAtoms>>[number];

/**
 * The DefinedTerm on a concept page is the site's own statement of what the
 * term is. Two things it said nothing about until 2026-09-21:
 *
 * - *Identity.* A guide could declare its subject as Wikipedia's "Trust
 *   (social science)" while the atom `trust`, the page that actually defines
 *   the thing, carried no `sameAs` at all — 0 of 205 atoms did (entry 175). A
 *   crawler reading both was told the guide is about a known entity and the
 *   definition is about a term it had never heard of.
 * - *Rules.* On a game, the description was the derived lead sentence, which
 *   says what the exercise trains, while the one sentence written to describe
 *   the game (`how_to_play`) was shown on every surface except its own page's
 *   markup (entry 187).
 *
 * These guards read the component's data function rather than a render,
 * because the component now looks the atom up itself and is async.
 */

/** The same records the page-subject guard accepts for `about.sameAs`. */
const AUTHORITY = /^https:\/\/(en\.wikipedia\.org\/wiki\/|www\.wikidata\.org\/wiki\/Q\d+)/;

/** The term shape AtomDetail hands the component. */
function termFor(atom: Atom): GlossaryTerm {
  const fm = atom.frontmatter;
  return {
    id: fm.id,
    term: fm.title,
    url: getAtomUrl({ id: fm.id, type: fm.type }),
    type: fm.type,
    definition: definitionFromHtml(atom.html),
    aliases: fm.aliases,
  };
}

/** The three concepts a guide already identified while the atom did not. */
const JOINED: { atom: string; guide: string }[] = [
  { atom: "trust", guide: "trust-building-exercises" },
  { atom: "active-listening", guide: "active-listening" },
  { atom: "viewpoints", guide: "viewpoints" },
];

describe("DefinedTerm sameAs", () => {
  it("only ever points at authority records, absolute and https", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const declared = atoms.filter((a) => a.frontmatter.sameAs?.length);
    // 3 on 2026-09-21; the field is new. Any atom with one must be well
    // formed, and the population is asserted so a loader that dropped the
    // field would fail here rather than pass on nothing.
    expect(declared.length).toBeGreaterThanOrEqual(3);

    for (const atom of declared) {
      for (const url of atom.frontmatter.sameAs!) {
        expect(url, `${atom.frontmatter.id} sameAs`).toMatch(AUTHORITY);
      }
    }
  });

  it("is emitted on every atom that declares one", async () => {
    const atoms = await loadAtoms();
    for (const atom of atoms.filter((a) => a.frontmatter.sameAs?.length)) {
      expect(isGlossaryType(atom.frontmatter.type), atom.frontmatter.id).toBe(true);
      const data = definedTermJsonLd(termFor(atom), atom.frontmatter);
      expect(data.sameAs, atom.frontmatter.id).toEqual(atom.frontmatter.sameAs);
    }
  });

  it("gives the three joined concepts the exact record their guide declares", async () => {
    const bridges = await loadBridges();
    for (const { atom: id, guide } of JOINED) {
      const atom = await getAtomBySlug(id);
      const bridge = bridges.find((b) => b.slug === guide);
      expect(atom, id).toBeDefined();
      expect(bridge, guide).toBeDefined();

      const guideSameAs = bridge!.frontmatter.subject?.sameAs;
      expect(guideSameAs, `${guide} subject.sameAs`).toBeTruthy();

      const data = definedTermJsonLd(termFor(atom!), atom!.frontmatter);
      // Copied verbatim, so a search engine reading both pages resolves them
      // to one entity instead of a known one and an unknown one.
      expect(data.sameAs, id).toEqual(guideSameAs);
    }
  });

  it("falls back to the atom's own subject records, and to nothing", async () => {
    // The Harold declares a subject rather than a sameAs; the subject is the
    // term, so the DefinedTerm carries its records too.
    const harold = await getAtomBySlug("harold");
    expect(harold).toBeDefined();
    expect(harold!.frontmatter.subject?.sameAs?.length).toBeGreaterThan(0);
    expect(definedTermSameAs(harold!.frontmatter)).toEqual(harold!.frontmatter.subject!.sameAs);

    // Explicit beats subject, empty strings are dropped, and an atom with
    // neither emits no key at all rather than an empty array.
    const both: DefinedTermFrontmatter = {
      type: "definition",
      sameAs: ["https://en.wikipedia.org/wiki/Status"],
      subject: { type: "Thing", name: "Status", sameAs: ["https://www.wikidata.org/wiki/Q1"] },
    };
    expect(definedTermSameAs(both)).toEqual(["https://en.wikipedia.org/wiki/Status"]);
    expect(definedTermSameAs({ type: "definition", sameAs: [" "] })).toBeUndefined();
    expect(definedTermSameAs({ type: "definition" })).toBeUndefined();
    expect(definedTermSameAs(undefined)).toBeUndefined();

    const atoms = await loadAtoms();
    const bare = atoms.filter((a) => !a.frontmatter.sameAs?.length && !a.frontmatter.subject);
    expect(bare.length).toBeGreaterThanOrEqual(150);
    for (const atom of bare) {
      expect(
        "sameAs" in definedTermJsonLd(termFor(atom), atom.frontmatter),
        atom.frontmatter.id,
      ).toBe(false);
    }
  });
});

describe("DefinedTerm description", () => {
  it("is the how_to_play sentence on every game that carries one", async () => {
    const atoms = await loadAtoms();
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const games = atoms.filter((a) => a.frontmatter.how_to_play);
    // 51 on 2026-09-21: 27 exercises, 24 formats.
    expect(games.length).toBeGreaterThanOrEqual(45);

    for (const atom of games) {
      const fm = atom.frontmatter;
      expect(["exercise", "format"], fm.id).toContain(fm.type);
      const data = definedTermJsonLd(termFor(atom), fm);
      expect(data.description, fm.id).toBe(fm.how_to_play!.trim());
    }
  });

  it("stays the lead sentence on concepts and on games without rules", async () => {
    const atoms = await loadAtoms();
    const rest = atoms.filter(
      (a) => isGlossaryType(a.frontmatter.type) && !a.frontmatter.how_to_play,
    );
    expect(rest.length).toBeGreaterThanOrEqual(100);

    for (const atom of rest) {
      const term = termFor(atom);
      const data = definedTermJsonLd(term, atom.frontmatter);
      expect(data.description, atom.frontmatter.id).toBe(term.definition);
    }

    // A concept that somehow carried the field would not have it read either:
    // the sentence is a game's line, not a definition.
    const concept = atoms.find((a) => a.frontmatter.type === "definition")!;
    const data = definedTermJsonLd(termFor(concept), {
      ...concept.frontmatter,
      how_to_play: "Not a definition.",
    });
    expect(data.description).toBe(termFor(concept).definition);
  });

  it("keeps the rest of the markup as it was", async () => {
    const atom = await getAtomBySlug("harold");
    const term = termFor(atom!);
    const data = definedTermJsonLd(term, atom!.frontmatter);
    expect(data["@type"]).toBe("DefinedTerm");
    expect(data["@id"]).toMatch(/^https:\/\/.+\/practice\/formats\/harold$/);
    expect(data.url).toBe(data["@id"]);
    expect(data.termCode).toBe("harold");
    expect(data.name).toBe(atom!.frontmatter.title);
    expect(data.inDefinedTermSet["@type"]).toBe("DefinedTermSet");
  });
});

/**
 * AtomDetail hands the component the glossary shape only — no `sameAs`, no
 * `how_to_play` — so the component looks the atom up by id itself. The data
 * function above is what it emits, but this is the path the page takes, and
 * it is the one that would silently fall back to the old markup if the lookup
 * broke. The async component is called as a function: react-dom/server's
 * renderToString cannot render async components.
 */
describe("DefinedTermJsonLd component", () => {
  async function payload(id: string) {
    const atom = await getAtomBySlug(id);
    expect(atom, id).toBeDefined();
    const element = await DefinedTermJsonLd({ term: termFor(atom!) });
    const html = (element.props as { dangerouslySetInnerHTML: { __html: string } })
      .dangerouslySetInnerHTML.__html;
    return JSON.parse(html) as ReturnType<typeof definedTermJsonLd>;
  }

  it("finds the atom's identity and rules from the id alone", async () => {
    const trust = await payload("trust");
    expect(trust.sameAs).toEqual(["https://en.wikipedia.org/wiki/Trust_(social_science)"]);

    const harold = await payload("harold");
    const fm = (await getAtomBySlug("harold"))!.frontmatter;
    expect(harold.description).toBe(fm.how_to_play!.trim());
    expect(harold.sameAs).toEqual(fm.subject!.sameAs);
  });
});
