/**
 * Which of a page's declared concepts its own words name.
 *
 * A guide declares `entry_atoms` and a lesson declares `atoms`, and every
 * derived surface — the guide's concept block, the lesson's composed-from
 * list, the episode notes, the JSON-LD `about`, the hand-off rankings —
 * reads that declaration as "this page is about concept Y". Matching each
 * declared atom's title against the page's body, guides declare 455 and
 * name 256 (56%) and lessons compose 183 and name 117 (64%), so between a
 * third and a half of what the site says a page is about is a concept the
 * page never utters (tracker entry 294, 2026-09-22). This module is that
 * measurement as code, so the block and the list can mark the difference
 * and named-concepts.test.ts can hold the share as a floor.
 *
 * The match is the tracker's: the title, case-insensitive, as a whole
 * phrase, with any parenthetical dropped — "Beats (First / Second / Third)"
 * is named by "beats" — or the atom's id in backticks, which the renderer
 * turns into the title as a link and is therefore the strongest form of
 * naming a page has. Counting the title alone put guides at 256 of 455;
 * counting backticks too they name 370 (81%), and lessons, which never
 * backtick, stay at 117 (corrected 2026-09-22). It is deliberately
 * stricter than `threadNamesAtom` in content.ts, which also accepts
 * aliases, the prefix before a colon and inflections; that one answers
 * "does the lesson mention it at all", this one answers "does the page say
 * the concept's name".
 */

import { loadAtoms, loadBridges, loadThreads } from "./content";

/**
 * The suffix a surface puts after a declared concept its page never names.
 * One string, read by the guide's concept block and the lesson's
 * composed-from list, so the two layers mark the gap in the same words.
 */
export const NOT_DISCUSSED_LABEL = "(listed, not discussed)";

/** The title as the page would have to say it: parentheticals gone, one space between words. */
export function conceptPhrase(atomTitle: string): string {
  return atomTitle
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titlePattern(atomTitle: string, flags: string): RegExp | null {
  const phrase = conceptPhrase(atomTitle);
  if (!phrase) return null;
  const pattern = escapeRegExp(phrase).replace(/ /g, "\\s+");
  return new RegExp(`(?<![A-Za-z0-9])${pattern}(?![A-Za-z0-9])`, flags);
}

/** The backticked id as the source markdown writes it: the autolinker's own pattern. */
function backtickPattern(atomId: string, flags: string): RegExp {
  return new RegExp(`\`${escapeRegExp(atomId)}\``, flags);
}

/**
 * Whether `text` says the atom's title as a whole phrase, in any case, or
 * backticks its id (when the id is given). A backticked id renders as the
 * title, linked, so it names the concept at least as plainly as the title.
 */
export function namesConcept(text: string, atomTitle: string, atomId?: string): boolean {
  if (atomId && backtickPattern(atomId, "").test(text)) return true;
  const pattern = titlePattern(atomTitle, "i");
  return pattern !== null && pattern.test(text);
}

/**
 * How many times `text` names the atom: title mentions plus backticked ids.
 * Zero exactly when `namesConcept` is false. The guide's concept block
 * ranks its named concepts by this, so the block leads with the concept the
 * page discusses most rather than the one the site routes most demand to
 * (tracker entry 296, 2026-09-22).
 */
export function mentionCount(text: string, atomTitle: string, atomId?: string): number {
  const ticks = atomId ? (text.match(backtickPattern(atomId, "g")) ?? []).length : 0;
  // A one-word id is its own lowercased title (`offers`, Offers), so the
  // backticked spans are cut before the title is counted, or each would
  // count twice.
  const prose = atomId ? text.replace(backtickPattern(atomId, "g"), " ") : text;
  const pattern = titlePattern(atomTitle, "gi");
  const titles = pattern ? (prose.match(pattern) ?? []).length : 0;
  return titles + ticks;
}

/**
 * What a section heading adds to a concept's rank: enough that any headed
 * concept sorts before every unheaded one, whatever their mention counts.
 * A heading is the page's own statement of a section's subject, where a
 * mention is a word in passing; the mention rank could not tell a concept
 * discussed for a whole section from one named 5 times on the way past
 * (tracker entry 324, 2026-09-22). No guide mentions a declared concept
 * more than 43 times (status on how-to-be-more-assertive), and
 * headed-concepts.test.ts holds the maximum under this weight so the 2
 * scales never overlap.
 */
export const HEADING_WEIGHT = 1000;

/**
 * The guide concept block's sort key: headed concepts first, ranked among
 * themselves by mention count; then the rest by mention count. Zero
 * exactly when the page neither heads nor names the concept.
 */
export function conceptRank(mentions: number, headed: boolean): number {
  return mentions + (headed ? HEADING_WEIGHT : 0);
}

/** The ids among `atoms` whose title `text` names, or whose id it backticks. */
export function namedAtomIds(
  text: string,
  atoms: readonly { id: string; title: string }[],
): Set<string> {
  const named = new Set<string>();
  for (const atom of atoms) {
    if (namesConcept(text, atom.title, atom.id)) named.add(atom.id);
  }
  return named;
}

type DeclaringLayer = "guides" | "lessons";

interface PageNamedShare {
  slug: string;
  /** Declared ids that resolve to a real atom, deduplicated. */
  declared: number;
  /** Of those, how many the body names, by title or by backticked id. */
  named: number;
  /** The declared concepts the body never utters. */
  unnamed: string[];
}

interface LayerNamedShare {
  pages: PageNamedShare[];
  declared: number;
  named: number;
  /** named / declared, 0 when nothing is declared. */
  share: number;
}

/**
 * Per page, what the layer declares against what its body names, with the
 * layer's totals. A declared id that names no atom is not counted on either
 * side: guide-concepts.test.ts already reports those and the surfaces drop
 * them.
 */
export async function namedShare(layer: DeclaringLayer): Promise<LayerNamedShare> {
  const atoms = await loadAtoms();
  const titleById = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter.title]));
  const pagesIn =
    layer === "guides"
      ? (await loadBridges()).map((b) => ({
          slug: b.slug,
          ids: b.frontmatter.entry_atoms ?? [],
          text: b.content,
        }))
      : (await loadThreads()).map((t) => ({
          slug: t.frontmatter.id,
          ids: t.frontmatter.atoms ?? [],
          text: t.content,
        }));

  const pages: PageNamedShare[] = pagesIn.map(({ slug, ids, text }) => {
    const resolved = [...new Set(ids)]
      .filter((id) => titleById.has(id))
      .map((id) => ({ id, title: titleById.get(id)! }));
    const named = namedAtomIds(text, resolved);
    return {
      slug,
      declared: resolved.length,
      named: named.size,
      unnamed: resolved.filter((a) => !named.has(a.id)).map((a) => a.id),
    };
  });
  const declared = pages.reduce((n, p) => n + p.declared, 0);
  const named = pages.reduce((n, p) => n + p.named, 0);
  return { pages, declared, named, share: declared ? named / declared : 0 };
}
