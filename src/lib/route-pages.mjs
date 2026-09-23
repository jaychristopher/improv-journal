/**
 * The route-defined pages: every URL the sitemap publishes that is not a
 * content file, resolved to what the page calls itself.
 *
 * Content pages — atoms, guides, lessons, paths — declare their own title and
 * description in frontmatter, and every tool that lists the site reads them
 * from there. The hubs, the audience pages, the traditions, the shows and the
 * tools live in `src/app` and declare nothing a script can read without
 * loading the page. So each tool that needed them kept its own list, and each
 * list covered what its author was looking at: llms.txt hand-listed twenty
 * hubs, route-keywords.ts registered four, and the search index held none —
 * "improv games", the largest term on the site, returned three guides and not
 * the page that owns it (novel-insights 226).
 *
 * This module is the one resolution. `listRoutePages()` walks the sitemap,
 * subtracts the content URLs, and loads each remaining page's own `metadata`
 * (or `generateMetadata`) through jiti — the loader Tailwind, ESLint and
 * build-llms-txt.mjs already use for TypeScript with path aliases — so the
 * title and description are the ones the page ships, read from source rather
 * than from a previous build. Orientation prose is attached where a page
 * exports it (guide categories, exercise-picker levels and focuses), and the
 * route's registered keywords come along from route-keywords.ts.
 *
 * Plain JavaScript because it runs under node in `prebuild`, before any
 * TypeScript loader is available.
 */

import fs from "fs";
import { createJiti } from "jiti";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP_DIR = path.join(ROOT, "src", "app");

/**
 * The route pages llms.txt lists by hand, with a short label and a one-line
 * summary each, and where a reader has a plain word for the page that its
 * title does not say, that word: `[url, label, summary, handles?]`.
 *
 * Labels are held here rather than derived, because llms.txt is built as
 * `prebuild` and wants a short entry: "Improv Glossary" for a page titled
 * "Improv Glossary: Vocabulary and Terms Explained" is a good entry, not
 * drift. The rule is that the label must be how the page's own title starts:
 * the resolver below throws where it is not, and llms-hubs.test.ts checks the
 * resolved title against the built page. A page in the sitemap that is
 * neither content nor listed here fails the resolver, and with it both the
 * llms.txt and the search-index builds.
 *
 * Handles are for site search only, and only where the title cannot carry
 * the word. "Learning to Teach" is the teacher hub, and a reader types
 * "teacher"; "Improv Podcasts" is a plural the singular reaches only as a
 * prefix, behind a book whose title says "podcast" outright (tracker entry
 * 312). They join the hub's former names from hubs.ts as the page's
 * `aliases`, so they are boosted as a name and not as a mention.
 */
const HUBS = [
  ["/", "Improv Skills for Everyday Life", "The homepage: what the site is, and where to start."],
  [
    "/guides",
    "Improv Guides",
    "Problem-first entry points connecting a difficulty to improv practice.",
  ],
  [
    "/topics/personal-growth",
    "Personal Growth guides",
    "Overthinking, confidence, creativity, fear, presence.",
  ],
  [
    "/topics/communication",
    "Relationships & Communication guides",
    "Listening, conversation, conflict, connection.",
  ],
  ["/topics/teams", "Teams & Leadership guides", "Team building, trust, collaboration, feedback."],
  ["/topics/improv-skills", "Improv Skills guides", "Fundamentals, practice, and getting unstuck."],
  ["/how-it-works", "How Improv Works", "The laws and principles the whole system rests on."],
  [
    "/how-it-works/principles",
    "The 9 Improv Principles",
    "The behavioural set, what each is for, and which to work on first.",
  ],
  [
    "/how-it-works/diagnosis",
    "When It Breaks",
    "Failure modes, what causes each, and how a scene recovers.",
  ],
  [
    "/how-it-works/the-core",
    "The Core",
    "The ideas that require each other, listed: what 'and the core' means wherever the site says it.",
  ],
  ["/practice", "Improv Practice", "Exercises, techniques, formats and vocabulary."],
  [
    "/practice/exercises",
    "Improv Exercises",
    "Drills that each train one skill, filterable by level and focus.",
  ],
  [
    "/practice/techniques",
    "Improv Techniques",
    "The specific moves, and which one a scene needs when it stalls.",
  ],
  [
    "/practice/formats",
    "Improv Formats",
    "Long form and short form, every format, and how to choose one.",
  ],
  ["/improv-games", "Improv Games", "Every improv game and exercise, by level and skill focus."],
  ["/practice/vocabulary", "Improv Glossary", "Improv terms, each defined in one line."],
  ["/library", "Improv Reading List", "The books and sources behind the material."],
  ["/threads", "Improv Lessons", "Each idea worked through in full."],
  ["/paths", "Improv Learning Paths", "Structured journeys for a particular kind of reader."],
  ["/traditions", "Improv Traditions", "Johnstone, Spolin, Close, UCB and Annoyance compared."],
  ["/listen", "Improv Podcasts", "The material as podcast audio, across three shows.", ["podcast"]],
  ["/resources", "Improv Resources", "Paths, podcasts and reading lists, gathered in one place."],
  ["/about", "About", "Who writes this, the sources used, and how the site is built."],
];

