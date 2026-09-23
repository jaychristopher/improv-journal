import { describe, expect, it } from "vitest";

import { getAtomDisplayTitle, loadAtoms, loadBridges, loadPaths, loadShows } from "../content";
import { pageTitle, qualifyIfSiteName, SITE_NAME } from "../seo";

describe("pageTitle brand handling", () => {
  it("does not append the brand to a title that already carries it", () => {
    expect(pageTitle(SITE_NAME)).toEqual({ absolute: SITE_NAME });
    expect(pageTitle(`${SITE_NAME} Podcast`)).toEqual({ absolute: `${SITE_NAME} Podcast` });
  });

  it("still appends the brand to a short unrelated title", () => {
    expect(pageTitle("Improv Glossary")).toBe("Improv Glossary");
  });
});

describe("atom display titles", () => {
  it("qualifies a title shared by more than one atom", async () => {
    const atoms = await loadAtoms();
    const byTitle = new Map<string, typeof atoms>();
    for (const atom of atoms) {
      const list = byTitle.get(atom.frontmatter.title) ?? [];
      list.push(atom);
      byTitle.set(atom.frontmatter.title, list);
    }

    // The last shared title ("Organic Opening", a technique and an exercise)
    // was retitled on 2026-09-21 and atom-name-collisions.test.ts now forbids
    // new ones, so the qualifier is exercised on a synthetic pair below rather
    // than on content that is not supposed to exist.
    const collisions = [...byTitle.values()].filter((group) => group.length > 1);
    expect(collisions).toEqual([]);

    for (const group of collisions) {
      const resolved = await Promise.all(group.map((a) => getAtomDisplayTitle(a)));
      expect(new Set(resolved).size, `still colliding: ${group[0].frontmatter.title}`).toBe(
        group.length,
      );
    }
  });

  it("qualifies a synthetic title shared with a real atom", async () => {
    const atoms = await loadAtoms();
    const mirroring = atoms.find((a) => a.frontmatter.id === "mirroring")!;
    // A different id with the same title: the loaded exercise shares it, so
    // the impostor is qualified by its own type.
    const impostor = {
      frontmatter: { id: "mirroring-copy", title: mirroring.frontmatter.title, type: "technique" },
    };
    expect(await getAtomDisplayTitle(impostor)).toBe(`${mirroring.frontmatter.title} (Technique)`);
  });

  it("leaves an unambiguous title untouched", async () => {
    const atoms = await loadAtoms();
    const mirroring = atoms.find((a) => a.frontmatter.id === "mirroring")!;
    expect(await getAtomDisplayTitle(mirroring)).toBe(mirroring.frontmatter.title);
  });

  it("gives every atom page a distinct title", async () => {
    const atoms = await loadAtoms();
    const titles = await Promise.all(atoms.map((a) => getAtomDisplayTitle(a)));
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });
});

describe("qualifyIfSiteName", () => {
  it("qualifies a title identical to the site name", () => {
    expect(qualifyIfSiteName(SITE_NAME, "Learning Path")).toBe(`${SITE_NAME} (Learning Path)`);
  });

  it("leaves any other title alone", () => {
    expect(qualifyIfSiteName("Beginner Foundations", "Learning Path")).toBe("Beginner Foundations");
  });
});

describe("cross-section title collisions", () => {
  it("keeps shows, paths, guides and the homepage from sharing a title", async () => {
    const [shows, bridges, paths] = await Promise.all([loadShows(), loadBridges(), loadPaths()]);
    const seen = new Map<string, string>();

    // The homepage leads with its category now, but nothing else may claim
    // the bare site name either.
    seen.set(SITE_NAME, "site name");
    for (const show of shows) seen.set(`${show.frontmatter.title} Podcast`, "show");
    for (const path of paths) {
      const title = qualifyIfSiteName(path.frontmatter.title, "Learning Path");
      expect(seen.has(title), `${title} collides with the ${seen.get(title)}`).toBe(false);
      seen.set(title, "path");
    }
    for (const bridge of bridges) {
      const title = bridge.frontmatter.title;
      expect(seen.has(title), `${title} collides with the ${seen.get(title)}`).toBe(false);
      seen.set(title, "guide");
    }
  });
});
