import { ageNormalisedRank, byRank, newestCohort, reserveNewestSlot } from "@/lib/atom-rank";
import { getAtomUrl, loadAtoms } from "@/lib/content";
import { isGlossaryType } from "@/lib/glossary";
import type { AtomFrontmatter, BridgeFrontmatter, PageSubject, WorkType } from "@/lib/schema";
import { SITE_URL } from "@/lib/seo";

/**
 * The typed edges of the content graph, as JSON-LD references.
 *
 * Every entity the build declared with an `@id` — 173 DefinedTerms, 32
 * works, 25 lessons, 11 courses — was referenced by no other page: a concept
 * page's markup named the glossary set, the podcast series, the author, the
 * breadcrumb and its image, and not one of the 2,435 typed edges the concept
 * has. The 328 edges from concepts into the library, the citations the Book
 * markup was written to make matchable, appeared as `citation` nowhere
 * (novel-insights entry 261, 2026-09-21). The graph was machine-readable in
 * the curriculum — lessons name their concepts under `about` — and invisible
 * in the concept layer where it lives.
 *
 * This module turns `links: [{ id, relation }]` into the three lists the
 * markup now carries, and owns the `@id` of every entity it points at, so a
 * reference and the declaration it resolves to are built by one function and
 * cannot drift apart:
 *
 * - `citation` on a concept's Article: its outbound edges into `reference`
 *   atoms, as the work's `@id`. schema.org: "a citation or reference to
 *   another creative work, such as another publication, web page, scholarly
 *   article, etc." Any relation counts — `illustrates`, `extends` and
 *   `contrasts` all name the work, and the library page's "Pages that cite
 *   it" list already treats them alike.
 * - `mentions` on a page's Article: its edges into concepts, as DefinedTerm
 *   `@id`s. schema.org: "indicates that the CreativeWork contains a reference
 *   to, but is not necessarily about a concept" — exactly the claim, and true
 *   of all five relations; `about` would say the page is about its
 *   neighbours, and `isRelatedTo` is defined on Product and Service, not on
 *   CreativeWork. The entry proposed `requires` and `enables` only; that would
 *   have left out the 409 `illustrates` edges from drills to what they train
 *   and the 173 a work declares toward the concepts it informs, which are
 *   mentions by any reading.
 * - `subjectOf` on a work: the concept Articles that cite it, the inverse of
 *   the first list. See `workCitedBy`.
 *
 * `mentions` keeps the declared closure of `requires` by choice. Since
 * 2026-09-22 the reader-facing surfaces — the sidebar's two `requires`
 * groups, the search graph, the episode notes — read the relation in the
 * direct view (direct-requires.ts, tracker entries 277, 301 and 302) and
 * fold what the reduction implies, because a page is a route onward and a
 * closure read aloud says the same thing three times. Structured data is
 * not a route: it is the one place the full declaration belongs, since a
 * consumer of the markup is reading the graph, not walking it, and an
 * implied edge is still an edge the author declared. So this module reads
 * `frontmatter.links` as written, names the choice here rather than
 * importing the accessor, and `requires-views.test.ts` checks the comment
 * stays. Should a page ever want `mentions` to match its sidebar, that is a
 * decision to record in the tracker, not a drift to let happen.
 */

/**
 * Outbound lists are cut at twenty. Today no concept cites more than six
 * works and one (`game-of-the-scene`, 21) names more than twenty concepts,
 * so the cap costs one edge of 2,107; it is there so a future hub atom
 * cannot ship a hundred-item list.
 */
export const EDGE_CAP = 20;

/**
 * A work's inverse list is cut at fifty, ordered by how much the graph leans
 * on the citing concept for its age so a cut keeps the concepts the rest of
 * the graph leans on. The most-cited work today has 48 citing concepts;
 * nothing is truncated.
 */
export const CITED_BY_CAP = 50;

/**
 * Citing concepts the library page shows before its fold. The most-cited
 * work has 48; twelve is the sidebar's INBOUND_GROUP_LIMIT, so a long list
 * there is cut where the concept pages cut theirs, and the rest sit behind
 * one native fold rather than being dropped. Held here, not on the page,
 * because the order reserves a slot at this boundary (`citingConcepts`) and
 * the page and the Book's `subjectOf` must read one list.
 */
