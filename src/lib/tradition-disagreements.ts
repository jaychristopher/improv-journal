import { extractCounterPositions, getAtomUrl } from "./content";
import type { AtomFrontmatter } from "./schema";

/**
 * Which tradition a counter-position label names.
 *
 * The label is the parenthesised part of `**Counter-position (Napier):**`. It
 * is free text, so the match is by substring against the names each school
 * is known by in the corpus. A label naming a person outside the five
 * (Meisner, Diderot) maps to nothing and stays with its host atom.
 */
const LABEL_ALIASES: Record<string, string[]> = {
  johnstone: ["johnstone"],
  spolin: ["spolin"],
  close: ["close", "halpern", "io "],
  ucb: ["ucb", "game tradition", "hines", "upright"],
  annoyance: ["napier", "annoyance", "tj & dave", "tj and dave"],
};

export function traditionsNamedBy(label: string | undefined): string[] {
  if (!label) return [];
  const l = ` ${label.toLowerCase()} `;
  return Object.entries(LABEL_ALIASES)
    .filter(([, keys]) => keys.some((k) => l.includes(k)))
    .map(([t]) => t);
}

export interface Disagreement {
  atomTitle: string;
  atomUrl: string;
  text: string;
  /** The objector as written in the label, when there is one. */
  label?: string;
}

type Atom = { frontmatter: AtomFrontmatter; content: string };

export const TRADITION_REF_IDS: Record<string, string[]> = {
  johnstone: ["ref-impro-johnstone", "ref-impro-storytellers-johnstone"],
  spolin: ["ref-spolin-improvisation-for-theater"],
  close: ["ref-truth-in-comedy"],
  ucb: ["ref-ucb-manual", "ref-hines-substack", "ref-hines-greatest-improviser"],
  annoyance: ["ref-napier-improvise", "ref-tj-dave-speed-of-life"],
};

function traditionsCitedBy(atom: Atom): string[] {
  const ids = new Set((atom.frontmatter.links ?? []).map((l) => l.id));
  return Object.entries(TRADITION_REF_IDS)
    .filter(([, refs]) => refs.some((r) => ids.has(r)))
    .map(([t]) => t);
}

/**
 * Split a tradition's member atoms by how they cite it.
 *
 * `getAtomsForTradition` admits any atom with any link to the tradition's
 * references, and the tradition page rendered the lot as "Concepts citing
 * this tradition". Ten of the Annoyance page's 36 reached it only through
 * `contrasts` — the UCB game-finding apparatus (discovery, heightening,
 * premise, game-of-the-scene) listed as Annoyance concepts because they
 * disagree with Napier, on the same page whose pushback section quoted
 * Napier disagreeing with them (tracker entry 58, 2026-09-21).
 *
 * `informed`: atoms with at least one non-`contrasts` edge to the tradition,
 * which is what "citing" meant. `contested`: atoms whose every edge to it is
 * `contrasts` — they belong on the page, as the concepts the tradition
 * argues with, not as its own.
 */
export function splitTraditionMembers<T extends Atom>(
  tradition: string,
  members: T[],
): { informed: T[]; contested: T[] } {
  const refs = TRADITION_REF_IDS[tradition] ?? [];
  const informed: T[] = [];
  const contested: T[] = [];
  for (const atom of members) {
    const edges = (atom.frontmatter.links ?? []).filter((l) => refs.includes(l.id));
    if (edges.length > 0 && edges.every((l) => l.relation === "contrasts")) contested.push(atom);
    else informed.push(atom);
  }
  return { informed, contested };
}

function clip(text: string): string {
  return text.length > 200 ? text.substring(0, 200).replace(/\s+\S*$/, "") + "..." : text;
}

/**
 * Split the counter-positions relevant to a tradition page into two lists.
 *
 * `pushback`: what this tradition says against others — counter-positions
 * whose label names it, from any atom, plus unlabelled ones on atoms that
 * cite this tradition and no other (the only case where the host atom
 * identifies the objector).
 *
 * `objections`: counter-positions on this tradition's member atoms whose
 * label names a different tradition — what others say against its concepts.
 */
export function sortDisagreements(
  tradition: string,
  allAtoms: Atom[],
  members: Atom[],
): { pushback: Disagreement[]; objections: Disagreement[] } {
  const pushback: Disagreement[] = [];
  const objections: Disagreement[] = [];
  const memberIds = new Set(members.map((a) => a.frontmatter.id));

  for (const a of allAtoms) {
    if (a.frontmatter.type === "reference") continue;
    const cited = traditionsCitedBy(a);
    for (const cp of extractCounterPositions(a.content)) {
      if (cp.text.length <= 20) continue;
      const named = traditionsNamedBy(cp.tradition);
      const item: Disagreement = {
        atomTitle: a.frontmatter.title,
        atomUrl: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
        text: clip(cp.text),
        label: cp.tradition,
      };
      if (named.includes(tradition)) {
        pushback.push(item);
      } else if (named.length === 0 && cited.length === 1 && cited[0] === tradition) {
        pushback.push(item);
      } else if (named.length > 0 && memberIds.has(a.frontmatter.id)) {
        objections.push(item);
      }
    }
  }
  return { pushback, objections };
}
