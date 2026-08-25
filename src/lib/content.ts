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

import { type AudioContentType, getAudioAssetUrl, getRelativeAudioPath } from "./audio";
import { getAudioDuration, loadAudioManifest } from "./audio-manifest";
import type {
  AtomFrontmatter,
  AtomType,
  BridgeFrontmatter,
  GraphEdge,
  GraphNode,
  KnowledgeGraph,
  PathFrontmatter,
  ShowFrontmatter,
  SourceFrontmatter,
  ThreadFrontmatter,
} from "./schema";

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
const GENERIC_ONE_WORD_ATOM_TITLES = new Set([
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
  [/Truth in Comedy/g, "/library/ref-truth-in-comedy"],
  [/Bossypants/g, "/library/ref-fey-bossypants"],
  [/Impro for Storytellers/g, "/library/ref-impro-storytellers-johnstone"],
  [/Improvisation for the Theater/g, "/library/ref-spolin-improvisation-for-theater"],
  [/Improv Wisdom/g, "/library/ref-madson-improv-wisdom"],
  [/Group Genius/g, "/library/ref-sawyer-group-genius"],
  [/Improvisation at the Speed of Life/g, "/library/ref-tj-dave-speed-of-life"],
  [/Speed of Life/g, "/library/ref-tj-dave-speed-of-life"],
  [/Improv Nonsense/g, "/library/ref-hines-substack"],
  [/UCB Comedy Improvisation Manual/g, "/library/ref-ucb-manual"],
  [/Attention and Effort/g, "/library/ref-attention-and-effort-kahneman"],
  [/The Viewpoints Book/g, "/library/ref-viewpoints-bogart-landau"],
  [/Sanford Meisner on Acting/g, "/library/ref-meisner-on-acting"],
  [/Improvise/g, "/library/ref-napier-improvise"],
  [/Daring Greatly/g, "/library/ref-brown-daring-greatly"],
  [/Improv Nerd/g, "/library/ref-carrane-improv-nerd"],
  [/Frame Analysis/g, "/library/ref-goffman-frame-analysis"],
  [/Art by Committee/g, "/library/ref-halpern-art-by-committee"],
  [/Behind the Scenes/g, "/library/ref-napier-behind-the-scenes"],
  [/Standing in Space/g, "/library/ref-overlie-standing-in-space"],
  [/The Improv Handbook/g, "/library/ref-salinsky-improv-handbook"],
  [/Improvised Dialogues/g, "/library/ref-sawyer-improvised-dialogues"],
  [/An Actor Prepares/g, "/library/ref-stanislavski-actor-prepares"],
  [/Improvise Freely/g, "/library/ref-stiles-improvise-freely"],
  [/Flow/g, "/library/ref-csikszentmihalyi-flow"],
  [/Impro(?!v)/g, "/library/ref-impro-johnstone"],
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
  [/Limb\s*(?:&(?:amp|#x26);|&)\s*Braun\s*\(2008\)/, "/library/ref-limb-braun-jazz-improvisation"],
  [/Edmondson\s*\(1999\)/, "/library/ref-edmondson-psychological-safety"],
  [/Cowan\s*\(2001\)/, "/library/ref-cowan-magical-number-four"],
  [/Sweller\s*\(1988\)/, "/library/ref-sweller-cognitive-load"],
  [/Cherry\s*\(1953\)/, "/library/ref-cherry-cocktail-party"],
  [/Wickens\s*\(2002\)/, "/library/ref-wickens-multiple-resources"],
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
// Charna Halpern on 20, and both are deliberately absent: what this site holds
// is the school each of them founded, not a page about them, and pointing a
// person's name at an institution asserts something slightly false. The
// institutions themselves have no such problem — /traditions/ucb is a page
// about UCB.
//
// Second City is named on 24 pages and has no page here, so it is not listed
// rather than being pointed somewhere approximate.
//
// Matching is case-sensitive, which is load-bearing for two of these. "iO" is
// a proper noun and "io" inside another word is not, and "Annoyance" is the
// theatre while "annoyance" is an ordinary English noun. Every capitalised
// occurrence of both in this corpus was checked before they were added.

const ENTITY_MAP: [RegExp, string][] = [
  [/Keith Johnstone/, "/traditions/johnstone"],
  [/Viola Spolin/, "/viola-spolin"],
  [/Del Close/, "/del-close"],
  [/UCB/, "/traditions/ucb"],
  [/Annoyance/, "/traditions/annoyance"],
  [/iO/, "/traditions/close"],
];

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
 */
function linkEntities(htmlStr: string, currentUrl: string | null): string {
  let result = htmlStr;
  for (const [pattern, url] of ENTITY_MAP) {
    if (url === currentUrl) continue;
    // The page already sends the reader there in its own words. Seven pages
    // open with a hand-written line like "For the school it founded, see the
    // Johnstone tradition", and a markdown link renders as the same bare
    // anchor this writes — so without this check the page gained a second
    // link to a page it was already linking, which is the opposite of the
    // point.
    if (result.includes(`href="${url}"`)) continue;

    let linked = false;
    result = result.replace(new RegExp(`\\b${pattern.source}\\b`, "g"), (match, ...args) => {
      if (linked) return match;
      const offset = args[args.length - 2] as number;
      const before = result.slice(Math.max(0, offset - 300), offset);

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
  return result;
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
    const phrases = getAutolinkPhrases(atom.frontmatter.title, "atom", atom.frontmatter.type);
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

function rewriteLegacyInternalLinks(htmlStr: string): string {
  return htmlStr
    .replace(/href="([^"]+)"/g, (match, href) => {
      const rewrittenHref = rewriteLegacyInternalHref(href);
      return rewrittenHref === href ? match : `href="${rewrittenHref}"`;
    })
    .replace(
      /<a href="\/">The Physics of Connection<\/a>/g,
      '<a href="/paths/physics-of-connection">The Physics of Connection</a>',
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
): MarkdownNode[] {
  const nodes: MarkdownNode[] = [];
  const targets = getContentLinkTargets();
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
) {
  if (!node.children || AUTOLINK_BLOCKED_NODE_TYPES.has(node.type)) return;

  const nextChildren: MarkdownNode[] = [];

  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      nextChildren.push(...autolinkTextNode(child.value, currentUrl, linkedUrls));
      continue;
    }

    interlinkContentTree(child, currentUrl, linkedUrls);
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
function slugifyHeading(text: string): string {
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

function remarkInterlinkDocuments(options: { currentUrl: string | null }) {
  return (tree: MarkdownNode) => {
    const linkedUrls = new Set<string>();
    if (options.currentUrl) linkedUrls.add(options.currentUrl);

    collectExistingLinkUrls(tree, linkedUrls);
    interlinkContentTree(tree, options.currentUrl, linkedUrls);
  };
}

// ─── File loading ────────────────────────────────────────────────────────────

interface ContentFile<T> {
  frontmatter: T;
  content: string; // raw markdown
  html: string; // rendered HTML
  slug: string; // filename without extension
}

async function loadFiles<T>(subdir: string): Promise<ContentFile<T>[]> {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];

  const files = await glob("*.md", { cwd: dir });
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
    const rendered = await remark()
      .use(remarkGfm)
      .use(remarkInterlinkDocuments, { currentUrl })
      .use(remarkHeadingIds)
      .use(html)
      .process(content);

    results.push({
      frontmatter: data as T,
      content,
      html: normaliseGeneratedIds(
        rewriteLegacyInternalLinks(
          linkEntities(
            linkAtomRefs(linkCitations(linkSources(rendered.toString(), currentUrl), currentUrl)),
            currentUrl,
          ),
        ),
      ),
      slug,
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
   * ISO date the underlying content was published, for feed pubDate ordering.
   *
   * `created`, not `updated`. An episode's publication date does not move
   * because the page was edited, and reading `updated` here meant that
   * syncing modification dates collapsed every episode onto one pubDate.
   */
  published?: string;
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
            published: b.frontmatter.created,
          });
        }
      }
    } else if (filter.content_type === "atom" && filter.atom_types) {
      for (const a of atoms) {
        if (filter.atom_types.includes(a.frontmatter.type)) {
          const audio = getAudioUrl("atoms", a.frontmatter.id);
          if (audio) {
            eps.push({
              title: a.frontmatter.title,
              href: getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
              audioUrl: audio,
              duration: getAudioDuration(audio),
              published: a.frontmatter.created,
            });
          }
        }
      }
    } else if (filter.content_type === "thread") {
      for (const t of threads) {
        const audio = getAudioUrl("threads", t.frontmatter.id);
        if (audio) {
          eps.push({
            title: t.frontmatter.title,
            href: `/threads/${t.frontmatter.id}`,
            audioUrl: audio,
            duration: getAudioDuration(audio),
            published: t.frontmatter.created,
          });
        }
      }
    } else if (filter.content_type === "path") {
      for (const p of paths) {
        const audio = getAudioUrl("paths", p.frontmatter.id);
        if (audio) {
          eps.push({
            title: p.frontmatter.title,
            href: `/paths/${p.frontmatter.id}`,
            audioUrl: audio,
            duration: getAudioDuration(audio),
            published: p.frontmatter.created,
          });
        }
      }
    }

    seasons.push({ label: season.label, episodes: eps });
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

/** Extract counter-position text from an atom's raw markdown */
export function extractCounterPositions(content: string): { text: string; tradition?: string }[] {
  const results: { text: string; tradition?: string }[] = [];
  // Match **Counter-position:** or **Counter-position (Tradition):** or **Counter-argument:**
  const regex =
    /\*\*Counter-(?:position|argument)(?:\s*\(([^)]+)\))?:\*\*\s*([\s\S]+?)(?=\n\n|\n\*\*[A-Z]|$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    results.push({
      tradition: match[1]?.trim(),
      text: match[2]
        .trim()
        .replace(/\*\*/g, "")
        .replace(/\*([^*]+)\*/g, "$1"),
    });
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
      return `/library/${atom.id}`;
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

/** Find the best parent path for a thread.
 *  When a thread appears in multiple paths, prefer the path where it appears
 *  earliest (lowest index) — biasing toward the path where it's most foundational. */
export async function getParentPath(threadId: string) {
  const paths = await loadPaths();
  const candidates = paths.filter((p) => p.frontmatter.threads?.includes(threadId));
  if (candidates.length <= 1) return candidates[0] ?? null;
  return candidates.reduce((best, p) => {
    const bestIdx = best.frontmatter.threads?.indexOf(threadId) ?? Infinity;
    const pIdx = p.frontmatter.threads?.indexOf(threadId) ?? Infinity;
    return pIdx < bestIdx ? p : best;
  });
}

/** Find all threads that compose a given atom */
export async function getThreadsForAtom(atomId: string) {
  const threads = await loadThreads();
  return threads.filter((t) => t.frontmatter.atoms?.includes(atomId));
}

export interface ThreadPracticeRecommendation {
  id: string;
  title: string;
  url: string;
  source: "direct" | "linked";
}

export async function getPracticeRecommendationsForThread(
  threadId: string,
): Promise<ThreadPracticeRecommendation[]> {
  const [thread, atoms] = await Promise.all([getThreadBySlug(threadId), loadAtoms()]);
  if (!thread) return [];

  const atomById = new Map(atoms.map((atom) => [atom.frontmatter.id, atom]));
  const directRecommendations: ThreadPracticeRecommendation[] = [];
  const linkedRecommendations: ThreadPracticeRecommendation[] = [];
  const seen = new Set<string>();

  const addRecommendation = (atomId: string, source: "direct" | "linked") => {
    if (seen.has(atomId)) return;

    const atom = atomById.get(atomId);
    if (!atom || atom.frontmatter.type !== "exercise") return;

    seen.add(atomId);
    const recommendation = {
      id: atomId,
      title: atom.frontmatter.title,
      url: getAtomUrl({ id: atomId, type: atom.frontmatter.type }),
      source,
    };

    if (source === "direct") {
      directRecommendations.push(recommendation);
      return;
    }

    linkedRecommendations.push(recommendation);
  };

  for (const atomId of thread.frontmatter.atoms ?? []) {
    const atom = atomById.get(atomId);
    if (!atom) continue;

    addRecommendation(atomId, "direct");

    for (const link of atom.frontmatter.links ?? []) {
      addRecommendation(link.id, "linked");
    }
  }

  return [...directRecommendations, ...linkedRecommendations].slice(0, 3);
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
export async function getBridgesForAtom(atomId: string) {
  const bridges = await loadBridges();
  const promotion = (b: (typeof bridges)[number]) => {
    if (b.frontmatter.serp_verdict === "authority") return -1;
    const primary = (b.frontmatter.target_keywords ?? [])[0];
    return primary?.traffic_potential ?? primary?.volume ?? 0;
  };
  return bridges
    .filter((b) => b.frontmatter.entry_atoms?.includes(atomId))
    .sort((a, b) => promotion(b) - promotion(a) || a.slug.localeCompare(b.slug));
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

/** Get the next atom in a thread's sequence after the given atom */
export async function getNextAtomInThread(
  atomId: string,
  threadId: string,
): Promise<{ id: string; title: string; url: string } | null> {
  const thread = await getThreadBySlug(threadId);
  if (!thread) return null;
  const atomIds = thread.frontmatter.atoms ?? [];
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

export async function buildGraph(): Promise<KnowledgeGraph> {
  const [sources, atoms, threads, paths] = await Promise.all([
    loadSources(),
    loadAtoms(),
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
      threadCount: threads.length,
      pathCount: paths.length,
      builtAt: new Date().toISOString(),
    },
  };
}