/**
 * The audience hubs: one entry point per kind of reader. Each handle is the
 * plain word for the reader the page is for — the word in its URL, which
 * three of the five titles do not say.
 */
const AUDIENCES = [
  [
    "/learn/beginner",
    "Improv for Beginners",
    "Where to start with no experience at all.",
    ["beginner"],
  ],
  [
    "/learn/intermediate",
    "Breaking Through a Plateau",
    "For improvisers who know the basics and have stalled.",
    ["intermediate"],
  ],
  [
    "/learn/teacher",
    "Learning to Teach",
    "For anyone running a class, a workshop or a team.",
    ["teacher"],
  ],
  [
    "/learn/performer",
    "Pushing Toward Mastery",
    "For experienced performers working on ensemble depth and voice.",
    ["performer"],
  ],
  [
    "/learn/advanced",
    "Research & Reference",
    "The science, the sources and the system underneath.",
    ["advanced"],
  ],
];

/** The five schools the material is grounded in. */
const TRADITIONS = [
  [
    "/traditions/johnstone",
    "Keith Johnstone",
    "Status, spontaneity, and the Theatresports school.",
  ],
  [
    "/traditions/spolin",
    "Spolin and the Point of Concentration",
    "Theater games, side-coaching, and the origin of the exercise.",
  ],
  ["/traditions/close", "iO and the Harold", "Del Close, Charna Halpern, and long-form as art."],
  [
    "/traditions/ucb",
    "Upright Citizens Brigade",
    "Game of the scene, base reality, and the UCB manual.",
  ],
  [
    "/traditions/annoyance",
    "Annoyance Theatre / TJ & Dave",
    "Take care of yourself first, and the slow-play two-person show.",
  ],
];

const TOOLS = [
  [
    "/tools/exercise-picker",
    "Improv Exercise Picker",
    "Find an exercise by level and skill focus.",
    ["picker"],
  ],
  [
    "/tools/improv-prompt-generator",
    "Improv Prompt Generator",
    "Ranked scene starters for any room, on demand.",
    ["prompts"],
  ],
];

/**
 * The sections, in the order llms.txt files them. The four hand-labelled
 * lists come first; the shows and the exercise-picker pages are derived from
 * content and picker-config, the way the sitemap derives them.
 */
const SECTION_ORDER = ["hub", "audience", "tradition", "tool", "show", "facet"];

const LISTED = [
  ["hub", HUBS],
  ["audience", AUDIENCES],
  ["tradition", TRADITIONS],
  ["tool", TOOLS],
];

/**
 * The `page.tsx` that serves a URL, and the params it would receive.
 *
 * Walks `src/app` segment by segment: a literal directory wins, otherwise the
 * one `[param]` directory at that level takes the segment as its value. Route
 * groups and parallel routes are not used here and are not handled.
 */
