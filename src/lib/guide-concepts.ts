/**
 * The concepts a guide is built on.
 *
 * Every guide declares `entry_atoms` — the principles, techniques and terms it
 * rests on — 224 references across the 42 guides. Nothing rendered them. The
 * link graph ran one way: an atom page lists the guides that cite it, but a
 * guide never linked back to the ideas underneath it, except where the prose
 * auto-linker happened to catch a mention.
 *
 * That left the site's highest-value pages without an explicit route into the
 * concept pages they depend on, and the concept pages without links from the
 * strongest content on the site.
 */

import {
  getAtomBySlug,
  getAtomUrl,
  getBridgeBySlug,
  getPathProgressionRank,
  loadAtoms,
  loadBridges,
  loadPaths,
  loadThreads,
} from "./content";
import { getGuideHeadedConcepts, headedIds } from "./headed-concepts";
import { conceptPhrase, conceptRank, mentionCount, namedAtomIds } from "./named-concepts";
import type { AtomType } from "./schema";
import { leadParagraph, stripLeadLabel } from "./seo";

export interface GuideConcept {
  id: string;
  title: string;
  url: string;
  description: string;
  type: AtomType;
  /**
   * Whether the guide's body says the concept's title or backticks its id.
   * Guides declare 455 entry atoms and name 370 of them — 256 by title,
   * the rest through a backticked id that renders as the title (tracker
   * entry 294, 2026-09-22, corrected the same day); the block marks the
   * rest so a reader sees which ideas the page argued and which it merely
   * lists. The measure is `namesConcept` in named-concepts.ts.
   */
  named: boolean;
  /**
   * Whether a section heading says the concept's title. A heading is the
   * page's own statement of a section's subject, so a headed concept
   * outranks any mention count; 23 of 455 declared concepts are headed and
   * the rank reorders 13 blocks (tracker entry 324, 2026-09-22).
   */
  headed: boolean;
}

let _entryDemand: Promise<Map<string, number>> | null = null;

/**
 * Atom id → the search demand the guides route to it.
 *
 * Each guide's primary `traffic_potential` (the Ahrefs figure on its first
 * target keyword; a guide without one carries nothing) split evenly over its
 * `entry_atoms`, summed per atom across the corpus. Ten atoms receive 65% of
 * the 1.27 million the 78 guides carry (tracker entry 282, 2026-09-22);
 * `offers` alone 137,734. Computed once, since every guide's block reads it.
 */
export function getEntryAtomDemand(): Promise<Map<string, number>> {
  if (!_entryDemand) {
    _entryDemand = (async () => {
      const demand = new Map<string, number>();
      for (const bridge of await loadBridges()) {
        const ids = [...new Set(bridge.frontmatter.entry_atoms ?? [])];
        const potential = bridge.frontmatter.target_keywords?.[0]?.traffic_potential ?? 0;
        if (ids.length === 0 || potential <= 0) continue;
        const share = potential / ids.length;
        for (const id of ids) demand.set(id, (demand.get(id) ?? 0) + share);
      }
      return demand;
    })();
  }
  return _entryDemand;
}

/**
 * Resolved concepts for a guide, the concept the page discusses most first.
 *
 * The block rendered `entry_atoms` in declared order, and the declaration
 * is written by subject, so the first card was whichever idea the author
 * thought of first. On 2026-09-22 the sort became the corpus-wide
 * demand-weighted entry score (getEntryAtomDemand, tracker entry 282), and
 * that put a sitewide statistic in a page-level slot: `offers` carries the
 * most demand and so led every guide that declared it, including the ten
 * that barely discuss it, and the block led with the body's most-mentioned
 * concept on 16 of 78 guides against 32 under the authored order, and with
 * a concept the body never names on 9 (tracker entry 296).
 *
 * The order now reads the page first. Concepts the body names (`named`,
 * entry 294's flag) come first, ranked by the page's own mention count
 * (`mentionCount`: title mentions plus backticked ids); then the merely
 * declared ones. Demand is the tiebreak among equals and the whole order
 * of the "listed, not discussed" tail, which is where a sitewide statistic
 * belongs; declared order breaks the remaining ties. concept-block-order
 * .test.ts holds the first card to a named concept wherever there is one.
 *
 * References that no longer name a real atom are dropped rather than rendered
 * as dead links; guide-concepts.test.ts reports them so they can be fixed.
 */
