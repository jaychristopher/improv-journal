/**
 * Counts of the laws and principles the site is built on.
 *
 * These numbers appear in the site-wide meta description, the Organization
 * markup, the default share card and the principles hub's own title and
 * heading. They were hardcoded as "six laws, eight principles" and then a
 * seventh law and a ninth principle were written, leaving the homepage
 * description, the structured data and a page title that said "The 8
 * Principles" above a list of nine.
 *
 * Deriving them from the content means the claim cannot drift from the thing
 * it describes.
 */

import { loadAtoms, loadBridges, loadPaths, loadThreads } from "./content";
import type { ContentStatus } from "./schema";

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
];

/** Spelled-out number for use in prose, falling back to digits past twelve. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export interface SystemCounts {
  laws: number;
  principles: number;
  /** e.g. "Seven laws, nine principles" */
  tagline: string;
}

export async function getSystemCounts(): Promise<SystemCounts> {
  const atoms = await loadAtoms();
  const laws = atoms.filter((a) => a.frontmatter.type === "law").length;
  const principles = atoms.filter((a) => a.frontmatter.type === "principle").length;

  const capitalised = numberWord(laws).charAt(0).toUpperCase() + numberWord(laws).slice(1);
  return {
    laws,
    principles,
    tagline: `${capitalised} laws, ${numberWord(principles)} principles`,
  };
}

export type StatusLayer = "atoms" | "guides" | "lessons" | "paths";

export type StatusCounts = Record<ContentStatus, number>;

export interface StatusDistribution {
  /** Across the four published layers. */
  total: StatusCounts;
  byLayer: Record<StatusLayer, StatusCounts>;
}

const emptyCounts = (): StatusCounts => ({ seed: 0, draft: 0, validated: 0 });

/**
 * How many pages sit at each maturity state, in all and by layer.
 *
 * The schema's ladder is seed → draft → validated, and the About page has
 * promised since the first commit that the labels are "meant honestly". On
 * 2026-09-22 the corpus was 284 drafts, 26 seeds and 9 validated, and the
 * split was a layer property: 200 of 205 atoms and 77 of 78 guides were
 * drafts, while 18 of 25 lessons and 8 of 11 paths were seeds — the
 * curriculum, the layer with the most furniture, was by the author's own
 * field the least written (tracker entries 318 and 319). Derived here, beside
 * the law and principle counts, so the tests that record the distribution as
 * a dated reading count the same field the byline prints.
 */
export async function getStatusDistribution(): Promise<StatusDistribution> {
  const [atoms, bridges, threads, paths] = await Promise.all([
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);
  const layers: Record<StatusLayer, ContentStatus[]> = {
    atoms: atoms.map((a) => a.frontmatter.status),
    guides: bridges.map((b) => b.frontmatter.status),
    lessons: threads.map((t) => t.frontmatter.status),
    paths: paths.map((p) => p.frontmatter.status),
  };
  const total = emptyCounts();
  const byLayer = {
    atoms: emptyCounts(),
    guides: emptyCounts(),
    lessons: emptyCounts(),
    paths: emptyCounts(),
  };
  for (const layer of Object.keys(layers) as StatusLayer[]) {
    for (const status of layers[layer]) {
      byLayer[layer][status] += 1;
      total[status] += 1;
    }
  }
  return { total, byLayer };
}
