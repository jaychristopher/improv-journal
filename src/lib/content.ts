/**
 * Content loading and graph compilation.
 * Reads markdown files from content/, resolves all links, and builds the knowledge graph.
 */

import fs from "fs";
import { glob } from "glob";
import matter from "gray-matter";
import path from "path";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import html from "remark-html";

// The picker's own level rule, so the lesson page offers a reader the same
// drills the picker would. picker-config imports only types, so no cycle.
import { matchesLevel } from "@/app/tools/exercise-picker/picker-config";

import { type AudioContentType, getAudioAssetUrl, getRelativeAudioPath } from "./audio";
import { getAudioDuration, loadAudioManifest } from "./audio-manifest";
import { inlineDiagrams } from "./diagrams";
import { contentPath, firstPublishedDate } from "./first-published";
import { lessonAtomOrder } from "./lesson-order";
import { librarySlug } from "./library-slug";
import { getNextPath, isOnProgression } from "./path-progression";
import type {
  AtomFrontmatter,
  AtomType,
  BridgeFrontmatter,
  GraphEdge,
  GraphNode,
  KnowledgeGraph,
  Link,
  PathFrontmatter,
  ShowFrontmatter,
  SourceFrontmatter,
  ThreadFrontmatter,
} from "./schema";
import { dependencyOrder, libraryPlayOrder, orderByKey, pathPlayOrder } from "./season-order";
import { SITE_NAME } from "./seo";

const CONTENT_DIR = path.join(process.cwd(), "content");
const AUTOLINK_BLOCKED_NODE_TYPES = new Set([
  "code",
  "definition",
  "heading",
  "html",
  "image",
  "imageReference",
  "inlineCode",
  "link",
  "linkReference",
]);
export const GENERIC_ONE_WORD_ATOM_TITLES: ReadonlySet<string> = new Set([
  "audience",
  "bandwidth",
  "beats",
  "callback",
  "character",
  "coherence",
  "commitment",
  "connections",
  "discovery",
  "ensemble",
  "environment",
  "judgment",
  "mapping",
  "opening",
  "pacing",
  "point-of-view",
  "presence",
  "relationship",
  "run",
  "signal",
  "status",
  "steering",
  "suggestion",
  "trust",
  "vulnerability",
  "want",
  "warm-up",
]);
const LEGACY_HUB_ROUTE_MAP: Record<string, string> = {
  "/concepts/antipatterns": "/how-it-works/diagnosis",
  "/concepts/definitions": "/practice/vocabulary",
  "/concepts/exercises": "/practice/exercises",
  "/concepts/formats": "/practice/formats",
  "/concepts/laws": "/how-it-works",
  "/concepts/patterns": "/how-it-works/diagnosis",
  "/concepts/principles": "/how-it-works/principles",
  "/concepts/techniques": "/practice/techniques",
};

type RoutableContentSubdir = "atoms" | "bridges" | "paths" | "shows" | "sources" | "threads";

interface MarkdownNode {
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, string> };
  title?: string;
  type: string;
  url?: string;
  value?: string;
}

interface ContentLinkTarget {
  matcher: RegExp;
  phrase: string;
  priority: number;
  title: string;
  url: string;
}

let _bridgeSlugSet: Set<string> | null = null;
let _contentLinkTargets: ContentLinkTarget[] | null = null;

// ─── Source auto-linking ────────────────────────────────────────────────────
// Maps italic book/source titles in rendered HTML to their /library/ reference pages.
// Matches <em>Title</em> that is NOT already inside an <a> tag.

const SOURCE_TITLE_MAP: [RegExp, string][] = [
  [/Truth in Comedy/g, "/library/truth-in-comedy"],
  [/Bossypants/g, "/library/fey-bossypants"],
  [/Impro for Storytellers/g, "/library/impro-storytellers-johnstone"],
  [/Improvisation for the Theater/g, "/library/spolin-improvisation-for-theater"],
  [/Improv Wisdom/g, "/library/madson-improv-wisdom"],
  [/Group Genius/g, "/library/sawyer-group-genius"],
  [/Improvisation at the Speed of Life/g, "/library/tj-dave-speed-of-life"],
  [/Speed of Life/g, "/library/tj-dave-speed-of-life"],
  [/Improv Nonsense/g, "/library/hines-substack"],
  [/UCB Comedy Improvisation Manual/g, "/library/ucb-manual"],
  [/Attention and Effort/g, "/library/attention-and-effort-kahneman"],
  [/The Viewpoints Book/g, "/library/viewpoints-bogart-landau"],
  [/Sanford Meisner on Acting/g, "/library/meisner-on-acting"],
  [/Improvise/g, "/library/napier-improvise"],
  [/Daring Greatly/g, "/library/brown-daring-greatly"],
  [/Improv Nerd/g, "/library/carrane-improv-nerd"],
  [/Frame Analysis/g, "/library/goffman-frame-analysis"],
  [/Art by Committee/g, "/library/halpern-art-by-committee"],
  [/Behind the Scenes/g, "/library/napier-behind-the-scenes"],
  [/Standing in Space/g, "/library/overlie-standing-in-space"],
  [/The Improv Handbook/g, "/library/salinsky-improv-handbook"],
  [/Improvised Dialogues/g, "/library/sawyer-improvised-dialogues"],
  [/An Actor Prepares/g, "/library/stanislavski-actor-prepares"],
  [/Improvise Freely/g, "/library/stiles-improvise-freely"],
  [/Flow/g, "/library/csikszentmihalyi-flow"],
  [/Impro(?!v)/g, "/library/impro-johnstone"],
];

/**
 * Reconcile the ids remark-html's sanitiser rewrites with the links that point
 * at them.
 *
 * The `user-content-` prefix guards against DOM clobbering by untrusted markup.
 * Every heading here comes from markdown in this repository, and a citable
 * anchor is worth more than the guard: `#the-discipline` is something a person
 * can share and a passage result can point at, `#user-content-the-discipline`
 * is not.
 *
 * Footnotes need the opposite correction. remark-gfm already prefixes their
 * ids, and the sanitiser prefixes them again — so the id became
 * `user-content-user-content-fn-1` while the href stayed
 * `#user-content-fn-1`, and every footnote marker on every thread led
 * nowhere. 34 anchors across seven pages. Collapsing the doubled prefix makes
 * the two agree without giving up the guard, since a single prefix is what
 * remark-gfm intended and what it links to.
 */
