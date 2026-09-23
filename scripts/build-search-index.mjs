/**
 * Build search index for MiniSearch.
 * Reads all content files and every route page, creates an index, writes to
 * public/search-index.json.
 *
 * The route pages were absent until 2026-09-21. The index read `content/`,
 * and the hubs live in `src/app`, so the 45 pages the sitemap publishes from
 * routes — the type hubs, the topic and audience hubs, the traditions, the
 * shows, the tools — could not be found by the site's own search: "improv
 * games" returned three guides and not /improv-games, "podcast" returned a
 * book about a podcast, "ucb" the manual rather than the tradition page
 * (novel-insights 226). They now come from `listRoutePages()`, the same
 * resolution llms.txt reads, as documents in a fifth layer, `hub`.
 */

import fs from "fs";
import matter from "gray-matter";
import MiniSearch from "minisearch";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { listRoutePages } from "../src/lib/route-pages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "..", "content");
const OUTPUT = path.join(__dirname, "..", "public", "search-index.json");

// Duplicate of getAtomUrl — avoids ESM import chain from content.ts
function atomTypeToUrl(id, type) {
  switch (type) {
    case "law":
    case "insight":
      return `/how-it-works/${id}`;
    case "principle":
      return `/how-it-works/principles/${id}`;
    case "antipattern":
    case "pattern":
    case "framework":
      return `/how-it-works/diagnosis/${id}`;
    case "exercise":
      return `/practice/exercises/${id}`;
    case "technique":
    case "pedagogy":
      return `/practice/techniques/${id}`;
    case "format":
      return `/practice/formats/${id}`;
    case "definition":
      return `/practice/vocabulary/${id}`;
    case "reference":
      return `/library/${id}`;
    default:
      return `/how-it-works/${id}`;
  }
}

function loadDir(subdir) {
  const dir = path.join(CONTENT_DIR, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { data, content } = matter(raw);
      const slug = path.basename(f, ".md");
      return { frontmatter: data, content, slug };
    });
}

