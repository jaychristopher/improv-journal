import fs from "fs";
import path from "path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MiniGraph } from "../../components/MiniGraph";
import { getAtomUrl, loadAtoms } from "../content";
import { pickMiniGraphSatellites } from "../mini-graph-picks";
import { type Relation, RELATION_ORDER, RELATION_STYLE } from "../relation-style";
import { CORE_HREF } from "../the-core";

/**
 * The five relations as the schema spells them, read from the source rather
 * than imported, because a type union is erased at runtime and the point is to
 * fail when someone adds a sixth relation to `Link` and forgets the map.
 */
function schemaRelations(): string[] {
  const src = fs.readFileSync(path.join(process.cwd(), "src", "lib", "schema.ts"), "utf-8");
  const iface = src.match(/export interface Link \{[\s\S]*?\n\}/)?.[0];
  expect(iface, "schema.ts declares `export interface Link`").toBeTruthy();
  const union = iface!.match(/relation:\s*([^;]+);/)?.[1];
  expect(union, "Link has a `relation` union").toBeTruthy();
  return [...union!.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

/** The (relation → attribute tuple) pairs a rendered graph actually drew. */
function drawnEdges(html: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const m of html.matchAll(/<g data-relation="([^"]+)">[\s\S]*?<line([^>]*)\/?>/g)) {
    const attrs = m[2];
    const tuple = [
      attrs.match(/class="([^"]*)"/)?.[1] ?? "",
      attrs.match(/stroke-width="([^"]*)"/)?.[1] ?? "",
      attrs.match(/stroke-dasharray="([^"]*)"/)?.[1] ?? "",
      /marker-end=/.test(attrs) ? "arrow" : "",
    ].join("|");
    if (!out.has(m[1])) out.set(m[1], new Set());
    out.get(m[1])!.add(tuple);
  }
  return out;
}

describe("mini graph relation styles", () => {
  it("styles exactly the relations the schema declares", () => {
    const declared = schemaRelations();
    expect(declared.length).toBe(5);
    expect(Object.keys(RELATION_STYLE).sort()).toEqual([...declared].sort());
    expect([...RELATION_ORDER].sort()).toEqual([...declared].sort());
  });

  it("gives every relation a look no other relation shares", () => {
    const seen = new Map<string, string>();
    for (const [relation, s] of Object.entries(RELATION_STYLE)) {
      const tuple = [s.className, s.strokeWidth, s.dasharray ?? "", s.arrowhead].join("|");
      expect(seen.get(tuple), `${relation} draws like ${seen.get(tuple)}`).toBeUndefined();
      seen.set(tuple, relation);
      expect(s.label.length).toBeGreaterThan(0);
    }
  });

  it("draws a real atom's edges by relation and names each in the legend", async () => {
    const atoms = await loadAtoms();
    const byId = new Map(atoms.map((a) => [a.frontmatter.id, a]));
    // The component draws the satellites mini-graph-picks chooses (until
    // 2026-09-22 it drew the first six declared), so the relation count that
    // matters, and the set the legend must name, is the picker's — a knot
    // collapsed to "the core" carries one relation for several links.
    const drawnOf = (links: readonly { id: string; relation: string }[]) =>
      pickMiniGraphSatellites(links).satellites;
    const rich = atoms.filter(
      (a) => new Set(drawnOf(a.frontmatter.links ?? []).map((l) => l.relation)).size >= 3,
    );
    // Guard the guard: 2026-09-21, 105 of 205 atoms qualified on the first
    // six; 2026-09-22, 157 qualify on the picked six.
    expect(rich.length).toBeGreaterThanOrEqual(80);

    for (const atom of rich.slice(0, 10)) {
      const links = atom.frontmatter.links;
      const satellites = drawnOf(links);
      const resolved = new Map(
        links.flatMap((l) => {
          const t = byId.get(l.id);
          return t
            ? [[l.id, { title: t.frontmatter.title, url: getAtomUrl(t.frontmatter) }] as const]
            : [];
        }),
      );
      const html = renderToStaticMarkup(
        <MiniGraph
          centerTitle={atom.frontmatter.title}
          centerUrl={getAtomUrl(atom.frontmatter)}
          links={links}
          resolvedLinks={resolved}
        />,
      );
      const present = new Set(satellites.map((l) => l.relation as Relation));
      const legend = html.match(/<ul[^>]*aria-label="Edge legend"[^>]*>([\s\S]*?)<\/ul>/)?.[1];
      expect(legend, atom.frontmatter.id).toBeTruthy();

      for (const relation of present) {
        expect(legend, `${atom.frontmatter.id} legend names ${relation}`).toContain(
          `(${relation})`,
        );
        expect(legend).toContain(RELATION_STYLE[relation].label);
      }
      for (const relation of Object.keys(RELATION_STYLE)) {
        if (!present.has(relation as keyof typeof RELATION_STYLE)) {
          expect(legend, `${atom.frontmatter.id} legend omits absent ${relation}`).not.toContain(
            `(${relation})`,
          );
        }
      }

      // Every relation drawn, one look each, and no two relations sharing a look.
      const drawn = drawnEdges(html);
      expect([...drawn.keys()].sort()).toEqual([...present].sort());
      const looks = new Set<string>();
      for (const [relation, tuples] of drawn) {
        expect(tuples.size, `${relation} drawn one way`).toBe(1);
        const [look] = tuples;
        expect(looks.has(look), `${relation} looks like another relation`).toBe(false);
        looks.add(look);
      }
      // Each edge carries text a screen reader can voice.
      expect((html.match(/<title>/g) ?? []).length).toBe(satellites.length);

      // The hub says what the six slots left out, and a collapsed knot is
      // labelled as such and links the page that defines the core (entry
      // 315; until 2026-09-22 it linked its first-declared member, so the
      // same node led somewhere different from every page).
      const pick = pickMiniGraphSatellites(links);
      const more = html.match(/data-more="(\d+)"/)?.[1];
      expect(more ? Number(more) : 0, `${atom.frontmatter.id} +N more`).toBe(pick.more);
      const core = pick.satellites.find((s) => s.label);
      if (core) {
        expect(html).toContain(`>${core.label}<`);
        expect(html).toContain(`data-members="${core.members.join(" ")}"`);
        expect(core.href).toBe(CORE_HREF);
        expect(html).toContain(`href="${CORE_HREF}"`);
      } else {
        expect(html).not.toContain(`href="${CORE_HREF}"`);
      }
    }
  });

  it("renders nothing for a node with no edges, and nothing broken for unresolved ones", () => {
    expect(
      renderToStaticMarkup(
        <MiniGraph centerTitle="Alone" centerUrl="/x" links={[]} resolvedLinks={new Map()} />,
      ),
    ).toBe("");

    const html = renderToStaticMarkup(
      <MiniGraph
        centerTitle="Half known"
        centerUrl="/x"
        links={[
          { id: "ghost", relation: "requires" },
          { id: "odd", relation: "not-a-relation" },
        ]}
        resolvedLinks={new Map()}
      />,
    );
    expect(html).toContain("ghost");
    expect(html).toContain("(requires)");
    expect(html).toContain("(not-a-relation)");
    expect(drawnEdges(html).size).toBe(2);
  });
});