export const CITED_BY_OPEN = 12;

/** The `@id` DefinedTermJsonLd declares for a concept: its canonical page URL. */
export function definedTermId(url: string): string {
  return `${SITE_URL}${url}`;
}

/**
 * The `@id` CitedWorkJsonLd declares for a work. A fragment, because the bare
 * page URL is already the `@id` of the WebPage in the work's `subjectOf`, and
 * one `@id` cannot be both a Book and the page about the book.
 */
export function citedWorkId(url: string): string {
  return `${SITE_URL}${url}#work`;
}

/**
 * The `@id` ArticleJsonLd declares for a page's Article. A fragment for the
 * same reason: on a concept page the bare URL is the DefinedTerm.
 */
export function articleId(url: string): string {
  return `${SITE_URL}${url}#article`;
}

export interface CitationRef {
  "@type": WorkType;
  "@id": string;
  name: string;
}

export interface DefinedTermRef {
  "@type": "DefinedTerm";
  "@id": string;
  name: string;
}

export interface ArticleRef {
  "@type": "Article";
  "@id": string;
  name: string;
  url: string;
}

export type AtomIndex = Map<string, AtomFrontmatter>;

/** The lookup every function here takes, built once from `loadAtoms()`. */
export function indexAtoms(atoms: readonly { frontmatter: AtomFrontmatter }[]): AtomIndex {
  return new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
}

/** Resolved targets of an atom's edges, in frontmatter order, each id once. */
function targets(fm: AtomFrontmatter, byId: AtomIndex): AtomFrontmatter[] {
  const seen = new Set<string>();
  const out: AtomFrontmatter[] = [];
  for (const link of fm.links ?? []) {
    const target = byId.get(link.id);
    if (!target || seen.has(link.id)) continue;
    seen.add(link.id);
    out.push(target);
  }
  return out;
}

/**
 * The works an atom cites: every outbound edge whose target is a `reference`
 * atom with a declared work. A reference without `work` renders no Book, so
 * there is no `@id` to point at and it is skipped.
 */
export function atomCitations(fm: AtomFrontmatter, byId: AtomIndex): CitationRef[] {
  return targets(fm, byId)
    .filter((target) => target.type === "reference" && target.work)
    .slice(0, EDGE_CAP)
    .map((target) => ({
      "@type": target.work!.type,
      "@id": citedWorkId(getAtomUrl({ id: target.id, type: target.type })),
      name: target.work!.name,
    }));
}

/**
 * The concepts an atom's edges name, as the DefinedTerms their pages declare,
 * in frontmatter order. Only glossary types carry a DefinedTerm, so only
 * those are referenced; an `@id` no page declares would be a dangling node.
 */
export function atomMentions(fm: AtomFrontmatter, byId: AtomIndex): DefinedTermRef[] {
  return targets(fm, byId)
    .filter((target) => target.type !== "reference" && isGlossaryType(target.type))
    .slice(0, EDGE_CAP)
    .map((target) => ({
      "@type": "DefinedTerm",
      "@id": definedTermId(getAtomUrl({ id: target.id, type: target.type })),
      name: target.title,
    }));
}

/**
 * The concept page a guide's declared subject names, as the `@id` that page's
 * DefinedTerm carries — or undefined where the site has no concept for it.
 *
 * 22 guides declare a `subject` with an authority record and on 19 of them the
 * entity has no atom of that title at all (tracker entry 340, 2026-09-22): the
 * page tells a knowledge graph "this is about Small Talk" and cannot say which
 * of its own concepts that is. On the other 3 — Active listening, Trust,
 * Viewpoints — the site defines the entity itself, and the guide's `about`
 * pointed only outward while the concept page's DefinedTerm carried the same
 * record (definedTermSameAs), with nothing joining the two. This is the join:
 * the guide says "the thing this page is about is that Wikipedia entity, and
 * it is also this page of mine".
 *
 * The match must be exact and case-insensitive, because `subject.name` is the
 * entity's name and the atom title is this site's name for the same thing; a
 * looser rule would join "Listening" to "Active Listening", which is a
 * different concept with its own record. The guide must also declare the atom
 * in `entry_atoms`, so the join is one the author made rather than one a
 * string comparison found — all 3 do. Only a glossary type declares a
 * DefinedTerm, so only those can be pointed at; anything else would be an
 * `@id` no page resolves.
 *
 * Never widen this to a substring or a slug match. An `@id` is an identity
 * claim, and a wrong one asserts the page is about something else.
 */