export async function getGuideConcepts(slug: string): Promise<GuideConcept[]> {
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) return [];

  const ids = bridge.frontmatter.entry_atoms ?? [];
  const [demand, headed, resolved] = await Promise.all([
    getEntryAtomDemand(),
    getGuideHeadedConcepts(slug).then(headedIds),
    Promise.all(
      ids.map(async (id, declaredAt) => {
        const atom = await getAtomBySlug(id);
        if (!atom) return null;
        const mentions = mentionCount(bridge.content, atom.frontmatter.title, id);
        return {
          declaredAt,
          mentions,
          concept: {
            id,
            title: atom.frontmatter.title,
            url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
            description: leadParagraph(stripLeadLabel(atom.content), 150),
            type: atom.frontmatter.type,
            named: mentions > 0,
            headed: false,
          },
        };
      }),
    ),
  ]);

  // A concept that heads a section comes before every one that does not
  // (`conceptRank`, tracker entry 324): a heading is a claim of a section's
  // subject where a mention is a word in passing. A headed concept is always
  // named too, since the heading is in the body, so the first-card guard holds.
  const rank = (entry: { mentions: number; concept: GuideConcept }) =>
    conceptRank(entry.mentions, headed.has(entry.concept.id));
  return resolved
    .filter(
      (entry): entry is { declaredAt: number; mentions: number; concept: GuideConcept } =>
        entry !== null,
    )
    .map((entry) => ({
      ...entry,
      concept: { ...entry.concept, headed: headed.has(entry.concept.id) },
    }))
    .sort(
      (a, b) =>
        rank(b) - rank(a) ||
        (demand.get(b.concept.id) ?? 0) - (demand.get(a.concept.id) ?? 0) ||
        a.declaredAt - b.declaredAt,
    )
    .map((entry) => entry.concept);
}

/**
 * The subject a guide declares that its own graph has no concept for.
 *
 * 22 of the 78 guides declare a `subject` — a named entity with a Wikipedia
 * or Wikidata record — and on 19 of them no atom carries that title at all:
 * Collaboration, Conversation, Small talk, Body language, Public speaking,
 * Team building, Listening, Improv (tracker entry 340, 2026-09-22). The page
 * therefore tells a knowledge graph what it is about and cannot say which of
 * the concepts it is built from that is. The two disagreeing is information
 * the page should carry rather than hide, so the concept block states it.
 *
 * The measure is the corpus, not the block: the name has to match no atom
 * title anywhere, exactly and case-insensitively, which is
 * `subjectConceptId`'s rule read over every atom instead of the declared
 * ones. On the other 3 — Active listening, Trust, Viewpoints — the matching
 * atom is declared in `entry_atoms` too, so a guide never carries this line
 * about a concept that is in fact listed above it.
 *
 * Returns the subject's name as declared, so the line says the entity the way
 * the frontmatter names it; null when there is no gap to state.
 */
export async function getGuideSubjectGap(slug: string): Promise<string | null> {
  const bridge = await getBridgeBySlug(slug);
  const name = bridge?.frontmatter.subject?.name.trim();
  if (!name) return null;
  const atoms = await loadAtoms();
  const titled = atoms.some((a) => a.frontmatter.title.trim().toLowerCase() === name.toLowerCase());
  return titled ? null : name;
}

/**
 * The drills a guide's body points the reader at.
 *
 * `entry_atoms` means "the concepts this guide is built on" and is kept
 * narrow because getRelatedBridges scores on it, so it holds nine exercises
 * across the corpus while the bodies backtick 140 and 32 guides end on a
 * drill card (tracker entry 194). This reads the body instead: every
 * backticked id that resolves to an exercise, in order of first mention, the
 * declared primary CTA drill first if there is one. The concept block shows
 * these as a "Practise it" row so the block and the card agree.
 */
