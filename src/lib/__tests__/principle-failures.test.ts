import fs from "node:fs";
import path from "node:path";

import type { ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PrinciplesPage from "../../app/how-it-works/principles/page";
import { ageNormalisedRank } from "../atom-rank";
import { getAtomUrl, loadAtoms } from "../content";
import { principleFailures } from "../principle-failures";
import { FAILURES_LABEL } from "../relation-labels";

const SRC = path.join(process.cwd(), "src");

async function renderToHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}
const PAGE = path.join(SRC, "app", "how-it-works", "principles", "page.tsx");
const APP = path.join(process.cwd(), ".next", "server", "app");
const HUB = path.join(APP, "how-it-works", "principles.html");
/**
 * A build directory is not a finished build — see course-markup for the
 * account — and a finished build is not necessarily this source: the line
 * asserted below was added to the page on 2026-09-21 with a build on disk
 * from before it, and a check against that build fails on staleness rather
 * than on anything true. So the built check also waits for a build at least
 * as new as the page, and skips cleanly until then.
 */
const built =
  fs.existsSync(HUB) &&
  fs.existsSync(path.join(APP, "index.html")) &&
  fs.statSync(HUB).mtimeMs >= fs.statSync(PAGE).mtimeMs;

/**
 * The principles hub renders the map its own advice needs.
 *
 * The hub closes with "Name the failure the last show actually had, take the
 * one principle that addresses it, and spend the whole session on that." The
 * pairing that rule depends on lived only as `contrasts` edges between the
 * nine principle atoms and the ten antipatterns, and the hub rendered the
 * instruction and not the map (tracker entry 155, 2026-09-21). It now lists,
 * under each principle, "Failures this addresses" as links, computed from
 * those edges in either direction. These hold the computation to the corpus
 * and the hub to the computation.
 *
 * Read from the antipattern side only, the map had holes: blocking and
 * overcomplication contrast no principle, and no antipattern contrasts
 * framing-as-angle-of-approach. Read from either end — `contrasts` is the
 * symmetric relation — be-positive contrasts blocking, be-simple contrasts
 * overcomplication and framing contrasts bulldozing, so on 2026-09-21 every
 * principle has at least one failure and every antipattern at least one
 * principle. The floors below sit one under each measured count, because
 * the three edges that close the holes are each declared from one side
 * only, and a content edit that removes any of them reopens a hole rather
 * than failing loudly here. That debt — the one-sided edges — is the
 * entry's first adoption bullet, and content authoring, not this test's.
 */
