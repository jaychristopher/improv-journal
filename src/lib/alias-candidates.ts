/**
 * The phrases the corpus already uses for a concept that has no `aliases`.
 *
 * `aliases` is 43 registrations on 33 of the 205 atoms; the other 172 have
 * never been asked what else they are called, and 45 atoms can never be
 * linked from prose by their title at all (tracker entry 353, 2026-09-22).
 * The linker reads aliases — `isAutolinkableAlias` registers any alias of 2
 * words and 8 characters, and `ONE_WORD_ALIAS_ALLOWLIST` opts in single
 * words one at a time — so an alias is the cheapest link the corpus has.
 * What nothing has done is propose one. This module does, and nothing more.
 *
 * WHAT THE SIGNAL IS. Three places a second name shows up, all of them
 * co-occurrence rather than meaning:
 *   - `near-a-link`: the phrase sits in a sentence that also names the atom,
 *     somewhere other than the atom's own page. A writer who says the
 *     concept and the phrase in one sentence is usually glossing one with
 *     the other.
 *   - `bold` and `quoted`: the atom's own body marks the phrase up. A
 *     concept page that bolds or quotes a phrase is usually naming it.
 *   - `heading`: the phrase heads a `##` section of the atom's own body.
 * Each candidate then carries its corpus-wide occurrence count and the share
 * of the pages carrying it that already name the atom.
 *
 * WHAT THE SIGNAL CANNOT SHOW. Co-occurrence is not synonymy. A phrase can
 * score highly because it is the concept's opposite, its cause, the drill
 * that trains it, or simply a phrase this author likes near that subject.
 * The share is the only correction offered and it is weak in both
 * directions: a rare phrase on 2 pages reads 100% on no evidence, and a real
 * synonym used widely reads low because the concept is not named beside it
 * every time. Nothing here reads a sentence for meaning. Registering an
 * alias changes links on every page of the site, and the rules were tuned by
 * making 89 wrong ones ("The game"), so the output is a shortlist for a
 * person and never a decision. Nothing in this module writes to `content/`.
 *
 * WHAT IS EXCLUDED, and why each. Every existing alias (already registered);
 * every atom title (the linker has the phrase, and an alias equal to another
 * atom's title is the collision the guard forbids); every atom id, which is
 * what `GENERIC_ONE_WORD_ATOM_TITLES` is a list of — all 27 of its entries
 * are atom ids, so excluding ids excludes the generic set without copying
 * it; and any phrase containing, or contained in, the atom's own title.
 * Candidates are further held to the shape `isAutolinkableAlias` already
 * accepts — 2 or more words, 8 or more characters, not counting a leading
 * article — so accepting one is a line of frontmatter and no change to the
 * one-word allowlist.
 *
 * Reading the corpus is memoised per process: the candidate pass builds one
 * n-gram index over every body and answers every count from it.
 */

import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";

/** Concepts, guides and lessons — the bodies entry 353's 1,576 was read over. */
const CANDIDATE_CORPUS_SUBDIRS = ["atoms", "bridges", "threads"] as const;

/** The longest candidate the n-gram index can count. */
const CANDIDATE_MAX_WORDS = 4;
/** `isAutolinkableAlias`'s own floors, so a candidate needs no allowlist entry. */
const CANDIDATE_MIN_WORDS = 2;
const CANDIDATE_MIN_LENGTH = 8;
/**
 * A phrase said once is a phrasing, not a name. The floor is low on purpose:
 * it is the author who decides, and a 3-occurrence phrase on the right atom
 * is worth reading past a 30-occurrence one on the wrong atom.
 */
const CANDIDATE_MIN_OCCURRENCES = 3;
/**
 * A phrase this pass proposes for more atoms than this is the corpus's
 * ordinary vocabulary, not anybody's second name: "eye contact", "real
 * time", "specific sources" (a heading on 121 pages). Nothing about the
 * phrase says so — what says so is that it sits beside 40 different
 * concepts.
 */
const CANDIDATE_MAX_ATOMS_OFFERING = 4;
/**
 * The share of the phrase's pages that already name the atom. Below a half
 * the phrase is mostly used away from the concept, which is the reading that
 * dropped `impulse` from the one-word allowlist. It is a filter on obvious
 * noise and not evidence of synonymy — see the header.
 */
