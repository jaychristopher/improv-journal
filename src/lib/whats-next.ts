import { ageNormalisedRank } from "@/lib/atom-rank";
import {
  getAtomBySlug,
  getAtomUrl,
  getNextAtomInThread,
  getParentPath,
  getThreadBySlug,
  getThreadsForAtom,
  loadAtoms,
  loadThreads,
} from "@/lib/content";
import { lessonAtomOrder } from "@/lib/lesson-order";
import { KNOT } from "@/lib/mini-graph-picks";
import { inboundLabel, outboundLabel } from "@/lib/relation-labels";
import type { Link } from "@/lib/schema";

/**
 * The onward proposal at the foot of an atom page.
 *
 * The card used to have six variants and every one was computed from a
 * thread, a path or a guide. An atom in none of those got nothing: 68 of 205
 * pages — all 32 references and 36 concepts, most of them the games and
 * warm-ups the site's biggest keyword routes readers to — ended with the
 * relation-grouped sidebar and no proposal at all. `related-concepts` is the
 * default the router lacked: the atom's most connected neighbours, biased
 * toward ones that sit in a lesson so the reader can rejoin a path from
 * there.
 */
type AtomWhatsNext =
  | {
      variant: "next-atom";
      title: string;
      href: string;
      lessons: LessonLine[];
    }
  | {
      variant: "back-to-thread";
      threadTitle: string;
      threadHref: string;
      lessons: LessonLine[];
    }
  | { variant: "related-concepts"; items: RelatedConcept[] };

/**
 * One lesson the concept sits in, and where that lesson goes from this page.
 *
 * Until 2026-09-22 the card read the primary lesson alone (entry 110), so a
 * concept in 2 or more lessons — 28 of the 137 in any lesson — continued its
 * primary and broke the chain of every other lesson it sat in: walked
 * through the cards in the order they walk, 10 of the 25 lessons reached
 * their last concept, and 5 on the authored list (tracker entry 326). The
 * card now carries a line per lesson, so each lesson's chain is whole on
 * every page it passes through. Cards this shape: 137 pages, 28 with 2 or
 * more lines, of which 1 has 5 and 2 have 4.
 */
export interface LessonLine {
  lessonId: string;
  lessonTitle: string;
  lessonHref: string;
  /** The concept after this one in the lesson's order; absent when this page is the lesson's last. */
  next?: { title: string; href: string };
  /**
   * On the lesson's last concept: the next lesson on the lesson's home path
   * and its first concept, so a path can be walked concept by concept past
   * each lesson's foot rather than ending at it (entry 326, bullet 3) — 6 of
   * the 22 concepts that open a lesson were the destination of no card at
   * all. Absent when the lesson is its path's last, or sits in no path.
   */
  onward?: { lessonTitle: string; lessonHref: string; title: string; href: string };
}

export interface RelatedConcept {
  id: string;
  title: string;
  href: string;
  /** How the neighbour relates, from this page's point of view. */
  hint: string;
  /** Whether the neighbour's own page carries a lesson line and a next card. */
  inLesson: boolean;
  /** Which way the step goes — see RelatedTier. */
  tier: RelatedTier;
}

export const RELATED_CONCEPTS_LIMIT = 3;

/**
 * The direction of a suggestion, from this page's point of view, in the order
 * the card ranks them. Lower is offered first.
 *
 * Until 2026-09-22 the card read `link.relation` only to print a hint and
 * ranked by lesson membership, edge count and degree, so on the 68 pages in
 * no lesson its first suggestion was an `illustrates` target 36 times, a
 * `requires` target — a step *back* to a prerequisite the sidebar's "Builds
 * on" already holds — 16 times, and an `enables` target twice, while the
 * graph's one forward relation, `enables` (256 edges, "Unlocks"), decided
 * where a reader went next on no page of the site (tracker entry 292). The
 * relation now ranks before degree: what this page unlocks, then its
 * same-type siblings, then the drills that show it, then what it extends
 * across types, then the rest, and its prerequisites last.
 */
export const RELATED_TIERS = {
  /** This page unlocks the neighbour: outbound `enables`, or the neighbour's own `requires` toward this page. */
  forward: 0,
  /** A sibling of the same type — a format that `extends` a format — either way. */
  sibling: 1,
  /** A drill that shows this: `illustrates` from an exercise. */
  drill: 2,
  /** `extends` across types — a format that extends a technique — either way. */
  extension: 3,
  /** `contrasts`, and an `illustrates` that is not a drill (this page as an example of a concept). */
  aside: 4,
  /** The neighbour is a prerequisite: outbound `requires`, or the neighbour's `enables` toward this page. */
  backward: 5,
} as const;

