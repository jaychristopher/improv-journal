/**
 * Build public/llms.txt from the content and the route registry.
 *
 * The edge policy is no AI training but reference use allowed, so the
 * live-fetch agents still come and llms.txt is the index they look for. It was
 * hand-maintained, so it drifted: it named 14 URLs against 295 pages — 4%
 * coverage — with no hub, no glossary, no atom and no guide category in it.
 *
 * Generating it from the same content the site renders means it stays complete
 * and cannot fall behind, the way search-index.json already does.
 *
 * The second version generated the content pages and hand-listed twenty hubs,
 * and said of itself "it lists everything rather than a selection". It listed
 * 339 of the sitemap's 364 URLs: the five audience hubs, the five tradition
 * pages, the three podcast shows, the essays index, the resources hub, the
 * prompt generator, twelve exercise-picker pages and the homepage were not in
 * it — exactly the route-defined pages, since the loaders only see content/.
 * It also ordered every section alphabetically, so an AI reader met "2 Person
 * Improv Games" before any law, and cut 67 summaries at 160 characters with
 * an ellipsis the page-level description test forbids.
 *
 * So this version walks the sitemap. `src/app/sitemap.ts` is the one place
 * that knows every canonical URL, and it is TypeScript with path aliases, so
 * it is loaded through jiti (the same loader Tailwind and ESLint use for their
 * configs). Every URL the sitemap emits must be in the output and nothing
 * else may be, or the build fails here rather than publishing a partial index.
 *
 * The route-defined pages — the hubs, the audience pages, the traditions, the
 * shows and the tools — come from `listRoutePages()` in src/lib/route-pages.mjs,
 * which holds the hand-written labels this file used to keep and resolves each
 * page's own title beside them. The search index reads the same list, so the
 * two cannot disagree about what a hub is called (novel-insights 226).
 *
 * Summaries come from the same functions the pages use for their meta
 * descriptions, which pack whole sentences and never end mid-word.
 */

import fs from "fs";
import { createJiti } from "jiti";
import path from "path";
import { fileURLToPath } from "url";

import { listRoutePages } from "../src/lib/route-pages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT = path.join(ROOT, "public", "llms.txt");

const jiti = createJiti(import.meta.url, { alias: { "@": path.join(ROOT, "src") } });

const content = await jiti.import("@/lib/content");
const seo = await jiti.import("@/lib/seo");
const { getNextPath } = await jiti.import("@/lib/path-progression");
const sitemap = (await jiti.import("@/app/sitemap")).default;

const { SITE_URL } = seo;

/** How long a summary may run. The pages use 158; the index has room for a little more. */
const SUMMARY_MAX = 200;

const ATOM_SECTIONS = [
  { heading: "Laws — the underlying physics", types: ["law"] },
  { heading: "Principles — behavioural guidelines", types: ["principle"] },
  { heading: "Insights", types: ["insight"] },
  { heading: "Failure modes and patterns", types: ["antipattern", "pattern", "framework"] },
  { heading: "Vocabulary — improv terms defined", types: ["definition"] },
  { heading: "Techniques", types: ["technique", "pedagogy"] },
  { heading: "Exercises and games", types: ["exercise"] },
  { heading: "Formats", types: ["format"] },
];

const REFERENCE_SECTION = {
  heading: "Reading list — the works this site cites",
  types: ["reference"],
};

function line(title, url, description) {
  const desc = description ? `: ${description}` : "";
  return `- [${title}](${SITE_URL}${url})${desc}`;
}

/**
 * A guide's line, with the reader's problem after the summary.
 *
 * `primary_problem` is the one sentence on the site that states a reader's
 * problem in the reader's words, and it rendered only on the CTA card at the
 * foot of the guide: not in the description this summary is cut from, and
 * so not here. An AI reader matching a question against this file saw the
 * keyword-shaped snippet and never the sentence the guide was written to
 * answer (novel-insights 291). "For: <sentence>." follows the summary so the
 * two statements of intent sit on one line; a guide without one is unchanged.
 */
function guideLine(bridge) {
  const summary = summarise(bridge.frontmatter.description);
  const problem = bridge.frontmatter.primary_problem?.trim();
  const description = problem ? `${summary} For: ${problem}.` : summary;
  return line(bridge.frontmatter.title, `/${bridge.slug}`, description);
}

function section(heading, lines) {
  return lines.length === 0 ? "" : `## ${heading}\n\n${lines.join("\n")}\n`;
}

/**
 * A summary that ends where a sentence ends.
 *
 * `metaDescription` packs whole sentences and falls back to a clause boundary,
 * closed with a stop, and only after that to a word boundary with a real
 * ellipsis. The old summariser here cut at 160 characters with "..." and did
 * it to 67 of 339 entries — on the one surface where a truncated sentence is
 * the whole of what the reader gets.
 */
