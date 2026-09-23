import Link from "next/link";

import { lineageOf } from "@/lib/atom-lineage";
import { ageNormalisedRank, byRank } from "@/lib/atom-rank";
import { getAudioDuration } from "@/lib/audio-manifest";
import {
  getAtomBySlug,
  getAtomUrl,
  getAudioUrl,
  getBridgesForAtom,
  getInboundLinks,
  getParentPath,
  getThreadsForAtom,
  type InboundLink,
  loadAtoms,
  loadSources,
} from "@/lib/content";
import { firstContentImage } from "@/lib/content-image";
import { drillsCountering } from "@/lib/counter-drills";
import {
  CORE_ITEM_JOIN,
  coreItemLabel,
  directRequires,
  type RequiredByView,
  requiredByView,
  type RequiresGraph,
  requiresGraph,
} from "@/lib/direct-requires";
import { lessonsRecommendingDrill } from "@/lib/drill-lessons";
import { DRILL_PAIRS_LABEL, type DrillPairs, drillPairsFor, sharedNote } from "@/lib/drill-pairs";
import { drillsPreparingFor, type FormatDrills as FormatDrillsList } from "@/lib/format-drills";
import { loadImprovGames } from "@/lib/games";
import { definitionFromHtml, isGlossaryType } from "@/lib/glossary";
import { contentsFor } from "@/lib/headings";
import { atomCitations, atomMentions, indexAtoms } from "@/lib/jsonld-edges";
import { NO_SOURCE_LINE, noSourceRecorded } from "@/lib/no-source";
import { pathsLeaningOn } from "@/lib/path-prerequisites";
import { principleDrillsFacetLabel, principleFacet } from "@/lib/picker-principles";
import { principleFailures } from "@/lib/principle-failures";
import { readingMinutes } from "@/lib/reading-time";
import {
  DRILLS_LABEL,
  inboundLabel,
  isCounterEdge,
  isPairEdge,
  outboundLabel,
  pairLabel,
  RECIPROCAL,
  type Relation,
  RELATION_LABELS,
} from "@/lib/relation-labels";
import type { AtomFrontmatter } from "@/lib/schema";
import { getSeriesForPage } from "@/lib/shows-for-content";
import {
  chooseOpenGroups,
  foldSummary,
  inboundKey,
  outboundKey,
  sidebarBudgetGroups,
} from "@/lib/sidebar-budget";
import { CORE_HREF, CORE_PHRASE } from "@/lib/the-core";
import { buildTrainsIndex, trainedBy } from "@/lib/trains";
import { getAtomWhatsNext } from "@/lib/whats-next";

import { ArticleJsonLd } from "./ArticleJsonLd";
import { AudioPlayer } from "./AudioPlayer";
import { Breadcrumb, type Crumb } from "./Breadcrumb";
import { ConceptVisit } from "./ConceptVisit";
import { ContextBanner } from "./ContextBanner";
import { DefinedTermJsonLd } from "./DefinedTermJsonLd";
import { DrillPracticed } from "./DrillPracticed";
import { FormatDrills } from "./FormatDrills";
import { LineageLine } from "./LineageLine";
import { PodcastJsonLd } from "./PodcastJsonLd";
import { PromptTryLine } from "./PromptTryLine";
import { type SidebarLink, SidebarLinkGroup } from "./SidebarLinkGroup";
import { TableOfContents } from "./TableOfContents";
import { Transcript, transcriptHref } from "./Transcript";
import { UpdatedOn } from "./UpdatedOn";
import { WhatsNext } from "./WhatsNext";

const TYPE_LABELS: Record<string, string> = {
  principle: "principle",
  technique: "technique",
  exercise: "exercise",
  insight: "insight",
  definition: "concept",
  pattern: "pattern",
  antipattern: "failure mode",
  law: "why it's hard",
  framework: "framework",
  format: "format",
  pedagogy: "teaching method",
  reference: "reference",
};

/**
 * Every word the sidebar puts on an edge — outbound, inbound, the drills case,
 * and the reciprocal that lets an inbound edge be dropped as already shown —
 * comes from relation-labels.ts. Until 2026-09-21 this file held three maps of
 * its own and the related-concepts card a fourth, so the same edge had three
 * names on two pages (tracker entry 227).
 */
export { DRILLS_LABEL };

/** Display order for relation types in the sidebar */
const RELATION_ORDER: Relation[] = ["requires", "enables", "extends", "contrasts", "illustrates"];

/**
 * Which groups open is decided by size, outbound and inbound pooled, within
 * SIDEBAR_OPEN_BUDGET — see sidebar-budget.ts. The fixed counts this file
 * carried until 2026-09-22 (three outbound groups and one inbound, in
 * relation order, entry 243) opened the least where the graph is densest
 * (entry 272).
 */

/**
 * How many of an inbound group survive. `commitment` is required by seventy
 * atoms; a sidebar that lists all seventy is a wall, not a route onward, and
 * the twelve kept are the ones the rest of the graph also leans on, for
 * their age (the `rank` inboundGroupsFor takes, entry 307). The rest are
 * counted, not lost.
 */
export const INBOUND_GROUP_LIMIT = 12;

export interface InboundGroup {
  key: string;
  label: string;
  links: { id: string; title: string; url: string }[];
  /** How many the limit cut, for the "and N more" note. */
  omitted: number;
  /**
   * The "Required by" group only: the atoms that declare `requires` toward
   * this page but hold it as implied — their own "Builds on" has folded the
   * edge — kept as links in a fold under the open list (entry 301). Every
   * other group leaves this empty.
   */
  folded: FoldedHolder[];
  /**
   * The "Drills that train this" group on a principle's page only: the
   * picker facet holding the same drills, as one line under the list (entry
   * 335). The group answers the question with the edges this page received;
   * the facet is the tool the reader can take the principle into, and until
   * it existed the principles hub's "work on this one first" could not be
   * followed into the tool built to answer "which drill". Every other group
   * leaves this undefined.
   */
  facet?: { href: string; label: string };
}

/** A folded holder of an inbound `requires` edge; `viaCore` as requiredByView sets it. */
export interface FoldedHolder {
  id: string;
  title: string;
  url: string;
  viaCore: boolean;
}

/**
 * The "Required by" fold's summary: both numbers, since the closure count
 * is also information. "Required by 9 directly, 14 through the core and 47
 * through their prerequisites" on `commitment` (entry 301, 2026-09-22): the
 * nine pages that open commitment under "Builds on", the fourteen that show
 * it inside "<Title> and the core", the forty-seven whose own prerequisite
 * already requires it. The phrase "the core" is the page's link on the
 * rendered summary (`RequiredByFoldSummary`, entry 315); this is the text.
 */
export function requiredByFoldSummary(open: number, viaCore: number, viaChain: number): string {
  const parts: string[] = [];
  if (viaCore > 0) parts.push(`${viaCore} through ${CORE_PHRASE}`);
  if (viaChain > 0) parts.push(`${viaChain} through their prerequisites`);
  return `${inboundLabel("requires")} ${open} directly, ${parts.join(" and ")}`;
}

/**
 * The same summary with "the core" linking the page that defines it. Split
 * on the phrase rather than composed twice, so the text a test reads off the
 * summary is `requiredByFoldSummary`'s to the character.
 */
function RequiredByFoldSummary({
  open,
  viaCore,
  viaChain,
}: {
  open: number;
  viaCore: number;
  viaChain: number;
}) {
  const text = requiredByFoldSummary(open, viaCore, viaChain);
  const at = text.indexOf(CORE_PHRASE);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <Link href={CORE_HREF} className="hover:underline">
        {CORE_PHRASE}
      </Link>
      {text.slice(at + CORE_PHRASE.length)}
    </>
  );
}