function stripMarkdown(md) {
  return md
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[|`]/g, "")
    .trim();
}

/**
 * How much of a document's opening the index holds.
 *
 * The number is unchanged; it is named because `sections` below is measured
 * against it and the prebuild prints the share.
 */
const BODY_MAX = 500;

/**
 * How much of a section's opening sentence is indexed.
 *
 * public/search-index.json is downloaded by every reader who opens the search
 * box, so depth is paid for in bytes. Measured 2026-09-22 over the 2,665 h2
 * and h3 headings of the corpus: uncapped, the sentences are 317,533
 * characters of field text and the file is 975,573 bytes against 445,810
 * before the field; at 120 the field text is 274,949 and the file 944,326.
 *
 * So the cap buys 31,247 bytes and does not on its own bring the growth under
 * twice — most of a sentence's words are already postings from somewhere else
 * in the corpus, and 212,649 bytes of the growth is the stored anchors, which
 * no cap touches. It is kept because the saving is free: the clause that
 * answers a heading is at the front of the sentence, and a query that needs
 * the 200th character of a paragraph is a query for the page, not the
 * section. The cap is on the sentence alone — a heading is never truncated,
 * because the heading is the thing a reader types.
 */
const SECTION_LEDE_MAX = 120;

/**
 * Inline markdown, reduced to the text a heading renders as.
 *
 * `remarkHeadingIds` in content.ts slugifies the heading node's *text*
 * children, so a link's target and a code span's backticks are already gone
 * by the time it sees them. Reading the markdown line instead, the target
 * would survive — `[Yes, And](/yes-and)` would slug as `yes-and-yes-and` —
 * and the id would not be the one the page renders. Everything else the
 * slugifier collapses on its own.
 */
function headingTextOf(markdown) {
  return markdown
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The first sentence of a section's prose, capped. */
function firstSentence(text) {
  const flat = text.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const match = /^.*?[.!?](?=\s|$)/.exec(flat);
  return (match ? match[0] : flat).substring(0, SECTION_LEDE_MAX).trim();
}

/**
 * Every h2 and h3 of a document, with the id the page will render it under
 * and the first sentence beneath it.
 *
 * The ids have to be the rendered ones or a result cannot deep-link a
 * section, so the slug comes from content.ts's `slugifyHeading` — the
 * function `remarkHeadingIds` uses — and the duplicate counter repeats that
 * plugin's rule: the first occurrence keeps the base, the next takes `-2`.
 * The counter runs over headings of every level, as the plugin's does, so an
 * h4 that repeats an h2's words shifts the suffix the same way here as on the
 * page. search-depth.test.ts checks the result against `contentsFor`, which
 * reads the ids out of the rendered HTML, so a divergence fails there.
 *
 * Fenced code is skipped: a `#` at the start of a line inside a fence is a
 * comment, not a heading, and the renderer does not anchor it either.
 *
 * @param {string} markdown a document's body, frontmatter already removed
 * @param {(text: string) => string} slugify content.ts's `slugifyHeading`
 * @returns {{ id: string, heading: string, lede: string }[]}
 */
function sectionsOf(markdown, slugify) {
  const used = new Map();
  const sections = [];
  let open = null;
  let fenced = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      if (open) open.lines.push(line);
      continue;
    }
    const heading = fenced ? null : /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (!heading) {
      if (open) open.lines.push(line);
      continue;
    }
    if (open) sections.push(open);
    open = null;

    const level = heading[1].length;
    const text = headingTextOf(heading[2]);
    const base = slugify(text);
    if (!base) continue;
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    // Only h2 and h3 are anchored in the contents list and in headings.ts, so
    // only they are sections a result can be sent to; the rest still advance
    // the counter.
    if (level === 2 || level === 3) {
      open = { id: seen === 0 ? base : `${base}-${seen + 1}`, heading: text, lines: [] };
    }
  }
  if (open) sections.push(open);

  return sections.map((section) => ({
    id: section.id,
    heading: section.heading,
    lede: firstSentence(stripMarkdown(section.lines.join("\n"))),
  }));
}

/**
 * A path's sections, which are not in its body.
 *
 * `sectionsOf` above reads markdown headings, and the 11 path bodies have 0
 * between them — so the section field of entry 337 left the layer at the
 * share it already had, while a third of its authored prose sat in 7
 * frontmatter fields the index never saw at all (tracker entry 341). The path
 * page renders those fields under 3 headings; this indexes the same 3, from
 * the same list, so an anchor stored here is one the page renders.
 *
 * The lede is the first sentence of what the author wrote in the section's
 * fields, capped like every other lede: the fields are the prose the heading
 * is structure over.
 *
 * Body sections come first where both exist. No path has one today, and if a
 * body ever repeats one of these headings the page's id is the one a reader
 * lands on, so the body's would need the duplicate suffix — a case worth
 * knowing about rather than guarding for 0 documents.
 *
 * The frontmatter is read by the caller's own `pathSectionText` rather than
 * here: this module is JavaScript and the fields belong to a TypeScript type,
 * so the reader that knows the type does the reading.
 *
 * @template {{ id: string, heading: string }} S
 * @param {ReadonlyArray<S>} sections PATH_SECTIONS
 * @param {(section: S) => string} textOf the section's authored prose
 * @returns {{ id: string, heading: string, lede: string }[]}
 */
function pathSectionsOf(sections, textOf) {
  return sections
    .map((section) => ({
      id: section.id,
      heading: section.heading,
      lede: firstSentence(stripMarkdown(textOf(section))),
    }))
    .filter((section) => section.lede);
}