export type RelatedTier = keyof typeof RELATED_TIERS;

/**
 * The types a reader can *do*: a technique, a drill, a format, a way of
 * teaching. The rest — law, principle, definition, insight, framework,
 * pattern, antipattern, reference — are abstractions.
 *
 * Within the forward tier a concrete target ranks before an abstract one.
 * Of the graph's 256 `enables` edges, 143 run abstraction → abstraction and
 * 27 abstraction → practice, with technique → format at 2 (tracker entry
 * 314, 2026-09-22), so a tier that led with "what this unlocks" led with
 * another idea nine times in ten: a reader who had just finished a
 * definition and asked what it made possible was sent to a second
 * definition. The preference reads the same edges and sends the step
 * forward toward practice where the graph offers one. Measured on the 17
 * pages whose card leads with a forward target, before → after: first
 * suggestion concrete 5 → 7 — every page whose forward tier holds a
 * concrete candidate — and the other 10 have none to prefer.
 * enables-direction.test.ts holds this.
 */
export const CONCRETE_TYPES: ReadonlySet<string> = new Set([
  "technique",
  "exercise",
  "format",
  "pedagogy",
]);

/** Whether an atom of `type` is something a reader can do rather than an idea. */
export function isConcreteType(type: string): boolean {
  return CONCRETE_TYPES.has(type);
}

export interface RelatedEdge {
  direction: "outbound" | "inbound";
  relation: Link["relation"];
}

interface Candidate {
  id: string;
  title: string;
  href: string;
  type: string;
  /** Every declared edge between this atom and the neighbour, either direction, in declared order. */
  links: RelatedEdge[];
  /**
   * How much the graph leans on the neighbour for its age — in-degree per
   * month since `created` (atom-rank.ts) — so ties go to the page the
   * newer writing leans on. Total degree until 2026-09-22, which followed
   * age (entry 307).
   */
  degree: number;
  inLesson: boolean;
  /** A non-reference atom that links to this one — for references, a citer. */
  citesThis: boolean;
}

/**
 * The direction one edge gives the step, from a page of `pageType` that holds
 * `edge` to a neighbour of `neighbourType`.
 */
export function relatedTier(
  edge: RelatedEdge,
  pageType: string,
  neighbourType: string,
): RelatedTier {
  const { direction, relation } = edge;
  if (relation === "enables") return direction === "outbound" ? "forward" : "backward";
  if (relation === "requires") return direction === "inbound" ? "forward" : "backward";
  if (relation === "extends") return neighbourType === pageType ? "sibling" : "extension";
  if (relation === "illustrates" && neighbourType === "exercise") return "drill";
  return "aside";
}

/**
 * The edge that decides a neighbour's tier and its hint: the best-tiered one,
 * an outbound edge before an inbound one at the same tier (the page's own
 * claim before the neighbour's), declared order after that. A mutual pair —
 * this page `enables` the neighbour, the neighbour `requires` this page —
 * is one fact and both edges say forward.
 */
function leadEdge(pageType: string, candidate: Candidate): RelatedEdge {
  const rank = (edge: RelatedEdge) => RELATED_TIERS[relatedTier(edge, pageType, candidate.type)];
  return [...candidate.links].sort(
    (a, b) =>
      rank(a) - rank(b) || Number(a.direction === "inbound") - Number(b.direction === "inbound"),
  )[0];
}