/**
 * An edge this page declares, resolved. `type` is the neighbour's, when the
 * graph knows it; the counter case (entry 286) is decided from it.
 */
export interface OutgoingLink {
  id: string;
  relation: Relation;
  title: string;
  url: string;
  type?: string;
}

/**
 * A concept's own `illustrates` toward an exercise, which the sidebar reads
 * as the exercise's edge. The relation's meaning is "this drill shows that
 * concept" (entry 274's reading), and 23 concept pages declared it the other
 * way round on 31 edges, so the sidebar read "Example of: First Line Drill"
 * — the principle an example of the drill — and, where the drill declared the
 * edge back (22 edges on 19 pages), the reciprocal rule dropped the drill's
 * own edge as already shown and the drills group never rendered (tracker
 * entry 327, 2026-09-22). Such an edge now lands in the drills group with the
 * inbound ones, and "Example of" keeps what the type system means by it: a
 * concept illustrating a reference, a pattern illustrating a law. An exercise
 * page keeps its own `illustrates` as declared; no exercise illustrates
 * another today, and a drill is not a drill for a drill.
 */
export function isDrillTarget(
  relation: Relation,
  pageType: string | undefined,
  targetType: string | undefined,
): boolean {
  return relation === "illustrates" && targetType === "exercise" && pageType !== "exercise";
}

/**
 * Outbound links plus the inbound edges of every symmetric relation, so a
 * symmetric group shows both directions once. Only `contrasts` is symmetric.
 *
 * On an antipattern page the `contrasts` edges from exercises are not merged:
 * they are the counter case and go to their own inbound group (entry 286),
 * and the page's own `contrasts` toward an exercise is dropped here for the
 * same reason — the group that lists it is that one. Without `pageType`
 * every symmetric edge merges, as it did before the split. A concept's own
 * `illustrates` toward an exercise is dropped the same way: the drills group
 * lists it (`isDrillTarget`, entry 327).
 */
export function mergeSymmetricInbound(
  outgoing: OutgoingLink[],
  inbound: InboundLink[],
  pageType?: string,
): OutgoingLink[] {
  const have = new Set(outgoing.map((l) => `${l.relation}:${l.id}`));
  const own = outgoing.filter(
    (l) =>
      !isCounterEdge(l.relation, l.type, pageType) && !isDrillTarget(l.relation, pageType, l.type),
  );
  const extra = inbound
    .filter((l) => RELATION_LABELS[l.relation].symmetric && !have.has(`${l.relation}:${l.id}`))
    .filter((l) => !isCounterEdge(l.relation, l.type, pageType))
    .map((l) => ({ id: l.id, relation: l.relation, title: l.title, url: l.url, type: l.type }));
  return [...own, ...extra];
}

/**
 * The outbound groups of the Connections block, in display order: one per
 * relation present, except that on an exercise page the `contrasts` edges
 * toward antipatterns are their own group, "Counters", ahead of "Compare"
 * (entry 286), and on a principle or antipattern page the `contrasts` edges
 * that are the principle–failure pairing are their own group ahead of both
 * (entry 328). The key is the relation's name, or `counters` or `pair` for a
 * split group; the budget ranks on it.
 *
 * `pairs` is the set of atom ids `principleFailures` pairs this page with
 * (the failures of a principle, the principles of a failure), passed by the
 * page so the sidebar and the principles hub draw the same map. Without it
 * no pair group forms, as without `trainedBy` no drill earns the strong
 * label; an id in the set that is not the right type is not relabelled
 * (`isPairEdge`), so the set cannot move a technique out of "Compare". On
 * 2026-09-22 the 24 pairs were 24 of the 32 "Compare" items on the 9
 * principle pages and 24 of the 104 on the 10 failure pages.
 *
 * The `illustrates` group leaves out a concept's edges toward exercises,
 * which inboundGroupsFor lists with the drills (`isDrillTarget`, entry 327).
 */
export interface OutboundGroup {
  key: string;
  relation: Relation;
  label: string;
  links: SidebarLink[];
}

export function outboundGroupsFor(
  pageType: string,
  links: readonly OutgoingLink[],
  pairs: ReadonlySet<string> = new Set(),
): OutboundGroup[] {
  const toLink = (l: OutgoingLink): SidebarLink => ({ key: l.id, href: l.url, label: l.title });
  const isPair = (l: OutgoingLink) => pairs.has(l.id) && isPairEdge(l.relation, pageType, l.type);
  const groups: OutboundGroup[] = [];
  for (const relation of RELATION_ORDER) {
    const members = links.filter(
      (l) => l.relation === relation && !isDrillTarget(relation, pageType, l.type),
    );
    if (relation === "contrasts") {
      const paired = members.filter(isPair);
      if (paired.length > 0) {
        groups.push({
          key: "pair",
          relation,
          label: pairLabel(pageType),
          links: paired.map(toLink),
        });
      }
      const counters = members.filter((l) => isCounterEdge(relation, pageType, l.type));
      if (counters.length > 0) {
        groups.push({
          key: "counters",
          relation,
          label: outboundLabel(relation, "exercise", "antipattern"),
          links: counters.map(toLink),
        });
      }
      const rest = members.filter((l) => !isPair(l) && !isCounterEdge(relation, pageType, l.type));
      if (rest.length > 0) {
        groups.push({
          key: relation,
          relation,
          label: outboundLabel(relation),
          links: rest.map(toLink),
        });
      }
      continue;
    }
    if (members.length > 0) {
      groups.push({
        key: relation,
        relation,
        label: outboundLabel(relation),
        links: members.map(toLink),
      });
    }
  }
  return groups;
}

/** One line of an inbound group: the neighbour, resolved. */
type Member = { id: string; title: string; url: string };

const member = (l: { id: string; title: string; url: string }): Member => ({
  id: l.id,
  title: l.title,
  url: l.url,
});

