/**
 * The seed layer, on one page — writes docs/seeds.md.
 *
 * Usage:
 *   node scripts/seeds.mjs            # rewrite docs/seeds.md
 *   node scripts/seeds.mjs --check    # exit 1 if docs/seeds.md is stale
 *
 * By its own labels the curriculum is the site's least finished layer: 18 of
 * the 25 lessons and 8 of the 11 paths were `seed` on 2026-09-22, the first
 * of the schema's three maturity states, while 200 of 205 atoms and 77 of 78
 * guides were `draft`; 29 of the 39 lesson slots on the paths held a seed and
 * 10 of the 11 paths opened on one (tracker entry 319). The lesson rewrite
 * entry 254 asked for is the standing authoring recommendation, and the tests
 * hold 150-odd dated readings, many of them measured on those seeds: drill
 * agreement, named share, block counts, forward needs, reading time. A
 * rewrite that turns a seed into a draft will move them, which the guards are
 * meant to welcome — so the author needs, beside each seed, the files whose
 * readings it will move.
 *
 * Everything here is derived from the repo on each run: the seeds from the
 * `status` field, the word counts from the lesson bodies, the test files from
 * a search for each lesson's id in src/lib/__tests__. A hand-kept list would
 * drift the morning a seed became a draft.
 *
 * The last section is the author's 1 sentence per lesson: lesson → lesson
 * prose links are 0 across the corpus, 0 of the 600 ordered pairs, so the
 * only thing saying the 25 lessons form an order is furniture (tracker entry
 * 339). Each row is a lesson, the lesson its own path puts before it, and
 * the concepts they share; a lesson whose body names its predecessor drops
 * off. The home path is read the way `getParentPath` reads it, because 9 of
 * the 25 lessons sit on more than 1 path.
 *
 * Another section is the same kind of list for the atoms: the pairs that
 * declare a directional relation toward each other — `extends` on 71 pairs
 * and `illustrates` on 70 on 2026-09-22 (tracker entry 327). Which way each
 * should run is the author's call, not the code's, so the page lists them
 * and mutual-edges.test.ts holds the counts as ceilings that may only fall.
 *
 * A further section is the curriculum half of the April plan. It named, per
 * page, the concepts that page would teach, and 108 of the 205 concept slots
 * it assigned to a path are taught by that path's lessons (tracker entry
 * 342). The sections at 0 are listed, because a reader who takes the path
 * never meets those concepts — a lesson missing from the path, not a page
 * missing from the site.
 *
 * Another section is the linking half of the same April folder. The sitemap
 * outline wrote a link budget for the guide layer — 4-6 atoms, 2-4 exercises,
 * 1 path, 1-2 threads, 2-3 other guides — and 4 of those 5 clauses are now
 * answered by blocks the guide page assembles. The exercise clause is not,
 * because a drill only reaches a guide page when the guide's own body names
 * it (tracker entry 343). The guides that name none are listed with the
 * keyword each is written for, since the fix is a sentence rather than a
 * component.
 *
 * The newest section is the audio layer against its own specification. The TTS
 * scripts keep `content/scripts/SCRIPT_GUIDE.md` more closely than any page
 * layer keeps anything — 12 delivery tags, 12,800 uses, no markdown, no
 * speaker labels (tracker entry 348) — and `script-format.test.ts` now holds
 * that. The residue is listed here instead: the 5 tag uses the guide has no
 * word for, and the scripts off their word target by layer. Neither is a
 * defect. Re-cutting a line or a script is a recording decision, so the page
 * names the files and leaves the call alone. The vocabulary and both word
 * targets are parsed out of the guide, never copied.
 *
 * The last section is entry 342's failure again, in a second April document.
 * The 5 personas each close their Journey Map with a `**Recommended:**` line
 * naming a path to build; all 5 of those paths exist with the audience the
 * persona asked for, and their lessons teach 80 of the 126 concepts the
 * Journey Maps prescribe (tracker entry 347). The concepts more than 1
 * persona asks for and more than 1 of those paths skips are listed with the
 * path that already teaches each, because the fix is a lesson on a path and
 * an existing lesson is cheaper to move than to write.
 *
 * The newest section leaves the content layer altogether. `docs/sop/` audited
 * itself in 15 numbered concerns and shipped a fix for every one; 11 of the 15
 * fixes are documents and all 11 exist, and of the 3 that are rules about future
 * behaviour, 3 are broken (tracker entry 351). One of them is the lessons
 * curation policy — 5 per SOP, overflow archived — which 4 SOPs exceed with no
 * archive to move anything into. Which lesson is least load-bearing is the
 * judgement the policy itself describes, so the page lists what that judgement
 * needs: every lesson those SOPs hold, the run each names, and how many other
 * lessons name the same run. The cap is read out of the README each run.
 *
 * The newest section is the field nobody has filled in. `aliases` says what
 * else a concept is called, and the linker, site search and schema.org all
 * read it; it holds 43 registrations on 33 of the 205 concepts, the other 172
 * have never been asked, and the 43 are said 1,576 times across the 308
 * bodies (tracker entry 353). So the page carries a shortlist: for each
 * concept with no alias, the phrases this corpus already puts beside it, with
 * the share of their pages that already name the concept and that share
 * against the concept's own base rate. Co-occurrence is not synonymy and no
 * count here reads a sentence, so every row is a candidate for the author and
 * never a decision — an alias links on every page that says the phrase, which
 * is how the linker once made 89 wrong links at once. The same section
 * carries the 5 one-word aliases the allowlist declined on judgement and
 * never sampled, now sampled against the 1-in-5 bar the list is held to;
 * nothing in this repo adds a word to that list.
 *
 * The final section is the keyword layer's own vertical relation. `parent` is
 * the broader term Ahrefs says Google ranks a page for, and of the 137
 * distinct parents the guides declare, 44 are head terms no page on the site
 * claims — several of them the largest demand the guide layer has recorded
 * (tracker entry 352). Unclaimed is a decision and not a defect: the parent is
 * usually the head the page deliberately did not chase. So the page lists the
 * 44 with the child keywords under each, the best traffic potential among
 * them, and the declaring guide's `serp_verdict`, which is the column that
 * says whether anyone judged the head. Every figure is the child keyword's own
 * frontmatter, copied; `src/lib/keyword-parents.mjs` holds the classification
 * for `npm run seo:audit` as well, and `parent-topics.test.ts` holds the
 * counts.
 */

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import {
  aliasCandidates,
  aliasCoverage,
  oneWordAliasReadings,
} from "../src/lib/alias-candidates.ts";
import { classifyKeywordParents } from "../src/lib/keyword-parents.mjs";

const ROOT = process.cwd();
const ATOMS = path.join(ROOT, "content", "atoms");
const BRIDGES = path.join(ROOT, "content", "bridges");
const THREADS = path.join(ROOT, "content", "threads");
const PATHS = path.join(ROOT, "content", "paths");
const TESTS = path.join(ROOT, "src", "lib", "__tests__");
const PATH_PROGRESSION = path.join(ROOT, "src", "lib", "path-progression.ts");
const OUTLINE = path.join(ROOT, "content", "outlines", "all-paths.md");
const PERSONAS = path.join(ROOT, "content", "personas");
const SCRIPTS = path.join(ROOT, "content", "scripts");
const SOP_DIR = path.join(ROOT, "docs", "sop");
const LESSONS_ARCHIVE = path.join(SOP_DIR, "lessons-archive");
const OUT = path.join(ROOT, "docs", "seeds.md");

/**
 * How much of the alias shortlist a person will actually read. The pass
 * produces a candidate for more than half the concepts that have no alias,
 * and a page nobody finishes is worth less than a short one somebody acts
 * on, so the page says how many it left out rather than printing them.
 */
const ALIAS_CANDIDATE_ATOMS_SHOWN = 25;
const ALIAS_CANDIDATES_PER_ATOM = 3;

/** The 4 script layers with 1 `<id>-tts.txt` per published page. */
const SCRIPT_LAYERS = ["atoms", "bridges", "paths", "threads"];
/** Every bracketed direction, the way `transcripts.ts` strips them. */
const SCRIPT_DIRECTION = /\[([^\]]*)\]/g;
/** Provenance, not delivery: the rewrite pass's marker, outside the guide by design. */
const SCRIPT_PROVENANCE = new Set(["rewritten"]);

function readDir(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, f), "utf8"));
      return { id: data.id, fm: data, body: content };
    });
}

/**
 * Words of prose in a markdown body: images, code, html and link targets
 * out; heading marks, emphasis and list bullets stripped. Close to what the
 * page's reading time counts from the rendered html, without rendering it.
 */
export function proseWords(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.split(" ").length : 0;
}

/** The relations the schema directs and the authors declare both ways (entry 327). */
export const MUTUAL_RELATIONS = ["extends", "illustrates"];

/**
 * Unordered pairs of atoms that each declare `relation` toward the other,
 * sorted by the first id then the second. `contrasts` is symmetric by design
 * and is not a case; `requires` and `enables` are mutual on 6 and 4 pairs,
 * most inside the core, and the core is a cycle on purpose (entry 309).
 */
export function mutualPairs(atoms, relation) {
  const edges = new Set();
  for (const a of atoms) {
    for (const l of a.fm.links ?? []) if (l.relation === relation) edges.add(`${a.id}>${l.id}`);
  }
  const seen = new Set();
  const pairs = [];
  for (const a of atoms) {
    for (const l of a.fm.links ?? []) {
      if (l.relation !== relation || !edges.has(`${l.id}>${a.id}`)) continue;
      const pair = [a.id, l.id].sort();
      const key = pair.join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push(pair);
    }
  }
  return pairs.sort((x, y) => x[0].localeCompare(y[0]) || x[1].localeCompare(y[1]));
}

/**
 * The first bold `**Trains:**` line in a body — the same line src/lib/trains.ts
 * reads, and the same regex, because a .mjs script cannot import the module.
 */
const TRAINS_LINE = /^\*\*Trains:\*\*\s*(.+)$/m;