export async function getGuideDrills(slug: string): Promise<GuideConcept[]> {
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) return [];
  const ids: string[] = [];
  const fm = bridge.frontmatter;
  if (fm.primary_cta_type === "exercise" && fm.primary_cta_target) ids.push(fm.primary_cta_target);
  for (const m of bridge.content.matchAll(/`([a-z0-9-]+)`/g)) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  const resolved = await Promise.all(
    ids.map(async (id): Promise<GuideConcept | null> => {
      const atom = await getAtomBySlug(id);
      if (!atom || atom.frontmatter.type !== "exercise") return null;
      return {
        id,
        title: atom.frontmatter.title,
        url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
        description:
          atom.frontmatter.how_to_play ?? leadParagraph(stripLeadLabel(atom.content), 150),
        type: atom.frontmatter.type,
        // A drill is here because the body backticks its id (or the card
        // declares it), and a backticked id renders as the drill's title, so
        // the page does name it.
        named: true,
        // The drill row is not a section list; whether the drill heads one
        // is the concept block's question, not this row's.
        headed: false,
      };
    }),
  );
  return resolved.filter((d): d is GuideConcept => d !== null).slice(0, 4);
}

/**
 * The drill for the "Or do this drill" slot beside a guide's primary card.
 *
 * That slot used to read a hand map written on 2026-04-07 that named
 * Mirroring for 11 of its 20 guides; the drill it named was backticked in the
 * guide's body on one guide in twenty, so the page showed a reader three
 * answers to "what drill": the path card's, the map's, and the body's
 * (tracker entry 210, 2026-09-21). The slot now reads the body through
 * `getGuideDrills`: the first drill that is not already the primary card. When
 * the primary card is a drill (declared, or derived from the closer) that is
 * the second drill the body names; when the primary card is the entry path,
 * it is the first. Null when the body names nothing else, so a guide with one
 * drill shows it once.
 */
export function nextDrill<T extends Pick<GuideConcept, "url">>(
  drills: T[],
  primaryHref: string | undefined,
): T | null {
  return drills.find((d) => d.url !== primaryHref) ?? null;
}

export interface GuideLesson {
  id: string;
  title: string;
  href: string;
  /** How many of the guide's atoms the lesson composes. */
  shared: number;
  /**
   * The shared concepts both pages name in their own words — the guide's
   * body (title or backticked id) and the lesson's body (title) — in the
   * lesson's atom order. Empty when the overlap is entirely declared.
   */
  named: { id: string; title: string }[];
  /**
   * What the "Taught in depth" line says the two pages share, built by
   * `handOffNote` from `named`: "works through Active Listening and
   * Offers". Empty when `named` is, so an empty hand-off reads as empty.
   */
  note: string;
}

/** How many named concepts the hand-off line names before stopping. */
export const HAND_OFF_NOTE_CAP = 3;

/**
 * "works through A", "works through A and B", "works through A, B and C":
 * the first HAND_OFF_NOTE_CAP titles, as the page would say them (the
 * caller passes `conceptPhrase`, so "Judgment (Mid-Scene Evaluation)" reads
 * "Judgment"). Empty for no titles, so the caller renders nothing rather
 * than a dangling verb.
 */
export function handOffNote(titles: readonly string[]): string {
  const shown = titles.slice(0, HAND_OFF_NOTE_CAP);
  if (shown.length === 0) return "";
  const list =
    shown.length === 1
      ? shown[0]
      : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return `works through ${list}`;
}

/**
 * The lessons that teach a guide's ideas in depth.
 *
 * Guides and lessons compose the same atoms, yet only 8 of 78 guides linked a
 * lesson and 18 of 25 lessons were linked from no guide (tracker entry 145,
 * 2026-09-21); the guide layer's whole hand-off to the curriculum was a path
 * card pointing at one of two beginner paths. This joins the two layers on
 * the atoms they share: a lesson qualifies when its `atoms:` overlap the
 * guide's `entry_atoms` by at least two. Where no lesson reaches that bar on
 * the declared atoms, the body's backticked ids stand in, since `entry_atoms`
 * is kept narrow for getRelatedBridges. Ranked by overlap, then title, capped
 * at two so the line stays a line.
 */