/**
 * Group inbound edges for the sidebar, dropping any that only repeat an
 * outgoing edge already shown under the reciprocal label. A mutual `extends`
 * pair shows the partner once, under "Extends"; an atom this page "builds on"
 * that also says it "unlocks" this page is one fact, shown once. An inbound
 * edge whose reciprocal is *not* declared is shown, because that is the case
 * the graph has no other way to surface.
 *
 * The rule keeps the stronger line, not the outbound one. Until 2026-09-22
 * it kept the outbound edge whichever label it wore, and on `illustrates` the
 * outbound label is the weak one: 19 concept pages declared `illustrates`
 * toward a drill that declared it back (22 edges, 11 of them backed by the
 * drill's Trains line), so *Be Brave* filed First Line Drill under "Example
 * of" and had no drills group at all (tracker entry 327). A drill's edge is
 * never dropped for its reciprocal now, and the page's own edge toward the
 * drill joins the drills group instead of "Example of" (`isDrillTarget`), so
 * the neighbour is still one line. The strength order the rule follows is
 * drills (Trains-backed) > drills (shows) > counters > the relation's plain
 * words; the drills case is the only one the reciprocal rule can reach,
 * because the counters are `contrasts`, which the symmetric merge handles.
 *
 * `trainedBy` is the set of exercise ids whose own `**Trains:**` line names
 * this page (trains.ts). An exercise's `illustrates` edge lands under "Drills
 * that train this" only when the drill says so too; the rest of the
 * exercises' `illustrates` edges — 69 of 86 on 2026-09-22, entry 274 — go
 * under "Drills that show this", which is the claim the edge makes. Train
 * before show, so the confirmed group is the one the reader meets first.
 * The page's own `illustrates` toward an exercise splits the same way, so
 * the 9 one-way concept→drill edges of entry 327 are drills too.
 *
 * `pageType` is the type of the atom whose page this is. On an antipattern
 * page the `contrasts` edges from exercises are the counter case — the drill
 * was written to break the habit, not to be compared with it — and they go
 * first, under "Drills that counter this", ahead of everything (entry 286).
 * An edge the antipattern itself declares toward a drill (one today,
 * blocking → one-word-scene) joins that group rather than "Compare", so the
 * group is the whole map for the page; `outgoing` carries the title and url
 * that needs. The reciprocal rule does not apply to the counter group: the
 * page shows a counter edge once, here, whichever side declared it.
 *
 * `requiredBy` is the direct view of the inbound `requires` edges
 * (direct-requires.ts, entry 301). With it, the "Required by" group opens
 * only the atoms whose own "Builds on" opens this page and folds the rest,
 * so the two ends of an edge agree; its `links` and `omitted` — the size the
 * budget ranks on — are then the open holders, not the closure. Without it
 * the group reads the declarations, as it did until 2026-09-22.
 *
 * `rank` orders the members of every group, open and folded alike: by it
 * descending, then title (atom-rank.ts's `byRank`). The page passes
 * `ageNormalisedRank` — edges received per month since the atom was written
 * — because the index's own order, raw in-degree, is an order by age: the
 * March atoms held the first slot in 26% of the inbound groups against 13%
 * of the graph, the August atoms 11% against 22% (entry 307). Without
 * `rank` the members keep the order the index gives them.
 */
export function inboundGroupsFor(
  inbound: InboundLink[],
  outgoing: { id: string; relation: Relation; type?: string; title?: string; url?: string }[],
  trainedBy: ReadonlySet<string> = new Set(),
  pageType?: string,
  requiredBy?: RequiredByView,
  rank?: ReadonlyMap<string, number>,
  /**
   * The counter line's own order, purpose first (entry 322): a drill whose
   * Trains line names this failure or its principle pair, then any Trains
   * line, then the rank. Passed from `drillsCountering` so the sidebar and
   * the diagnosis hub open the same drill.
   */
  counterOrder?: ReadonlyMap<string, number>,
): InboundGroup[] {
  const shown = new Set(outgoing.map((l) => `${l.relation}:${l.id}`));
  const ranked = rank ? [...inbound].sort(byRank<InboundLink>(rank)) : inbound;
  const isDrill = (l: InboundLink) => l.relation === "illustrates" && l.type === "exercise";
  const isCounter = (l: InboundLink) => isCounterEdge(l.relation, l.type, pageType);
  // A drill's edge outranks the page's own reciprocal, which has no drills label.
  const kept = ranked.filter((l) => isDrill(l) || !shown.has(`${RECIPROCAL[l.relation]}:${l.id}`));

  // The drills groups' members: the drills' own edges, then the page's own
  // `illustrates` toward a drill read as the drill's (entry 327); a drill
  // declared from both ends is one member, and the rank orders the union.
  const drills: Member[] = kept.filter(isDrill).map(member);
  const drillIds = new Set(drills.map((d) => d.id));
  for (const l of outgoing) {
    if (!isDrillTarget(l.relation, pageType, l.type) || !l.title || !l.url) continue;
    if (drillIds.has(l.id)) continue;
    drillIds.add(l.id);
    drills.push({ id: l.id, title: l.title, url: l.url });
  }
  if (rank) drills.sort(byRank(rank));

  const groups: InboundGroup[] = [];
  if (pageType === "antipattern") {
    const members = ranked.filter(isCounter).map((l) => ({ id: l.id, title: l.title, url: l.url }));
    const seen = new Set(members.map((m) => m.id));
    // The page's own contrasts toward a drill. isCounterEdge reads (source,
    // target) and here the source is this page, so the test is the pair the
    // other way round: the target must be the exercise.
    for (const l of outgoing) {
      if (l.relation !== "contrasts" || l.type !== "exercise" || !l.title || !l.url) continue;
      if (seen.has(l.id)) continue;
      seen.add(l.id);
      members.push({ id: l.id, title: l.title, url: l.url });
    }
    // The page's own edge joins the ranked order rather than the tail.
    if (rank) members.sort(byRank(rank));
    if (counterOrder) {
      members.sort(
        (a, b) => (counterOrder.get(a.id) ?? Infinity) - (counterOrder.get(b.id) ?? Infinity),
      );
    }
    if (members.length > 0) {
      groups.push({
        key: "counters",
        label: inboundLabel("contrasts", "exercise", false, pageType),
        links: members.slice(0, INBOUND_GROUP_LIMIT),
        omitted: Math.max(0, members.length - INBOUND_GROUP_LIMIT),
        folded: [],
      });
    }
  }

  const of = (pick: (l: InboundLink) => boolean) => () => kept.filter(pick).map(member);
  const order: { key: string; label: string; members: () => Member[] }[] = [
    {
      key: "requires",
      label: inboundLabel("requires"),
      members: of((l) => l.relation === "requires"),
    },
    {
      key: "enables",
      label: inboundLabel("enables"),
      members: of((l) => l.relation === "enables"),
    },
    {
      key: "extends",
      label: inboundLabel("extends"),
      members: of((l) => l.relation === "extends"),
    },
    {
      key: "contrasts",
      label: inboundLabel("contrasts"),
      members: of((l) => l.relation === "contrasts" && !isCounter(l)),
    },
    {
      key: "drills",
      label: inboundLabel("illustrates", "exercise", true),
      members: () => drills.filter((d) => trainedBy.has(d.id)),
    },
    {
      key: "shows",
      label: inboundLabel("illustrates", "exercise"),
      members: () => drills.filter((d) => !trainedBy.has(d.id)),
    },
    {
      key: "illustrates",
      label: inboundLabel("illustrates"),
      members: of((l) => l.relation === "illustrates" && l.type !== "exercise"),
    },
  ];

  // The holders the direct view folds, by id, with the knot flag.
  const foldedBy = new Map(
    (requiredBy?.folded ?? []).map((holder) => [holder.id, holder.viaCore] as const),
  );
  for (const { key, label, members: pick } of order) {
    const all = pick();
    if (all.length === 0) continue;
    const splits = key === "requires" && requiredBy !== undefined;
    const members = splits ? all.filter((l) => !foldedBy.has(l.id)) : all;
    const folded: FoldedHolder[] = splits
      ? all
          .filter((l) => foldedBy.has(l.id))
          .map((l) => ({ id: l.id, title: l.title, url: l.url, viaCore: foldedBy.get(l.id)! }))
      : [];
    groups.push({
      key,
      label,
      links: members.slice(0, INBOUND_GROUP_LIMIT),
      omitted: Math.max(0, members.length - INBOUND_GROUP_LIMIT),
      folded,
    });
  }
  return groups;
}

/**
 * The ids `principleFailures` pairs an atom with, read from either side: a
 * principle's failures, a failure's principles, nothing for any other type.
 * What the page passes to `outboundGroupsFor` for its pair group (entry 328).
 */
