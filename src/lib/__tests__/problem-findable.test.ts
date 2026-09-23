import fs from "node:fs";
import path from "node:path";

import MiniSearch from "minisearch";
import { describe, expect, it } from "vitest";

import { loadBridges } from "../content";
import { MINISEARCH_OPTIONS } from "../search-index";

const APP = path.join(process.cwd(), ".next", "server", "app");
/** A build directory is not a finished build — see podcast-series for the account. */
const built = fs.existsSync(APP) && fs.existsSync(path.join(APP, "index.html"));

/**
 * The function words a reader would not type. The problem sentences are
 * written as prose ("you open with something fine and the conversation is
 * dead within thirty seconds"), and a reader searching for their own problem
 * types the content of it, not the grammar. Kept short and literal: it only
 * has to remove what carries no meaning, not stem what does.
 */
const STOP = new Set(
  (
    "a an and are as at be because been but by can cannot could did do does either every for " +
    "from get got had has have how i if in into is it its just keep keeps like might no nobody " +
    "none nor not of off on or our out own same she he so some something somebody than that the " +
    "their them then there these they this those to too until up very was we were what when " +
    "where whether which while who whom why will with would you your yours yourself about after " +
    "all am any anything before both down each few here more most much never now only other " +
    "over such under"
  ).split(" "),
);

/** The content words of a problem sentence, in the order they were written. */
function problemQuery(problem: string): string {
  return problem
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .join(" ");
}

/**
 * A guide is findable by the problem it was written to answer.
 *
 * `primary_problem` is the one sentence on the site that states a reader's
 * problem in the reader's own words. For three weeks it rendered in exactly
 * one place, the CTA card at the foot of the guide, and nowhere a tool could
 * read it: none of the 39 appeared in its guide's body, none shared a content
 * word with the description (median Jaccard 0.0), and the search index scored
 * title, aliases, body and tags, so "conversation dead thirty seconds" — the
 * site's own phrasing of what /conversation-starters is for — returned
 * nothing (novel-insights 291). llms.txt carried the description and never
 * the problem, so an AI reader matching a question against the file saw the
 * keyword-shaped snippet and not the reader-shaped one.
 *
 * The sentence is now a boosted index field (`problem`, between title and
 * aliases), a "For:" clause on the guide's llms.txt line, and a line under
 * the guide's H1. These search through the loader's options, as the browser
 * does, so a builder that indexes the field while the loader ignores it —
 * the aliases bug of 2026-08-27 — fails here.
 *
 * Measured 2026-09-22 on 39 problems: 39 reach the top three and 38 the
 * first place. The one that does not lead is /questions-to-ask-a-girl, whose
 * content words ("question think sounds interview") put the interview guide
 * first on its title — right, since a reader who typed that may well want
 * it. Floors sit just under both counts so a dropped field fails and a
 * reworded sentence or two does not.
 */
describe("problem sentences are findable", () => {
  it("returns the guide first for its own problem's content words", async () => {
    const bridges = await loadBridges();
    const withProblem = bridges.filter((b) => b.frontmatter.primary_problem);
    // 39 at the time of writing. The guard, so an emptied field or a changed
    // loader passes nothing through the loop below.
    expect(withProblem.length).toBeGreaterThanOrEqual(35);
    expect(MINISEARCH_OPTIONS.fields).toContain("problem");
    expect(MINISEARCH_OPTIONS.searchOptions.boost.problem).toBeGreaterThan(
      MINISEARCH_OPTIONS.searchOptions.boost.aliases,
    );
    expect(MINISEARCH_OPTIONS.searchOptions.boost.problem).toBeLessThan(
      MINISEARCH_OPTIONS.searchOptions.boost.title,
    );

    const json = fs.readFileSync(path.join(process.cwd(), "public", "search-index.json"), "utf-8");
    const ms = MiniSearch.loadJSON(json, MINISEARCH_OPTIONS);
    expect(ms.documentCount).toBeGreaterThanOrEqual(360);

    const notInTopThree: string[] = [];
    const notFirst: string[] = [];
    for (const bridge of withProblem) {
      const query = problemQuery(bridge.frontmatter.primary_problem!);
      const urls = ms.search(query, MINISEARCH_OPTIONS.searchOptions).map((r) => r.url as string);
      const rank = urls.indexOf(`/${bridge.slug}`);
      if (rank < 0 || rank > 2) {
        notInTopThree.push(`/${bridge.slug} "${query}" → ${urls.slice(0, 3).join(", ")}`);
      }
      if (rank !== 0) notFirst.push(`/${bridge.slug}`);
    }

    // 39 of 39 in the top three; the floor is two under, not zero misses.
    expect(
      withProblem.length - notInTopThree.length,
      notInTopThree.join("\n"),
    ).toBeGreaterThanOrEqual(37);
    // 38 of 39 first; the floor allows the interview collision and one more.
    expect(withProblem.length - notFirst.length, notFirst.join("\n")).toBeGreaterThanOrEqual(36);

    // The sentence from the finding, so the fix is pinned by the example.
    const example = ms
      .search("conversation dead thirty seconds", MINISEARCH_OPTIONS.searchOptions)
      .slice(0, 1)
      .map((r) => r.url);
    expect(example).toEqual(["/conversation-starters"]);
  });

  it("carries each problem into llms.txt as a For: clause", async () => {
    const llms = fs.readFileSync(path.join(process.cwd(), "public", "llms.txt"), "utf-8");
    const bridges = await loadBridges();
    const withProblem = bridges.filter((b) => b.frontmatter.primary_problem);
    expect(withProblem.length).toBeGreaterThanOrEqual(35);

    const forLines = llms.split("\n").filter((l) => l.startsWith("- [") && / For: /.test(l));
    expect(forLines.length).toBeGreaterThanOrEqual(35);

    // Each on its own guide's line, not merely somewhere in the file.
    const missing = withProblem
      .filter((b) => {
        const line = llms.split("\n").find((l) => l.includes(`/${b.slug})`));
        return !line || !line.includes(`For: ${b.frontmatter.primary_problem!.trim()}.`);
      })
      .map((b) => `/${b.slug}`);
    expect(missing).toEqual([]);
  });

  it.runIf(built)(
    "renders the problem under the guide's H1, and only where one exists",
    async () => {
      const bridges = await loadBridges();
      const starters = bridges.find((b) => b.slug === "conversation-starters");
      expect(starters?.frontmatter.primary_problem).toBeTruthy();
      const without = bridges.find((b) => !b.frontmatter.primary_problem);
      expect(
        without,
        "a guide without a primary_problem, to prove the line is conditional",
      ).toBeTruthy();

      const html = fs.readFileSync(path.join(APP, "conversation-starters.html"), "utf-8");
      const line = html.match(/<p[^>]*data-track="guide-problem"[^>]*>(.*?)<\/p>/);
      expect(line, "the guide-problem line").toBeTruthy();
      // React separates adjacent text nodes with an empty comment.
      expect(line![1].replace(/<!-- -->/g, "")).toBe(
        `For when ${starters!.frontmatter.primary_problem}.`,
      );
      // Before the argument, not only on the card after it.
      expect(html.indexOf('data-track="guide-problem"')).toBeLessThan(
        html.indexOf('data-track="body"'),
      );

      const other = fs.readFileSync(path.join(APP, `${without!.slug}.html`), "utf-8");
      expect(other).not.toContain('data-track="guide-problem"');
      expect(other).not.toContain("For when ");
    },
  );
});