function summarise(text) {
  return seo.metaDescription(text ?? "", SUMMARY_MAX, 0.5);
}

const byTitle = (a, b) => String(a.frontmatter.title).localeCompare(String(b.frontmatter.title));

/**
 * What a guide could bring in — the same signal the footer promotes by (see
 * top-guides.ts): traffic potential where measured, peak volume where not.
 */
function reach(bridge) {
  const keywords = bridge.frontmatter.target_keywords ?? [];
  const primary = keywords[0];
  if (primary?.traffic_potential) return primary.traffic_potential;
  return keywords.length > 0 ? Math.max(...keywords.map((k) => k.volume ?? 0)) : 0;
}

/**
 * The paths in the order the site itself suggests taking them.
 *
 * path-progression.ts holds a "what next" edge from each path; followed from
 * the roots, that is a curriculum. The longest chain — the one that starts at
 * the beginners' foundations and runs to the reference guide — goes first,
 * then the shorter branches (life, teams, teaching) join where they lead in.
 */
function pathsInProgressionOrder(paths) {
  const ids = new Set(paths.map((p) => p.frontmatter.id));
  const next = (id) => getNextPath(id)?.id ?? null;
  const chain = (id) => {
    const out = [];
    for (let cur = id; cur && ids.has(cur) && !out.includes(cur); cur = next(cur)) out.push(cur);
    return out;
  };
  const targets = new Set([...ids].map(next).filter(Boolean));
  const roots = [...ids].filter((id) => !targets.has(id));
  const ordered = [];
  for (const root of roots.sort(
    (a, b) => chain(b).length - chain(a).length || a.localeCompare(b),
  )) {
    for (const id of chain(root)) if (!ordered.includes(id)) ordered.push(id);
  }
  for (const id of [...ids].sort()) if (!ordered.includes(id)) ordered.push(id);
  const byId = new Map(paths.map((p) => [p.frontmatter.id, p]));
  return ordered.map((id) => byId.get(id));
}

const words = [
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
];
const word = (n) => words[n] ?? String(n);

