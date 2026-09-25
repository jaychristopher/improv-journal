import fs from "fs";
import matter from "gray-matter";
import path from "path";
import { describe, expect, it } from "vitest";

import { loadPaths } from "../content";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The lesson layer does not compete for search, and this is the decision.
 *
 * Twenty-five lessons and eleven paths, about 90,000 rendered words and a
 * thousand internal links, every title leading with an image, and one page of
 * the 36 surfaced by Search Console in eight months. The obvious move was a
 * searchable phrase at the front of each title. Retrieving the demand first
 * said no twice (SA-1.2, 2026-09-25): the vocabulary the lessons teach is
 * blank or zero in the keyword index for 37 of 50 terms, and the five terms
 * near the layer that do carry volume — improv exercises, improv for
 * beginners, improv formats, the Harold, yes and — are already the lead of a
 * hub, a concept page or a guide on this site. A lesson retitled toward any of
 * them competes with a page of ours that ranks better. The account is above
 * generateMetadata in threads/[slug]/page.tsx.
 *
 * Three things hold the decision in place. No thread or path carries keyword
 * metadata, so none is a ranking candidate by accident. No thread or path
 * title leads with a phrase another page's built title already leads with —
 * the collision the `parent` test cannot see, because hubs declare no parent;
 * this would have failed the practice-lab retitle the card anticipated. And
 * the two titles that lead with an uncontested term stay as they are: the one
 * page in the layer Google has shown, and the one deliberate test.
 */
const KEYWORD_FIELDS = [
  "target_keywords",
  "serp_verdict",
  "serp_min_dr",
  "serp_checked",
  "parent",
  "aliases",
];

/**
 * A lesson that already shared its lead with a concept page when the rule was
 * written (2026-09-25). The concept page owns the term; the lesson should lose
 * it when its title is next written. Listed so the rule fails on a new twin
 * and not on this one.
 */
const KNOWN_TWINS = new Map([
  ["/threads/diagnosing-scene-failure", "/how-it-works/diagnosis/diagnosing-scene-failure"],
]);

function frontmatter(dir: string): { file: string; data: Record<string, unknown> }[] {
  const root = path.join(process.cwd(), "content", dir);
  return fs
    .readdirSync(root)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      file: `${dir}/${f}`,
      data: matter(fs.readFileSync(path.join(root, f), "utf-8")).data,
    }));
}

/**
 * The document title of every built page, by route. Diagrams carry their own
 * <title>; the first one in the file is the page's.
 */
function builtTitles(): Map<string, string> {
  const titles = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".html") && !entry.name.startsWith("_")) {
        const m = fs.readFileSync(full, "utf-8").match(/<title>([^<]*)<\/title>/);
        if (!m) continue;
        const route =
          "/" +
          path
            .relative(APP, full)
            .split(path.sep)
            .join("/")
            .replace(/\.html$/, "");
        titles.set(route, m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&"));
      }
    }
  };
  walk(APP);
  return titles;
}

/** The phrase a title leads with: before the brand, before a colon or a dash. */
function lead(title: string): string {
  return title
    .split(" | ")[0]
    .split(/: | — /)[0]
    .trim()
    .toLowerCase();
}

const inLayer = (route: string) => /^\/(threads|paths)\//.test(route);

describe("the lesson layer stays out of the search regime", () => {
  it("declares no keyword metadata on any thread or path", () => {
    const files = [...frontmatter("threads"), ...frontmatter("paths")];
    // Guard the guard: the layer is 36 pages; an empty directory would pass on nothing.
    expect(files.length).toBeGreaterThanOrEqual(36);
    const declared = files
      .filter((f) => KEYWORD_FIELDS.some((k) => k in f.data))
      .map((f) => f.file);
    expect(
      declared,
      "a lesson or path has entered the keyword regime — that reverses SA-1.2; write the decision down first",
    ).toEqual([]);
  });

  it.runIf(built)("leads with no phrase another page's title already leads with", () => {
    const titles = builtTitles();
    const layer = [...titles].filter(([route]) => inLayer(route));
    const others = [...titles].filter(
      ([route]) => !inLayer(route) && !route.startsWith("/og") && !route.startsWith("/api"),
    );
    expect(layer.length).toBeGreaterThanOrEqual(36);
    expect(others.length).toBeGreaterThanOrEqual(300);

    // One-word leads (Character, Presence, Status) are English words, not
    // terms; two words and eight characters is where "The Harold" and
    // "Improv Exercises" begin.
    const owned = new Map<string, string>();
    for (const [route, title] of others) {
      const phrase = lead(title);
      if (phrase.length >= 8 && phrase.split(" ").length >= 2) owned.set(phrase, route);
    }
    expect(owned.size).toBeGreaterThanOrEqual(200);

    const taken: string[] = [];
    for (const [route, title] of layer) {
      const t = title.toLowerCase();
      for (const [phrase, owner] of owned) {
        if (t !== phrase && !t.startsWith(`${phrase}:`) && !t.startsWith(`${phrase} `)) continue;
        if (KNOWN_TWINS.get(route) === owner) continue;
        taken.push(`${route} leads with "${phrase}", which ${owner} already leads with`);
      }
    }
    expect(taken).toEqual([]);

    // The exception must still describe two real pages, or it is hiding nothing.
    for (const [route, owner] of KNOWN_TWINS) {
      expect(titles.has(route), route).toBe(true);
      expect(titles.has(owner), owner).toBe(true);
    }
  });

  it("keeps the two titles that lead with an uncontested term", async () => {
    const paths = await loadPaths();
    expect(paths.length).toBeGreaterThanOrEqual(11);
    const title = (id: string) =>
      paths.find((p) => p.frontmatter.id === id)?.frontmatter.title.toLowerCase();
    // The one page of the 36 Search Console has shown (window from 2026-02-01,
    // read 2026-09-25), on the term its title leads with.
    expect(title("teaching-improv")).toMatch(/^teaching improv/);
    // The deliberate test, 2026-09-25: "applied improv" is its own parent, 50 a
    // month at KD 1, and no other page on the site leads with it. Read at 30
    // days; if nothing moves, this line and the title can go back together.
    expect(title("improv-for-life")).toMatch(/^applied improv/);
  });
});