function resolvePageFile(url) {
  const segments = url === "/" ? [] : url.slice(1).split("/");
  let dir = APP_DIR;
  const params = {};
  for (const segment of segments) {
    const literal = path.join(dir, segment);
    if (fs.existsSync(literal) && fs.statSync(literal).isDirectory()) {
      dir = literal;
      continue;
    }
    const dynamic = fs.readdirSync(dir).find((d) => /^\[[^\]]+\]$/.test(d));
    if (!dynamic) return null;
    params[dynamic.slice(1, -1)] = segment;
    dir = path.join(dir, dynamic);
  }
  const file = path.join(dir, "page.tsx");
  return fs.existsSync(file) ? { file, params } : null;
}

/** The title as `<title>` renders it, without the brand the layout appends. */
function plainTitle(title, siteName) {
  const text = typeof title === "string" ? title : (title?.absolute ?? "");
  const brand = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`\\s*\\|\\s*${brand}$`), "");
}

/**
 * Every route-defined page the sitemap publishes, in llms.txt's section order.
 *
 * @returns {Promise<Array<{
 *   url: string,
 *   section: "hub" | "audience" | "tradition" | "tool" | "show" | "facet",
 *   title: string,
 *   description: string,
 *   label: string,
 *   summary: string,
 *   orientation: string[],
 *   keywords: string[],
 *   aliases: string[],
 * }>>}
 *
 * `title` and `description` are the page's own metadata, loaded from source.
 * `label` and `summary` are the short entry llms.txt prints: the hand-written
 * pair for the listed sections, the show's name and description for a show,
 * and the level or focus title and description for an exercise-picker page.
 * A label is always how the page's own title starts, and the resolver throws
 * where it is not. `orientation` is the page's orienting prose where the
 * route exports it (guide categories, picker levels and focuses); `keywords`
 * are what route-keywords.ts registers for the route. `aliases` are the
 * other names a reader may type for the page, each only where the title
 * does not already start with it: the hub's nav label and breadcrumb from
 * hubs.ts, its `formerNames` there — the names it had on some surface until
 * tracker entry 264 renamed it — and the handles the lists above declare.
 * The search index writes them into its boosted `aliases` field, beside the
 * route's keywords and its short label.
 */
