import fs from "fs";
import matter from "gray-matter";
import path from "path";

import { AUDIENCES } from "./audience-hub";
import { loadAtoms, loadPaths, loadThreads } from "./content";
import type { Audience } from "./schema";

/**
 * The 5 personas, against the paths they asked for.
 *
 * `content/personas/` holds 5 documents of 1,891-2,543 words written in
 * April, and each ends its `## Journey Map` with a `**Recommended:**` line
 * naming a path to build. All 5 of those paths exist, and all 5 carry the
 * audience the persona asked for — the specification was executed at the
 * level of "make this path for this audience". It was not executed at the
 * level of "teach these ideas in this order": of the 126 concepts the 5
 * Journey Maps prescribe, the recommended paths' lessons teach 80 (63%),
 * and the misses repeat (tracker entry 347, 2026-09-22). Nothing in `src`
 * read `content/personas/` before this module, so the 5 documents that
 * produced 5 of the site's 11 paths were a build input with no reader.
 *
 * The readings on 2026-09-22, which `persona-journeys.test.ts` holds:
 *
 *   persona                  audience      path                   taught
 *   analytical-beginner      beginner      systems-of-improv       18/28
 *   cross-domain-connector   beginner      physics-of-connection   15/27
 *   improv-researcher        advanced      reference-guide         14/20
 *   new-teacher              teacher       teaching-improv         17/26
 *   reflective-practitioner  intermediate  self-coaching-toolkit   16/25
 *                                                                  80/126
 *
 * Entry 347 reports 80 of 141 (57%). 141 is every distinct backticked token
 * in the 5 Journey Maps and 15 of those are not concepts: 9 name a path, 5
 * name an audience, and 1 (`improv-physics-for-life`) names a path the
 * persona proposed that was never created. The numerator is the same either
 * way, because a token that is not an atom is never taught; the denominator
 * this module uses is the 126 that resolve to an atom, so the coverage
 * figure is 63% rather than 57%. `classifyJourneyToken` is what makes that
 * difference checkable instead of a judgement call.
 *
 * Read from the files on each build rather than transcribed, because a
 * transcribed list would stop matching the personas the morning one is
 * edited — the failure this whole entry is about.
 */

const PERSONAS_DIR = path.join(process.cwd(), "content", "personas");

/** The section that carries the curriculum; the other 7 headings are research. */
const JOURNEY_HEADING = /^##\s+Journey Map\s*$/;

/** Any `## ` that is not `### `, so a phase sub-heading does not end the section. */
const SECTION_HEADING = /^##\s+(?!#)/;

/** The line the whole join hangs on, and the last line of the section. */
const RECOMMENDED_LINE = /^\*\*Recommended:\*\*\s*(.+)$/;

/**
 * A backticked id. The personas write every concept, path and audience they
 * name this way, so one pattern finds them all and `classifyJourneyToken`
 * decides what each is — the alternative, reading only the numbered phase
 * lines, would drop the researcher's journey, which lists its concepts as
 * sub-bullets under a phase rather than as a numbered step.
 */
const BACKTICKED = /`([a-z0-9][a-z0-9-]*)`/g;

/** The persona's own name, as its `# ` heading writes it. */
const TITLE_HEADING = /^#\s+(?!#)(.+)$/m;

/** What a backticked token in a Journey Map turned out to be. */
export type JourneyTokenKind = "atom" | "path" | "audience" | "unresolved";

export interface JourneyToken {
  id: string;
  kind: JourneyTokenKind;
}