/**
 * The drills whose Trains line cannot route them: the ones with no line at
 * all, and the ones whose line describes the effect in prose and names no
 * concept the graph holds.
 *
 * A concept is named when its title appears whole in the line,
 * case-insensitively, which is what `titlesNamedIn` does in trains.ts;
 * references and other exercises are not candidates there, so they are not
 * here (a drill trains a concept, never a book or another drill).
 */
export function drillsWithoutTrainsTarget(atoms) {
  const candidates = atoms
    .filter((a) => a.fm.type !== "reference" && a.fm.type !== "exercise")
    .map((a) => ({ id: a.id, title: a.fm.title }));
  return atoms
    .filter((a) => a.fm.type === "exercise")
    .map((a) => {
      const match = TRAINS_LINE.exec(a.body);
      const line = match ? match[1].trim() : null;
      const named =
        line === null
          ? []
          : candidates
              .filter(({ id, title }) => {
                const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                return (
                  id !== a.id &&
                  new RegExp(`(^|[^a-z0-9])${escaped}(?=[^a-z0-9]|$)`, "i").test(line)
                );
              })
              .map(({ id }) => id);
      return { id: a.id, title: a.fm.title, line, named };
    })
    .filter((d) => d.named.length === 0)
    .sort(
      (a, b) => (a.line === null ? 0 : 1) - (b.line === null ? 0 : 1) || a.id.localeCompare(b.id),
    );
}

/**
 * `namesConcept` in src/lib/named-concepts.ts, as the same regex, because a
 * .mjs script cannot import the module: the concept's title as a whole
 * phrase, case-insensitively, with any parenthetical dropped — "Beats (First
 * / Second / Third)" is named by "beats" — or the atom's id in backticks,
 * which the renderer turns into the title as a link and is therefore the
 * plainest form of naming a page has.
 */
export function namesConcept(body, id, title) {
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\`${escape(id)}\``).test(body)) return true;
  const phrase = title
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!phrase) return false;
  return new RegExp(
    `(?<![A-Za-z0-9])${escape(phrase).replace(/ /g, "\\s+")}(?![A-Za-z0-9])`,
    "i",
  ).test(body);
}

/**
 * Guides that reach no drill at all, and name fewer than 2 in words.
 *
 * Every drill a guide page shows is read out of that guide's own body:
 * `getGuideDrills` takes the backticked exercise ids and the CTA fallback
 * takes the ones the practice closer names. A guide that backticks none and
 * declares no exercise CTA therefore gets no drill card, no "Practise it"
 * row and no drill beside the CTA, and no block can supply one — which is
 * why the exercise clause of the April link budget is the only one of its 5
 * the furniture cannot answer (tracker entry 343).
 *
 * The second half of the test is the plan's own number, 2 exercises, read
 * against the words rather than the rendered links, so this list is derivable
 * from the markdown alone. Counted by rendered links the list is the same
 * size and not quite the same guides; guide-link-budget.test.ts records both
 * and holds this one as a ceiling.
 */
export function guidesWithNoDrill(atoms, bridges) {
  const drills = atoms
    .filter((a) => a.fm.type === "exercise")
    .map((a) => ({ id: a.id, title: a.fm.title }));
  const ids = new Set(drills.map((d) => d.id));
  return bridges
    .filter((g) => {
      const backticked = [...g.body.matchAll(/`([a-z0-9-]+)`/g)].some((m) => ids.has(m[1]));
      const declared = g.primaryCtaType === "exercise" && ids.has(g.primaryCtaTarget);
      if (backticked || declared) return false;
      return drills.filter((d) => namesConcept(g.body, d.id, d.title)).length < 2;
    })
    .sort(
      (a, b) =>
        (b.keyword?.traffic_potential ?? -1) - (a.keyword?.traffic_potential ?? -1) ||
        a.slug.localeCompare(b.slug),
    );
}

/**
 * Guides whose every declared concept is declared by no other guide.
 *
 * The related-guides rail scores on `entry_atoms`, so such a guide cannot be
 * scored by any other page: no rail reaches it by declaration. A guide is read
 * from its filename because bridges carry no `id` field, the way the routes do.
 */
export function guidesDeclaringAlone(bridges) {
  const declaring = new Map();
  for (const g of bridges) {
    for (const atom of new Set(g.atoms)) declaring.set(atom, (declaring.get(atom) ?? 0) + 1);
  }
  return bridges
    .filter((g) => g.atoms.length > 0 && g.atoms.every((atom) => declaring.get(atom) === 1))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * The 2 halves of the site's outward identity, joined on the entity name.
 *
 * 22 of the 78 guides declare a `subject` — a named entity with a Wikipedia
 * or Wikidata record — while 170 of the 173 concepts assert no identity
 * outside this site at all; 3 carry a bare `sameAs` and 3 more a `subject`
 * block of their own (tracker entry 340, 2026-09-22). The 32 references are
 * the exception that shows the pattern: every one carries a full `work`,
 * because a book is an external thing and the site knew it needed an
 * identifier for it.
 *
 * `ready` is the join that exists and is unstated: an atom whose title is
 * exactly a guide's declared subject name, case-insensitively, that carries
 * no `sameAs` of its own. Adding one is copying the record the guide already
 * declares, so there is nothing to look up — and the list is empty on
 * 2026-09-22, because all 3 such atoms were given theirs already.
 *
 * `gaps` is the other side: a guide's subject that no atom titles, 19 of the
 * 22. Each needs either a new concept or nothing, and that is the author's
 * call rather than the code's. No URL is invented here or anywhere: an
 * identifier is added only when somebody has looked it up, the same rule the
 * Ahrefs figures live under.
 */
export function identityCandidates(atoms, bridges) {
  const byTitle = new Map(atoms.map((a) => [a.fm.title.trim().toLowerCase(), a]));
  const declared = bridges.filter((b) => b.subject?.name);
  const ready = [];
  const gaps = [];
  for (const guide of declared) {
    const name = guide.subject.name.trim();
    const atom = byTitle.get(name.toLowerCase());
    if (!atom) {
      gaps.push({
        slug: guide.slug,
        title: guide.title,
        name,
        type: guide.subject.type,
        sameAs: guide.subject.sameAs ?? [],
      });
    } else if (!(atom.fm.sameAs ?? []).length) {
      ready.push({
        id: atom.id,
        title: atom.fm.title,
        type: atom.fm.type,
        guide: guide.slug,
        name,
        declares: (guide.atoms ?? []).includes(atom.id),
        sameAs: guide.subject.sameAs ?? [],
      });
    }
  }
  const bySlug = (a, b) => a.slug.localeCompare(b.slug);
  return {
    declared: declared.length,
    ready: ready.sort((a, b) => a.id.localeCompare(b.id)),
    gaps: gaps.sort(bySlug),
  };
}

/** Test files that name a lesson id — as a slug token, not as part of another. */
function testsNaming(id, files) {
  const re = new RegExp(`(?<![\\w-])${id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
  return files.filter((f) => re.test(f.source)).map((f) => f.name);
}

/**
 * The atoms a path's `prerequisites` sentence names, by title, split into
 * those the path's own lessons compose and those they do not.
 *
 * A prerequisite sentence should name what the reader brings, not what the
 * path gives; on 2026-09-22 the 4 sentences that named a concept at all named
 * 5, and 4 of the 5 were taught on the path itself — "comfort with finding
 * and heightening the game of the scene" on the path whose lessons compose
 * `game-of-the-scene` and `heightening` (tracker entry 329). Matched as a
 * whole atom title inside the sentence, case-insensitively, at word
 * boundaries; a title that carries a subtitle ("The Harold: Improv's Most
 * Important Long-Form Format") does not match its short name, which is why
 * "such as Harold or montage" names only `montage`.
 */
export function sentenceNames(sentence, atoms, taught) {
  const lower = sentence.toLowerCase();
  const named = atoms
    .filter((a) => {
      const title = a.fm.title.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(?<![\\w-])${title}(?![\\w-])`).test(lower);
    })
    .map((a) => a.id)
    .sort();
  return {
    taughtHere: named.filter((id) => taught.has(id)),
    taughtElsewhere: named.filter((id) => !taught.has(id)),
  };
}

/**
 * The mastery sequence, read out of src/lib/path-progression.ts rather than
 * copied here.
 *
 * A .mjs script cannot import the module (the same reason the Trains regex
 * above is a regex), and the map is the one thing the home-path rule cannot
 * be derived without — a copy would drift the morning an edge moved. Parsed
 * from the literal, so a change to its shape fails loudly instead of
 * silently returning an empty sequence.
 */
export function readProgression(source) {
  const block = /const PROGRESSION: Record<string, string> = \{([\s\S]*?)\n\};/.exec(source);
  if (!block) throw new Error("path-progression.ts: could not read the PROGRESSION map");
  const map = {};
  for (const m of block[1].matchAll(/"([^"]+)":\s*"([^"]+)"/g)) map[m[1]] = m[2];
  if (Object.keys(map).length === 0) throw new Error("path-progression.ts: PROGRESSION is empty");
  return map;
}

/** The path PROGRESSION starts from, as content.ts names it. */
const PROGRESSION_ROOT = "beginner-foundations";

/**
 * Where a path sits in the mastery sequence, by `getPathProgressionRank`'s
 * rule: steps remaining to the end of the chain, subtracted from the longest
 * walk, so the 3 side entrances do not each rank as a first step. A path off
 * the chain ranks after every path on it.
 */
export function progressionRank(progression, pathId) {
  const stepsToEnd = (id) => {
    let steps = 0;
    const seen = new Set([id]);
    for (let next = progression[id]; next && !seen.has(next); next = progression[next]) {
      seen.add(next);
      steps += 1;
    }
    return steps;
  };
  const longest = stepsToEnd(PROGRESSION_ROOT);
  const onChain = pathId in progression || Object.values(progression).includes(pathId);
  return onChain ? longest - stepsToEnd(pathId) : longest + 1;
}

/** The ladder /paths draws; content.ts's AUDIENCE_ORDER, for the same tie-break. */
const AUDIENCE_ORDER = ["beginner", "intermediate", "teacher", "advanced", "performer"];

