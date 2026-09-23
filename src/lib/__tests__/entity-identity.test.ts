import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { definedTermJsonLd } from "../../components/DefinedTermJsonLd";
import { GuideConcepts } from "../../components/GuideConcepts";
import { getAtomUrl, loadAtoms, loadBridges } from "../content";
import { getGuideConcepts, getGuideSubjectGap } from "../guide-concepts";
import {
  definedTermId,
  guideSubjectConceptId,
  indexAtoms,
  subjectConceptId,
} from "../jsonld-edges";
import { SITE_URL } from "../seo";

/**
 * What this site claims to be the same as something outside it.
 *
 * Tracker entry 340 (2026-09-22) read every outward identity claim in
 * `content/` and found 25 URLs on 25 documents, running through the wrong
 * layer. 22 of the 78 guides declare a `subject` with a Wikipedia or Wikidata
 * record. 3 of the 173 concepts carry a bare `sameAs` and 3 more a `subject`
 * block of their own, so 167 assert no identity outside this site at all —
 * while the guide that targets the keyword does. The reference layer is the
 * exception that shows the pattern: 32 of 32 carry a full `work`, because a
 * book is an external thing and the site knew it needed an identifier for it.
 *
 * And on 19 of the 22 guides the entity the guide claims to be about has no
 * atom of that title at all, so the join could not be made even if the code
 * tried: the site tells a knowledge graph "this page is about Small Talk" and
 * cannot say which of its own concepts that is.
 *
 * These guards hold the readings with their date, check the shape of every
 * URL without asking what is at the other end, and hold the 2 derived
 * surfaces the entry produced — the guide subject that points at a concept
 * page's `@id` (`subjectConceptId`) and the line a guide carries when its
 * subject names nothing the graph holds (`getGuideSubjectGap`). The numbers
 * here are readings, not targets: when an identifier is added the count moves
 * and the date is rewritten. No URL is asserted that the content does not
 * already declare — adding an identifier is the author's call, like an Ahrefs
 * figure.
 */