function normaliseGeneratedIds(htmlStr: string): string {
  return htmlStr
    .replace(/(<h[2-6][^>]*\sid=")user-content-/g, "$1")
    .replace(/\sid="user-content-user-content-/g, ' id="user-content-');
}

// ─── Citation auto-linking ──────────────────────────────────────────────────
// Research citations name a journal rather than a work, so the title map above
// cannot reach them: "Cowan (2001), <em>Behavioral and Brain Sciences</em>"
// would wrongly link the journal. These match the author-year form instead, and
// fire once per page so a bibliography does not become a wall of links.

const CITATION_MAP: [RegExp, string][] = [
  [/Limb\s*(?:&(?:amp|#x26);|&)\s*Braun\s*\(2008\)/, "/library/limb-braun-jazz-improvisation"],
  [/Edmondson\s*\(1999\)/, "/library/edmondson-psychological-safety"],
  [/Cowan\s*\(2001\)/, "/library/cowan-magical-number-four"],
  [/Sweller\s*\(1988\)/, "/library/sweller-cognitive-load"],
  [/Cherry\s*\(1953\)/, "/library/cherry-cocktail-party"],
  [/Wickens\s*\(2002\)/, "/library/wickens-multiple-resources"],
];

function linkCitations(htmlStr: string, currentUrl: string | null): string {
  let result = htmlStr;
  for (const [pattern, url] of CITATION_MAP) {
    if (url === currentUrl) continue;

    let linked = false;
    result = result.replace(new RegExp(pattern.source, "g"), (match, ...args) => {
      if (linked) return match;
      const offset = args[args.length - 2] as number;
      const before = result.slice(Math.max(0, offset - 100), offset);
      if (before.includes("<a ") && !before.includes("</a>")) return match;

      linked = true;
      const ref = getAtomUrlMap().get(url.replace("/library/", ""));
      const tip = ref ? ref.tip.replace(/"/g, "&quot;") : match;
      return `<a href="${url}" title="${tip}">${match}</a>`;
    });
  }
  return result;
}

/**
 * Link an italicised work title to the library entry that holds it.
 *
 * The match used to require the <em> to contain the mapped title and nothing
 * else, which quietly excluded the form citations are most often written in:
 * the full bibliographic one. "Behind the Scenes: Improvising Long Form" and
 * "Attention and Effort." are the same works as the mapped titles and linked to
 * nothing, on the site's best-performing page type. There was no symptom —
 * the sentence reads correctly either way — which is the same failure the
 * citation-linkable guard exists for.
 *
 * A subtitle is admitted only after a literal colon, and that restriction is
 * load-bearing rather than cosmetic. Three mapped titles are prefixes of other
 * held works: Improvise, of both Improvised Dialogues and Improvise Freely.
 * Allowing any continuation would file all three under Napier. Requiring the
 * colon means "Improvise: Scene from the Inside Out" matches and "Improvised
 * Dialogues: …" cannot, because what follows "Improvise" there is a letter.
 *
 * Patterns are tried longest-first so a shorter title can never claim a longer
 * one's citation. Nothing in the current map depends on that, but the map is
 * appended to by hand and the failure would be silent.
 */
// ─── Named-entity auto-linking ──────────────────────────────────────────────
// Book titles reach their library entry through SOURCE_TITLE_MAP and concepts
// reach their atom through backticks. Names had no such route, and the people
// and places this site is largely about are named constantly. Measured on the
// build: Keith Johnstone appeared on 80 pages and was linked from 5, UCB on
// 102 and linked from 5, iO on 42 and linked from 4, the Annoyance on 35 and
// linked from 5.
//
// Only entities with a page of their own are listed, and the entry has to be
// about the thing the name denotes. Mick Napier is named on 41 pages and
// Charna Halpern on 20, and both were deliberately absent at first: what this
// site holds is the school each of them founded, not a page about them, and
// pointing a person's name at an institution asserts something slightly
// false. The institutions themselves have no such problem — /traditions/ucb
// is a page about UCB. Napier's case was reopened below.
//
// Second City is named on 24 pages and has no page here, so it is not listed
// rather than being pointed somewhere approximate.
//
// Matching is case-sensitive, which is load-bearing for two of these. "iO" is
// a proper noun and "io" inside another word is not, and "Annoyance" is the
// theatre while "annoyance" is an ordinary English noun. Every capitalised
// occurrence of both in this corpus was checked before they were added.
//
// The surname column is the fallback the prose actually needs. The guides'
// habit is to give the full name once and the surname after, or to give only
// the surname and assume the reader knows who is meant — measured 2026-09-22,
// 29 guides named Johnstone and 18 gave the full name, 18 named Spolin and 12
// did (tracker entry 271). Where the page reaches the target through the full
// name or a hand-written link, the surname adds nothing and is left alone;
// where it does not, the surname links once, after the first full-name
// mention if there is one. Only surnames that mean one person in this corpus
// are listed: "Close" is an ordinary English word and is not.
//
// Napier reverses the paragraph above about him. The Annoyance page's own
// orientation is his argument and its key text is his book, and
// tradition-disagreements already files every `(Napier)` counter-position
// under Annoyance — the site treats the name as naming the school, so the
// linker now does the same. Halpern stays absent: iO is Close's page here.
//
// The `school` column is the hand-off up, added 2026-09-22 (tracker entry
// 331). Two founders have a biography guide of their own, and the full name
// routes there because the guide is the keyword page ("viola spolin" 800 a
// month, "del close" 2,000). The cost was measured on the rendered corpus:
// /traditions/johnstone received 128 body links and /traditions/spolin 5,
// because every "Viola Spolin" and "Spolin" — named 269 times — went to the
// person, and the school has no other name in the prose. The rule about the
// entry being about the thing the name denotes is right for the person and
// wrong for the school: a founder's name in a concept's lineage denotes the
// school's idea, which is what the tradition page holds. So a page that names
// the full name keeps the guide at the full name and gets 1 link on the next
// lone surname to the school. The handle is written with a lookbehind so a
// later unlinked "Viola Spolin" cannot be split into "Viola <a>Spolin</a>";
// Close's handle is the possessive only, because "Close" alone is an English
// word (every capitalised "Close's" in the corpus was checked and all 20 are
// his), and Close keeps no `surname` fallback: "Close's" without "Del Close"
// on the page is left as it was.

interface Entity {
  /** The full name, or the institution's name. */
  name: RegExp;
  /** Where the full name goes: the person's guide where one exists, else the school. */
  url: string;
  /** The fallback when the full name could not carry the link; same target. */
  surname?: RegExp;
  /** The school the surname reaches once the full name has reached the person. */
  school?: { url: string; handle: RegExp };
}

const ENTITY_MAP: Entity[] = [
  { name: /Keith Johnstone/, url: "/traditions/johnstone", surname: /Johnstone/ },
  {
    name: /Viola Spolin/,
    url: "/viola-spolin",
    surname: /Spolin/,
    school: { url: "/traditions/spolin", handle: /(?<!Viola )Spolin/ },
  },
  {
    name: /Del Close/,
    url: "/del-close",
    school: { url: "/traditions/close", handle: /(?<!Del )Close's/ },
  },
  { name: /UCB/, url: "/traditions/ucb" },
  { name: /Annoyance/, url: "/traditions/annoyance" },
  // After Annoyance, so a page naming both gets the institution as its anchor.
  { name: /Mick Napier/, url: "/traditions/annoyance", surname: /Napier/ },
  // After Del Close, so a page naming him reaches the school at "Close's"
  // where it can and at "iO" otherwise; either way once.
  { name: /iO/, url: "/traditions/close" },
];

/**
 * The school a founder's biography guide hands up to — "spolin" for
 * `viola-spolin`, "close" for `del-close` — read from the same map that
 * routes the names, so the guide's header and the prose cannot disagree
 * about which school a person belongs to. Null for every other slug.
 */
export function schoolOfGuide(slug: string): string | null {
  for (const { url, school } of ENTITY_MAP) {
    if (school && url === `/${slug}`) return school.url.replace("/traditions/", "");
  }
  return null;
}

/**
 * Link the first mention of a named entity, once per page.
 *
 * Once, not every occurrence, which is where this differs from linkSources. A
 * book title appears two or three times in a page; these names appear in
 * fifteen paragraphs of an atom that is entirely about their idea, and linking
 * each one produces a page of identical anchors that reads as keyword
 * stuffing rather than as navigation.
 *
 * Two positional guards matter. The name must not already be inside a link,
 * and it must not be inside a tag at all — linkCitations and linkSources have
 * already run by this point and both write a title attribute containing the
 * target's tip, so a name occurring in one of those would otherwise be
 * rewritten in the middle of an attribute and break the markup. Headings are
 * skipped too: an anchor in an h2 is legitimate but it is not what any of
 * these pages want.
 *
 * The surname rule runs second and only where the full name left the page
 * without a link. A page that says "Keith Johnstone" once and "Johnstone"
 * 9 times is linked at the full name and nowhere else, as before; a page
 * that says only "Johnstone" — 11 guides did, and 6 said only "Spolin" — is
 * linked at the first surname that follows the first full-name mention, or
 * at the first surname at all when the page never gives the full name. The
 * same "already linked on this page" and own-page checks apply, so the rule
 * adds at most one anchor per target per page and never one to the page it
 * is on.
 *
 * The school rule runs third, for the two names whose full name goes to a
 * person rather than a school (2026-09-22, tracker entry 331). It fires only
 * on a page that names the full name, and links the first lone surname after
 * that mention to the school — so a concept that cites "Viola Spolin" and
 * then "Spolin" reaches the biography at the first and the tradition at the
 * second, once each. It does not depend on the full name having carried its
 * link: where the full name sat in a heading and the surname fallback took
 * the guide, the next surname takes the school. The once-per-target check
 * is the same one, so a page that already links the school by hand, or that
 * the `iO` entry has already served, gains nothing.
 */
function linkEntities(htmlStr: string, currentUrl: string | null): string {
  let result = htmlStr;
  for (const { name, url, surname, school } of ENTITY_MAP) {
    // The page already sends the reader there in its own words. 7 pages
    // open with a hand-written line like "For the school it founded, see the
    // Johnstone tradition", and a markdown link renders as the same bare
    // anchor this writes — so without this check the page gained a second
    // link to a page it was already linking, which is the opposite of the
    // point.
    if (url !== currentUrl && !result.includes(`href="${url}"`)) {
      result = linkFirstMention(result, name, url, 0);
      if (surname && !result.includes(`href="${url}"`)) {
        // The full name is on the page but could not be linked — in a
        // heading, or inside another link's text — or it is not on the page
        // at all. Either way the surname is the reader's route, provided it
        // comes after the full name where there is one.
        const first = new RegExp(`\\b${name.source}\\b`).exec(result);
        result = linkFirstMention(result, surname, url, first ? first.index : 0);
      }
    }

    if (!school || school.url === currentUrl || result.includes(`href="${school.url}"`)) continue;
    // Read after the full-name step so the offset is into the html the
    // school link is written into; the search starts past the full name so
    // the surname inside it is never the one taken.
    const introduced = new RegExp(`\\b${name.source}\\b`).exec(result);
    if (!introduced) continue;
    result = linkFirstMention(
      result,
      school.handle,
      school.url,
      introduced.index + introduced[0].length,
    );
  }
  return result;
}

/**
 * Wrap the first eligible occurrence of `pattern` at or after `from` in a bare
 * anchor to `url`. Eligible means page text: not inside a tag, not already the
 * text of a link, not in a heading. Returns the input unchanged when nothing
 * qualifies.
 */
function linkFirstMention(htmlStr: string, pattern: RegExp, url: string, from: number): string {
  let linked = false;
  return htmlStr.replace(new RegExp(`\\b${pattern.source}\\b`, "g"), (match, ...args) => {
    if (linked) return match;
    const offset = args[args.length - 2] as number;
    if (offset < from) return match;
    const before = htmlStr.slice(Math.max(0, offset - 300), offset);

    // Inside a tag, so this is an attribute value rather than page text.
    if (before.lastIndexOf("<") > before.lastIndexOf(">")) return match;
    // Already the text of a link.
    if (before.lastIndexOf("<a ") > before.lastIndexOf("</a>")) return match;
    // Inside a heading.
    if (/<h[1-6][^>]*>[^<]*$/.test(before)) return match;

    linked = true;
    return `<a href="${url}">${match}</a>`;
  });
}

function linkSources(htmlStr: string, currentUrl: string | null): string {
  let result = htmlStr;
  const byLength = [...SOURCE_TITLE_MAP].sort((a, b) => b[0].source.length - a[0].source.length);

  for (const [pattern, url] of byLength) {
    // A reference page cites its own work in full; without this it links to itself.
    if (url === currentUrl) continue;

    const emPattern = new RegExp(`<em>(${pattern.source}(?::[^<]*)?\\.?)</em>`, "g");
    result = result.replace(emPattern, (match, title, offset) => {
      const before = result.slice(Math.max(0, offset - 200), offset);
      // Already the text of an author-written link, either directly or further back.
      if (/<a [^>]*>$/.test(before)) return match;
      if (before.lastIndexOf("<a ") > before.lastIndexOf("</a>")) return match;

      const ref = getAtomUrlMap().get(url.replace("/library/", ""));
      const tip = ref ? ref.tip.replace(/"/g, "&quot;") : title;
      return `<a href="${url}" title="${tip}"><em>${title}</em></a>`;
    });
  }
  return result;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePhrase(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function titleCaseLike(sourceWord: string, nextWord: string): string {
  if (sourceWord === sourceWord.toUpperCase()) return nextWord.toUpperCase();
  if (sourceWord[0] === sourceWord[0]?.toUpperCase()) {
    return `${nextWord[0]?.toUpperCase() ?? ""}${nextWord.slice(1)}`;
  }
  return nextWord;
}

function pluralizeAlias(phrase: string): string | null {
  const words = phrase.split(/\s+/);
  const lastWord = words.at(-1);
  if (!lastWord) return null;

  const replacements: Record<string, string> = {
    drill: "drills",
    exercise: "exercises",
    offer: "offers",
    scene: "scenes",
  };
  const replacement = replacements[lastWord.toLowerCase()];
  if (!replacement) return null;

  words[words.length - 1] = titleCaseLike(lastWord, replacement);
  return words.join(" ");
}

function getTitlePrefix(title: string): string | null {
  const prefix = title.split(":")[0]?.trim();
  return prefix && prefix !== title ? prefix : null;
}

function shouldAutolinkPhrase(
  phrase: string,
  kind: "atom" | "bridge" | "path" | "thread",
  atomType?: AtomType,
) {
  const normalized = normalizePhrase(phrase);
  const wordCount = normalized.split(/\s+/).length;
  if (normalized.length < 6) return false;

  if (kind === "bridge" || kind === "path" || kind === "thread") {
    // The site's name is also the title of a path (and of a show), and the
    // prose uses the phrase for the framework itself — "the physics of
    // connection" on the law page and in two lessons. A path registered at
    // priority 400 captured every one of those, so the site's name linked a
    // six-lesson beginner path wherever it was written. Left as the phrase it
    // is; an author who means the path links it by hand.
    if (normalized.toLowerCase() === SITE_NAME.toLowerCase()) return false;
    return wordCount >= 2 || normalized.length >= 18;
  }

  if (wordCount >= 2) return true;
  if (GENERIC_ONE_WORD_ATOM_TITLES.has(normalized.toLowerCase())) return false;

  if (atomType === "definition") return normalized.length >= 12;
  return normalized.length >= 9;
}

function getAutolinkPhrases(
  title: string,
  kind: "atom" | "bridge" | "path" | "thread",
  atomType?: AtomType,
) {
  const variants = new Set<string>();
  const normalizedTitle = normalizePhrase(title);
  if (normalizedTitle) variants.add(normalizedTitle);

  const titlePrefix = getTitlePrefix(title);
  if (titlePrefix) variants.add(normalizePhrase(titlePrefix));

  for (const variant of [...variants]) {
    const punctuationFree = normalizePhrase(variant.replace(/,/g, ""));
    if (punctuationFree && punctuationFree !== variant) {
      variants.add(punctuationFree);
    }

    if (kind === "atom") {
      const plural = pluralizeAlias(variant);
      if (plural) variants.add(normalizePhrase(plural));
    }
  }

  return [...variants].filter((phrase) => shouldAutolinkPhrase(phrase, kind, atomType));
}

/**
 * An alias that is safe to autolink: two or more words and eight characters
 * or more, not counting a leading article.
 *
 * Forty-five atoms can never be linked from prose by title —
 * `cognitive-bandwidth` is a law nobody writes out, `heightening` is what the
 * prose calls "raising the stakes" — and `aliases`, the field for the names a
 * concept is also taught under, was read by search and schema.org and never
 * by the linker (tracker entry 103, 2026-09-20). Multi-word aliases are
 * unambiguous by length, the way multi-word titles are; single-word ones
 * ("escalation", "denial") stay hand-linked, for the reason
 * GENERIC_ONE_WORD_ATOM_TITLES exists. The collisions guard keeps an alias
 * from equalling another atom's title, so the registration cannot steal a
 * phrase from the atom it names.
 *
 * The article rule is from the first run: "The game" is an alias of
 * `game-of-the-scene`, and "the game" is how every page about Zip Zap Zop,
 * Would You Rather and Twenty-One Questions refers to its own game. It made
 * 89 of the 163 links the aliases produced, nearly all of them wrong. An
 * alias that is an article plus one word is that word, and one word is what
 * the linker already declines.
 *
 * The one-word rule was tuned on "The game" and it also declined the six
 * aliases the corpus uses most (tracker entry 266, 2026-09-22): the prose
 * said self-monitoring in 28 documents, impulse in 27, hedging in 26,
 * acceptance in 23, escalation in 20 and backline in 18, and linked none of
 * them, while 94% of the anchors into a concept were the exact title.
 * ONE_WORD_ALIAS_ALLOWLIST is the per-alias opt-in: a lowercase alias listed
 * there is registered as written, bypassing both this floor and the
 * title-length floor in shouldAutolinkPhrase, because a word is here on the
 * evidence of its occurrences and not its length. The other one-word aliases
 * stay declined: "game" is every page's own game, and "wipe", "denial",
 * "POV", "gifting" and "platform" are ordinary words more often than they
 * are the concept. "Impulse" (27 documents, `spontaneity`) was tried and
 * dropped: six of its 27 links were the ordinary word — "book a holiday on
 * impulse", "the impulse to make lists", "the impulse to retcon" — and two of
 * a five-occurrence sample were wrong, over the one-in-five bar the list is
 * held to. Every other rule still applies — one link per page, never to the
 * page itself, never inside an existing link or code span.
 */
export const ALIAS_AUTOLINK_MIN_WORDS = 2;
export const ALIAS_AUTOLINK_MIN_LENGTH = 8;
export const ONE_WORD_ALIAS_ALLOWLIST: ReadonlySet<string> = new Set([
  "acceptance",
  "backline",
  "escalation",
  "hedging",
  "self-monitoring",
]);

export function isAllowlistedOneWordAlias(alias: string): boolean {
  return ONE_WORD_ALIAS_ALLOWLIST.has(normalizePhrase(alias).toLowerCase());
}

export function isAutolinkableAlias(alias: string): boolean {
  if (isAllowlistedOneWordAlias(alias)) return true;
  const normalized = normalizePhrase(alias).replace(/^(?:a|an|the)\s+/i, "");
  return (
    normalized.length >= ALIAS_AUTOLINK_MIN_LENGTH &&
    normalized.split(/\s+/).length >= ALIAS_AUTOLINK_MIN_WORDS
  );
}

function createAutolinkMatcher(phrase: string): RegExp {
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(phrase)}(?![A-Za-z0-9])`, "gi");
}

function readFrontmatterEntries<T>(subdir: string): { frontmatter: T; slug: string }[] {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), "utf-8");
      const { data } = matter(raw);
      return {
        frontmatter: data as T,
        slug: path.basename(file, ".md"),
      };
    });
}

function getContentDocumentUrl(
  subdir: RoutableContentSubdir,
  slug: string,
  frontmatter: Record<string, unknown>,
): string | null {
  switch (subdir) {
    case "atoms":
      if (typeof frontmatter.id !== "string" || typeof frontmatter.type !== "string") return null;
      return getAtomUrl({ id: frontmatter.id, type: frontmatter.type as AtomType });
    case "bridges":
      return `/${slug}`;
    case "paths":
      return typeof frontmatter.id === "string" ? `/paths/${frontmatter.id}` : null;
    case "shows":
      return typeof frontmatter.id === "string" ? `/listen/${frontmatter.id}` : null;
    case "sources":
      return typeof frontmatter.id === "string" ? `/sources/${frontmatter.id}` : null;
    case "threads":
      return typeof frontmatter.id === "string" ? `/threads/${frontmatter.id}` : null;
    default:
      return null;
  }
}

function getBridgeSlugSet(): Set<string> {
  if (_bridgeSlugSet) return _bridgeSlugSet;
  _bridgeSlugSet = new Set(
    readFrontmatterEntries<BridgeFrontmatter>("bridges").map((bridge) => bridge.slug),
  );
  return _bridgeSlugSet;
}

function getContentLinkTargets(): ContentLinkTarget[] {
  if (_contentLinkTargets) return _contentLinkTargets;

  const targets = new Map<
    string,
    { phrase: string; priority: number; title: string; url: string }
  >();
  const addTarget = (phrase: string, url: string, title: string, priority: number) => {
    const key = phrase.toLowerCase();
    const existing = targets.get(key);
    if (!existing || priority > existing.priority) {
      targets.set(key, { phrase, priority, title, url });
    }
  };

  for (const atom of readFrontmatterEntries<AtomFrontmatter>("atoms")) {
    const url = getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type });
    const phrases = new Set(
      getAutolinkPhrases(atom.frontmatter.title, "atom", atom.frontmatter.type),
    );
    for (const alias of atom.frontmatter.aliases ?? []) {
      if (!isAutolinkableAlias(alias)) continue;
      // An allowlisted one-word alias is registered as written: the length
      // floors in shouldAutolinkPhrase would decline "hedging" and "impulse".
      if (isAllowlistedOneWordAlias(alias)) {
        phrases.add(normalizePhrase(alias));
        continue;
      }
      for (const p of getAutolinkPhrases(alias, "atom", atom.frontmatter.type)) phrases.add(p);
    }
    for (const phrase of phrases) {
      addTarget(phrase, url, atom.frontmatter.title, 200);
    }
  }

  for (const thread of readFrontmatterEntries<ThreadFrontmatter>("threads")) {
    const url = `/threads/${thread.frontmatter.id}`;
    const phrases = getAutolinkPhrases(thread.frontmatter.title, "thread");
    for (const phrase of phrases) {
      addTarget(phrase, url, thread.frontmatter.title, 300);
    }
  }

  for (const pathEntry of readFrontmatterEntries<PathFrontmatter>("paths")) {
    const url = `/paths/${pathEntry.frontmatter.id}`;
    const phrases = getAutolinkPhrases(pathEntry.frontmatter.title, "path");
    for (const phrase of phrases) {
      addTarget(phrase, url, pathEntry.frontmatter.title, 400);
    }
  }

  // Guides were never registered, so the flow ran one way: the guides poured
  // 327 in-body links into the concept pages and the concept pages sent back
  // none. Most guides had zero in-body inbound links and the best had four,
  // while 151 concept pages — the site's best-ranking cluster — had no path to
  // the pages that target real search volume.
  //
  // Priority 100 keeps them below atoms: inside a concept page "status" should
  // still resolve to the status atom, not to a guide that happens to mention it.
  for (const bridge of readFrontmatterEntries<BridgeFrontmatter>("bridges")) {
    const url = `/${bridge.slug}`;
    const phrases = new Set<string>();
    // The term the guide is written to answer is also what prose calls it.
    const primary = bridge.frontmatter.target_keywords?.[0]?.keyword;
    if (primary) for (const p of getAutolinkPhrases(primary, "bridge")) phrases.add(p);
    for (const p of getAutolinkPhrases(bridge.frontmatter.title, "bridge")) phrases.add(p);
    for (const phrase of phrases) {
      addTarget(phrase, url, bridge.frontmatter.title, 100);
    }
  }

  _contentLinkTargets = [...targets.values()]
    .map((target) => ({
      ...target,
      matcher: createAutolinkMatcher(target.phrase),
    }))
    .sort(
      (a, b) =>
        b.phrase.length - a.phrase.length ||
        b.priority - a.priority ||
        a.phrase.localeCompare(b.phrase),
    );

  return _contentLinkTargets;
}

/**
 * The declared entry atoms a guide may link by title even where the
 * corpus-wide rule declines the phrase.
 *
 * Weighted by the demand the guides declare, ten atoms are the graph's front
 * doors, and six of them — Offers, Trust, Blocking, Vulnerability, Commitment,
 * Status — have one-word titles shouldAutolinkPhrase declines: under nine
 * letters, or in GENERIC_ONE_WORD_ATOM_TITLES because "status" on an
 * arbitrary page is as often the ordinary word (tracker entry 282,
 * 2026-09-22). So the highest-demand guides named their own entrances in
 * prose without a link, and a reader on conversation-starters met "offers"
 * unlinked in the sentence and the atom in the concept block below.
 *
 * The declaration is the disambiguation the generic rule lacks: a guide that
 * lists `trust` in `entry_atoms` is a page about trust the concept, so on
 * that page, and only there, the title links. The targets are built per
 * document and handed to the same matcher the registry feeds, so every other
 * rule holds — once per page, never to the page itself, never inside a
 * heading, code span or existing link. A hand-written link takes the slot
 * first through the remark pass's ledger, and a backticked id takes it here:
 * linkAtomRefs runs after the phrase linker and cannot be seen by it, so an
 * atom the body already backticks is not registered, or the page would link
 * it twice (35 of the first 97 candidates did). Atoms and lessons get
 * nothing from this: a lesson's `atoms` is a composition, not a subject. A
 * title the registry already links is left to the registry, whichever atom
 * it resolves to.
 *
 * The titles this admits double as verbs — somebody *offers* two options,
 * you *trust* the process — and on the first reading 3 of the 9 links to
 * Offers were the verb. A verb takes an object and a noun mention does not,
 * so a match followed by a determiner, quantifier or object pronoun is
 * declined and the linker moves to the page's next mention. Read again after
 * the guard: every landed link to offers, trust and status was the concept.
 */
const VERB_OBJECT_LOOKAHEAD =
  "(?!\\s+(?:a|an|the|this|that|these|those|some|any|no|one|two|three|four|five|" +
  "something|anything|nothing|everything|someone|anyone|nobody|everybody|" +
  "you|us|them|it|me|him|her|your|their|his|its|my|our|more|less|another|" +
  "each|every|several|both|little|much|enough|what|whatever)\\b)";

function createDeclaredTitleMatcher(phrase: string): RegExp {
  return new RegExp(
    `(?<![A-Za-z0-9])${escapeRegExp(phrase)}(?![A-Za-z0-9])${VERB_OBJECT_LOOKAHEAD}`,
    "gi",
  );
}

export function getDeclaredEntryAtomTargets(
  entryAtoms: readonly string[],
  markdown = "",
): ContentLinkTarget[] {
  if (entryAtoms.length === 0) return [];
  const registered = new Set(getContentLinkTargets().map((t) => t.phrase.toLowerCase()));
  const backticked = new Set([...markdown.matchAll(/`([a-z][a-z0-9-]*)`/g)].map((m) => m[1]));
  const urlMap = getAtomUrlMap();
  const extra: ContentLinkTarget[] = [];
  for (const id of entryAtoms) {
    if (backticked.has(id)) continue;
    const atom = urlMap.get(id);
    if (!atom) continue;
    const phrase = normalizePhrase(atom.title);
    if (!phrase || registered.has(phrase.toLowerCase())) continue;
    extra.push({
      matcher: createDeclaredTitleMatcher(phrase),
      phrase,
      priority: 200,
      title: atom.title,
      url: atom.url,
    });
  }
  return extra;
}

function splitHrefSuffix(href: string): { pathname: string; suffix: string } {
  const match = href.match(/^([^?#]+)([?#].*)?$/);
  return {
    pathname: match?.[1] ?? href,
    suffix: match?.[2] ?? "",
  };
}

function rewriteLegacyInternalHref(href: string): string {
  if (!href.startsWith("/")) return href;

  const { pathname, suffix } = splitHrefSuffix(href);
  const directHubMatch = LEGACY_HUB_ROUTE_MAP[pathname];
  if (directHubMatch) return `${directHubMatch}${suffix}`;

  if (pathname.startsWith("/atoms/")) {
    const atomId = pathname.replace(/^\/atoms\//, "");
    const atom = getAtomUrlMap().get(atomId);
    return atom ? `${atom.url}${suffix}` : href;
  }

  if (pathname.startsWith("/guides/")) {
    const bridgeSlug = pathname.replace(/^\/guides\//, "");
    return getBridgeSlugSet().has(bridgeSlug) ? `/${bridgeSlug}${suffix}` : href;
  }

  return href;
}

/**
 * Legacy hrefs only. This used to end with one more rule: a literal rewrite
 * of `<a href="/">The Physics of Connection</a>` — the byline forty guides
 * carry, written to credit the site by linking its homepage — into a link to
 * the beginner path of the same name. Every in-body link from content to `/`
 * went through that rule and none survived the build. The byline now links
 * what its author wrote.
 */
function rewriteLegacyInternalLinks(htmlStr: string): string {
  return htmlStr.replace(/href="([^"]+)"/g, (match, href) => {
    const rewrittenHref = rewriteLegacyInternalHref(href);
    return rewrittenHref === href ? match : `href="${rewrittenHref}"`;
  });
}

/**
 * Give an inline counter-position its own paragraph.
 *
 * The 2026-08-22 heading conversion turned every paragraph-leading bold label
 * in the atoms into a `##` heading, and left the one label that was never at
 * the head of a paragraph where it was: `**Counter-position:**` sits
 * mid-paragraph inside the sourcing text on a hundred-odd atoms, so the
 * site's most-extracted block (the traditions page reads it, the disputes
 * page reads it) has no structural position on the page it lives on. The
 * markdown is left alone — extractCounterPositions reads it as written — and
 * the rendered paragraph is split at the label instead.
 *
 * The lookbehind requires text before the label, so a counter-position that
 * already opens its paragraph is not given an empty one.
 */
function breakCounterPositions(htmlStr: string): string {
  return htmlStr.replace(
    /(?<=[^\s>]|<\/\w+>)\s+(<strong>Counter-(?:position|argument)s?[^<]*:<\/strong>)/g,
    "</p>\n<p>$1",
  );
}

function collectExistingLinkUrls(node: MarkdownNode, urls: Set<string>) {
  if (node.type === "link" && typeof node.url === "string") {
    urls.add(rewriteLegacyInternalHref(node.url));
  }

  for (const child of node.children ?? []) {
    collectExistingLinkUrls(child, urls);
  }
}

function autolinkTextNode(
  value: string,
  currentUrl: string | null,
  linkedUrls: Set<string>,
  extraTargets: readonly ContentLinkTarget[] = [],
): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  // The page's own targets (getDeclaredEntryAtomTargets) join the registry
  // for this document only; their phrases are by construction not in it.
  const targets =
    extraTargets.length > 0
      ? [...extraTargets, ...getContentLinkTargets()]
      : getContentLinkTargets();
  let cursor = 0;

  while (cursor < value.length) {
    let bestMatch: {
      end: number;
      start: number;
      target: ContentLinkTarget;
      text: string;
    } | null = null;

    for (const target of targets) {
      if (target.url === currentUrl || linkedUrls.has(target.url)) continue;

      target.matcher.lastIndex = cursor;
      const match = target.matcher.exec(value);
      if (!match) continue;

      const start = match.index;
      const text = match[0];
      const end = start + text.length;

      if (
        !bestMatch ||
        start < bestMatch.start ||
        (start === bestMatch.start &&
          (text.length > bestMatch.text.length ||
            (text.length === bestMatch.text.length && target.priority > bestMatch.target.priority)))
      ) {
        bestMatch = { end, start, target, text };
      }
    }

    if (!bestMatch) {
      if (cursor < value.length) {
        nodes.push({ type: "text", value: value.slice(cursor) });
      }
      break;
    }

    if (bestMatch.start > cursor) {
      nodes.push({ type: "text", value: value.slice(cursor, bestMatch.start) });
    }

    nodes.push({
      children: [{ type: "text", value: bestMatch.text }],
      title: bestMatch.target.title,
      type: "link",
      url: bestMatch.target.url,
    });
    linkedUrls.add(bestMatch.target.url);
    cursor = bestMatch.end;
  }

  return nodes.length > 0 ? nodes : [{ type: "text", value }];
}

function interlinkContentTree(
  node: MarkdownNode,
  currentUrl: string | null,
  linkedUrls: Set<string>,
  extraTargets: readonly ContentLinkTarget[] = [],
) {
  if (!node.children || AUTOLINK_BLOCKED_NODE_TYPES.has(node.type)) return;

  const nextChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      nextChildren.push(...autolinkTextNode(child.value, currentUrl, linkedUrls, extraTargets));
      continue;
    }

    interlinkContentTree(child, currentUrl, linkedUrls, extraTargets);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

/**
 * Slug ids on rendered headings.
 *
 * Sections nobody can link to are sections Google cannot cite. With ids, a
 * heading becomes an anchor a passage result can point at, and the in-page
 * structure is addressable from anywhere else on the site.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function headingText(node: MarkdownNode): string {
  if (typeof node.value === "string") return node.value;
  return (node.children ?? []).map(headingText).join("");
}

function remarkHeadingIds() {
  return (tree: MarkdownNode) => {
    const used = new Map<string, number>();

    const walk = (node: MarkdownNode) => {
      if (node.type === "heading") {
        const base = slugifyHeading(headingText(node));
        if (base) {
          const seen = used.get(base) ?? 0;
          used.set(base, seen + 1);
          const id = seen === 0 ? base : `${base}-${seen + 1}`;
          node.data = { ...(node.data ?? {}), hProperties: { id } };
        }
      }
      for (const child of node.children ?? []) walk(child);
    };

    walk(tree);
  };
}

function remarkInterlinkDocuments(options: {
  currentUrl: string | null;
  extraTargets?: readonly ContentLinkTarget[];
}) {
  return (tree: MarkdownNode) => {
    const linkedUrls = new Set<string>();
    if (options.currentUrl) linkedUrls.add(options.currentUrl);

    collectExistingLinkUrls(tree, linkedUrls);
    interlinkContentTree(tree, options.currentUrl, linkedUrls, options.extraTargets ?? []);
  };
}

// ─── File loading ────────────────────────────────────────────────────────────

interface ContentFile<T> {
  frontmatter: T;
  content: string; // raw markdown
  html: string; // rendered HTML
  slug: string; // filename without extension
  /**
   * The day the site first had this page, `YYYY-MM-DD`: the first commit
   * that added the file, or `created` where the file predates the repository
   * (see first-published.ts). What a concept page's `datePublished` and the
   * rank's age divisor read; `created` itself is a batch stamp (novel-insights
   * 321). Undefined only for a file with neither, which no schema allows.
   */
  firstPublished: string | undefined;
}

async function loadFiles<T>(subdir: string): Promise<ContentFile<T>[]> {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  // glob returns matches in whatever order the filesystem yields them —
  // reverse-alphabetical on the production build, alphabetical on Windows —
  // and every downstream "first" (the lessons index's load order, a thread's
  // place among those composing an atom before they are ranked) inherited
  // it. Sorted, so the same content builds the same site everywhere.
  const files = (await glob("*.md", { cwd: dir })).sort((a, b) => a.localeCompare(b));
  const results: ContentFile<T>[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    const slug = path.basename(file, ".md");
    const currentUrl = getContentDocumentUrl(
      subdir as RoutableContentSubdir,
      slug,
      data as Record<string, unknown>,
    );
    // Guides only: a declared entry atom links by title on the guide that
    // declares it (getDeclaredEntryAtomTargets).
    const extraTargets =
      subdir === "bridges"
        ? getDeclaredEntryAtomTargets((data as BridgeFrontmatter).entry_atoms ?? [], content)
        : [];
    const rendered = await remark()
      .use(remarkGfm)
      .use(remarkInterlinkDocuments, { currentUrl, extraTargets })
      .use(remarkHeadingIds)
      .use(html)
      .process(content);

    results.push({
      frontmatter: data as T,
      content,
      // inlineDiagrams runs outermost: the autolinkers rewrite bare text, and
      // would otherwise reach inside a diagram's <text> elements.
      // linkHeadingAtoms runs after every body linker and the legacy
      // rewrite, because its "already linked" check reads the final hrefs.
      html: inlineDiagrams(
        linkHeadingAtoms(
          normaliseGeneratedIds(
            rewriteLegacyInternalLinks(
              linkEntities(
                linkAtomRefs(
                  linkCitations(
                    linkSources(breakCounterPositions(rendered.toString()), currentUrl),
                    currentUrl,
                  ),
                ),
                currentUrl,
              ),
            ),
          ),
          currentUrl,
        ),
      ),
      slug,
      firstPublished: firstPublishedDate(
        contentPath(subdir, slug),
        (data as { created?: string }).created,
      ),
    });
  }

  return results;
}

// ─── Cached loaders (prevent re-reading 155+ files per page during SSG) ─────

const _cache = new Map<string, Promise<ContentFile<unknown>[]>>();

function cachedLoad<T>(subdir: string): Promise<ContentFile<T>[]> {
  if (!_cache.has(subdir)) {
    _cache.set(subdir, loadFiles<T>(subdir));
  }
  return _cache.get(subdir) as Promise<ContentFile<T>[]>;
}

export function loadSources() {
  return cachedLoad<SourceFrontmatter>("sources");
}

/**
 * Atom slug → URL map, built from filesystem frontmatter (no HTML rendering).
 * Used to resolve `<code>atom-id</code>` references into links.
 */
let _atomUrlMap: Map<string, { title: string; url: string; tip: string }> | null = null;

function getAtomUrlMap(): Map<string, { title: string; url: string; tip: string }> {
  if (_atomUrlMap) return _atomUrlMap;
  _atomUrlMap = new Map();
  const dir = path.join(CONTENT_DIR, "atoms");
  if (!fs.existsSync(dir)) return _atomUrlMap;
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    const raw = fs.readFileSync(path.join(dir, file), "utf-8");
    const { data, content } = matter(raw);
    const fm = data as AtomFrontmatter;
    if (fm.id && fm.type) {
      // Extract first sentence for tooltip (strip markdown formatting)
      const firstSentence =
        content
          .replace(/^\s*\*\*(?:[^*]|\*(?!\*))+\*\*:?\s*/m, "") // strip leading bold label
          .replace(/\*\*([^*]+)\*\*/g, "$1") // strip bold
          .replace(/\*([^*]+)\*/g, "$1") // strip italic
          .replace(/`([^`]+)`/g, "$1") // strip code
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // strip links
          .trim()
          // The lookbehind keeps initials ("Charles J. Limb") from ending the
          // sentence. A real terminator like "USA." still splits, because the
          // capital there is not at a word boundary.
          .split(/(?<!\b[A-Z]\.)(?<=[.!?])\s/)[0] // first sentence
          ?.substring(0, 120) || fm.title;
      _atomUrlMap.set(fm.id, {
        title: fm.title,
        url: getAtomUrl({ id: fm.id, type: fm.type }),
        tip: firstSentence,
      });
    }
  }
  return _atomUrlMap;
}

/**
 * Replace <code>atom-id</code> references in HTML with links to the atom page.
 * Only matches IDs that exist in the atom index.
 */
function linkAtomRefs(htmlStr: string): string {
  const urlMap = getAtomUrlMap();
  return htmlStr.replace(/<code>([a-z][a-z0-9-]*)<\/code>/g, (match, id) => {
    const atom = urlMap.get(id);
    if (!atom) return match;
    const tip = atom.tip.replace(/"/g, "&quot;");
    return `<a href="${atom.url}" title="${tip}">${atom.title}</a>`;
  });
}

/**
 * A small "About <title>" line under a heading whose text is an atom's title.
 *
 * Headings are the one place the body autolinker never looks
 * (AUTOLINK_BLOCKED_NODE_TYPES lists `heading`, and rightly: an H2 that is a
 * link is wrong). The cost lands on the exercise template. Twenty-four
 * exercises carry a `## Side-coaching` section and four of them linked the
 * `side-coaching` atom, so the places the corpus most often names the
 * technique were the places the reader could not reach it (tracker entry
 * 158, 2026-09-21). Title equality is what makes an exception to the heading
 * block safe: a section called exactly what an atom is called is about that
 * atom, where a section merely containing the phrase may not be.
 *
 * The heading itself is left alone; the line is a paragraph inserted after
 * it, so the heading's id, the contents list and the footer split all read
 * the page as before. Three refusals carry over from the body linker: not on
 * the atom's own page, not when the body already links the atom (a
 * hand-written or backticked link is the same anchor this would add), and
 * not for the one-word titles GENERIC_ONE_WORD_ATOM_TITLES declines. A title
 * two atoms share ("Organic Opening", a technique and an exercise) is
 * ambiguous and gets nothing.
 */
const HEADING_ABOUT_LINK_CLASS = "text-foreground/60 text-sm";

let _atomsByTitle: Map<string, { id: string; title: string; tip: string; url: string }[]> | null =
  null;

function getAtomsByTitle() {
  if (_atomsByTitle) return _atomsByTitle;
  _atomsByTitle = new Map();
  for (const [id, atom] of getAtomUrlMap()) {
    const key = normalizePhrase(atom.title).toLowerCase();
    if (!key) continue;
    const entries = _atomsByTitle.get(key) ?? [];
    entries.push({ id, ...atom });
    _atomsByTitle.set(key, entries);
  }
  return _atomsByTitle;
}

function decodeHeadingText(markup: string): string {
  return normalizePhrase(
    markup
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16))),
  );
}

export function headingAtomLink(headingText: string): { id: string; url: string } | null {
  const key = normalizePhrase(headingText).toLowerCase();
  if (!key || GENERIC_ONE_WORD_ATOM_TITLES.has(key)) return null;
  const entries = getAtomsByTitle().get(key);
  if (!entries || entries.length !== 1) return null;
  return { id: entries[0].id, url: entries[0].url };
}

export function linkHeadingAtoms(htmlStr: string, currentUrl: string | null): string {
  const linkedUrls = new Set<string>();
  for (const match of htmlStr.matchAll(/href="([^"]+)"/g)) linkedUrls.add(match[1]);

  return htmlStr.replace(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/g, (heading, _level, inner) => {
    const key = decodeHeadingText(inner).toLowerCase();
    if (!key || GENERIC_ONE_WORD_ATOM_TITLES.has(key)) return heading;
    const entries = getAtomsByTitle().get(key);
    if (!entries || entries.length !== 1) return heading;

    const atom = entries[0];
    if (atom.url === currentUrl || linkedUrls.has(atom.url)) return heading;
    linkedUrls.add(atom.url);

    const tip = atom.tip.replace(/"/g, "&quot;");
    return (
      `${heading}\n<p class="${HEADING_ABOUT_LINK_CLASS}">` +
      `<a href="${atom.url}" title="${tip}">About ${atom.title} →</a></p>`
    );
  });
}

export function loadAtoms() {
  return cachedLoad<AtomFrontmatter>("atoms");
}

export function loadThreads() {
  return cachedLoad<ThreadFrontmatter>("threads");
}

export function loadPaths() {
  return cachedLoad<PathFrontmatter>("paths");
}

export async function getAtomBySlug(slug: string) {
  const atoms = await loadAtoms();
  return atoms.find((a) => a.frontmatter.id === slug);
}

export async function getThreadBySlug(slug: string) {
  const threads = await loadThreads();
  return threads.find((t) => t.frontmatter.id === slug);
}

export async function getPathBySlug(slug: string) {
  const paths = await loadPaths();
  return paths.find((p) => p.frontmatter.id === slug);
}

export async function getSourceBySlug(slug: string) {
  const sources = await loadSources();
  return sources.find((s) => s.frontmatter.id === slug);
}

/**
 * Display title for an atom, qualified by type when another atom shares it.
 *
 * Two atoms were both titled "Organic Opening" — one a technique, one an
 * exercise — so their pages carried identical titles and competed with each
 * other for the same query. Qualifying only on collision leaves every
 * unambiguous title alone.
 */
const ATOM_TYPE_QUALIFIER: Record<string, string> = {
  exercise: "Exercise",
  technique: "Technique",
  pedagogy: "Teaching Method",
  format: "Format",
  definition: "Definition",
  principle: "Principle",
  law: "Law",
  antipattern: "Failure Mode",
  pattern: "Pattern",
  framework: "Framework",
  insight: "Insight",
  reference: "Reference",
};

export async function getAtomDisplayTitle(atom: {
  frontmatter: { id: string; title: string; type: string };
}): Promise<string> {
  const atoms = await loadAtoms();
  const shared = atoms.filter(
    (a) =>
      a.frontmatter.title === atom.frontmatter.title && a.frontmatter.id !== atom.frontmatter.id,
  );
  if (shared.length === 0) return atom.frontmatter.title;

  const qualifier = ATOM_TYPE_QUALIFIER[atom.frontmatter.type];
  return qualifier ? `${atom.frontmatter.title} (${qualifier})` : atom.frontmatter.title;
}

// ─── Bridges ────────────────────────────────────────────────────────────────

export function loadBridges() {
  return cachedLoad<BridgeFrontmatter>("bridges");
}

export async function getBridgeBySlug(slug: string) {
  const bridges = await loadBridges();
  return bridges.find((b) => b.slug === slug);
}

// ─── Shows (podcast) ────────────────────────────────────────────────────────

export async function loadShows() {
  return cachedLoad<ShowFrontmatter>("shows");
}

export async function getShowBySlug(slug: string) {
  const shows = await loadShows();
  return shows.find((s) => s.frontmatter.id === slug);
}

export interface Episode {
  title: string;
  href: string;
  audioUrl: string;
  description?: string;
  duration?: string; // formatted, e.g. "4:32"
  /**
   * ISO timestamp the feed uses as pubDate.
   *
   * Derived from the episode's position in the show, not from the page's
   * dates — see `episodePublishedAt`. It was `created` once (never `updated`:
   * an episode's date must not move because the page was edited, and reading
   * `updated` had collapsed every episode onto one pubDate), but `created` is
   * the day a file was written, and the atoms were written in four April
   * batches while their episodes are numbered in teaching order. Sixty-two
   * Improv Lab episodes shared one date and 55 of 172 adjacent pairs had the
   * later number on the earlier date, so a client sorting by date played the
   * show in file-creation order while its own episode numbers said otherwise
   * (tracker entry 236).
   */
  published?: string;
}

/**
 * Hours between consecutive episodes of a show, for the derived pubDate.
 *
 * Half a day rather than a day: the Improv Lab runs to 173 episodes, and a
 * day apiece from the show's anchor would carry it five days past the day
 * this was written (2026-09-21), and a feed must not date an episode in the
 * future — some clients hide it, directories list it as unreleased. Capping
 * at "now" would pin the tail to the build date instead, which is the churn
 * the old `new Date()` pubDate had. Two a day keeps every show inside its
 * runway with room to grow, and the podcast-dates test fails if one outruns it.
 */
const EPISODE_SPACING_HOURS = 12;

/**
 * When episode `index` (0-based across the whole show) is published.
 *
 * A fixed anchor plus a fixed step, so the date is a function of the show's
 * `created` and the episode's position and nothing else: the same on every
 * build, strictly increasing in the order the season page numbers them, and
 * never earlier than the show it belongs to. A client that sorts by date and
 * one that sorts by `itunes:episode` now play the same order.
 *
 * Deliberately not the atom's first-published date (first-published.ts),
 * which entry 321 moved `datePublished` and the rank's age divisor onto: an
 * episode's pubDate here is a spacing, not a claim about when the concept
 * was published, and a real date per episode would put the numbers and the
 * dates back in disagreement.
 */
function episodePublishedAt(showCreated: string, index: number): string {
  const anchor = new Date(showCreated);
  return new Date(anchor.getTime() + index * EPISODE_SPACING_HOURS * 3_600_000).toISOString();
}

/**
 * The order an atom season plays its episodes in.
 *
 * Seasons emitted atoms in load order, which was authoring order on one
 * machine and reverse-alphabetical on production until the loader sorted by
 * filename, after which the Improv Lab's "Principles" season opened on be-brave
 * (b-r before b-p) while the hub said be-present was the precondition and the
 * pager started somewhere else again — three orders for nine atoms, none of
 * them chosen for the podcast (tracker entry 207). Principles are the one
 * type the site claims a sequence for, so a season of them plays the
 * dependency order the hub teaches; every other type was alphabetical by
 * title, which is what "one concept, try it tonight" wants from a list — but
 * not what "play in order" promises: 42 of the season-internal `requires`
 * edges pointed at a later episode of the same season, the Techniques
 * season playing *accepting the offer* before *active listening* it rests on
 * (tracker entry 303). Each season is now `dependencyOrder`: a topological
 * pass over its own `requires` edges with the old order as the tiebreak, so
 * a prerequisite plays just before the first episode that needs it and
 * nothing else moves. A season of references — Deep Cuts' library — has no
 * `requires` edges to order by and plays the most-cited work first instead.
 * The feed inherits this — it emits seasons in order and never re-sorts on
 * `published`, which is derived from this order rather than from `created`,
 * one date for every principle that would have been no order at all
 * (tracker entry 236).
 */
function sortSeasonAtoms<
  T extends {
    frontmatter: { id: string; title: string; type: string; links?: AtomFrontmatter["links"] };
  },
>(members: T[], atoms: readonly T[]): T[] {
  if (members.length > 0 && members.every((a) => a.frontmatter.type === "reference")) {
    return libraryPlayOrder(members, atoms);
  }
  return dependencyOrder(members);
}

/** Resolve all episodes for a show season filter */
export async function getEpisodesForShow(
  showId: string,
): Promise<{ label: string; episodes: Episode[] }[]> {
  const show = await getShowBySlug(showId);
  if (!show) return [];

  const [bridges, atoms, threads, paths] = await Promise.all([
    loadBridges(),
    loadAtoms(),
    loadThreads(),
    loadPaths(),
  ]);

  const seasons: { label: string; episodes: Episode[] }[] = [];

  for (const season of show.frontmatter.seasons) {
    const eps: Episode[] = [];
    const filter = season.filter;

    if (filter.content_type === "bridge") {
      for (const b of bridges) {
        const audio = getAudioUrl("bridges", b.slug);
        if (audio) {
          eps.push({
            title: b.frontmatter.title,
            href: `/${b.slug}`,
            audioUrl: audio,
            description: b.frontmatter.description,
            duration: getAudioDuration(audio),
          });
        }
      }
    } else if (filter.content_type === "atom" && filter.atom_types) {
      const types = filter.atom_types;
      const members = sortSeasonAtoms(
        atoms.filter((a) => types.includes(a.frontmatter.type)),
        atoms,
      );
      for (const a of members) {
        const audio = getAudioUrl("atoms", a.frontmatter.id);
        if (audio) {
          eps.push({
            title: a.frontmatter.title,
            href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
            audioUrl: audio,
            duration: getAudioDuration(audio),
          });
        }
      }
    } else if (filter.content_type === "thread") {
      // The order the paths teach the lessons — home path's place on the
      // progression, then position in that path — the same key the lessons
      // index, the breadcrumb and the atom page's context line read. The
      // loop walked `threads` as loaded, filename order, so the season opened
      // on *The Anatomy of a Scene* (a lesson on no path) and 11 of the 28
      // consecutive path steps played in reverse (tracker entry 304).
      const lessons = await orderByKey(threads, getThreadOrderKey, compareThreadOrderKeys);
      for (const t of lessons) {
        const audio = getAudioUrl("threads", t.frontmatter.id);
        if (audio) {
          eps.push({
            title: t.frontmatter.title,
            href: `/threads/${t.frontmatter.id}`,
            audioUrl: audio,
            duration: getAudioDuration(audio),
          });
        }
      }
    } else if (filter.content_type === "path") {
      // The progression's own order: Foundations first, then the ladder, the
      // two ends broken on audience. Filename order had opened the season on
      // *Advanced Game and Character* (tracker entry 304).
      for (const p of pathPlayOrder(paths, getPathProgressionRank)) {
        const audio = getAudioUrl("paths", p.frontmatter.id);
        if (audio) {
          eps.push({
            title: p.frontmatter.title,
            href: `/paths/${p.frontmatter.id}`,
            audioUrl: audio,
            duration: getAudioDuration(audio),
          });
        }
      }
    }

    seasons.push({ label: season.label, episodes: eps });
  }

  // Date each episode by its position across the show — the same position
  // the feed emits as `itunes:episode` — so the two orders agree.
  let index = 0;
  for (const season of seasons) {
    for (const ep of season.episodes) {
      ep.published = episodePublishedAt(show.frontmatter.created, index++);
    }
  }

  return seasons;
}

// ─── Traditions ─────────────────────────────────────────────────────────────

/** Map tradition names to their reference atom IDs */
const TRADITION_REFS: Record<string, string[]> = {
  johnstone: ["ref-impro-johnstone", "ref-impro-storytellers-johnstone"],
  spolin: ["ref-spolin-improvisation-for-theater"],
  close: ["ref-truth-in-comedy"],
  ucb: ["ref-ucb-manual", "ref-hines-substack", "ref-hines-greatest-improviser"],
  annoyance: ["ref-napier-improvise", "ref-tj-dave-speed-of-life"],
};

/** Get all non-reference atoms that link to a tradition's reference atoms */
export async function getAtomsForTradition(tradition: string) {
  const refIds = TRADITION_REFS[tradition];
  if (!refIds) return [];
  const atoms = await loadAtoms();
  return atoms.filter(
    (a) =>
      a.frontmatter.type !== "reference" &&
      a.frontmatter.links?.some((link) => refIds.includes(link.id)),
  );
}

export function getTraditionNames(): string[] {
  return Object.keys(TRADITION_REFS);
}

/** Strip the emphasis markers a counter-position's markdown carries. */
function plainCounterPositionText(text: string): string {
  return text
    .trim()
    .replace(/\*\*/g, "")
    .replace(/\*([^*]+)\*/g, "$1");
}

/**
 * Extract counter-position text from an atom's raw markdown.
 *
 * Two forms. The inline label — `**Counter-position:**`,
 * `**Counter-position (Napier):**`, `**Counter-argument:**` — runs to the
 * end of its paragraph. The heading form — `## Counter-position`,
 * `## Counter-position (Napier)`, `## The counter-argument` — takes every
 * paragraph under the heading up to the next heading. The extractor read
 * only the first for a long while, so twelve heading-form counter-positions,
 * `yes-and`'s among them, never reached the traditions and disputes pages.
 * The parenthesised part of either label is the tradition, as written.
 */
export function extractCounterPositions(content: string): { text: string; tradition?: string }[] {
  const results: { text: string; tradition?: string }[] = [];
  const inline =
    /\*\*Counter-(?:position|argument)(?:\s*\(([^)]+)\))?:\*\*\s*([\s\S]+?)(?=\n\n|\n\*\*[A-Z]|$)/g;
  let match;
  while ((match = inline.exec(content)) !== null) {
    results.push({
      tradition: match[1]?.trim(),
      text: plainCounterPositionText(match[2]),
    });
  }

  const heading =
    /^#{2,6}[ \t]+(?:the[ \t]+)?(?:[\w-]+[ \t]+)?counter-(?:position|argument)s?(?:[ \t]*\(([^)]+)\))?[ \t\r]*$/gim;
  while ((match = heading.exec(content)) !== null) {
    const body = content.slice(match.index + match[0].length);
    const end = body.search(/\n#{1,6}[ \t]/);
    const text = plainCounterPositionText(end === -1 ? body : body.slice(0, end)).replace(
      /\s*\n\s*\n\s*/g,
      " ",
    );
    if (text) results.push({ tradition: match[1]?.trim(), text });
  }
  return results;
}

// ─── URL resolution ─────────────────────────────────────────────────────────

/** Resolve an atom to its canonical URL based on type */
export function getAtomUrl(atom: { id: string; type: AtomType }): string {
  switch (atom.type) {
    case "law":
    case "insight":
      return `/how-it-works/${atom.id}`;
    case "principle":
      return `/how-it-works/principles/${atom.id}`;
    case "antipattern":
    case "pattern":
    case "framework":
      return `/how-it-works/diagnosis/${atom.id}`;
    case "exercise":
      return `/practice/exercises/${atom.id}`;
    case "technique":
    case "pedagogy":
      return `/practice/techniques/${atom.id}`;
    case "format":
      return `/practice/formats/${atom.id}`;
    case "definition":
      return `/practice/vocabulary/${atom.id}`;
    case "reference":
      return `/library/${librarySlug(atom.id)}`;
    default:
      return `/system/${atom.id}`;
  }
}

/** Resolve an atom ID to its URL (loads atom to determine type) */
export async function getAtomUrlById(id: string): Promise<string> {
  const atom = await getAtomBySlug(id);
  if (!atom) return `/system/${id}`;
  return getAtomUrl({ id, type: atom.frontmatter.type });
}

/** Generate redirect entries for all atoms: old /atoms/{id} → new URL */
export async function getAtomRedirects(): Promise<
  { source: string; destination: string; permanent: boolean }[]
> {
  const atoms = await loadAtoms();
  return atoms.map((a) => ({
    source: `/atoms/${a.frontmatter.id}`,
    destination: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
    permanent: true,
  }));
}

// ─── Reverse lookups ────────────────────────────────────────────────────────

/** A thread's home path: the one its breadcrumb, the lessons index, the
 *  concept pages' context line and the prev/next siblings all name.
 *
 *  When a thread appears in multiple paths, prefer the path earliest in the
 *  progression (`getPathProgressionRank`) — the one a reader following the
 *  site's own ladder meets first. Ties go to the path where the thread comes
 *  earliest in sequence, then the beginner-facing one, then title.
 *
 *  Until 2026-09-21 this was position first: lowest index in the path's
 *  `threads`, biasing toward the path where the lesson was "most
 *  foundational". Meanwhile `path-prerequisites`' "taught in <path>" labels,
 *  `guide-concepts`' lesson ranking and the audience hubs all took the path
 *  earliest in the progression, and the two rules disagreed on 5 of the 11
 *  shared lessons, so 23 concepts were labelled "taught in Improv for Life" on
 *  one page and opened a lesson whose breadcrumb, siblings and "2 of 6"
 *  counter said The Art of Ensemble (tracker entry 262). Rank first is the
 *  one rule now; position is the tie-break. `path-prerequisites` derives its
 *  label from this function so the two cannot drift apart again, and
 *  home-path.test.ts asserts it. */
export async function getParentPath(threadId: string) {
  const paths = await loadPaths();
  const candidates = paths.filter((p) => p.frontmatter.threads?.includes(threadId));
  if (candidates.length <= 1) return candidates[0] ?? null;
  const index = (p: (typeof candidates)[number]) =>
    p.frontmatter.threads?.indexOf(threadId) ?? Number.MAX_SAFE_INTEGER;
  return [...candidates].sort(
    (a, b) =>
      getPathProgressionRank(a.frontmatter.id) - getPathProgressionRank(b.frontmatter.id) ||
      index(a) - index(b) ||
      audienceRank(a.frontmatter.audience) - audienceRank(b.frontmatter.audience) ||
      a.frontmatter.title.localeCompare(b.frontmatter.title),
  )[0];
}

export interface InboundLink {
  id: string;
  title: string;
  type: AtomType;
  url: string;
  /** The relation the *linking* atom declares toward this one. */
  relation: Link["relation"];
  /** How many atoms link to the linking atom, for ranking a long group. */
  inDegree: number;
}

let _inboundLinkIndex: Map<string, InboundLink[]> | null = null;

/**
 * The atoms that declare an edge toward a given atom, with the relation they
 * declare.
 *
 * Edges live in one direction only. `commitment` is required by seventy atoms
 * and writes `enables` toward six of them; a drill declares `illustrates`
 * toward the concept it trains and the concept declares nothing back. The
 * atom page rendered `fm.links` and nothing else, so the atoms the graph
 * depends on most were, on their own pages, the least connected-looking, and
 * a concept page could not show its drills. Seventeen of the hand-written
 * links added to atom prose in August are the author supplying this reverse
 * direction by hand.
 *
 * Sorted by the linking atom's own in-degree, then title, so that when a
 * group is cut to a dozen the ones kept are the ones the rest of the graph
 * also leans on.
 */
export async function getInboundLinks(atomId: string): Promise<InboundLink[]> {
  if (!_inboundLinkIndex) {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const inDegree = new Map<string, number>();
    for (const atom of atoms) {
      for (const link of atom.frontmatter.links ?? []) {
        inDegree.set(link.id, (inDegree.get(link.id) ?? 0) + 1);
      }
    }
    const index = new Map<string, InboundLink[]>();
    for (const atom of atoms) {
      const fm = atom.frontmatter;
      const seen = new Set<string>();
      for (const link of fm.links ?? []) {
        const key = `${link.relation}:${link.id}`;
        if (!byId.has(link.id) || seen.has(key)) continue;
        seen.add(key);
        const entry: InboundLink = {
          id: fm.id,
          title: fm.title,
          type: fm.type,
          url: getAtomUrl({ id: fm.id, type: fm.type }),
          relation: link.relation,
          inDegree: inDegree.get(fm.id) ?? 0,
        };
        const list = index.get(link.id);
        if (list) list.push(entry);
        else index.set(link.id, [entry]);
      }
    }
    for (const list of index.values()) {
      list.sort((a, b) => b.inDegree - a.inDegree || a.title.localeCompare(b.title));
    }
    _inboundLinkIndex = index;
  }
  return _inboundLinkIndex.get(atomId) ?? [];
}

/** The path PROGRESSION starts from. */
const PROGRESSION_ROOT = "beginner-foundations";

/**
 * Where a path sits in the mastery sequence: 0 for the path a beginner
 * starts on, rising along PROGRESSION's chain to its ends. Read off the
 * chain as steps remaining rather than steps taken, because the chain has
 * three side entrances (improv-for-life, improv-for-teams, teaching-improv)
 * and counting from the front would rank each of those as a first step. The
 * chain has two ends since tracker entry 247 — the reference shelf on the
 * teacher's branch and The Art of Ensemble on the performer's — and both
 * rank last; callers that need them apart break the tie on audience. A path
 * off the chain ranks after every path on it.
 */
export function getPathProgressionRank(pathId: string): number {
  const stepsToEnd = (id: string): number => {
    let steps = 0;
    const seen = new Set<string>([id]);
    for (let next = getNextPath(id); next && !seen.has(next.id); next = getNextPath(next.id)) {
      seen.add(next.id);
      steps += 1;
    }
    return steps;
  };
  const longest = stepsToEnd(PROGRESSION_ROOT);
  const onChain = isOnProgression(pathId);
  return onChain ? longest - stepsToEnd(pathId) : longest + 1;
}

/**
 * The ladder /paths draws: beginner, then the plateau, then teaching, then
 * the reference shelf, then the performer paths. The same list the lessons
 * index orders its groups by.
 */
const AUDIENCE_ORDER = ["beginner", "intermediate", "teacher", "advanced", "performer"];

function audienceRank(audience: string[] | undefined): number {
  const ranks = (audience ?? []).map((a) => AUDIENCE_ORDER.indexOf(a)).filter((i) => i >= 0);
  return ranks.length ? Math.min(...ranks) : AUDIENCE_ORDER.length;
}

/**
 * Where a reader meets a thread: the sort key for one thread among several.
 *
 * `pathRank` is the progression rank of the thread's parent path — the same
 * `getParentPath` the lessons index groups by, so the atom page and the
 * index agree about which path a lesson belongs to first. A thread on no
 * path ranks past every path. `audience` orders paths that tie in the
 * progression (teaching-improv and systems-of-improv are both four steps
 * from the end; the beginner one comes first). `position` is the thread's
 * place in its parent path's sequence. Title last, so the order is stable
 * across builds.
 */
export interface ThreadOrderKey {
  pathId: string | null;
  pathRank: number;
  audience: number;
  position: number;
  title: string;
}

export async function getThreadOrderKey(thread: {
  frontmatter: ThreadFrontmatter;
}): Promise<ThreadOrderKey> {
  const id = thread.frontmatter.id;
  const parent = await getParentPath(id);
  if (!parent) {
    return {
      pathId: null,
      pathRank: Number.MAX_SAFE_INTEGER,
      audience: AUDIENCE_ORDER.length,
      position: Number.MAX_SAFE_INTEGER,
      title: thread.frontmatter.title,
    };
  }
  return {
    pathId: parent.frontmatter.id,
    pathRank: getPathProgressionRank(parent.frontmatter.id),
    audience: audienceRank(parent.frontmatter.audience),
    position: parent.frontmatter.threads?.indexOf(id) ?? Number.MAX_SAFE_INTEGER,
    title: thread.frontmatter.title,
  };
}

export function compareThreadOrderKeys(a: ThreadOrderKey, b: ThreadOrderKey): number {
  return (
    a.pathRank - b.pathRank ||
    a.audience - b.audience ||
    a.position - b.position ||
    a.title.localeCompare(b.title)
  );
}

/**
 * A name as prose inflects it: the last word may drop its "-ing" or plural
 * "-s" and take "-s", "-es", "-ed" or "-ing" instead, so "heightening" is
 * named by a lesson that says "you can heighten it" and "offers" by one that
 * says "an offer". Without this, *The Game Beneath the Game* — which
 * heightens, rests and resolves every game type — did not name `heightening`,
 * and the atom's primary lesson fell to a seed lesson on the reference shelf.
 */
function inflectedNamePattern(name: string): string {
  const words = name.split(" ");
  const last = words.pop() ?? "";
  let stem = last;
  if (/ing$/.test(last) && last.length >= 7) stem = last.slice(0, -3);
  else if (/[^su]s$/.test(last) && last.length >= 5) stem = last.slice(0, -1);
  const head = words.map(escapeRegExp).join("\\s+");
  return `${head ? `${head}\\s+` : ""}${escapeRegExp(stem)}(?:s|es|ed|ing)?`;
}

/**
 * The names a lesson could call an atom by in prose: its title, the part of
 * the title before a colon, and its aliases. Matched case-insensitively at
 * word boundaries, without the autolinker's exclusions — a lesson that
 * writes "commitment" names `commitment`, whatever the linker declines to
 * link.
 */
function getAtomNameMatchers(atom: { frontmatter: AtomFrontmatter }): RegExp[] {
  const names = new Set<string>();
  const add = (value: string | null | undefined) => {
    const normalized = value ? normalizePhrase(value) : "";
    if (normalized) names.add(normalized.toLowerCase());
  };
  add(atom.frontmatter.title);
  add(getTitlePrefix(atom.frontmatter.title));
  for (const alias of atom.frontmatter.aliases ?? []) add(alias);
  return [...names].map(
    (name) => new RegExp(`(?<![A-Za-z0-9])${inflectedNamePattern(name)}(?![A-Za-z0-9])`, "i"),
  );
}

/**
 * Whether a lesson's body mentions the atom by any of its names.
 *
 * Read from the raw markdown, so a link the autolinker adds at render time
 * does not count as the lesson naming the concept. Sixty of the 183
 * lesson-atom compositions are named nowhere in the lesson's prose (tracker
 * entry 198, 2026-09-21); this is the test that tells the two kinds apart.
 */
export function threadNamesAtom(
  thread: { content: string },
  atom: { frontmatter: AtomFrontmatter },
): boolean {
  return getAtomNameMatchers(atom).some((matcher) => matcher.test(thread.content));
}

/**
 * Every thread that composes an atom, the one a reader meets first at the
 * front.
 *
 * This used to return `loadThreads()` filtered and unsorted, so the first
 * entry — which the atom page takes as the concept's primary lesson for its
 * context line, and the "what's next" card walks — was whichever thread the
 * filesystem listed first. On the production build that was the
 * alphabetically last composing thread for all 28 multi-thread atoms, and
 * so `yes-and`, `offers`, `commitment` and `be-present` each said they
 * belonged to *Traditions in Tension*, a seed lesson on the advanced
 * reference shelf, ahead of the validated beginner lesson that also teaches
 * them. Ordered by the path progression, the primary lesson is the one on
 * the earliest path (see getThreadOrderKey).
 *
 * Path order alone still let the context line say "In lesson X" about a
 * lesson whose prose never mentions the concept: a third of compositions
 * are declared in `atoms:` and named nowhere in the body (entry 198). So
 * the lessons that name the atom — title, title prefix or alias, in the
 * markdown — come first, and the progression orders within each group. An
 * atom no composing lesson names falls back to path order unchanged.
 */
export async function getThreadsForAtom(atomId: string) {
  const [threads, atoms] = await Promise.all([loadThreads(), loadAtoms()]);
  const atom = atoms.find((a) => a.frontmatter.id === atomId) ?? null;
  const composing = threads.filter((t) => t.frontmatter.atoms?.includes(atomId));
  const keyed = await Promise.all(
    composing.map(async (thread) => ({
      thread,
      key: await getThreadOrderKey(thread),
      named: atom ? threadNamesAtom(thread, atom) : false,
    })),
  );
  return keyed
    .sort((a, b) => Number(b.named) - Number(a.named) || compareThreadOrderKeys(a.key, b.key))
    .map((k) => k.thread);
}

export interface ThreadPracticeRecommendation {
  id: string;
  title: string;
  url: string;
  /**
   * `direct`: an exercise the lesson composes. `linked`: one that shares an
   * atom with the lesson. `level-page`: the exercise picker's page for the
   * lesson's level, offered when no drill at that level is reachable from the
   * lesson's atoms — the row still points somewhere.
   */
  source: "direct" | "linked" | "level-page";
  /**
   * Why the drill is on this lesson's row, for the row to say. `trains` is
   * true when the drill's own Trains line (trains.ts) names `concept`, one of
   * the lesson's atoms; false when the drill only shares an edge with
   * `concept`, the graph's looser claim (tracker entry 297, 2026-09-22).
   * Absent on a level-page entry, and on a composed drill with neither.
   */
  purpose?: { trains: boolean; concept: string };
}

/** How many drills the practice row shows. */
const THREAD_PRACTICE_SLOTS = 3;

/**
 * The picker level each path audience reads at. Teachers are handed the
 * intermediate drills — they run rooms that have got past warm-ups — and
 * performers the advanced ones, which is the split `audience-hub` and the
 * path progression already make (the performer paths end on the advanced
 * reference shelf).
 */
const AUDIENCE_DRILL_LEVEL: Record<string, string> = {
  beginner: "beginner",
  intermediate: "intermediate",
  teacher: "intermediate",
  advanced: "advanced",
  performer: "advanced",
};

const DRILL_LEVEL_ORDER = ["beginner", "intermediate", "advanced"];

/**
 * The picker levels a lesson's readers are at, in picker order: its home
 * path's audiences (`getParentPath`, the one path every other surface names
 * for the lesson) mapped through AUDIENCE_DRILL_LEVEL. A path with two
 * audiences ("improv-for-teams" is beginner and intermediate) admits both.
 * Empty for a lesson on no path: nothing says who is reading, so nothing is
 * filtered.
 */
export async function getThreadDrillLevels(threadId: string): Promise<string[]> {
  const parent = await getParentPath(threadId);
  const levels = new Set(
    (parent?.frontmatter.audience ?? []).map((a) => AUDIENCE_DRILL_LEVEL[a]).filter(Boolean),
  );
  return DRILL_LEVEL_ORDER.filter((level) => levels.has(level));
}

/**
 * The drills a lesson's practice row links.
 *
 * Until 2026-09-22 this was the first three exercises reached by walking the
 * lesson's atoms in frontmatter order and each atom's outbound links, with no
 * reading of level. The exercises the graph attaches to the principles an
 * advanced lesson composes are the beginner drills that illustrate them, so
 * every advanced lesson with a drill had a wrong one — The Performer's Edge
 * offered One-Word Scene and Blind Offer to The Art of Ensemble's performers
 * — and 16 of 46 slots failed the level rule the exercise picker applies to
 * the same reader (tracker entry 270; 12 by the entry's looser any-path
 * count). Entry 56 had already fixed that rule for the picker, the level
 * pages, the sitemap and the client; this was the fifth consumer and the one
 * never routed through it.
 *
 * Now: candidates are the exercises the lesson composes ("direct") and every
 * exercise that shares an edge with one of the lesson's atoms in either
 * direction ("linked" — a drill declares `illustrates` toward the concept it
 * trains as often as the concept names the drill). A lesson with a level
 * (`getThreadDrillLevels`) keeps only candidates that pass `matchesLevel`,
 * the picker's own rule. Direct drills come first in the lesson's dependency
 * order (`lessonAtomOrder` — the authored `atoms:` list puts a prerequisite
 * after the concept that needs it in 41 of 94 intra-lesson `requires` edges,
 * tracker entry 273, so the walk that reads it as written starts at the
 * dependent end); the linked ones are ranked by what they say they are
 * for before what the graph says. Of the 62 drills the rows recommended by
 * shared edges alone, 16 carried a Trains line naming one of the lesson's
 * atoms, 32 named none of them and 14 had no line, because edge counts
 * reward the drills with the most edges into the knot — Genre Scene for
 * the Harold lesson, One-Word Scene for Building on Offers (tracker entry
 * 297, 2026-09-22). So: a drill whose Trains line names a lesson atom
 * first, then by how many of the lesson's atoms its line names, then by
 * how many of the lesson's atoms it shares an edge with, then title. Each
 * recommendation carries a `purpose` — "trains X" or "shows X" — so the row
 * does not present a graph-chosen drill as a purpose-chosen one. Three are
 * kept. lesson-drill-purpose.test.ts holds the first drill to an agreeing
 * one wherever a candidate agrees.
 *
 * A lesson with a level and no candidate left gets one `level-page` entry
 * pointing at the picker's page for its lowest level, so the six format and
 * diagnostic lessons whose atoms link no exercise (and the beginner lessons
 * whose only neighbour is an intermediate drill) send the reader to the
 * router that can answer rather than to nothing. A lesson on no path with no
 * candidate still gets nothing — there is no level to send it to.
 * lesson-drill-levels.test.ts holds the rendered row to this.
 */
export async function getPracticeRecommendationsForThread(
  threadId: string,
): Promise<ThreadPracticeRecommendation[]> {
  const [thread, atoms, levels] = await Promise.all([
    getThreadBySlug(threadId),
    loadAtoms(),
    getThreadDrillLevels(threadId),
  ]);
  if (!thread) return [];
  // trains.ts imports loadAtoms from here; a dynamic import keeps the module
  // graph acyclic, and the index is cached per atom list so this costs one
  // parse across every lesson.
  const { buildTrainsIndex } = await import("./trains");
  const trainsIndex = buildTrainsIndex(atoms);

  const atomById = new Map(atoms.map((atom) => [atom.frontmatter.id, atom]));
  const lessonAtomIds = lessonAtomOrder(
    thread,
    new Map(atoms.map((atom) => [atom.frontmatter.id, atom.frontmatter])),
  ).filter((id) => atomById.has(id));
  const lessonAtoms = new Set(lessonAtomIds);
  const exercises = atoms.filter((atom) => atom.frontmatter.type === "exercise");

  const admits = (atom: (typeof atoms)[number]) =>
    levels.length === 0 || levels.some((level) => matchesLevel(atom.frontmatter.tags ?? [], level));

  // The lesson's atoms the exercise's Trains line names, in line order.
  const trainsHits = (exercise: (typeof atoms)[number]) =>
    (trainsIndex.trains.get(exercise.frontmatter.id) ?? []).filter((id) => lessonAtoms.has(id));

  // The lesson's atoms an exercise shares an edge with, in either direction,
  // in the lesson's order. Empty means it is not a neighbour at all.
  const touchedAtoms = (exercise: (typeof atoms)[number]) => {
    const touched = new Set<string>();
    for (const link of exercise.frontmatter.links ?? []) {
      if (lessonAtoms.has(link.id)) touched.add(link.id);
    }
    for (const id of lessonAtomIds) {
      const links = atomById.get(id)?.frontmatter.links ?? [];
      if (links.some((link) => link.id === exercise.frontmatter.id)) touched.add(id);
    }
    return lessonAtomIds.filter((id) => touched.has(id));
  };

  const toRecommendation = (
    atom: (typeof atoms)[number],
    source: ThreadPracticeRecommendation["source"],
  ): ThreadPracticeRecommendation => {
    const trained = trainsHits(atom)[0];
    const touched = touchedAtoms(atom)[0];
    const purposeId = trained ?? touched;
    const concept = purposeId ? atomById.get(purposeId)?.frontmatter.title : undefined;
    return {
      id: atom.frontmatter.id,
      title: atom.frontmatter.title,
      url: getAtomUrl({ id: atom.frontmatter.id, type: atom.frontmatter.type }),
      source,
      ...(concept ? { purpose: { trains: trained !== undefined, concept } } : {}),
    };
  };

  const direct = lessonAtomIds
    .map((id) => atomById.get(id))
    .filter(
      (atom): atom is (typeof atoms)[number] =>
        atom !== undefined && atom.frontmatter.type === "exercise" && admits(atom),
    )
    .map((atom) => toRecommendation(atom, "direct"));
  const directIds = new Set(direct.map((r) => r.id));

  const linked = exercises
    .filter((exercise) => !directIds.has(exercise.frontmatter.id) && admits(exercise))
    .map((exercise) => ({
      exercise,
      trains: trainsHits(exercise).length,
      shared: touchedAtoms(exercise).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort(
      (a, b) =>
        b.trains - a.trains ||
        b.shared - a.shared ||
        a.exercise.frontmatter.title.localeCompare(b.exercise.frontmatter.title),
    )
    .map(({ exercise }) => toRecommendation(exercise, "linked"));

  const recommendations = [...direct, ...linked].slice(0, THREAD_PRACTICE_SLOTS);
  if (recommendations.length > 0 || levels.length === 0) return recommendations;

  const level = levels[0];
  return [
    {
      id: `exercise-picker-${level}`,
      title: "Find a drill for this level",
      url: `/tools/exercise-picker/${level}`,
      source: "level-page",
    },
  ];
}

/**
 * Find all bridges that reference a given atom as an entry atom.
 *
 * Ordered rather than returned as found. The concept pages are the cluster
 * that actually ranks — Search Console has them at positions 7 to 11 where the
 * guides sit far lower — so the list of guides on a concept page is where the
 * site's real search visibility hands readers on to something. Some atoms are
 * referenced by fifteen or twenty guides, and the order was whatever
 * `loadBridges` happened to produce, which put a guide that cannot rank first
 * on eleven concept pages.
 *
 * Guides whose results have been checked and found closed sort last. Above
 * them, reach — traffic potential where measured, volume otherwise — so the
 * pages that can convert a reader appear first.
 */
let _bridgeAtomIndex: Map<string, Set<string>> | null = null;

/**
 * Atom id → slugs of the guides that link it.
 *
 * `entry_atoms` is the declared version of this and it undercounts badly:
 * bridges declare 455 atoms between them and link 703, because most of those
 * links are written by the prose autolinker at render time rather than by hand
 * in the markdown. Only 37 of the 374 undeclared ones are visible in the source
 * at all, so reading frontmatter — or even raw markdown — misses the majority.
 *
 * The rendered html is already in memory by the time anything asks, so the
 * honest reverse index is the union of what a guide declares and what it
 * actually links.
 *
 * Deliberately not fixed by widening `entry_atoms` itself. That field also
 * feeds getRelatedBridges, where it is weighted overlap between two guides —
 * expanding theatre-games from 6 entries to 32 would make it score against
 * nearly every other guide and quietly wreck the recommendations. The
 * declaration means "the atoms this guide is built to enter from"; this index
 * means "the guides that mention this atom". Two different questions.
 *
 * Since 2026-09-22 the related-guides rail reads the drills a guide links
 * from its rendered body as well (related-bridges.ts, tracker entry 325), so
 * the field need not carry them to make two drill guides neighbours.
 */
async function getBridgeAtomIndex(): Promise<Map<string, Set<string>>> {
  if (_bridgeAtomIndex) return _bridgeAtomIndex;
  const bridges = await loadBridges();
  const urlToId = new Map<string, string>();
  for (const [id, atom] of getAtomUrlMap()) urlToId.set(atom.url, id);

  const index = new Map<string, string[]>();
  const add = (atomId: string, slug: string) => {
    const seen = index.get(atomId);
    if (seen) seen.push(slug);
    else index.set(atomId, [slug]);
  };

  for (const bridge of bridges) {
    const found = new Set<string>(bridge.frontmatter.entry_atoms ?? []);
    for (const match of bridge.html.matchAll(/href="(\/[^"?#]*)"/g)) {
      const url = match[1].length > 1 ? match[1].replace(/\/$/, "") : match[1];
      const id = urlToId.get(url);
      if (id) found.add(id);
    }
    for (const id of found) add(id, bridge.slug);
  }

  _bridgeAtomIndex = new Map([...index].map(([id, slugs]) => [id, new Set(slugs)]));
  return _bridgeAtomIndex;
}

/**
 * Deriving the index from rendered links rather than declarations found real
 * relationships, and also found that `offers` and `yes-and` are mentioned by 32
 * guides each. A 32-item sidebar list is not a reading aid.
 *
 * The limit was chosen by measuring rather than by taste, because the first
 * guess was wrong. Total inbound links to the guide layer: 1333 before this
 * change, 1613 uncapped, 1534 at 16, and 1372 at 8 — a limit of 8 gives back
 * almost the entire gain, because it also trims the atoms that already carried
 * a long declared list. 16 keeps 201 of the 280 new links and still cuts the
 * outliers. The reach sort above decides which ones survive.
 */
export const ATOM_GUIDE_LIMIT = 16;

export async function getBridgesForAtom(atomId: string) {
  const bridges = await loadBridges();
  const index = await getBridgeAtomIndex();
  const linking = index.get(atomId);
  if (!linking) return [];
  const promotion = (b: (typeof bridges)[number]) => {
    if (b.frontmatter.serp_verdict === "authority") return -1;
    const primary = (b.frontmatter.target_keywords ?? [])[0];
    return primary?.traffic_potential ?? primary?.volume ?? 0;
  };
  return bridges
    .filter((b) => linking.has(b.slug))
    .sort((a, b) => promotion(b) - promotion(a) || a.slug.localeCompare(b.slug))
    .slice(0, ATOM_GUIDE_LIMIT);
}

/** Find ALL paths that sequence a given thread (not just the first) */
export async function getAllPathsForThread(threadId: string) {
  const paths = await loadPaths();
  return paths.filter((p) => p.frontmatter.threads?.includes(threadId));
}

/** Get the first thread of a path */
export async function getFirstThreadOfPath(
  pathId: string,
): Promise<{ id: string; title: string } | null> {
  const pathData = await getPathBySlug(pathId);
  if (!pathData) return null;
  const firstThreadId = pathData.frontmatter.threads?.[0];
  if (!firstThreadId) return null;
  const thread = await getThreadBySlug(firstThreadId);
  return thread ? { id: thread.frontmatter.id, title: thread.frontmatter.title } : null;
}

/**
 * Get the next atom in a thread's sequence after the given atom.
 *
 * The sequence is the lesson's dependency order (`lessonAtomOrder`), not the
 * authored `atoms:` list: read as written, the list sends the reader from a
 * concept to its own prerequisite two times in five (tracker entry 273).
 */
export async function getNextAtomInThread(
  atomId: string,
  threadId: string,
): Promise<{ id: string; title: string; url: string } | null> {
  const [thread, atoms] = await Promise.all([getThreadBySlug(threadId), loadAtoms()]);
  if (!thread) return null;
  const atomIds = lessonAtomOrder(
    thread,
    new Map(atoms.map((atom) => [atom.frontmatter.id, atom.frontmatter])),
  );
  const idx = atomIds.indexOf(atomId);
  if (idx === -1 || idx >= atomIds.length - 1) return null;
  const nextId = atomIds[idx + 1];
  const nextAtom = await getAtomBySlug(nextId);
  if (!nextAtom) return null;
  return {
    id: nextId,
    title: nextAtom.frontmatter.title,
    url: getAtomUrl({ id: nextId, type: nextAtom.frontmatter.type }),
  };
}

/** Get audio duration for a thread (from durations.json) */
export function getThreadDuration(threadId: string): string | null {
  const durations = loadAudioManifest();
  const dur = durations[`/audio/threads/${threadId}.mp3`] as { formatted?: string } | undefined;
  return dur?.formatted ?? null;
}

/** Get total path duration by summing thread durations */
export function getPathTotalDuration(pathThreadIds: string[]): string | null {
  const durations = loadAudioManifest();
  let totalSeconds = 0;
  let found = false;
  for (const id of pathThreadIds) {
    const dur = durations[`/audio/threads/${id}.mp3`] as { seconds?: number } | undefined;
    if (dur?.seconds) {
      totalSeconds += dur.seconds;
      found = true;
    }
  }
  if (!found) return null;
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

// ─── Audio ──────────────────────────────────────────────────────────────────

export function getAudioUrl(type: AudioContentType, slug: string): string | null {
  const relativePath = getRelativeAudioPath(type, slug);

  // Check durations manifest (works in both local and production)
  const durations = loadAudioManifest();
  if (durations[relativePath]) {
    return getAudioAssetUrl(relativePath);
  }

  // Fallback: check local filesystem (dev only)
  const audioPath = path.join(process.cwd(), "public", "audio", type, `${slug}.mp3`);
  if (fs.existsSync(audioPath)) {
    return getAudioAssetUrl(relativePath);
  }

  return null;
}

// ─── Graph compilation ───────────────────────────────────────────────────────

/**
 * A guide's node id.
 *
 * `active-listening` and `viewpoints` are each both an atom id and a guide
 * slug, so a bare slug would collide with an existing node and merge a concept
 * page with the guide about it. The prefix keeps node ids unique across the
 * layers; a consumer recovers the URL path by dropping it.
 */
const bridgeNodeId = (slug: string) => `bridge:${slug}`;

/**
 * The commit this payload was built from, or null when nothing said.
 *
 * `builtAt` alone cannot tell two payloads apart: it changes on every build
 * whether or not the content moved, so a consumer diffing the graph has no
 * way to know it is looking at the same corpus. Both CI environments that
 * build this site put the sha in the environment already — Vercel as
 * `VERCEL_GIT_COMMIT_SHA`, GitHub Actions as `GITHUB_SHA` — so it costs
 * nothing and needs no child process. A local build has neither and the
 * field is left off; an invented value would be worse than an absent one.
 */
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null;

export async function buildGraph(): Promise<KnowledgeGraph> {
  const [sources, atoms, bridges, threads, paths] = await Promise.all([
    loadSources(),
    loadAtoms(),
    loadBridges(),
    loadThreads(),
    loadPaths(),
  ]);

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Sources → nodes + extraction edges
  for (const source of sources) {
    const fm = source.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "source",
      status: fm.status,
      tags: fm.tags,
    });
    for (const atomId of fm.atoms_extracted ?? []) {
      edges.push({
        source: fm.id,
        target: atomId,
        relation: "extracted_from",
      });
    }
  }

  // Atoms → nodes + link edges + provenance edges
  for (const atom of atoms) {
    const fm = atom.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "atom",
      type: fm.type,
      status: fm.status,
      tags: fm.tags,
    });
    for (const link of fm.links ?? []) {
      edges.push({
        source: fm.id,
        target: link.id,
        relation: link.relation,
      });
    }
  }

  // Guides → nodes + two kinds of atom edge + the path they hand on to.
  //
  // The guide layer carries the site's search demand and was absent from the
  // payload entirely, because `GraphNode.layer` predates it (tracker entry
  // 354). Its edges are emitted as two separate relations on purpose:
  //
  //   `declares` is `entry_atoms`, the atoms a guide says it is built to enter
  //   from — the same field `getRelatedBridges` weights, and deliberately
  //   narrow.
  //   `mentions` is the reverse index `getBridgeAtomIndex` builds from rendered
  //   html, the union of what a guide declares and what it actually links.
  //
  // The second is a superset of the first, and merging them would erase the
  // difference between what an author claimed and what the page does — the
  // distinction the comment on `getBridgeAtomIndex` exists to protect. The
  // derived flag is how a consumer tells them apart without knowing that.
  const bridgeAtomIndex = await getBridgeAtomIndex();
  const mentionedBySlug = new Map<string, string[]>();
  for (const [atomId, slugs] of bridgeAtomIndex) {
    for (const slug of slugs) {
      const seen = mentionedBySlug.get(slug);
      if (seen) seen.push(atomId);
      else mentionedBySlug.set(slug, [atomId]);
    }
  }

  for (const bridge of bridges) {
    const fm = bridge.frontmatter;
    const id = bridgeNodeId(bridge.slug);
    nodes.push({
      id,
      title: fm.title,
      layer: "bridge",
      status: fm.status,
      // Guides carry no `tags` field; paths already publish an empty list for
      // the same reason, so the shape stays uniform across layers.
      tags: [],
    });
    for (const atomId of fm.entry_atoms ?? []) {
      edges.push({ source: id, target: atomId, relation: "declares" });
    }
    for (const atomId of mentionedBySlug.get(bridge.slug) ?? []) {
      edges.push({ source: id, target: atomId, relation: "mentions", derived: true });
    }
    if (fm.entry_path) {
      edges.push({ source: id, target: fm.entry_path, relation: "enters" });
    }
  }

  // Threads → nodes + composition edges
  for (const thread of threads) {
    const fm = thread.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "thread",
      status: fm.status,
      tags: fm.tags,
    });
    for (const atomId of fm.atoms ?? []) {
      edges.push({
        source: fm.id,
        target: atomId,
        relation: "composes",
      });
    }
  }

  // Paths → nodes + sequence edges
  for (const p of paths) {
    const fm = p.frontmatter;
    nodes.push({
      id: fm.id,
      title: fm.title,
      layer: "path",
      status: fm.status,
      tags: [],
    });
    for (const threadId of fm.threads ?? []) {
      edges.push({
        source: fm.id,
        target: threadId,
        relation: "sequences",
      });
    }
  }

  return {
    nodes,
    edges,
    meta: {
      sourceCount: sources.length,
      atomCount: atoms.length,
      bridgeCount: bridges.length,
      threadCount: threads.length,
      pathCount: paths.length,
      builtAt: new Date().toISOString(),
      // Read from whatever CI set, never shelled out for: this runs inside the
      // static render of /api/graph. Absent on a local build, which is the
      // honest answer rather than a guess.
      ...(commitSha ? { commit: commitSha } : {}),
    },
  };
}

/**
 * Run one short piece of frontmatter prose through the same linking the
 * markdown bodies get, and return it as inline HTML (no wrapping <p>).
 *
 * The lesson frame renders `practice_prompt`, `common_mistake` and the rest
 * as plain strings, so a prompt reading "Run mirroring, a one-word scene, or
 * a blind offer" carried no link on a page whose sidebar linked all three.
 * The frame is the prose a learner acts on, and it was the only prose on a
 * thread page outside the autolink pipeline.
 *
 * `currentUrl` is the page the text sits on, so a field never links to its
 * own page. The result is trusted markup: the input is authored frontmatter,
 * and remark-html sanitises it the same way it does the body.
 */
export async function autolinkInline(
  text: string,
  currentUrl: string | null = null,
): Promise<string> {
  const rendered = await remark()
    .use(remarkGfm)
    .use(remarkInterlinkDocuments, { currentUrl })
    .use(html)
    .process(text);

  const linked = linkEntities(linkAtomRefs(rendered.toString()), currentUrl).trim();
  // A single paragraph is the whole result; unwrap it so the caller decides
  // the block element. Anything more than one paragraph is left as blocks.
  const single = /^<p>((?:(?!<\/?p>)[\s\S])*)<\/p>$/.exec(linked);
  return single ? single[1] : linked;
}

/**
 * Run a transcript's paragraphs through the body pipeline in one pass and
 * return each paragraph's inner HTML, in order.
 *
 * The audio scripts are a 331,000-word corpus, larger than the atoms, lessons
 * and paths they narrate, and until 2026-09-21 nothing on the site read them
 * but the MP3 build (tracker entry 257). Rendered under the player they need
 * the same links the bodies get. One remark pass over the joined text rather
 * than `autolinkInline` per paragraph, for two reasons: the linker's
 * "already linked on this page" rule then holds across the whole transcript,
 * so a concept named forty times links once, as it does in a body; and a
 * page's transcript is one process call instead of forty.
 *
 * Each paragraph is a spoken line, so a line that happens to open like a
 * markdown block ("- ", "1. ", "> ") is escaped to stay a paragraph; the
 * caller decides the block element. `autolinkInline` is the same pipeline
 * for one frontmatter field; it skips the source and citation linkers, which
 * a 1,000-word script naming books cannot.
 *
 * `alreadyLinked` is the page's ledger: the hrefs its body already links.
 * The body linker refuses a second anchor to a target the page has, and the
 * fold ran the same rule inside itself, but the two passes could not see
 * each other, so on the guides 244 targets and on the concepts 366 were
 * linked in both the prose and the fold — the fold was the second-largest
 * source of repeat links on every layer (tracker entry 267, 2026-09-22).
 * The set seeds the same `linkedUrls` the body's remark pass starts from,
 * so the phrase linker skips those targets and spends the slot on a target
 * the prose did not reach; the four post-processors (sources, citations,
 * backticked ids, people) keep their own once-per-page checks against the
 * html they are given, so their anchors to a ledgered target are unwrapped
 * afterwards. Either way the fold links only what the body did not.
 */
export async function autolinkTranscript(
  paragraphs: string[],
  currentUrl: string | null = null,
  alreadyLinked: ReadonlySet<string> = new Set(),
): Promise<string[]> {
  if (paragraphs.length === 0) return [];
  const source = paragraphs
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((p) => p.replace(/^([#>*+\-]|\d+[.)])(?=\s)/, "\\$1"))
    .join("\n\n");
  const rendered = await remark()
    .use(remarkGfm)
    // remarkInterlinkDocuments with the page's ledger as the seed.
    .use(() => (tree: MarkdownNode) => {
      const linkedUrls = new Set<string>(alreadyLinked);
      if (currentUrl) linkedUrls.add(currentUrl);
      collectExistingLinkUrls(tree, linkedUrls);
      interlinkContentTree(tree, currentUrl, linkedUrls);
    })
    .use(html)
    .process(source);
  // The body's post-processors in the body's order, so an italicised book
  // title in a script reaches its library entry as it would in prose.
  const postProcessed = linkEntities(
    linkAtomRefs(linkCitations(linkSources(rendered.toString(), currentUrl), currentUrl)),
    currentUrl,
  ).trim();
  const linked =
    alreadyLinked.size === 0
      ? postProcessed
      : postProcessed.replace(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g, (anchor, href, text) =>
          alreadyLinked.has(href) ? text : anchor,
        );
  return linked
    .split("\n")
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const single = /^<p>([\s\S]*)<\/p>$/.exec(block);
      return single ? single[1] : block;
    });
}