function audienceRank(audience) {
  const ranks = (audience ?? []).map((a) => AUDIENCE_ORDER.indexOf(a)).filter((i) => i >= 0);
  return ranks.length ? Math.min(...ranks) : AUDIENCE_ORDER.length;
}

/**
 * The path a lesson belongs to first — `getParentPath`'s rule, spelled again
 * because the script cannot import it.
 *
 * 9 of the 25 lessons are sequenced by 2 or more paths and 1 of them by 4, so
 * "the lesson before it" has no answer without this: the breadcrumb, the
 * lessons index and the atom page all read the lowest-ranked path, ties
 * broken by the lesson's place on it, then the path's audience, then title
 * (tracker entry 262). A list here that picked another path would name a
 * neighbour the reader's own page never mentions.
 */
export function homePath(lessonId, paths, progression) {
  const on = paths.filter((p) => (p.fm.threads ?? []).includes(lessonId));
  if (on.length <= 1) return on[0] ?? null;
  const at = (p) => (p.fm.threads ?? []).indexOf(lessonId);
  return [...on].sort(
    (a, b) =>
      progressionRank(progression, a.id) - progressionRank(progression, b.id) ||
      at(a) - at(b) ||
      audienceRank(a.fm.audience) - audienceRank(b.fm.audience) ||
      a.fm.title.localeCompare(b.fm.title),
  )[0];
}

/** A title as a whole phrase in a body, case-insensitively — `sentenceNames`'s match. */
export function namesTitle(body, title) {
  const escaped = title.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(body.toLowerCase());
}

/**
 * Lessons whose prose never names the lesson their own path puts before them.
 *
 * Measured over rendered bodies with the chrome and the derived blocks out,
 * lesson → lesson links are 0 and so are path → path: no lesson's prose names
 * another lesson's title anywhere in the 25 files, 0 of the 600 ordered
 * pairs, and 1 lesson uses a sequence phrase at all (tracker entry 339,
 * 2026-09-22). The paths do the joining and do it completely — 17 mentions,
 * 17 linked — so every statement that the lessons form an order is furniture:
 * the prev/next nav, the program map, the progress bar. The ask is 1 sentence
 * per lesson, and this is the list to write them from.
 *
 * Per row: the home path, the lesson before it there, and the concepts both
 * compose — the material the sentence is made of. A lesson whose body already
 * names its predecessor drops off the list, which is what finishing looks
 * like. The lesson page now derives a line where the predecessor taught a
 * concept this lesson's atoms need next (src/lib/lesson-crosslinks.ts); the
 * author's sentence is what replaces it.
 */
export function lessonsNotNamingNeighbour(threads, paths, progression) {
  const byId = new Map(threads.map((t) => [t.id, t]));
  return threads
    .map((lesson) => {
      const home = homePath(lesson.id, paths, progression);
      if (!home) return null;
      const order = home.fm.threads ?? [];
      const at = order.indexOf(lesson.id);
      if (at <= 0) return null;
      const before = byId.get(order[at - 1]);
      if (!before) return null;
      const own = new Set(lesson.fm.atoms ?? []);
      const shared = (before.fm.atoms ?? []).filter((id) => own.has(id));
      return {
        id: lesson.id,
        title: lesson.fm.title,
        pathId: home.id,
        pathTitle: home.fm.title,
        beforeId: before.id,
        beforeTitle: before.fm.title,
        shared,
        names: namesTitle(lesson.body, before.fm.title),
      };
    })
    .filter((row) => row !== null && !row.names)
    .sort((a, b) => a.pathTitle.localeCompare(b.pathTitle) || a.title.localeCompare(b.title));
}

/**
 * `content/outlines/all-paths.md` as data: `## N. Path` headings, the `### `
 * sections under them, and the `` - `atom-id` `` bullets each section lists.
 *
 * Spelled again here rather than imported, the same reason the Trains regex
 * and the PROGRESSION parse are: a .mjs script cannot import a .ts module.
 * `src/lib/__tests__/outline-plan.test.ts` holds the same parse and the
 * counts, so a change to the outline's shape fails there loudly.
 *
 * The `**Target:**` lines are deliberately not read. Every number on them
 * came from Ahrefs and this page makes no keyword claim; the section below is
 * about which concepts a lesson teaches, which the repo can answer alone.
 */
