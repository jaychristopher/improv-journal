/**
 * Which concepts head a section of a guide.
 *
 * A guide page carries 2 maps of itself: the contents list, built from its
 * `##`/`###` headings, and the concept block, built from `entry_atoms`. On
 * 2026-09-22 the 78 guides carried 1,268 section headings and declared 455
 * concepts, and only 20 of the 455 ever headed a section; on 61 guides no
 * heading named a declared concept at all, while 31 headings named a
 * linkable concept the guide did not declare, 28 of them exercises on the
 * exercise guides ("2. Mirroring", "5. Blind Offer", "10. The Machine" on
 * active-listening-exercises, which declares principles). The reader who
 * arrives from the block and the reader who arrives from the contents were
 * reading 2 accounts of what the page is about, and a section headed with
 * the concept's title — the strongest naming a page has — was the 1 form
 * the named-concept rank did not count (tracker entry 324).
 *
 * This module is that measurement as code. Three surfaces read it: the
 * concept block ranks a headed concept above any mention count
 * (`conceptRank` in named-concepts.ts); the exercise guides get a derived
 * "drills walked through" row from the headed, undeclared exercises
 * (`walkedDrills`), so `entry_atoms` keeps its narrow meaning; and the
 * contents list marks a section whose heading is a concept's title with a
 * link to the concept (`conceptMarks`).
 *
 * The match is the site's own autolink rule (`shouldAutolinkPhrase` in
 * content.ts): a title of 2 or more words always qualifies, a one-word
 * title never does when GENERIC_ONE_WORD_ATOM_TITLES lists it, and
 * otherwise needs 12 characters for a definition and 9 for any other type,
 * so "Status" and "Trust" head nothing here for the reason they link
 * nowhere in the prose. The heading is read without its leading "N."
 * numbering and without any parenthetical, and has to say the title as a
 * whole phrase, in any case — `namesConcept`, the rule the named-concept
 * measure applies to the body — so "Side-Coaching: Adjust Without
 * Stopping" is headed by side-coaching and "2. Mirroring" by mirroring,
 * while "Status Awareness" is headed by nothing. Requiring the heading to
 * *equal* the title instead finds 2 declared concepts heading anything
 * across the corpus, which is not the measure the tracker took. Under
 * this rule the code reads 33 declared headings, 34 undeclared (29
 * exercises), 23 of 455 declared concepts headed, 58 guides with no
 * declared heading and 12 with an undeclared one, against the tracker's
 * 30 / 31 / 20 / 61 / 11 from a hand-run script; headed-concepts.test.ts
 * records both.
 */

import {
  GENERIC_ONE_WORD_ATOM_TITLES,
  getAtomUrl,
  getBridgeBySlug,
  loadAtoms,
  loadBridges,
} from "./content";
import { type ContentHeading, contentsFor } from "./headings";
import { conceptPhrase, namesConcept } from "./named-concepts";
import type { AtomType } from "./schema";

/** An atom as the matcher needs it: id, title and type for the rule, type again for the url. */
export interface HeadableAtom {
  id: string;
  title: string;
  type: AtomType;
}

/** A section whose heading is a concept's title. */
export interface HeadedConcept {
  id: string;
  title: string;
  type: AtomType;
  url: string;
  /** The anchor the contents list already points at. */
  headingId: string;
  /** The heading as rendered, numbering and all. */
  headingText: string;
}

export interface HeadedConcepts {
  /** Headed by a concept the guide declares in `entry_atoms`, 1 entry per heading. */
  declared: HeadedConcept[];
  /** Headed by a linkable concept the guide does not declare, 1 entry per heading. */
  undeclared: HeadedConcept[];
}

/**
 * The heading as a concept title would have to read: "2. Mirroring" is
 * "Mirroring", "Beats (First / Second / Third)" is "Beats". Only a leading
 * ordinal is stripped, so "12 Angry Men" would keep its number.
 */
export function sectionPhrase(headingText: string): string {
  return conceptPhrase(headingText.replace(/^\s*\d+\s*[.):]\s*/, ""));
}

/**
 * Whether a title is one the site would link from prose — the atom branch
 * of `shouldAutolinkPhrase` in content.ts, repeated here because that
 * function is private to the renderer. A title that would not link in a
 * sentence does not head a section either, or "Status" would head 46
 * sections on a guide that is about status and the mark would say nothing.
 */
export function headableTitle(title: string, type: AtomType): boolean {
  const phrase = conceptPhrase(title);
  if (phrase.length < 6) return false;
  if (phrase.split(" ").length >= 2) return true;
  if (GENERIC_ONE_WORD_ATOM_TITLES.has(phrase.toLowerCase())) return false;
  return phrase.length >= (type === "definition" ? 12 : 9);
}

/**
 * The sections of a guide headed by a concept's title, split by whether
 * the guide declares the concept: 1 entry per heading and concept, in page
 * order, so a heading naming 2 unrelated concepts yields 2. `headings` is what
 * `contentsFor` gives the contents list, so a mark here lands on an anchor
 * the list shows. The scan is every heading against every headable title;
 * the callers are build-time and the corpus is a few hundred of each.
 */