const CANDIDATE_MIN_SHARE = 0.5;
/**
 * Share against the atom's own base rate. `relationship` is named on 126 of
 * the 308 bodies, so a phrase picked at random from the corpus already
 * scores about 41% on it and a 54% share means nothing. Lift is that share
 * divided by the base rate, and 2 is the floor: the phrase has to sit with
 * the concept twice as often as the corpus does anyway. It corrects for the
 * atom's reach and for nothing else — a phrase can still clear it by being
 * the concept's opposite or its cause.
 */
const CANDIDATE_MIN_LIFT = 2;
/**
 * A word on more than this share of the corpus bodies is furniture: "people",
 * "ask", "else", "next". A phrase made only of furniture — "people ask",
 * "everyone else", "happens next" — is how this author writes sentences, not
 * a name a page could be taught under, and it clears the lift floor on any
 * concept the corpus mentions often. The share is measured on the corpus
 * rather than declared, so it follows the prose.
 */
const CANDIDATE_FURNITURE_DOC_SHARE = 0.4;

/**
 * Words that cannot open or close a name. Not a linguistic stop list — a
 * list of what makes an n-gram read as a fragment of a sentence rather than
 * a thing the prose could be taught under.
 */
const EDGE_WORDS = new Set(
  (
    "a an the and or but if of to in on at by for with from as is are was were be been being it its" +
    " this that these those you your they them their we our he she his her not no so than then" +
    " when while what which who whom how why where can could will would should may might must do" +
    " does did done has have had one two three all any each more most other some such only own same" +
    " very just about into over under out up down off again further here there both few nor too" +
    " don now also because though although after before during until between against among across" +
    " like get gets got make makes made take takes took give gives gave go goes went come comes came" +
    " say says said saying see sees saw know knows knew think thinks thought want wants wanted need" +
    " needs use uses used way ways thing things lot lots bit bits kind sort type every never always" +
    " still even yet once far less least many much own per plus via whose itself themselves" +
    // The rest are this author's connective tissue. Each one ends up at the
    // edge of a 2-word run that reads as half a sentence — "people ask",
    // "everyone else", "without ever", "rather than merely", "you're doing" —
    // and never at the edge of a name.
    " else ever merely actually people person someone somebody everyone everybody nobody anyone" +
    " anybody nothing something anything everything happen happens happening feel feels felt" +
    " answer answers ask asks asked asking move moves moved doing matters means meant worth"
  ).split(/\s+/),
);

export type CandidateSource = "near-a-link" | "bold" | "quoted" | "heading";

export type AliasCandidate = {
  /** The phrase, lowercased and space-collapsed, as the prose says it. */
  phrase: string;
  /** Whole-phrase occurrences across the corpus bodies. */
  occurrences: number;
  /** Pages carrying it. */
  pages: number;
  /** Of those pages, the ones that already name the atom. */
  pagesNamingAtom: number;
  /** pagesNamingAtom / pages — evidence, not proof. See the header. */
  share: number;
  /** That share against the atom's base rate across the corpus. */
  lift: number;
  /** Which of the three signals produced it. */
  sources: CandidateSource[];
};

export type AtomAliasCandidates = {
  id: string;
  title: string;
  type: string;
  /**
   * Pages other than its own that name the atom — the reach an alias would
   * be added to, and the reason a candidate on a widely-named concept is
   * worth more than the same count on a concept nothing mentions.
   */
  reach: number;
  /** reach over the rest of the corpus — the rate `lift` is measured against. */
  baseRate: number;
  candidates: AliasCandidate[];
};

type CorpusDoc = {
  id: string;
  subdir: string;
  /** The body as written, which is what entry 353's occurrence total counted. */
  raw: string;
  /** The same body reduced to prose, which is what the candidate pass reads. */
  text: string;
  sentences: string[];
};
type AtomRecord = {
  id: string;
  title: string;
  type: string;
  aliases: string[];
  body: string;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Markdown reduced to the words a reader sees: fenced code, images and html
 * out, link labels kept and their targets dropped. Headings stay, because
 * the heading signal reads them back out of this same text.
 */
function toProse(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) ?? [];
}

/**
 * The title as the linker matches it: any parenthetical dropped, whitespace
 * collapsed. "Beats (First / Second / Third)" is named by "beats".
 */