export function parseOutlinePlan(markdown) {
  const sections = [];
  let pathHeading = "";
  let current = null;
  for (const line of markdown.split(/\r?\n/)) {
    const heading = /^##\s+(?!#)(.+)$/.exec(line);
    if (heading) {
      const raw = heading[1].trim();
      // Only the numbered H2s are paths; "Volume Summary by Path" is a table.
      pathHeading = /^\d+\.\s/.test(raw)
        ? raw
            .replace(/^\d+\.\s*/, "")
            .replace(/\s*\([^)]*\)\s*$/, "")
            .trim()
        : "";
      continue;
    }
    const section = /^###\s+(.+)$/.exec(line);
    if (section) {
      current = { title: section[1].trim(), pathHeading, atoms: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const atom = /^-\s+`([a-z0-9-]+)`/.exec(line);
    if (atom) current.atoms.push(atom[1]);
  }
  return sections;
}

/** A heading as an id: the rule by which all 9 outline paths meet a real path. */
function outlinePathId(heading) {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Outline sections whose path teaches none of the concepts the section named.
 *
 * The April plan is the only document that wrote down, per page, the concepts
 * that page would teach, and its concept half held: all 205 references still
 * resolve (tracker entry 342). What was never checked is the other join — the
 * path each section sits under, and whether that path's lessons compose what
 * the section was built out of. Of the 205 slots, 108 are taught; these are
 * the sections at 0.
 *
 * The section heading is not read as a page to build. Most of those terms are
 * already answered by a guide or by a hub route, and the plan's page half was
 * superseded. What is missing is curriculum: a lesson on the path that
 * teaches these concepts, so the reader who takes the path meets them.
 */
export function outlineSectionsNoLessonTeaches(markdown, paths, threads) {
  const byId = new Map(paths.map((p) => [p.id, p]));
  const lessonAtoms = new Map(threads.map((t) => [t.id, t.fm.atoms ?? []]));
  const rows = [];
  for (const section of parseOutlinePlan(markdown)) {
    const home = byId.get(outlinePathId(section.pathHeading));
    if (!home || section.atoms.length === 0) continue;
    const teaches = new Set((home.fm.threads ?? []).flatMap((id) => lessonAtoms.get(id) ?? []));
    if (section.atoms.some((id) => teaches.has(id))) continue;
    rows.push({
      section: section.title,
      pathId: home.id,
      pathTitle: home.fm.title,
      lessons: (home.fm.threads ?? []).length,
      atoms: section.atoms,
    });
  }
  return rows.sort(
    (a, b) => a.pathTitle.localeCompare(b.pathTitle) || a.section.localeCompare(b.section),
  );
}

/**
 * The TTS scripts against `content/scripts/SCRIPT_GUIDE.md`.
 *
 * The guide sets a vocabulary of 9 emote tags and 3 pacing tags, forbids
 * markdown and speaker labels, and gives 2 word targets: 800-1200 for an atom,
 * guide or path script and 1500-2500 for a lesson. Both are read out of the
 * guide here rather than copied, so the page moves when the specification
 * does. `[rewritten]` is skipped: it is the rewrite pass's provenance marker
 * on the last line of most files, not a direction for the voice.
 */
function scriptGuideFormat() {
  const sections = fs.readFileSync(path.join(SCRIPTS, "SCRIPT_GUIDE.md"), "utf8").split(/^## /m);
  const section = (name) => {
    const found = sections.find((s) => s.startsWith(name));
    if (!found) throw new Error(`SCRIPT_GUIDE.md: no "## ${name}" section`);
    return found;
  };
  const format = section("Format");
  const tags = (label) => {
    const line = format.split("\n").find((l) => l.startsWith("-") && label.test(l));
    if (!line) throw new Error(`SCRIPT_GUIDE.md: no Format bullet matching ${label}`);
    return [...line.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]);
  };
  const band = (text, name) => {
    const found = text.match(/Target:?\s*([\d,]+)\s*[–-]\s*([\d,]+)\s*words/);
    if (!found) throw new Error(`SCRIPT_GUIDE.md: no word target in the ${name} section`);
    return { min: Number(found[1].replace(/,/g, "")), max: Number(found[2].replace(/,/g, "")) };
  };
  return {
    vocabulary: new Set([...tags(/emote tag/i), ...tags(/pacing tags/i)]),
    wordBand: band(format, "Format"),
    threadWordBand: band(section("Thread scripts"), "Thread scripts"),
  };
}

/**
 * Every published script with its directions and its spoken word count — the
 * count with the brackets removed, which is what a listener hears and what
 * `transcripts.ts` builds the on-page transcript from. `youtube/` is left out:
 * those are cut takes with 2 versions of several scripts, not graph pages.
 */
function readScripts() {
  return SCRIPT_LAYERS.flatMap((layer) =>
    fs
      .readdirSync(path.join(SCRIPTS, layer))
      .filter((f) => f.endsWith("-tts.txt"))
      .sort()
      .map((name) => {
        const raw = fs.readFileSync(path.join(SCRIPTS, layer, name), "utf8");
        const spoken = raw
          .split(/\r?\n/)
          .map((line) => line.replace(SCRIPT_DIRECTION, "").replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .join(" ");
        return {
          layer,
          id: name.replace(/-tts\.txt$/, ""),
          file: `${layer}/${name}`,
          directions: [...raw.matchAll(SCRIPT_DIRECTION)].map((m) => m[1]),
          words: spoken ? spoken.split(" ").length : 0,
        };
      }),
  );
}

/** The tag uses the guide does not define, and the scripts off their target. */
function scriptsOutsideFormat() {
  const fmt = scriptGuideFormat();
  const scripts = readScripts();
  const strays = [];
  for (const script of scripts) {
    for (const tag of script.directions) {
      if (fmt.vocabulary.has(tag) || SCRIPT_PROVENANCE.has(tag)) continue;
      strays.push({ tag, ...script });
    }
  }
  const byLayer = SCRIPT_LAYERS.map((layer) => {
    const band = layer === "threads" ? fmt.threadWordBand : fmt.wordBand;
    const all = scripts.filter((s) => s.layer === layer);
    const outside = all.filter((s) => s.words < band.min || s.words > band.max);
    outside.sort((a, b) => a.words - b.words);
    return { layer, band, total: all.length, outside };
  });
  return { strays, byLayer, scripts, format: fmt };
}

/** The audiences the schema names. A Recommended line backticks one beside the path. */
const PERSONA_AUDIENCES = ["beginner", "intermediate", "advanced", "teacher", "performer"];

/**
 * `content/personas/` as data: the `## Journey Map` section of each of the 5
 * documents, the backticked ids in it, and the `**Recommended:**` line that
 * closes it.
 *
 * Spelled again here rather than imported, the same reason `parseOutlinePlan`
 * is: a .mjs script cannot import a .ts module. `src/lib/persona-journeys.ts`
 * holds the same parse and `persona-journeys.test.ts` holds the counts, so a
 * change to a persona's shape fails there loudly.
 *
 * The Recommended line is prose — "Create a new path `systems-of-improv`
 * targeting `beginner` audience" — so the path is found by asking which of
 * its backticked tokens is the id of a path that exists, not by position.
 * The cross-domain connector's line offers 2 and only 1 was ever built.
 */
export function parsePersonaJourneys(personas, atomIds, pathIds) {
  const journeys = [];
  for (const persona of personas) {
    const lines = persona.body.split(/\r?\n/);
    const start = lines.findIndex((line) => /^##\s+Journey Map\s*$/.test(line));
    if (start === -1) continue;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i += 1) {
      if (/^##\s+(?!#)/.test(lines[i])) {
        end = i;
        break;
      }
    }
    const seen = new Set();
    const prescribed = [];
    let recommendedPathIds = [];
    for (const line of lines.slice(start + 1, end)) {
      const recommended = /^\*\*Recommended:\*\*\s*(.+)$/.exec(line);
      if (recommended) {
        recommendedPathIds = [...recommended[1].matchAll(/`([a-z0-9][a-z0-9-]*)`/g)]
          .map((m) => m[1])
          .filter((id) => pathIds.has(id));
      }
      for (const match of line.matchAll(/`([a-z0-9][a-z0-9-]*)`/g)) {
        const id = match[1];
        if (seen.has(id)) continue;
        seen.add(id);
        // A path id and an audience name are backticked the same way a
        // concept is; only the concepts are curriculum.
        if (atomIds.has(id) && !pathIds.has(id) && !PERSONA_AUDIENCES.includes(id)) {
          prescribed.push(id);
        }
      }
    }
    journeys.push({
      id: persona.id,
      name: /^#\s+(?!#)(.+)$/m.exec(persona.body)?.[1]?.trim() ?? persona.id,
      audience: persona.fm.audience ?? null,
      prescribed,
      pathId: recommendedPathIds[0] ?? null,
    });
  }
  return journeys;
}

/**
 * Concepts more than 1 persona asks for that at least 2 of the paths asked
 * for do not teach.
 *
 * The 5 personas are the only documents that wrote a curriculum per reader,
 * and all 5 of the paths they asked for exist with the audience they asked
 * for — the structural half shipped. The curricular half was never checked:
 * of the 126 concepts the Journey Maps prescribe, the recommended paths'
 * lessons teach 80 (tracker entry 347).
 *
 * The threshold is 2 paths rather than 1, because 1 path leaving 1 concept
 * out is an editorial choice and the same concept left out twice is a gap.
 * `elsewhere` says whether some other path already composes it, since that
 * turns the fix from writing a lesson into moving or borrowing one.
 */
export function personaCurriculumGaps(personas, paths, threads, atoms) {
  const atomIds = new Set(atoms.map((a) => a.id));
  const pathIds = new Set(paths.map((p) => p.id));
  const lessonAtoms = new Map(threads.map((t) => [t.id, t.fm.atoms ?? []]));
  const teaches = new Map(
    paths.map((p) => [
      p.id,
      new Set((p.fm.threads ?? []).flatMap((id) => lessonAtoms.get(id) ?? [])),
    ]),
  );
  const journeys = parsePersonaJourneys(personas, atomIds, pathIds).filter((j) => j.pathId);

  const asking = new Map();
  for (const journey of journeys) {
    for (const id of journey.prescribed) {
      if (!asking.has(id)) asking.set(id, []);
      asking.get(id).push(journey);
    }
  }

  const rows = [];
  for (const [id, askers] of asking) {
    if (askers.length < 2) continue;
    const missedOn = askers.filter((j) => !teaches.get(j.pathId)?.has(id));
    if (missedOn.length < 2) continue;
    rows.push({
      id,
      journeys: askers,
      missedOn: missedOn.map((j) => j.pathId),
      taughtOn: askers.filter((j) => teaches.get(j.pathId)?.has(id)).map((j) => j.pathId),
      elsewhere: [...teaches]
        .filter(([pathId, set]) => set.has(id) && !askers.some((j) => j.pathId === pathId))
        .map(([pathId]) => pathId),
    });
  }
  return { journeys, rows: rows.sort((a, b) => a.id.localeCompare(b.id)) };
}

/**
 * A run as the SOP lessons name one: a video id, or the date an upstream SOP
 * ran. The bullets carry no dates of their own, so this is the only anchor a
 * lesson has to the production it came out of.
 */
const SOP_RUN = /\bL\d+\b|\b20\d{2}-\d{2}-\d{2}\b/g;
/** The bullets that continue the run the bullet above them named. */
const SOP_SAME_RUN = /\bsame run\b/i;
/** The one section of an SOP this reads, by the heading every SOP gives it. */
const SOP_LESSONS = "Lessons from prior production";

/** The `## ` sections of a markdown file, keyed by heading. */
function sopSections(text) {
  const out = new Map();
  for (const part of text.split(/^## /m).slice(1)) {
    const nl = part.indexOf("\n");
    const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
    out.set(heading, nl === -1 ? "" : part.slice(nl + 1));
  }
  return out;
}

/** A lesson bullet as a table cell: bold and links flattened, length capped. */
function sopLessonText(bullet) {
  const flat = bullet.replace(/\*\*/g, "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
  return flat.length > 180 ? `${flat.slice(0, 179)}…` : flat;
}

/**
 * The SOPs holding more lessons than `docs/sop/README.md`'s curation policy
 * allows, with every lesson each holds and what can be computed about it.
 *
 * The policy caps a Lessons section at 5 and sends the overflow to
 * `docs/sop/lessons-archive/`, one file per SOP. Nothing had ever checked it and
 * 4 SOPs are over (tracker entry 351); the directory does not exist. Which
 * lesson goes is the judgement the policy describes — least load-bearing — and
 * that is the author's, so this lists the material the judgement needs and
 * stops there. `sop-schema.test.ts` holds the counts as ceilings.
 *
 * Two signals, both weak on their own and worth reading together. `run` is the
 * video or the dated run the bullet names, inherited from the bullet above when
 * it says "same run", and a bullet naming none is the kind the policy calls
 * generic advice. `cited` is how many lessons anywhere in the set name that same
 * run: a run only 1 lesson mentions has nothing else leaning on it.
 *
 * The cap itself is parsed out of the README, never typed here, so a policy that
 * moves to 6 empties these rows instead of contradicting them.
 */
function sopLessonsOverCap() {
  const files = fs
    .readdirSync(SOP_DIR)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const readme = fs.readFileSync(path.join(SOP_DIR, "README.md"), "utf8");
  const capMatch = /In-SOP cap: (\d+) lessons max/.exec(readme);
  const cap = capMatch ? Number(capMatch[1]) : null;
  const archived = fs.existsSync(LESSONS_ARCHIVE)
    ? fs.readdirSync(LESSONS_ARCHIVE).filter((f) => f.endsWith(".md")).length
    : null;

  const sops = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(SOP_DIR, file), "utf8");
    const body = sopSections(text).get(SOP_LESSONS);
    if (body === undefined) continue;
    const bullets = [...body.matchAll(/^- (.+)$/gm)].map((m) => m[1]);
    let carried = [];
    const lessons = bullets.map((bullet, i) => {
      const named = [...new Set(bullet.match(SOP_RUN) ?? [])];
      const runs = named.length > 0 ? named : SOP_SAME_RUN.test(bullet) ? carried : [];
      if (named.length > 0) carried = named;
      return {
        position: i + 1,
        text: bullet,
        runs,
        inherited: named.length === 0 && runs.length > 0,
      };
    });
    sops.push({ file, id: file.replace(/\.md$/, ""), lessons });
  }

  // How often each run is named across every lessons section, which is what
  // makes a single mention visible as a single mention.
  const cited = new Map();
  for (const s of sops) {
    for (const l of s.lessons) for (const r of l.runs) cited.set(r, (cited.get(r) ?? 0) + 1);
  }

  const over = sops
    .filter((s) => cap !== null && s.lessons.length > cap)
    .map((s) => ({
      ...s,
      demote: s.lessons.length - cap,
      // Least anchored first: no run at all, then the fewest other lessons
      // leaning on the run it names, then the earlier bullet, since lessons are
      // appended and position is the only ordering the section records.
      ranked: [...s.lessons].sort(
        (a, b) =>
          a.runs.length - b.runs.length ||
          Math.min(...a.runs.map((r) => cited.get(r) ?? 0), Infinity) -
            Math.min(...b.runs.map((r) => cited.get(r) ?? 0), Infinity) ||
          a.position - b.position,
      ),
    }))
    .sort((a, b) => b.lessons.length - a.lessons.length || a.id.localeCompare(b.id));

  return {
    cap,
    archived,
    sops: sops.length,
    total: sops.reduce((n, s) => n + s.lessons.length, 0),
    cited,
    over,
  };
}

export function buildSeedsPage() {
  const atoms = readDir(ATOMS);
  const threads = readDir(THREADS);
  const paths = readDir(PATHS);
  const bridges = fs
    .readdirSync(BRIDGES)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(BRIDGES, f), "utf8"));
      return {
        slug: f.replace(/\.md$/, ""),
        title: data.title,
        atoms: data.entry_atoms ?? [],
        subject: data.subject ?? null,
        body: content,
        // The first target keyword, whole: the guide's primary term and
        // whatever Ahrefs figures were recorded beside it, or nothing.
        keyword: data.target_keywords?.[0] ?? null,
        // Every declared keyword, whole, for the parent classification: a
        // parent is carried by secondary keywords as often as by the primary.
        keywords: data.target_keywords ?? [],
        // The page-level reading of the results, null where nobody has looked.
        serpVerdict: data.serp_verdict ?? null,
        primaryCtaType: data.primary_cta_type ?? null,
        primaryCtaTarget: data.primary_cta_target ?? null,
      };
    });
  const tests = fs
    .readdirSync(TESTS)
    .filter((f) => f.endsWith(".test.ts"))
    .sort()
    .map((name) => ({ name, source: fs.readFileSync(path.join(TESTS, name), "utf8") }));

  const statusOf = new Map(threads.map((t) => [t.id, t.fm.status]));
  const titleOf = new Map([...threads, ...paths].map((t) => [t.id, t.fm.title]));
  const onPaths = (lessonId) =>
    paths
      .map((p) => ({ path: p, at: (p.fm.threads ?? []).indexOf(lessonId) }))
      .filter(({ at }) => at !== -1)
      .map(({ path: p, at }) => `${p.fm.title} (${at + 1} of ${p.fm.threads.length})`);

  const seedLessons = threads
    .filter((t) => t.fm.status === "seed")
    .map((t) => ({
      id: t.id,
      title: t.fm.title,
      words: proseWords(t.body),
      atoms: (t.fm.atoms ?? []).length,
      paths: onPaths(t.id),
      tests: testsNaming(t.id, tests),
    }))
    .sort((a, b) => a.words - b.words);

  const seedPaths = paths
    .filter((p) => p.fm.status === "seed")
    .map((p) => {
      const ids = p.fm.threads ?? [];
      const seeds = ids.filter((id) => statusOf.get(id) === "seed");
      return {
        id: p.id,
        title: p.fm.title,
        lessons: ids.length,
        seeds: seeds.length,
        opensOnSeed: statusOf.get(ids[0]) === "seed",
        seedTitles: seeds.map((id) => titleOf.get(id) ?? id),
        tests: testsNaming(p.id, tests),
      };
    });

  const atomsOf = new Map(threads.map((t) => [t.id, t.fm.atoms ?? []]));
  const selfNaming = paths
    .map((p) => {
      const taught = new Set((p.fm.threads ?? []).flatMap((id) => atomsOf.get(id) ?? []));
      const sentences = (p.fm.prerequisites ?? []).map((sentence) => ({
        sentence,
        ...sentenceNames(sentence, atoms, taught),
      }));
      return { id: p.id, title: p.fm.title, sentences };
    })
    .filter((p) => p.sentences.some((s) => s.taughtHere.length > 0));

  const byStatus = (rows) =>
    ["seed", "draft", "validated"].map((s) => rows.filter((r) => r.fm.status === s).length);
  const [lessonSeeds, lessonDrafts, lessonValidated] = byStatus(threads);
  const [pathSeeds, pathDrafts, pathValidated] = byStatus(paths);
  const slots = paths.flatMap((p) => p.fm.threads ?? []);
  const seedSlots = slots.filter((id) => statusOf.get(id) === "seed").length;
  const pathsOpeningOnSeed = paths.filter((p) => statusOf.get(p.fm.threads?.[0]) === "seed").length;
  const words = seedLessons.map((l) => l.words).sort((a, b) => a - b);
  const median = words.length ? words[Math.floor(words.length / 2)] : 0;
  const testFiles = new Set(seedLessons.flatMap((l) => l.tests));

  const lines = [];
  lines.push("# Seeds");
  lines.push("");
  lines.push(
    "Generated by `node scripts/seeds.mjs` from the `status` field, the lesson bodies,",
    "`src/lib/__tests__`, the atoms' links, the TTS scripts, the SOP lessons sections and the",
    "`aliases` field; edit the script, not this page.",
    "Tracker entries 254, 318, 319, 327, 335, 336, 339, 340, 342, 343, 347, 348, 351, 352 and 353.",
  );
  lines.push("");
  lines.push(
    `Lessons: ${lessonSeeds} seed, ${lessonDrafts} draft, ${lessonValidated} validated of ${threads.length}.`,
    `Paths: ${pathSeeds} seed, ${pathDrafts} draft, ${pathValidated} validated of ${paths.length}.`,
    `Of the ${slots.length} lesson slots on the paths, ${seedSlots} hold a seed; ${pathsOpeningOnSeed} of the ${paths.length} paths open on one.`,
    `The seed lessons run ${words[0]}–${words[words.length - 1]} words of prose, median ${median}.`,
  );
  lines.push("");
  lines.push("## What a rewrite moves");
  lines.push("");
  lines.push(
    "The tests hold dated readings measured on these lessons — drill agreement, named share,",
    "block counts, forward needs, reading time, hand-off emptiness. Rewriting a seed will move",
    "the readings in the files listed beside it, and that is the case the guards are written to",
    "welcome: re-date the reading, do not raise a floor to make it pass. The files that name at",
    `least one seed lesson: ${testFiles.size}. Tests that measure every lesson without naming one`,
    "(lesson-blocks, reading-time-lessons-library, lesson-drill-purpose's medians, hub-prose-links'",
    "ceiling if the rewrite touches a route file) move as well; run `npm test` after each rewrite",
    "and re-date what moved.",
  );
  lines.push("");
  lines.push(`## Seed lessons (${seedLessons.length}), shortest first`);
  lines.push("");
  lines.push("| lesson | words | atoms | on paths | tests naming it |");
  lines.push("|---|---:|---:|---|---|");
  for (const l of seedLessons) {
    lines.push(
      `| [${l.title}](../content/threads/${l.id}.md) \`${l.id}\` | ${l.words} | ${l.atoms} | ${
        l.paths.join("; ") || "—"
      } | ${l.tests.map((t) => `\`${t}\``).join(", ") || "—"} |`,
    );
  }
  lines.push("");
  lines.push(`## Seed paths (${seedPaths.length})`);
  lines.push("");
  lines.push("| path | lessons | seeds | opens on a seed | seed lessons | tests naming it |");
  lines.push("|---|---:|---:|---|---|---|");
  for (const p of seedPaths) {
    lines.push(
      `| [${p.title}](../content/paths/${p.id}.md) \`${p.id}\` | ${p.lessons} | ${p.seeds} | ${
        p.opensOnSeed ? "yes" : "no"
      } | ${p.seedTitles.join("; ") || "—"} | ${p.tests.map((t) => `\`${t}\``).join(", ") || "—"} |`,
    );
  }
  lines.push("");
  lines.push(`## Path sentences that name what the path teaches (${selfNaming.length})`);
  lines.push("");
  lines.push(
    "A path's `prerequisites` sentence should name what the reader brings, not what the path",
    "gives. These sentences name a concept the path's own lessons compose (tracker entry 329);",
    "the rewrite is the author's, and belongs to the same pass as the seed lessons above. The",
    "page now labels the computed leans-on list against the sentence, so an unrewritten",
    "sentence is visible rather than silent.",
  );
  lines.push("");
  lines.push("| path | sentence | names, taught on the path | names, taught elsewhere |");
  lines.push("|---|---|---|---|");
  for (const p of selfNaming) {
    for (const s of p.sentences) {
      if (s.taughtHere.length === 0) continue;
      lines.push(
        `| [${p.title}](../content/paths/${p.id}.md) \`${p.id}\` | ${s.sentence} | ${s.taughtHere
          .map((id) => `\`${id}\``)
          .join(", ")} | ${s.taughtElsewhere.map((id) => `\`${id}\``).join(", ") || "—"} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Test files, by how many seed lessons each names");
  lines.push("");
  const perTest = [...testFiles]
    .map((name) => ({ name, n: seedLessons.filter((l) => l.tests.includes(name)).length }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  for (const t of perTest) lines.push(`- \`${t.name}\` — ${t.n}`);
  lines.push("");
  const unrouted = drillsWithoutTrainsTarget(atoms);
  const noLine = unrouted.filter((d) => d.line === null);
  const drills = atoms.filter((a) => a.fm.type === "exercise");
  lines.push(`## Drills with no Trains line (${unrouted.length})`);
  lines.push("");
  lines.push(
    "A drill opens with a bold `Trains:` line saying what it is for, and three surfaces now route",
    "on it: the counter line on a failure's page (entry 322), the lesson drill rows (297) and the",
    `picker's "by principle" facets (335). ${unrouted.length} of the ${drills.length} drills route nowhere —`,
    `${noLine.length} carry no line at all, and ${unrouted.length - noLine.length} carry one that describes the effect in prose and`,
    'names no concept the graph holds. Naming a concept by its title puts the drill under "Drills',
    "that train this\" on that concept's page, and into its facet in the picker where the concept",
    "is a principle. The wording is the author's; the list is derived from the bodies each run.",
  );
  lines.push("");
  lines.push("| drill | its Trains line |");
  lines.push("|---|---|");
  for (const d of unrouted) {
    lines.push(
      `| [${d.title}](../content/atoms/${d.id}.md) \`${d.id}\` | ${d.line === null ? "— none" : d.line} |`,
    );
  }
  lines.push("");
  lines.push("## Mutual edges");
  lines.push("");
  lines.push(
    "`extends` and `illustrates` are directional, and these pairs declare one of them both",
    "ways: 71 `extends` pairs (142 of 795 edges) and 70 `illustrates` pairs (140 of 509) on",
    "2026-09-22 (tracker entry 327). The sidebar shows such a pair once, and the reciprocal",
    "rule used to keep the weaker line; the direction each edge should run is the author's",
    "call. `mutual-edges.test.ts` holds the counts as ceilings that may only fall.",
  );
  const typeOf = new Map(atoms.map((a) => [a.id, a.fm.type]));
  for (const relation of MUTUAL_RELATIONS) {
    const pairs = mutualPairs(atoms, relation);
    lines.push("");
    lines.push(`### ${relation} (${pairs.length} pairs)`);
    lines.push("");
    for (const [a, b] of pairs) {
      lines.push(`- \`${a}\` ↔ \`${b}\` (${typeOf.get(a)}–${typeOf.get(b)})`);
    }
  }
  lines.push("");
  const alone = guidesDeclaringAlone(bridges);
  const atomTitle = new Map(atoms.map((a) => [a.id, a.fm.title]));
  lines.push(`## Guides no rail reaches by declaration (${alone.length})`);
  lines.push("");
  lines.push(
    "The related-guides rail scores on `entry_atoms`, so a guide whose every declared concept is",
    "declared by no other guide cannot be scored by one: no rail reaches it by declaration. Read",
    "as a graph on 2026-09-22 the rail left 5 guides with no inbound link at all (tracker entry",
    "336), and 4 of them were crowded out by the cap — they share concepts widely and every",
    "sharer already had 4 better ones. The guides below are the other case, and the only one the",
    "code cannot answer: the fair-share pass now gives each starved guide 1 inbound slot, so the",
    "page is reachable, but nothing relates it. Either the guide declares a concept another guide",
    "also declares, or the site accepts it as a leaf — the author's call, like the mutual edges",
    "above. Derived from the guides' frontmatter each run.",
  );
  lines.push("");
  lines.push("| guide | concepts, none of them declared elsewhere |");
  lines.push("|---|---|");
  for (const g of alone) {
    const concepts = g.atoms
      .map((id) => `\`${id}\`${atomTitle.has(id) ? ` (${atomTitle.get(id)})` : " — no such atom"}`)
      .join("; ");
    lines.push(`| [${g.title}](../content/bridges/${g.slug}.md) \`${g.slug}\` | ${concepts} |`);
  }
  lines.push("");
  const progression = readProgression(fs.readFileSync(PATH_PROGRESSION, "utf8"));
  const neighbours = lessonsNotNamingNeighbour(threads, paths, progression);
  const withShared = neighbours.filter((n) => n.shared.length > 0);
  lines.push(`## Lessons that never name their neighbour (${neighbours.length})`);
  lines.push("");
  lines.push(
    "Read over rendered bodies with the chrome and the derived blocks out, concepts link concepts",
    "1,014 times and guides link guides 280, and lesson → lesson is 0: no lesson's prose names",
    "another lesson's title in any of the 25 files, 0 of the 600 ordered pairs, and 1 lesson uses a",
    "sequence phrase at all (tracker entry 339). The paths do the joining and do it completely — 17",
    "mentions, 17 linked — so every statement that the lessons form an order is furniture: the",
    "prev/next nav, the program map, the progress bar, and the order can be re-sequenced without a",
    "sentence reading wrong. The ask is 1 sentence per lesson, naming the lesson its own path puts",
    "before it; the lesson page derives a line where the predecessor taught a concept this lesson's",
    "atoms need next (`src/lib/lesson-crosslinks.ts`), and the author's sentence is what replaces",
    "it. The home path is `getParentPath`'s — 9 of the 25 lessons sit on 2 or more paths, and the",
    `neighbour has to be the one the breadcrumb agrees with (entry 262). ${withShared.length} of the`,
    `${neighbours.length} rows share a concept with their predecessor outright; a row with none still has an order`,
    "to state. A lesson whose body names its predecessor drops off this list.",
  );
  lines.push("");
  lines.push("| lesson | its path | the lesson before it | concepts both compose |");
  lines.push("|---|---|---|---|");
  for (const n of neighbours) {
    lines.push(
      `| [${n.title}](../content/threads/${n.id}.md) \`${n.id}\` | ${n.pathTitle} | [${
        n.beforeTitle
      }](../content/threads/${n.beforeId}.md) \`${n.beforeId}\` | ${
        n.shared.map((id) => `\`${id}\``).join(", ") || "—"
      } |`,
    );
  }
  lines.push("");
  const identity = identityCandidates(atoms, bridges);
  const concepts = atoms.filter((a) => a.fm.type !== "reference");
  const withSameAs = concepts.filter((a) => (a.fm.sameAs ?? []).length);
  const withSubject = concepts.filter((a) => a.fm.subject);
  const works = atoms.filter((a) => a.fm.type === "reference" && a.fm.work);
  lines.push("## Concepts that could assert an identity");
  lines.push("");
  lines.push(
    `${identity.declared} of the ${bridges.length} guides declare a \`subject\` — a named entity with a Wikipedia or`,
    `Wikidata record — while ${concepts.length - withSameAs.length - withSubject.length} of the ${concepts.length} concepts assert no identity outside this site`,
    `at all: ${withSameAs.length} carry a bare \`sameAs\` and ${withSubject.length} carry a \`subject\` block of their own. The ${works.length}`,
    "references are the exception that shows the pattern — every one carries a full `work`, because",
    "a book is an external thing and the site knew it needed an identifier for it (tracker entry",
    "340, 2026-09-22). No URL is invented here or anywhere on this page: an identifier is added",
    "only when somebody has looked it up, the same rule the Ahrefs figures live under.",
  );
  lines.push("");
  lines.push(
    `### The join that already exists (${identity.ready.length})`,
    "",
    "An atom whose title is exactly a guide's declared subject name, case-insensitively, and which",
    "carries no `sameAs` of its own. Nothing needs looking up for these: the record is the one the",
    "guide already declares, copied verbatim, so the 2 pages resolve to 1 entity instead of a",
    "known one and an unknown one. The list is empty on 2026-09-22 — the 3 atoms that match a guide",
    "subject (`active-listening`, `trust`, `viewpoints`) were given theirs already — and the section",
    "stays because the next guide subject that names a concept will appear in it.",
  );
  lines.push("");
  if (identity.ready.length === 0) {
    lines.push("None today.");
  } else {
    lines.push(
      "| concept | type | the guide declaring it as its subject | the record the guide declares |",
    );
    lines.push("|---|---|---|---|");
    for (const r of identity.ready) {
      lines.push(
        `| [${r.title}](../content/atoms/${r.id}.md) \`${r.id}\` | ${r.type} | [${r.name}](../content/bridges/${r.guide}.md) \`${r.guide}\`${
          r.declares ? "" : " — not in its `entry_atoms`"
        } | ${r.sameAs.join(" ") || "— none"} |`,
      );
    }
  }
  lines.push("");
  lines.push(
    `### Guide subjects the graph has no node for (${identity.gaps.length})`,
    "",
    "These guides tell a knowledge graph what the page is about and cannot say which of their own",
    "concepts that is, because no atom carries the name. Each row is one decision: give the site a",
    "concept of that name, or accept that the subject is an outside entity the page borrows and",
    "leave it. The guide's own concept block now states the gap in a line (`data-subject-gap`), so",
    "a reader sees it too. The records below are the ones the guides already declare, listed so a",
    "new concept can copy one rather than have a second looked up.",
  );
  lines.push("");
  lines.push("| guide | its declared subject | type | the record it declares |");
  lines.push("|---|---|---|---|");
  for (const g of identity.gaps) {
    lines.push(
      `| [${g.title}](../content/bridges/${g.slug}.md) \`${g.slug}\` | ${g.name} | ${g.type} | ${
        g.sameAs.join(" ") || "— none"
      } |`,
    );
  }
  lines.push("");
  const unlessoned = outlineSectionsNoLessonTeaches(
    fs.readFileSync(OUTLINE, "utf8"),
    paths,
    threads,
  );
  lines.push(`## Outline sections whose atoms no lesson teaches (${unlessoned.length})`);
  lines.push("");
  lines.push(
    "`content/outlines/all-paths.md` is the April plan, and the only document that wrote down, per",
    "page, the concepts that page would teach. Its concept half held: all 205 references still",
    "resolve 5 months on, which no other April document manages (tracker entry 342, 2026-09-22).",
    "The join nobody made is the other one — the path each section sits under, and whether that",
    "path's lessons compose what the section was built out of. Of the 205 concept slots the plan",
    "assigned to a path, the path's lessons teach 108; the rows below are the sections at 0.",
    "",
    "This is a lesson gap, not a page gap. The plan's pages were superseded by the 78 guides the",
    "site built, and most of those section headings name a term a guide or a hub route already",
    "answers — building a page here would be building a second one. What is absent is curriculum:",
    "a reader who takes the path never meets these concepts, though the plan said the path was",
    "where they would. The ask is a lesson on that path, or the concepts folded into one it",
    "already has. Derived from the outline and the paths' lessons each run.",
  );
  lines.push("");
  lines.push(
    "| the section the plan wrote | the path it sits under | the concepts no lesson there teaches |",
  );
  lines.push("|---|---|---|");
  for (const row of unlessoned) {
    const concepts = row.atoms
      .map((id) => `\`${id}\`${atomTitle.has(id) ? ` (${atomTitle.get(id)})` : " — no such atom"}`)
      .join("; ");
    lines.push(
      `| ${row.section} | [${row.pathTitle}](../content/paths/${row.pathId}.md) \`${row.pathId}\` (${row.lessons} lessons) | ${concepts} |`,
    );
  }
  lines.push("");
  const noDrill = guidesWithNoDrill(atoms, bridges);
  lines.push(`## Guides with no drill (${noDrill.length})`);
  lines.push("");
  lines.push(
    "`content/outlines/sitemap.md` wrote the only per-page link budget this repo has — a guide",
    "links 4-6 atoms, 2-4 exercises, 1 primary path, 1-2 threads and 2-3 other guides — and of",
    "its 5 clauses the drill one is the only one the furniture cannot answer. In the guides' own",
    `prose 2 of the ${bridges.length} meet all 5; with the derived blocks counted, 40 do, and every guide that`,
    "still fails fails on this clause (tracker entry 343, 2026-09-22). The atom, path, lesson and",
    "guide clauses are supplied by blocks the page assembles; the exercise clause cannot be,",
    "because every drill a guide shows is read out of the guide's own body. `getGuideDrills` takes",
    "the backticked ids and the CTA fallback takes the ones the practice closer names, so a guide",
    'that names no drill gets no drill card, no "Practise it" row and no drill beside its CTA.',
    `${noDrill.length} of the ${bridges.length} are in that state and also name fewer than 2 drills in words. The fix is a`,
    "sentence: name a drill the guide's argument already implies, and the row, the card and the",
    "prose link all follow from it.",
    "",
    "The keyword and its traffic potential below are each guide's own frontmatter, copied. A guide",
    "whose first target keyword records no traffic potential shows none — every figure in those",
    "files came from Ahrefs, and an invented one would be worse than an absent one. Traffic",
    "potential orders the list rather than volume, because it is the figure worth ranking for.",
    "`guide-link-budget.test.ts` holds the count as a ceiling that may only fall.",
  );
  lines.push("");
  lines.push("| guide | its primary keyword | traffic potential |");
  lines.push("|---|---|---|");
  for (const g of noDrill) {
    const keyword = g.keyword?.keyword ? `${g.keyword.keyword}` : "— none declared";
    const potential = g.keyword?.traffic_potential ?? null;
    lines.push(
      `| [${g.title}](../content/bridges/${g.slug}.md) \`${g.slug}\` | ${keyword} | ${
        potential === null ? "— not checked" : potential.toLocaleString("en-US")
      } |`,
    );
  }
  lines.push("");
  const scriptFormat = scriptsOutsideFormat();
  const offBand = scriptFormat.byLayer.reduce((n, l) => n + l.outside.length, 0);
  lines.push(`## Scripts outside the guide's format (${offBand})`);
  lines.push("");
  lines.push(
    "`content/scripts/SCRIPT_GUIDE.md` is the most closely kept schema in the repo and, until",
    `2026-09-22, the only one nothing checked: the ${scriptFormat.scripts.length} scripts apply its 12 delivery tags`,
    `${scriptFormat.scripts.reduce((n, s) => n + s.directions.length, 0).toLocaleString("en-US")} times, and not one file carries markdown or a speaker label (tracker entry 348).`,
    "`script-format.test.ts` now holds that. What it cannot decide is the list below, because",
    "every item on it is a recording decision rather than a defect: a tag the guide has no word",
    "for may be the right delivery, and a script off its target may be the right length for what",
    "it has to say. The choice is to re-cut the line, re-cut the script, or widen the guide —",
    "and all 3 are the author's. The tags and both word targets here are read out of the guide",
    "itself, so a widened guide empties these rows rather than contradicting them.",
  );
  lines.push("");
  lines.push(`### Tags the guide does not define (${scriptFormat.strays.length})`);
  lines.push("");
  lines.push(
    "Each is a direction a writer reached for mid-script. The voice model gets it either way;",
    "the guide is what has no word for it. `[rewritten]`, the rewrite pass's marker on the last",
    "line of most files, is not counted here — it is provenance, not delivery.",
  );
  lines.push("");
  lines.push("| tag | script |");
  lines.push("|---|---|");
  for (const s of scriptFormat.strays) {
    lines.push(`| \`[${s.tag}]\` | [${s.file}](../content/scripts/${s.file}) |`);
  }
  lines.push("");
  lines.push("### Scripts off their word target, by layer");
  lines.push("");
  lines.push(
    "The guide gives an atom, guide or path script 800-1200 words and a lesson 1500-2500,",
    "because a lesson weaves several atoms into an arc. Words are counted spoken — the brackets",
    "removed — which is what a listener hears and what the on-page transcript is built from.",
  );
  lines.push("");
  lines.push("| layer | target | scripts | off target | shortest | longest |");
  lines.push("|---|---|---:|---:|---|---|");
  for (const l of scriptFormat.byLayer) {
    const short = l.outside[0];
    const long = l.outside[l.outside.length - 1];
    lines.push(
      `| \`${l.layer}\` | ${l.band.min}-${l.band.max} | ${l.total} | ${l.outside.length} | ${
        short ? `\`${short.id}\` ${short.words}` : "—"
      } | ${long ? `\`${long.id}\` ${long.words}` : "—"} |`,
    );
  }
  lines.push("");
  for (const l of scriptFormat.byLayer) {
    if (l.outside.length === 0) continue;
    lines.push(
      `\`${l.layer}\` (${l.outside.length} of ${l.total}): ` +
        l.outside.map((s) => `\`${s.id}\` ${s.words}`).join(", "),
    );
    lines.push("");
  }
  const personas = fs
    .readdirSync(PERSONAS)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const { data, content } = matter(fs.readFileSync(path.join(PERSONAS, f), "utf8"));
      // The personas carry no `id` field; the filename is the id, and the
      // Recommended lines name paths, not personas, so nothing depends on one.
      return { id: f.replace(/\.md$/, ""), fm: data, body: content };
    });
  const personaGaps = personaCurriculumGaps(personas, paths, threads, atoms);
  const personaTotals = personaGaps.journeys.reduce(
    (acc, j) => {
      const teaches = new Set(
        (paths.find((p) => p.id === j.pathId)?.fm.threads ?? []).flatMap(
          (id) => threads.find((t) => t.id === id)?.fm.atoms ?? [],
        ),
      );
      acc.prescribed += j.prescribed.length;
      acc.taught += j.prescribed.filter((id) => teaches.has(id)).length;
      return acc;
    },
    { prescribed: 0, taught: 0 },
  );
  lines.push(
    `## Concepts the personas ask for and their paths do not teach (${personaGaps.rows.length})`,
  );
  lines.push("");
  lines.push(
    `\`content/personas/\` holds the ${personas.length} reader profiles written in April, and each closes its`,
    "`## Journey Map` with a `**Recommended:**` line naming a path to build. All",
    `${personaGaps.journeys.length} of those paths exist and all ${personaGaps.journeys.length} carry the audience the persona asked for, so`,
    'the specification shipped at the level of "make this path for this audience". It did not',
    `ship at the level of "teach these ideas in this order": of the ${personaTotals.prescribed} concepts the Journey`,
    `Maps prescribe, the lessons on those paths teach ${personaTotals.taught} (tracker entry 347, 2026-09-22).`,
    "",
    "This is a curriculum gap, not a page gap — the same remedy the outline section above names.",
    "Every concept below is a real atom with a page of its own; what is missing is a lesson on the",
    "path that was built to teach it, so the reader who takes that path meets it. A concept is",
    "listed when more than 1 journey asks for it and at least 2 of the paths asked for skip it: 1",
    "path leaving 1 concept out is an editorial choice, the same concept left out twice is a gap.",
    "The last column is where a lesson already teaches it, because borrowing or moving a lesson is",
    "a smaller ask than writing one. Derived from the personas, the paths and their lessons each",
    "run; `src/lib/persona-journeys.ts` holds the same join for the path pages and",
    "`persona-journeys.test.ts` holds the counts.",
  );
  lines.push("");
  lines.push(
    "| concept | the journeys that ask for it | the paths that were meant to teach it | a path that teaches it |",
  );
  lines.push("|---|---|---|---|");
  for (const row of personaGaps.rows) {
    const asking = row.journeys.map((j) => `${j.name} \`${j.id}\` (${j.audience})`).join("; ");
    const meant = row.missedOn.map((id) => `\`${id}\``).join(", ");
    const already = [...row.taughtOn, ...row.elsewhere].map((id) => `\`${id}\``).join(", ");
    lines.push(
      `| [${atomTitle.get(row.id) ?? row.id}](../content/atoms/${row.id}.md) \`${row.id}\` | ${asking} | ${meant} | ${
        already || "— no path on the site teaches it"
      } |`,
    );
  }
  lines.push("");
  const overCap = sopLessonsOverCap();
  const demoteTotal = overCap.over.reduce((n, s) => n + s.demote, 0);
  lines.push(`## SOP lessons over the cap (${overCap.over.length})`);
  lines.push("");
  lines.push(
    `\`docs/sop/README.md\`'s curation policy caps a Lessons section at ${overCap.cap} and archives the`,
    "overflow to `docs/sop/lessons-archive/<SOP-id>.md`, one file per SOP. It shipped as one of the",
    "15 fixes the SOP set prescribed for itself, all 15 marked completed, and nothing has ever read",
    `it back. ${overCap.over.length} of the ${overCap.sops} files carrying a Lessons section are over the cap, ${demoteTotal} lessons`,
    "have to move before it is kept, and the archive directory does not exist (tracker entry 351,",
    "2026-09-22). `sop-schema.test.ts` now holds each count as a ceiling that may only fall, which",
    "stops a 5th SOP going over and cannot decide the ones already there.",
    "",
    "That decision is editorial and stays the author's, because the policy asks for the least",
    "load-bearing lesson and no count can tell you which that is. What is computable is the",
    "material the judgement needs, so each section below lists every lesson the SOP holds, least",
    "anchored first: a lesson naming no run at all, then the one whose run the fewest other lessons",
    "lean on. Creating the archive file and moving a lesson into it are both yours; this is only",
    "the shortlist. The cap is parsed out of the README on each run, so raising the policy to 6",
    "empties these rows rather than arguing with them.",
    "",
    "`the run it names` is the video id or dated run in the bullet, carried down from the bullet",
    'above when the bullet says "same run"; the lessons carry no dates, so position within the',
    "section is the only age the record has. `cited` counts every lesson in `docs/sop/` attributed",
    "to that run, carry-down included: a run 1 lesson mentions has nothing else leaning on it, and",
    'the test the policy sets is a "confirmed pattern across ≥2 videos". The whole upstream',
    "A-series resolves to 1 dated run, which is the count saying so.",
  );
  lines.push("");
  lines.push("| SOP | lessons | over by | the runs its lessons name |");
  lines.push("|---|---:|---:|---|");
  for (const s of overCap.over) {
    const runs = [...new Set(s.lessons.flatMap((l) => l.runs))];
    lines.push(
      `| [${s.id}](sop/${s.file}) | ${s.lessons.length} | ${s.demote} | ${
        runs.map((r) => `\`${r}\` (${overCap.cited.get(r) ?? 0})`).join(", ") || "— none"
      } |`,
    );
  }
  lines.push("");
  for (const s of overCap.over) {
    lines.push(`### ${s.id} (${s.lessons.length} lessons, ${s.demote} over)`);
    lines.push("");
    lines.push("| the lesson | the run it names | cited | position |");
    lines.push("|---|---|---:|---:|");
    for (const l of s.ranked) {
      const runs = l.runs.map((r) => `\`${r}\``).join(", ");
      const cited = l.runs.length
        ? Math.min(...l.runs.map((r) => overCap.cited.get(r) ?? 0))
        : null;
      lines.push(
        `| ${sopLessonText(l.text)} | ${
          runs ? `${runs}${l.inherited ? " — carried down" : ""}` : "— names no run"
        } | ${cited === null ? "—" : cited} | ${l.position} of ${s.lessons.length} |`,
      );
    }
    lines.push("");
  }

  const parents = classifyKeywordParents(
    bridges.map((b) => ({ id: b.slug, keywords: b.keywords, verdict: b.serpVerdict })),
  );
  const unjudged = parents.unclaimed.filter((p) => p.unjudged);
  const edge = parents.crossGuideEdges[0];
  const bridgeTitle = new Map(bridges.map((b) => [b.slug, b.title]));
  lines.push(`## Head terms no page claims (${parents.unclaimed.length})`);
  lines.push("");
  lines.push(
    "`parent` on a target keyword is the broader term Ahrefs says Google ranks a page for when it",
    "ranks it for that keyword at all — the only field in the corpus that names a topic *above* a",
    `page. Of the ${parents.keywords} declared keywords ${parents.withParent} name one, ${parents.distinct} distinct: ${parents.self.length} are the keyword`,
    `itself, ${parents.sameGuide.length} another keyword on the same guide, ${parents.otherGuide.length} a keyword on a different guide`,
    edge ? `(\`${edge.from}\`'s "${edge.via}" sits under \`${edge.to}\`),` : "",
    `and ${parents.unclaimed.length} are head terms no page on this site claims (tracker entry 352, 2026-09-22).`,
    "",
    "Unclaimed is a decision, not a defect. The parent is usually the head term the page",
    "deliberately did not chase, which is why the child was chosen — `active-listening` targets",
    '"active listening skills" and names "active listening" only as its parent. So the column that',
    "makes a row readable is the declaring guide's own `serp_verdict`: `authority` is a page that",
    "looked at those results and left the head alone.",
    "",
    unjudged.length > 0
      ? `What is missing is that ${unjudged.length} of these ${parents.unclaimed.length} carry no verdict at all — nobody has decided`
      : `Every one of these ${parents.unclaimed.length} carries a verdict on the guide that declares the child, so there is`,
    unjudged.length > 0
      ? "on them, and they are the only part of this list worth a person's time: the verdict column"
      : "no head here that nobody has decided on. The row to watch for is a new one whose verdict",
    unjudged.length > 0 ? "below says so on every one of them." : "column says nobody has looked.",
    "",
    "The traffic potential is the child keyword's own frontmatter, copied, and orders the list",
    "because it beats volume; a child recording none shows none, since an invented figure would be",
    "worse than an absent one. No page hierarchy is drawn from any of this: 1 edge between guides",
    "is not a hierarchy, and a `part of` line is worth building when that count rises, not before.",
    "`src/lib/keyword-parents.mjs` holds the classification this page and `npm run seo:audit`",
    "share, and `parent-topics.test.ts` holds the counts.",
  );
  lines.push("");
  lines.push(
    "| head term | the keywords under it | the guide that declares them | best traffic potential | its verdict |",
  );
  lines.push("|---|---|---|---:|---|");
  for (const p of parents.unclaimed) {
    const children = p.children.map((c) => `\`${c.keyword}\``).join(", ");
    const guides = p.guides
      .map(
        (slug) => `[${bridgeTitle.get(slug) ?? slug}](../content/bridges/${slug}.md) \`${slug}\``,
      )
      .join(", ");
    const potential =
      p.bestTrafficPotential === null
        ? "— none recorded"
        : p.bestTrafficPotential.toLocaleString("en-US");
    const verdict = p.verdicts.map((v) => v ?? "— nobody has looked").join(", ");
    lines.push(`| ${p.parent} | ${children} | ${guides} | ${potential} | ${verdict} |`);
  }
  lines.push("");

  const coverage = aliasCoverage();
  const candidates = aliasCandidates();
  const withCandidates = candidates.filter((a) => a.candidates.length > 0);
  const shown = withCandidates.slice(0, ALIAS_CANDIDATE_ATOMS_SHOWN);
  const omitted = withCandidates.length - shown.length;
  const readings = oneWordAliasReadings();
  lines.push(`## Concepts with no second name (${coverage.aliasless})`);
  lines.push("");
  lines.push(
    "`aliases` is the field that says what else a concept is called, and the linker, site search",
    `and schema.org all read it. It holds ${coverage.registrations} registrations on ${coverage.withAlias} of the ${coverage.atoms} concepts;`,
    `the other ${coverage.aliasless} have never been asked. Those ${coverage.registrations} names are said ${coverage.occurrences.toLocaleString("en-US")} times across the`,
    `${coverage.corpus} bodies, which prices the field: the marginal alias is worth about 37 occurrences and`,
    "4 links, and it is a line of frontmatter (tracker entry 353, 2026-09-22).",
    "",
    "So this is a shortlist and not a recommendation. `src/lib/alias-candidates.ts` collects, for",
    "each concept with no alias, the phrases this corpus already puts beside it: phrases in a",
    "sentence that also names the concept, and phrases the concept's own page bolds, quotes or",
    "uses as a section heading. Every existing alias, every concept title and every concept id is",
    "excluded, and each candidate is held to the shape the linker already accepts — 2 words, 8",
    "characters — so accepting one changes a frontmatter and nothing else.",
    "",
    "What the columns cannot tell you is whether the phrase *means* the concept. Co-occurrence is",
    "not synonymy: a phrase can sit beside an idea because it is its opposite, its cause or the",
    "drill that trains it. `share` is the fraction of the pages saying the phrase that already",
    "name the concept, and `lift` is that share against the concept's own base rate — `relationship`",
    "is named on 126 of the 308 bodies, so 54% on it means nothing and only lift says so. A",
    "concept the corpus names that often cannot show a lift above about 3 at all, which is why",
    "the first rows here carry the weakest evidence and the last ones the strongest. Reading the",
    "sentence is the step no count replaces, and the reason it matters is that an alias links on",
    "every page that says the phrase: the article rule in `content.ts` was learned by making 89",
    "wrong links at once.",
    "",
    `Ordered by the concept's reach times its best candidate's occurrences, biggest first. ${withCandidates.length} of`,
    `the ${coverage.aliasless} concepts produced a candidate at all; the top ${shown.length} are below and ${omitted} are omitted,`,
    "because a list nobody finishes reading is worth less than a short one somebody acts on. The",
    "rest are an `aliasCandidates()` call away, or raise the cap in the script.",
  );
  lines.push("");
  lines.push("| concept | named on | candidate | says it | share | lift | found |");
  lines.push("|---|---:|---|---:|---:|---:|---|");
  for (const atom of shown) {
    for (const [i, c] of atom.candidates.slice(0, ALIAS_CANDIDATES_PER_ATOM).entries()) {
      const name = i === 0 ? `[${atom.title}](../content/atoms/${atom.id}.md) \`${atom.id}\`` : "↳";
      const reach = i === 0 ? `${atom.reach}` : "";
      lines.push(
        `| ${name} | ${reach} | \`${c.phrase}\` | ${c.occurrences} on ${c.pages} | ${Math.round(
          c.share * 100,
        )}% | ${c.lift.toFixed(1)}× | ${c.sources.join(", ")} |`,
      );
    }
  }
  lines.push("");
  lines.push(`### The one-word aliases nobody sampled (${readings.length})`);
  lines.push("");
  lines.push(
    "`ONE_WORD_ALIAS_ALLOWLIST` is the corpus's only per-item opt-in: a single-word alias links",
    "only when it is listed there, and a word earns its place by a reading of its occurrences",
    "rather than by its length. The bar is 1 wrong link in 5 — `impulse` was tried and dropped at",
    `2 of a 5-occurrence sample. These ${readings.length} were declined on judgement and never sampled. They have`,
    "now been sampled, sentence by sentence, on the date in the table.",
    "",
    "Nothing here changes the allowlist. Adding a word to it changes links on every page that says",
    "the word, so the decision stays the author's and this is the evidence sitting beside it. The",
    "occurrence counts are re-read from the corpus on every run; the verdicts are a reading taken",
    "once and are only as current as their date. `away` is the occurrences outside the declaring",
    "page, which are the only ones that can become a link, and because the linker links once per",
    "page the page count beside it is closer to the links on offer than the occurrence count is.",
  );
  lines.push("");
  lines.push("| alias | declared by | says it | away | sample | wrong | read |");
  lines.push("|---|---|---:|---:|---:|---:|---|");
  for (const r of readings) {
    lines.push(
      `| \`${r.alias}\` | ${r.atoms.map((id) => `[${id}](../content/atoms/${id}.md)`).join(", ")} | ${
        r.occurrences
      } on ${r.pages} | ${r.offPage} on ${r.offPagePages} | ${r.sampled} | ${r.wrong} | ${r.read} |`,
    );
  }
  lines.push("");
  for (const r of readings) {
    lines.push(`**\`${r.alias}\`** — ${r.verdict}`);
    lines.push("");
  }
  return lines.join("\n");
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename);
if (isMain) {
  const page = buildSeedsPage();
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
    if (current !== page) {
      console.error("docs/seeds.md is stale; run `node scripts/seeds.mjs`");
      process.exit(1);
    }
    console.log("docs/seeds.md is current");
  } else {
    fs.writeFileSync(OUT, page);
    console.log(`wrote ${path.relative(ROOT, OUT)}`);
  }
}
