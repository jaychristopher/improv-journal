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

    const collisions = [...byTitle.values()].filter((group) => group.length > 1);
    expect(collisions.length).toBeGreaterThan(0); // the case this guards against exists

    for (const group of collisions) {
      const resolved = await Promise.all(group.map((a) => getAtomDisplayTitle(a)));
      expect(new Set(resolved).size, `still colliding: ${group[0].frontmatter.title}`).toBe(
        group.length,
      );
    }
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