export function pairedWith(
  fm: Pick<AtomFrontmatter, "id" | "type">,
  failures: ReadonlyMap<string, readonly { id: string }[]>,
): Set<string> {
  const ids = new Set<string>();
  if (fm.type === "principle") {
    for (const f of failures.get(fm.id) ?? []) ids.add(f.id);
  } else if (fm.type === "antipattern") {
    for (const [principle, list] of failures) {
      if (list.some((f) => f.id === fm.id)) ids.add(principle);
    }
  }
  return ids;
}

/**
 * The sentence under a failure's counter line that joins its three legs:
 * "Zip Zap Zop trains Be Present". The counter line opens with a drill
 * whose Trains line names the failure's principle pair when one does
 * (`drillsCountering`, purpose `pair`, entry 322), and the group above the
 * line names that principle (entry 328); this says which is which, so the
 * page reads failure → principle → drill in one place. Null when the first
 * counter is not written for the pair, or its line names the failure rather
 * than a principle, since then there is no principle to name.
 */
export function counterPurposeNote(
  antipatternId: string,
  atoms: readonly { frontmatter: AtomFrontmatter; content?: string }[],
): { drill: string; principle: string; text: string } | null {
  const lead = drillsCountering(antipatternId, atoms)[0];
  if (!lead || lead.purpose !== "pair") return null;
  const failure = atoms.find((a) => a.frontmatter.id === antipatternId)?.frontmatter;
  if (!failure) return null;
  const pairs = pairedWith(failure, principleFailures(atoms));
  const named = buildTrainsIndex(atoms).trains.get(lead.id) ?? [];
  const principleId = named.find((id) => pairs.has(id));
  if (!principleId) return null;
  const principle = atoms.find((a) => a.frontmatter.id === principleId)?.frontmatter;
  if (!principle) return null;
  return {
    drill: lead.id,
    principle: principleId,
    text: `${lead.title} trains ${principle.title}`,
  };
}

/**
 * The "Builds on" group, reduced to what the atom needs next.
 *
 * The atoms declare their prerequisites as a closure: 59% of the acyclic
 * `requires` edges are implied by a chain already in the graph, and the
 * 19-atom knot means an atom naming two of its members has named them all,
 * so `reality-construction` opened its sidebar on sixteen prerequisites of
 * which three are the next thing to read (tracker entry 277, 2026-09-22).
 * `direct` is the reduced list (direct-requires.ts); a cycle the atom names
 * twice is one item, "<Title> and the core", the title linking the member
 * the graph requires most among those named (`coreRepresentative`, entry
 * 315) and the phrase linking the core's page (`CORE_HREF`, entry 309).
 * `folded` is everything the reduction dropped — the implied targets
 * and the rest of the core — kept as links inside a fold under the group,
 * because the declared edges are still edges and the link graph is the one
 * ranking input the site controls. A target the graph does not know (not an
 * atom) is listed as declared; there is nothing to reduce it against.
 */
export interface BuildsOnGroup {
  direct: SidebarLink[];
  folded: SidebarLink[];
}

/** The label of a collapsed cycle, on its representative member; spelled in direct-requires.ts. */
export { coreItemLabel };

/** The core item's second link: "and the core", pointing at the page that defines it. */
export const CORE_ITEM_SUFFIX: NonNullable<SidebarLink["suffix"]> = {
  join: CORE_ITEM_JOIN,
  href: CORE_HREF,
  label: CORE_PHRASE,
};

/** The fold's summary: how many the reduction put behind the direct list. */
export function buildsOnFoldSummary(count: number): string {
  return `and ${count} more it ${outboundLabel("requires").toLowerCase()} through these`;
}

export function buildsOnGroup(
  atomId: string,
  declared: readonly { id: string; relation: Relation; title: string; url: string }[],
  graph: RequiresGraph,
  atomOf: (id: string) => { title: string; url: string } | undefined,
): BuildsOnGroup {
  const links = declared.filter((l) => l.relation === "requires");
  const byId = new Map(links.map((l) => [l.id, l]));
  const { direct, implied } = directRequires(graph, atomId);
  const listed = new Set<string>();
  const item = (id: string, viaCore = false): SidebarLink | null => {
    const known = byId.get(id) ?? atomOf(id);
    if (!known || listed.has(id)) return null;
    listed.add(id);
    const link: SidebarLink = { key: id, href: known.url, label: known.title };
    // The two halves of coreItemLabel(title), each its own link; the line
    // reads as the label does.
    return viaCore ? { ...link, suffix: CORE_ITEM_SUFFIX } : link;
  };

  const open: SidebarLink[] = [];
  for (const d of direct) {
    const link = item(d.id, d.viaCore);
    if (link) open.push(link);
  }
  // Declared toward something that is not an atom: not in the graph, so shown as declared.
  for (const l of links) {
    if (graph.out.has(l.id) || listed.has(l.id)) continue;
    open.push({ key: l.id, href: l.url, label: l.title });
    listed.add(l.id);
  }

  const folded: SidebarLink[] = [];
  for (const i of implied) {
    const link = item(i.id);
    if (link) folded.push(link);
  }
  for (const d of direct) {
    for (const member of d.core) {
      // A knot member's own page does not list itself among the core.
      if (member === atomId) continue;
      const link = item(member);
      if (link) folded.push(link);
    }
  }
  return { direct: open, folded };
}

/**
 * The one sentence of rules a game carries in frontmatter, for the line under
 * the title. The type hubs, the games hub and the meta description all read
 * `how_to_play`; the game's own page was the one surface that did not, so a
 * reader who arrived from any of them lost the rules on landing.
 */
export function leadLineFor(fm: Pick<AtomFrontmatter, "type" | "how_to_play">): string | null {
  if (fm.type !== "exercise" && fm.type !== "format") return null;
  const line = fm.how_to_play?.trim();
  return line ? line : null;
}

/**
 * Cut an atom's html at its `## Attribution note` heading, so the sourcing
 * note renders as the footer block under a rule rather than as a section.
 *
 * This replaces a splitter that looked for `<p><strong>Label:</strong>` across
 * fourteen labels. The 2026-08-22 heading conversion turned every such label
 * into a `##` heading, so from that day the splitter matched nothing on any of
 * the 207 built pages and the mechanism had no test to say so. The eleven
 * atoms that carry the heading all carry it last, which is what makes a cut
 * safe; a heading that ever moved up the page would drag real sections into
 * the footer, so the split refuses unless the heading is the page's final h2.
 */
export function splitFooter(html: string): { mainHtml: string; footerHtml: string | null } {
  const match = /<h2[^>]*\sid="attribution-note"[^>]*>/i.exec(html);
  if (!match || /<h2[\s>]/i.test(html.slice(match.index + match[0].length))) {
    return { mainHtml: html, footerHtml: null };
  }
  return { mainHtml: html.slice(0, match.index), footerHtml: html.slice(match.index) };
}

interface AtomDetailProps {
  atom: {
    frontmatter: AtomFrontmatter;
    content: string;
    html: string;
    slug: string;
    firstPublished?: string; // the loader's, from git; see first-published.ts
  };
  breadcrumbs: Crumb[];
  /**
   * The description the route ships in its meta tag, passed in rather than
   * derived a second time here. Deriving it separately had 38 pages saying two
   * different things about themselves.
   */
  description: string;
  /**
   * The label this atom's route puts on its og:image. Held here rather than
   * derived from TYPE_LABELS, which is a different vocabulary — that renders
   * "why it's hard" where the route writes "How It Works".
   */
  eyebrow?: string;
}

