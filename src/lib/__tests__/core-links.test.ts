import fs from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GET as feed } from "../../app/listen/[show]/feed.xml/route";
import {
  buildsOnGroup,
  CORE_ITEM_SUFFIX,
  requiredByFoldSummary,
} from "../../components/AtomDetail";
import { MiniGraph } from "../../components/MiniGraph";
import { getAtomUrl, loadAtoms } from "../content";
import {
  CORE_ITEM_JOIN,
  coreItemLabel,
  coreRepresentative,
  directRequires,
  requiredByView,
  requiresGraph,
  requiresView,
} from "../direct-requires";
import { getEpisodeNotes, renderNotesHtml, renderNotesText } from "../episode-notes";
import { CORE_LABEL, flagDirectRequires, KNOT, pickMiniGraphSatellites } from "../mini-graph-picks";
import { RELATION_LABELS } from "../relation-labels";
import { SITE_URL } from "../seo";
import {
  CORE_HREF,
  CORE_PHRASE,
  coreMembers,
  coreMemberSummary,
  coreRepresentationCounts,
} from "../the-core";

const ROOT = process.cwd();
const APP = path.join(ROOT, ".next", "server", "app");
const CORE_PAGE = path.join(APP, "how-it-works", "the-core.html");
/** The core page is the gate: a build directory without it is not this build. */
const built = fs.existsSync(path.join(APP, "index.html")) && fs.existsSync(CORE_PAGE);

const page = (route: string) =>
  fs
    .readFileSync(path.join(APP, `${route.replace(/^\//, "")}.html`), "utf-8")
    .replace(/<script[\s\S]*?<\/script>/g, "");

/** The concept sidebar's "Builds on" group, open part and fold. */
function buildsOnOf(html: string): { open: string; all: string } {
  const aside = html.split('data-track="concept-sidebar"')[1]?.split("</aside>")[0] ?? "";
  expect(aside.length).toBeGreaterThan(0);
  const at = aside.indexOf(">Builds on<");
  expect(at).toBeGreaterThan(-1);
  const end = aside.indexOf("<dt", at + 1);
  const all = aside.slice(at, end === -1 ? undefined : end);
  return { open: all.replace(/<details[\s\S]*?<\/details>/g, ""), all };
}

/** The "Required by" fold's summary element, markup included. */
function requiredBySummaryOf(html: string): string {
  const aside = html.split('data-track="concept-sidebar"')[1]?.split("</aside>")[0] ?? "";
  const summaries = [...aside.matchAll(/<summary[^>]*>([\s\S]*?)<\/summary>/g)].map((m) => m[1]);
  const summary = summaries.find((s) =>
    /^Required by \d+ directly, /.test(s.replace(/<[^>]+>/g, "")),
  );
  expect(summary, summaries.join(" | ")).toBeDefined();
  return summary!;
}

const CORE_ANCHOR = new RegExp(`<a[^>]*href="${CORE_HREF}"[^>]*>${CORE_PHRASE}</a>`);

/**
 * "The core" has one face and one link.
 *
 * Tracker entry 315 (2026-09-22): the member that stood for the core in
 * "<Title> and the core" was whichever the author declared first, so the
 * phrase wore fifteen faces on the 43 concept pages that collapse the knot
 * — "Active Listening and the core" on 13, "Be Present and the core" on 5,
 * eleven members on one or two pages each — and agreed with the core page's
 * own most-required-first order on 4 of the 43; and until the wiring of
 * entry 309 landed, the item linked the member and not the page that says
 * what the core is. The representative is now the declared member the
 * graph requires most (`coreRepresentative`), first-declared on a tie, and
 * "the core" links `CORE_HREF` on every surface that says it: the sidebar
 * item, the inbound fold's summary, the show notes' html line and the
 * search graph's node. These hold the rule's unit cases, the count of
 * faces as a ceiling that may only fall, and each surface's link.
 */