/**
 * The value MiniSearch reads for the `sections` field, both to store and to
 * index.
 *
 * It reads one value per field name for the two purposes: `storeFields` keeps
 * whatever `extractField` returns, and the indexer runs `stringifyField` —
 * `toString` by default — over the same value. What has to ship is the
 * anchors, an id and a heading per section, because that is what a result
 * needs to deep-link and to name the section it matched. What makes a section
 * findable is more than that: the heading plus its opening sentence. Giving
 * the array its own `toString` carries the second without putting it in the
 * first — JSON.stringify serializes the elements and ignores the property, so
 * public/search-index.json holds the anchors and the sentences live only as
 * postings in the inverted index, which is where a search reads them anyway.
 */
function sectionsField(sections) {
  const anchors = sections.map((section) => ({ id: section.id, heading: section.heading }));
  Object.defineProperty(anchors, "toString", {
    value: () => sections.map((section) => `${section.heading} ${section.lede}`).join(" "),
  });
  return anchors;
}

/**
 * How much of a hub's prose the index holds.
 *
 * Content documents hold 500 characters of body. A hub's body is its meta
 * description followed by its orientation paragraphs, and the description
 * alone runs to 160, so 500 would leave room for barely a sentence of the
 * prose that carries the words a reader types ("warm-up", "circle", "plateau").
 */
const HUB_BODY_MAX = 1000;

/**
 * What share of the corpus the index holds.
 *
 * Kept per layer as the documents are built, because the prebuild prints it
 * and search-depth.test.ts holds it to a floor. `source` is the document's
 * markdown body as entry 337 counted it; `indexed` is the body window plus
 * the section field, which is everything of the page's own prose that any
 * query can reach.
 */
const coverage = new Map();

function record(layer, source, indexed) {
  const seen = coverage.get(layer) ?? { docs: 0, source: 0, indexed: 0 };
  seen.docs += 1;
  seen.source += source;
  seen.indexed += indexed;
  coverage.set(layer, seen);
}