export interface PersonaJourney {
  /** The filename without `.md`; the personas carry no `id` field. */
  id: string;
  /** The `# ` heading, verbatim: "The Analytical Beginner". */
  name: string;
  /** The persona's own `audience` frontmatter — 1 value, not the paths' list. */
  audience: Audience;
  /** The `**Phase N: …**` headings in order; the curriculum's own shape. */
  phases: string[];
  /** Distinct backticked tokens in the section, in the order they appear. */
  tokens: JourneyToken[];
  /** The tokens that resolve to an atom: what the journey prescribes. */
  prescribed: string[];
  /** The `**Recommended:**` line, whole, so an unparsed one stays visible. */
  recommendation: string | null;
  /**
   * Every backticked token on that line that is the id of a path which
   * exists. Plural on purpose: the cross-domain connector's line offers 2
   * ("Refine `physics-of-connection` … OR create a new path
   * `improv-physics-for-life`") and only the first has ever been built, so
   * the test asserts this is 1 rather than trusting position in the prose.
   */
  recommendedPathIds: string[];
}

export interface PersonaPairing {
  personaId: string;
  personaName: string;
  /** The audience the persona declares. */
  audience: Audience;
  pathId: string;
  pathTitle: string;
  /** The path's own `audience` list, which is many where the persona's is 1. */
  pathAudience: Audience[];
  /** Whether that list contains the persona's audience. */
  audienceMatches: boolean;
  /** Concepts the Journey Map prescribes. */
  prescribed: string[];
  /** Those the recommended path's lessons compose. */
  taught: string[];
  /** Those they do not — the curriculum gap, per persona. */
  missed: string[];
}

export interface RecurringMiss {
  /** The concept id. */
  id: string;
  /** The atom's title, for a list a person reads. */
  title: string;
  type: string;
  /** Every persona whose Journey Map prescribes it. */
  journeys: string[];
  /** The recommended paths that were meant to teach it and do not. */
  missedOn: string[];
  /** The recommended paths that do — empty means no recommended path does. */
  taughtOn: string[];
  /** Any other path whose lessons teach it, so the fix can borrow a lesson. */
  elsewhere: string[];
}

/**
 * What a token is, decided against the corpus rather than against its
 * position in the sentence. A path id and an atom id share a namespace shape
 * and nothing in the prose distinguishes them, so the only honest rule is to
 * ask both registers; an audience name is the third thing the Recommended
 * lines put in backticks, and what is left over is a proposal nothing
 * answers.
 */
function classifyJourneyToken(
  id: string,
  atomIds: ReadonlySet<string>,
  pathIds: ReadonlySet<string>,
): JourneyTokenKind {
  if (atomIds.has(id)) return "atom";
  if (pathIds.has(id)) return "path";
  if ((AUDIENCES as readonly string[]).includes(id)) return "audience";
  return "unresolved";
}

/**
 * One persona's `## Journey Map`, as data.
 *
 * The section runs from its heading to the next `## `, which is `## User
 * Stories` on all 5. Tokens are deduplicated on first appearance, because a
 * concept named in a phase and again in the Path Alignment paragraph is one
 * thing the journey asks for, not 2.
 */
function parseJourney(
  id: string,
  source: string,
  atomIds: ReadonlySet<string>,
  pathIds: ReadonlySet<string>,
): PersonaJourney | null {
  const parsed = matter(source);
  const audience = parsed.data.audience as Audience | undefined;
  const name = TITLE_HEADING.exec(parsed.content)?.[1]?.trim();
  if (!audience || !name) return null;

  const lines = parsed.content.split(/\r?\n/);
  const start = lines.findIndex((line) => JOURNEY_HEADING.test(line));
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (SECTION_HEADING.test(lines[i])) {
      end = i;
      break;
    }
  }
  const body = lines.slice(start + 1, end);

  const phases: string[] = [];
  const seen = new Set<string>();
  const tokens: JourneyToken[] = [];
  let recommendation: string | null = null;
  let recommendedPathIds: string[] = [];

  for (const line of body) {
    const phase = /^\*\*(Phase\s[^*]+)\*\*/.exec(line);
    if (phase) phases.push(phase[1].trim());

    const recommended = RECOMMENDED_LINE.exec(line);
    if (recommended) {
      recommendation = recommended[1].trim();
      recommendedPathIds = [...recommendation.matchAll(BACKTICKED)]
        .map((match) => match[1])
        .filter((token) => pathIds.has(token));
    }

    for (const match of line.matchAll(BACKTICKED)) {
      const token = match[1];
      if (seen.has(token)) continue;
      seen.add(token);
      tokens.push({ id: token, kind: classifyJourneyToken(token, atomIds, pathIds) });
    }
  }

  return {
    id,
    name,
    audience,
    phases,
    tokens,
    prescribed: tokens.filter((token) => token.kind === "atom").map((token) => token.id),
    recommendation,
    recommendedPathIds,
  };
}

