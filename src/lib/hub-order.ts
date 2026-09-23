/**
 * The order each of the three biggest practice hubs lists its members in.
 *
 * `/practice/techniques`, `/practice/exercises` and `/practice/formats`
 * rendered `loadAtoms().filter(type)` with no sort of their own, which was
 * reverse-alphabetical on the production build and alphabetical on Windows,
 * and then alphabetical everywhere once the loader sorted by filename — a
 * hundred atoms reordered on production without any hub file changing, and
 * no test able to see it (tracker entry 208). The other hubs state an order
 * (the guides hub's `byReach`, the library's tiers); these did not, and "no
 * order" is the filesystem's order. Each rule below is the one its page file
 * gives in a line, and `hub-order.test.ts` recomputes it and forbids load
 * order as the source.
 */

import { matchesLevel } from "@/app/tools/exercise-picker/picker-config";

import { ageNormalisedRank, byRank, inDegreeIndex } from "./atom-rank";
import { loadAtoms } from "./content";
import type { AtomFrontmatter } from "./schema";

/**
 * The raw count lived here until 2026-09-22 and the sitemap still reads it
 * from here; it moved to atom-rank.ts alongside the age-normalised rule the
 * techniques hub now orders by (entry 307).
 */
export { inDegreeIndex };

type Atom = Awaited<ReturnType<typeof loadAtoms>>[number];

const byTitle = (a: Atom, b: Atom): number =>
  a.frontmatter.title.localeCompare(b.frontmatter.title) ||
  a.frontmatter.id.localeCompare(b.frontmatter.id);

/**
 * Exercises: the drills the exercise picker admits to its beginner level
 * first — the "start here" set — then the rest, each group alphabetical by
 * title. One rule (`matchesLevel`) for the picker, its level pages and this
 * hub, so a drill offered to beginners there is at the top here.
 */
export async function orderedExercises(): Promise<Atom[]> {
  const atoms = await loadAtoms();
  const exercises = atoms.filter((a) => a.frontmatter.type === "exercise");
  const beginner = (a: Atom) => (matchesLevel(a.frontmatter.tags ?? [], "beginner") ? 0 : 1);
  return [...exercises].sort((a, b) => beginner(a) - beginner(b) || byTitle(a, b));
}

/**
 * Formats: short form before long form, alphabetical by title within each.
 * The page's own prose says short form is what suits rooms new to improv,
 * short slots and casts of mixed experience, so the list opens on it.
 */
export async function orderedFormats(): Promise<Atom[]> {
  const atoms = await loadAtoms();
  const formats = atoms.filter((a) => a.frontmatter.type === "format");
  const shortform = (a: Atom) => ((a.frontmatter.tags ?? []).includes("shortform") ? 0 : 1);
  return [...formats].sort((a, b) => shortform(a) - shortform(b) || byTitle(a, b));
}

/**
 * Techniques (and pedagogy): by how much the graph leans on each for its age
 * — declared in-degree per month since `created` (`ageNormalisedRank`) —
 * descending, alphabetical by title on ties. The order is read off the
 * atoms' own links rather than written down, so a technique that gains
 * dependents rises without an edit here.
 *
 * Raw in-degree was the rule until 2026-09-22, and raw in-degree follows
 * age: the edges were written toward the atoms that existed, so the August
 * techniques sat last whatever the newer writing made of them (entry 307).
 * Under the raw count the first ten were all March and April; normalised,
 * `viewpoints` (August, 8 edges in its first month) enters the ten.
 */
export async function orderedTechniques(): Promise<Atom[]> {
  const atoms = await loadAtoms();
  const compare = byRank<AtomFrontmatter>(ageNormalisedRank(atoms));
  const techniques = atoms.filter(
    (a) => a.frontmatter.type === "technique" || a.frontmatter.type === "pedagogy",
  );
  return [...techniques].sort((a, b) => compare(a.frontmatter, b.frontmatter));
}