async function main() {
  const docs = [];
  let id = 0;

  // Atoms. The `requires` digraph is built once so each atom's links can
  // carry the direct view: the search page runs in the browser with no
  // other atom's links to reduce against, so the flag has to travel in the
  // index (mini-graph-picks.ts, tracker entry 302). Loaded through jiti, as
  // route-pages.mjs loads the route metadata, because the reduction is
  // TypeScript.
  const atomFiles = loadDir("atoms");
  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, {
    alias: { "@": path.join(__dirname, "..", "src") },
    // Its own cache, for the reason route-pages.mjs gives: jiti keys the
    // transform on source and file name, not on the JSX options.
    fsCache: path.join(__dirname, "..", "node_modules", ".cache", "jiti-search-index"),
  });
  const { requiresGraph } = await jiti.import("@/lib/direct-requires");
  // The shared options, through the same loader: the module folds British
  // spellings to American in `processTerm` and reads the pairs from
  // anchor-text.ts, which node cannot resolve natively. The path is the one
  // the browser loader imports; search-dialect.test.ts holds the two to it.
  const { MINISEARCH_OPTIONS } = await jiti.import("@/lib/search-index-options.mjs");
  const { flagDirectRequires } = await jiti.import("@/lib/mini-graph-picks");
  // The renderer's own slugifier, not a copy of it: a section anchor that
  // disagrees with the id on the page is a link to nowhere, and two
  // implementations of the same rule drift the moment one is edited.
  const { slugifyHeading } = await jiti.import("@/lib/content");
  // The path page's outline, through the same loader: the headings and ids
  // the page renders over its frontmatter fields, so this indexes the page's
  // own structure rather than a second description of it.
  const { PATH_SECTIONS, pathSectionText } = await jiti.import("@/lib/path-sections");
  const graph = requiresGraph(
    atomFiles
      .filter((a) => a.frontmatter.id)
      .map((a) => ({ id: a.frontmatter.id, links: a.frontmatter.links ?? [] })),
  );
  for (const a of atomFiles) {
    const fm = a.frontmatter;
    if (!fm.id || !fm.type) continue;
    const body = stripMarkdown(a.content).substring(0, BODY_MAX);
    const sections = sectionsField(sectionsOf(a.content, slugifyHeading));
    record("atom", a.content.length, body.length + String(sections).length);
    // Resolve links for graph viz (store as JSON string). A `requires` link
    // carries `direct: true|false`; the other relations carry no flag.
    const links = flagDirectRequires(
      (fm.links ?? [])
        .filter((l) => l.id && !l.id.startsWith("ref-"))
        .slice(0, 8)
        .map((l) => ({ id: l.id, relation: l.relation })),
      graph,
      fm.id,
    );

    docs.push({
      id: id++,
      docId: fm.id,
      title: fm.title ?? fm.id,
      url: atomTypeToUrl(fm.id, fm.type),
      layer: "atom",
      type: fm.type,
      tags: (fm.tags ?? []).join(" "),
      // The names the concept is also taught under. Declared for
      // schema.org alternateName, and until now visible only to crawlers:
      // searching this site for "Who/What/Where" or "Tag-out" — both
      // declared — returned nothing.
      aliases: (fm.aliases ?? []).join(" "),
      body,
      sections,
      links: JSON.stringify(links),
    });
  }

  // Threads
  for (const t of loadDir("threads")) {
    const fm = t.frontmatter;
    if (!fm.id) continue;
    const body = stripMarkdown(t.content).substring(0, BODY_MAX);
    const sections = sectionsField(sectionsOf(t.content, slugifyHeading));
    record("thread", t.content.length, body.length + String(sections).length);
    docs.push({
      id: id++,
      docId: fm.id,
      title: fm.title ?? fm.id,
      url: `/threads/${fm.id}`,
      layer: "thread",
      type: "thread",
      tags: (fm.tags ?? []).join(" "),
      body,
      sections,
    });
  }

  // Paths
  for (const p of loadDir("paths")) {
    const fm = p.frontmatter;
    if (!fm.id) continue;
    const body = stripMarkdown(p.content).substring(0, BODY_MAX);
    const sections = sectionsField([
      ...sectionsOf(p.content, slugifyHeading),
      ...pathSectionsOf(PATH_SECTIONS, (section) => pathSectionText(fm, section)),
    ]);
    record("path", p.content.length, body.length + String(sections).length);
    docs.push({
      id: id++,
      docId: fm.id,
      title: fm.title ?? fm.id,
      url: `/paths/${fm.id}`,
      layer: "path",
      type: "path",
      tags: (fm.audience ?? []).join(" "),
      body,
      sections,
    });
  }

  // Bridges
  for (const b of loadDir("bridges")) {
    const fm = b.frontmatter;
    const body = stripMarkdown(b.content).substring(0, BODY_MAX);
    const sections = sectionsField(sectionsOf(b.content, slugifyHeading));
    record("guide", b.content.length, body.length + String(sections).length);
    docs.push({
      id: id++,
      docId: b.slug,
      title: fm.title ?? b.slug,
      url: `/${b.slug}`,
      layer: "guide",
      type: "guide",
      tags: "",
      body,
      sections,
      // The reader's problem in the reader's words, from `primary_problem`.
      // It was on the CTA card and nowhere else: not in the body, not in the
      // description, not here. "conversation dead thirty seconds" returned
      // nothing for the guide written to answer it (novel-insights 291).
      problem: fm.primary_problem ?? "",
      // The guide's primary keyword, `target_keywords[0]`. A guide's title
      // is a sentence and a concept's title is a phrase, so where the two
      // share the phrase the concept won on the title boost: "yes and
      // improv" returned the Yes, And technique and "how to be present" the
      // Be Present principle, each ahead of the guide written to rank for
      // it (novel-insights 316). The primary only, not the whole list: the
      // secondaries lengthen the field and repeat its words ("trust" four
      // times across five keywords), and measured on 2026-09-22 no boost of
      // the full list returned 76 guides first without handing a one-word
      // concept title to its guide. See the options module for the boost.
      keyword: fm.target_keywords?.[0]?.keyword ?? "",
    });
  }

  // Route pages: one document each, in their own layer so the results page
  // can label and filter them. The title and description are the page's own
  // metadata; the body adds whatever orientation prose the route exports; the
  // aliases are the keywords route-keywords.ts registers for the route plus
  // the short label llms.txt uses for it — how the page's own title starts —
  // so "improv games" and "glossary" reach the hub on a name, not a mention.
  // Since 2026-09-22 they also carry the page's own `aliases`: the names a
  // hub had until tracker entry 264 renamed it ("Essays", "Library",
  // "Vocabulary"), which the rename had deleted from search, and the plain
  // word for an audience hub or a tool ("teacher", "picker") that the title
  // does not say (novel-insights 312).
  const routePages = await listRoutePages();
  for (const page of routePages) {
    // A hub lists the pages beneath it, so their names are its content too:
    // /listen is three show cards, and "podcast" is in each card's name and
    // only in the plural in the hub's own title.
    const gathered =
      page.url === "/"
        ? []
        : routePages.filter((p) => p.url.startsWith(`${page.url}/`)).map((p) => p.title);
    const prose = [page.description, ...page.orientation, ...gathered].join(" ");
    const body = prose.substring(0, HUB_BODY_MAX);
    // A route page has no markdown headings, so it has no sections; it is
    // recorded so the printed share covers every document in the index and
    // not only the ones that gained a field.
    record("hub", prose.length, body.length);
    docs.push({
      id: id++,
      docId: page.url,
      title: page.title,
      url: page.url,
      layer: "hub",
      type: "hub",
      tags: "",
      // The label is an alias only where it is a different name; a show or a
      // picker facet has no short label, and indexing its title twice would
      // count every title word double.
      aliases: [
        ...page.keywords,
        ...(page.label === page.title ? [] : [page.label]),
        ...page.aliases,
      ].join(" "),
      body,
    });
  }

  // Build index. The options are shared with the browser loader: MiniSearch
  // searches only the fields named when the index is *loaded*, and a second
  // copy here once listed `aliases` while the loader's did not. The same
  // goes for `processTerm`: a term folded one way at build time and another
  // at query time would never meet (tracker entry 311).
  const miniSearch = new MiniSearch(MINISEARCH_OPTIONS);

  miniSearch.addAll(docs);

  const json = JSON.stringify(miniSearch);
  fs.writeFileSync(OUTPUT, json);

  const sizeKB = (Buffer.byteLength(json) / 1024).toFixed(1);
  console.log(`Search index: ${docs.length} docs, ${sizeKB} KB → ${OUTPUT}`);

  // The index states its own depth. Every boost argument so far has been made
  // about fields over a body that was one paragraph per page, and nothing on
  // the build said so: entry 337 had to measure the corpus by hand to find
  // that 7% of it was reachable. search-depth.test.ts holds the same numbers
  // as a floor, so a change that narrows the window fails rather than prints.
  const totals = [...coverage.values()].reduce(
    (sum, layer) => ({
      source: sum.source + layer.source,
      indexed: sum.indexed + layer.indexed,
    }),
    { source: 0, indexed: 0 },
  );
  const share = ((totals.indexed / totals.source) * 100).toFixed(1);
  console.log(
    `search index: ${docs.length} documents, ${totals.indexed} of ${totals.source} characters indexed (${share}%)`,
  );
  for (const [layer, seen] of [...coverage].sort()) {
    const layerShare = ((seen.indexed / seen.source) * 100).toFixed(1);
    console.log(`  ${layer}: ${seen.docs} documents, ${layerShare}%`);
  }
}

// Exported for search-depth.test.ts, which recomputes the share per layer and
// must do it with this extractor rather than a second one that could agree
// with the test and not with the index. Running is guarded on direct
// invocation so importing the module does not rebuild the file.
export { BODY_MAX, pathSectionsOf, SECTION_LEDE_MAX, sectionsOf, stripMarkdown };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