/**
 * Lessons, ranked for a guide.
 *
 * Overlap alone picked the omnibus lesson: Traditions in Tension composes
 * ten rich-club atoms and so outranked a guide's own path lessons for 23
 * guides, sending 21 Questions and small talk to the advanced reference
 * path (tracker entry 205, 2026-09-21). The rank now reads the guide's
 * `entry_path` first: lessons on that path, then lessons on a path of the
 * same audience, then any path no more than one progression step ahead,
 * and only then overlap, normalised by the lesson's size so a ten-atom
 * lesson does not win by composing everything.
 *
 * Overlap is now read in the pages' words before their declarations. The
 * 133 hand-offs declared 313 shared atoms, and 27 of them shared no concept
 * that both the guide's body and the lesson's body actually name (tracker
 * entry 298, 2026-09-22): the guide listed the atom in frontmatter, the
 * lesson composed it, and neither said its name. Within a path tier the
 * lessons are ordered by how many shared concepts both bodies name
 * (`namedAtomIds`, entry 294's measure, backticks included), and only then
 * by the declared density and count as before. The ≥2 threshold stays on
 * the declared overlap, so the population of guides with a hand-off does
 * not move; only the choice among qualifying lessons does. Each lesson
 * carries the named concepts and a note that says them, so an empty
 * hand-off reads as empty and the author can see it. hand-off-named.test.ts
 * holds the empty count as a ceiling.
 */
export async function getGuideLessons(slug: string): Promise<GuideLesson[]> {
  const bridge = await getBridgeBySlug(slug);
  if (!bridge) return [];
  const [threads, paths, atomList] = await Promise.all([loadThreads(), loadPaths(), loadAtoms()]);
  const titleById = new Map(atomList.map((a) => [a.frontmatter.id, a.frontmatter.title]));

  const entryPath = paths.find((p) => p.frontmatter.id === bridge.frontmatter.entry_path);
  const entryAudience = new Set(entryPath?.frontmatter.audience ?? []);
  const entryRank = entryPath ? getPathProgressionRank(entryPath.frontmatter.id) : 0;

  // The best path each lesson sits on, by the guide's point of view.
  const pathTier = (threadId: string): number => {
    let best = 3; // no path at all
    for (const p of paths) {
      if (!p.frontmatter.threads.includes(threadId)) continue;
      if (p.frontmatter.id === bridge.frontmatter.entry_path) return 0;
      const shared = (p.frontmatter.audience ?? []).some((a) => entryAudience.has(a));
      const ahead = getPathProgressionRank(p.frontmatter.id) - entryRank;
      const tier = shared ? 1 : ahead <= 1 ? 2 : 3;
      best = Math.min(best, tier);
    }
    return best;
  };

  const rank = (atomIds: string[]): GuideLesson[] => {
    const atoms = new Set(atomIds);
    if (atoms.size === 0) return [];
    return threads
      .map((t) => {
        const sharedIds = [...new Set(t.frontmatter.atoms.filter((a) => atoms.has(a)))];
        const shared = sharedIds.length;
        // The shared concepts both bodies name. Only ids that resolve to an
        // atom can be named; a dangling declaration counts on neither side.
        const sharedAtoms = sharedIds
          .filter((id) => titleById.has(id))
          .map((id) => ({ id, title: titleById.get(id)! }));
        const guideNames = namedAtomIds(bridge.content, sharedAtoms);
        const lessonNames = namedAtomIds(t.content, sharedAtoms);
        const named = sharedAtoms.filter((a) => guideNames.has(a.id) && lessonNames.has(a.id));
        return {
          id: t.frontmatter.id,
          title: t.frontmatter.title,
          href: `/threads/${t.frontmatter.id}`,
          shared,
          named,
          note: handOffNote(named.map((a) => conceptPhrase(a.title))),
          tier: pathTier(t.frontmatter.id),
          density: shared / Math.max(1, t.frontmatter.atoms.length),
        };
      })
      .filter((l) => l.shared >= 2)
      .sort(
        (a, b) =>
          a.tier - b.tier ||
          b.named.length - a.named.length ||
          b.density - a.density ||
          b.shared - a.shared ||
          a.title.localeCompare(b.title),
      )
      .slice(0, 2)
      .map(({ id, title, href, shared, named, note }) => ({
        id,
        title,
        href,
        shared,
        named,
        note,
      }));
  };

  const declared = rank(bridge.frontmatter.entry_atoms ?? []);
  if (declared.length > 0) return declared;
  return rank([...bridge.content.matchAll(/`([a-z0-9-]+)`/g)].map((m) => m[1]));
}