/**
 * The atom's neighbours by declared edge, ranked for use as a fallback "next".
 *
 * Ranking, in order: for a reference, the concept atoms that cite it come
 * first (the library page's natural "next" is the idea the book supports);
 * then the tier of the relation — forward, sibling, drill, extension, aside,
 * backward;
 * then, within the forward tier only, a concrete target (CONCRETE_TYPES)
 * before an abstract one (entry 314);
 * then, within a tier, neighbours that sit in a lesson; then the number of
 * edges shared with this atom; then how much the graph leans on the
 * neighbour for its age (`ageNormalisedRank`, entry 307 — its raw degree
 * until 2026-09-22, which ranked the older neighbour); then title, so the
 * order is stable across builds.
 *
 * The knot takes one slot. Where two or more of the top `limit` would be
 * members of the 19-atom core (`KNOT`, mini-graph-picks.ts), the best-ranked
 * one stays and the rest give their slots to the atom's own neighbours, as
 * the mini graph does (entry 280): the knot is strongly connected under
 * `requires`, so naming one member names the closure, and a card that
 * offered three of them offered one destination three times.
 *
 * Measured on the 68 pages in no lesson, 2026-09-22, before → after: first
 * suggestion an `enables` target 2 → 17 (every page that has one), a
 * `requires` target 16 → 0, an `illustrates` target 36 → 30 (28 of them
 * references, whose citers lead), an `extends` target 8 → 22, a knot member
 * 38 → 24; 38 pages lead with a different atom than before.
 * whats-next-direction.test.ts holds these. The same day, the concrete
 * preference within the forward tier moved two of the 17 forward-led
 * cards: specificity leads with obvious-choice (technique) rather than
 * offers (definition), and zip-zap-zop with safety-in-the-room (pedagogy)
 * rather than ensemble (definition); enables-direction.test.ts holds that.
 */
export async function getRelatedConcepts(
  atomId: string,
  limit = RELATED_CONCEPTS_LIMIT,
): Promise<RelatedConcept[]> {
  const [atoms, threads] = await Promise.all([loadAtoms(), loadThreads()]);
  const self = atoms.find((a) => a.frontmatter.id === atomId);
  if (!self) return [];

  const inLesson = new Set(threads.flatMap((t) => t.frontmatter.atoms ?? []));
  // The tiebreak: how much the graph leans on the neighbour for its age
  // (entry 307), not its raw degree.
  const degree = ageNormalisedRank(atoms);

  const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));
  const candidates = new Map<string, Candidate>();
  const candidate = (id: string): Candidate | null => {
    if (id === atomId) return null;
    const existing = candidates.get(id);
    if (existing) return existing;
    const atom = byId.get(id);
    if (!atom) return null;
    const fresh: Candidate = {
      id,
      title: atom.frontmatter.title,
      href: getAtomUrl({ id, type: atom.frontmatter.type }),
      type: atom.frontmatter.type,
      links: [],
      degree: degree.get(id) ?? 0,
      inLesson: inLesson.has(id),
      citesThis: false,
    };
    candidates.set(id, fresh);
    return fresh;
  };

  for (const link of self.frontmatter.links ?? []) {
    const c = candidate(link.id);
    if (!c) continue;
    c.links.push({ direction: "outbound", relation: link.relation });
  }
  for (const a of atoms) {
    for (const link of a.frontmatter.links ?? []) {
      if (link.id !== atomId) continue;
      const c = candidate(a.frontmatter.id);
      if (!c) continue;
      c.links.push({ direction: "inbound", relation: link.relation });
      if (a.frontmatter.type !== "reference") c.citesThis = true;
    }
  }

  const isReference = self.frontmatter.type === "reference";
  const scored = [...candidates.values()].map((c) => {
    const lead = leadEdge(self.frontmatter.type, c);
    return { c, lead, tier: relatedTier(lead, self.frontmatter.type, c.type) };
  });
  scored.sort(
    (a, b) =>
      (isReference ? Number(b.c.citesThis) - Number(a.c.citesThis) : 0) ||
      RELATED_TIERS[a.tier] - RELATED_TIERS[b.tier] ||
      // Same tier from here. A step forward prefers something to do.
      (a.tier === "forward"
        ? Number(isConcreteType(b.c.type)) - Number(isConcreteType(a.c.type))
        : 0) ||
      Number(b.c.inLesson) - Number(a.c.inLesson) ||
      b.c.links.length - a.c.links.length ||
      b.c.degree - a.c.degree ||
      a.c.title.localeCompare(b.c.title),
  );

  // One slot for the core: the best-ranked knot member keeps its place and
  // the others step aside for the atom's own neighbours.
  const top: typeof scored = [];
  let knotTaken = false;
  for (const entry of scored) {
    if (top.length >= limit) break;
    if (KNOT.has(entry.c.id)) {
      if (knotTaken) continue;
      knotTaken = true;
    }
    top.push(entry);
  }

  return top.map(({ c, lead, tier }) => ({
    id: c.id,
    title: c.title,
    href: c.href,
    // The hint is the same word the sidebar uses for the same edge. This card
    // used to carry its own map and called the inbound `requires` edge
    // "Builds on this" while the sidebar above it said "Required by"
    // (tracker entry 227); both now read relation-labels.ts. The word is the
    // lead edge's — the one that earned the tier — so the hint says which
    // way the step goes: "Unlocks" or "Required by" for a step forward,
    // "Builds on" for a step back.
    hint:
      isReference && c.citesThis
        ? "Cites this work"
        : lead.direction === "outbound"
          ? outboundLabel(lead.relation)
          : inboundLabel(lead.relation, c.type),
    inLesson: c.inLesson,
    tier,
  }));
}