/** Absolute https, nothing more. What is at the other end is not this test's business. */
const ABSOLUTE_HTTPS = /^https:\/\/[^\s"<>]+$/;

/** The 3 guide subjects the site defines a concept for, and the atom each names. */
const JOINED = [
  { guide: "active-listening", atom: "active-listening", subject: "Active listening" },
  { guide: "trust-building-exercises", atom: "trust", subject: "Trust" },
  { guide: "viewpoints", atom: "viewpoints", subject: "Viewpoints" },
];

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

function builtPage(url: string): string {
  return fs.readFileSync(path.join(APP, `${url.replace(/^\//, "")}.html`), "utf-8");
}

/** A URL as the served bytes may spell it; JSON-LD in HTML escapes solidus at will. */
function serves(html: string, url: string): boolean {
  return html.includes(url) || html.includes(url.replace(/\//g, "\\u002F"));
}

describe("outward identity, as the corpus declares it", () => {
  it("holds the counts of 2026-09-22 as readings", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    // Guard the guard: a loader that returned nothing would satisfy every
    // count below without these 2.
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    expect(bridges.length).toBeGreaterThanOrEqual(70);

    const references = atoms.filter((a) => a.frontmatter.type === "reference");
    const concepts = atoms.filter((a) => a.frontmatter.type !== "reference");
    expect(references.length).toBeGreaterThanOrEqual(32);
    expect(concepts.length).toBeGreaterThanOrEqual(173);

    // 22 of 78 on 2026-09-22. A floor: the next guide to declare a subject
    // raises it, and a guide that loses one is a regression worth failing on.
    expect(bridges.filter((b) => b.frontmatter.subject).length).toBeGreaterThanOrEqual(22);

    // 3 of 173 each, on 2026-09-22 — `active-listening`, `trust` and
    // `viewpoints` carry `sameAs`; `harold`, `meisner-technique` and
    // `theatresports` carry a `subject` block. Two shapes for one claim, both
    // kept: the 3rd guard below says why.
    expect(concepts.filter((a) => a.frontmatter.sameAs?.length).length).toBeGreaterThanOrEqual(3);
    expect(concepts.filter((a) => a.frontmatter.subject).length).toBeGreaterThanOrEqual(3);

    // 32 of 32. The complete layer, and the one this entry measures the rest
    // against, so it is an equality and not a floor.
    expect(references.filter((a) => a.frontmatter.work).length).toBe(references.length);
  });

  it("only ever declares an absolute https URL, wherever the claim is made", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    const claims: { where: string; urls: string[] }[] = [
      ...bridges.map((b) => ({
        where: `${b.slug} subject.sameAs`,
        urls: b.frontmatter.subject?.sameAs ?? [],
      })),
      ...atoms.map((a) => ({
        where: `${a.frontmatter.id} sameAs`,
        urls: a.frontmatter.sameAs ?? [],
      })),
      ...atoms.map((a) => ({
        where: `${a.frontmatter.id} subject.sameAs`,
        urls: a.frontmatter.subject?.sameAs ?? [],
      })),
    ];
    // 25 URLs on 25 documents, 2026-09-22. Asserted so a loader that dropped
    // the field would fail here rather than pass on an empty sweep. The shape
    // only: page-subject.test.ts is where the authority host is checked.
    const urls = claims.flatMap((c) => c.urls);
    expect(urls.length).toBeGreaterThanOrEqual(25);

    for (const claim of claims) {
      for (const url of claim.urls) {
        expect(url, claim.where).toMatch(ABSOLUTE_HTTPS);
        expect(url.trim(), claim.where).toBe(url);
      }
    }
  });

  it("keeps the 3 atom subject blocks whole, description and all", async () => {
    // Folding these into `sameAs` would lose what the page renders: AtomDetail
    // hands `subject` to ArticleJsonLd, which emits `about` with the type, the
    // name and the one-line description. `definedTermSameAs` already reads the
    // records out of the block, so the identity half is joined without the
    // block being flattened, and folding stays a content decision nobody has
    // to make.
    const atoms = await loadAtoms();
    const withSubject = atoms.filter((a) => a.frontmatter.subject);
    expect(withSubject.map((a) => a.frontmatter.id).sort()).toEqual([
      "harold",
      "meisner-technique",
      "theatresports",
    ]);
    for (const atom of withSubject) {
      expect(atom.frontmatter.subject!.description?.length, atom.frontmatter.id).toBeGreaterThan(0);
      expect(atom.frontmatter.subject!.sameAs?.length, atom.frontmatter.id).toBeGreaterThan(0);
    }
  });
});

describe("the join between a guide's subject and a concept", () => {
  it("matches exactly, case-insensitively, and only where the guide declares the atom", async () => {
    const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
    const byId = indexAtoms(atoms);
    const titles = new Set(atoms.map((a) => a.frontmatter.title.trim().toLowerCase()));

    const declared = bridges.filter((b) => b.frontmatter.subject);
    const matched = declared.filter((b) =>
      titles.has(b.frontmatter.subject!.name.trim().toLowerCase()),
    );
    // 3 of 22 on 2026-09-22, and all 3 name the atom in `entry_atoms`.
    expect(matched.map((b) => b.slug).sort()).toEqual(JOINED.map((j) => j.guide).sort());

    for (const { guide, atom, subject } of JOINED) {
      const bridge = bridges.find((b) => b.slug === guide);
      expect(bridge, guide).toBeDefined();
      expect(bridge!.frontmatter.subject!.name).toBe(subject);
      expect(bridge!.frontmatter.entry_atoms ?? [], guide).toContain(atom);

      const fm = byId.get(atom);
      expect(fm, atom).toBeDefined();
      const id = subjectConceptId(
        bridge!.frontmatter.subject,
        bridge!.frontmatter.entry_atoms,
        byId,
      );
      // The `@id` the concept page's DefinedTerm declares, byte for byte,
      // because both sides are built by the one helper.
      expect(id, guide).toBe(definedTermId(getAtomUrl({ id: fm!.id, type: fm!.type })));
      expect(id, guide).toBe(`${SITE_URL}${getAtomUrl({ id: fm!.id, type: fm!.type })}`);
      // The wrapper the guide route calls answers the same, so a page cannot
      // be given one `@id` and this guard another.
      expect(await guideSubjectConceptId(bridge!.frontmatter), guide).toBe(id);
    }

    // And nothing for a guide that declares no subject at all: 56 of 78.
    const noSubject = bridges.find((b) => !b.frontmatter.subject)!;
    expect(await guideSubjectConceptId(noSubject.frontmatter)).toBeUndefined();
  });

  it("refuses a near match, an undeclared atom and a subject with no concept", async () => {
    const byId = indexAtoms(await loadAtoms());
    const trust = { name: "Trust" };

    // Case is not part of the claim; the rest of the string is.
    expect(subjectConceptId({ name: "trust" }, ["trust"], byId)).toBeTruthy();
    expect(subjectConceptId({ name: "Trusting" }, ["trust"], byId)).toBeUndefined();
    expect(subjectConceptId({ name: "Tru" }, ["trust"], byId)).toBeUndefined();
    // An atom the guide never declared is not a join the author made.
    expect(subjectConceptId(trust, [], byId)).toBeUndefined();
    expect(subjectConceptId(trust, ["active-listening"], byId)).toBeUndefined();
    expect(subjectConceptId(undefined, ["trust"], byId)).toBeUndefined();
    expect(subjectConceptId({ name: "  " }, ["trust"], byId)).toBeUndefined();
    // Small talk is the entry's own example: declared as a subject, no node.
    expect(subjectConceptId({ name: "Small talk" }, ["offers"], byId)).toBeUndefined();
  });
});

describe("the subject a guide declares that the graph has no node for", () => {
  it("is 19 of the 22, and the line names each one", async () => {
    const bridges = await loadBridges();
    const declared = bridges.filter((b) => b.frontmatter.subject);
    expect(declared.length).toBeGreaterThanOrEqual(22);

    const gaps: string[] = [];
    for (const bridge of declared) {
      const gap = await getGuideSubjectGap(bridge.slug);
      if (gap) {
        expect(gap, bridge.slug).toBe(bridge.frontmatter.subject!.name);
        gaps.push(bridge.slug);
      }
    }
    // 19 on 2026-09-22, and stated as the complement of the join rather than
    // as a 2nd number, so the 2 readings cannot drift apart.
    expect(gaps.length).toBe(declared.length - JOINED.length);
    expect(gaps).toContain("how-to-make-small-talk");
    expect(gaps).toContain("what-is-improv");

    // The 3 joined guides carry no line: their subject is listed above it.
    for (const { guide } of JOINED) {
      expect(await getGuideSubjectGap(guide), guide).toBeNull();
    }
  });

  it("renders the line in the concept block, and nothing when there is no gap", async () => {
    // Presence, not markup: the marker attribute and the subject's name, which
    // are what a reader and a later audit both look for. The block is rendered
    // with one concept so the line has something to be "above".
    const concepts = await getGuideConcepts("how-to-make-small-talk");
    expect(concepts.length).toBeGreaterThan(0);
    const gap = await getGuideSubjectGap("how-to-make-small-talk");
    expect(gap).toBe("Small talk");

    const withGap = renderToStaticMarkup(
      createElement(GuideConcepts, { concepts, subjectGap: gap }),
    );
    expect(withGap).toContain("data-subject-gap");
    expect(withGap).toContain(gap!);

    // A guide whose subject is one of its own concepts says nothing extra, and
    // neither does one that declares no subject: the default is no line.
    const joined = await getGuideConcepts("trust-building-exercises");
    const withoutGap = renderToStaticMarkup(
      createElement(GuideConcepts, {
        concepts: joined,
        subjectGap: await getGuideSubjectGap("trust-building-exercises"),
      }),
    );
    expect(withoutGap).not.toContain("data-subject-gap");
    expect(renderToStaticMarkup(createElement(GuideConcepts, { concepts }))).not.toContain(
      "data-subject-gap",
    );
  });

  it("is null for the guides that declare no subject", async () => {
    const bridges = await loadBridges();
    const undeclared = bridges.filter((b) => !b.frontmatter.subject);
    // 56 on 2026-09-22, including the 6 largest pages by traffic (entry 175).
    expect(undeclared.length).toBeGreaterThanOrEqual(56);
    for (const bridge of undeclared) {
      expect(await getGuideSubjectGap(bridge.slug), bridge.slug).toBeNull();
    }
  });
});

describe("what the pages carry", () => {
  /** The atoms that identify themselves either way: 6 on 2026-09-22. */
  async function identifyingAtoms() {
    const atoms = await loadAtoms();
    const declaring = atoms.filter(
      (a) => a.frontmatter.sameAs?.length || a.frontmatter.subject?.sameAs?.length,
    );
    expect(declaring.length).toBeGreaterThanOrEqual(6);
    return declaring;
  }

  it("emits the record on the DefinedTerm of every atom that declares one", async () => {
    // The data function rather than the build: this is the claim the page is
    // made from, and it holds whether or not a build exists.
    for (const atom of await identifyingAtoms()) {
      const fm = atom.frontmatter;
      const data = definedTermJsonLd(
        {
          id: fm.id,
          term: fm.title,
          url: getAtomUrl({ id: fm.id, type: fm.type }),
          type: fm.type,
          definition: fm.title,
          aliases: fm.aliases,
        },
        fm,
      );
      expect(data.sameAs, fm.id).toEqual(fm.sameAs?.length ? fm.sameAs : fm.subject!.sameAs);
    }
  });

  it.runIf(built)("serves those records in the built concept pages", async () => {
    for (const atom of await identifyingAtoms()) {
      const fm = atom.frontmatter;
      const html = builtPage(getAtomUrl({ id: fm.id, type: fm.type }));
      for (const url of fm.sameAs?.length ? fm.sameAs! : fm.subject!.sameAs!) {
        expect(serves(html, url), fm.id).toBe(true);
      }
    }
  });

  it.runIf(built)("points a joined guide's subject at the concept page's @id", async () => {
    // All 3 or none, and the debt is written down: 0 of 3 on 2026-09-22.
    // `subjectConceptId` computes the `@id`, and carrying it into the guide's
    // `about` takes 2 edits outside this change's ownership — 1 in
    // ArticleJsonLd, one in the guide route — written out in its report. Until
    // they land and the site is rebuilt this reads as 0 rather than failing on
    // markup nothing emits yet; the moment one guide serves its `@id` every
    // joined guide must serve its own, so the guard cannot pass vacuously once
    // the join is live. Delete the zero branch when it is.
    const byId = indexAtoms(await loadAtoms());
    const bridges = await loadBridges();
    const served = JOINED.filter(({ guide }) => {
      const fm = bridges.find((b) => b.slug === guide)!.frontmatter;
      const id = subjectConceptId(fm.subject, fm.entry_atoms, byId)!;
      expect(id, guide).toBeTruthy();
      return serves(builtPage(`/${guide}`), id);
    }).length;
    expect([0, JOINED.length]).toContain(served);
  });
});