function titlePhrase(title: string): string {
  return title
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Whether a passage names the atom — the backticked id, which the renderer
 * turns into a link, or the title as a whole phrase, which the autolinker
 * does. The same rule `namesConcept` uses, so "names" here means the same
 * thing it means everywhere else in the repo.
 */
function passageNamesAtom(text: string, atom: { id: string; title: string }): boolean {
  if (new RegExp("`" + escapeRegExp(atom.id) + "`").test(text)) return true;
  const phrase = titlePhrase(atom.title);
  if (!phrase) return false;
  return new RegExp(
    `(?<![A-Za-z0-9])${escapeRegExp(phrase).replace(/ /g, "\\s+")}(?![A-Za-z0-9])`,
    "i",
  ).test(text);
}

function readAtoms(contentDir: string): AtomRecord[] {
  const dir = path.join(contentDir, "atoms");
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      return {
        id: String(data.id ?? file.replace(/\.md$/, "")),
        title: String(data.title ?? ""),
        type: String(data.type ?? ""),
        aliases: (data.aliases ?? []).map((alias: string) => String(alias)),
        body: content,
      };
    });
}

/**
 * One read of the bodies per directory per process. The 3 entry points below
 * each want the whole corpus and a seeds run calls all 3, so without this the
 * 308 files are parsed 3 times for the same answer.
 */
const corpusCache = new Map<string, CorpusDoc[]>();

function readCorpus(contentDir: string): CorpusDoc[] {
  const cached = corpusCache.get(contentDir);
  if (cached) return cached;
  const docs: CorpusDoc[] = [];
  for (const subdir of CANDIDATE_CORPUS_SUBDIRS) {
    const dir = path.join(contentDir, subdir);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).sort()) {
      if (!file.endsWith(".md")) continue;
      const { data, content } = matter(fs.readFileSync(path.join(dir, file), "utf8"));
      const text = toProse(content);
      docs.push({
        id: String(data.id ?? file.replace(/\.md$/, "")),
        subdir,
        raw: content,
        text,
        // Sentence enough for co-occurrence: a phrase and a concept name in
        // the same one is the signal, and an over-split sentence only ever
        // loses a candidate.
        sentences: text.split(/(?<=[.!?:;])\s+|\n{2,}/),
      });
    }
  }
  corpusCache.set(contentDir, docs);
  return docs;
}

/**
 * One n-gram index over the whole corpus: phrase → occurrences and the pages
 * carrying it, for every run of 2 to CANDIDATE_MAX_WORDS words. Built once,
 * because the alternative is a regex scan of 308 bodies per candidate and
 * there are tens of thousands of candidates.
 */
function buildIndex(docs: CorpusDoc[]): Map<string, { count: number; pages: Set<string> }> {
  const index = new Map<string, { count: number; pages: Set<string> }>();
  for (const doc of docs) {
    const words = tokenize(doc.text);
    for (let n = CANDIDATE_MIN_WORDS; n <= CANDIDATE_MAX_WORDS; n += 1) {
      for (let i = 0; i + n <= words.length; i += 1) {
        const phrase = words.slice(i, i + n).join(" ");
        let entry = index.get(phrase);
        if (!entry) {
          entry = { count: 0, pages: new Set() };
          index.set(phrase, entry);
        }
        entry.count += 1;
        entry.pages.add(doc.id);
      }
    }
  }
  return index;
}

/** The shape `isAutolinkableAlias` accepts, so a candidate needs no opt-in. */
function hasAutolinkableShape(phrase: string): boolean {
  const normalized = phrase.trim().replace(/^(?:a|an|the)\s+/i, "");
  return (
    normalized.length >= CANDIDATE_MIN_LENGTH &&
    normalized.split(/\s+/).length >= CANDIDATE_MIN_WORDS &&
    phrase.trim().split(/\s+/).length <= CANDIDATE_MAX_WORDS
  );
}

let cache: AtomAliasCandidates[] | null = null;

/**
 * Every atom with no `aliases`, with the phrases the corpus already uses
 * near it. Ordered by the atom's reach, then by its best candidate, because
 * a second name on a concept 40 pages already mention buys more links than
 * the same name on one nothing mentions. Memoised per process.
 */