/**
 * The first concept of the lesson after `lessonId` on its home path
 * (`getParentPath`, the same path the lesson page's own "Next" reads, entry
 * 262), in that lesson's walked order — the step a reader at the foot of one
 * lesson can take without going back up to the lesson page. Null when the
 * lesson is its path's last, sits in no path, or the next lesson opens with
 * this very page (a shared concept that ends one lesson and opens the next
 * would be sent to where it stands).
 */
async function nextLessonOpener(
  lessonId: string,
  atomId: string,
): Promise<LessonLine["onward"] | null> {
  const parent = await getParentPath(lessonId);
  const siblings = parent?.frontmatter.threads ?? [];
  const idx = siblings.indexOf(lessonId);
  if (idx === -1 || idx >= siblings.length - 1) return null;
  const nextLesson = await getThreadBySlug(siblings[idx + 1]);
  if (!nextLesson) return null;
  const atoms = await loadAtoms();
  const firstId = lessonAtomOrder(
    nextLesson,
    new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter])),
  )[0];
  if (!firstId || firstId === atomId) return null;
  const first = await getAtomBySlug(firstId);
  if (!first) return null;
  return {
    lessonTitle: nextLesson.frontmatter.title,
    lessonHref: `/threads/${nextLesson.frontmatter.id}`,
    title: first.frontmatter.title,
    href: getAtomUrl({ id: firstId, type: first.frontmatter.type }),
  };
}

/** Where lesson `thread` goes from `atomId`: its next concept, or its own page and the lesson after it. */
async function lessonLine(
  atomId: string,
  thread: { frontmatter: { id: string; title: string } },
): Promise<LessonLine> {
  const lessonId = thread.frontmatter.id;
  const line: LessonLine = {
    lessonId,
    lessonTitle: thread.frontmatter.title,
    lessonHref: `/threads/${lessonId}`,
  };
  const next = await getNextAtomInThread(atomId, lessonId);
  if (next) {
    line.next = { title: next.title, href: next.url };
    return line;
  }
  const onward = await nextLessonOpener(lessonId, atomId);
  if (onward) line.onward = onward;
  return line;
}

/**
 * What the foot of an atom page should propose.
 *
 * The first two branches are the ones AtomDetail has always made: the next
 * atom in the primary lesson, or the lesson itself once the sequence is
 * exhausted. Both carry a line for every lesson the concept sits in, primary
 * first, so the variant is the primary's and the other lessons' chains
 * survive the page too (entry 326). The third is the fallback for an atom no
 * lesson composes. Returns null only when the atom has no lesson and no
 * declared neighbours in either direction — a state the graph-orphans test
 * already forbids.
 */
export async function getAtomWhatsNext(atomId: string): Promise<AtomWhatsNext | null> {
  // getThreadsForAtom puts the lessons that name the atom first, then orders
  // by the path progression, so the first entry is the earliest lesson that
  // actually discusses the concept — the same one the context banner names,
  // so the card continues the lesson the page says it belongs to.
  const threads = await getThreadsForAtom(atomId);

  if (threads.length > 0) {
    // Every lesson, uncapped: the component folds the lines past its cap
    // rather than dropping them, so the 3 pages in 4 or 5 lessons keep every
    // chain, and the client wrapper entry 326 proposes next can lift the
    // lesson the reader came from whichever it is.
    const lessons = await Promise.all(threads.map((t) => lessonLine(atomId, t)));
    const primary = lessons[0];
    if (primary.next) {
      return {
        variant: "next-atom",
        title: primary.next.title,
        href: primary.next.href,
        lessons,
      };
    }
    return {
      variant: "back-to-thread",
      threadTitle: primary.lessonTitle,
      threadHref: primary.lessonHref,
      lessons,
    };
  }

  const items = await getRelatedConcepts(atomId);
  if (items.length === 0) return null;
  return { variant: "related-concepts", items };
}
