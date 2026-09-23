import fs from "fs";
import path from "path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArticleJsonLd } from "../../components/ArticleJsonLd";
import { CitedWorkJsonLd } from "../../components/CitedWorkJsonLd";
import { definedTermJsonLd } from "../../components/DefinedTermJsonLd";
import { getAtomUrl, loadAtoms } from "../content";
import { isGlossaryType } from "../glossary";
import {
  articleId,
  atomCitations,
  atomMentions,
  CITED_BY_CAP,
  citedWorkId,
  definedTermId,
  EDGE_CAP,
  indexAtoms,
  workCitedBy,
} from "../jsonld-edges";
import type { AtomFrontmatter } from "../schema";
import { SITE_URL } from "../seo";

/**
 * The typed edges must reach the markup, and reach it as ids that resolve.
 *
 * On 2026-09-21 the build declared 261 entities with `@id`s and 258 of them
 * were referenced by no other page. A concept page's JSON-LD named the
 * glossary set, the series, the author, the breadcrumb and its image, and not
 * one of the 2,435 typed edges the concept has; the 328 edges from concepts
 * into the 32 library works — the citations the Book markup was written to
 * make matchable — appeared as `citation` on no page in either direction
 * (novel-insights entry 261). The graph was machine-readable in the curriculum
 * and invisible in the concept layer where it lives.
 *
 * Three things can go wrong from here, and each has a test: the lists can
 * silently empty (an edge filter that stops matching), the ids can drift from
 * the declarations they point at (a component changes its `@id` shape and the
 * references become dangling nodes), and the build can stop carrying them (a
 * call site drops the prop). The first two are checked without a build, by
 * building both sides through the components' own output; the third reads
 * the built pages.
 */

const APP = path.join(process.cwd(), ".next", "server", "app");
/**
 * Cross-page `@id` references in the build; see the last test.
 *
 * Measured 2026-09-22, after entry 261 was applied: 549 declared ids, 365
 * referenced from a page other than the one declaring them, 3,863 page-id
 * pairs. Before: 229 / 190 / 1,101. The floors sit just under. The 184 ids
 * still referenced from nowhere are the Articles no concept cites — guides,
 * lessons, hubs, the library entries' own — the 25 `#lesson` ids (paths name
 * lessons by URL, not id), the site and the organisation.
 */
const FLOOR_IDS = 360;
const FLOOR_REFS = 3800;
/** A build directory is not a finished build. Name a page the build always produces. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

type Node = Record<string, unknown>;

/** The `@id` of the JSON-LD a component renders, read the way a crawler would. */
function renderedId(element: ReactElement): string {
  const html = renderToStaticMarkup(element);
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  expect(json, "component renders one JSON-LD block").toBeTruthy();
  const data = JSON.parse(json!) as Node;
  expect(typeof data["@id"]).toBe("string");
  return data["@id"] as string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

/** Every JSON-LD block on a built page, parsed. Throws on a block that does not parse. */
function blocks(html: string): Node[] {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as Node,
  );
}

/** The top-level entities of a block: the block itself, or its @graph members. */
function roots(block: Node): Node[] {
  if (Array.isArray(block["@graph"])) return block["@graph"] as Node[];
  return [block];
}

/** Every `@id` nested inside an entity (not the entity's own). */
function nestedIds(node: unknown, acc: string[] = [], top = true): string[] {
  if (Array.isArray(node)) {
    for (const item of node) nestedIds(item, acc, top);
    return acc;
  }
  if (!node || typeof node !== "object") return acc;
  const obj = node as Node;
  if (!top && typeof obj["@id"] === "string") acc.push(obj["@id"]);
  for (const [key, value] of Object.entries(obj)) if (key !== "@id") nestedIds(value, acc, false);
  return acc;
}

function pageFor(url: string): string {
  return path.join(APP, `${url === "/" ? "index" : url.slice(1)}.html`);
}