export async function AtomDetail({ atom, breadcrumbs, description, eyebrow }: AtomDetailProps) {
  const fm = atom.frontmatter;
  const audioUrl = getAudioUrl("atoms", atom.slug);
  const atomUrl = getAtomUrl({ id: fm.id, type: fm.type });
  const series = audioUrl ? await getSeriesForPage(atomUrl) : null;
  const audioDuration = audioUrl ? getAudioDuration(audioUrl) : undefined;
  // Titles for the Source block. The ids render as anchor text otherwise, and
  // "improv is high stakes reality construction" is a slug with the hyphens
  // taken out, not a title — it reads as machine output and says less about
  // the destination than the real one does.
  const sourceTitles = fm.sources?.length
    ? new Map((await loadSources()).map((s) => [s.frontmatter.id, s.frontmatter.title]))
    : null;

  // Reverse lookups
  const [appearsInThreads, appearsInBridges, improvGames, inboundLinks, leaningPaths] =
    await Promise.all([
      getThreadsForAtom(atom.slug),
      getBridgesForAtom(atom.slug),
      loadImprovGames(),
      getInboundLinks(fm.id),
      pathsLeaningOn(fm.id),
    ]);

  /**
   * getBridgesForAtom returns bridges, so a hub that lives on a route rather
   * than in content could never appear in this sidebar. /improv-games is the
   * biggest improv term the site targets at 3,100 a month, and every one of
   * the game pages that make up its content linked to everything except it.
   * Membership is read from the hub's own loader rather than inferred from
   * type, so a page never claims to be in a collection that does not list it.
   */
  const inImprovGames = improvGames.some((game) => game.id === fm.id);

  const threadWithPaths = await Promise.all(
    appearsInThreads.map(async (t) => {
      const parentPath = await getParentPath(t.frontmatter.id);
      return {
        id: t.frontmatter.id,
        title: t.frontmatter.title,
        pathId: parentPath?.frontmatter.id ?? null,
        pathTitle: parentPath?.frontmatter.title ?? null,
      };
    }),
  );

  const appearsInPaths = [
    ...new Map(
      threadWithPaths
        .filter((t) => t.pathId)
        .map((t) => [t.pathId, { id: t.pathId!, title: t.pathTitle! }]),
    ).values(),
  ];

  // Resolve linked atom titles and URLs
  const resolvedLinks = await Promise.all(
    (fm.links ?? []).map(async (link) => {
      const linked = await getAtomBySlug(link.id);
      return {
        id: link.id,
        relation: link.relation,
        title: linked?.frontmatter.title ?? link.id,
        url: linked
          ? getAtomUrl({ id: link.id, type: linked.frontmatter.type })
          : `/how-it-works/${link.id}`,
        type: linked?.frontmatter.type,
      };
    }),
  );

  // `contrasts` is symmetric in meaning and declared one way 70% of the time
  // (tracker entry 229, 2026-09-21): an exercise says it contrasts hesitation,
  // hesitation's frontmatter does not say the exercise. So the Compare group
  // is the union of both directions, and the inbound block skips the relation
  // — except the counter case, a drill's contrasts toward this failure, which
  // is its own group on an antipattern page (entry 286).
  const connectionLinks = mergeSymmetricInbound(resolvedLinks, inboundLinks, fm.type);
  // The drills whose own Trains line names this page: the split between
  // "Drills that train this" and "Drills that show this" (entry 274).
  const trainedByDrills = new Set(await trainedBy(fm.id));
  // The `requires` digraph, read twice: the "Required by" group takes the
  // direct view of its inbound edges (entry 301), the "Builds on" group
  // below the reduction of its outbound ones (entry 277).
  const allAtoms = await loadAtoms();
  // The schools whose works this concept cites (entry 331), for the line
  // beside the lesson context.
  const lineage = await lineageOf(fm.id);
  const graph = requiresGraph(allAtoms.map((a) => a.frontmatter));
  // Members in every inbound group by how much the graph leans on them for
  // their age (entry 307), not by the raw in-degree the index sorts on.
  const counterOrder =
    fm.type === "antipattern"
      ? new Map(drillsCountering(fm.id, allAtoms).map((d, i) => [d.id, i]))
      : undefined;
  // The principle–failure pairing the principles hub draws (entry 155), read
  // from this page's side, so the same edges wear the hub's words here and
  // not "Compare" (entry 328). Empty on every other type.
  const pairs = pairedWith(fm, principleFailures(allAtoms));
  // The sentence that joins the failure's three legs under its counter line:
  // the drill that opens it and the paired principle its Trains line names.
  const purposeNote = fm.type === "antipattern" ? counterPurposeNote(fm.id, allAtoms) : null;
  const inboundGroups = inboundGroupsFor(
    inboundLinks,
    resolvedLinks,
    trainedByDrills,
    fm.type,
    requiredByView(graph, fm.id, "direct"),
    ageNormalisedRank(allAtoms),
    counterOrder,
  ).filter((g) => g.key !== "contrasts");
  // "Drills that counter this" is derived from inbound edges but rendered at
  // the head of the Connections block, before Compare, so a reader who has
  // named the failure meets the thing to do before the things it differs
  // from. The rest of the inbound groups stay under Referenced by.
  const counterGroup = inboundGroups.find((g) => g.key === "counters") ?? null;
  // The picker facet for this principle, hung on the drills group so the
  // sidebar's list of drills ends in the tool that holds them (entry 335).
  // Undefined on every other type, and on a principle no drill's Trains line
  // names — there is no facet page for it to link.
  const drillsFacet = fm.type === "principle" ? await principleFacet(fm.id) : undefined;
  const referencedBy = inboundGroups
    .filter((g) => g.key !== "counters")
    .map((g) =>
      g.key === "drills" && drillsFacet
        ? {
            ...g,
            facet: { href: drillsFacet.href, label: principleDrillsFacetLabel(drillsFacet.title) },
          }
        : g,
    );
  // The outbound groups, one per relation, with an exercise's contrasts
  // toward antipatterns split out as "Counters" ahead of "Compare", and a
  // principle's or failure's paired contrasts split out under the pair label.
  const outboundGroups = outboundGroupsFor(fm.type, connectionLinks, pairs);
  // On a failure's page the pair group leads the whole block, above the
  // counters, so the diagnosis route reads failure → principle → drill in
  // the hub's own words (entry 328); on a principle's page it keeps the
  // Compare slot, since the failures are one group among its relations.
  const pairGroup =
    fm.type === "antipattern" ? (outboundGroups.find((g) => g.key === "pair") ?? null) : null;
  // Which groups open without a click, chosen by size across both blocks
  // within one budget (sidebar-budget.ts, entry 272). The open groups keep
  // relation order on the page; only the choice is by size — except that on
  // a page no lesson composes, the "Unlocks" group ranks first whatever its
  // size, because it is the only forward pointer the page has (entry 292).
  const openGroups = chooseOpenGroups(
    sidebarBudgetGroups(
      outboundGroups.map((g) => ({ relation: g.key, size: g.links.length })),
      inboundGroups,
      { forward: appearsInThreads.length === 0 },
    ),
  );
  // The Connections block's groups in display order, each with its budget key.
  const connectionGroups: {
    key: string;
    label: string;
    links: SidebarLink[];
    omitted: number;
    buildsOn: boolean;
    /** A line under the links, for the counter line's purpose note (entry 328). */
    note?: string;
  }[] = [
    ...(pairGroup
      ? [
          {
            key: outboundKey(pairGroup.key),
            label: pairGroup.label,
            links: pairGroup.links,
            omitted: 0,
            buildsOn: false,
          },
        ]
      : []),
    ...(counterGroup
      ? [
          {
            key: inboundKey(counterGroup.key),
            label: counterGroup.label,
            links: counterGroup.links.map((l) => ({ key: l.id, href: l.url, label: l.title })),
            omitted: counterGroup.omitted,
            buildsOn: false,
            note: purposeNote?.text,
          },
        ]
      : []),
    ...outboundGroups
      .filter((g) => g !== pairGroup)
      .map((g) => ({
        key: outboundKey(g.key),
        label: g.label,
        links: g.links,
        omitted: 0,
        buildsOn: g.key === "requires",
      })),
  ];
  const openConnections = connectionGroups.filter((g) => openGroups.has(g.key));
  const foldedConnections = connectionGroups.filter((g) => !openGroups.has(g.key));
  const openInbound = referencedBy.filter((g) => openGroups.has(inboundKey(g.key)));
  const foldedInbound = referencedBy.filter((g) => !openGroups.has(inboundKey(g.key)));
  const leadLine = leadLineFor(fm);
  const { mainHtml, footerHtml } = splitFooter(atom.html);

  // The "Builds on" group after transitive reduction (entry 277): the
  // direct prerequisites open, the implied ones and the rest of a collapsed
  // cycle in a fold beneath them. The budget above still weighs the group
  // by its declared size.
  const atomOf = new Map(
    allAtoms.map((a) => [
      a.frontmatter.id,
      { title: a.frontmatter.title, url: getAtomUrl(a.frontmatter) },
    ]),
  );
  const buildsOn = buildsOnGroup(fm.id, resolvedLinks, graph, (id) => atomOf.get(id));
  // Drills that train the same concept as this one. Exercises only: the
  // block exists because a drill's sidebar otherwise offers no way to the
  // next drill except back out through a concept (entry 268).
  const drillPairs: DrillPairs =
    fm.type === "exercise" ? drillPairsFor(fm.id, allAtoms) : { pairs: [], omitted: 0 };
  // A format's drills are derived from shared targets (entry 283): the two
  // practice types share ten edges, so the join is by concept, not by edge.
  const formatDrills: FormatDrillsList =
    fm.type === "format" ? drillsPreparingFor(fm.id, allAtoms) : { drills: [], omitted: 0 };
  // A concept with no work behind it, and nothing in its body to say so,
  // states the absence where its Source group would be (entry 284).
  const noSource = noSourceRecorded(atom, allAtoms);

  const hasSidebar =
    resolvedLinks.length > 0 ||
    drillPairs.pairs.length > 0 ||
    formatDrills.drills.length > 0 ||
    inboundGroups.length > 0 ||
    noSource ||
    appearsInThreads.length > 0 ||
    appearsInPaths.length > 0 ||
    leaningPaths.length > 0 ||
    appearsInBridges.length > 0 ||
    inImprovGames;

  // Context banner: the primary thread and path only. The remaining paths used
  // to be listed alongside them and are still reachable from the sidebar.
  // getThreadsForAtom puts the lesson a reader meets first at the front —
  // earliest path in the progression, then its place in that path — so the
  // primary is no longer whichever composing thread the filesystem listed
  // first (which, on the production build, was the alphabetically last one).
  const primaryThread = appearsInThreads[0] ?? null;
  const primaryPath = appearsInPaths[0] ?? null;

  // What's next: the next atom in the primary thread, the thread itself once
  // the sequence is exhausted — with a line for each other lesson the atom
  // sits in, so no lesson's chain breaks here (entry 326) — or the atom's
  // best-connected neighbours when no lesson composes it. See getAtomWhatsNext.
  const whatsNext = await getAtomWhatsNext(fm.id);
  /** The fold renders only when the layer holds a script for this page. */
  const showTranscript = Boolean(audioUrl) && transcriptHref("atoms", atom.slug) !== undefined;

  // The typed edges, for the Article markup: works cited and concepts named,
  // each as the `@id` its own page declares (novel-insights entry 261).
  const atomIndex = indexAtoms(allAtoms);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* Every named concept is a term of art, not just the 28 typed
          `definition`. A generic Article tells a crawler nothing about what
          "Pattern Break" is. */}
      {isGlossaryType(fm.type) && (
        <DefinedTermJsonLd
          term={{
            id: fm.id,
            term: fm.title,
            url: atomUrl,
            type: fm.type,
            definition: definitionFromHtml(atom.html),
            aliases: fm.aliases,
          }}
        />
      )}
      <ArticleJsonLd
        title={fm.title}
        description={description}
        url={atomUrl}
        datePublished={atom.firstPublished}
        dateModified={fm.updated}
        eyebrow={eyebrow}
        subject={fm.subject}
        contentImage={firstContentImage(atom.content)}
        citation={atomCitations(fm, atomIndex)}
        mentions={atomMentions(fm, atomIndex)}
      />
      {/* Breadcrumb first. The context line used to render above it on all 102
          pages that have one, so the first thing in <main> was up to 190
          characters of internal titles — a thread and as many as three paths —
          before anything said where the reader was. */}
      <Breadcrumb crumbs={breadcrumbs} />
      {/* Records the visit against the lesson the reader came from, so the
          record is not blind to a concept-by-concept walk (entry 333).
          Renders nothing. */}
      <ConceptVisit atomId={fm.id} lessonIds={appearsInThreads.map((t) => t.frontmatter.id)} />
      {/* One relationship, not four. Every path this banner listed is repeated
          in the sidebar's "Part of" block, which carries a superset; on
          be-present the banner named three paths and the sidebar named the same
          three. Kept at all because the sidebar renders below the article on
          mobile, so a reader on a phone would otherwise reach it only after the
          whole page. */}
      {/* The lesson context and the lineage share one region and one caption
          (entry 317): both say where the page sits, in the curriculum and in
          the schools (entry 331), and neither is the author's. */}
      {(primaryThread || primaryPath || lineage.length > 0) && (
        <div data-derived-region="context">
          {(primaryThread || primaryPath) && (
            <ContextBanner
              threadTitle={primaryThread?.frontmatter.title}
              threadHref={primaryThread ? `/threads/${primaryThread.frontmatter.id}` : undefined}
              pathTitle={primaryPath?.title}
              pathHref={primaryPath ? `/paths/${primaryPath.id}` : undefined}
            />
          )}
          <LineageLine lineage={lineage} />
        </div>
      )}

      {/* Two-column layout: card left, sidebar right on desktop */}
      <div className={hasSidebar ? "lg:grid lg:grid-cols-[1fr_260px] lg:gap-12" : ""}>
        {/* ── Main content in card ─────────────────────────────── */}
        <div className="sm:bg-surface sm:rounded-xl sm:p-8 sm:shadow-sm sm:dark:shadow-none">
          <header className="mb-8">
            <span className="text-foreground/40 text-xs tracking-wider uppercase">
              {TYPE_LABELS[fm.type] ?? fm.type}
            </span>
            <h1 className="text-foreground-strong mt-1 text-3xl font-bold tracking-tight">
              {fm.title}
            </h1>
            {leadLine && (
              <p className="text-foreground/70 mt-3 text-lg leading-snug italic">{leadLine}</p>
            )}
            {/*
              ArticleJsonLd above is unconditional here, so every one of these
              pages already tells a parser who wrote it and when it changed.
              155 of them showed a reader neither. I left atoms out when the
              byline went onto the guides, reasoning that they carry no date
              line and the design meant to treat them differently — but the
              design also gives them Article, author and dateModified, so it
              was not making that distinction and I picked the wrong half of it.
            */}
            <UpdatedOn
              date={fm.updated}
              minutes={readingMinutes(atom.html)}
              status={fm.status}
              className="text-foreground/50 mt-3 text-xs"
            />
          </header>

          {audioUrl && (
            <div>
              <AudioPlayer src={audioUrl} transcriptHref={transcriptHref("atoms", atom.slug)} />
              {series && (
                <>
                  <p
                    className="text-foreground/50 mt-2 text-xs"
                    data-track="series"
                    data-derived="true"
                  >
                    An episode of{" "}
                    <Link href={`/listen/${series.id}`} className="underline">
                      {series.title}
                    </Link>
                    .
                  </p>
                  <PodcastJsonLd
                    title={fm.title}
                    audioUrl={audioUrl}
                    pageUrl={atomUrl}
                    duration={audioDuration}
                    series={series}
                  />
                </>
              )}
            </div>
          )}

          <TableOfContents headings={contentsFor(mainHtml)} />
          {/* `data-track="body"`: the prose's links (6 a page) were unmeasured
              while the sidebar's were (tracker entry 259). */}
          <article
            className="prose prose-neutral dark:prose-invert max-w-none"
            data-track="body"
            dangerouslySetInnerHTML={{ __html: mainHtml }}
          />

          {/* A drill is the unit the site routes practice to, so the record
              counts a rep here and credits the lessons whose rows list it
              (entry 333). */}
          {fm.type === "exercise" && (
            <DrillPracticed drillId={fm.id} lessonIds={await lessonsRecommendingDrill(fm.id)} />
          )}
          {/* The attribution note keeps its heading and anchor, styled down to
              the footnote it is; the paragraphs need their own spacing here
              because the block sits outside the prose class. */}
          {footerHtml && (
            <aside
              data-track="attribution"
              className="border-foreground/10 text-foreground/40 mt-8 space-y-2 border-t pt-6 text-xs leading-relaxed [&_a]:underline [&_h2]:font-semibold"
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
          )}

          {/* The after-article strip: the transcript, then the router. Below
              the prose and the attribution, so the page's own words come
              first in DOM order (tracker entry 260); the player above links
              down to the fold. One region, one "computed" caption (tracker
              entry 317): the wrapper draws the caption and the rule the
              transcript drew alone, and the two blocks inside keep
              `data-derived` without a second word. Rendered only when a
              block will render inside it, so no page carries a caption over
              nothing. */}
          {(showTranscript || whatsNext) && (
            <div
              data-derived-region="after-article"
              className="border-foreground/10 mt-12 border-t pt-6"
            >
              {showTranscript && (
                <Transcript
                  layer="atoms"
                  id={atom.slug}
                  currentUrl={atomUrl}
                  body={atom.html}
                  className=""
                />
              )}

              {/* What's next */}
              {whatsNext && <WhatsNext {...whatsNext} />}
            </div>
          )}
        </div>

        {/* ── Sidebar (right on desktop, below on mobile) ──────── */}
        {/* `data-derived`: the whole column is computed from declarations,
            edges and in-degree (tracker entry 310), so the column carries the
            provenance marker once and the tracked blocks inside it — sources,
            drill-pairs, format-drills — inherit it and no second caption.
            `data-derived-region`: the column is one of the page's regions
            (tracker entry 317), so a derived block mounted inside it later
            keeps its marker and draws no caption of its own. */}
        {hasSidebar && (
          <aside
            className="mt-12 space-y-8 text-sm lg:mt-0"
            data-track="concept-sidebar"
            data-derived="true"
            data-derived-region="connections"
          >
            {/* Connections — the edges this atom declares, grouped by relation.
                Headed "Related" until 2026-09-21, when one of the groups
                inside it was also called "Related" (entry 227). */}
            {connectionGroups.length > 0 && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Connections
                </h2>
                {(() => {
                  type Group = (typeof connectionGroups)[number];
                  // The "Builds on" group shows the reduced list; the budget
                  // above weighed it by its declared size.
                  const linksFor = (g: Group): SidebarLink[] =>
                    g.buildsOn ? buildsOn.direct : g.links;
                  const block = (g: Group, folded = false) => (
                    <div key={g.key}>
                      <dt
                        className={
                          folded ? "sr-only" : "text-foreground/40 mb-1 text-xs font-medium"
                        }
                      >
                        {g.label}
                      </dt>
                      <dd className="space-y-1 pl-0">
                        <SidebarLinkGroup links={linksFor(g)} />
                        {g.omitted > 0 && (
                          <p className="text-foreground/40 text-xs">
                            and {g.omitted} more not listed
                          </p>
                        )}
                        {/* "Zip Zap Zop trains Be Present": the drill that
                            opens the counter line and the principle the
                            group above names, in one sentence (entry 328). */}
                        {g.note && <p className="text-foreground/40 text-xs">{g.note}</p>}
                        {/* What the reduction dropped stays in the DOM, as
                            a fold: the implied prerequisites and the rest of
                            a collapsed cycle, reachable from the items above
                            and still links (entry 277). */}
                        {g.buildsOn && buildsOn.folded.length > 0 && (
                          <details>
                            <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer text-xs">
                              {buildsOnFoldSummary(buildsOn.folded.length)}
                            </summary>
                            <div className="mt-1 space-y-1">
                              {buildsOn.folded.map((link) => (
                                <Link
                                  key={link.key}
                                  href={link.href}
                                  className="text-foreground/70 block hover:underline"
                                >
                                  {link.label}
                                </Link>
                              ))}
                            </div>
                          </details>
                        )}
                      </dd>
                    </div>
                  );
                  return (
                    <>
                      {openConnections.length > 0 && (
                        <dl className="space-y-3">{openConnections.map((g) => block(g))}</dl>
                      )}
                      {/* Each folded group is its own fold, and the summary is
                          the group's count and first names, so the fold reads
                          as a sentence about what it holds and not as a label
                          ("2 more groups") the reader has to open to weigh. */}
                      {foldedConnections.map((g) => {
                        const links = linksFor(g);
                        return (
                          <details key={g.key} className="mt-3">
                            <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer text-xs">
                              {foldSummary(
                                g.label,
                                links.length + g.omitted,
                                links.map((l) => l.label),
                              )}
                            </summary>
                            <dl className="mt-2 space-y-3">{block(g, true)}</dl>
                          </details>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Referenced by — the edges other atoms declare toward this one.
                Edges are written in one direction, so without this block the
                seventy atoms that require `commitment` were invisible from
                its page, and a concept could not list the drills that train
                it. Computed at render, never authored. */}
            {referencedBy.length > 0 && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Referenced by
                </h2>
                {/* Column budget. Each group folds at five links, but the
                    column had fourteen groups and 55 visible links on
                    `commitment` once every derived block landed here — the
                    context-mistakes register's first entry (2026-08-30), made
                    again (tracker entry 243). Which groups open is decided
                    with the connections block above, by size, inside one
                    budget (entry 272); a closed group is a fold of its own
                    whose summary counts it and names its first members. */}
                {openInbound.length > 0 && (
                  <dl className="space-y-3">
                    {openInbound.map((group) => (
                      <InboundGroupBlock key={group.key} group={group} />
                    ))}
                  </dl>
                )}
                {foldedInbound.map((group) => (
                  <details key={group.key} className="mt-3">
                    <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer text-xs">
                      {foldSummary(
                        group.label,
                        group.links.length + group.omitted,
                        group.links.map((l) => l.title),
                      )}
                    </summary>
                    <dl className="mt-2 space-y-3">
                      <InboundGroupBlock group={group} folded />
                    </dl>
                  </details>
                ))}
              </div>
            )}

            {/* Drills that pair with this — exercises sharing a trained
                concept. The drills are the graph's periphery (five of 27 in
                the 13-core) because they name concepts and not each other;
                this is the practice layer linking itself (entry 268). */}
            {drillPairs.pairs.length > 0 && <DrillPairsBlock drillPairs={drillPairs} />}
            {formatDrills.drills.length > 0 && <FormatDrills formatDrills={formatDrills} />}
            {/* "Try it": the generator pre-set to the category this concept is
                (tracker entry 332). Null on the 198 concepts no category names. */}
            <PromptTryLine atomId={fm.id} />

            {/* Part of — grouped by content type */}
            {(appearsInPaths.length > 0 ||
              leaningPaths.length > 0 ||
              appearsInThreads.length > 0 ||
              appearsInBridges.length > 0 ||
              inImprovGames) && (
              <div>
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Part of
                </h2>
                <dl className="space-y-3">
                  {appearsInPaths.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Paths</dt>
                      <dd className="space-y-1">
                        <SidebarLinkGroup
                          links={appearsInPaths.map((p) => ({
                            key: p.id,
                            href: `/paths/${p.id}`,
                            label: p.title,
                          }))}
                        />
                      </dd>
                    </div>
                  )}
                  {/* Paths whose "Ideas this path leans on" block names this
                      atom. The Paths group above reaches a path only through
                      a lesson that composes the atom, and an atom a path leans
                      on is one its lessons do not compose, so the 32 atoms
                      the paths rest on said they were in no path at all: 88
                      links, none answered (tracker entry 220, 2026-09-21). */}
                  {leaningPaths.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">
                        Paths that lean on this
                      </dt>
                      <dd className="space-y-1">
                        <SidebarLinkGroup
                          links={leaningPaths.map((p) => ({
                            key: p.id,
                            href: p.href,
                            label: p.title,
                          }))}
                        />
                      </dd>
                    </div>
                  )}
                  {appearsInThreads.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Threads</dt>
                      <dd className="space-y-1">
                        <SidebarLinkGroup
                          links={appearsInThreads.map((t) => ({
                            key: t.frontmatter.id,
                            href: `/threads/${t.frontmatter.id}`,
                            label: t.frontmatter.title,
                          }))}
                        />
                      </dd>
                    </div>
                  )}
                  {inImprovGames && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Collections</dt>
                      <dd className="space-y-1">
                        <Link
                          href="/improv-games"
                          className="text-foreground/70 block hover:underline"
                        >
                          Improv Games
                        </Link>
                      </dd>
                    </div>
                  )}
                  {appearsInBridges.length > 0 && (
                    <div>
                      <dt className="text-foreground/40 mb-1 text-xs font-medium">Guides</dt>
                      <dd className="space-y-1">
                        {/* The group this was built for: sixteen entries, against two
                            to nine everywhere else. See SIDEBAR_VISIBLE. */}
                        <SidebarLinkGroup
                          links={appearsInBridges.map((b) => ({
                            key: b.slug,
                            href: `/${b.slug}`,
                            label: b.frontmatter.title,
                          }))}
                        />
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Source. Where there is none — no work edge either way, no
                `sources:` entry, no Specific sources section and no synthesis
                claim in the body — the group says so instead of vanishing,
                because 28 of 173 concepts were in that state and the page
                gave a reader no way to tell "no source" from "not shown"
                (entry 284). */}
            {noSource && (
              <div data-track="sources">
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Source
                </h2>
                <p className="text-foreground/40 text-xs">{NO_SOURCE_LINE}</p>
              </div>
            )}
            {fm.sources && fm.sources.length > 0 && (
              <div data-track="sources">
                <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
                  Source
                </h2>
                <ul className="space-y-1">
                  {fm.sources.map((sourceId) => (
                    <li key={sourceId}>
                      <Link
                        href={`/sources/${sourceId}`}
                        className="text-foreground/70 hover:underline"
                      >
                        {sourceTitles?.get(sourceId) ?? sourceId.replace(/-/g, " ")}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </div>

      {fm.type === "exercise" && (
        <div
          className="border-foreground/10 mt-12 border-t pt-8"
          data-track="exercise-picker-link"
          data-derived="true"
        >
          <Link
            href="/tools/exercise-picker"
            className="text-foreground/40 hover:text-foreground/60 text-sm underline decoration-dotted"
          >
            Find more exercises like this &rarr;
          </Link>
        </div>
      )}
    </main>
  );
}

/**
 * Same shape as the groups above — heading, links, the "and N more" note —
 * but each link carries the concept the two drills share, so the reader
 * knows why the drill is offered. Capped below SIDEBAR_VISIBLE, so it never
 * folds; the note counts what the cap cut, as InboundGroupBlock does.
 */
function DrillPairsBlock({ drillPairs }: { drillPairs: DrillPairs }) {
  // No `data-derived` of its own: the sidebar carries the marker for the column.
  return (
    <div data-track="drill-pairs">
      <h2 className="text-foreground/40 mb-3 text-xs font-semibold tracking-wider uppercase">
        {DRILL_PAIRS_LABEL}
      </h2>
      <ul className="space-y-1">
        {drillPairs.pairs.map((pair) => (
          <li key={pair.id}>
            <Link href={pair.url} className="text-foreground/70 block hover:underline">
              {pair.title}
            </Link>
            <span className="text-foreground/40 block text-xs">{sharedNote(pair)}</span>
          </li>
        ))}
      </ul>
      {drillPairs.omitted > 0 && (
        <p className="text-foreground/40 mt-1 text-xs">and {drillPairs.omitted} more not listed</p>
      )}
    </div>
  );
}

/**
 * One inbound group. Inside a fold the label is already the summary's first
 * words, so the term stays in the list for assistive tech and leaves the eye.
 */
function InboundGroupBlock({ group, folded = false }: { group: InboundGroup; folded?: boolean }) {
  const viaCore = group.folded.filter((h) => h.viaCore).length;
  return (
    <div>
      <dt className={folded ? "sr-only" : "text-foreground/40 mb-1 text-xs font-medium"}>
        {group.label}
      </dt>
      <dd className="space-y-1 pl-0">
        <SidebarLinkGroup
          links={group.links.map((link) => ({ key: link.id, href: link.url, label: link.title }))}
        />
        {group.omitted > 0 && (
          <p className="text-foreground/40 text-xs">and {group.omitted} more not listed</p>
        )}
        {/* "all drills for Be Present →": the picker facet that holds the
            same drills, so the principle leads into the tool (entry 335). */}
        {group.facet && (
          <p className="text-foreground/40 text-xs" data-drills-facet>
            <Link href={group.facet.href} className="hover:underline">
              {group.facet.label}
            </Link>
          </p>
        )}
        {/* The holders whose own "Builds on" folds this page: still edges,
            still links, behind a summary that gives both counts — the same
            convention as the Builds on fold across the column (entry 301). */}
        {group.folded.length > 0 && (
          <details>
            <summary className="text-foreground/40 hover:text-foreground/60 cursor-pointer text-xs">
              <RequiredByFoldSummary
                open={group.links.length + group.omitted}
                viaCore={viaCore}
                viaChain={group.folded.length - viaCore}
              />
            </summary>
            <div className="mt-1 space-y-1">
              {group.folded.map((holder) => (
                <Link
                  key={holder.id}
                  href={holder.url}
                  className="text-foreground/70 block hover:underline"
                >
                  {holder.title}
                </Link>
              ))}
            </div>
          </details>
        )}
      </dd>
    </div>
  );
}
