import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import sitemap from "../../app/sitemap";
import { loadAtoms } from "../content";
import { coreItemLabel } from "../direct-requires";
import { CORE_TERM, groupGlossaryTerms, loadGlossaryTerms } from "../glossary";
import { HUBS } from "../hubs";
import { CORE_LABEL, KNOT } from "../mini-graph-picks";
import { SITE_URL } from "../seo";
import {
  CORE_DEFINITION,
  CORE_HREF,
  CORE_PHRASE,
  coreLink,
  coreMembers,
  coreMemberSummary,
} from "../the-core";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const PAGE = path.join(APP, "how-it-works", "the-core.html");
/**
 * A build directory is not a finished build; the page itself is the gate,
 * since llms.txt and the search index are written by `prebuild` in the same
 * run that produces it.
 */
const built = fs.existsSync(path.join(APP, "index.html")) && fs.existsSync(PAGE);

const frontmatter = async () => (await loadAtoms()).map((a) => a.frontmatter);

/**
 * "The core" is said on 83 built pages and, until 2026-09-22, defined on
 * none (tracker entry 309): the sidebar's "<Title> and the core", the inbound
 * fold's "N through the core", the episode notes and the search graph's
 * collapsed node all named a structure no page described. The page at
 * `CORE_HREF` is the referent, and these hold it to the structure it names:
 * the membership is recomputed, not listed, and must equal the literal the
 * browser-side picker carries; the page lists every member; the glossary
 * carries the term with the page's own sentence; the sitemap, llms.txt and
 * the search index know the route.
 */