export function aliasCandidates(
  contentDir = path.join(process.cwd(), "content"),
): AtomAliasCandidates[] {
  if (cache) return cache;

  const atoms = readAtoms(contentDir);
  const docs = readCorpus(contentDir);
  const index = buildIndex(docs);

  // The corpus's own furniture words, counted rather than listed.
  const wordDocs = new Map<string, number>();
  for (const doc of docs) {
    for (const word of new Set(tokenize(doc.text))) {
      wordDocs.set(word, (wordDocs.get(word) ?? 0) + 1);
    }
  }
  const isFurniture = (word: string) =>
    (wordDocs.get(word) ?? 0) / docs.length > CANDIDATE_FURNITURE_DOC_SHARE;

  // A reference atom's title is "Truth in Comedy — Halpern, Close, Johnson
  // (1994)" and the linker registers the part before the dash as well, so
  // both forms are phrases the linker already holds.
  const titles = new Set<string>();
  for (const atom of atoms) {
    const phrase = titlePhrase(atom.title);
    titles.add(tokenize(phrase).join(" "));
    const prefix = phrase.split(/\s+[—–]\s+/)[0];
    if (prefix) titles.add(tokenize(prefix).join(" "));
  }
  const ids = new Set(atoms.map((atom) => atom.id));
  const registered = new Set(
    atoms.flatMap((atom) => atom.aliases.map((alias) => tokenize(alias).join(" "))),
  );

  // Which pages name which atom, once: the reach figure and the share both
  // read it, and it is 205 atoms against 308 bodies either way.
  const namedBy = new Map<string, Set<string>>();
  for (const atom of atoms) {
    const pages = new Set<string>();
    for (const doc of docs) {
      if (doc.id === atom.id) continue;
      if (passageNamesAtom(doc.text, atom)) pages.add(doc.id);
    }
    namedBy.set(atom.id, pages);
  }

  // Pass 1: what each alias-less atom offers. Pass 2 scores it, because the
  // strongest filter — a phrase proposed for many atoms at once — cannot be
  // known until every atom has been asked.
  const offered = new Map<string, Map<string, Set<CandidateSource>>>();
  const aliasless = atoms.filter((atom) => atom.aliases.length === 0);
  for (const atom of aliasless) {
    const reach = namedBy.get(atom.id) ?? new Set<string>();
    const own = tokenize(titlePhrase(atom.title)).join(" ");
    const sources = new Map<string, Set<CandidateSource>>();
    offered.set(atom.id, sources);

    const offer = (raw: string, source: CandidateSource) => {
      const phrase = tokenize(raw).join(" ");
      if (!phrase || !hasAutolinkableShape(phrase)) return;
      if (registered.has(phrase) || titles.has(phrase)) return;
      if (ids.has(phrase.replace(/\s+/g, "-"))) return;
      if (own && (phrase.includes(own) || own.includes(phrase))) return;
      if (phrase.split(" ").every(isFurniture)) return;
      const seen = sources.get(phrase) ?? new Set<CandidateSource>();
      seen.add(source);
      sources.set(phrase, seen);
    };

    for (const doc of docs) {
      if (!reach.has(doc.id)) continue;
      for (const sentence of doc.sentences) {
        if (!passageNamesAtom(sentence, atom)) continue;
        const words = tokenize(sentence);
        for (let n = CANDIDATE_MIN_WORDS; n <= CANDIDATE_MAX_WORDS; n += 1) {
          for (let i = 0; i + n <= words.length; i += 1) {
            const run = words.slice(i, i + n);
            if (EDGE_WORDS.has(run[0]) || EDGE_WORDS.has(run[run.length - 1])) continue;
            offer(run.join(" "), "near-a-link");
          }
        }
      }
    }

    const body = toProse(atom.body);
    for (const match of body.matchAll(/\*\*([^*]{3,60})\*\*/g)) offer(match[1], "bold");
    for (const match of body.matchAll(/["“”]([^"“”]{3,60})["“”]/g)) offer(match[1], "quoted");
    for (const match of body.matchAll(/^#{2,}\s+(.+)$/gm)) offer(match[1], "heading");
  }

  // How many atoms proposed each phrase. A phrase several concepts all sit
  // beside is the corpus's vocabulary, not a name one of them answers to.
  const offeringAtoms = new Map<string, number>();
  for (const sources of offered.values()) {
    for (const phrase of sources.keys()) {
      offeringAtoms.set(phrase, (offeringAtoms.get(phrase) ?? 0) + 1);
    }
  }

  const results: AtomAliasCandidates[] = [];
  for (const atom of aliasless) {
    const reach = namedBy.get(atom.id) ?? new Set<string>();
    const baseRate = docs.length > 1 ? reach.size / (docs.length - 1) : 0;
    const candidates: AliasCandidate[] = [];
    for (const [phrase, from] of offered.get(atom.id) ?? []) {
      const entry = index.get(phrase);
      if (!entry || entry.count < CANDIDATE_MIN_OCCURRENCES) continue;
      if ((offeringAtoms.get(phrase) ?? 0) > CANDIDATE_MAX_ATOMS_OFFERING) continue;
      const pagesNamingAtom = [...entry.pages].filter(
        (page) => page === atom.id || reach.has(page),
      ).length;
      const share = entry.pages.size === 0 ? 0 : pagesNamingAtom / entry.pages.size;
      if (share < CANDIDATE_MIN_SHARE) continue;
      const lift = baseRate === 0 ? 0 : share / baseRate;
      if (lift < CANDIDATE_MIN_LIFT) continue;
      candidates.push({
        phrase,
        occurrences: entry.count,
        pages: entry.pages.size,
        pagesNamingAtom,
        share,
        lift,
        sources: [...from].sort(),
      });
    }
    candidates.sort(
      (a, b) =>
        b.occurrences - a.occurrences || b.share - a.share || a.phrase.localeCompare(b.phrase),
    );
    results.push({
      id: atom.id,
      title: atom.title,
      type: atom.type,
      reach: reach.size,
      baseRate,
      candidates,
    });
  }

  results.sort(
    (a, b) =>
      b.reach * (b.candidates[0]?.occurrences ?? 0) -
        a.reach * (a.candidates[0]?.occurrences ?? 0) ||
      b.reach - a.reach ||
      a.id.localeCompare(b.id),
  );
  cache = results;
  return cache;
}

export type AliasCoverage = {
  /** Concepts in the graph. */
  atoms: number;
  /** Concepts carrying at least 1 alias. */
  withAlias: number;
  /** Concepts carrying none — the population `aliasCandidates` answers for. */
  aliasless: number;
  /** Alias slots declared, and how many distinct strings they are. */
  registrations: number;
  distinct: number;
  /** Aliases 2 atoms both claim, lowercased. */
  duplicates: string[];
  /** Bodies read. */
  corpus: number;
  /** Whole-phrase occurrences of the declared aliases across those bodies. */
  occurrences: number;
};

let coverageCache: AliasCoverage | null = null;

/**
 * The coverage of the `aliases` field, counted rather than quoted. The seeds
 * page prints these so a morning's authoring moves the sentence instead of
 * contradicting it. Memoised per process.
 */
export function aliasCoverage(contentDir = path.join(process.cwd(), "content")): AliasCoverage {
  if (coverageCache) return coverageCache;
  const atoms = readAtoms(contentDir);
  const docs = readCorpus(contentDir);

  const claimedBy = new Map<string, string[]>();
  let registrations = 0;
  let occurrences = 0;
  for (const atom of atoms) {
    for (const alias of atom.aliases) {
      registrations += 1;
      const key = alias.toLowerCase();
      claimedBy.set(key, [...(claimedBy.get(key) ?? []), atom.id]);
      const matcher = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(alias)}(?![A-Za-z0-9])`, "gi");
      for (const doc of docs) occurrences += (doc.raw.match(matcher) ?? []).length;
    }
  }

  coverageCache = {
    atoms: atoms.length,
    withAlias: atoms.filter((atom) => atom.aliases.length > 0).length,
    aliasless: atoms.filter((atom) => atom.aliases.length === 0).length,
    registrations,
    distinct: claimedBy.size,
    duplicates: [...claimedBy]
      .filter(([, ids]) => ids.length > 1)
      .map(([alias]) => alias)
      .sort(),
    corpus: docs.length,
    occurrences,
  };
  return coverageCache;
}

/**
 * The one-word aliases the linker declines, read against the bar the
 * allowlist is held to.
 *
 * `ONE_WORD_ALIAS_ALLOWLIST` admits a single word on the evidence of its
 * occurrences, not its length, and the bar is 1 wrong link in 5: `impulse`
 * was tried and dropped at 2 of a 5-occurrence sample. 5 declared one-word
 * aliases were declined on judgement and never sampled. These are those
 * samples, read sentence by sentence on the date given.
 *
 * The verdicts are a reading, not a measurement, and they are recorded here
 * rather than acted on: nothing in this repo adds a word to the allowlist,
 * because a word admitted there changes links on every page that says it and
 * that is the author's call. The counts beside each are re-derived from the
 * corpus on every run, so a verdict taken on 4 occurrences is visibly a
 * verdict taken on 4 occurrences.
 */
export type OneWordAliasSample = {
  /** The alias as the frontmatter declares it. */
  alias: string;
  /** The atom that declares it — where a link on the word would land. */
  atoms: string[];
  /** Occurrences read, and how many of those were the ordinary word. */
  sampled: number;
  wrong: number;
  /** The date the sentences were read. */
  read: string;
  /** What the sample found, in the author's terms. */
  verdict: string;
};

const ONE_WORD_ALIAS_SAMPLES: readonly OneWordAliasSample[] = [
  {
    alias: "Denial",
    atoms: ["blocking", "blocking-taxonomy"],
    sampled: 5,
    wrong: 1,
    read: "2026-09-22",
    verdict:
      "Leave it declined, and not because of the sample. 1 of 5 was wrong — `negation` quotes " +
      "*Truth in Comedy* using the word rather than using it — which is at the bar rather than " +
      "over it. The disqualifier is that 2 atoms declare `Denial`, so a link on the word has 2 " +
      "possible targets and no rule to choose between them. It is the corpus's only duplicate " +
      "alias. (1 of the off-page occurrences is image alt text, which the linker never sees; it " +
      "is counted in the table and was not sampled.)",
  },
  {
    alias: "Wipe",
    atoms: ["editing"],
    sampled: 4,
    wrong: 0,
    read: "2026-09-22",
    verdict:
      "Passes the bar on a sample too small to be worth the change. Every occurrence is the " +
      "editing move. But 3 of the 4 are on `editing` itself, where a self-link is refused, and 2 " +
      "of those are a heading and a bold counter-position line the linker skips anyway — so the " +
      "word buys about 1 link, on `sweep-edit`.",
  },
  {
    alias: "Gifting",
    atoms: ["elevating"],
    sampled: 2,
    wrong: 0,
    read: "2026-09-22",
    verdict:
      "Passes, and buys 1 link. Both occurrences are the concept — `elevating` lists it as " +
      "recognised improv vocabulary and `endowment` uses it — and the first is on the declaring " +
      "page, so the only link available is the one on `endowment`.",
  },
  {
    alias: "Platform",
    atoms: ["base-reality"],
    sampled: 5,
    wrong: 1,
    read: "2026-09-22",
    verdict:
      "The marginal one, and the one worth a person's eye. 1 of 5 was the ordinary word — " +
      '`editing` asks "whether the laugh is a peak or a platform" — which is at the bar. Counted ' +
      "as links rather than occurrences it is worse: 1 link per page means 4 links, on `editing`, " +
      "`narrative-longform`, `scene-structure` and `tilt`, and the wrong one is 1 of those 4. " +
      "(1 of the off-page occurrences is image alt text, which the linker never sees.)",
  },
  {
    alias: "POV",
    atoms: ["point-of-view"],
    sampled: 5,
    wrong: 0,
    read: "2026-09-22",
    verdict:
      "The strongest of the 5 and the only clear pass. Every occurrence away from its own page " +
      "is the concept, on `character-through-game`, `character`, `status-dynamics` and `status`; " +
      "the acronym has no ordinary sense in this corpus. Worth noting that `point-of-view` is in " +
      "`GENERIC_ONE_WORD_ATOM_TITLES`, so the concept's title is declined as ambiguous while its " +
      "acronym is not ambiguous at all.",
  },
];

export type OneWordAliasReading = OneWordAliasSample & {
  /** Whole-word occurrences across the corpus, now. */
  occurrences: number;
  /** Pages carrying it. */
  pages: number;
  /** Occurrences away from the declaring atoms — the only ones that can link. */
  offPage: number;
  /** Pages away from the declaring atoms — at 1 link per page, the links on offer. */
  offPagePages: number;
};

/**
 * The recorded samples with their counts re-read from the corpus. The sample
 * is a reading of sentences and stays as written; everything countable is
 * counted again, so a sample taken on a paragraph that has since been
 * rewritten shows its age.
 */
export function oneWordAliasReadings(
  contentDir = path.join(process.cwd(), "content"),
): OneWordAliasReading[] {
  const docs = readCorpus(contentDir);
  return ONE_WORD_ALIAS_SAMPLES.map((sample) => {
    const matcher = new RegExp(
      `(?<![A-Za-z0-9])${escapeRegExp(sample.alias)}(?![A-Za-z0-9])`,
      "gi",
    );
    let occurrences = 0;
    let offPage = 0;
    const pages = new Set<string>();
    const offPagePages = new Set<string>();
    for (const doc of docs) {
      const hits = (doc.raw.match(matcher) ?? []).length;
      if (hits === 0) continue;
      occurrences += hits;
      pages.add(doc.id);
      if (!sample.atoms.includes(doc.id)) {
        offPage += hits;
        offPagePages.add(doc.id);
      }
    }
    return {
      ...sample,
      occurrences,
      pages: pages.size,
      offPage,
      offPagePages: offPagePages.size,
    };
  });
}