let journeysCache: Promise<PersonaJourney[]> | null = null;

/**
 * The 5 journeys, in filename order. Memoised because the path page calls it
 * once per path and the tests call it once per assertion, and the parse is
 * the same 5 files every time.
 */
export function getPersonaJourneys(): Promise<PersonaJourney[]> {
  journeysCache ??= (async () => {
    const [atoms, paths] = await Promise.all([loadAtoms(), loadPaths()]);
    const atomIds = new Set(atoms.map((atom) => atom.frontmatter.id));
    const pathIds = new Set(paths.map((p) => p.frontmatter.id));
    return fs
      .readdirSync(PERSONAS_DIR)
      .filter((file) => file.endsWith(".md"))
      .sort()
      .map((file) => {
        const id = file.replace(/\.md$/, "");
        return parseJourney(
          id,
          fs.readFileSync(path.join(PERSONAS_DIR, file), "utf-8"),
          atomIds,
          pathIds,
        );
      })
      .filter((journey): journey is PersonaJourney => journey !== null);
  })();
  return journeysCache;
}

/** The union of atoms a path's lessons compose — the same join the path page draws. */
async function teachesByPath(): Promise<Map<string, Set<string>>> {
  const [paths, threads] = await Promise.all([loadPaths(), loadThreads()]);
  const lessonAtoms = new Map(threads.map((t) => [t.frontmatter.id, t.frontmatter.atoms ?? []]));
  return new Map(
    paths.map((p) => [
      p.frontmatter.id,
      new Set((p.frontmatter.threads ?? []).flatMap((id) => lessonAtoms.get(id) ?? [])),
    ]),
  );
}

let pairingsCache: Promise<PersonaPairing[]> | null = null;

/**
 * Persona → the path its Recommended line named, with the coverage between
 * them. A journey naming no path that exists is dropped rather than paired
 * with a guess; the test asserts all 5 survive, so a dropped one fails.
 */
export function getPersonaPairings(): Promise<PersonaPairing[]> {
  pairingsCache ??= (async () => {
    const [journeys, paths, teaches] = await Promise.all([
      getPersonaJourneys(),
      loadPaths(),
      teachesByPath(),
    ]);
    const byId = new Map(paths.map((p) => [p.frontmatter.id, p.frontmatter]));

    const pairings: PersonaPairing[] = [];
    for (const journey of journeys) {
      const pathId = journey.recommendedPathIds[0];
      const frontmatter = pathId ? byId.get(pathId) : undefined;
      if (!pathId || !frontmatter) continue;
      const taught = teaches.get(pathId) ?? new Set<string>();
      pairings.push({
        personaId: journey.id,
        personaName: journey.name,
        audience: journey.audience,
        pathId,
        pathTitle: frontmatter.title,
        pathAudience: frontmatter.audience ?? [],
        audienceMatches: (frontmatter.audience ?? []).includes(journey.audience),
        prescribed: journey.prescribed,
        taught: journey.prescribed.filter((id) => taught.has(id)),
        missed: journey.prescribed.filter((id) => !taught.has(id)),
      });
    }
    return pairings;
  })();
  return pairingsCache;
}

