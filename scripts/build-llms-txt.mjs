/**
 * Build public/llms.txt from the content.
 *
 * The edge policy is no AI training but reference use allowed, so the
 * live-fetch agents still come and llms.txt is the index they look for. It was
 * hand-maintained, so it drifted: it named 14 URLs against 295 pages — 4%
 * coverage — with no hub, no glossary, no atom and no guide category in it.
 *
 * Generating it from the same content the site renders means it stays complete
 * and cannot fall behind, the way search-index.json already does.
 */

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.join(__dirname, "..", "content");
const OUTPUT = path.join(__dirname, "..", "public", "llms.txt");

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.physicsofconnection.com";

// Duplicate of getAtomUrl — avoids the ESM import chain from content.ts,
// matching how build-search-index.mjs handles the same problem.
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
      return { frontmatter: data, content, slug: path.basename(f, ".md") };
    });
}

/** First prose paragraph, stripped of formatting and any leading bold label. */
function summarise(md, maxLen = 160) {
  // Normalised first: a Windows checkout writes paragraph breaks as CR LF,
  // and the split below cannot match those, which would hand every AI crawler
  // the entire document as this page summary.
  const body = md
    .replace(/\r\n?/g, "\n")
    .replace(/^---[\s\S]*?---\n*/m, "")
    .replace(/^#{1,6}\s+.*$/gm, "");
  const paragraph = body
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .find((b) => b.length > 0 && !b.startsWith(">"));
  if (!paragraph) return "";

  const text = paragraph
    .replace(/^\s*\*\*[^*]+\*\*:?\s*/, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const stop = cut.lastIndexOf(". ");
  return stop > maxLen * 0.5 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}...`;
}

function line(title, url, description) {
  const desc = description ? `: ${description}` : "";
  return `- [${title}](${SITE_URL}${url})${desc}`;
}

function section(heading, lines) {
  return lines.length === 0 ? "" : `## ${heading}\n\n${lines.join("\n")}\n`;
}

const ATOM_SECTIONS = [
  { heading: "Laws — the underlying physics", types: ["law"] },
  { heading: "Principles — behavioural guidelines", types: ["principle"] },
  { heading: "Insights", types: ["insight"] },
  { heading: "Vocabulary — improv terms defined", types: ["definition"] },
  { heading: "Techniques", types: ["technique", "pedagogy"] },
  { heading: "Exercises and games", types: ["exercise"] },
  { heading: "Formats", types: ["format"] },
  { heading: "Failure modes and patterns", types: ["antipattern", "pattern", "framework"] },
  { heading: "Reading list — the works this site cites", types: ["reference"] },
];

/**
 * The hubs, and what each is for.
 *
 * Titles are held here rather than derived, because this script runs as
 * `prebuild` — .next holds the previous build when it runs, so reading titles
 * from the output would publish whatever was true last time.
 *
 * That makes the list drift, and it had: eight of thirteen entries named a
 * page something the page no longer called itself. "Listen" had become
 * "Improv Podcasts", "Reading List" had become "Improv Reading List", and so
 * on down the list — this is the file AI crawlers read to find out what the
 * site contains, describing the site as it was.
 *
 * A shorter label is still allowed. "Improv Glossary" for a page titled
 * "Improv Glossary: Vocabulary and Terms Explained" is a good entry, not
 * drift. The guard in llms-hubs.test.ts enforces the weaker rule that keeps
 * that legal: the label here must be how the page's own title starts.
 */
const HUBS = [
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
  ["/paths", "Improv Learning Paths", "Structured journeys for a particular kind of reader."],
  ["/traditions", "Improv Traditions", "Johnstone, Spolin, Close, UCB and Annoyance compared."],
  ["/listen", "Improv Podcasts", "The material as podcast audio, across three shows."],
  [
    "/tools/exercise-picker",
    "Improv Exercise Picker",
    "Find an exercise by level and skill focus.",
  ],
  ["/about", "About", "Who writes this, the sources used, and how the site is built."],
];

function main() {
  const atoms = loadDir("atoms");
  const bridges = loadDir("bridges");
  const threads = loadDir("threads");
  const paths = loadDir("paths");

  const laws = atoms.filter((a) => a.frontmatter.type === "law").length;
  const principles = atoms.filter((a) => a.frontmatter.type === "principle").length;
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
  const tagline = `${word(laws).charAt(0).toUpperCase()}${word(laws).slice(1)} laws, ${word(principles)} principles`;

  // Built as one block: blank lines are load-bearing in markdown, and the
  // per-section filter below would drop them if they were separate entries.
  const header = [
    `# The Physics of Connection`,
    `> ${tagline} — discovered on the improv stage, applicable everywhere. A knowledge graph for the art of human connection.`,
    `The Physics of Connection applies improv principles to everyday human challenges: overthinking, awkwardness, team dynamics, listening, assertiveness, public speaking, and more. The material is grounded in roughly sixty years of improv practice across five traditions (Johnstone, Spolin, Close/Halpern, UCB, Annoyance/TJ & Dave), and cites its primary sources.`,
    `This file is generated from the site's content, so it lists everything rather than a selection.`,
  ].join("\n\n");

  const parts = [header];

  parts.push(
    section(
      "Start here",
      HUBS.map(([url, title, desc]) => line(title, url, desc)),
    ),
  );

  parts.push(
    section(
      `Guides (${bridges.length})`,
      bridges
        .slice()
        .sort((a, b) => a.slug.localeCompare(b.slug))
        .map((b) => line(b.frontmatter.title, `/${b.slug}`, b.frontmatter.description)),
    ),
  );

  for (const { heading, types } of ATOM_SECTIONS) {
    const items = atoms
      .filter((a) => types.includes(a.frontmatter.type))
      .sort((a, b) => String(a.frontmatter.title).localeCompare(String(b.frontmatter.title)));
    parts.push(
      section(
        `${heading} (${items.length})`,
        items.map((a) =>
          line(
            a.frontmatter.title,
            atomTypeToUrl(a.frontmatter.id, a.frontmatter.type),
            summarise(a.content),
          ),
        ),
      ),
    );
  }

  parts.push(
    section(
      `Lessons (${threads.length})`,
      threads
        .sort((a, b) => String(a.frontmatter.title).localeCompare(String(b.frontmatter.title)))
        .map((t) =>
          line(t.frontmatter.title, `/threads/${t.frontmatter.id}`, summarise(t.content)),
        ),
    ),
  );

  parts.push(
    section(
      `Learning paths (${paths.length})`,
      paths
        .sort((a, b) => String(a.frontmatter.title).localeCompare(String(b.frontmatter.title)))
        .map((p) =>
          line(p.frontmatter.title, `/paths/${p.frontmatter.id}`, p.frontmatter.description),
        ),
    ),
  );

  parts.push(
    `## Author\n\nJay Christopher — improv practitioner, teacher, and researcher. ${SITE_URL}/about\n`,
  );

  const out =
    parts
      .filter(Boolean)
      .join("\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n";
  fs.writeFileSync(OUTPUT, out, "utf-8");

  const urls = (out.match(/\]\(https?:\/\//g) ?? []).length;
  const sizeKB = (Buffer.byteLength(out) / 1024).toFixed(1);
  console.log(`llms.txt: ${urls} urls, ${sizeKB} KB → ${OUTPUT}`);
}

main();