/**
 * How many of a guide's declared ideas the path it sends the reader to
 * actually teaches.
 *
 * `entry_path` is chosen by audience and `entry_atoms` by subject, and the
 * two were never joined: the path teaches a median 40% of a guide's entry
 * atoms, and for 57 of 78 guides another path teaches more (tracker entry
 * 206, 2026-09-21). The card that sends the reader to the path now says the
 * number, so the promise on the card is the one the path can keep.
 */
export async function pathTeachesOfGuide(
  slug: string,
): Promise<{ taught: number; declared: number } | null> {
  const bridge = await getBridgeBySlug(slug);
  if (!bridge?.frontmatter.entry_path) return null;
  const [paths, threads] = await Promise.all([loadPaths(), loadThreads()]);
  const path = paths.find((p) => p.frontmatter.id === bridge.frontmatter.entry_path);
  if (!path) return null;
  const taughtAtoms = new Set(
    threads
      .filter((t) => path.frontmatter.threads.includes(t.frontmatter.id))
      .flatMap((t) => t.frontmatter.atoms),
  );
  const declared = new Set(bridge.frontmatter.entry_atoms ?? []);
  return {
    taught: [...declared].filter((a) => taughtAtoms.has(a)).length,
    declared: declared.size,
  };
}

export interface HandingOffGuide {
  slug: string;
  title: string;
  href: string;
  /** How many of the guide's atoms the lesson composes. */
  shared: number;
}

/** How many guides the lesson page names before stopping; the line stays a line. */
export const HANDING_OFF_GUIDES_CAP = 8;

let _guideLessonsIndex: Promise<Map<string, HandingOffGuide[]>> | null = null;

/**
 * Lesson id → the guides whose "Taught in depth" line names it.
 *
 * Tracker entry 220 (2026-09-21): 133 guide → lesson links from that line,
 * 8 answered from the lesson page, because a lesson lists its atoms and its
 * path and nothing computes which guides chose it. Built by running
 * `getGuideLessons` over every guide once and inverting the result, so the
 * lesson page can only name a guide whose line names the lesson: one
 * function, read from both ends. block-reciprocity.test.ts asserts it.
 */
function guideLessonsIndex(): Promise<Map<string, HandingOffGuide[]>> {
  if (!_guideLessonsIndex) {
    _guideLessonsIndex = (async () => {
      const bridges = await loadBridges();
      const index = new Map<string, HandingOffGuide[]>();
      for (const bridge of bridges) {
        for (const lesson of await getGuideLessons(bridge.slug)) {
          const list = index.get(lesson.id) ?? [];
          list.push({
            slug: bridge.slug,
            title: bridge.frontmatter.title,
            href: `/${bridge.slug}`,
            shared: lesson.shared,
          });
          index.set(lesson.id, list);
        }
      }
      // The guide that shares most of the lesson's ideas first, then by title.
      for (const list of index.values()) {
        list.sort((a, b) => b.shared - a.shared || a.title.localeCompare(b.title));
      }
      return index;
    })();
  }
  return _guideLessonsIndex;
}

/** The guides whose "Taught in depth" line hands the reader to a lesson. */
export async function guidesHandingOffTo(threadId: string): Promise<HandingOffGuide[]> {
  return (await guideLessonsIndex()).get(threadId) ?? [];
}