describe("the core", () => {
  it("recomputes the knot, and it is the picker's KNOT", async () => {
    const atoms = await frontmatter();
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const members = coreMembers(atoms);
    // Nineteen on 2026-09-22 (entry 141). The count is asserted so a cycle
    // that quietly grew or split shows up here, beside the set equality that
    // says which way.
    expect(members.length).toBe(19);
    expect([...members].sort()).toEqual([...KNOT].sort());
    // Input order, so a page and a fold list the members the same way.
    const position = new Map(atoms.map((a, i) => [a.id, i]));
    expect(members.map((id) => position.get(id))).toEqual(
      [...members.map((id) => position.get(id)!)].sort((a, b) => a - b),
    );
  });

  it("is made of the kinds the tracker says, as measured", async () => {
    const groups = coreMemberSummary(await frontmatter());
    const counts = Object.fromEntries(groups.map((g) => [g.type, g.count]));
    // Reading of 2026-09-22: seven principles (be simple and framing sit
    // outside the cycle), five definitions, three laws, four techniques.
    // Entry 309's "nine principles, five definitions and the five that hold
    // them together" was the tracker's shorthand; this is the count.
    expect(counts).toEqual({ principle: 7, definition: 5, law: 3, technique: 4 });
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(19);
    for (const group of groups) {
      expect(group.members.length).toBe(group.count);
      expect(group.label).toMatch(group.count === 1 ? /^[a-z ]+[^s]$/ : /s$/);
      // Most-required first; every member is required by someone, or it
      // could not be in a cycle.
      const degrees = group.members.map((m) => m.requiredBy);
      expect(degrees).toEqual([...degrees].sort((a, b) => b - a));
      for (const m of group.members) expect(m.requiredBy, m.id).toBeGreaterThanOrEqual(1);
    }
    // The two the whole graph leans on, so the page's numbers mean something.
    const byId = new Map(groups.flatMap((g) => g.members).map((m) => [m.id, m.requiredBy]));
    expect(byId.get("commitment")).toBeGreaterThanOrEqual(60);
    expect(byId.get("active-listening")).toBeGreaterThanOrEqual(60);
  });

  it("spells the phrase the way every surface does, and links it to the page", () => {
    const link = coreLink();
    expect(link).toEqual({ href: CORE_HREF, label: CORE_PHRASE });
    expect(link.label).toBe(CORE_LABEL);
    expect(coreItemLabel("Active Listening")).toBe(`Active Listening and ${link.label}`);
    expect(CORE_HREF).toBe("/how-it-works/the-core");
  });

  it("is a glossary term, in the page's own words, and not an atom", async () => {
    expect(CORE_TERM.url).toBe(CORE_HREF);
    expect(CORE_TERM.definition).toBe(CORE_DEFINITION);
    expect(CORE_TERM.definition.length).toBeGreaterThan(40);
    // The loaded list is atoms only (glossary.test.ts holds every entry to a
    // page an atom lives on); the hub appends the term, and the grouping
    // gives it a group of its own rather than dropping it.
    const loaded = await loadGlossaryTerms();
    expect(loaded.some((t) => t.id === CORE_TERM.id)).toBe(false);
    const grouped = groupGlossaryTerms([...loaded, CORE_TERM]);
    const structure = grouped.find((g) => g.terms.some((t) => t.id === CORE_TERM.id));
    expect(structure?.label).toBe("Structure");
    expect(grouped.flatMap((g) => g.terms).length).toBe(loaded.length + 1);
  });

  it("is in the sitemap at the sub-hub priority", async () => {
    const entries = await sitemap();
    const entry = entries.find((e) => e.url === `${SITE_URL}${CORE_HREF}`);
    expect(entry).toBeDefined();
    // The other how-it-works children sit at 0.6 (entry 240's type-hub tier).
    const sibling = entries.find((e) => e.url === `${SITE_URL}${HUBS.principles.href}`);
    expect(entry?.priority).toBe(sibling?.priority);
    expect(entry?.changeFrequency).toBe("weekly");
    expect(entry?.lastModified).toBeTruthy();
  });

  it.runIf(built)("renders every member as a link, under the how-it-works trail", async () => {
    const html = fs.readFileSync(PAGE, "utf8");
    const members = coreMembers(await frontmatter());
    const cards = [...html.matchAll(/data-core-member="([^"]+)"/g)].map((m) => m[1]);
    expect(cards.length).toBe(19);
    expect([...cards].sort()).toEqual([...members].sort());
    // Each card is a link to the member's own page, inside a tracked block.
    // React writes the attributes in its own order and puts a comment
    // between "required by" and the number, so the matches are loose on both.
    const block = html.slice(html.indexOf('data-track="core-members"'));
    for (const id of members) {
      const card = new RegExp(`<a [^>]*data-core-member="${id}"[^>]*>`).exec(block);
      expect(card, id).not.toBeNull();
      expect(card![0], id).toMatch(new RegExp(`href="/[^"]*/${id}"`));
    }
    expect(block).toMatch(/required by (<!-- -->)?\d+/);

    const trail = /"@type":"BreadcrumbList","itemListElement":(\[.*?\])\}/.exec(html);
    expect(trail).not.toBeNull();
    const names = (JSON.parse(trail![1]) as { name: string }[]).map((i) => i.name);
    expect(names).toEqual(["Home", HUBS.howItWorks.crumb, "The Core"]);

    expect(html).toMatch(/<h1[^>]*>The Core<\/h1>/);
    expect(html).toContain('href="/how-it-works/principles/be-present"');
    // The definition sentence is on the page, as the glossary carries it.
    expect(html.replace(/&#x27;/g, "'")).toContain(CORE_DEFINITION.slice(0, 60));
  });

  it.runIf(built)("is in llms.txt and the search index, and the glossary hub", () => {
    const llms = fs.readFileSync(path.join(ROOT, "public", "llms.txt"), "utf8");
    expect(llms).toContain(`[The Core](${SITE_URL}${CORE_HREF})`);

    const index = JSON.parse(
      fs.readFileSync(path.join(ROOT, "public", "search-index.json"), "utf8"),
    ) as { storedFields: Record<string, Record<string, string>> };
    const doc = Object.values(index.storedFields).find((d) => d.url === CORE_HREF);
    expect(doc?.layer).toBe("hub");
    expect(doc?.title).toMatch(/^The Core/);

    const glossary = fs.readFileSync(path.join(APP, "practice", "vocabulary.html"), "utf8");
    expect(glossary).toMatch(new RegExp(`<a[^>]*href="${CORE_HREF}"[^>]*>The core</a>`));
    expect(glossary).toContain('id="structure"');
    // The DefinedTermSet names it too, at the page's id.
    expect(glossary).toContain(`"termCode":"${CORE_TERM.id}"`);
  });
});