export function subjectConceptId(
  subject: Pick<PageSubject, "name"> | undefined,
  entryAtoms: readonly string[] | undefined,
  byId: AtomIndex,
): string | undefined {
  const name = subject?.name.trim().toLowerCase();
  if (!name) return undefined;
  for (const id of entryAtoms ?? []) {
    const atom = byId.get(id);
    if (!atom || atom.title.trim().toLowerCase() !== name) continue;
    if (!isGlossaryType(atom.type)) continue;
    return definedTermId(getAtomUrl({ id: atom.id, type: atom.type }));
  }
  return undefined;
}

/**
 * `subjectConceptId` for a guide, from its frontmatter alone.
 *
 * The guide route holds no atom index — a concept page builds one for its
 * `citation` and `mentions` lists, a guide page has no such list — so the
 * index is built here rather than threaded through the route for one lookup.
 * `loadAtoms` is cached, so this is a map build, not a second read.
 */
export async function guideSubjectConceptId(
  fm: Pick<BridgeFrontmatter, "subject" | "entry_atoms">,
): Promise<string | undefined> {
  if (!fm.subject) return undefined;
  return subjectConceptId(fm.subject, fm.entry_atoms, indexAtoms(await loadAtoms()));
}

/**
 * The concepts that cite a work — every non-reference atom with an edge
 * toward it — in the one order the library page's "Pages that cite it" and
 * the Book's `subjectOf` both read.
 *
 * Ordered by how much the graph leans on the citing concept for its age —
 * in-degree per month since `created` (`ageNormalisedRank`, entry 307) —
 * then title. Raw in-degree was the rule until 2026-09-22, and raw
 * in-degree is age: the March concepts led every list they were in and the
 * August ones closed it. One slot in the page's open dozen is reserved for
 * the newest cohort, the way the level pages reserve beginner drills: where
 * the first CITED_BY_OPEN hold no concept from the latest month of writing
 * and a later one does, the best-ranked such concept takes the twelfth
 * slot (`reserveNewestSlot`). Only the eight works with more than a dozen
 * citers can be affected, and on 2026-09-22 the reservation moves a concept
 * on 3 of them.
 */
export function citingConcepts(workId: string, byId: AtomIndex): AtomFrontmatter[] {
  const atoms = [...byId.values()].map((frontmatter) => ({ frontmatter }));
  const rank = ageNormalisedRank(atoms);
  const citing = [...byId.values()]
    .filter((fm) => fm.type !== "reference" && (fm.links ?? []).some((l) => l.id === workId))
    .sort(byRank(rank));
  return reserveNewestSlot(citing, CITED_BY_OPEN, newestCohort(atoms));
}

/**
 * The inverse of `atomCitations`: the concept Articles that cite a work.
 *
 * schema.org has no inverse of `citation`. `subjectOf` — "a CreativeWork or
 * Event about this Thing" — is the property that runs from the work toward
 * the pages that discuss it, and the Book already carries one item under it
 * (the WebPage the entry is). `workExample` would say the concept page is an
 * edition of the book; `isBasedOn` runs the other way and belongs on the
 * concept; `citation` here would say the book cites the concept. The items
 * are the concept pages' Articles, which is the entity that does the citing
 * — a DefinedTerm is Intangible and outside `subjectOf`'s range.
 *
 * In `citingConcepts`' order, so the cap keeps the concepts the graph leans
 * on and the markup names them as the page lists them.
 */
export function workCitedBy(workId: string, byId: AtomIndex): ArticleRef[] {
  return citingConcepts(workId, byId)
    .slice(0, CITED_BY_CAP)
    .map((fm) => {
      const url = getAtomUrl({ id: fm.id, type: fm.type });
      return {
        "@type": "Article",
        "@id": articleId(url),
        name: fm.title,
        url: `${SITE_URL}${url}`,
      };
    });
}