export async function listRoutePages() {
  const jiti = createJiti(import.meta.url, {
    alias: { "@": path.join(ROOT, "src") },
    // Pages evaluate JSX at module scope (`/paths` builds its steps as
    // fragments), and the classic runtime would look for a React global.
    jsx: { runtime: "automatic" },
    // jiti keys its transform cache on the source and the file name, not on
    // the JSX runtime, so a `.tsx` transpiled by a loader with different JSX
    // options would be served back here as-is. A cache of its own avoids that.
    fsCache: path.join(ROOT, "node_modules", ".cache", "jiti-route-pages"),
  });

  // Sequential on purpose: these share most of their import graph, and jiti
  // transpiling the same modules under concurrent imports took twice as long.
  const content = await jiti.import("@/lib/content");
  const { SITE_URL, SITE_NAME } = await jiti.import("@/lib/seo");
  const { GUIDE_CATEGORIES } = await jiti.import("@/lib/guide-categories");
  const { LEVELS, FOCUSES } = await jiti.import("@/app/tools/exercise-picker/picker-config");
  const { ROUTE_KEYWORDS } = await jiti.import("@/lib/route-keywords");
  const { ALL_HUBS, HUBS: NAMED_HUBS } = await jiti.import("@/lib/hubs");
  const sitemap = (await jiti.import("@/app/sitemap")).default;

  // The names a hub goes by that its title may not say, keyed by route: the
  // nav and footer label and the breadcrumb, which are the names a reader
  // learns first ("Listen" for the page titled "Improv Podcasts", "Diagnosis"
  // for "When It Breaks"), and the names the hub had before its surfaces
  // were made to agree, which only the renamed hubs declare. A name that is
  // already how the title starts is dropped below, as the llms label is.
  // The level ladder's entry stands for five audience pages and its label
  // is the ladder's, not the beginner page's — hub-names.test.ts holds that
  // page to its own title for the same reason — and attached to the page it
  // lengthened the alias field enough to push "beginner" from third to
  // seventh, so it is left out.
  const hubNames = new Map(
    ALL_HUBS.map((hub) => [
      hub.href,
      [
        ...(hub.href === NAMED_HUBS.learn.href ? [] : [hub.label, hub.crumb]),
        ...(hub.formerNames ?? []),
      ],
    ]),
  );

  const [atoms, bridges, threads, paths, shows, entries] = await Promise.all([
    content.loadAtoms(),
    content.loadBridges(),
    content.loadThreads(),
    content.loadPaths(),
    content.loadShows(),
    sitemap(),
  ]);

  const contentUrls = new Set([
    ...atoms.map((a) => content.getAtomUrl({ id: a.frontmatter.id, type: a.frontmatter.type })),
    ...bridges.map((b) => `/${b.slug}`),
    ...threads.map((t) => `/threads/${t.frontmatter.id}`),
    ...paths.map((p) => `/paths/${p.frontmatter.id}`),
  ]);

  // Section, label, summary and list position for every route the sitemap
  // can publish; the sitemap decides which of them it does.
  const known = new Map();
  for (const [section, list] of LISTED) {
    list.forEach(([url, label, summary, handles = []], index) => {
      known.set(url, { section, label, summary, orientation: [], handles, index });
    });
  }
  shows
    .slice()
    .sort((a, b) => String(a.frontmatter.title).localeCompare(String(b.frontmatter.title)))
    .forEach((show, index) => {
      known.set(`/listen/${show.frontmatter.id}`, {
        section: "show",
        label: `${show.frontmatter.title} Podcast`,
        summary: show.frontmatter.description ?? "",
        orientation: [],
        index,
      });
    });
  let facetIndex = 0;
  for (const level of LEVELS) {
    const url = `/tools/exercise-picker/${level.slug}`;
    known.set(url, {
      section: "facet",
      label: level.title,
      summary: level.description,
      orientation: level.orientation,
      index: facetIndex++,
    });
    for (const focus of FOCUSES) {
      known.set(`${url}/${focus.slug}`, {
        section: "facet",
        label: `${level.label} ${focus.label} Improv Exercises`,
        summary: focus.description,
        orientation: focus.orientation,
        index: facetIndex++,
      });
    }
  }
  for (const category of GUIDE_CATEGORIES) {
    const entry = known.get(`/topics/${category.slug}`);
    if (entry) entry.orientation = category.orientation;
  }

  const modules = new Map();
  const pages = [];
  for (const entry of entries) {
    const url = entry.url.replace(SITE_URL, "") || "/";
    if (contentUrls.has(url)) continue;

    const listing = known.get(url);
    if (!listing) {
      throw new Error(
        `route-pages: the sitemap publishes ${url}, which is neither content nor a listed route page`,
      );
    }

    const resolved = resolvePageFile(url);
    if (!resolved) throw new Error(`route-pages: no page.tsx serves ${url}`);

    let mod = modules.get(resolved.file);
    if (!mod) {
      try {
        mod = await jiti.import(resolved.file);
      } catch (error) {
        throw new Error(`route-pages: could not load the page for ${url}: ${error.message}`);
      }
      modules.set(resolved.file, mod);
    }
    const metadata =
      mod.metadata ??
      (mod.generateMetadata
        ? await mod.generateMetadata({ params: Promise.resolve(resolved.params) })
        : null);
    if (!metadata) {
      throw new Error(`route-pages: ${url} exports neither metadata nor generateMetadata`);
    }

    const title = plainTitle(metadata.title, SITE_NAME);
    if (!title.toLowerCase().startsWith(listing.label.toLowerCase())) {
      throw new Error(
        `route-pages: ${url} is listed as "${listing.label}" but its title is "${title}"`,
      );
    }

    pages.push({
      url,
      section: listing.section,
      title,
      description: String(metadata.description ?? "").trim(),
      label: listing.label,
      summary: listing.summary,
      orientation: listing.orientation,
      keywords: (ROUTE_KEYWORDS[url] ?? []).map((k) => k.keyword),
      aliases: [
        ...new Set(
          [...(hubNames.get(url) ?? []), ...(listing.handles ?? [])].filter(
            (name) => !title.toLowerCase().startsWith(name.toLowerCase()),
          ),
        ),
      ],
      index: listing.index,
    });
  }

  pages.sort(
    (a, b) =>
      SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section) || a.index - b.index,
  );
  return pages.map(({ index: _index, ...page }) => page);
}