describe("the core's face and link", () => {
  it("names the declared member the graph requires most, first-declared on a tie", () => {
    const graph = requiresGraph([
      // k1 → k2 → k3 → k1; k3 is also required by a and b, k2 by a.
      { id: "k1", links: [{ id: "k2", relation: "requires" }] },
      { id: "k2", links: [{ id: "k3", relation: "requires" }] },
      { id: "k3", links: [{ id: "k1", relation: "requires" }] },
      {
        id: "a",
        links: [
          { id: "k2", relation: "requires" },
          { id: "k3", relation: "requires" },
        ],
      },
      { id: "b", links: [{ id: "k3", relation: "requires" }] },
    ]);
    expect(graph.inDegree.get("k1")).toBe(1);
    expect(graph.inDegree.get("k2")).toBe(2);
    expect(graph.inDegree.get("k3")).toBe(3);

    // The most-required wins over declaration order.
    expect(coreRepresentative(graph, ["k1", "k2", "k3"])).toBe("k3");
    expect(coreRepresentative(graph, ["k2", "k1"])).toBe("k2");
    // A tie keeps the first declared; a single name is itself; nothing is nothing.
    expect(
      coreRepresentative(
        {
          inDegree: new Map([
            ["x", 2],
            ["y", 2],
          ]),
        },
        ["y", "x"],
      ),
    ).toBe("y");
    expect(coreRepresentative(graph, ["k1"])).toBe("k1");
    expect(coreRepresentative(graph, [])).toBeUndefined();
    // An id the graph does not count ranks 0, below any counted one.
    expect(coreRepresentative(graph, ["ghost", "k1"])).toBe("k1");
    expect(coreRepresentative(graph, ["ghost", "phantom"])).toBe("ghost");

    // The reduction opens on that member. `a` names k2 then k3; k3 stands.
    const a = directRequires(graph, "a");
    expect(a.direct).toEqual([{ id: "k3", viaCore: true, core: ["k1", "k2", "k3"] }]);
    expect(a.implied).toEqual([{ id: "k2", via: "k3", by: "knot" }]);
    // And the other end sees the same face.
    expect(requiredByView(graph, "k3", "direct").open).toContainEqual({ id: "a", viaCore: true });
    expect(requiredByView(graph, "k2", "direct").folded).toContainEqual({ id: "a", viaCore: true });
  });

  it("wears few faces on the corpus, and the count may only fall", async () => {
    const atoms = (await loadAtoms()).map((a) => a.frontmatter);
    expect(atoms.length).toBeGreaterThanOrEqual(200);
    const graph = requiresGraph(atoms);
    const counts = coreRepresentationCounts(atoms);
    const pages = [...counts.values()].reduce((n, c) => n + c, 0);
    const members = new Set(coreMembers(atoms));

    // Guard the guard: 43 pages collapse the knot on 2026-09-22, and every
    // face is a member of it.
    expect(pages).toBeGreaterThanOrEqual(40);
    for (const id of counts.keys()) expect(members.has(id), id).toBe(true);

    // Fifteen faces under the first-declared rule, seven under the
    // most-required one (commitment 18, active-listening 14, be-present 4,
    // be-brave 3, ensemble 2, offers 1, be-honest 1). A ceiling: a change
    // that spreads the phrase over more members again fails here, and a
    // rule that narrows it further lowers the number.
    expect(counts.size).toBeLessThanOrEqual(7);
    expect(counts.size).toBeGreaterThan(1);
    const [most] = [...counts].sort((a, b) => b[1] - a[1])[0];
    expect(most).toBe("commitment");
    expect(counts.get("commitment")).toBeGreaterThanOrEqual(15);

    // The page's own order and the sidebar's face agree on every page: the
    // representative is the named member the core page lists highest by
    // required-by (4 of 43 agreed under the first-declared rule).
    const requiredBy = new Map(
      coreMemberSummary(atoms).flatMap((g) => g.members.map((m) => [m.id, m.requiredBy] as const)),
    );
    let collapsed = 0;
    for (const id of graph.nodes) {
      const { declared, direct } = directRequires(graph, id);
      for (const d of direct) {
        if (!d.viaCore) continue;
        collapsed += 1;
        const named = declared.filter((t) => d.core.includes(t));
        const best = Math.max(...named.map((t) => requiredBy.get(t) ?? 0));
        expect(requiredBy.get(d.id), `${id} opens on ${d.id}`).toBe(best);
      }
    }
    expect(collapsed).toBe(pages);
  });

  it("spells the phrase once and splits the label where the surfaces link it", () => {
    expect(CORE_LABEL).toBe(CORE_PHRASE);
    expect(coreItemLabel("Commitment")).toBe(`Commitment${CORE_ITEM_JOIN}${CORE_PHRASE}`);
    expect(CORE_ITEM_SUFFIX).toEqual({ join: CORE_ITEM_JOIN, href: CORE_HREF, label: CORE_PHRASE });
    expect(requiredByFoldSummary(2, 24, 0)).toContain(`through ${CORE_PHRASE}`);
  });

  it("gives the sidebar's core item two links: the member and the page", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const fm = byId.get("yes-and")!;
    const declared = (fm.links ?? []).map((l) => {
      const t = byId.get(l.id)!;
      return { id: l.id, relation: l.relation, title: t.title, url: getAtomUrl(t) };
    });
    const group = buildsOnGroup("yes-and", declared, graph, (id) => {
      const t = byId.get(id);
      return t && { title: t.title, url: getAtomUrl(t) };
    });
    const item = group.direct.find((l) => l.suffix);
    expect(item).toBeDefined();
    expect(item!.key).toBe("commitment");
    expect(item!.href).toBe(getAtomUrl(byId.get("commitment")!));
    expect(item!.suffix).toEqual(CORE_ITEM_SUFFIX);
    // Only the core item carries the suffix.
    expect(group.direct.filter((l) => l.suffix)).toHaveLength(1);
    expect(group.folded.some((l) => l.suffix)).toBe(false);
  });

  it("links the core from the show notes' html line, and not from the plain one", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const fm = byId.get("yes-and")!;
    const notes = (await getEpisodeNotes(getAtomUrl(fm)))!;
    const line = notes.lines.find((l) => l.label === RELATION_LABELS.requires.outbound)!;
    expect(line.names).toHaveLength(1);
    const [name] = line.names;
    expect(name.core).toBeDefined();
    expect(name.title).toBe(coreItemLabel(name.core!.title));
    expect(name.core!.url).toBe(`${SITE_URL}${CORE_HREF}`);

    const escape = (s: string) => s.replace(/&/g, "&amp;");
    const html = renderNotesHtml(notes, escape);
    expect(html).toContain(
      `<a href="${name.url}">${name.core!.title}</a>${CORE_ITEM_JOIN}<a href="${SITE_URL}${CORE_HREF}">${CORE_PHRASE}</a>`,
    );
    expect(renderNotesText(notes)).toContain(
      `${RELATION_LABELS.requires.outbound}: ${coreItemLabel(name.core!.title)}, +${line.more} more`,
    );
    expect(renderNotesText(notes)).not.toContain(CORE_HREF);

    // Every core item on every notes line carries the page, and nothing else does.
    let coreItems = 0;
    for (const atom of atoms) {
      const n = await getEpisodeNotes(getAtomUrl(atom.frontmatter));
      for (const l of n?.lines ?? []) {
        for (const x of l.names) {
          if (x.core) {
            coreItems += 1;
            expect(x.core.url).toBe(`${SITE_URL}${CORE_HREF}`);
            expect(x.title).toBe(coreItemLabel(x.core.title));
          } else {
            expect(x.title).not.toContain(CORE_ITEM_JOIN + CORE_PHRASE);
          }
        }
      }
    }
    expect(coreItems).toBeGreaterThanOrEqual(40);
  });

  it("links the core from the Improv Lab feed's yes-and item", async () => {
    const xml = await feed(new Request("http://localhost/listen/improv-lab/feed.xml"), {
      params: Promise.resolve({ show: "improv-lab" }),
    }).then((r) => r.text());
    const atoms = await loadAtoms();
    const yesAnd = atoms.find((a) => a.frontmatter.id === "yes-and")!.frontmatter;
    const link = `${SITE_URL}${getAtomUrl(yesAnd)}`;
    const item = (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).find((i) =>
      i.includes(`<link>${link}</link>`),
    );
    expect(item, "yes-and is an Improv Lab episode").toBeDefined();
    const encoded = item!.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
    expect(encoded).toContain(`<a href="${SITE_URL}${CORE_HREF}">${CORE_PHRASE}</a>`);
    expect(encoded).toContain(`Commitment</a>${CORE_ITEM_JOIN}<a href="${SITE_URL}${CORE_HREF}"`);
  });

  it("draws the search graph's core node as a link to the page", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const graph = requiresGraph(atoms.map((a) => a.frontmatter));
    const fm = byId.get("yes-and")!;
    const links = flagDirectRequires(fm.links ?? [], graph, "yes-and");
    expect(links.filter((l) => KNOT.has(l.id)).length).toBeGreaterThanOrEqual(2);
    const resolved = new Map(
      links.map((l) => {
        const t = byId.get(l.id)!;
        return [l.id, { title: t.title, url: getAtomUrl(t) }];
      }),
    );
    const pick = pickMiniGraphSatellites(
      links,
      new Set(requiresView(graph, "yes-and", "direct").open),
    );
    const core = pick.satellites.find((s) => s.label === CORE_LABEL);
    expect(core).toBeDefined();
    expect(core!.href).toBe(CORE_HREF);

    const html = renderToStaticMarkup(
      createElement(MiniGraph, {
        centerTitle: fm.title,
        centerUrl: getAtomUrl(fm),
        links,
        resolvedLinks: resolved,
      }),
    );
    expect(html).toContain(`>${CORE_PHRASE}<`);
    expect(html).toContain(`href="${CORE_HREF}"`);
    // The node's own members are not drawn as satellites of their own.
    for (const id of core!.members) {
      expect(html, `${id} collapsed`).not.toContain(`href="${resolved.get(id)!.url}"`);
    }
  });

  it.runIf(built)(
    "links the core from the built sidebar item and the built fold summary",
    async () => {
      const atoms = await loadAtoms();
      const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));

      // The sidebar item: "Commitment and the core", two links.
      const yesAnd = buildsOnOf(page(getAtomUrl(byId.get("yes-and")!)));
      expect(yesAnd.open).toContain(`href="${getAtomUrl(byId.get("commitment")!)}"`);
      expect(yesAnd.open).toMatch(CORE_ANCHOR);
      expect(yesAnd.open.replace(/<[^>]+>/g, "")).toContain(coreItemLabel("Commitment"));

      // Entry 315's testable check named reality-construction, but on this
      // corpus every knot member it declares is reached through be-simple, so
      // it has no core item and says "the core" nowhere in Builds on; the
      // entry's example predates the reduction's chain rule.
      const reality = buildsOnOf(page(getAtomUrl(byId.get("reality-construction")!)));
      expect(reality.open).not.toContain(CORE_PHRASE);
      expect(reality.all).not.toContain(`href="${CORE_HREF}"`);

      // The fold summary on a rich-club page: "N through the core", linked.
      const graph = requiresGraph(atoms.map((a) => a.frontmatter));
      const view = requiredByView(graph, "be-present", "direct");
      expect(view.folded.filter((h) => h.viaCore).length).toBeGreaterThanOrEqual(10);
      const summary = requiredBySummaryOf(page(getAtomUrl(byId.get("be-present")!)));
      expect(summary).toMatch(CORE_ANCHOR);
      expect(summary.replace(/<[^>]+>/g, "")).toMatch(/\d+ through the core/);

      // And a page whose summary has no core part carries no core link in it.
      const commitment = requiredBySummaryOf(page(getAtomUrl(byId.get("commitment")!)));
      expect(commitment).not.toContain(CORE_PHRASE);
    },
  );

  it.runIf(built)("links the core from the built Improv Lab feed", async () => {
    const xml = fs.readFileSync(path.join(APP, "listen", "improv-lab", "feed.xml.body"), "utf-8");
    const atoms = await loadAtoms();
    const yesAnd = atoms.find((a) => a.frontmatter.id === "yes-and")!.frontmatter;
    const item = (xml.match(/<item>[\s\S]*?<\/item>/g) ?? []).find((i) =>
      i.includes(`<link>${SITE_URL}${getAtomUrl(yesAnd)}</link>`),
    );
    expect(item).toBeDefined();
    expect(item!.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "")).toContain(
      `<a href="${SITE_URL}${CORE_HREF}">${CORE_PHRASE}</a>`,
    );
  });

  it.runIf(built)("says on the core page how many pages each member stands for it on", async () => {
    const atoms = (await loadAtoms()).map((a) => a.frontmatter);
    const counts = coreRepresentationCounts(atoms);
    const html = fs.readFileSync(CORE_PAGE, "utf-8");
    const block = html.slice(html.indexOf('data-track="core-members"'));
    const shown = new Map(
      [...block.matchAll(/data-core-member="([^"]+)"[\s\S]*?data-stands-for="(\d+)"/g)].map((m) => [
        m[1],
        Number(m[2]),
      ]),
    );
    expect(shown.size).toBe(coreMembers(atoms).length);
    for (const [id, n] of shown) expect(n, id).toBe(counts.get(id) ?? 0);
    const total = [...counts.values()].reduce((n, c) => n + c, 0);
    expect([...shown.values()].reduce((n, c) => n + c, 0)).toBe(total);
    expect(block).toMatch(/stands for the core on (<!-- -->)?\d+(<!-- -->)? (<!-- -->)?pages?/);
    // React puts a comment on either side of the interpolated number.
    expect(html).toMatch(new RegExp(`the (<!-- -->)?${total}(<!-- -->)? pages that fold the core`));
  });
});