export function headedConcepts(
  headings: readonly ContentHeading[],
  atoms: readonly HeadableAtom[],
  declaredIds: readonly string[],
): HeadedConcepts {
  const headable = atoms.filter((atom) => headableTitle(atom.title, atom.type));
  const declaredSet = new Set(declaredIds);
  const declared: HeadedConcept[] = [];
  const undeclared: HeadedConcept[] = [];
  for (const heading of headings) {
    const phrase = sectionPhrase(heading.text);
    const named = headable.filter((atom) => namesConcept(phrase, atom.title));
    // "6. Group Mind Cultivation" names the exercise and, inside it, the
    // definition "Group Mind". The heading is about the longer one; a title
    // another matched title contains as a whole phrase is dropped.
    const longest = named.filter(
      (atom) =>
        !named.some(
          (other) => other !== atom && namesConcept(conceptPhrase(other.title), atom.title),
        ),
    );
    for (const atom of longest) {
      const headed: HeadedConcept = {
        id: atom.id,
        title: atom.title,
        type: atom.type,
        url: getAtomUrl(atom),
        headingId: heading.id,
        headingText: heading.text,
      };
      (declaredSet.has(atom.id) ? declared : undeclared).push(headed);
    }
  }
  return { declared, undeclared };
}

/** The ids of every concept that heads a section, declared or not. */
export function headedIds(headed: HeadedConcepts): Set<string> {
  return new Set([...headed.declared, ...headed.undeclared].map((h) => h.id));
}

/**
 * Below this many exercise-headed sections a guide is not organised by
 * drill, and a row saying so would be a marker that does not discriminate
 * (tracker entry 323). At 2, the row appears on 6 of 78 guides (the
 * tracker's 11 counted guides with any undeclared heading, most of them a
 * single one), the 5 exercise guides and how-to-be-more-creative.
 */
export const WALKED_DRILLS_MIN = 2;

/**
 * The exercises a guide walks through section by section without
 * declaring: 1 entry per exercise, in page order, or nothing when fewer
 * than WALKED_DRILLS_MIN sections are headed by one. Derived from the
 * headings, so `entry_atoms` — which getRelatedBridges scores on and must
 * not widen — is untouched.
 */
export function walkedDrills(headed: HeadedConcepts): HeadedConcept[] {
  const seen = new Set<string>();
  const drills = headed.undeclared.filter((h) => {
    if (h.type !== "exercise" || seen.has(h.id)) return false;
    seen.add(h.id);
    return true;
  });
  return drills.length >= WALKED_DRILLS_MIN ? drills : [];
}

/** What the contents list needs to mark a section: 1 per headed section. */
export interface ConceptMark {
  headingId: string;
  href: string;
  title: string;
}

export function conceptMarks(headed: HeadedConcepts): ConceptMark[] {
  return [...headed.declared, ...headed.undeclared].map((h) => ({
    headingId: h.headingId,
    href: h.url,
    title: h.title,
  }));
}

/** The headed concepts of 1 guide, from its rendered contents. */
export async function getGuideHeadedConcepts(slug: string): Promise<HeadedConcepts> {
  const [bridge, atoms] = await Promise.all([getBridgeBySlug(slug), loadAtoms()]);
  if (!bridge) return { declared: [], undeclared: [] };
  return headedConcepts(
    contentsFor(bridge.html),
    atoms.map((a) => a.frontmatter),
    bridge.frontmatter.entry_atoms ?? [],
  );
}

interface PageHeadedShare {
  slug: string;
  /** Sections the contents list shows. */
  headings: number;
  /** Declared ids that resolve to a real atom, deduplicated. */
  declared: number;
  /** Of those, how many head at least 1 section. */
  headed: number;
  /** Headings naming a declared concept. */
  declaredHeadings: number;
  /** Headings naming a concept the guide does not declare. */
  undeclaredHeadings: number;
  /** The exercises `walkedDrills` would list. */
  walked: string[];
}

interface LayerHeadedShare {
  pages: PageHeadedShare[];
  headings: number;
  declared: number;
  headed: number;
  declaredHeadings: number;
  undeclaredHeadings: number;
  /** headed / declared, 0 when nothing is declared. */
  share: number;
}

/**
 * Per guide, what the layer declares against what its headings name, with
 * the layer's totals — `namedShare` in named-concepts.ts for headings. A
 * declared id that names no atom is not counted on either side.
 */
export async function headedShare(): Promise<LayerHeadedShare> {
  const [atoms, bridges] = await Promise.all([loadAtoms(), loadBridges()]);
  const headable = atoms.map((a) => a.frontmatter);
  const known = new Set(headable.map((a) => a.id));

  const pages: PageHeadedShare[] = bridges.map((bridge) => {
    const ids = [...new Set(bridge.frontmatter.entry_atoms ?? [])].filter((id) => known.has(id));
    const headings = contentsFor(bridge.html);
    const headed = headedConcepts(headings, headable, ids);
    const headedDeclared = new Set(headed.declared.map((h) => h.id));
    return {
      slug: bridge.slug,
      headings: headings.length,
      declared: ids.length,
      headed: headedDeclared.size,
      declaredHeadings: headed.declared.length,
      undeclaredHeadings: headed.undeclared.length,
      walked: walkedDrills(headed).map((h) => h.id),
    };
  });
  const sum = (key: keyof Omit<PageHeadedShare, "slug" | "walked">) =>
    pages.reduce((n, p) => n + p[key], 0);
  const declared = sum("declared");
  const headed = sum("headed");
  return {
    pages,
    headings: sum("headings"),
    declared,
    headed,
    declaredHeadings: sum("declaredHeadings"),
    undeclaredHeadings: sum("undeclaredHeadings"),
    share: declared ? headed / declared : 0,
  };
}