export interface PersonaCoverage {
  /** Concepts prescribed across the 5 Journey Maps, summed per persona. */
  prescribed: number;
  /** Those the recommended path teaches: 80 of 126 on 2026-09-22. */
  taught: number;
}

/** The corpus-wide figure, summed over the pairings rather than recomputed. */
export async function getPersonaCoverage(): Promise<PersonaCoverage> {
  const pairings = await getPersonaPairings();
  return {
    prescribed: pairings.reduce((n, p) => n + p.prescribed.length, 0),
    taught: pairings.reduce((n, p) => n + p.taught.length, 0),
  };
}

let missesCache: Promise<RecurringMiss[]> | null = null;

/**
 * Concepts more than 1 journey asks for and the paths those journeys named
 * do not teach.
 *
 * Listed when at least 2 of the recommended paths that were meant to teach a
 * concept do not, because 1 path missing 1 concept is an editorial choice and
 * the same concept missed twice is a curriculum gap. `taughtOn` empty is the
 * strict reading of that — no recommended path teaches it at all — and
 * `elsewhere` says whether any other path does, since a lesson that already
 * teaches it can be borrowed rather than written.
 *
 * On 2026-09-22: 8 concepts, of which `group-scene` and `heightening` are
 * taught on none of the paths their journeys asked for, and `group-scene` is
 * composed by no path on the site at all.
 */
export function getRecurringMisses(): Promise<RecurringMiss[]> {
  missesCache ??= (async () => {
    const [pairings, atoms, teaches] = await Promise.all([
      getPersonaPairings(),
      loadAtoms(),
      teachesByPath(),
    ]);
    const byAtom = new Map(atoms.map((atom) => [atom.frontmatter.id, atom.frontmatter]));

    const asking = new Map<string, PersonaPairing[]>();
    for (const pairing of pairings) {
      for (const id of pairing.prescribed) {
        const rows = asking.get(id) ?? [];
        rows.push(pairing);
        asking.set(id, rows);
      }
    }

    const misses: RecurringMiss[] = [];
    for (const [id, rows] of asking) {
      if (rows.length < 2) continue;
      const missedOn = rows.filter((row) => row.missed.includes(id));
      if (missedOn.length < 2) continue;
      const frontmatter = byAtom.get(id);
      misses.push({
        id,
        title: frontmatter?.title ?? id,
        type: frontmatter?.type ?? "unknown",
        journeys: rows.map((row) => row.personaId),
        missedOn: missedOn.map((row) => row.pathId),
        taughtOn: rows.filter((row) => !row.missed.includes(id)).map((row) => row.pathId),
        elsewhere: [...teaches]
          .filter(([pathId, set]) => set.has(id) && !rows.some((row) => row.pathId === pathId))
          .map(([pathId]) => pathId),
      });
    }
    // Most-missed first, then by id, so the list a person reads is stable
    // between runs and the worst gap is at the top of it.
    return misses.sort((a, b) => b.missedOn.length - a.missedOn.length || a.id.localeCompare(b.id));
  })();
  return missesCache;
}

/**
 * The line a path page says about the reader it was written for, or null.
 *
 * 5 of the 11 paths were specified by a persona and 6 were not, so this is a
 * sentence some paths have and most do not. It links nothing: the personas
 * are not published, publishing them is the author's call, and a line that
 * promised a page which does not exist would be worse than no line. The name
 * is the persona's own `# ` heading, copied, so the page cannot rename a
 * reader the document already named.
 */
export async function personaNoteForPath(pathId: string): Promise<string | null> {
  const pairings = await getPersonaPairings();
  const pairing = pairings.find((candidate) => candidate.pathId === pathId);
  if (!pairing) return null;
  // All 5 names open "The …", which reads wrong mid-sentence; the article is
  // lowercased and nothing else about the document's own name is touched.
  const name = pairing.personaName.replace(/^The /, "the ");
  return `Written for ${name}, one of the reader profiles this site was planned around.`;
}