describe("principle failures", () => {
  it("pairs every principle with the antipatterns it contrasts, from either end", async () => {
    const atoms = await loadAtoms();
    const principles = atoms.filter((a) => a.frontmatter.type === "principle");
    const antipatterns = atoms.filter((a) => a.frontmatter.type === "antipattern");
    // Guard the guard: nine principles and ten antipatterns on 2026-09-21.
    expect(principles.length).toBeGreaterThanOrEqual(9);
    expect(antipatterns.length).toBeGreaterThanOrEqual(8);

    const map = principleFailures(atoms);
    // Every principle has an entry, empty or not, so the hub can look each
    // one up without a fallback.
    for (const p of principles) expect(map.has(p.frontmatter.id), p.frontmatter.id).toBe(true);

    const withFailures = [...map.values()].filter((f) => f.length > 0).length;
    // 9 of 9 on 2026-09-21. Floor at 8: framing-as-angle-of-approach's only
    // pair is bulldozing, declared from the principle side alone and borrowed
    // from be-supportive (entry 155); the entry's second bullet asks for a
    // failure of framing's own.
    expect(withFailures).toBeGreaterThanOrEqual(8);

    const reached = new Set([...map.values()].flat().map((f) => f.id));
    // 10 of 10 on 2026-09-21. Floor at 9: blocking (be-positive → blocking)
    // and overcomplication (be-simple → overcomplication) are reached by a
    // one-sided edge each; neither antipattern contrasts its principle back.
    expect(reached.size).toBeGreaterThanOrEqual(9);
    const unpaired = antipatterns.map((a) => a.frontmatter.id).filter((id) => !reached.has(id));
    expect(unpaired.length).toBeLessThanOrEqual(1);

    // The flagship failure and the newest principle are on the map, which is
    // the whole point of reading the edges from both ends.
    expect(map.get("be-positive")!.map((f) => f.id)).toContain("blocking");
    expect(map.get("be-simple")!.map((f) => f.id)).toContain("overcomplication");
    expect(map.get("framing-as-angle-of-approach")!.length).toBeGreaterThanOrEqual(1);
  });

  it("derives every pair from a declared contrasts edge, and nothing else", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a.frontmatter]));
    const edges = new Set<string>();
    for (const a of atoms) {
      for (const l of a.frontmatter.links ?? []) {
        if (l.relation === "contrasts") edges.add(`${a.frontmatter.id}>${l.id}`);
      }
    }
    // Guard the guard: the corpus declares contrasts edges at all.
    expect(edges.size).toBeGreaterThan(100);

    const map = principleFailures(atoms);
    const rank = ageNormalisedRank(atoms);
    let pairs = 0;
    for (const [principle, failures] of map) {
      const ids = failures.map((f) => f.id);
      // Deduplicated: a mutual pair is one line, not two.
      expect(new Set(ids).size, principle).toBe(ids.length);
      for (const f of failures) {
        pairs += 1;
        expect(byId.get(f.id)?.type, `${principle} → ${f.id}`).toBe("antipattern");
        expect(f.title).toBe(byId.get(f.id)!.title);
        const declared = edges.has(`${principle}>${f.id}`) || edges.has(`${f.id}>${principle}`);
        expect(declared, `${principle} ↔ ${f.id} has no contrasts edge`).toBe(true);
      }
      // Ranked by how much the graph leans on the antipattern for its age —
      // in-degree per month since it was written — then title, as the
      // sidebar is. Raw in-degree until 2026-09-22 (entry 307): nine of the
      // ten failures are March and April atoms, so the two rules part on
      // one line, be-changeable's, where wimping (August) now precedes
      // steering.
      for (let i = 1; i < failures.length; i++) {
        const prev = failures[i - 1];
        const cur = failures[i];
        expect(
          prev.rank > cur.rank ||
            (prev.rank === cur.rank && prev.title.localeCompare(cur.title) <= 0),
          `${principle}: ${prev.id} before ${cur.id}`,
        ).toBe(true);
        expect(prev.rank).toBe(rank.get(prev.id) ?? 0);
      }
    }
    // Under the 1-month floor wimping (August, 5 edges) led steering (11
    // edges) on be-changeable; the 3-month floor of entry 322 (2026-09-22)
    // ranks them 1.67 to 1.97 and steering leads again. Both are on the
    // line; the order is the rank's and the loop above holds it.
    const beChangeable = map.get("be-changeable")!.map((f) => f.id);
    expect(beChangeable).toContain("wimping");
    expect(beChangeable).toContain("steering");
    // 24 pairs on 2026-09-21 (be-brave 5, be-positive 4, three principles
    // with 3, be-simple and be-supportive 2, be-thankful and framing 1).
    expect(pairs).toBeGreaterThanOrEqual(20);

    // Not from `illustrates` or `requires`: overcomplication says it
    // illustrates be-simple and performing-cleverness requires be-brave, and
    // those are not what puts them on the map (entry 116's inverted verb).
    const withoutContrasts = principleFailures(
      atoms.map((a) => ({
        frontmatter: {
          ...a.frontmatter,
          links: (a.frontmatter.links ?? []).filter((l) => l.relation !== "contrasts"),
        },
      })),
    );
    expect([...withoutContrasts.values()].flat()).toEqual([]);
  });

  it("renders each principle's failures on the hub as links to the diagnosis pages", async () => {
    const atoms = await loadAtoms();
    const map = principleFailures(atoms);
    // The hub's prose goes through `Prose`, an async server component, since
    // 2026-09-22 (tracker entry 278), and the synchronous renderer throws on
    // a component that suspends; the streaming one waits for it.
    const html = await renderToHtml(await PrinciplesPage());
    // Guard the guard: the page rendered its cards at all.
    expect(html).toContain("Every Principle");

    // The phrase is relation-labels' since 2026-09-22 (entry 328), because
    // the same 24 edges now wear it on the principle pages' sidebars too.
    expect(FAILURES_LABEL).toBe("Failures this addresses");
    const lines = html.match(new RegExp(`${FAILURES_LABEL}:`, "g")) ?? [];
    const expected = [...map.values()].filter((f) => f.length > 0).length;
    expect(lines.length).toBe(expected);
    expect(lines.length).toBeGreaterThanOrEqual(8);

    for (const [principle, failures] of map) {
      const cardStart = html.indexOf(`href="${getAtomUrl({ id: principle, type: "principle" })}"`);
      expect(cardStart, principle).toBeGreaterThan(-1);
      for (const f of failures) {
        const url = getAtomUrl({ id: f.id, type: "antipattern" });
        expect(url).toBe(`/how-it-works/diagnosis/${f.id}`);
        expect(html, `${principle} → ${f.id}`).toContain(`href="${url}"`);
      }
    }
    // Every link inside a failures line goes to a diagnosis page, so a
    // wrong-typed URL cannot slip in through a shared helper.
    for (const line of html.split(`${FAILURES_LABEL}:`).slice(1)) {
      const block = line.split("</p>")[0];
      const hrefs = [...block.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length).toBeGreaterThanOrEqual(1);
      for (const href of hrefs) expect(href).toMatch(/^\/how-it-works\/diagnosis\/[a-z0-9-]+$/);
    }
  });

  it("is what the hub reads, and it is not re-derived on the page", () => {
    const src = fs.readFileSync(PAGE, "utf-8");
    expect(src).toMatch(/from "@\/lib\/principle-failures"/);
    expect(src).toContain("principleFailures(atoms)");
    // The label is imported, not spelled: one string for the hub and the
    // sidebars (relation-labels.test.ts reads every file for a copy).
    expect(src).toMatch(/import \{[^}]*FAILURES_LABEL[^}]*\} from "@\/lib\/relation-labels"/);
    expect(src).toContain("FAILURES_LABEL");
    expect(src).not.toContain('"Failures this addresses');
    // The page does not walk `links` itself; the module is the one reader.
    expect(src).not.toMatch(/relation === "contrasts"/);
  });

  it.runIf(built)("ships the failures lines in the built hub", async () => {
    const atoms = await loadAtoms();
    const map = principleFailures(atoms);
    const html = fs.readFileSync(HUB, "utf-8");
    const body = html.split("</header>").pop()!.split("<footer")[0];
    const lines = body.match(new RegExp(`${FAILURES_LABEL}:`, "g")) ?? [];
    expect(lines.length).toBeGreaterThanOrEqual(8);
    for (const [principle, failures] of map) {
      for (const f of failures) {
        expect(body, `${principle} → ${f.id}`).toContain(`href="/how-it-works/diagnosis/${f.id}"`);
      }
    }
  });
});