async function main() {
  const [atoms, bridges, threads, paths, sitemapEntries] = await Promise.all([
    content.loadAtoms(),
    content.loadBridges(),
    content.loadThreads(),
    content.loadPaths(),
    sitemap(),
  ]);
  // Every route-defined page the sitemap publishes, already in this file's
  // section order, each with the short label it is listed under.
  const routePages = await listRoutePages();
  const routeSection = (section) =>
    routePages
      .filter((p) => p.section === section)
      .map((p) => line(p.label, p.url, summarise(p.summary)));

  const laws = atoms.filter((a) => a.frontmatter.type === "law").length;
  const principles = atoms.filter((a) => a.frontmatter.type === "principle").length;
  const tagline = `${word(laws).charAt(0).toUpperCase()}${word(laws).slice(1)} laws, ${word(principles)} principles`;

  // Built as one block: blank lines are load-bearing in markdown, and the
  // per-section filter below would drop them if they were separate entries.
  const header = [
    `# The Physics of Connection`,
    `> ${tagline} — discovered on the improv stage, applicable everywhere. A knowledge graph for the art of human connection.`,
    `The Physics of Connection applies improv principles to everyday human challenges: overthinking, awkwardness, team dynamics, listening, assertiveness, public speaking, and more. The material is grounded in roughly sixty years of improv practice across five traditions (Johnstone, Spolin, Close/Halpern, UCB, Annoyance/TJ & Dave), and cites its primary sources.`,
    `This file is generated from the site's content and its sitemap, so it lists every page rather than a selection. Sections run from the entry points to the primitives: guides first, then the laws and concepts they rest on, then the lessons and paths that teach them. Within a section, guides are ordered by the search demand they answer and concepts by how many other concepts depend on them.`,
  ].join("\n\n");

  const parts = [header];

  // The graph itself, named where the file's own audience starts reading.
  //
  // /api/graph is the only machine-readable statement of the whole corpus the
  // site publishes, and this file — written for exactly the readers who want
  // that format — did not mention it (novel-insights 354). Deliberately bare
  // text rather than a markdown link: the check at the foot of this file
  // requires every linked URL to appear in the sitemap, and a static route
  // handler is not a page the sitemap publishes.
  const graphLine = `- The whole graph as JSON — every source, concept, guide, lesson and path, with the relations between them: ${SITE_URL}/api/graph`;

  parts.push(section("Start here", [...routeSection("hub"), graphLine]));
  parts.push(section("By reader", routeSection("audience")));

  // Guides, by the reach of the term each answers — the footer's own order.
  parts.push(
    section(
      `Guides (${bridges.length})`,
      bridges
        .slice()
        .sort((a, b) => reach(b) - reach(a) || byTitle(a, b))
        .map(guideLine),
    ),
  );

  // Concepts, most depended-on first: the count of other atoms that link to
  // each one is the graph's own importance signal, and it puts the founding
  // ideas at the head of each section instead of whatever sorts first.
  const inbound = new Map();
  for (const a of atoms) {
    for (const l of a.frontmatter.links ?? []) inbound.set(l.id, (inbound.get(l.id) ?? 0) + 1);
  }
  const byDependents = (a, b) =>
    (inbound.get(b.frontmatter.id) ?? 0) - (inbound.get(a.frontmatter.id) ?? 0) || byTitle(a, b);
  const atomLine = (a) =>
    line(
      a.frontmatter.title,
      content.getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type }),
      summarise(seo.atomPageDescription(a)),
    );
  const atomSection = ({ heading, types }) => {
    const items = atoms.filter((a) => types.includes(a.frontmatter.type)).sort(byDependents);
    return section(`${heading} (${items.length})`, items.map(atomLine));
  };
  for (const s of ATOM_SECTIONS) parts.push(atomSection(s));

  // Lessons in the order the paths teach them, then the ones no path sequences.
  const orderedPaths = pathsInProgressionOrder(paths);
  const lessonOrder = new Map();
  for (const p of orderedPaths) {
    for (const id of p.frontmatter.threads ?? []) {
      if (!lessonOrder.has(id)) lessonOrder.set(id, lessonOrder.size);
    }
  }
  const byLessonOrder = (a, b) =>
    (lessonOrder.get(a.frontmatter.id) ?? Infinity) -
      (lessonOrder.get(b.frontmatter.id) ?? Infinity) || byTitle(a, b);
  parts.push(
    section(
      `Lessons (${threads.length})`,
      threads
        .slice()
        .sort(byLessonOrder)
        .map((t) =>
          line(
            t.frontmatter.title,
            `/threads/${t.frontmatter.id}`,
            summarise(
              t.frontmatter.description?.trim() ||
                seo.leadParagraph(seo.stripLeadLabel(t.content), SUMMARY_MAX),
            ),
          ),
        ),
    ),
  );

  parts.push(
    section(
      `Learning paths (${paths.length})`,
      orderedPaths.map((p) =>
        line(
          p.frontmatter.title,
          `/paths/${p.frontmatter.id}`,
          summarise(p.frontmatter.description),
        ),
      ),
    ),
  );

  parts.push(section("Traditions", routeSection("tradition")));

  const podcasts = routeSection("show");
  parts.push(section(`Podcasts (${podcasts.length})`, podcasts));

  // Tools, then the picker's published facets. Only the facets the sitemap
  // publishes are in the route list — a facet with too few exercises is
  // served and not indexed, and this file agrees with the sitemap on that.
  parts.push(section("Tools", [...routeSection("tool"), ...routeSection("facet")]));

  parts.push(atomSection(REFERENCE_SECTION));

  parts.push(
    `## Author\n\nJay Christopher — improv practitioner, teacher, and researcher. ${SITE_URL}/about\n`,
  );

  const out =
    parts
      .filter(Boolean)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n";

  // "Everything" has to be true. The sitemap is the site's statement of what
  // it publishes; this file is its statement to AI readers; they must agree.
  const sitemapUrls = new Set(sitemapEntries.map((e) => e.url.replace(SITE_URL, "") || "/"));
  const listed = new Set(
    [...out.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map((m) => m[1].replace(SITE_URL, "") || "/"),
  );
  const missing = [...sitemapUrls].filter((u) => !listed.has(u));
  const extra = [...listed].filter((u) => !sitemapUrls.has(u));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `llms.txt disagrees with the sitemap.\n` +
        `  in the sitemap, not in llms.txt: ${missing.join(", ") || "none"}\n` +
        `  in llms.txt, not in the sitemap: ${extra.join(", ") || "none"}`,
    );
  }
  const dangling = out.split("\n").filter((l) => /(\.\.\.|…)$/.test(l));
  if (dangling.length > 0) {
    throw new Error(
      `llms.txt has ${dangling.length} summaries cut mid-sentence:\n${dangling.join("\n")}`,
    );
  }

  fs.writeFileSync(OUTPUT, out, "utf-8");

  const sizeKB = (Buffer.byteLength(out) / 1024).toFixed(1);
  console.log(
    `llms.txt: ${listed.size} urls (sitemap ${sitemapUrls.size}), ${sizeKB} KB → ${OUTPUT}`,
  );
}

await main();