function edgesInto(atoms: AtomFrontmatter[], byId: Map<string, AtomFrontmatter>) {
  let citations = 0;
  let mentions = 0;
  let mentionsCapped = 0;
  for (const fm of atoms) {
    const targets = new Set((fm.links ?? []).map((l) => l.id));
    let refs = 0;
    let concepts = 0;
    for (const id of targets) {
      const target = byId.get(id);
      if (!target) continue;
      if (target.type === "reference") refs++;
      else if (isGlossaryType(target.type)) concepts++;
    }
    citations += refs;
    mentions += concepts;
    mentionsCapped += Math.min(concepts, EDGE_CAP);
  }
  return { citations, mentions, mentionsCapped };
}

describe("jsonld-edges: the graph's edges as JSON-LD references", () => {
  it("emits one citation per outbound edge into a work, and the count is the graph's", async () => {
    const atoms = (await loadAtoms()).map((a) => a.frontmatter);
    const byId = indexAtoms(await loadAtoms());
    expect(atoms.length).toBeGreaterThanOrEqual(200);

    const expected = edgesInto(atoms, byId);
    const emitted = atoms.reduce((n, fm) => n + atomCitations(fm, byId).length, 0);

    // 328 on 2026-09-22: 213 `extends`, 100 `illustrates`, 15 `contrasts`.
    // Entry 261's "509 illustrates edges" counts the 409 from drills into
    // concepts as well; only the 100 into works are citations.
    expect(expected.citations).toBeGreaterThanOrEqual(320);
    expect(emitted).toBe(expected.citations);
  });

  it("emits one mention per outbound edge into a concept, less the cap", async () => {
    const atoms = (await loadAtoms()).map((a) => a.frontmatter);
    const byId = indexAtoms(await loadAtoms());

    const expected = edgesInto(atoms, byId);
    const emitted = atoms.reduce((n, fm) => n + atomMentions(fm, byId).length, 0);

    // 2,107 edges on 2026-09-22; one atom (game-of-the-scene, 21) exceeds the
    // cap of 20, so 2,106 are emitted. The cap must stay a rounding error: if
    // it ever costs more than a handful of edges, raise it rather than this.
    expect(expected.mentions).toBeGreaterThanOrEqual(2000);
    expect(emitted).toBe(expected.mentionsCapped);
    expect(expected.mentions - emitted).toBeLessThanOrEqual(5);
    for (const fm of atoms) {
      expect(atomMentions(fm, byId).length).toBeLessThanOrEqual(EDGE_CAP);
      expect(atomCitations(fm, byId).length).toBeLessThanOrEqual(EDGE_CAP);
    }
  });

  it("names each work's citing concepts under subjectOf, the exact inverse of citation", async () => {
    const atoms = (await loadAtoms()).map((a) => a.frontmatter);
    const byId = indexAtoms(await loadAtoms());
    const works = atoms.filter((a) => a.type === "reference");
    expect(works.length).toBeGreaterThanOrEqual(30);

    const forward = new Set<string>();
    for (const fm of atoms) {
      for (const c of atomCitations(fm, byId)) forward.add(`${fm.id} -> ${c["@id"]}`);
    }
    const reverse = new Set<string>();
    for (const work of works) {
      const citedBy = workCitedBy(work.id, byId);
      expect(citedBy.length).toBeLessThanOrEqual(CITED_BY_CAP);
      const workId = citedWorkId(getAtomUrl({ id: work.id, type: work.type }));
      for (const ref of citedBy) {
        const atom = atoms.find(
          (a) => articleId(getAtomUrl({ id: a.id, type: a.type })) === ref["@id"],
        );
        expect(atom, ref["@id"]).toBeTruthy();
        reverse.add(`${atom!.id} -> ${workId}`);
      }
    }
    // The most-cited work has 48 citing concepts against a cap of 50; a cut
    // would show up here as a forward edge with no reverse.
    expect(reverse.size).toBeGreaterThanOrEqual(320);
    expect([...forward].filter((e) => !reverse.has(e))).toEqual([]);
    expect([...reverse].filter((e) => !forward.has(e))).toEqual([]);
  });

  it("points every reference at the @id the target's own component declares", async () => {
    const loaded = await loadAtoms();
    const atoms = loaded.map((a) => a.frontmatter);
    const byId = indexAtoms(loaded);

    // The declaration side, built by rendering the components — the same
    // code path the pages take, not the helper the references are built with.
    const declaredTerms = new Set<string>();
    const declaredArticles = new Set<string>();
    const declaredWorks = new Set<string>();
    for (const atom of loaded) {
      const fm = atom.frontmatter;
      const url = getAtomUrl({ id: fm.id, type: fm.type });
      declaredArticles.add(renderedId(ArticleJsonLd({ title: fm.title, description: "d", url })));
      if (isGlossaryType(fm.type)) {
        declaredTerms.add(
          definedTermJsonLd({ id: fm.id, term: fm.title, url, type: fm.type, definition: "d" }, fm)[
            "@id"
          ],
        );
      }
      if (fm.type === "reference" && fm.work) {
        declaredWorks.add(renderedId(CitedWorkJsonLd({ work: fm.work, url, description: "d" })));
      }
    }
    expect(declaredTerms.size).toBeGreaterThanOrEqual(170);
    expect(declaredWorks.size).toBeGreaterThanOrEqual(30);
    expect(declaredArticles.size).toBeGreaterThanOrEqual(200);

    // The three id shapes are distinct, so one URL never names two entities.
    const sample = getAtomUrl({ id: "be-present", type: "principle" });
    expect(new Set([definedTermId(sample), articleId(sample), citedWorkId(sample)]).size).toBe(3);

    let citations = 0;
    let mentions = 0;
    let citedBy = 0;
    for (const fm of atoms) {
      for (const c of atomCitations(fm, byId)) {
        citations++;
        expect(declaredWorks.has(c["@id"]), `${fm.id} cites ${c["@id"]}`).toBe(true);
        expect(["Book", "Blog", "PodcastSeries", "ScholarlyArticle"]).toContain(c["@type"]);
        expect(c.name.length).toBeGreaterThan(0);
      }
      for (const m of atomMentions(fm, byId)) {
        mentions++;
        expect(declaredTerms.has(m["@id"]), `${fm.id} mentions ${m["@id"]}`).toBe(true);
        expect(m["@type"]).toBe("DefinedTerm");
      }
      if (fm.type === "reference") {
        for (const a of workCitedBy(fm.id, byId)) {
          citedBy++;
          expect(declaredArticles.has(a["@id"]), `${fm.id} cited by ${a["@id"]}`).toBe(true);
          expect(a["@type"]).toBe("Article");
        }
      }
    }
    // Guard the guard: the loops above ran over the real lists.
    expect(citations).toBeGreaterThanOrEqual(320);
    expect(mentions).toBeGreaterThanOrEqual(2000);
    expect(citedBy).toBeGreaterThanOrEqual(320);
  });

  it.runIf(built)("every JSON-LD block in the build still parses", () => {
    const pages = walk(APP);
    let withMarkup = 0;
    let count = 0;
    for (const file of pages) {
      const parsed = blocks(fs.readFileSync(file, "utf-8"));
      if (parsed.length) withMarkup++;
      count += parsed.length;
    }
    // 377 of 378 pages on 2026-09-22 (the 404 has none); 1,982 blocks.
    expect(withMarkup).toBeGreaterThanOrEqual(370);
    expect(count).toBeGreaterThanOrEqual(1900);
  });

  it.runIf(built)("a built concept page cites, and the work it cites declares the id", async () => {
    const loaded = await loadAtoms();
    const byId = indexAtoms(loaded);
    const citing = loaded
      .map((a) => a.frontmatter)
      .filter((fm) => fm.type !== "reference" && atomCitations(fm, byId).length > 0);
    // Every fifth citing concept, so the sample spans the routes.
    const sample = citing.filter((_, i) => i % 5 === 0);
    expect(sample.length).toBeGreaterThanOrEqual(20);

    for (const fm of sample) {
      const url = getAtomUrl({ id: fm.id, type: fm.type });
      const page = blocks(fs.readFileSync(pageFor(url), "utf-8"));
      const article = page.find((b) => b["@type"] === "Article");
      expect(article, `${url} Article`).toBeTruthy();
      expect(article!["@id"]).toBe(articleId(url));
      const citation = article!.citation as Node[];
      const mentions = article!.mentions as Node[];
      expect(citation.map((c) => c["@id"])).toEqual(atomCitations(fm, byId).map((c) => c["@id"]));
      expect(mentions.map((m) => m["@id"])).toEqual(atomMentions(fm, byId).map((m) => m["@id"]));

      for (const cited of citation) {
        const workUrl = (cited["@id"] as string).replace(SITE_URL, "").replace(/#work$/, "");
        const library = blocks(fs.readFileSync(pageFor(workUrl), "utf-8"));
        const work = library.find((b) => b["@id"] === cited["@id"]);
        expect(work, `${workUrl} declares ${cited["@id"]}`).toBeTruthy();
        expect(work!["@type"]).toBe(cited["@type"]);
        // And the work points back at this page's Article.
        const subjectOf = work!.subjectOf as Node[];
        expect(
          subjectOf.map((s) => s["@id"]),
          `${workUrl} subjectOf`,
        ).toContain(articleId(url));
      }
      for (const m of mentions.slice(0, 3)) {
        const termUrl = (m["@id"] as string).replace(SITE_URL, "");
        const term = blocks(fs.readFileSync(pageFor(termUrl), "utf-8")).find(
          (b) => b["@type"] === "DefinedTerm",
        );
        expect(term?.["@id"], `${termUrl} declares its DefinedTerm`).toBe(m["@id"]);
      }
    }
  });

  it.runIf(built)("declared @ids are referenced from other pages, at the graph's scale", () => {
    const declaredOn = new Map<string, Set<string>>();
    const referencedOn = new Map<string, Set<string>>();
    const pages = walk(APP);
    for (const file of pages) {
      const page = path.relative(APP, file);
      for (const block of blocks(fs.readFileSync(file, "utf-8"))) {
        for (const root of roots(block)) {
          const id = root["@id"];
          if (typeof id === "string") {
            if (!declaredOn.has(id)) declaredOn.set(id, new Set());
            declaredOn.get(id)!.add(page);
          }
          for (const id of nestedIds(root)) {
            if (!referencedOn.has(id)) referencedOn.set(id, new Set());
            referencedOn.get(id)!.add(page);
          }
        }
      }
    }
    // A cross-page reference: a nested @id on a page whose own blocks do not
    // declare it as a top-level entity.
    let references = 0;
    const referencedIds = new Set<string>();
    for (const [id, pages] of referencedOn) {
      const declared = declaredOn.get(id);
      if (!declared) continue;
      const elsewhere = [...pages].filter((p) => !declared.has(p));
      if (elsewhere.length) referencedIds.add(id);
      references += elsewhere.length;
    }
    // Guard the guard.
    expect(declaredOn.size).toBeGreaterThanOrEqual(250);

    // Before entry 261 was applied, the 1,101 pairs were almost all the
    // author, the series, the glossary set and the vocabulary hub's term
    // list; the 2,762 added are the edges — 328 citations, 328 reverse
    // references and 2,106 mentions. See the floors' note above.
    expect(referencedIds.size).toBeGreaterThanOrEqual(FLOOR_IDS);
    expect(references).toBeGreaterThanOrEqual(FLOOR_REFS);

    // The entities the entry was about: every work and every DefinedTerm is
    // now named from a concept page, not only from a hub.
    const worksUnreferenced = [...declaredOn.keys()].filter(
      (id) => id.endsWith("#work") && !referencedIds.has(id),
    );
    expect(worksUnreferenced).toEqual([]);
  });
});
